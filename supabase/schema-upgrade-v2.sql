-- السراج المنير · ترقية النسخة 2 (أسعار الغرف، تفاصيل الرحلة، حجز العائلة والإهداء، الصفحة العامة)
-- شغّله بس إذا كنت شغّلت schema.sql القديم قبل هالتحديث. للمشروع الجديد استعمل schema.sql بس.

alter table public.campaigns
  add column if not exists trip_type text not null default 'land' check (trip_type in ('land','flight')),
  add column if not exists flight_info text check (length(flight_info) <= 300),
  add column if not exists hotel_stars int check (hotel_stars between 0 and 5),
  add column if not exists prices jsonb not null default '{}'::jsonb check (jsonb_typeof(prices) = 'object' and length(prices::text) <= 500),
  add column if not exists deadline date,
  add column if not exists hotel_info jsonb not null default '{}'::jsonb check (jsonb_typeof(hotel_info) = 'object' and length(hotel_info::text) <= 3000),
  add column if not exists includes text check (length(includes) <= 2000),
  add column if not exists excludes text check (length(excludes) <= 1000),
  add column if not exists travel_time text check (length(travel_time) <= 120),
  add column if not exists terms text check (length(terms) <= 2000),
  add column if not exists deposit_pct int not null default 50 check (deposit_pct between 0 and 100);

alter table public.pilgrims
  add column if not exists room_type text check (room_type in ('double','triple','quad','quint')),
  add column if not exists guarantor_name text check (length(guarantor_name) <= 120),
  add column if not exists guarantor_phone text check (length(guarantor_phone) <= 30),
  add column if not exists booked_by uuid references public.profiles(id) on delete set null,
  add column if not exists gift_from text check (length(gift_from) <= 120);
create index if not exists pilgrims_booked_by_idx on public.pilgrims (booked_by);
update public.pilgrims set booked_by = user_id where booked_by is null and user_id is not null;

drop function if exists public.open_campaigns();
drop function if exists public.apply_campaign(uuid);

create or replace function public.my_campaigns() returns setof uuid language sql stable security definer set search_path = public as $$
  select campaign_id from public.pilgrims where (user_id = auth.uid() or booked_by = auth.uid()) and public.is_active();
$$;

create or replace function public.my_pilgrims() returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.pilgrims where (user_id = auth.uid() or booked_by = auth.uid()) and public.is_active();
$$;

create or replace function public.public_info() returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'open', coalesce((select json_agg(x order by x.start_date) from (
      select c.id, c.name, c.start_date, c.end_date, c.price, c.prices, c.trip_type, c.flight_info, c.hotel_stars, c.deadline,
             c.makkah_hotel, c.makkah_nights, c.madinah_hotel, c.madinah_nights, c.hotel_info, c.depart_place, c.depart_time,
             c.includes, c.excludes, c.travel_time, c.terms, c.deposit_pct, c.program,
             case when c.seats is null then null else greatest(0, c.seats - (select count(*) from public.pilgrims p where p.campaign_id = c.id and p.status <> 'cancelled'))::int end as seats_left
      from public.campaigns c where c.status = 'open' and (c.start_date is null or c.start_date >= current_date)) x), '[]'::json),
    'done', coalesce((select json_agg(y order by y.start_date desc) from (
      select c.id, c.name, c.start_date, c.end_date, c.trip_type, (select count(*) from public.pilgrims p where p.campaign_id = c.id and p.status <> 'cancelled')::int as pilgrims
      from public.campaigns c where c.status = 'done' or c.end_date < current_date) y), '[]'::json),
    'site', coalesce((select value from public.settings where key = 'public'), '{}'::jsonb),
    'office', coalesce((select value from public.settings where key = 'office'), '{}'::jsonb));
$$;

create or replace function public.book_trip(p_campaign uuid, p_people jsonb, p_guarantor_name text, p_guarantor_phone text) returns int language plpgsql security definer set search_path = public as $$
declare me public.profiles; x jsonb; n int := 0;
begin
  select * into me from public.profiles where id = auth.uid() and active and role = 'pilgrim';
  if me.id is null then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.campaigns where id = p_campaign and status = 'open') then raise exception 'الحملة مغلقة'; end if;
  if jsonb_typeof(p_people) <> 'array' or jsonb_array_length(p_people) between 1 and 12 is not true then raise exception 'عدد الأشخاص غير صحيح'; end if;
  for x in select * from jsonb_array_elements(p_people) loop
    if coalesce((x->>'self')::boolean, false) and exists (select 1 from public.pilgrims where campaign_id = p_campaign and user_id = me.id) then raise exception 'مسجّل بهذه الحملة من قبل'; end if;
    insert into public.pilgrims (id, campaign_id, user_id, booked_by, name, gender, birth_date, phone, room_type, guarantor_name, guarantor_phone, gift_from, status)
    values (gen_random_uuid(), p_campaign, case when coalesce((x->>'self')::boolean, false) then me.id end, me.id,
      left(coalesce(nullif(x->>'name', ''), me.name), 120), case when x->>'gender' = 'f' then 'f' else 'm' end,
      nullif(x->>'birth_date', '')::date, left(coalesce(nullif(x->>'phone', ''), me.phone), 30),
      case when x->>'room_type' in ('double','triple','quad','quint') then x->>'room_type' end,
      left(p_guarantor_name, 120), left(p_guarantor_phone, 30), case when coalesce((x->>'gift')::boolean, false) then me.name end, 'request');
    n := n + 1;
  end loop;
  return n;
end; $$;

create or replace function public.finish_umrah(p_pilgrim uuid) returns date language plpgsql security definer set search_path = public as $$
declare d date;
begin
  perform set_config('siraj.bypass', '1', true);
  update public.pilgrims set done_at = coalesce(done_at, current_date), status = 'done'
   where id = p_pilgrim and (user_id = auth.uid() or booked_by = auth.uid()) and status in ('approved','visa','travel','done') returning done_at into d;
  perform set_config('siraj.bypass', '', true);
  if d is null then raise exception 'not allowed'; end if;
  return d;
end; $$;

create or replace function public.guard_pilgrim() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_manager() and coalesce(current_setting('siraj.bypass', true), '') <> '1' then
    new.id := old.id; new.campaign_id := old.campaign_id; new.user_id := old.user_id; new.status := old.status;
    new.bus := old.bus; new.seat := old.seat; new.bus_sup := old.bus_sup; new.driver := old.driver; new.room := old.room;
    new.price := old.price; new.notes := old.notes; new.booked_by := old.booked_by; new.gift_from := old.gift_from; new.room_type := old.room_type; new.done_at := old.done_at; new.mahram_id := old.mahram_id; new.name := old.name;
    new.docs := (coalesce(old.docs, '{}'::jsonb) || (coalesce(new.docs, '{}'::jsonb) - 'visa') - 'visa') || case when old.docs ? 'visa' then jsonb_build_object('visa', old.docs->'visa') else '{}'::jsonb end;
  end if;
  return new;
end; $$;

drop policy if exists self_read on public.pilgrims;
drop policy if exists self_update on public.pilgrims;
create policy self_read on public.pilgrims for select to authenticated using ((user_id = auth.uid() or booked_by = auth.uid()) and public.is_active());
create policy self_update on public.pilgrims for update to authenticated using ((user_id = auth.uid() or booked_by = auth.uid()) and public.is_active()) with check (true);
drop policy if exists public_read on public.settings;
create policy public_read on public.settings for select to authenticated using (key in ('shamcash','office','public','rate_syp') and public.is_active());

drop policy if exists docs_own_read on storage.objects;
drop policy if exists docs_own_write on storage.objects;
create policy docs_own_read on storage.objects for select to authenticated
  using (bucket_id = 'docs' and (storage.foldername(name))[1] in (select id::text from public.pilgrims where user_id = auth.uid() or booked_by = auth.uid()));
create policy docs_own_write on storage.objects for insert to authenticated
  with check (bucket_id = 'docs' and storage.filename(name) !~ '^visa' and (storage.foldername(name))[1] in (select id::text from public.pilgrims where user_id = auth.uid() or booked_by = auth.uid()));

revoke execute on all functions in schema public from public;
grant execute on function public.has_manager(), public.public_info() to anon, authenticated;
grant execute on function public.is_manager(), public.is_active(), public.is_staff_of(uuid), public.my_campaigns(), public.my_pilgrims(),
  public.bootstrap_manager(text, text), public.book_trip(uuid, jsonb, text, text), public.finish_umrah(uuid), public.set_location(double precision, double precision, real),
  public.stop_location(), public.admin_set_password(uuid, text), public.save_push_sub(text, text, text), public.delete_push_sub(text) to authenticated;
