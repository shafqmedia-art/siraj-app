-- السراج المنير · ترقية v3 (تطبيق دليل العمل)
-- شغّله مرة واحدة من SQL Editor بعد schema-upgrade-v2.sql. آمن للتكرار.
-- ما يفعله: صلاحيات service_role، سعر الليرة في الصفحة العامة، إيصالات PDF حتى 5MB، والإيصالات للمدير فقط.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;

drop policy if exists public_read on public.settings;
create policy public_read on public.settings for select to authenticated using (key in ('shamcash','office','public','rate_syp') and public.is_active());

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
    'office', coalesce((select value from public.settings where key = 'office'), '{}'::jsonb),
    'rate', coalesce((select value from public.settings where key = 'rate_syp'), 'null'::jsonb));
$$;
grant execute on function public.public_info() to anon, authenticated;

update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf'] where id = 'docs';

drop policy if exists docs_own_read on storage.objects;
create policy docs_own_read on storage.objects for select to authenticated
  using (bucket_id = 'docs' and storage.filename(name) !~ '^receipt' and (storage.foldername(name))[1] in (select id::text from public.pilgrims where user_id = auth.uid() or booked_by = auth.uid()));
