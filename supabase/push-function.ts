// السراج المنير · دالة الإشعارات (Supabase Edge Function اسمها push)
// الأحداث + تذكير الصلاة بتوقيت مكة والمدينة + تذكير الانطلاق + إنشاء الحسابات + التسجيل على عمرة + نسيت كلمة السر.
// الأسرار من Secrets: VAPID_PUBLIC و VAPID_PRIVATE و VAPID_SUBJECT و ALLOWED_ORIGINS و CRON_SECRET.
// Verify JWT = OFF: التحقق يتم هنا في الكود (المصدر المسموح، حقل الفخ، حد الطلبات لكل جهاز، سر الكرون).

const env = (k) => String((globalThis.Deno ? Deno.env.get(k) : process.env[k]) || '').trim();
const SB = env('SUPABASE_URL'), SK = env('SUPABASE_SERVICE_ROLE_KEY');
const enc = new TextEncoder();
const ORIGINS = (env('ALLOWED_ORIGINS') || 'https://example.github.io').split(',').map((x) => x.trim()).filter(Boolean);
const corsFor = (req) => { const o = req.headers.get('origin') || ''; return { 'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0], 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }; };
const DOMAIN = env('LOGIN_DOMAIN') || 'siraj.app';

/* ---------- ترميز ---------- */
const b64u = (buf) => { let s = ''; new Uint8Array(buf).forEach((c) => (s += String.fromCharCode(c))); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const ub64 = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), o = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; };
const cat = (...a) => { const n = a.reduce((x, y) => x + y.length, 0), o = new Uint8Array(n); let p = 0; a.forEach((x) => { o.set(x, p); p += x.length; }); return o; };
const hkdf = async (salt, ikm, info, len) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), len * 8));

/* ---------- VAPID (RFC 8292) ---------- */
let vapidKey = null;
async function vapidHeader(endpoint) {
  const pub = ub64(env('VAPID_PUBLIC'));
  if (!vapidKey) vapidKey = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: env('VAPID_PRIVATE'), ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const u = new URL(endpoint);
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud: u.origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env('VAPID_SUBJECT') || (ORIGINS[0] || 'mailto:admin@example.com') })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, vapidKey, enc.encode(head + '.' + body));
  return 'vapid t=' + head + '.' + body + '.' + b64u(sig) + ', k=' + env('VAPID_PUBLIC');
}

/* ---------- تشفير الرسالة (RFC 8291, aes128gcm) ---------- */
async function encrypt(text, p256dh, auth, fixed) {
  const ua = ub64(p256dh), secret = ub64(auth);
  const as = fixed ? fixed.keys : await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(secret, shared, cat(enc.encode('WebPush: info\0'), ua, asPub), 32);
  const salt = fixed ? fixed.salt : crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(enc.encode(text), new Uint8Array([2]))));
  return cat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([65]), asPub, ct);
}

async function sendOne(sub, msg) {
  const body = await encrypt(JSON.stringify(msg), sub.p256dh, sub.auth);
  const r = await fetch(sub.endpoint, { method: 'POST', headers: { Authorization: await vapidHeader(sub.endpoint), TTL: '86400', Urgency: 'high', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream' }, body });
  if (r.status >= 300) { const t = await r.text().catch(() => ''); console.log('push', r.status, new URL(sub.endpoint).host, t.slice(0, 200)); if (r.status !== 404 && r.status !== 410) throw new Error(new URL(sub.endpoint).host + ' ' + r.status + ' ' + t.slice(0, 80)); }
  if (r.status === 404 || r.status === 410) await db('DELETE', 'push_subs?endpoint=eq.' + encodeURIComponent(sub.endpoint));
  return r.status;
}

/* ---------- قاعدة البيانات بمفتاح الخدمة ---------- */
async function db(method, path, body, prefer) {
  const r = await fetch(SB + '/rest/v1/' + path, { method, headers: { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json', Prefer: prefer || 'return=minimal' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('db ' + r.status + ' ' + (await r.text()));
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
const lastErr = [];
async function sendTo(userIds, msg) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return 0;
  const subs = await db('GET', 'push_subs?select=endpoint,p256dh,auth,user_id&user_id=in.(' + ids.join(',') + ')');
  sendTo.subs = (sendTo.subs || 0) + subs.length;
  const res = await Promise.allSettled(subs.map((s) => sendOne(s, msg)));
  res.forEach((x) => { if (x.status === 'rejected') lastErr.push(String(x.reason && x.reason.message || x.reason).slice(0, 120)); else if (x.value >= 300) lastErr.push('push ' + x.value); });
  return res.filter((x) => x.status === 'fulfilled' && x.value < 300).length;
}


/* ---------- مواقيت الصلاة (نفس ملف prayer.js) ---------- */
/* مواقيت الصلاة بطريقة أم القرى (مكة المكرمة) — حساب فلكي محلي بدون إنترنت */
(function (root) {
  'use strict';
  var CITIES = {
    makkah: { name: 'مكة المكرمة', lat: 21.4225, lng: 39.8262, tz: 3 },
    madinah: { name: 'المدينة المنورة', lat: 24.4672, lng: 39.6111, tz: 3 }
  };
  var NAMES = { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
  var ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  var D2R = Math.PI / 180;
  function fix(a, b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; }
  function sin(d) { return Math.sin(d * D2R); } function cos(d) { return Math.cos(d * D2R); } function tan(d) { return Math.tan(d * D2R); }
  function asin(x) { return Math.asin(x) / D2R; } function acos(x) { return Math.acos(Math.max(-1, Math.min(1, x))) / D2R; }
  function atan2(y, x) { return Math.atan2(y, x) / D2R; } function acot(x) { return Math.atan(1 / x) / D2R; }
  function julian(y, m, d) { if (m <= 2) { y -= 1; m += 12; } var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4); return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5; }
  function sun(jd) {
    var D = jd - 2451545.0, g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
    var L = fix(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360), e = 23.439 - 0.00000036 * D;
    var RA = atan2(cos(e) * sin(L), cos(L)) / 15, eqt = q / 15 - fix(RA, 24), decl = asin(sin(e) * sin(L));
    return { decl: decl, eqt: eqt };
  }
  function ramadan(date) {
    try { return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', timeZone: 'Asia/Riyadh' }).format(date).replace(/\D/g, '') === '9'; } catch (e) { return false; }
  }
  // ymd: "YYYY-MM-DD" بتوقيت السعودية
  function times(ymd, cityKey) {
    var c = CITIES[cityKey] || CITIES.makkah, p = ymd.split('-').map(Number);
    var jd = julian(p[0], p[1], p[2]) - c.lng / (15 * 24);
    function mid(t) { return fix(12 - sun(jd + t).eqt, 24); }
    function angleTime(angle, t, ccw) {
      var s = sun(jd + t), T = acos((-sin(angle) - sin(s.decl) * sin(c.lat)) / (cos(s.decl) * cos(c.lat))) / 15;
      return mid(t) + (ccw ? -T : T);
    }
    function asr(t) { var s = sun(jd + t); return angleTime(-acot(1 + tan(Math.abs(c.lat - s.decl))), t); }
    var g = { fajr: 5 / 24, sunrise: 6 / 24, dhuhr: 12 / 24, asr: 13 / 24, sunset: 18 / 24 };
    var r = { fajr: angleTime(18.5, g.fajr, true), sunrise: angleTime(0.833, g.sunrise, true), dhuhr: mid(g.dhuhr), asr: asr(g.asr), sunset: angleTime(0.833, g.sunset) };
    var adj = c.tz - c.lng / 15, out = {};
    out.fajr = r.fajr + adj; out.sunrise = r.sunrise + adj; out.dhuhr = r.dhuhr + adj + 1 / 60; out.asr = r.asr + adj; out.maghrib = r.sunset + adj;
    out.isha = out.maghrib + (ramadan(new Date(ymd + 'T12:00:00+03:00')) ? 2 : 1.5);
    var res = {};
    ORDER.forEach(function (k) { var m = Math.round(out[k] * 60); res[k] = m; });
    return res; // دقائق من منتصف الليل بتوقيت السعودية
  }
  function hm(min) { min = ((min % 1440) + 1440) % 1440; var h = Math.floor(min / 60), m = min % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  function hm12(min) { min = ((min % 1440) + 1440) % 1440; var h = Math.floor(min / 60), m = min % 60, pm = h >= 12; h = h % 12 || 12; return h + ':' + (m < 10 ? '0' : '') + m + (pm ? ' م' : ' ص'); }
  // الوقت الحالي بتوقيت السعودية
  function ksaNow(d) {
    d = d || new Date();
    var f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
    var g = function (t) { return f.filter(function (x) { return x.type === t; })[0].value; };
    return { day: g('year') + '-' + g('month') + '-' + g('day'), min: +g('hour') * 60 + +g('minute') };
  }
  function next(cityKey, d) {
    var n = ksaNow(d), t = times(n.day, cityKey);
    for (var i = 0; i < ORDER.length; i++) { var k = ORDER[i]; if (k !== 'sunrise' && t[k] > n.min) return { key: k, name: NAMES[k], at: t[k], left: t[k] - n.min }; }
    return { key: 'fajr', name: NAMES.fajr, at: t.fajr, left: t.fajr + 1440 - n.min, tomorrow: true };
  }
  root.SIRAJ_PRAYER = { CITIES: CITIES, NAMES: NAMES, ORDER: ORDER, times: times, hm: hm, hm12: hm12, ksaNow: ksaNow, next: next };
})(typeof window !== 'undefined' ? window : globalThis);

const PR = globalThis.SIRAJ_PRAYER;


/* ---------- أدوات ---------- */
const digitsOf = (p) => String(p || '').replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632)).replace(/\D/g, '');
const shortPhone = (p) => digitsOf(p).replace(/^00/, '').replace(/^963/, '').replace(/^966/, '').replace(/^0/, '');
const sir = (p) => (p.gender === 'f' ? 'الحاجّة ' : 'الحاج ') + (p.name || '').split(' ')[0];
async function setting(key) { const r = await db('GET', 'settings?select=value&key=eq.' + key); return r[0] ? r[0].value : null; }
async function putSetting(key, value) { await db('POST', 'settings?on_conflict=key', { key, value }, 'resolution=merge-duplicates,return=minimal'); }
async function managers() { return (await db('GET', 'profiles?select=id&role=eq.manager&active=is.true')).map((p) => p.id); }
async function campaignPeople(cid, withStaff) {
  const [pil, camp] = await Promise.all([
    db('GET', 'pilgrims?select=user_id&status=neq.cancelled&campaign_id=eq.' + cid),
    db('GET', 'campaigns?select=staff&id=eq.' + cid),
  ]);
  const ids = pil.map((p) => p.user_id).filter(Boolean);
  if (withStaff && camp[0]) (camp[0].staff || []).forEach((s) => s && s.user && ids.push(s.user));
  return ids;
}
async function staffOf(cid) { const c = await db('GET', 'campaigns?select=staff&id=eq.' + cid); return c[0] ? (c[0].staff || []).map((s) => s.user).filter(Boolean) : []; }

/* ---------- التشغيل كل 5 دقايق: تذكير الصلاة + تذكير الانطلاق ---------- */
async function cron(now) {
  now = now || new Date();
  const k = PR.ksaNow(now);
  const out = { prayer: 0, depart: 0 };
  const [profiles, subs] = await Promise.all([
    db('GET', 'profiles?select=id,name,gender,prefs,active&active=is.true'),
    db('GET', 'push_subs?select=user_id'),
  ]);
  const hasSub = new Set(subs.map((s) => s.user_id));
  const st = Object.assign({ day: '', sent: {} }, (await setting('prayer_state')) || {});
  if (st.day !== k.day) { st.day = k.day; st.sent = {}; }
  const T = { makkah: PR.times(k.day, 'makkah'), madinah: PR.times(k.day, 'madinah') };
  const groups = {};
  for (const p of profiles) {
    const pr = (p.prefs && p.prefs.prayer) || {};
    if (!pr.on || !hasSub.has(p.id)) continue;
    const city = pr.city === 'madinah' ? 'madinah' : 'makkah', before = [0, 5, 10, 15, 20, 30].includes(+pr.before) ? +pr.before : 15;
    for (const key of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      const target = T[city][key] - before;
      if (k.min < target || k.min >= target + 5) continue;
      const g = city + ':' + before + ':' + key;
      if (st.sent[g]) continue;
      (groups[g] = groups[g] || { city, before, key, ids: [] }).ids.push(p.id);
    }
  }
  for (const g of Object.keys(groups)) {
    const x = groups[g], when = x.before ? ' بعد ' + (x.before === 15 ? 'ربع ساعة' : x.before === 30 ? 'نصف ساعة' : x.before + ' دقائق') : ' الآن';
    out.prayer += await sendTo(x.ids, { title: 'أذان ' + PR.NAMES[x.key] + when, body: PR.CITIES[x.city].name + ' · ' + PR.hm12(T[x.city][x.key]) + ' بتوقيت السعودية', tag: 'prayer-' + x.key, url: './#/prayer' });
    st.sent[g] = 1;
  }
  await putSetting('prayer_state', st);

  // تذكير الانطلاق: مساء اليوم السابق (بتوقيت دمشق)
  const dm = damascus(now);
  if (dm.hour >= 20 && dm.hour <= 22) {
    const tomorrow = new Date(Date.parse(dm.day + 'T12:00:00Z') + 864e5).toISOString().slice(0, 10);
    const ds = Object.assign({}, (await setting('depart_state')) || {});
    const camps = await db('GET', 'campaigns?select=id,name,depart_place,depart_time,start_date&start_date=eq.' + tomorrow);
    for (const c of camps) {
      if (ds[c.id]) continue;
      out.depart += await sendTo(await campaignPeople(c.id, true), { title: 'موعد الانطلاق غداً بإذن الله', body: (c.depart_time ? 'الساعة ' + c.depart_time + ' ' : '') + (c.depart_place ? 'من ' + c.depart_place + '. ' : '') + 'جهّز جوازك وحقيبتك، يسّر الله لك عمرتك.', tag: 'depart-' + c.id, url: './' });
      ds[c.id] = dm.day;
    }
    await putSetting('depart_state', ds);
  }
  return out;
}
function damascus(d) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Damascus', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const g = (t) => f.find((x) => x.type === t).value;
  return { day: g('year') + '-' + g('month') + '-' + g('day'), hour: +g('hour') };
}

/* ---------- مين عم يطلب؟ ---------- */
async function caller(req) {
  const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!tok || tok.split('.').length !== 3) return null;
  const ur = await fetch(SB + '/auth/v1/user', { headers: { apikey: SK, Authorization: 'Bearer ' + tok } });
  if (!ur.ok) return null;
  const me = await ur.json();
  const [prof] = await db('GET', 'profiles?select=id,name,role,active,gender&id=eq.' + me.id);
  return prof && prof.active !== false ? prof : null;
}

/* ---------- إنشاء حساب بالمدير ---------- */
async function adminCreate(phone, pass) {
  const d = digitsOf(phone);
  if (d.length < 8 || d.length > 15) return { status: 400, error: 'رقم الموبايل غير صحيح' };
  if (String(pass || '').length < 8 || String(pass).length > 72) return { status: 400, error: 'كلمة السر 8 أحرف على الأقل' };
  const r = await fetch(SB + '/auth/v1/admin/users', { method: 'POST', headers: { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: d + '@' + DOMAIN, password: String(pass), email_confirm: true }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { status: r.status === 422 ? 409 : 400, error: r.status === 422 ? 'هذا الرقم مسجّل لحساب آخر' : (j.msg || j.message || 'تعذر إنشاء الحساب') };
  return { status: 200, id: j.id || (j.user && j.user.id), login: d };
}
async function createUser(req, phone, pass) {
  const prof = await caller(req);
  if (!prof || prof.role !== 'manager') return { status: 403, error: 'مسموح للمدير بس' };
  return adminCreate(phone, pass);
}

/* ---------- تسجيل حساب جديد مع حجز رحلة (لنفسه، لعائلته، أو إهداء) ---------- */
const ROOMS = ['double', 'triple', 'quad', 'quint'];
function safeEq(a, b) {
  a = String(a || ''); b = String(b || '');
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i % (a.length || 1)) || 0) ^ (b.charCodeAt(i % (b.length || 1)) || 0);
  return d === 0 && a.length > 0;
}
async function ipHash(req) {
  const ip = (req && (req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0])) || 'none';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('siraj|' + ip.trim() + '|' + (env('CRON_SECRET') || 'salt')));
  return Array.from(new Uint8Array(buf)).slice(0, 10).map((x) => x.toString(16).padStart(2, '0')).join('');
}
async function devLimit(key, req, max) {
  const now = Date.now(), h = await ipHash(req), rl = Object.assign({ hour: 0, ips: {} }, (await setting(key)) || {});
  if (now - rl.hour > 3600e3 || !rl.ips) { rl.hour = now; rl.ips = {}; }
  rl.ips[h] = (rl.ips[h] || 0) + 1;
  await putSetting(key, rl);
  return rl.ips[h] <= max;
}
const originOk = (req) => !req || ORIGINS.includes(req.headers.get('origin') || '');

async function register(b, req) {
  if (b.website) return { status: 400, error: 'تعذّر إرسال الطلب. حاول مرة أخرى.' };
  const name = String(b.name || '').trim().slice(0, 120), gender = b.gender === 'f' ? 'f' : 'm';
  const ymd = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null);
  if (name.length < 3) return { status: 400, error: 'اكتب الاسم الثلاثي' };
  const camp = (await db('GET', 'campaigns?select=id,name,status,deadline,start_date&id=eq.' + encodeURIComponent(b.campaign_id || '00000000-0000-0000-0000-000000000000')))[0];
  const localDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Damascus' }).format(new Date());
  if (!camp || camp.status !== 'open' || (camp.deadline && camp.deadline < localDate) || (camp.start_date && camp.start_date < localDate)) return { status: 400, error: 'الحملة مغلقة أو غير موجودة' };
  const people = (Array.isArray(b.people) ? b.people : []).slice(0, 12);
  if (!people.length) return { status: 400, error: 'أضف شخصاً واحداً على الأقل' };
  if (!(await devLimit('reg_rl', req, 5))) return { status: 429, error: 'أرسلت طلبات كثيرة من هذا الجهاز. حاول بعد ساعة.' };
  const acc = await adminCreate(b.phone, b.pass);
  if (acc.status !== 200) return acc;
  const phone = String(b.phone || '').slice(0, 30);
  await db('POST', 'profiles', { id: acc.id, name, phone, login_phone: acc.login, role: 'pilgrim', gender, active: true, prefs: { prayer: { on: true, city: 'makkah', before: 15 } } });
  const bookingGroup = crypto.randomUUID();
  const passengers = people.map((x) => {
    const self = !!x.self;
    return {
      id: crypto.randomUUID(), booking_group: bookingGroup, campaign_id: camp.id, user_id: self ? acc.id : null, booked_by: acc.id,
      name: (self ? name : String(x.name || '').trim()).slice(0, 120) || name, gender: self ? gender : (x.gender === 'f' ? 'f' : 'm'),
      birth_date: ymd(self ? b.birth_date : x.birth_date), phone: self ? phone : String(x.phone || phone).slice(0, 30),
      room_type: ROOMS.includes(x.room_type) ? x.room_type : null, guarantor_name: String(b.guarantor_name || '').slice(0, 120) || null,
      guarantor_phone: String(b.guarantor_phone || '').slice(0, 30) || null, gift_from: x.gift ? name : null, status: 'request',
    };
  });
  await db('POST', 'pilgrims', passengers);
  const gift = people.some((x) => x.gift);
  await sendTo(await managers(), { title: (gift ? 'حجز إهداء جديد' : 'طلب عمرة جديد') + (people.length > 1 ? ' · ' + people.length + ' أشخاص' : ''), body: camp.name, tag: 'req-' + bookingGroup, url: './#/pilgrims' });
  return { status: 200, ok: true };
}

/* ---------- إشعار من التطبيق ---------- */
async function notify(req, items) {
  const prof = await caller(req);
  if (!prof) return { status: 401, sent: 0 };
  if (!env('VAPID_PUBLIC') || !env('VAPID_PRIVATE')) return { status: 200, sent: 0, subs: 0, errors: ['secrets: VAPID_PUBLIC أو VAPID_PRIVATE ناقص'] };
  let sent = 0; sendTo.subs = 0; lastErr.length = 0;
  const isMgr = prof.role === 'manager';
  for (const it of (items || []).slice(0, 20)) {
    let ids = [];
    if (it.to === 'managers') ids = await managers();
    else if (it.to && it.to.campaign) {
      const staff = await staffOf(it.to.campaign);
      if (isMgr || staff.includes(prof.id)) ids = await campaignPeople(it.to.campaign, true);
    } else if (it.to && it.to.campaignStaff) {
      // SOS أو سؤال: للمدير وفريق حملة المعتمر
      const mine = await db('GET', 'pilgrims?select=id&user_id=eq.' + prof.id + '&campaign_id=eq.' + it.to.campaignStaff);
      if (isMgr || mine.length || (await staffOf(it.to.campaignStaff)).includes(prof.id)) ids = (await managers()).concat(await staffOf(it.to.campaignStaff));
    } else if (Array.isArray(it.to)) {
      if (isMgr) ids = it.to;
      else if (prof.role === 'staff') {
        // الفريق يراسل معتمري حملاته بس
        const camps = (await db('GET', 'campaigns?select=id,staff')).filter((c) => (c.staff || []).some((s) => s.user === prof.id)).map((c) => c.id);
        const allowed = camps.length ? (await db('GET', 'pilgrims?select=user_id&campaign_id=in.(' + camps.join(',') + ')')).map((p) => p.user_id) : [];
        ids = it.to.filter((id) => allowed.includes(id) || id === prof.id);
      } else ids = it.to.filter((id) => id === prof.id);
    }
    ids = ids.filter((id) => id !== prof.id || (Array.isArray(it.to) && it.to.length === 1));
    sent += await sendTo(ids, { title: String(it.title || '').slice(0, 120), body: String(it.body || '').slice(0, 300), tag: String(it.tag || '').slice(0, 60), url: String(it.url || './').slice(0, 200) });
  }
  return { status: 200, sent, subs: sendTo.subs, errors: lastErr.slice(0, 5) };
}

/* ---------- نسيت كلمة السر ---------- */
async function forgot(phone, b, req) {
  if (b && b.website) return { status: 200, phone: '' };
  if (req && !(await devLimit('forgot_dev', req, 5))) return { status: 429, error: 'أرسلت طلبات كثيرة من هذا الجهاز. حاول بعد ساعة.' };
  const d = shortPhone(phone);
  const office = (await setting('office')) || {};
  const mgr = await db('GET', 'profiles?select=id,phone&role=eq.manager&active=is.true');
  const contact = office.phone_sy || (mgr[0] && mgr[0].phone) || '';
  if (d.length >= 8) {
    const all = await db('GET', 'profiles?select=id,name,phone,login_phone,role');
    const who = all.find((p) => shortPhone(p.login_phone || p.phone).endsWith(d));
    const rl = Object.assign({ hour: 0, n: 0, last: {} }, (await setting('forgot_rl')) || {}), now = Date.now();
    if (now - rl.hour > 3600e3) { rl.hour = now; rl.n = 0; rl.last = {}; }
    rl.n++;
    const allowed = who && rl.n <= 30 && !(rl.last[who.id] && now - rl.last[who.id] < 600e3);
    if (allowed) rl.last[who.id] = now;
    await putSetting('forgot_rl', rl);
    if (allowed) await sendTo(mgr.map((m) => m.id), { title: 'طلب كلمة سر جديدة', body: (who.name || '') + (who.role === 'pilgrim' ? ' (معتمر)' : '') + ' · ' + (who.login_phone || who.phone || ''), tag: 'forgot-' + who.id, url: who.role === 'pilgrim' ? './#/pilgrims' : './#/team' });
  }
  return { status: 200, phone: contact };
}

async function handle(req) {
  const CORS = corsFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: CORS });
  if (Number(req.headers.get('content-length') || 0) > 20000) return new Response('too large', { status: 413, headers: CORS });
  try {
    const b = await req.json().catch(() => ({}));
    let out;
    if (b.action === 'cron') out = (req.headers.get('origin') || !safeEq(req.headers.get('x-cron-secret'), env('CRON_SECRET'))) ? { status: 403, error: 'غير مسموح: سر الكرون مفقود أو غير مطابق' } : await cron();
    else if (b.action === 'notify') out = await notify(req, b.items);
    else if ((b.action === 'forgot' || b.action === 'register') && !originOk(req)) out = { status: 403, error: 'مصدر الطلب غير مسموح. أضف نطاق الموقع إلى ALLOWED_ORIGINS.' };
    else if (b.action === 'forgot') out = await forgot(b.phone, b, req);
    else if (b.action === 'create_user') out = await createUser(req, b.phone, b.pass);
    else if (b.action === 'register') out = await register(b, req);
    else out = { status: 400, error: 'طلب غير معروف' };
    return new Response(JSON.stringify(out), { status: out.status && out.status !== 200 ? out.status : 200, headers: Object.assign({ 'Content-Type': 'application/json' }, CORS) });
  } catch (e) {
    console.log('push error', e && e.stack || e);
    return new Response(JSON.stringify({ error: 'خطأ في الخادم: ' + String((e && e.message) || e).slice(0, 160) }), { status: 500, headers: Object.assign({ 'Content-Type': 'application/json' }, CORS) });
  }
}

if (globalThis.Deno) Deno.serve(handle);
globalThis.__sirajPush = { encrypt, vapidHeader, cron, notify, register, forgot, handle };
