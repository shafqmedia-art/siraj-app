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
