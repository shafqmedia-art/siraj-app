// إعدادات تطبيق السراج المنير.
// mode: "server"  = البيانات على هذا الجهاز فقط (للتجربة بدون سيرفر).
// mode: "server" = البيانات على Supabase ويدخل المعتمرين والفريق من أجهزتهم.
// serverKey هو المفتاح العام (publishable) وآمن للنشر. لا تضع هنا المفتاح السري (service_role) أبداً.
window.SIRAJ_CONFIG = {
  mode: "server",
  serverUrl: "https://svexkzbpkfliwyodjwdq.supabase.co",
  serverKey: "sb_publishable_MTeMahiZ5TdMDKLn1Z25ZQ_01OcGw0n",
  loginDomain: "siraj.app",
  countryCode: "963",
  pushKey: "BKIHdkmG5ZDnr7lKFH7yj8B1ykgP1Ci4ZFqA7F1mhzAMGH6rEQZBAhBMgt2guWE3XgGaKR0G_i4FsiJhO8mgx28"
};
