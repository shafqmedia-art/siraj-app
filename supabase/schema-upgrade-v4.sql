begin;

alter table public.pilgrims add column if not exists booking_group uuid;

create or replace function public.public_info() returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'open', coalesce((select json_agg(x order by x.start_date) from (
      select c.id, c.name, c.start_date, c.end_date, c.price, c.prices, c.trip_type, c.flight_info, c.hotel_stars, c.deadline,
             c.makkah_hotel, c.makkah_nights, c.madinah_hotel, c.madinah_nights, c.hotel_info, c.depart_place, c.depart_time,
             c.includes, c.excludes, c.travel_time, c.terms, c.deposit_pct, c.program,
             case when c.seats is null then null else greatest(0, c.seats - (select count(*) from public.pilgrims p where p.campaign_id = c.id and p.status <> 'cancelled'))::int end as seats_left
      from public.campaigns c where c.status = 'open' and (c.deadline is null or c.deadline >= (now() at time zone 'Asia/Damascus')::date) and (c.start_date is null or c.start_date >= (now() at time zone 'Asia/Damascus')::date)) x), '[]'::json),
    'done', coalesce((select json_agg(y order by y.start_date desc) from (
      select c.id, c.name, c.start_date, c.end_date, c.trip_type, (select count(*) from public.pilgrims p where p.campaign_id = c.id and p.status <> 'cancelled')::int as pilgrims
      from public.campaigns c where c.status = 'done' or c.end_date < current_date) y), '[]'::json),
    'site', coalesce((select value from public.settings where key = 'public'), '{}'::jsonb),
    'office', coalesce((select value from public.settings where key = 'office'), '{}'::jsonb),
    'rate', coalesce((select value from public.settings where key = 'rate_syp'), 'null'::jsonb));
$$;

create or replace function public.book_trip(p_campaign uuid, p_people jsonb, p_guarantor_name text, p_guarantor_phone text) returns int language plpgsql security definer set search_path = public as $$
declare me public.profiles; x jsonb; n int := 0; booking uuid := gen_random_uuid();
begin
  select * into me from public.profiles where id = auth.uid() and active and role = 'pilgrim';
  if me.id is null then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.campaigns where id = p_campaign and status = 'open') then raise exception 'الحملة مغلقة'; end if;
  if jsonb_typeof(p_people) <> 'array' or jsonb_array_length(p_people) between 1 and 12 is not true then raise exception 'عدد الأشخاص غير صحيح'; end if;
  for x in select * from jsonb_array_elements(p_people) loop
    if coalesce((x->>'self')::boolean, false) and exists (select 1 from public.pilgrims where campaign_id = p_campaign and user_id = me.id) then raise exception 'مسجّل بهذه الحملة من قبل'; end if;
    insert into public.pilgrims (id, campaign_id, user_id, booked_by, booking_group, name, gender, birth_date, phone, room_type, guarantor_name, guarantor_phone, gift_from, status)
    values (gen_random_uuid(), p_campaign, case when coalesce((x->>'self')::boolean, false) then me.id end, me.id, booking,
      left(coalesce(nullif(x->>'name', ''), me.name), 120), case when x->>'gender' = 'f' then 'f' else 'm' end,
      nullif(x->>'birth_date', '')::date, left(coalesce(nullif(x->>'phone', ''), me.phone), 30),
      case when x->>'room_type' in ('double','triple','quad','quint') then x->>'room_type' end,
      left(p_guarantor_name, 120), left(p_guarantor_phone, 30), case when coalesce((x->>'gift')::boolean, false) then me.name end, 'request');
    n := n + 1;
  end loop;
  return n;
end; $$;

create or replace function public.guard_pilgrim() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_manager() and coalesce(current_setting('siraj.bypass', true), '') <> '1' then
    new.booking_group := old.booking_group; new.id := old.id; new.campaign_id := old.campaign_id; new.user_id := old.user_id; new.status := old.status;
    new.bus := old.bus; new.seat := old.seat; new.bus_sup := old.bus_sup; new.driver := old.driver; new.room := old.room;
    new.price := old.price; new.notes := old.notes; new.booked_by := old.booked_by; new.gift_from := old.gift_from; new.room_type := old.room_type; new.done_at := old.done_at; new.mahram_id := old.mahram_id; new.name := old.name;
    new.docs := (coalesce(old.docs, '{}'::jsonb) || (coalesce(new.docs, '{}'::jsonb) - 'visa') - 'visa') || case when old.docs ? 'visa' then jsonb_build_object('visa', old.docs->'visa') else '{}'::jsonb end;
  end if;
  return new;
end; $$;

-- Apply limits to both the authenticated booking RPC and the registration Edge Function.
create or replace function public.check_booking_capacity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  trip public.campaigns;
  local_date date := (now() at time zone 'Asia/Damascus')::date;
begin
  if new.status is distinct from 'request' then return new; end if;
  select * into trip from public.campaigns where id = new.campaign_id for update;
  if trip.id is null or trip.status is distinct from 'open'
     or trip.start_date < local_date or trip.deadline < local_date then
    raise exception 'انتهت مهلة الحجز أو الرحلة مغلقة.';
  end if;
  if trip.seats is not null and trip.seats <= (
    select count(*) from public.pilgrims where campaign_id = trip.id and status <> 'cancelled'
  ) then
    raise exception 'لا يوجد مقاعد كافية للحجز.';
  end if;
  return new;
end;
$$;
revoke all on function public.check_booking_capacity() from public, anon, authenticated;
drop trigger if exists check_booking_capacity on public.pilgrims;
create trigger check_booking_capacity before insert on public.pilgrims
for each row execute function public.check_booking_capacity();

-- Approve the proposed assignments in one transaction. The browser only proposes a draft.
create or replace function public.approve_bus_seats(
  p_campaign uuid, p_seats jsonb, p_capacity int, p_buses int
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  item record;
begin
  if not coalesce(public.is_manager(), false) then
    raise exception 'هذا الإجراء متاح لصاحب المكتب فقط.';
  end if;
  if p_capacity is null or p_capacity not between 1 and 100
     or p_buses is null or p_buses not between 1 and 30
     or jsonb_typeof(p_seats) is distinct from 'array' then
    raise exception 'مخطط الباص غير صالح.';
  end if;
  if jsonb_array_length(p_seats) not between 1 and least(3000, p_capacity * p_buses) then
    raise exception 'عدد المقاعد غير صالح.';
  end if;
  perform 1 from public.campaigns where id = p_campaign for update;
  if not found then raise exception 'الرحلة غير موجودة.'; end if;
  perform 1 from public.pilgrims where campaign_id = p_campaign order by id for update;
  for item in select * from jsonb_to_recordset(p_seats) as a(id uuid, bus int, seat int)
  loop
    if item.bus is null or item.bus not between 1 and p_buses
       or item.seat is null or item.seat not between 1 and p_capacity then
      raise exception 'رقم الباص أو المقعد غير صالح.';
    end if;
    if exists (
      select 1 from public.pilgrims
      where campaign_id = p_campaign and status <> 'cancelled'
        and case when bus ~ '^[0-9]{1,9}$' then bus::int end = item.bus
        and case when seat ~ '^[0-9]{1,9}$' then seat::int end = item.seat
    ) then
      raise exception 'تغيّر توزيع المقاعد. أعد إنشاء المسودة.';
    end if;
    update public.pilgrims set bus = item.bus::text, seat = item.seat::text
    where campaign_id = p_campaign and id = item.id
      and status in ('approved','visa','travel','done')
      and nullif(bus, '') is null and nullif(seat, '') is null;
    if not found then raise exception 'تغيّرت بيانات أحد المعتمرين. أعد إنشاء المسودة.'; end if;
  end loop;
end;
$$;
revoke all on function public.approve_bus_seats(uuid, jsonb, int, int) from public, anon;
grant execute on function public.approve_bus_seats(uuid, jsonb, int, int) to authenticated;
commit;
