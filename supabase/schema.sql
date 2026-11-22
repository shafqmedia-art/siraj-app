-- السراج المنير للحج والعمرة · قاعدة البيانات الكاملة (Supabase / PostgreSQL)
-- طريقة التشغيل: Supabase ← SQL Editor ← New query ← الصق الملف كاملاً ← Run
-- يُشغَّل مرة واحدة على مشروع جديد فارغ.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ================= الجداول =================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  phone text check (length(phone) <= 30),
  login_phone text unique,
  role text not null default 'pilgrim' check (role in ('manager','staff','pilgrim')),
  title text check (length(title) <= 60),
  gender text not null default 'm' check (gender in ('m','f')),
  photo text check (length(photo) <= 420000),
  prefs jsonb not null default '{}'::jsonb check (length(prefs::text) <= 2000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key,
  name text not null check (length(name) between 1 and 120),
  start_date date,
  end_date date,
  depart_place text check (length(depart_place) <= 200),
  depart_time text check (length(depart_time) <= 20),
  makkah_hotel text check (length(makkah_hotel) <= 160),
  makkah_nights int check (makkah_nights between 0 and 30),
  madinah_hotel text check (length(madinah_hotel) <= 160),
  madinah_nights int check (madinah_nights between 0 and 30),
  price numeric not null default 0 check (price >= 0),
  seats int check (seats between 0 and 2000),
  sup_name text check (length(sup_name) <= 120),
  sup_sy text check (length(sup_sy) <= 30),
  sup_sa text check (length(sup_sa) <= 30),
  staff jsonb not null default '[]'::jsonb check (jsonb_typeof(staff) = 'array' and length(staff::text) <= 20000),
  program jsonb not null default '[]'::jsonb check (jsonb_typeof(program) = 'array' and length(program::text) <= 60000),
  notes text check (length(notes) <= 4000),
  status text not null default 'open' check (status in ('open','closed','done')),
  trip_type text not null default 'land' check (trip_type in ('land','flight')),
  flight_info text check (length(flight_info) <= 300),
  hotel_stars int check (hotel_stars between 0 and 5),
  prices jsonb not null default '{}'::jsonb check (jsonb_typeof(prices) = 'object' and length(prices::text) <= 500),
  deadline date,
  hotel_info jsonb not null default '{}'::jsonb check (jsonb_typeof(hotel_info) = 'object' and length(hotel_info::text) <= 3000),
  includes text check (length(includes) <= 2000),
  excludes text check (length(excludes) <= 1000),
  travel_time text check (length(travel_time) <= 120),
  terms text check (length(terms) <= 2000),
  deposit_pct int not null default 50 check (deposit_pct between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.pilgrims (
  id uuid primary key,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null check (length(name) between 1 and 120),
  gender text not null default 'm' check (gender in ('m','f')),
  birth_date date,
  phone text check (length(phone) <= 30),
  passport_no text check (length(passport_no) <= 30),
  passport_exp date,
  nationality text check (length(nationality) <= 40),
  bus text check (length(bus) <= 20),
  seat text check (length(seat) <= 20),
  bus_sup text check (length(bus_sup) <= 120),
  driver text check (length(driver) <= 120),
  room text check (length(room) <= 40),
  mahram_id uuid,
  blood text check (length(blood) <= 6),
  health text check (length(health) <= 600),
  notes text check (length(notes) <= 2000),
  price numeric check (price >= 0),
  status text not null default 'request' check (status in ('request','approved','visa','travel','done','cancelled')),
  docs jsonb not null default '{}'::jsonb check (jsonb_typeof(docs) = 'object' and length(docs::text) <= 2000),
  done_at date,
  room_type text check (room_type in ('double','triple','quad','quint')),
  guarantor_name text check (length(guarantor_name) <= 120),
  guarantor_phone text check (length(guarantor_phone) <= 30),
  booked_by uuid references public.profiles(id) on delete set null,
  gift_from text check (length(gift_from) <= 120),
  created_at timestamptz not null default now()
);
create index on public.pilgrims (campaign_id);
create index on public.pilgrims (user_id);
create index on public.pilgrims (booked_by);

create table public.moves (
  id uuid primary key,
  date date not null,
  dir text not null check (dir in ('in','out')),
  cat text not null check (length(cat) <= 60),
  amount numeric not null check (amount > 0 and amount < 1e12),
  cur text not null check (cur in ('USD','SYP','SAR')),
  rate numeric not null default 1 check (rate > 0),
  usd numeric not null check (usd >= 0),
  method text not null default 'cash' check (method in ('shamcash','cash','transfer','other')),
  campaign_id uuid references public.campaigns(id) on delete set null,
  pilgrim_id uuid references public.pilgrims(id) on delete set null,
  receipt text check (length(receipt) <= 300),
  status text not null default 'confirmed' check (status in ('pending','confirmed','rejected')),
  note text check (length(note) <= 500),
  is_void boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  from_id uuid references public.profiles(id) on delete set null,
  to_id uuid references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('question','reply','broadcast','direct','sos')),
  body text not null check (length(body) between 1 and 1000),
  reply_to uuid,
  lat double precision, lng double precision,
  created_at timestamptz not null default now()
);

create table public.locations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  acc real,
  at timestamptz not null default now()
);

create table public.settings (key text primary key check (length(key) <= 40), value jsonb not null check (length(value::text) <= 450000));

create table public.push_subs (
  endpoint text primary key check (endpoint ~ '^https://(fcm\.googleapis\.com|[a-z0-9.-]*\.push\.apple\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]*\.notify\.windows\.com)/'),
  user_id uuid not null references public.profiles(id) on delete cascade,
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  created_at timestamptz not null default now()
);

-- ================= دوال مساعدة =================
create function public.is_manager() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'manager' and active);
$$;
create function public.is_active() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;
-- هل المستخدم الحالي من فريق هذه الحملة؟
create function public.is_staff_of(cid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.campaigns c join public.profiles p on p.id = auth.uid() and p.active and p.role = 'staff'
                 where c.id = cid and c.staff @> jsonb_build_array(jsonb_build_object('user', auth.uid()::text)));
$$;
-- حملات المعتمر الحالي
create function public.my_campaigns() returns setof uuid language sql stable security definer set search_path = public as $$
  select campaign_id from public.pilgrims where (user_id = auth.uid() or booked_by = auth.uid()) and public.is_active();
$$;
create function public.my_pilgrims() returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.pilgrims where (user_id = auth.uid() or booked_by = auth.uid()) and public.is_active();
$$;
create function public.has_manager() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where role = 'manager');
$$;
create function public.bootstrap_manager(p_name text, p_phone text) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.profiles where role = 'manager') then raise exception 'manager already exists'; end if;
  insert into public.profiles (id, name, phone, login_phone, role, title, active)
  values (auth.uid(), p_name, p_phone, regexp_replace(p_phone, '[^0-9]', '', 'g'), 'manager', 'المدير', true);
end; $$;

-- معلومات الصفحة العامة (لأي زائر): الرحلات المفتوحة، الرحلات المنجزة، آراء العملاء، الفيديوهات، أرقام المكتب
create function public.public_info() returns json language sql stable security definer set search_path = public as $$
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
    'office', coalesce((select value from public.settings where key = 'office'), '{}'::jsonb),
    'rate', coalesce((select value from public.settings where key = 'rate_syp'), 'null'::jsonb));
$$;

-- حجز رحلة لمستخدم داخل (لنفسه و/أو لعائلته، أو إهداء)
create function public.book_trip(p_campaign uuid, p_people jsonb, p_guarantor_name text, p_guarantor_phone text) returns int language plpgsql security definer set search_path = public as $$
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

-- المعتمر أنهى عمرته من المطوّف ← تطلع شهادته
create function public.finish_umrah(p_pilgrim uuid) returns date language plpgsql security definer set search_path = public as $$
declare d date;
begin
  perform set_config('siraj.bypass', '1', true);
  update public.pilgrims set done_at = coalesce(done_at, current_date), status = 'done'
   where id = p_pilgrim and (user_id = auth.uid() or booked_by = auth.uid()) and status in ('approved','visa','travel','done') returning done_at into d;
  perform set_config('siraj.bypass', '', true);
  if d is null then raise exception 'not allowed'; end if;
  return d;
end; $$;

-- مشاركة الموقع
create function public.set_location(p_lat double precision, p_lng double precision, p_acc real) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active() then raise exception 'not signed in'; end if;
  insert into public.locations (user_id, lat, lng, acc, at) values (auth.uid(), p_lat, p_lng, p_acc, now())
  on conflict (user_id) do update set lat = excluded.lat, lng = excluded.lng, acc = excluded.acc, at = now();
end; $$;
create function public.stop_location() returns void language sql security definer set search_path = public as $$
  delete from public.locations where user_id = auth.uid();
$$;

-- المدير يغيّر كلمة سر أي حساب
create function public.admin_set_password(p_user uuid, p_pass text) returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_manager() then raise exception 'not allowed'; end if;
  if length(coalesce(p_pass, '')) < 8 then raise exception 'كلمة السر 8 أحرف على الأقل'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'الحساب مو موجود'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_pass, extensions.gen_salt('bf')), updated_at = now() where id = p_user;
end; $$;

-- أجهزة الإشعارات
create function public.save_push_sub(p_endpoint text, p_p256dh text, p_auth text) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.push_subs (endpoint, user_id, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end; $$;
create function public.delete_push_sub(p_endpoint text) returns void language sql security definer set search_path = public as $$
  delete from public.push_subs where endpoint = p_endpoint and user_id = auth.uid();
$$;

-- ================= حراس التعديل =================
create function public.guard_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_manager() then
    new.role := old.role; new.active := old.active; new.login_phone := old.login_phone; new.id := old.id; new.title := old.title;
  end if;
  return new;
end; $$;
create trigger guard_profile before update on public.profiles for each row execute function public.guard_profile();

-- المعتمر يعدّل بياناته الشخصية ووثائقه فقط (لا الحالة ولا الباص ولا السعر ولا التأشيرة)
create function public.guard_pilgrim() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_manager() and coalesce(current_setting('siraj.bypass', true), '') <> '1' then
    new.id := old.id; new.campaign_id := old.campaign_id; new.user_id := old.user_id; new.status := old.status;
    new.bus := old.bus; new.seat := old.seat; new.bus_sup := old.bus_sup; new.driver := old.driver; new.room := old.room;
    new.price := old.price; new.notes := old.notes; new.booked_by := old.booked_by; new.gift_from := old.gift_from; new.room_type := old.room_type; new.done_at := old.done_at; new.mahram_id := old.mahram_id; new.name := old.name;
    new.docs := (coalesce(old.docs, '{}'::jsonb) || (coalesce(new.docs, '{}'::jsonb) - 'visa') - 'visa') || case when old.docs ? 'visa' then jsonb_build_object('visa', old.docs->'visa') else '{}'::jsonb end;
  end if;
  return new;
end; $$;
create trigger guard_pilgrim before update on public.pilgrims for each row execute function public.guard_pilgrim();

-- ================= الصلاحيات (RLS) =================
alter table public.profiles  enable row level security;
alter table public.campaigns enable row level security;
alter table public.pilgrims  enable row level security;
alter table public.moves     enable row level security;
alter table public.messages  enable row level security;
alter table public.locations enable row level security;
alter table public.settings  enable row level security;
alter table public.push_subs enable row level security;

-- المدير: كل شيء
create policy mgr_all on public.profiles  for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy mgr_all on public.campaigns for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy mgr_all on public.pilgrims  for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy mgr_all on public.moves     for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy mgr_all on public.messages  for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy mgr_all on public.locations for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy mgr_all on public.settings  for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- الشخص نفسه
create policy self_read   on public.profiles for select to authenticated using (id = auth.uid());
create policy self_update on public.profiles for update to authenticated using (id = auth.uid() and public.is_active()) with check (id = auth.uid());

-- الحملات: الفريق يشوف حملاته، والمعتمر حملاته
create policy staff_read on public.campaigns for select to authenticated using (public.is_staff_of(id));
create policy pilgrim_read on public.campaigns for select to authenticated using (id in (select public.my_campaigns()));

-- المعتمرين: الفريق يشوف معتمري حملته، والمعتمر نفسه
create policy staff_read on public.pilgrims for select to authenticated using (public.is_staff_of(campaign_id));
create policy self_read on public.pilgrims for select to authenticated using ((user_id = auth.uid() or booked_by = auth.uid()) and public.is_active());
create policy self_update on public.pilgrims for update to authenticated using ((user_id = auth.uid() or booked_by = auth.uid()) and public.is_active()) with check (true);

-- المال: المعتمر يشوف دفعاته، ويضيف دفعة «بانتظار التأكيد» بس
create policy self_read on public.moves for select to authenticated using (pilgrim_id in (select public.my_pilgrims()));
create policy self_pay on public.moves for insert to authenticated with check (
  dir = 'in' and status = 'pending' and is_void = false and created_by = auth.uid()
  and pilgrim_id in (select public.my_pilgrims())
  and campaign_id = (select campaign_id from public.pilgrims where id = pilgrim_id));

-- الرسائل
create policy own_read on public.messages for select to authenticated using (
  public.is_active() and (from_id = auth.uid() or to_id = auth.uid()
  or (kind = 'broadcast' and (campaign_id in (select public.my_campaigns()) or public.is_staff_of(campaign_id)))
  or (kind in ('sos','question') and public.is_staff_of(campaign_id))));
create policy own_send on public.messages for insert to authenticated with check (
  public.is_active() and from_id = auth.uid() and (
    (kind in ('question','sos') and to_id is null and (campaign_id is null or campaign_id in (select public.my_campaigns()) or public.is_staff_of(campaign_id)))
    or (kind in ('broadcast','direct','reply') and public.is_staff_of(campaign_id))));

-- المواقع: الفريق يشوف مواقع معتمري حملته
create policy self_read on public.locations for select to authenticated using (user_id = auth.uid());
create policy staff_read on public.locations for select to authenticated using (exists (select 1 from public.pilgrims p where p.user_id = locations.user_id and public.is_staff_of(p.campaign_id)));

-- الإعدادات العامة (شام كاش ورقم المكتب) يقرأها الكل
create policy public_read on public.settings for select to authenticated using (key in ('shamcash','office','public','rate_syp') and public.is_active());

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage on schema public to service_role;
revoke all on public.push_subs from authenticated;
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from public;
grant execute on function public.has_manager(), public.public_info() to anon, authenticated;
grant execute on function public.is_manager(), public.is_active(), public.is_staff_of(uuid), public.my_campaigns(), public.my_pilgrims(),
  public.bootstrap_manager(text, text), public.book_trip(uuid, jsonb, text, text), public.finish_umrah(uuid), public.set_location(double precision, double precision, real),
  public.stop_location(), public.admin_set_password(uuid, text), public.save_push_sub(text, text, text), public.delete_push_sub(text) to authenticated;

-- ================= التخزين: صور الجوازات والتأشيرات والإيصالات =================
-- الملفات خاصة: المسار {رقم المعتمر}/{النوع}-{الوقت}.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('docs', 'docs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

create policy docs_mgr on storage.objects for all to authenticated
  using (bucket_id = 'docs' and public.is_manager()) with check (bucket_id = 'docs' and public.is_manager());
create policy docs_own_read on storage.objects for select to authenticated
  using (bucket_id = 'docs' and storage.filename(name) !~ '^receipt' and (storage.foldername(name))[1] in (select id::text from public.pilgrims where user_id = auth.uid() or booked_by = auth.uid()));
create policy docs_own_write on storage.objects for insert to authenticated
  with check (bucket_id = 'docs' and storage.filename(name) !~ '^visa' and (storage.foldername(name))[1] in (select id::text from public.pilgrims where user_id = auth.uid() or booked_by = auth.uid()));
create policy docs_staff_photo on storage.objects for select to authenticated
  using (bucket_id = 'docs' and storage.filename(name) ~ '^photo' and exists (select 1 from public.pilgrims p where p.id::text = (storage.foldername(name))[1] and public.is_staff_of(p.campaign_id)));
