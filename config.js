// إعدادات تطبيق السراج المنير.
// mode: "local"  = البيانات على هذا الجهاز فقط (للتجربة بدون سيرفر).
// mode: "server" = البيانات على Supabase ويدخل المعتمرين والفريق من أجهزتهم.
// serverKey هو المفتاح العام (publishable) وآمن للنشر. لا تضع هنا المفتاح السري (service_role) أبداً.
window.SIRAJ_CONFIG = {
  mode: "local",
  serverUrl: "https://PROJECT_REF.supabase.co",
  serverKey: "sb_publishable_...",
  loginDomain: "siraj.app",
  countryCode: "963",
  pushKey: ""
};
