-- السراج المنير · تشغيل دالة الإشعارات كل 5 دقايق (تذكير الصلاة + تذكير الانطلاق)
-- قبل التشغيل: Database ← Extensions ← فعّل pg_cron و pg_net، وانشر دالة push.
-- غيّر PROJECT_REF لرمز مشروعك (موجود برابط Supabase).
-- غيّر CRON_SECRET_VALUE لنفس قيمة السر المحفوظة في Edge Functions ← Secrets باسم CRON_SECRET.
-- لا ترفع هذا الملف بعد وضع السر فيه على أي ريبو عام.
select cron.unschedule('siraj-push') where exists (select 1 from cron.job where jobname = 'siraj-push');
select cron.schedule('siraj-push', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/push',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "CRON_SECRET_VALUE"}'::jsonb,
    body := '{"action": "cron"}'::jsonb
  );
$$);
