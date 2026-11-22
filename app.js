/* السراج المنير للحج والعمرة — تطبيق إدارة الحملات والمعتمرين */
(function () {
  'use strict';
  var CFG = window.SIRAJ_CONFIG || { mode: 'local', countryCode: '963' };
  var C = window.SIRAJ_CONTENT, PR = window.SIRAJ_PRAYER;
  var KEY = 'siraj.db.v1', SKEY = 'siraj.session', TKEY = 'siraj.theme';
  var SRV = window.SIRAJ_SERVER, ONLINE = !!(SRV && SRV.enabled);
  var state = { ready: !ONLINE, needSetup: false, err: '' };
  var LOGO_G = 'icons/logo-green.png', LOGO_W = 'icons/logo-white.png', MARK_G = 'icons/mark-green.png', MARK_W = 'icons/mark-white.png';
  var STATUS = { request: 'طلب جديد', approved: 'مقبول', visa: 'صدرت التأشيرة', travel: 'مسافر', done: 'أتمّ العمرة', cancelled: 'ملغى' };
  var STATUS_ORDER = ['request', 'approved', 'visa', 'travel', 'done'];
  var STAFF_TITLES = ['شيخ العمرة', 'مدير عمليات', 'إداري', 'منسّق رحلات', 'مسؤول حجوزات', 'مسؤول وثائق وتأشيرات', 'محاسب', 'مصور', 'طبيب', 'سائق'];
  var CATS_IN = ['دفعة معتمر', 'دخل آخر'];
  var CATS_OUT = ['تأشيرات', 'فنادق', 'نقل وباصات', 'طعام', 'أجور الفريق', 'هدايا ومطبوعات', 'مصروف آخر'];
  var METHODS = { shamcash: 'شام كاش', cash: 'نقداً بالمكتب', transfer: 'حوالة', other: 'أخرى' };
  var DOC_KINDS = { photo: 'الصورة الشخصية', passport: 'صورة الجواز', idcard: 'صورة الهوية', visa: 'التأشيرة' };
  var ROOMS = { quint: 'خماسية', quad: 'رباعية', triple: 'ثلاثية', double: 'ثنائية' }, ROOMS_EN = { quint: 'Quint', quad: 'Quad', triple: 'Triple', double: 'Double' };
  var TRIP_TYPES = { land: 'بالبر', flight: 'بالطيران' };
  var DEF_TERMS = 'دفع نصف المبلغ عند الحجز.\nصورة جواز سفر ساري لمدة 6 أشهر على الأقل.\nكفيل مقيم بالشام.\nممكن تبديل الفنادق بما يعادلها.';
  var DEF_INCLUDES = 'باصات VIP\nنقل مجاني من الفندق للحرم\nجولات على المزارات\nمرشد ديني يرافق الرحلة\nهدايا المعتمر';
  var SHAM_DEFAULT = { name: 'AbdulrhmanYabrodi', code: 'f0757ef594a215dbd142d2cc8b3c62f6', qr: 'icons/shamcash-qr.jpg' };

  /* ---------- أدوات ---------- */
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return iso(new Date()); }
  function addDays(s, n) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); }
  function addMonths(s, n) { var d = new Date(s + 'T12:00:00'); d.setMonth(d.getMonth() + n); return iso(d); }
  function daysTo(s) { return Math.round((new Date(s + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 86400000); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[٠-٩]/g, function (c) { return c.charCodeAt(0) - 1632; }).replace(/,/g, '')); return isFinite(n) ? n : 0; }
  function usd(n) { n = Math.round(n * 100) / 100; var neg = n < 0; n = Math.abs(n); return '\u2066' + (neg ? '-' : '') + '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 }) + '\u2069'; }
  function syp(n) { var r = num((pub.info && pub.info.rate) || db.settings.rate_syp); return r && n ? '<span class="syp">' + tr('≈ ', '≈ ') + '\u2066' + Math.round(n * r).toLocaleString('en-US') + '\u2069' + tr(' ل.س', ' SYP') + '</span>' : ''; }
  function reqNo(p) { if (!p) return ''; var d = String(p.created_at || today()).slice(0, 10).replace(/-/g, '').slice(2); return 'RQ-' + d + '-' + String(p.id || '').replace(/-/g, '').slice(0, 4).toUpperCase(); }
  function money(a, cur) { return cur === 'USD' ? usd(a) : Math.round(a).toLocaleString('en-US') + (cur === 'SAR' ? ' ر.س' : ' ل.س'); }
  function dateAr(s, withYear) { if (!s) return ''; try { return new Intl.DateTimeFormat('ar-SY-u-nu-latn', withYear ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' }).format(new Date(s + 'T12:00:00')); } catch (e) { return s; } }
  function dayName(s) { try { return new Intl.DateTimeFormat('ar-SY', { weekday: 'long' }).format(new Date(s + 'T12:00:00')); } catch (e) { return ''; } }
  function hijri(s, opts) { try { return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', opts || { day: 'numeric', month: 'long', year: 'numeric' }).format(s ? new Date(s + 'T12:00:00') : new Date()); } catch (e) { return ''; } }
  function longDates() { var g = ''; try { g = new Intl.DateTimeFormat('ar-SY-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); } catch (e) { g = today(); } return [g, hijri()]; }
  function greet() { var hr = new Date().getHours(); return hr < 12 ? 'صباح الخير' : 'مساء الخير'; }
  function ago(ts) { if (!ts) return ''; var m = Math.round((Date.now() - new Date(ts).getTime()) / 60000); if (m < 1) return 'الآن'; if (m < 60) return 'قبل ' + m + ' د'; if (m < 1440) return 'قبل ' + Math.round(m / 60) + ' س'; return 'قبل ' + Math.round(m / 1440) + ' يوم'; }
  function age(b) { if (!b) return ''; var d = new Date(b + 'T12:00:00'), n = new Date(), a = n.getFullYear() - d.getFullYear(); if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--; return a >= 0 && a < 130 ? a : ''; }
  var LANG = 'ar'; try { LANG = localStorage.getItem('siraj.lang') === 'en' ? 'en' : 'ar'; } catch (e) {}
  function useEn() { return LANG === 'en' && !me(); }
  function tr(a, e) { return useEn() ? e : a; }
  function toast(t) { var el = document.getElementById('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('show'); }, 2600); }
  function normPhone(p) { return String(p || '').replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }).replace(/[^\d]/g, ''); }
  function intl(p, cc) { p = normPhone(p); if (!p) return ''; if (p.indexOf('00') === 0) return p.slice(2); if (p.charAt(0) === '0') return (cc || CFG.countryCode || '963') + p.slice(1); if (p.length <= 9 && cc) return cc + p; return p; }
  function wa(p, msg) { return 'https://wa.me/' + intl(p, '963') + (msg ? '?text=' + encodeURIComponent(msg) : ''); }
  function tel(p, cc) { var x = intl(p, cc); return x ? 'tel:+' + x : '#'; }
  function sir(p) { return (p && p.gender === 'f' ? 'الحاجّة ' : 'الحاج ') + (p ? String(p.name || '').split(' ')[0] : ''); }
  function vib(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 30); } catch (e) {} }
  var CHEV = '<svg class="chev" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
  var ICONS = {
    xx: '<path d="M6 6l12 12M18 6L6 18"/>',
    play: '<path d="M7 5l12 7-12 7z"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    arr: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    ok: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    kaaba: '<path d="M4 7l8-3 8 3v11l-8 3-8-3z"/><path d="M4 10l8 3 8-3"/><path d="M12 13v8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    map: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    chat: '<path d="M4 5h16v11H8l-4 4z"/>',
    book: '<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6v16"/>',
    money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2"/>',
    bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v3M16 18v3"/><circle cx="8" cy="14.5" r="1"/><circle cx="16" cy="14.5" r="1"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M14 10h4M14 14h4M6 16c.5-1.5 1.7-2 3-2s2.5.5 3 2"/>',
    beads: '<circle cx="12" cy="5" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="18" cy="14" r="2"/><circle cx="7" cy="8" r="2"/><circle cx="6" cy="14" r="2"/><path d="M12 16v5"/>',
    sos: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
    team: '<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20c.8-3.5 3.6-5 7-5s6.2 1.5 7 5M15 15c3 0 5.5 1.3 6.5 4.5"/>',
    cert: '<rect x="3" y="4" width="18" height="13" rx="2"/><circle cx="12" cy="17" r="3"/><path d="M10.5 19.5L10 23l2-1 2 1-.5-3.5M7 8h10M7 11h6"/>',
    pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z"/>',
    rain: '<path d="M7 15h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 15z"/><path d="M9 18l-1 2M13 18l-1 2M17 18l-1 2"/>',
    storm: '<path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 14z"/><path d="M12 15l-2 4h3l-2 4"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9h18M12 9v11M12 9c-1.5-3-5-3.5-5-1s5 1 5 1zM12 9c1.5-3 5-3.5 5-1s-5 1-5 1z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8.5 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8c-1-.4-1.9-1.3-2.3-2.3l.8-1-1-2z"/>'
  };
  function ico(k, s) { return '<svg class="ico" aria-hidden="true" width="' + (s || 22) + '" height="' + (s || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[k] || '') + '</svg>'; }

  /* ---------- التخزين ---------- */
  var db;
  function blank() { return { users: [], campaigns: [], pilgrims: [], moves: [], messages: [], locations: [], settings: {} }; }
  function load() { if (ONLINE) { db = blank(); return; } try { db = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch (e) { db = blank(); } var b = blank(); Object.keys(b).forEach(function (k) { if (db[k] == null) db[k] = b[k]; }); }
  function save() {
    if (!ONLINE) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('مساحة الجهاز ممتلئة. احذف بعض الصور.'); } return Promise.resolve(); }
    return SRV.push(db).catch(function (e) { toast('تعذر الحفظ: ' + e.message); return resync(); });
  }
  function resync() { return SRV.pull().then(function (d) { db = d; render(); }).catch(function () { if (!SRV.hasSession()) render(); }); }
  function checkSetup() {
    state.ready = false; render();
    return SRV.hasManager().then(function (b) { state.needSetup = !b; state.err = ''; }, function (e) { state.err = e.message; }).then(function () { state.ready = true; render(); });
  }
  function boot() {
    state.err = ''; state.ready = false; render();
    if (!SRV.hasSession()) return checkSetup();
    return SRV.pull().then(function (d) { db = d; state.ready = true; render(); }, function (e) {
      if (e.offline) { state.err = e.message; state.ready = true; render(); return; }
      SRV.clear(); return checkSetup();
    });
  }
  function byId(t, id) { return id ? db[t].filter(function (r) { return r.id === id; })[0] : null; }
  function userName(id) { var u = byId('users', id); return u ? u.name : ''; }

  /* ---------- الحساب والصلاحيات ---------- */
  function hash(pass, salt) {
    var s = salt + '|' + pass;
    if (window.crypto && crypto.subtle && window.TextEncoder) return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); });
    var x = 5381; for (var i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) >>> 0; return Promise.resolve('f' + x.toString(16));
  }
  function me() { var id = ONLINE ? SRV.uid() : localStorage.getItem(SKEY); var u = id && byId('users', id); return u && u.active !== false ? u : null; }
  function role() { var u = me(); return u ? u.role : ''; }
  function isMgr() { return role() === 'manager'; }
  function isStaff() { return role() === 'staff'; }
  function isPil() { return role() === 'pilgrim'; }
  function myPilgrims() { var u = me(); return u ? db.pilgrims.filter(function (p) { return p.user_id === u.id; }) : []; }
  function myPilgrim() { var l = myPilgrims().filter(function (p) { return p.status !== 'cancelled'; }); l.sort(function (a, b) { var ca = byId('campaigns', a.campaign_id) || {}, cb = byId('campaigns', b.campaign_id) || {}; return String(cb.start_date || '').localeCompare(String(ca.start_date || '')); }); var up = l.filter(function (p) { var c = byId('campaigns', p.campaign_id); return c && (!c.end_date || c.end_date >= today()); }); return up[up.length - 1] || l[0] || null; }
  function staffCamps() { var u = me(); return u ? db.campaigns.filter(function (c) { return (c.staff || []).some(function (s) { return s.user === u.id; }); }) : []; }
  function canCamp(c) { return c && (isMgr() || staffCamps().indexOf(c) >= 0); }

  /* ---------- الحسابات ---------- */
  function live(m) { return !m.is_void && m.status !== 'rejected'; }
  function conf(m) { return live(m) && m.status !== 'pending'; }
  function sum(arr, f) { return arr.reduce(function (a, r) { return a + f(r); }, 0); }
  function sypRate() { return num(db.settings.rate_syp) || 0; }
  function toUsd(amount, cur) { if (cur === 'USD') return amount; if (cur === 'SAR') return amount / C.SAR_PER_USD; var r = sypRate(); return r ? amount / r : 0; }
  function roomPrices(c) { var pr = (c && c.prices) || {}, o = {}; Object.keys(ROOMS).forEach(function (k) { if (num(pr[k]) > 0) o[k] = num(pr[k]); }); return o; }
  function fromPrice(c) { var v = Object.keys(roomPrices(c)).map(function (k) { return roomPrices(c)[k]; }); return v.length ? Math.min.apply(null, v) : num(c && c.price); }
  function roomPrice(c, room) { var rp = roomPrices(c); return rp[room] != null ? rp[room] : fromPrice(c); }
  function priceOf(p) { var c = byId('campaigns', p.campaign_id) || {}; return p.price !== '' && p.price != null ? num(p.price) : roomPrice(c, p.room_type); }
  function famPilgrims() { var u = me(); return u ? db.pilgrims.filter(function (p) { return p.user_id === u.id || p.booked_by === u.id; }) : []; }
  var selPil = '';
  function curPil() {
    var l = famPilgrims().filter(function (p) { return p.status !== 'cancelled'; }), s = l.filter(function (p) { return p.id === selPil; })[0];
    if (s) return s; var own = myPilgrim(); if (own) return own;
    l.sort(function (a, b) { var ca = byId('campaigns', a.campaign_id) || {}, cb = byId('campaigns', b.campaign_id) || {}; return String(ca.start_date || '').localeCompare(String(cb.start_date || '')); });
    return l.filter(function (p) { var c = byId('campaigns', p.campaign_id); return c && (!c.end_date || c.end_date >= today()); })[0] || l[0] || null;
  }
  function canDoc(p) { var u = me(); return u && (isMgr() || (isPil() && (p.user_id === u.id || p.booked_by === u.id))); }
  function pilDue(p) {
    var ms = db.moves.filter(function (m) { return m.pilgrim_id === p.id && m.dir === 'in'; });
    var paid = sum(ms.filter(conf), function (m) { return num(m.usd); }), pend = sum(ms.filter(function (m) { return live(m) && m.status === 'pending'; }), function (m) { return num(m.usd); });
    var price = priceOf(p), c = byId('campaigns', p.campaign_id) || {}, dep = Math.round(price * (c.deposit_pct == null || c.deposit_pct === '' ? 50 : num(c.deposit_pct)) / 100); return { price: price, paid: paid, pending: pend, left: Math.max(0, price - paid), deposit: dep, depLeft: Math.max(0, dep - paid) };
  }
  function campFin(cid) {
    var ms = db.moves.filter(function (m) { return conf(m) && (!cid || m.campaign_id === cid); });
    var inc = sum(ms.filter(function (m) { return m.dir === 'in'; }), function (m) { return num(m.usd); }), out = sum(ms.filter(function (m) { return m.dir === 'out'; }), function (m) { return num(m.usd); });
    return { inc: inc, out: out, net: inc - out };
  }
  function campPil(cid, all) { return db.pilgrims.filter(function (p) { return p.campaign_id === cid && (all || p.status !== 'cancelled'); }); }
  function passOk(p, c) { if (!p.passport_exp) return null; var need = addMonths((c && c.start_date) || today(), 6); return p.passport_exp >= need; }
  function pendingMoves() { return db.moves.filter(function (m) { return !m.is_void && m.status === 'pending'; }); }
  function openQs() { return db.messages.filter(function (m) { return (m.kind === 'question' || m.kind === 'sos') && !db.messages.some(function (r) { return r.reply_to === m.id; }); }); }
  function shamcash() { var s = db.settings.shamcash || {}; return { name: s.name || SHAM_DEFAULT.name, code: s.code || SHAM_DEFAULT.code, qr: s.qr || SHAM_DEFAULT.qr }; }
  function office() { return db.settings.office || {}; }

  /* ---------- قطع الواجهة ---------- */
  function kpi(label, val, cls, sub) { return '<div class="kpi ' + (cls || '') + '"><span>' + h(label) + '</span><b>' + h(val) + '</b>' + (sub ? '<small>' + h(sub) + '</small>' : '') + '</div>'; }
  function tile(title, summ, body, open, cls) { return '<details class="tile ' + (cls || '') + '"' + (open ? ' open' : '') + '><summary><div><h2>' + h(title) + '</h2>' + (summ ? '<span>' + summ + '</span>' : '') + '</div>' + CHEV + '</summary><div class="body">' + body + '</div></details>'; }
  function card(inner, cls) { return '<section class="card ' + (cls || '') + '">' + inner + '</section>'; }
  function rows(list) { return list.length ? '<div class="rows">' + list.map(function (r) { return '<div><span>' + r[0] + '</span><span class="mu">' + r[1] + '</span></div>'; }).join('') + '</div>' : '<p class="empty">لا شيء بعد.</p>'; }
  function btn(label, act, data, cls) { var d = ''; Object.keys(data || {}).forEach(function (k) { d += ' data-' + k + '="' + h(data[k]) + '"'; }); return '<button type="button" class="btn ' + (cls || '') + '" data-act="' + act + '"' + d + '>' + label + '</button>'; }
  function link(label, href, cls, ext) { return '<a class="btn ' + (cls || '') + '" href="' + h(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + label + '</a>'; }
  function badge(st) { return '<span class="badge st-' + h(st) + '">' + h(STATUS[st] || st) + '</span>'; }
  function head(title, sub, acts) { return '<div class="head"><div><h1>' + h(title) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (acts ? '<div class="acts">' + acts + '</div>' : '') + '</div>'; }
  function back(href, label) { return '<a class="back" href="' + h(href) + '">' + ico('arr', 16) + ' ' + h(label || 'رجوع') + '</a>'; }
  function avatar(u, big) { return '<span class="av' + (big ? ' big' : '') + '" aria-hidden="true">' + (u && u.photo ? '<img src="' + h(u.photo) + '" alt="">' : h(((u && u.name) || '؟').charAt(0))) + '</span>'; }
  function pilAvatar(p, big) { var src = p.docs && p.docs.photo; return '<span class="av' + (big ? ' big' : '') + '" aria-hidden="true">' + (src ? '<img ' + docAttr(src) + ' alt="">' : h((p.name || '؟').charAt(0))) + '</span>'; }
  // صور الوثائق: محلياً data URL، وعلى السيرفر مسار بالتخزين الخاص بينجاب بعد الرسم
  function docAttr(v) { return /^(data:|icons\/)/.test(v) ? 'src="' + h(v) + '"' : 'data-doc="' + h(v) + '" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="'; }
  function hydrate(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('form[data-form]'), function (f) { if (f.querySelector('input[name=website]')) return; var w = document.createElement('div'); w.className = 'hp'; w.setAttribute('aria-hidden', 'true'); w.innerHTML = '<label>Website<input name="website" tabindex="-1" autocomplete="off"></label>'; f.appendChild(w); });
    if (!ONLINE) return;
    Array.prototype.forEach.call((root || document).querySelectorAll('img[data-doc]'), function (img) {
      var p = img.getAttribute('data-doc'); img.removeAttribute('data-doc');
      SRV.fileUrl(p).then(function (u) { img.src = u; img.classList.add('ld'); }, function () { img.alt = 'تعذر تحميل الصورة'; });
    });
  }
  function emptyBox(t, extra) { return '<div class="emptybox"><img src="' + MARK_G + '" alt="" class="lg-c"><p>' + t + '</p>' + (extra || '') + '</div>'; }

  /* ---------- النماذج ---------- */
  var formCb = null;
  function openForm(title, fields, cb, note, okLabel) {
    formCb = cb;
    var out = '<div class="dlg" role="dialog" aria-modal="true" aria-label="' + h(title) + '"><div class="dlg-h"><h2>' + h(title) + '</h2>' + btn(ico('xx', 18), 'close', {}, 'x') + '</div>' + (note ? (note.html ? '<div class="note">' + note.html + '</div>' : '<p class="mu">' + h(note) + '</p>') : '') + '<form class="form" data-form="modal">';
    fields.forEach(function (f) {
      if (f.type === 'sep') { out += '<div class="fld wide sep"><h3>' + h(f.label) + '</h3></div>'; return; }
      var id = 'm_' + f.k, el;
      if (f.type === 'select') el = '<select id="' + id + '" name="' + f.k + '">' + f.options.map(function (o) { return '<option value="' + h(o[0]) + '"' + (String(f.value) === String(o[0]) ? ' selected' : '') + '>' + h(o[1]) + '</option>'; }).join('') + '</select>';
      else if (f.type === 'area') el = '<textarea id="' + id + '" name="' + f.k + '" maxlength="' + (f.max || 1000) + '"' + (f.req ? ' required' : '') + (f.ph ? ' placeholder="' + h(f.ph) + '"' : '') + '>' + h(f.value) + '</textarea>';
      else if (f.type === 'file') el = '<input id="' + id + '" name="' + f.k + '" type="file" accept="image/*"' + (f.req ? ' required' : '') + '>';
      else if (f.type === 'checks') el = '<div class="checks">' + f.options.map(function (o) { return '<label class="chk"><input type="checkbox" name="' + f.k + '" value="' + h(o[0]) + '"' + ((f.value || []).indexOf(o[0]) >= 0 ? ' checked' : '') + '><span>' + h(o[1]) + '</span></label>'; }).join('') + '</div>';
      else el = '<input id="' + id + '" name="' + f.k + '" type="' + (f.type || 'text') + '" value="' + h(f.value == null ? '' : f.value) + '"' + (f.req ? ' required' : '') + (f.ph ? ' placeholder="' + h(f.ph) + '"' : '') + (f.type === 'number' ? ' step="any" min="0" inputmode="decimal"' : '') + (f.type === 'tel' ? ' inputmode="tel" dir="ltr"' : '') + (f.list ? ' list="dl_' + f.k + '" autocomplete="off"' : '') + (f.max ? ' maxlength="' + f.max + '"' : '') + '>' + (f.list ? '<datalist id="dl_' + f.k + '">' + f.list.map(function (o) { return '<option value="' + h(o) + '">'; }).join('') + '</datalist>' : '');
      out += '<div class="fld' + (f.wide ? ' wide' : '') + '"><label for="' + id + '">' + h(f.label) + '</label>' + el + (f.hint ? '<small class="mu">' + h(f.hint) + '</small>' : '') + '</div>';
    });
    out += '<div class="fld wide"><p class="err" id="merr"></p><div class="acts"><button class="btn pri" type="submit">' + h(okLabel || 'حفظ') + '</button>' + btn('إلغاء', 'close') + '</div></div></form></div>';
    var m = document.getElementById('modal'); m.innerHTML = out; m.hidden = false; m.className = '';
    var first = m.querySelector('input:not([type=checkbox]):not([type=file]),select,textarea'); if (first && !('ontouchstart' in window)) first.focus();
  }
  function openSheet(html, cls) { formCb = null; var m = document.getElementById('modal'); m.innerHTML = '<div class="dlg sheet ' + (cls || '') + '" role="dialog" aria-modal="true">' + html + '</div>'; m.hidden = false; m.className = 'is-sheet'; hydrate(m); }
  function closeForm() { var m = document.getElementById('modal'); m.hidden = true; m.innerHTML = ''; m.className = ''; formCb = null; }
  function alertBox(t, html) { openSheet('<div class="dlg-h"><h2>' + h(t) + '</h2>' + btn(ico('xx', 18), 'close', {}, 'x') + '</div><div class="note">' + html + '</div><div class="acts">' + btn('تمام', 'close', {}, 'pri') + '</div>'); }

  /* ---------- الصور ---------- */
  function sniffFile(file) {
    return new Promise(function (res, rej) {
      if (!file) return rej(new Error('اختر ملفاً.'));
      if (file.size > 5 * 1024 * 1024) return rej(new Error('حجم الملف أكبر من 5 ميغابايت. اختر ملفاً أصغر.'));
      var r = new FileReader();
      r.onload = function () { var b = new Uint8Array(r.result), hx = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
        if (hx.indexOf('25504446') === 0) return res('pdf');
        if (hx.indexOf('ffd8ff') === 0 || hx.indexOf('89504e47') === 0 || (hx.indexOf('52494646') === 0 && hx.slice(16, 24) === '57454250')) return res('img');
        rej(new Error('نوع الملف غير مقبول. ارفع صورة (JPG أو PNG أو WEBP) أو ملف PDF.')); };
      r.onerror = function () { rej(new Error('تعذّرت قراءة الملف.')); };
      r.readAsArrayBuffer(file.slice(0, 12));
    });
  }
  function readImage(file, max, q) {
    return new Promise(function (res, rej) {
      if (!file) return rej(new Error('اختر صورة'));
      if (!/^image\//i.test(file.type) || file.size > 20 * 1024 * 1024) return rej(new Error('ارفع صورة بصيغة JPG أو PNG بحجم أقل من 5 ميغابايت'));
      var rd = new FileReader();
      rd.onload = function () {
        var img = new Image();
        img.onload = function () {
          var s = Math.min(1, (max || 1400) / Math.max(img.width, img.height)), cv = document.createElement('canvas');
          cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
          var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
          var url = cv.toDataURL('image/jpeg', q || 0.8);
          cv.toBlob(function (b) { res({ url: url, blob: b }); }, 'image/jpeg', q || 0.8);
        };
        img.onerror = function () { rej(new Error('تعذر قراءة الصورة')); };
        img.src = rd.result;
      };
      rd.readAsDataURL(file);
    });
  }
  // يرفع الصورة ويرجع القيمة اللي بتنحفظ بالسجل
  function storeDoc(pid, kind, file) {
    return readImage(file, kind === 'photo' ? 700 : 1500, 0.8).then(function (im) {
      if (!ONLINE) return im.url;
      return SRV.upload(pid + '/' + kind + '-' + Date.now() + '.jpg', im.blob);
    });
  }

  /* ---------- إشعارات الجوال ---------- */
  var PUSH_KEY = CFG.pushKey || '', pushSynced = false;
  function isIOS() { return /iPhone|iPad|iPod/.test(navigator.userAgent); }
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function pushOK() { return ONLINE && !!PUSH_KEY && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  function pushStatus() { if (!ONLINE || !PUSH_KEY) return 'off'; if (isIOS() && !standalone()) return 'ios'; if (!pushOK()) return 'unsupported'; return Notification.permission; }
  function keyBytes(b) { b = b.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; var r = atob(b), o = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) o[i] = r.charCodeAt(i); return o; }
  function swReg() { return navigator.serviceWorker.getRegistration().then(function (reg) { if (reg) return reg; return navigator.serviceWorker.register('sw.js').then(function () { return navigator.serviceWorker.ready; }); }); }
  function pushSub(create) {
    return swReg().then(function (reg) {
      return reg.pushManager.getSubscription().then(function (s) {
        if (s && s.options && s.options.applicationServerKey) { var a = new Uint8Array(s.options.applicationServerKey), b = keyBytes(PUSH_KEY), same = a.length === b.length && a.every(function (x, i) { return x === b[i]; }); if (!same) return s.unsubscribe().then(function () { return null; }); }
        return s;
      }).then(function (s) { return s || (create ? reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUSH_KEY) }) : null); });
    }).then(function (s) { if (!s) return null; var j = s.toJSON(); return SRV.rpc('save_push_sub', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth }).then(function () { return s; }); });
  }
  function pushSync() { if (pushSynced || pushStatus() !== 'granted') return; pushSynced = true; pushSub(true).catch(function () { pushSynced = false; }); }
  function pushOff() {
    pushSynced = false;
    if (!pushOK() || !SRV.hasSession()) return Promise.resolve();
    return navigator.serviceWorker.getRegistration().then(function (reg) { return reg ? reg.pushManager.getSubscription() : null; }).then(function (s) { if (!s) return; return SRV.rpc('delete_push_sub', { p_endpoint: s.endpoint }).catch(function () {}).then(function () { return s.unsubscribe(); }); }).catch(function () {});
  }
  function pushBanner() {
    var st = pushStatus();
    try { if (localStorage.getItem('siraj_push_later') === today()) return ''; } catch (e) {}
    if (st === 'default') return '<div class="pushbar"><span>فعّل الإشعارات لتصلك أخبار التأشيرة ومواعيد التجمّع وتذكير الصلاة.</span><span class="acts">' + btn('تفعيل', 'pushOn', {}, 'pri sm') + btn('لاحقاً', 'pushLater', {}, 'sm') + '</span></div>';
    if (st === 'ios') return '<div class="pushbar"><span>على الآيفون: من زر المشاركة اختر «إضافة إلى الشاشة الرئيسية»، ثم افتح التطبيق من الأيقونة لتفعيل الإشعارات.</span><span class="acts">' + btn('تمام', 'pushLater', {}, 'sm') + '</span></div>';
    return '';
  }
  function notify(items) { if (ONLINE && SRV.notify) return SRV.notify(items); return Promise.resolve(null); }

  /* ---------- التنقل ---------- */
  function route() { return location.hash || '#/'; }
  var GUIDE = [
    ['المطوّف', '#/mutawwif', 'kaaba', 'عدّاد الطواف والسعي مع الأدعية'],
    ['مواقيت الصلاة', '#/prayer', 'clock', 'بتوقيت مكة والمدينة مع التذكير'],
    ['أحكام العمرة', '#/ahkam', 'book', 'الأركان والواجبات والمحظورات'],
    ['المزارات', '#/ziyarat', 'map', 'مزارات مكة والمدينة مع شرحها'],
    ['قبل السفر', '#/prep', 'check', 'ما تحتاجه معك في الرحلة'],
    ['الصرف', '#/exchange', 'calc', 'دولار · ريال · ليرة'],
    ['الطوارئ', '#/emergency', 'sos', 'أرقام السعودية وتطبيقات مهمة'],
    ['الطقس والخرائط', '#/weather', 'map', 'مكة والمدينة الآن، وخرائط الحرمين'],
    ['أذكار العمرة (PDF)', 'files/adhkar.pdf', 'download', 'كتيّب أذكار وأدعية مختصر'],
    ['قائمة الأمتعة (PDF)', 'files/checklist.pdf', 'download', 'للطباعة، بر وطيران'],
    ['المسبحة', '#/tasbeeh', 'beads', 'عدّاد تسبيح'],
    ['كتيّب المعتمر', 'guide.pdf', 'download', 'دليل المعتمر كامل (PDF)']
  ];
  function navDef() {
    if (isMgr()) return [
      ['الرئيسية', [['لوحة اليوم', '#/', 'home'], ['الحملات', '#/campaigns', 'kaaba'], ['المعتمرون', '#/pilgrims', 'list']]],
      ['المتابعة', [['الرسائل', '#/messages', 'chat'], ['الخريطة', '#/map', 'map']]],
      ['الإدارة', [['المالية', '#/finance', 'money'], ['الفريق', '#/team', 'team'], ['الصفحة العامة', '#/site', 'star'], ['الإعدادات', '#/settings', 'gear']]],
      ['الدليل', [['الدليل والأدوات', '#/guide', 'book'], ['المطوّف', '#/mutawwif', 'kaaba'], ['مواقيت الصلاة', '#/prayer', 'clock']]]
    ];
    if (isStaff()) return [['الرئيسية', [['حملاتي', '#/', 'home'], ['الخريطة', '#/map', 'map'], ['الرسائل', '#/messages', 'chat']]], ['الدليل', [['الدليل والأدوات', '#/guide', 'book'], ['المطوّف', '#/mutawwif', 'kaaba'], ['مواقيت الصلاة', '#/prayer', 'clock']]]];
    return [['عمرتي', [['الرئيسية', '#/', 'home'], ['احجز رحلة', '#/book', 'kaaba'], ['حسابي والدفع', '#/pay', 'money'], ['برنامج الرحلة', '#/program', 'list'], ['اسأل الشيخ', '#/ask', 'chat'], ['بطاقة المعتمر', '#/card', 'card']]], ['الدليل', [['المطوّف', '#/mutawwif', 'kaaba'], ['مواقيت الصلاة', '#/prayer', 'clock'], ['الدليل والأدوات', '#/guide', 'book']]]];
  }
  function tabsDef() {
    if (isMgr()) return [['الرئيسية', '#/', 'home'], ['الحملات', '#/campaigns', 'kaaba'], ['المعتمرون', '#/pilgrims', 'list'], ['الرسائل', '#/messages', 'chat'], ['المزيد', '#/more', 'gear']];
    if (isStaff()) return [['الرئيسية', '#/', 'home'], ['الخريطة', '#/map', 'map'], ['الرسائل', '#/messages', 'chat'], ['الدليل', '#/guide', 'book'], ['المزيد', '#/more', 'gear']];
    return [['الرئيسية', '#/', 'home'], ['المطوّف', '#/mutawwif', 'kaaba'], ['الصلاة', '#/prayer', 'clock'], ['الدليل', '#/guide', 'book'], ['المزيد', '#/more', 'user']];
  }
  function baseOf(r) {
    if (r.indexOf('#/campaign/') === 0) return '#/campaigns';
    if (r.indexOf('#/pilgrim/') === 0) return '#/pilgrims';
    if (['#/ahkam', '#/ziyarat', '#/prep', '#/exchange', '#/emergency', '#/tasbeeh', '#/weather'].indexOf(r) >= 0) return '#/guide';
    if (['#/profile', '#/team', '#/settings', '#/finance', '#/map', '#/pay', '#/program', '#/ask', '#/card', '#/cert', '#/book', '#/gift', '#/done', '#/site', '#/docs'].indexOf(r) >= 0 && !navHas(r, true)) return '#/more';
    return r;
  }
  function navHas(r, tabsOnly) { return tabsDef().some(function (t) { return t[1] === r; }); }
  function badgeCount(href) {
    if (href === '#/messages') { var n = openQs().filter(function (m) { return isMgr() || canCamp(byId('campaigns', m.campaign_id)); }).length; return n; }
    if (href === '#/pilgrims' && isMgr()) return db.pilgrims.filter(function (p) { return p.status === 'request'; }).length;
    if (href === '#/finance' && isMgr()) return pendingMoves().length;
    return 0;
  }
  function navHtml() {
    var r = route(), b = baseOf(r), out = '<div class="brand"><img class="lg-c" src="' + MARK_G + '" alt=""><div><b>السراج المنير</b><span>' + (isMgr() ? 'إدارة الحملات' : isStaff() ? 'واجهة الفريق' : 'للحج والعمرة') + '</span></div></div>';
    navDef().forEach(function (g) {
      out += '<div class="ngroup"><span class="nlabel">' + g[0] + '</span>';
      g[1].forEach(function (i) { var n = badgeCount(i[1]); out += '<a href="' + i[1] + '" class="' + (i[1] === r || i[1] === b ? 'on' : '') + '">' + ico(i[2], 20) + '<span>' + i[0] + '</span>' + (n ? '<em>' + n + '</em>' : '') + '</a>'; });
      out += '</div>';
    });
    return out + '<div class="timebox"><span class="clock" id="clock"></span><span>' + h(longDates()[0]) + '</span><span>' + h(longDates()[1]) + '</span></div>';
  }
  function tabsHtml() {
    var r = route(), b = baseOf(r);
    return '<nav class="tabbar" aria-label="التنقل">' + tabsDef().map(function (t) { var n = badgeCount(t[1]); return '<a href="' + t[1] + '" class="' + (t[1] === b || t[1] === r ? 'on' : '') + '">' + ico(t[2], 22) + '<span>' + t[0] + '</span>' + (n ? '<em>' + n + '</em>' : '') + '</a>'; }).join('') + '</nav>';
  }
  function topHtml() {
    var u = me();
    return '<div class="top"><a href="#/" class="mbrand"><img src="' + MARK_G + '" class="lg-c" alt=""><b>السراج المنير</b></a><div class="grow"></div>' +
      btn(ico(document.body.classList.contains('t-dark') ? 'sun' : 'moon', 20), 'theme', {}, 'icon') +
      '<a class="who" href="#/profile">' + avatar(u) + '<span><b>' + h(u.name) + '</b><small>' + h(isMgr() ? 'المدير' : isStaff() ? (u.title || 'الفريق') : 'معتمر') + '</small></span></a></div>';
  }
  function shell(content) { return '<div class="shell"><aside class="nav">' + navHtml() + '</aside><main>' + topHtml() + content + '</main>' + tabsHtml() + '</div>'; }

  /* ---------- الدخول ---------- */
  var fstate = { open: false, sent: false, phone: '', wa: '' };
  var rstate = { step: 0, camp: '', list: null, err: '' };
  function authCard(inner, wide) {
    var d = longDates();
    return '<div class="auth"><div class="auth-bg"></div><div class="acard' + (wide ? ' wide' : '') + '"><img class="alogo lg-c" src="' + LOGO_G + '" alt="السراج المنير للحج والعمرة">' +
      btn(LANG === 'en' ? 'عربي' : 'EN', 'lang', {}, 'sm langbtn') + '<div class="agreet"><span>' + tr(greet(), new Date().getHours() < 12 ? 'Good morning' : 'Good evening') + '</span><span class="clock" id="clock"></span><small>' + h(d[0]) + '<br>' + h(d[1]) + '</small></div>' + inner + '</div></div>';
  }
  function vLoading() { return '<div class="loading"><div class="lamp"><img src="' + MARK_W + '" alt=""></div><p>جارٍ تجهيز الرحلة…</p></div>'; }
  function vLogin() {
    return authCard('<h1>' + tr('تسجيل الدخول', 'Sign in') + '</h1><form class="form one" data-form="login"><div class="fld wide"><label for="l_phone">' + tr('رقم الموبايل', 'Mobile number') + '</label><input id="l_phone" name="phone" type="tel" inputmode="tel" dir="ltr" autocomplete="username" required placeholder="09xxxxxxxx"></div><div class="fld wide"><label for="l_pass">' + tr('كلمة السر', 'Password') + '</label><input id="l_pass" name="pass" type="password" autocomplete="current-password" required></div><div class="fld wide"><p class="err" id="aerr"></p><button class="btn pri big" type="submit">' + tr('دخول', 'Sign in') + '</button></div></form>' +
      '<div class="alinks">' + btn(tr('نسيت كلمة السر؟', 'Forgot password?'), 'forgotOpen', {}, 'link') + link(tr('← الصفحة الرئيسية', '← Home'), '#/', 'link') + '</div><div class="reg-cta"><p>' + tr('تريد أداء العمرة معنا؟', 'Want to perform Umrah with us?') + '</p>' + link('' + tr('سجّل واحجز عمرتك', 'Register & book'), '#/register', 'gold big') + '</div>');
  }
  function vSetup() {
    return authCard('<h1>إعداد المدير</h1><p class="mu">أول مرة: أنشئ حساب مدير الحملة. يدير هذا الحساب كل شيء.</p><form class="form one" data-form="setup"><div class="fld wide"><label for="s_name">الاسم</label><input id="s_name" name="name" required maxlength="120"></div><div class="fld wide"><label for="s_phone">رقم الموبايل</label><input id="s_phone" name="phone" type="tel" dir="ltr" required></div><div class="fld wide"><label for="s_pass">كلمة السر (8 أحرف على الأقل)</label><input id="s_pass" name="pass" type="password" minlength="8" required autocomplete="new-password"></div><div class="fld wide"><p class="err" id="aerr"></p><button class="btn pri big" type="submit">إنشاء الحساب</button></div></form>');
  }
  function vForgot() {
    if (fstate.sent) return authCard('<h1>وصل طلبك</h1><p>أرسلنا إلى الإدارة طلبك، وستتواصل معك لتعيين كلمة سر جديدة. يمكنك مراسلتنا عبر واتساب إن أردت.</p>' + (fstate.wa ? link('إرسال واتساب', fstate.wa, 'pri big', true) : '') + btn('رجوع للدخول', 'forgotClose', {}, 'big'));
    return authCard('<h1>نسيت كلمة السر</h1><p class="mu">اكتب رقمك، وسيصل إلى الإدارة طلب لتعيين كلمة سر جديدة.</p><form class="form one" data-form="forgot"><div class="fld wide"><label for="f_phone">رقم الموبايل</label><input id="f_phone" name="phone" type="tel" dir="ltr" required value="' + h(fstate.phone) + '"></div><div class="fld wide"><p class="err" id="aerr"></p><button class="btn pri big" type="submit">إرسال الطلب</button></div></form>' + btn('رجوع', 'forgotClose', {}, 'link'));
  }
  /* ---------- الصفحة العامة للزوار ---------- */
  var pub = { info: null, loading: false, tab: 'reviews', err: '' };
  function siteCfg() { return (pub.info && pub.info.site) || db.settings.public || {}; }
  function bookingOpen(c) {
    var date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Damascus', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    var parts = Object.fromEntries(date.map(function (p) { return [p.type, p.value]; }));
    var todayInDamascus = parts.year + '-' + parts.month + '-' + parts.day;
    return (!c.status || c.status === 'open') && (!c.start_date || c.start_date >= todayInDamascus) && (!c.deadline || c.deadline >= todayInDamascus);
  }
  function localPublic() {
    var openC = db.campaigns.filter(function (c) { return bookingOpen(c); }).map(function (c) { var n = campPil(c.id).length; return Object.assign({}, c, { seats_left: c.seats ? Math.max(0, num(c.seats) - n) : null }); });
    var done = db.campaigns.filter(function (c) { return c.status === 'done' || (c.end_date && c.end_date < today()); }).map(function (c) { return { id: c.id, name: c.name, start_date: c.start_date, end_date: c.end_date, trip_type: c.trip_type, pilgrims: campPil(c.id).length }; });
    return { open: openC, done: done, site: db.settings.public || {}, office: db.settings.office || {} };
  }
  function loadPublic(force) {
    if (!ONLINE) { pub.info = localPublic(); return; }
    if ((pub.info && !force) || pub.loading) return;
    pub.loading = true;
    SRV.publicInfo().then(function (r) { pub.info = r || { open: [], done: [], site: {}, office: {} }; pub.loading = false; if (!document.querySelector('form[data-form=book]')) render(); }, function (e) { pub.loading = false; pub.err = e.message; pub.info = { open: [], done: [], site: {}, office: {} }; render(); });
  }
  function pubOffice() { return (pub.info && pub.info.office) || office(); }
  // البحث والفلترة
  var fd = { type: '', month: '', budget: '', room: '', stars: 0, people: 1 };
  function monthName(ym) { try { return new Intl.DateTimeFormat(useEn() ? 'en-GB' : 'ar-SY', { month: 'long' }).format(new Date(ym + '-15T12:00:00')); } catch (e) { return ym; } }
  function tripCost(c) { return fd.room ? roomPrice(c, fd.room) : fromPrice(c); }
  function filterTrips(list) {
    return (list || []).filter(function (c) {
      var p = tripCost(c);
      if (fd.type && (c.trip_type || 'land') !== fd.type) return false;
      if (fd.month && String(c.start_date || '').slice(0, 7) !== fd.month) return false;
      if (fd.budget === 'lt500' && !(p < 500)) return false;
      if (fd.budget === 'mid' && !(p >= 500 && p <= 1000)) return false;
      if (fd.budget === 'gt1000' && !(p > 1000)) return false;
      if (fd.room && roomPrices(c)[fd.room] == null) return false;
      if (fd.stars && (+c.hotel_stars || 0) < fd.stars) return false;
      if (c.seats_left != null && c.seats_left !== '' && c.seats_left < fd.people) return false;
      return true;
    });
  }
  function chipRow(label, key, opts) { return '<div class="frow"><span>' + label + '</span><div class="chips">' + opts.map(function (o) { return '<button type="button" class="chip' + (String(fd[key]) === String(o[0]) ? ' on' : '') + '" data-act="fd" data-k="' + key + '" data-v="' + h(o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div></div>'; }
  function finderHtml(list) {
    var months = []; (list || []).forEach(function (c) { var m = String(c.start_date || '').slice(0, 7); if (m && months.indexOf(m) < 0) months.push(m); }); months.sort();
    return '<details class="finder"' + (fd.type || fd.room || fd.budget || fd.month || fd.stars || fd.people > 1 ? ' open' : '') + '><summary>' + tr('خصّص عمرتك', 'Customize your Umrah') + CHEV + '</summary><div class="fbody">' +
      chipRow(tr('نوع الرحلة', 'Trip type'), 'type', [['', tr('الكل', 'All')], ['land', tr('بالبر', 'By land')], ['flight', tr('بالطيران', 'By air')]]) +
      (months.length > 1 ? chipRow(tr('الشهر', 'Month'), 'month', [['', tr('الكل', 'All')]].concat(months.map(function (m) { return [m, monthName(m)]; }))) : '') +
      chipRow(tr('نوع الغرفة', 'Room'), 'room', [['', tr('أي غرفة', 'Any')]].concat(Object.keys(ROOMS).map(function (k) { return [k, tr(ROOMS[k], ROOMS_EN[k])]; }))) +
      chipRow(tr('الميزانية للشخص', 'Budget / person'), 'budget', [['', tr('الكل', 'All')], ['lt500', tr('أقل من 500$', 'Under $500')], ['mid', '500 – 1000$'], ['gt1000', tr('أكثر من 1000$', 'Over $1000')]]) +
      chipRow(tr('مستوى الفندق', 'Hotel level'), 'stars', [['0', tr('أي فندق', 'Any')], ['3', tr('3 نجوم فأكثر', '3+ stars')], ['4', tr('4 نجوم فأكثر', '4+ stars')], ['5', tr('5 نجوم', '5 stars')]]) +
      '<div class="frow"><span>' + tr('عدد الأشخاص', 'People') + '</span><div class="stepper2">' + btn('−', 'fdPeople', { d: -1 }, 'icon') + '<b>' + fd.people + '</b>' + btn('+', 'fdPeople', { d: 1 }, 'icon') + '</div></div>' +
      (fd.type || fd.room || fd.budget || fd.month || fd.stars || fd.people > 1 ? btn(tr('مسح الفلاتر', 'Clear filters'), 'fdClear', {}, 'link') : '') + '</div></details>';
  }
  function tripCard(c, act) {
    var o = pubOffice(), wnum = o.phone_sy, cost = tripCost(c), total = cost * fd.people;
    var waMsg = 'السلام عليكم، أرغب بالحجز في رحلة «' + (c.name || '') + '»' + (fd.room ? ' غرفة ' + ROOMS[fd.room] : '') + (fd.people > 1 ? ' لـ ' + fd.people + ' أشخاص' : '');
    return '<article class="trip"><div class="trip-h"><span class="ttype">' + (c.trip_type === 'flight' ? tr('رحلة الطيران', 'Flight trip') : '' + tr('رحلة البر', 'Land trip')) + (c.hotel_stars ? ' · ' + stars(c.hotel_stars) : '') + '</span><span class="badge cs-open">' + tr('الحجز مفتوح', 'Booking open') + '</span></div>' +
      '<h3>' + h(c.name) + '</h3><p class="mu">' + h(dateAr(c.start_date, true)) + (c.end_date ? ' ← ' + h(dateAr(c.end_date, true)) : '') + ' · ' + h((c.makkah_nights || 0)) + ' ' + tr('ليالٍ بمكة', 'nights Makkah') + ' + ' + h(c.madinah_nights || 0) + ' ' + tr('بالمدينة', 'Madinah') + '</p>' +
      '<div class="trip-p"><div><span>' + (fd.room ? tr(ROOMS[fd.room], ROOMS_EN[fd.room]) : tr('ابتداءً من', 'From')) + '</span><b>' + usd(cost) + syp(cost) + '</b></div>' + (fd.people > 1 ? '<div><span>' + tr('المجموع لـ ', 'Total for ') + fd.people + '</span><b>' + usd(total) + syp(total) + '</b></div>' : '') + (c.seats_left != null && c.seats_left !== '' ? '<div><span>' + tr('مقاعد باقية', 'Seats left') + '</span><b>' + h(c.seats_left) + '</b></div>' : '') + '</div>' + (c.deadline ? '<p class="tdl">' + ico('clock', 15) + tr('آخر موعد للحجز: ', 'Booking deadline: ') + h(dateAr(c.deadline)) + '</p>' : '') + '' +
      '<details class="tmore"><summary>' + tr('التفاصيل والفنادق والشروط', 'Details, hotels & terms') + CHEV + '</summary>' + tripDetails(c, { room: fd.room }) + '</details>' +
      '<div class="acts">' + btn(tr('احجز الآن', 'Book now'), act, { id: c.id }, 'pri') + (wnum ? link(tr('استفسار عبر واتساب', 'Ask on WhatsApp'), wa(wnum, waMsg.replace('أرغب بالحجز في', 'أستفسر عن')), 'ghost', true) : '') + '</div></article>';
  }
  function tripsList(list, act) {
    var f = filterTrips(list);
    return finderHtml(list) + (f.length ? '<div class="trips">' + f.map(function (c) { return tripCard(c, act); }).join('') + '</div>' : '<p class="empty">' + ((list || []).length ? tr('لا توجد رحلة تطابق اختيارك. غيّر الفلاتر.', 'No trip matches. Change the filters.') : tr('لا توجد رحلات مفتوحة للحجز حالياً. تابعنا قريباً بإذن الله.', 'No trips open right now. Stay tuned.')) + '</p>');
  }
  function ytId(u) { var m = String(u || '').match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{6,})/); return m ? m[1] : ''; }
  function videoEl(v) {
    var id = ytId(v.url);
    if (id) return '<div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/' + h(id) + '" title="' + h(v.title || '') + '" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';
    if (/\.(mp4|webm)(\?|$)/i.test(v.url || '') && /^https:\/\//.test(v.url)) return '<div class="vid"><video src="' + h(v.url) + '" controls preload="metadata" playsinline></video></div>';
    if (!safeUrl(v.url)) return ''; return '<a class="vlink" href="' + h(safeUrl(v.url)) + '" target="_blank" rel="noopener">' + ico('play', 16) + ' ' + tr('مشاهدة', 'Watch') + '</a>';
  }
  function pubTabs() {
    var st = siteCfg(), revs = st.reviews || [], vids = st.videos || [], done = (pub.info && pub.info.done) || [], t = pub.tab;
    var tabs = [['reviews', tr('آراء العملاء', 'Reviews'), revs.length], ['videos', tr('فيديوهات الرحلات', 'Trip videos'), vids.length], ['archive', tr('الرحلات المنجزة', 'Completed trips'), done.length]];
    var out = '<div class="tabs">' + tabs.map(function (x) { return '<button type="button" class="' + (x[0] === t ? 'on' : '') + '" data-act="pubTab" data-t="' + x[0] + '">' + x[1] + (x[2] ? ' <em>' + x[2] + '</em>' : '') + '</button>'; }).join('') + '</div>';
    if (t === 'reviews') out += revs.length ? '<div class="revs">' + revs.slice().reverse().map(function (r) { return '<figure class="rev"><div class="rstars">' + new Array(Math.max(1, Math.min(5, +r.stars || 5)) + 1).join(ico('star', 16)) + '</div><blockquote>' + h(r.text) + '</blockquote><figcaption><b>' + h(r.name) + '</b>' + (r.trip ? ' · ' + h(r.trip) : '') + '</figcaption></figure>'; }).join('') + '</div>' : '<p class="empty">' + tr('ستُضاف آراء المعتمرين قريباً.', 'Reviews coming soon.') + '</p>';
    if (t === 'videos') out += vids.length ? '<div class="vids">' + vids.slice().reverse().map(function (v) { return '<figure class="vcard">' + videoEl(v) + '<figcaption><b>' + h(v.title || '') + '</b>' + (v.date ? '<small>' + h(dateAr(v.date, true)) + '</small>' : '') + '</figcaption></figure>'; }).join('') + '</div>' : '<p class="empty">' + tr('ستُضاف فيديوهات الرحلات قريباً.', 'Videos coming soon.') + '</p>';
    if (t === 'archive') out += done.length ? '<div class="arch">' + done.map(function (c) { return '<div><span>' + '' + '</span><b>' + h(c.name) + '</b><small>' + h(dateAr(c.start_date, true)) + (c.pilgrims ? ' · ' + c.pilgrims + ' ' + tr('معتمر', 'pilgrims') : '') + '</small></div>'; }).join('') + '</div>' : '<p class="empty">' + tr('يُستكمل أرشيف الرحلات مع الوقت بإذن الله.', 'Archive will grow, God willing.') + '</p>';
    return out;
  }
  function downloadsHtml() {
    return '<div class="dls">' + [['guide.pdf', '', tr('كتيّب المعتمر الكامل', 'Complete pilgrim booklet')], ['files/adhkar.pdf', '', tr('أذكار وأدعية العمرة', 'Umrah adhkar & duas')], ['files/checklist.pdf', '', tr('قائمة أمتعة المعتمر', 'Packing checklist')]].map(function (d) { return '<a href="' + d[0] + '" download><span>' + d[1] + '</span><b>' + d[2] + '</b><small>PDF</small></a>'; }).join('') + '</div>';
  }
  function privacyHtml() { var st = siteCfg(); return '<p class="privacy">' + tr('تُستخدم بياناتك (الاسم، رقم الهاتف، صورة الجواز) لإتمام الحجز والتأشيرة فقط، ولا تُشارك مع أي جهة أخرى.', 'Your data (name, phone, passport photo) is used only to complete your booking and visa, and is never shared.') + (st.privacy_email ? ' ' + tr('لطلب حذف بياناتك: ', 'To delete your data: ') + '<span dir="ltr">' + h(st.privacy_email) + '</span>' : '') + '</p>'; }
  function vLanding() {
    loadPublic();
    var st = siteCfg(), o = pubOffice(), list = ((pub.info && pub.info.open) || []).filter(bookingOpen);
    var top = '<header class="ptop"><a href="#/" class="mbrand"><img src="' + MARK_G + '" class="lg-c" alt=""><b>' + tr('السراج المنير', 'Al-Siraj Al-Munir') + '</b></a><div class="grow"></div>' + btn(LANG === 'en' ? 'عربي' : 'EN', 'lang', {}, 'sm') + '<a class="btn sm plogin" href="#/login" aria-label="' + tr('دخول', 'Sign in') + '">' + ico('lock', 16) + '<span>' + tr('دخول', 'Sign in') + '</span></a>' + '</header>';
    var hero = '<section class="phero">' + (st.hero_video && /^https:\/\//.test(st.hero_video) ? '<video class="hvid" src="' + h(st.hero_video) + '" autoplay muted loop playsinline></video>' : '<div class="hrays"></div>') + '<div class="hin"><img src="' + LOGO_W + '" alt="السراج المنير للحج والعمرة" class="hlogo"><h1>' + h(st.headline || tr('رحلتك إلى بيت الله، بكل تفاصيلها', 'Your journey to the House of Allah, every step')) + '</h1><div class="acts center">' + link(tr('احجز الآن', 'Book now'), '#/register', 'gold') + link(tr('الرحلات القادمة', 'Upcoming trips'), '#trips', 'light') + '</div></div></section>';
    var out = top + hero + '<div class="pwrap">';
    out += '<section id="trips"><h2 class="ptitle">' + tr('الرحلات القادمة', 'Upcoming trips') + '</h2>' + (pub.info ? tripsList(list, 'bookPick') : '<p class="mu">' + tr('جارٍ التحميل…', 'Loading…') + '</p>') + '</section>';
    out += '<section><h2 class="ptitle">' + tr('من رحلاتنا', 'From our trips') + '</h2>' + pubTabs() + '</section>';
    out += '<section class="giftsec"><div><h2>' + tr('أهدِ عمرة', 'Gift an Umrah') + '</h2><p>' + tr('احجز عمرة لوالدتك أو والدك أو لمن تحب، وصمّم بطاقة إهداء باسمه.', 'Book an Umrah for a parent or loved one, and design a personalized gift card to share.') + '</p></div>' + btn(tr('احجز إهداء', 'Book a gift'), 'giftStart', {}, 'gold') + '</section>';
    out += '<section><h2 class="ptitle">' + tr('الطقس والحرمين', 'Weather & the Two Holy Mosques') + '</h2>' + weatherBox() + mapsHtml(false) + '</section>';
    out += '<section><h2 class="ptitle">' + tr('دليل المعتمر', 'Pilgrim guide') + '</h2>' + downloadsHtml() + '</section>';
    out += '<footer class="pfoot"><img src="' + LOGO_G + '" alt="" class="lg-c">' + (o.phone_sy ? '<p><a href="' + wa(o.phone_sy) + '" target="_blank" rel="noopener" dir="ltr">' + h(o.phone_sy) + '</a>' + (o.phone_sa ? ' · <span dir="ltr">' + h(o.phone_sa) + '</span>' : '') + '</p>' : '') + privacyHtml() + '<p class="mu sm">© ' + new Date().getFullYear() + ' ' + tr('السراج المنير للحج والعمرة', 'Al-Siraj Al-Munir Hajj & Umrah') + '</p></footer></div>';
    return '<div class="public">' + out + '</div>';
  }

  /* ---------- الطقس والخرائط ---------- */
  var wx = { data: null, at: 0, busy: false };
  var WX = { 0: ['sun', 'صافٍ', 'Clear'], 1: ['sun', 'صافٍ غالباً', 'Mostly clear'], 2: ['cloud', 'غائم جزئياً', 'Partly cloudy'], 3: ['cloud', 'غائم', 'Cloudy'], 45: ['cloud', 'ضباب', 'Fog'], 48: ['cloud', 'ضباب', 'Fog'], 51: ['rain', 'رذاذ', 'Drizzle'], 61: ['rain', 'مطر خفيف', 'Light rain'], 63: ['rain', 'مطر', 'Rain'], 65: ['rain', 'مطر غزير', 'Heavy rain'], 80: ['rain', 'زخّات', 'Showers'], 95: ['storm', 'عاصفة رعدية', 'Thunderstorm'] };
  function loadWeather() {
    if (wx.busy || (wx.data && Date.now() - wx.at < 1800e3)) return;
    wx.busy = true;
    fetch('https://api.open-meteo.com/v1/forecast?latitude=21.4225,24.4672&longitude=39.8262,39.6111&current=temperature_2m,weather_code,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FRiyadh&forecast_days=1')
      .then(function (r) { return r.json(); }).then(function (j) { wx.data = Array.isArray(j) ? j : [j]; wx.at = Date.now(); wx.busy = false; wxPaint(); }, function () { wx.busy = false; wx.data = wx.data || 'err'; wxPaint(); });
  }
  function wxPaint() { Array.prototype.forEach.call(document.querySelectorAll('.wx'), function (el) { el.outerHTML = weatherBox(true); }); }
  function weatherBox(noLoad) {
    if (!noLoad) loadWeather();
    var cities = [tr('مكة المكرمة', 'Makkah'), tr('المدينة المنورة', 'Madinah')];
    return '<div class="wx">' + cities.map(function (n, i) {
      var d = Array.isArray(wx.data) && wx.data[i], cur = d && d.current, w = cur && (WX[cur.weather_code] || WX[Math.floor(cur.weather_code / 10) * 10] || ['sun', '', '']);
      return '<div class="wxc"><span class="wxi">' + ico(w ? w[0] : 'sun', 36) + '</span><div><b>' + n + '</b><span>' + (cur ? Math.round(cur.temperature_2m) + '°' + ' · ' + tr(w[1], w[2]) : (wx.data === 'err' ? tr('تعذر التحميل', 'Unavailable') : '…')) + '</span>' + (d && d.daily ? '<small>' + tr('العظمى ', 'High ') + Math.round(d.daily.temperature_2m_max[0]) + '° · ' + tr('الصغرى ', 'Low ') + Math.round(d.daily.temperature_2m_min[0]) + '° · ' + cur.relative_humidity_2m + '%</small>' : '') + '</div></div>';
    }).join('') + '</div>';
  }
  function gmap(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }
  function mapsHtml(withLinks) {
    var out = '<div class="maps"><figure><iframe src="https://www.google.com/maps?q=' + encodeURIComponent('المسجد الحرام مكة') + '&output=embed" loading="lazy" title="المسجد الحرام" referrerpolicy="no-referrer-when-downgrade"></iframe><figcaption>' + tr('المسجد الحرام', 'Masjid al-Haram') + '</figcaption></figure><figure><iframe src="https://www.google.com/maps?q=' + encodeURIComponent('المسجد النبوي المدينة') + '&output=embed" loading="lazy" title="المسجد النبوي" referrerpolicy="no-referrer-when-downgrade"></iframe><figcaption>' + tr('المسجد النبوي', 'The Prophet\'s Mosque') + '</figcaption></figure></div>';
    if (!withLinks) return out;
    var p = curPil(), c = p && byId('campaigns', p.campaign_id), hi = (c && c.hotel_info) || {};
    var lk = [['المسجد الحرام', gmap('Masjid al-Haram')], ['المسجد النبوي', gmap('Al-Masjid an-Nabawi')], ['مسجد التنعيم (مسجد عائشة)', gmap('Masjid Aisha Taneem Makkah')], ['ميقات ذو الحليفة (أبيار علي)', gmap('Dhul Hulayfah Miqat Abyar Ali')], ['مسجد قباء', gmap('Quba Mosque Madinah')]];
    if (c && c.makkah_hotel) lk.unshift(['فندقك بمكة: ' + c.makkah_hotel, hi.makkah && safeUrl(hi.makkah.map) || gmap(c.makkah_hotel + ' مكة')]);
    if (c && c.madinah_hotel) lk.unshift(['فندقك بالمدينة: ' + c.madinah_hotel, hi.madinah && safeUrl(hi.madinah.map) || gmap(c.madinah_hotel + ' المدينة')]);
    if (c && c.depart_place) lk.unshift(['مكان التجمّع والانطلاق: ' + c.depart_place + (c.depart_time ? ' · ' + c.depart_time : ''), gmap(c.depart_place + ' دمشق')]);
    return out + '<div class="rows">' + lk.map(function (l) { return '<div><span>' + h(l[0]) + '</span><a href="' + h(l[1]) + '" target="_blank" rel="noopener">' + 'فتح ' + ico('ext', 14) + '</a></div>'; }).join('') + '</div>';
  }
  function vWeather() { return head('الطقس والخرائط', 'مكة والمدينة الآن') + weatherBox() + mapsHtml(true); }

  /* ---------- الحجز (لنفسي، لعائلتي، أو إهداء) ---------- */
  var bk = { camp: '', mode: 'self', rows: [] };
  function readRows() { var r = []; Array.prototype.forEach.call(document.querySelectorAll('#bkRows .bkrow'), function (el) { r.push({ name: el.querySelector('[name=bn]').value, gender: el.querySelector('[name=bg]').value, birth_date: el.querySelector('[name=bb]').value, room_type: el.querySelector('[name=br]').value }); }); return r; }
  function redrawBooking(change) {
    var form = document.querySelector('form[data-form=book]');
    var names = ['name', 'gender', 'birth_date', 'phone', 'pass', 'self_room', 'guarantor_name', 'guarantor_phone', 'agree'];
    var fields = names.map(function (name) {
      var field = form && form.elements.namedItem(name);
      return field && [name, field.value, field.checked];
    }).filter(Boolean);
    if (form) bk.rows = readRows();
    change();
    render();
    var next = document.querySelector('form[data-form=book]');
    fields.forEach(function (entry) {
      var field = next && next.elements.namedItem(entry[0]);
      if (!field) return;
      if (field.type === 'checkbox') field.checked = entry[2];
      else field.value = entry[1];
    });
    bkTotal();
  }
  function roomOpts(c, val) { var rp = roomPrices(c), ks = Object.keys(ROOMS).filter(function (k) { return rp[k] != null; }); if (!ks.length) return '<option value="">—</option>'; return ks.map(function (k) { return '<option value="' + k + '"' + (val === k ? ' selected' : '') + '>' + tr(ROOMS[k], ROOMS_EN[k]) + ' · ' + usd(rp[k]) + '</option>'; }).join(''); }
  function bkRow(c, r) {
    r = r || {};
    return '<div class="bkrow"><div class="fld wide"><label>' + tr('الاسم الثلاثي', 'Full name') + '</label><input aria-label="' + h(tr('الاسم الثلاثي', 'Full name')) + '" name="bn" maxlength="120" value="' + h(r.name || '') + '"></div><div class="fld"><label>' + tr('الجنس', 'Gender') + '</label><select aria-label="' + h(tr('الجنس', 'Gender')) + '" name="bg"><option value="m">' + tr('ذكر', 'Male') + '</option><option value="f"' + (r.gender === 'f' ? ' selected' : '') + '>' + tr('أنثى', 'Female') + '</option></select></div><div class="fld"><label>' + tr('تاريخ الميلاد', 'Birth date') + '</label><input aria-label="' + h(tr('تاريخ الميلاد', 'Birth date')) + '" name="bb" type="date" value="' + h(r.birth_date || '') + '"></div><div class="fld"><label>' + tr('الغرفة', 'Room') + '</label><select aria-label="' + h(tr('الغرفة', 'Room')) + '" name="br">' + roomOpts(c, r.room_type || fd.room) + '</select></div><div class="fld end">' + btn(ico('xx', 16) + ' ' + tr('حذف', 'Remove'), 'bkDel', {}, 'sm danger') + '</div></div>';
  }
  function bookCamp() { var l = (pub.info && pub.info.open) || []; return l.filter(function (x) { return x.id === bk.camp; })[0] || byId('campaigns', bk.camp); }
  function bookForm(withAccount) {
    var c = bookCamp(); if (c && !bookingOpen(c)) return '<p class="err">' + tr('انتهت مهلة الحجز لهذه الرحلة.', 'Booking has closed for this trip.') + '</p>'; if (!c) return '<p class="err">' + tr('الرحلة غير موجودة.', 'Trip not found.') + '</p>';
    var gift = bk.mode === 'gift', u = me();
    if (gift && !bk.rows.length) bk.rows = [{}];
    var out = '<div class="bkhead"><b>' + h(c.name) + '</b><span>' + h(dateAr(c.start_date, true)) + '</span></div><form class="form" data-form="book" novalidate>';
    if (withAccount) out += '<div class="fld wide sep"><h3>' + tr('حسابك', 'Your account') + '</h3><small class="mu">' + tr('تتابع من هذا الحساب الحجز والدفع والتأشيرة' + (gift ? '، وتصمّم بطاقة الإهداء' : ''), 'Use it to follow booking, payment and visa' + (gift ? ', and design the gift card' : '')) + '</small></div>' +
      '<div class="fld wide"><label for="r_name">' + tr('اسمك الثلاثي', 'Your full name') + '</label><input id="r_name" name="name" required maxlength="120"></div>' +
      '<div class="fld"><label for="r_gender">' + tr('الجنس', 'Gender') + '</label><select id="r_gender" name="gender"><option value="m">' + tr('ذكر', 'Male') + '</option><option value="f">' + tr('أنثى', 'Female') + '</option></select></div>' +
      '<div class="fld"><label for="r_birth">' + tr('تاريخ الميلاد', 'Birth date') + '</label><input id="r_birth" name="birth_date" type="date"></div>' +
      '<div class="fld"><label for="r_phone">' + tr('رقم الموبايل (واتساب)', 'Mobile (WhatsApp)') + '</label><input id="r_phone" name="phone" type="tel" dir="ltr" required placeholder="09xxxxxxxx"></div>' +
      '<div class="fld"><label for="r_pass">' + tr('كلمة سر (8 أحرف على الأقل)', 'Password (8+ chars)') + '</label><input id="r_pass" name="pass" type="password" minlength="8" required autocomplete="new-password"></div>';
    out += '<div class="fld wide sep"><h3>' + tr('من المسافر؟', 'Who is travelling?') + '</h3></div><div class="fld wide"><div class="seg">' + btn('' + tr('أنا (ومعي عائلتي)', 'Me (and my family)'), 'bkMode', { m: 'self' }, gift ? '' : 'on') + btn('' + tr('إهداء لشخص آخر', 'A gift for someone'), 'bkMode', { m: 'gift' }, gift ? 'on' : '') + '</div></div>';
    if (!gift) out += '<div class="fld"><label for="bk_room">' + tr('غرفتي', 'My room') + '</label><select id="bk_room" name="self_room">' + roomOpts(c, fd.room) + '</select></div><div class="fld wide"><small class="mu">' + tr('لإضافة أفراد العائلة: لكل شخص ملف مستقل، وتتابع وثائقه ودفعاته من حسابك.', 'Adding family? Each person gets a file you manage from your account.') + '</small></div>';
    else out += '<div class="fld wide"><small class="mu">' + tr('اكتب بيانات الشخص الذي تهديه العمرة، وبعد الحجز يمكنك تصميم بطاقة إهداء باسمه.', 'Enter the details of the person you are gifting. After booking you can design a gift card.') + '</small></div>';
    out += '<div id="bkRows" class="fld wide">' + bk.rows.map(function (r) { return bkRow(c, r); }).join('') + '</div><div class="fld wide">' + btn('+ ' + (gift ? tr('أضف شخصاً آخر', 'Add another person') : tr('أضف فرداً من العائلة', 'Add a family member')), 'bkAdd', {}, '') + '</div>';
    out += '<div class="fld wide sep"><h3>' + tr('الكفيل (مقيم بالشام)', 'Guarantor (resident in Syria)') + '</h3></div><div class="fld"><label for="bk_gn">' + tr('اسم الكفيل', 'Guarantor name') + '</label><input id="bk_gn" name="guarantor_name" maxlength="120"></div><div class="fld"><label for="bk_gp">' + tr('رقم الكفيل', 'Guarantor phone') + '</label><input id="bk_gp" name="guarantor_phone" type="tel" dir="ltr" maxlength="30"></div>';
    out += '<div class="fld wide"><div class="bktotal" id="bkTotal"></div></div>';
    out += '<div class="fld wide"><label class="chk"><input type="checkbox" name="agree" required><span>' + tr('قرأت شروط الحجز وسياسة الخصوصية وأوافق عليها', 'I accept the booking terms and privacy policy') + '</span></label>' + privacyHtml() + '</div>';
    out += '<div class="fld wide"><p class="err" id="aerr" role="alert"></p><button class="btn pri big" type="submit">' + (gift ? '' + tr('احجز الإهداء', 'Book the gift') : '' + tr('إرسال طلب الحجز', 'Send booking request')) + '</button></div></form>';
    return out;
  }
  function bkTotal() {
    var f = document.querySelector('form[data-form=book]'), el = document.getElementById('bkTotal'), c = bookCamp(); if (!f || !el || !c) return;
    var items = [], gift = bk.mode === 'gift';
    if (!gift) { var sr = (f.querySelector('[name=self_room]') || {}).value; items.push(roomPrice(c, sr)); }
    readRows().forEach(function (r) { items.push(roomPrice(c, r.room_type)); });
    var tot = items.reduce(function (a, b) { return a + b; }, 0), dep = Math.round(tot * (c.deposit_pct == null || c.deposit_pct === '' ? 50 : num(c.deposit_pct)) / 100);
    el.innerHTML = '<div><span>' + tr('عدد الأشخاص', 'People') + '</span><b>' + items.length + '</b></div><div><span>' + tr('المجموع', 'Total') + '</span><b>' + usd(tot) + '</b></div>' + (dep && dep < tot ? '<div><span>' + tr('الدفعة الأولى', 'Deposit') + '</span><b>' + usd(dep) + '</b></div>' : '');
  }
  function vBookPage(withAccount) {
    var inner;
    if (!bk.camp) { loadPublic(); inner = '<h1>' + (withAccount ? tr('سجّل واحجز عمرتك', 'Register & book your Umrah') : 'احجز رحلة') + '</h1>' + (pub.info ? tripsList(pub.info.open.filter(bookingOpen), 'bookPick') : '<p class="mu">' + tr('جارٍ التحميل…', 'Loading…') + '</p>'); }
    else inner = '<h1>' + (bk.mode === 'gift' ? '' + tr('حجز إهداء', 'Gift booking') : tr('بيانات الحجز', 'Booking details')) + '</h1>' + bookForm(withAccount);
    inner += btn(tr('رجوع', 'Back'), 'bookBack', {}, 'link');
    if (withAccount) return '<div class="public"><header class="ptop"><a href="#/" class="mbrand"><img src="' + MARK_G + '" class="lg-c" alt=""><b>' + tr('السراج المنير', 'Al-Siraj Al-Munir') + '</b></a><div class="grow"></div>' + btn(LANG === 'en' ? 'عربي' : 'EN', 'lang', {}, 'sm') + link(tr('دخول', 'Sign in'), '#/login', 'sm') + '</header><div class="pwrap narrow">' + inner + '</div></div>';
    return inner;
  }
  function famChips() {
    var u = me(), l = famPilgrims().filter(function (p) { return p.status !== 'cancelled'; }), cur = curPil();
    if (l.length < 2 && !(l[0] && l[0].user_id !== u.id)) return '';
    return '<div class="chips fam">' + l.map(function (p) { var c = byId('campaigns', p.campaign_id) || {}; return '<button type="button" class="chip' + (cur && cur.id === p.id ? ' on' : '') + '" data-act="selPil" data-id="' + h(p.id) + '">' + (p.user_id === u.id ? 'أنا' : h(String(p.name).split(' ')[0])) + (p.gift_from ? ' ' : '') + ' <em>' + h(String(c.name || '').slice(0, 18)) + '</em></button>'; }).join('') + '</div>';
  }

  /* ---------- بطاقة الإهداء وبطاقة «تمّت عمرتي» ---------- */
  var gc = { theme: 'green', msg: '', from: '' };
  var THEMES = { green: ['#0C4A33', '#0B7A4B', '#F3E4C2', '#D2A24C', LOGO_W], gold: ['#B8862F', '#E4B865', '#1F1505', '#0C4A33', LOGO_G], cream: ['#FBF8F0', '#F1E6CC', '#0C4A33', '#C9963C', LOGO_G] };
  function roundRect(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
  function wrapText(x, text, cx, y, maxW, lh) { var words = String(text).split(' '), line = '', lines = []; words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }); if (line) lines.push(line); lines.forEach(function (l, i) { x.fillText(l, cx, y + i * lh); }); return y + lines.length * lh; }
  function drawGift(cv, p) {
    var c = byId('campaigns', p.campaign_id) || {}, T = THEMES[gc.theme] || THEMES.green, x = cv.getContext('2d'), W = cv.width, H = cv.height;
    var fonts = document.fonts ? Promise.all(['700 40px Cairo', '400 40px Cairo'].map(function (q) { return document.fonts.load(q).catch(function () {}); })) : Promise.resolve();
    return fonts.then(function () { return loadImg(T[4]); }).then(function (logo) {
      var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, T[0]); g.addColorStop(1, T[1]); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.save(); x.globalAlpha = .08; x.translate(W / 2, H * 0.32); for (var i = 0; i < 36; i++) { x.rotate(Math.PI / 18); x.fillStyle = T[3]; x.fillRect(0, -6, W, 12); } x.restore();
      x.strokeStyle = T[3]; x.lineWidth = 4; roundRect(x, 40, 40, W - 80, H - 80, 36); x.stroke(); x.lineWidth = 1.5; roundRect(x, 58, 58, W - 116, H - 116, 28); x.stroke();
      var lh = 300, lw = logo.width * lh / logo.height; x.drawImage(logo, (W - lw) / 2, 110, lw, lh);
      x.textAlign = 'center'; x.direction = 'rtl'; x.fillStyle = T[3]; x.font = '700 40px Cairo, sans-serif'; x.fillText('هدية عمرة', W / 2, 500);
      x.fillStyle = T[2]; x.font = '400 40px Cairo, sans-serif'; x.fillText('مُهداة إلى', W / 2, 580);
      x.font = '700 78px Cairo, sans-serif'; x.fillText(p.name, W / 2, 680);
      x.fillStyle = T[3]; x.fillRect(W / 2 - 160, 712, 320, 4);
      x.fillStyle = T[2]; x.font = '400 40px Cairo, serif'; var y = wrapText(x, gc.msg || defGiftMsg(), W / 2, 800, W - 220, 66);
      x.font = '400 34px Cairo, sans-serif'; x.globalAlpha = .9; x.fillText('رحلة «' + (c.name || '') + '»' + (c.start_date ? ' · ' + dateAr(c.start_date, true) : ''), W / 2, Math.max(y + 40, 1040)); x.globalAlpha = 1;
      x.fillStyle = T[3]; x.font = '700 40px Cairo, sans-serif'; x.fillText('مع محبّة: ' + (gc.from || (me() || {}).name || ''), W / 2, H - 150);
      x.fillStyle = T[2]; x.font = '400 26px Cairo, sans-serif'; x.globalAlpha = .75; x.fillText('السراج المنير للحج والعمرة', W / 2, H - 92); x.globalAlpha = 1;
    });
  }
  function defGiftMsg() { return 'عمرة مقبولة إن شاء الله، تمّ حجز رحلتك إلى بيت الله الحرام مع حملة السراج المنير'; }
  function vGift() {
    var l = famPilgrims().filter(function (p) { return p.status !== 'cancelled' && p.user_id !== me().id; }), p = curPil();
    if (!l.length) return back('#/', 'الرئيسية') + head('بطاقة الإهداء', '') + emptyBox('تظهر بطاقة الإهداء عند حجز عمرة لشخص آخر.', link('احجز إهداء', '#/book', 'gold'));
    if (!p || p.user_id === me().id) { p = l[0]; selPil = p.id; }
    if (!gc.from) gc.from = me().name;
    return back('#/', 'الرئيسية') + head('صمّم بطاقة الإهداء', 'باسم ' + h(p.name)) + famChips() + '<div class="giftwrap"><canvas id="giftcv" width="1080" height="1350" data-id="' + h(p.id) + '"></canvas><div class="giftform"><div class="seg">' + [['green', 'أخضر'], ['gold', 'ذهبي'], ['cream', 'كريمي']].map(function (t) { return '<button type="button" class="' + (gc.theme === t[0] ? 'on' : '') + '" data-act="gcTheme" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div class="fld"><label for="gc_from">من</label><input id="gc_from" data-chg="gcFrom" value="' + h(gc.from) + '" maxlength="60"></div><div class="fld"><label for="gc_msg">الرسالة</label><textarea id="gc_msg" data-chg="gcMsg" maxlength="200">' + h(gc.msg || defGiftMsg()) + '</textarea></div><div class="acts">' + btn('تنزيل البطاقة', 'cardDownload', { cv: 'giftcv', n: 'بطاقة-إهداء-عمرة' }, 'gold') + btn('مشاركة', 'cardShare', { cv: 'giftcv', n: 'بطاقة-إهداء-عمرة', t: 'هدية عمرة لـ ' + p.name + ' ' }, 'pri') + '</div></div></div>';
  }
  function drawDone(cv, p) {
    var c = byId('campaigns', p.campaign_id) || {}, x = cv.getContext('2d'), W = cv.width, H = cv.height, f = p.gender === 'f';
    var fonts = document.fonts ? Promise.all(['700 40px Cairo', '400 40px Cairo'].map(function (q) { return document.fonts.load(q).catch(function () {}); })) : Promise.resolve();
    return fonts.then(function () { return loadImg(LOGO_W); }).then(function (logo) {
      var g = x.createRadialGradient(W / 2, H * 0.35, 50, W / 2, H / 2, W * 0.8); g.addColorStop(0, '#0F6A45'); g.addColorStop(1, '#062519'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.save(); x.globalAlpha = .07; x.translate(W / 2, H * 0.3); for (var i = 0; i < 36; i++) { x.rotate(Math.PI / 18); x.fillStyle = '#E0B05A'; x.fillRect(0, -5, W, 10); } x.restore();
      var lh = 260, lw = logo.width * lh / logo.height; x.drawImage(logo, (W - lw) / 2, 90, lw, lh);
      x.textAlign = 'center'; x.direction = 'rtl'; x.fillStyle = '#E0B05A'; x.font = '700 92px Cairo, sans-serif'; x.fillText('تمّت عمرتي ', W / 2, 500);
      x.fillStyle = '#fff'; x.font = '700 58px Cairo, sans-serif'; x.fillText(p.name, W / 2, 600);
      x.fillStyle = '#CFE3D8'; x.font = '400 34px Cairo, sans-serif'; x.fillText((c.name || 'السراج المنير') + ' · ' + dateAr(p.done_at || today(), true), W / 2, 665); x.fillText(hijri(p.done_at || today()), W / 2, 715);
      x.fillStyle = '#F3E4C2'; x.font = '400 40px Cairo, serif'; wrapText(x, 'اللَّهُمَّ اجْعَلْهَا عُمْرَةً مَبْرُورَةً، وَسَعْيًا مَشْكُورًا، وَذَنْبًا مَغْفُورًا', W / 2, 820, W - 200, 70);
      x.fillStyle = '#E0B05A'; x.font = '400 30px Cairo, sans-serif'; x.fillText((f ? 'لا تنسوني' : 'لا تنسوني') + ' من صالح دعائكم', W / 2, H - 100);
    });
  }
  function vDoneCard() {
    var p = myPilgrim() && myPilgrim().status === 'done' ? myPilgrim() : curPil();
    if (!p || p.status !== 'done') return back('#/', 'الرئيسية') + head('بطاقة «تمّت عمرتي»', '') + emptyBox('تظهر البطاقة بعد إتمام عمرتك من المطوّف.', link('افتح المطوّف', '#/mutawwif', 'pri'));
    return back('#/', 'الرئيسية') + head('تمّت عمرتي', 'شاركها مع أهلك وأصدقائك') + '<div class="certwrap sq"><canvas id="donecv" width="1080" height="1080" data-id="' + h(p.id) + '"></canvas></div><div class="acts center">' + btn('تنزيل البطاقة', 'cardDownload', { cv: 'donecv', n: 'تمت-عمرتي' }, 'gold big') + btn('شارك', 'cardShare', { cv: 'donecv', n: 'تمت-عمرتي', t: 'تمّت عمرتي بفضل الله لا تنسوني من دعائكم' }, 'pri big') + '</div>';
  }
  function shareCanvas(cv, name, text) {
    cv.toBlob(function (b) {
      var file = null; try { file = new File([b], name + '.png', { type: 'image/png' }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], text: text }).catch(function () {}); return; }
      download(b, name + '.png'); toast('نُزّلت الصورة، يمكنك إرفاقها في أي محادثة');
    }, 'image/png');
  }

  /* ---------- إدارة الصفحة العامة (المدير) ---------- */
  function vSiteAdmin() {
    var st = db.settings.public || {}, revs = st.reviews || [], vids = st.videos || [];
    return head('الصفحة العامة', 'ما يراه الزوار قبل تسجيل الدخول', link('معاينة', '#/preview', '')) + '<div class="tiles">' +
      tile('الواجهة', '', '<form class="form" data-form="sitecfg"><div class="fld wide"><label for="sc_head">العنوان الرئيسي</label><input id="sc_head" name="headline" maxlength="120" value="' + h(st.headline || '') + '" placeholder="رحلتك إلى بيت الله… بكل تفاصيلها"></div><div class="fld wide"><label for="sc_vid">رابط فيديو الخلفية (mp4، اختياري)</label><input id="sc_vid" name="hero_video" dir="ltr" maxlength="300" value="' + h(st.hero_video || '') + '" placeholder="https://…/video.mp4"></div><div class="fld wide"><label for="sc_mail">إيميل طلبات حذف البيانات (اختياري)</label><input id="sc_mail" name="privacy_email" dir="ltr" maxlength="120" value="' + h(st.privacy_email || '') + '"></div><div class="fld wide"><small class="mu">زر واتساب الاختياري يتصل برقم المكتب المحدد في «الإعدادات».</small><button class="btn pri" type="submit">حفظ</button></div></form>', true) +
      tile('آراء العملاء', revs.length + ' رأي', btn('+ رأي جديد', 'addReview', {}, 'pri') + rows(revs.map(function (r, i) { return ['<b>' + h(r.name) + '</b> ' + '· ' + (+r.stars || 5) + '/5' + '<br><small class="mu">' + h(String(r.text).slice(0, 90)) + '</small>', btn('حذف', 'delReview', { i: i }, 'sm')]; })), true) +
      tile('فيديوهات الرحلات', vids.length + ' فيديو', '<p class="mu sm">أضف رابط يوتيوب أو رابط فيديو mp4، وأي رابط آخر يظهر كزر مشاهدة.</p>' + btn('+ فيديو جديد', 'addVideo', {}, 'pri') + rows(vids.map(function (v, i) { return ['<b>' + h(v.title) + '</b><br><small class="mu" dir="ltr">' + h(String(v.url).slice(0, 50)) + '</small>', btn('حذف', 'delVideo', { i: i }, 'sm')]; })), true) +
      tile('الرحلات المنجزة', '', '<p class="mu">تظهر تلقائياً: كل رحلة حالتها «منتهية» أو انقضى تاريخ عودتها، مع عدد معتمريها.</p>', true) + '</div>';
  }

  /* ---------- لوحة المدير ---------- */
  function nextCamp() { var l = db.campaigns.filter(function (c) { return c.start_date && c.start_date >= today() && c.status !== 'done'; }).sort(function (a, b) { return a.start_date.localeCompare(b.start_date); }); return l[0]; }
  function vDash() {
    var f = campFin(), u = me(), d = longDates(), nc = nextCamp(), reqs = db.pilgrims.filter(function (p) { return p.status === 'request'; }), pend = pendingMoves(), qs = openQs();
    var active = db.pilgrims.filter(function (p) { return p.status !== 'cancelled' && p.status !== 'done'; }).length;
    var out = '<div class="hero"><div><span class="mu">' + greet() + '</span><h1>' + h(u.name) + '</h1><p>' + h(d[0]) + ' · ' + h(d[1]) + '</p></div><div class="hero-clock"><span class="clock" id="clock2"></span>' + nextPrayerMini() + '</div></div>';
    out += '<div class="kpis">' + kpi('دخل الحملات', usd(f.inc), 'hi') + kpi('المصروف', usd(f.out)) + kpi('الصافي', usd(f.net), f.net >= 0 ? 'good' : 'bad') + kpi('معتمرين حاليين', String(active), '', db.campaigns.length + ' حملة') + '</div>';
    var alerts = [];
    if (reqs.length) alerts.push('<a class="alert" href="#/pilgrims"><b>' + reqs.length + '</b> طلب عمرة جديد بانتظار القبول</a>');
    if (pend.length) alerts.push('<a class="alert" href="#/finance"><b>' + pend.length + '</b> دفعة بانتظار التأكيد · ' + usd(sum(pend, function (m) { return num(m.usd); })) + '</a>');
    if (qs.length) alerts.push('<a class="alert ' + (qs.some(function (m) { return m.kind === 'sos'; }) ? 'sos' : '') + '" href="#/messages"><b>' + qs.length + '</b> سؤال أو نداء بدون رد</a>');
    if (alerts.length) out += '<div class="alerts">' + alerts.join('') + '</div>';
    if (nc) {
      var dd = daysTo(nc.start_date), cp = campPil(nc.id), fn = campFin(nc.id);
      out += card('<div class="nc"><div><span class="mu">الرحلة القادمة</span><h2><a href="#/campaign/' + h(nc.id) + '">' + h(nc.name) + '</a></h2><p>' + h(dayName(nc.start_date)) + ' ' + h(dateAr(nc.start_date, true)) + (nc.depart_time ? ' · الساعة ' + h(nc.depart_time) : '') + (nc.depart_place ? ' · من ' + h(nc.depart_place) : '') + '</p></div><div class="count"><b>' + (dd === 0 ? 'اليوم' : dd) + '</b><span>' + (dd === 0 ? 'الانطلاق' : dd === 1 ? 'يوم' : 'يوم للانطلاق') + '</span></div></div>' +
        '<div class="minis"><span>' + cp.length + (nc.seats ? ' / ' + h(nc.seats) : '') + ' معتمر</span><span>' + cp.filter(function (p) { return p.docs && p.docs.visa; }).length + ' تأشيرة</span><span>' + usd(fn.inc) + ' مقبوض</span><span>' + usd(sum(cp, function (p) { return pilDue(p).left; })) + ' باقي</span></div>', 'feature');
    }
    var camps = db.campaigns.slice().sort(function (a, b) { return String(b.start_date).localeCompare(String(a.start_date)); }).slice(0, 6);
    out += '<div class="tiles">' + tile('الحملات', db.campaigns.length + ' حملة', camps.length ? rows(camps.map(function (c) { var fn = campFin(c.id); return ['<a href="#/campaign/' + h(c.id) + '">' + h(c.name) + '</a>', h(dateAr(c.start_date)) + ' · ' + campPil(c.id).length + ' معتمر · ' + usd(fn.net)]; })) : '<p class="empty">لا توجد حملات بعد.</p>' + btn('+ إضافة حملة', 'addCamp', {}, 'pri'), true) +
      tile('آخر الطلبات', reqs.length + ' جديد', rows(db.pilgrims.slice(-6).reverse().map(function (p) { return ['<a href="#/pilgrim/' + h(p.id) + '">' + h(p.name) + '</a>', badge(p.status)]; })), true) + '</div>';
    return pushBanner() + out;
  }
  function nextPrayerMini() { var n = PR.next('makkah'); return '<span class="np">' + h(n.name) + ' بمكة ' + PR.hm12(n.at) + ' · بعد ' + (n.left >= 60 ? Math.floor(n.left / 60) + ' س ' : '') + (n.left % 60) + ' د</span>'; }

  /* ---------- الحملات ---------- */
  function vCampaigns() {
    var l = db.campaigns.slice().sort(function (a, b) { return String(b.start_date).localeCompare(String(a.start_date)); });
    var out = head('الحملات', 'كل رحلات العمرة', isMgr() ? btn('+ حملة جديدة', 'addCamp', {}, 'pri') : '');
    if (!l.length) return out + emptyBox('لا توجد حملات بعد. أضف أول رحلة عمرة.', isMgr() ? btn('+ حملة جديدة', 'addCamp', {}, 'pri') : '');
    return out + '<div class="cgrid">' + l.map(function (c) {
      var cp = campPil(c.id), fn = campFin(c.id), dd = c.start_date ? daysTo(c.start_date) : null;
      return '<a class="camp" href="#/campaign/' + h(c.id) + '"><div class="camp-h"><b>' + h(c.name) + '</b><span class="badge cs-' + h(c.status) + '">' + ({ open: 'مفتوحة', closed: 'مغلقة', done: 'منتهية' }[c.status] || '') + '</span></div>' +
        '<span>' + h(dateAr(c.start_date, true)) + (dd != null && dd >= 0 ? ' · باقي ' + dd + ' يوم' : '') + '</span>' +
        '<span>' + (TRIP_TYPES[c.trip_type] || TRIP_TYPES.land) + (fromPrice(c) ? ' · من ' + usd(fromPrice(c)) : '') + (c.deadline ? ' · آخر حجز ' + h(dateAr(c.deadline)) : '') + '</span>' +
        '<span>' + h(c.makkah_hotel || '—') + ' · ' + h(c.makkah_nights || 0) + ' ليالٍ</span><span>' + h(c.madinah_hotel || '—') + ' · ' + h(c.madinah_nights || 0) + ' ليالٍ</span>' +
        '<div class="minis"><span>' + cp.length + (c.seats ? '/' + h(c.seats) : '') + '</span>' + (isMgr() ? '<span>' + usd(fn.inc) + '</span><span>صافي ' + usd(fn.net) + '</span>' : '') + '</div></a>';
    }).join('') + '</div>';
  }
  function nightsOpts() { var o = [['0', '—']]; for (var i = 1; i <= 10; i++) o.push([String(i), i + (i === 1 ? ' ليلة' : i === 2 ? ' ليلتان' : ' ليالٍ')]); return o; }
  function campForm(c) {
    var n = !c; c = c || { status: 'open', makkah_nights: 7, madinah_nights: 3, trip_type: 'land', terms: DEF_TERMS, includes: DEF_INCLUDES, excludes: 'الوجبات', deposit_pct: 50, prices: {}, hotel_info: {} };
    var pr = c.prices || {}, hi = c.hotel_info || {}, mk = hi.makkah || {}, md = hi.madinah || {};
    var yn = [['', '—'], ['1', 'نعم، يوجد نقل مجاني إلى الحرم']];
    openForm(n ? 'رحلة جديدة' : 'تعديل الرحلة', [
      { type: 'sep', label: 'الأساسيات' },
      { k: 'name', label: 'اسم الرحلة', value: c.name || 'رحلة العمرة · ', req: true, wide: true, max: 120 },
      { k: 'trip_type', label: 'نوع الرحلة', type: 'select', options: [['land', 'بالبر (باص)'], ['flight', 'بالطيران']], value: c.trip_type || 'land' },
      { k: 'status', label: 'الحالة', type: 'select', options: [['open', 'الحجز مفتوح (تظهر للزوار)'], ['closed', 'مغلقة'], ['done', 'منتهية (تنتقل إلى الأرشيف)']], value: c.status },
      { k: 'start_date', label: 'تاريخ الانطلاق', type: 'date', value: c.start_date, req: true },
      { k: 'end_date', label: 'تاريخ العودة', type: 'date', value: c.end_date },
      { k: 'deadline', label: 'آخر موعد للحجز', type: 'date', value: c.deadline },
      { k: 'seats', label: 'عدد المقاعد', type: 'number', value: c.seats || '' },
      { k: 'depart_place', label: 'مكان الانطلاق', value: c.depart_place, ph: 'مثلاً: القدم · الميدان', max: 200 },
      { k: 'depart_time', label: 'ساعة الانطلاق', type: 'time', value: c.depart_time },
      { k: 'travel_time', label: 'الوقت المتوقع للوصول', value: c.travel_time, ph: 'مثلاً: حوالي 35 ساعة بالباص', max: 120 },
      { k: 'flight_info', label: 'تفاصيل الطيران (للطيران)', value: c.flight_info, ph: 'دمشق ← المدينة، والعودة جدة ← دمشق', max: 300 },
      { type: 'sep', label: 'الأسعار للشخص بالدولار (الحقل الفارغ = غير متوفر)' },
      { k: 'p_quint', label: 'خماسية', type: 'number', value: pr.quint || '' },
      { k: 'p_quad', label: 'رباعية', type: 'number', value: pr.quad || '' },
      { k: 'p_triple', label: 'ثلاثية', type: 'number', value: pr.triple || '' },
      { k: 'p_double', label: 'ثنائية', type: 'number', value: pr.double || '' },
      { k: 'deposit_pct', label: 'الدفعة الأولى عند الحجز (%)', type: 'number', value: c.deposit_pct == null ? 50 : c.deposit_pct },
      { k: 'hotel_stars', label: 'مستوى الفنادق', type: 'select', options: [['0', '—'], ['2', 'نجمتان'], ['3', '3 نجوم'], ['4', '4 نجوم'], ['5', '5 نجوم']], value: String(c.hotel_stars || 0) },
      { type: 'sep', label: 'مكة المكرمة' },
      { k: 'makkah_hotel', label: 'فندق مكة', value: c.makkah_hotel, ph: 'مثلاً: منى كونكورد أو ما يعادله', max: 160 },
      { k: 'makkah_nights', label: 'ليالي مكة', type: 'select', options: nightsOpts(), value: String(c.makkah_nights || 0) },
      { k: 'mk_dist', label: 'البُعد عن الحرم', value: mk.dist, ph: 'مثلاً: 1.5 كم', max: 40 },
      { k: 'mk_walk', label: 'وقت المشي', value: mk.walk, ph: 'مثلاً: 23 دقيقة', max: 40 },
      { k: 'mk_shuttle', label: 'نقل إلى الحرم', type: 'select', options: yn, value: mk.shuttle ? '1' : '' },
      { k: 'mk_map', label: 'رابط الفندق على خرائط جوجل', value: mk.map, ph: 'https://maps.app.goo.gl/…', max: 300 },
      { type: 'sep', label: 'المدينة المنورة' },
      { k: 'madinah_hotel', label: 'فندق المدينة', value: c.madinah_hotel, ph: 'مثلاً: كيان الضيافة', max: 160 },
      { k: 'madinah_nights', label: 'ليالي المدينة', type: 'select', options: nightsOpts(), value: String(c.madinah_nights || 0) },
      { k: 'md_dist', label: 'البُعد عن المسجد النبوي', value: md.dist, max: 40 },
      { k: 'md_walk', label: 'وقت المشي', value: md.walk, max: 40 },
      { k: 'md_shuttle', label: 'نقل إلى المسجد', type: 'select', options: yn, value: md.shuttle ? '1' : '' },
      { k: 'md_map', label: 'رابط الفندق على خرائط جوجل', value: md.map, max: 300 },
      { type: 'sep', label: 'ما تشمله الرحلة والشروط' },
      { k: 'includes', label: 'تشمل (كل بند في سطر)', type: 'area', value: c.includes, wide: true, max: 2000 },
      { k: 'excludes', label: 'لا تشمل', type: 'area', value: c.excludes, wide: true, max: 1000 },
      { k: 'terms', label: 'شروط الحجز (كل شرط في سطر)', type: 'area', value: c.terms, wide: true, max: 2000 },
      { type: 'sep', label: 'المشرف' },
      { k: 'sup_name', label: 'اسم المشرف المسؤول', value: c.sup_name, max: 120 },
      { k: 'sup_sy', label: 'رقم المشرف السوري (واتساب)', type: 'tel', value: c.sup_sy, max: 30 },
      { k: 'sup_sa', label: 'رقم المشرف السعودي (اتصال)', type: 'tel', value: c.sup_sa, max: 30 },
      { k: 'notes', label: 'ملاحظات داخلية (لا يراها الزوار)', type: 'area', value: c.notes, wide: true, max: 4000 }
    ], function (v) {
      if (v.end_date && v.end_date < v.start_date) return { err: 'تاريخ العودة قبل الانطلاق!' };
      var row = n ? { id: uid(), staff: [], program: [] } : c;
      ['name', 'start_date', 'end_date', 'deadline', 'depart_place', 'depart_time', 'travel_time', 'flight_info', 'makkah_hotel', 'madinah_hotel', 'sup_name', 'sup_sy', 'sup_sa', 'status', 'notes', 'includes', 'excludes', 'terms'].forEach(function (k) { row[k] = String(v[k] || '').trim(); });
      row.trip_type = v.trip_type === 'flight' ? 'flight' : 'land';
      row.makkah_nights = +v.makkah_nights || 0; row.madinah_nights = +v.madinah_nights || 0; row.seats = v.seats ? Math.round(num(v.seats)) : ''; row.hotel_stars = +v.hotel_stars || 0;
      row.deposit_pct = Math.max(0, Math.min(100, Math.round(num(v.deposit_pct))));
      row.prices = {}; Object.keys(ROOMS).forEach(function (k) { var x = num(v['p_' + k]); if (x > 0) row.prices[k] = x; });
      row.price = fromPrice(row);
      row.hotel_info = { makkah: { dist: v.mk_dist.trim(), walk: v.mk_walk.trim(), shuttle: v.mk_shuttle === '1', map: /^https:\/\//.test(v.mk_map.trim()) ? v.mk_map.trim() : '' }, madinah: { dist: v.md_dist.trim(), walk: v.md_walk.trim(), shuttle: v.md_shuttle === '1', map: /^https:\/\//.test(v.md_map.trim()) ? v.md_map.trim() : '' } };
      if (!row.price) return { err: 'أدخل سعر نوع غرفة واحد على الأقل.' };
      if (n) { db.campaigns.push(row); setTimeout(function () { location.hash = '#/campaign/' + row.id; }, 0); }
      return n ? 'أُضيفت الرحلة' : 'حُفظت الرحلة';
    });
  }
  // تفاصيل الرحلة (للزوار والمعتمر والمدير)
  function safeUrl(u) { u = String(u || '').trim(); return /^https:\/\//i.test(u) ? u : ''; }
  function lines(t) { return String(t || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function stars(n) { n = +n || 0; return n ? n + ' ' + tr('نجوم', 'stars') : ''; }
  function hotelRow(city, name, nights, info) {
    info = info || {};
    return '<div class="hotel"><div><b>' + (city === 'makkah' ? '' + tr('مكة المكرمة', 'Makkah') : '' + tr('المدينة المنورة', 'Madinah')) + '</b><span>' + h(name || '—') + (nights ? ' · ' + h(nights) + ' ' + tr('ليالٍ', 'nights') : '') + '</span>' +
      '<small>' + [info.dist ? '' + h(info.dist) : '', info.walk ? '' + h(info.walk) + ' ' + tr('مشي', 'walk') : '', info.shuttle ? '' + tr('نقل مجاني إلى الحرم', 'Free shuttle') : ''].filter(Boolean).join(' · ') + '</small></div>' +
      (safeUrl(info.map) ? '<a class="btn sm" href="' + h(safeUrl(info.map)) + '" target="_blank" rel="noopener">' + tr('الخريطة', 'Map') + '</a>' : '') + '</div>';
  }
  function tripDetails(c, opts) {
    opts = opts || {}; var rp = roomPrices(c), hi = c.hotel_info || {}, inc = lines(c.includes), exc = lines(c.excludes), terms = lines(c.terms);
    var out = '<div class="tdet">';
    if (Object.keys(rp).length) out += '<div class="rooms">' + Object.keys(ROOMS).filter(function (k) { return rp[k] != null; }).map(function (k) { return '<div' + (opts.room === k ? ' class="on"' : '') + '><span>' + tr(ROOMS[k], ROOMS_EN[k]) + '</span><b>' + usd(rp[k]) + '</b></div>'; }).join('') + '</div><p class="mu sm">' + tr('السعر للشخص بالدولار', 'Price per person in USD') + (exc.length ? ' · ' + tr('لا يشمل: ', 'Excludes: ') + exc.map(h).join('، ') : '') + '</p>';
    out += '<div class="hotels">' + hotelRow('makkah', c.makkah_hotel, c.makkah_nights, hi.makkah) + hotelRow('madinah', c.madinah_hotel, c.madinah_nights, hi.madinah) + '</div>';
    var facts = [];
    if (c.trip_type === 'flight' && c.flight_info) facts.push(h(c.flight_info));
    if (c.depart_place || c.depart_time) facts.push('' + tr('الانطلاق', 'Departure') + ': ' + h(c.depart_place || '') + (c.depart_time ? ' · ' + h(c.depart_time) : ''));
    if (c.travel_time) facts.push('' + h(c.travel_time));
    if (c.hotel_stars) facts.push(stars(c.hotel_stars) + ' ' + tr('مستوى الفنادق', 'hotels'));
    if (c.deadline) facts.push('' + tr('آخر موعد للحجز', 'Booking deadline') + ': ' + h(dateAr(c.deadline)));
    if (c.deposit_pct) facts.push('' + tr('الدفعة الأولى', 'Deposit') + ' ' + h(c.deposit_pct) + '%');
    if (facts.length) out += '<div class="facts">' + facts.map(function (f) { return '<span>' + f + '</span>'; }).join('') + '</div>';
    if (inc.length) out += '<h4>' + tr('تشمل الرحلة', 'Includes') + '</h4><ul class="incl">' + inc.map(function (x) { return '<li>' + ico('ok', 16) + ' ' + h(x) + '</li>'; }).join('') + '</ul>';
    if (terms.length) out += '<h4>' + tr('شروط الحجز', 'Booking terms') + '</h4><ul class="lst">' + terms.map(function (x) { return '<li>' + h(x) + '</li>'; }).join('') + '</ul>';
    return out + '</div>';
  }
  var ctab = {};
  function vCampaign(id) {
    var c = byId('campaigns', id); if (!c || !canCamp(c)) return emptyBox('الحملة غير موجودة.') ;
    var cp = campPil(c.id), all = campPil(c.id, true), fn = campFin(c.id), mgr = isMgr(), tab = ctab[id] || 'pil';
    var out = back(mgr ? '#/campaigns' : '#/', mgr ? 'الحملات' : 'الرئيسية') + head(c.name, h(dayName(c.start_date)) + ' ' + h(dateAr(c.start_date, true)) + (c.end_date ? ' ← ' + h(dateAr(c.end_date, true)) : '') + ' · ' + hijri(c.start_date),
      (mgr ? btn('تعديل', 'editCamp', { id: c.id }) + btn('حذف', 'delCamp', { id: c.id }, 'danger') : '') + btn('إشعار للحملة', 'broadcast', { id: c.id }, 'pri'));
    out += '<div class="info-grid">' +
      infoBox('الانطلاق', (c.depart_place || '—') + (c.depart_time ? ' · ' + c.depart_time : '')) +
      infoBox('مكة المكرمة', (c.makkah_hotel || '—') + ' · ' + (c.makkah_nights || 0) + ' ليالٍ') +
      infoBox('المدينة المنورة', (c.madinah_hotel || '—') + ' · ' + (c.madinah_nights || 0) + ' ليالٍ') +
      infoBox('المشرف', (c.sup_name || '—') + (c.sup_sy ? ' · ' + c.sup_sy : '') + (c.sup_sa ? ' · ' + c.sup_sa : '')) + '</div>';
    if (mgr) out += '<div class="kpis">' + kpi('المعتمرين', cp.length + (c.seats ? ' / ' + c.seats : ''), '') + kpi('المقبوض', usd(fn.inc), 'hi') + kpi('المصروف', usd(fn.out)) + kpi('الصافي', usd(fn.net), fn.net >= 0 ? 'good' : 'bad') + '</div>';
    var tabs = [['info', 'تفاصيل الرحلة'], ['pil', 'المعتمرون'], ['bus', 'الباصات'], ['prog', 'البرنامج'], ['staff', 'الفريق'], ['map', 'الخريطة']].concat(mgr ? [['fin', 'المالية']] : []);
    out += '<div class="tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" class="' + (t[0] === tab ? 'on' : '') + '" data-act="ctab" data-id="' + h(id) + '" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (tab === 'info') out += card(tripDetails(c));
    else if (tab === 'pil') out += campPilgrims(c, all);
    else if (tab === 'bus') out += campBuses(c, cp);
    else if (tab === 'prog') out += campProgram(c);
    else if (tab === 'staff') out += campStaff(c);
    else if (tab === 'map') out += mapView(cp.map(function (p) { return p.user_id; }), c.id);
    else if (tab === 'fin' && mgr) out += campFinance(c);
    return out;
  }
  function infoBox(t, v) { return '<div class="ibox"><span>' + t + '</span><b>' + h(v) + '</b></div>'; }
  function campPilgrims(c, all) {
    var mgr = isMgr(), q = (pfilter.q || '').trim();
    var list = all.filter(function (p) { return !q || (p.name + ' ' + p.phone + ' ' + p.passport_no).indexOf(q) >= 0; });
    var acts = (mgr ? btn('+ إضافة معتمر', 'addPil', { camp: c.id }, 'pri') + btn('تصدير إكسل', 'exportCamp', { id: c.id }) : '');
    var tbl = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>الاسم</th><th>العمر</th><th>الحالة</th><th>الباص</th><th>المقعد</th><th>الجواز</th>' + (mgr ? '<th>الباقي</th>' : '<th>الهاتف</th>') + '</tr></thead><tbody>' +
      list.map(function (p, i) {
        var po = passOk(p, c), du = mgr ? pilDue(p) : null;
        return '<tr><td>' + (i + 1) + '</td><td><a href="#/pilgrim/' + h(p.id) + '" class="pname">' + pilAvatar(p) + '<span>' + h(p.name) + '<small>' + (p.gender === 'f' ? 'أنثى' : 'ذكر') + '</small></span></a></td><td>' + h(age(p.birth_date)) + '</td><td>' + badge(p.status) + '</td><td>' + h(p.bus || '—') + '</td><td>' + h(p.seat || '—') + '</td><td>' + (po === null ? '<span class="mu">—</span>' : po ? ico('ok', 16) : '<span class="warn" title="الجواز أقل من 6 أشهر"></span>') + (p.docs && p.docs.visa ? ' ' : '') + '</td>' + (mgr ? '<td>' + (du.left ? usd(du.left) : '<span class="ok">مدفوع</span>') + '</td>' : '<td>' + (p.phone ? '<a href="' + tel(p.phone) + '" dir="ltr">' + h(p.phone) + '</a>' : '') + '</td>') + '</tr>';
      }).join('') + '</tbody></table></div>';
    return '<div class="bar"><input class="search" placeholder="بحث بالاسم أو الرقم…" data-chg="pq" value="' + h(q) + '"><div class="acts">' + acts + '</div></div>' + (list.length ? tbl : emptyBox('لا يوجد معتمرون في هذه الحملة بعد.'));
  }
  function busGroups(cp) { var g = {}; cp.forEach(function (p) { var b = p.bus || 'بدون باص'; (g[b] = g[b] || []).push(p); }); return g; }
  var roll = {};
  try { roll = JSON.parse(localStorage.getItem('siraj_roll') || '{}'); } catch (e) { roll = {}; }
  var seatDraft = null;
  function campBuses(c, cp) {
    var g = busGroups(cp), mgr = isMgr(), keys = Object.keys(g).sort(function (a, b) { return a === 'بدون باص' ? 1 : b === 'بدون باص' ? -1 : num(a) - num(b); });
    var out = '<div class="bar"><p class="mu">يُحفظ التفقّد على هذا الجهاز فقط. اضغط على الاسم لتسجيل الحضور.</p><div class="acts">' + (mgr ? btn('قرعة توزيع المقاعد', 'autoBus', { id: c.id }) : '') + btn('إعادة التفقّد', 'rollReset', { id: c.id }) + '</div></div>';
    if (mgr && seatDraft && seatDraft.campaign === c.id) {
      var draft = seatDraft.plan;
      out += '<section class="card"><h2>مسودة توزيع المقاعد</h2><p>' + draft.assignments.length + ' مقعد مخصّص · ' + draft.pending.reduce(function (n, group) { return n + group.length; }, 0) + ' بدون مقعد</p>';
      out += '<div class="rows">' + draft.assignments.map(function (a) {
        return '<div><span>' + h((byId('pilgrims', a.id) || {}).name) + '</span><span>الباص ' + h(a.bus) + ' · المقعد ' + h(a.seat) + '</span></div>';
      }).join('') + draft.pending.map(function (group) { return '<div><span>' + group.map(function (p) { return h(p.name); }).join('، ') + '</span><span>بحاجة إلى مراجعة</span></div>'; }).join('') + '</div>';
      out += '<div class="acts">' + (draft.assignments.length ? btn('اعتماد المسودة', 'approveSeats', { id: c.id }, 'pri') : '') + btn('إلغاء المسودة', 'discardSeats', {}) + '</div></section>';
    }
    if (!cp.length) return out + emptyBox('لا يوجد معتمرون بعد.');
    return out + '<div class="buses">' + keys.map(function (k) {
      var l = g[k].slice().sort(function (a, b) { return num(a.seat) - num(b.seat); }), sup = (l.filter(function (p) { return p.bus_sup; })[0] || {}).bus_sup, drv = (l.filter(function (p) { return p.driver; })[0] || {}).driver;
      var present = l.filter(function (p) { return roll[c.id + ':' + p.id]; }).length;
      return '<section class="bus"><div class="bus-h">' + ico('bus', 26) + '<div><b>' + (k === 'بدون باص' ? k : 'الباص ' + h(k)) + '</b><span>' + (sup ? 'المشرف: ' + h(sup) : '') + (drv ? ' · السائق: ' + h(drv) : '') + '</span></div><span class="rollc ' + (present === l.length ? 'full' : '') + '">' + present + '/' + l.length + '</span>' + (mgr && k !== 'بدون باص' ? btn('تعديل', 'editBus', { id: c.id, bus: k }, 'sm') : '') + '</div>' +
        '<div class="seats">' + l.map(function (p) { var on = roll[c.id + ':' + p.id]; return '<button type="button" class="seat' + (on ? ' on' : '') + '" data-act="roll" data-id="' + h(c.id) + '" data-p="' + h(p.id) + '"><em>' + h(p.seat || '·') + '</em><span>' + h(p.name) + '</span>' + (on ? ico('check', 16) : '') + '</button>'; }).join('') + '</div></section>';
    }).join('') + '</div>';
  }
  function campProgram(c) {
    var mgr = isMgr(), prog = c.program || [];
    var out = '<div class="bar"><p class="mu">برنامج الرحلة يوماً بيوم، ويراه المعتمر مع شرح كل مزار.</p><div class="acts">' + (mgr ? btn('+ يوم', 'addDay', { id: c.id }, 'pri') + (prog.length ? '' : btn('اقتراح برنامج تلقائي', 'autoProg', { id: c.id })) : '') + '</div></div>';
    if (!prog.length) return out + emptyBox('لا يوجد برنامج بعد.');
    return out + '<div class="days">' + prog.map(function (d, i) { return dayCard(c, d, i, mgr); }).join('') + '</div>';
  }
  function dayCard(c, d, i, mgr) {
    var date = c.start_date ? addDays(c.start_date, i) : '';
    var zs = (d.ziyarat || []).map(function (z) { return C.ZIYARAT.filter(function (x) { return x.id === z; })[0]; }).filter(Boolean);
    return '<article class="day"><div class="day-n"><b>' + (i + 1) + '</b><span>' + (date ? h(dayName(date)) + '<br>' + h(dateAr(date)) : 'اليوم') + '</span></div><div class="day-b"><h3>' + h(d.type || '') + (d.title ? ' · ' + h(d.title) : '') + '</h3>' + (d.note ? '<p>' + h(d.note) + '</p>' : '') +
      (zs.length ? '<div class="zlist">' + zs.map(function (z) { return '<details class="z"><summary>' + h(z.name) + CHEV + '</summary><p>' + h(z.d) + '</p></details>'; }).join('') + '</div>' : '') +
      (mgr ? '<div class="acts">' + btn('تعديل', 'editDay', { id: c.id, i: i }, 'sm') + btn('حذف', 'delDay', { id: c.id, i: i }, 'sm') + (i ? btn(ico('up', 16), 'moveDay', { id: c.id, i: i }, 'sm') : '') + '</div>' : '') + '</div></article>';
  }
  function campStaff(c) {
    var mgr = isMgr(), st = c.staff || [];
    var list = st.map(function (s, i) { var u = byId('users', s.user) || { name: s.name || '؟' }; return '<div class="person">' + avatar(u) + '<div><b>' + h(u.name) + '</b><span>' + h(s.role || u.title || '') + '</span></div><div class="acts">' + (u.phone ? link(ico('phone', 18), tel(u.phone), 'icon') + link('واتساب', wa(u.phone), 'sm', true) : '') + (mgr ? btn('إزالة', 'delStaff', { id: c.id, i: i }, 'sm') : '') + '</div></div>'; }).join('');
    return '<div class="bar"><p class="mu">فريق العمل المرافق لهذه الرحلة: مشرفون، مرشد، مصور، إداري.</p><div class="acts">' + (mgr ? btn('+ إضافة من الفريق', 'addStaff', { id: c.id }, 'pri') : '') + '</div></div>' + (list ? '<div class="people">' + list + '</div>' : emptyBox('لم يُضف فريق لهذه الرحلة بعد.'));
  }
  function campFinance(c) {
    var ms = db.moves.filter(function (m) { return m.campaign_id === c.id; }).slice().reverse();
    return '<div class="bar"><p class="mu">كل الحركات المالية لهذه الحملة.</p><div class="acts">' + btn('+ دفعة معتمر', 'addMove', { dir: 'in', camp: c.id }, 'pri') + btn('+ مصروف', 'addMove', { dir: 'out', camp: c.id }) + '</div></div>' + movesTable(ms);
  }

  /* ---------- المعتمرون ---------- */
  var pfilter = { q: '', st: '', camp: '' };
  function vPilgrims() {
    var q = (pfilter.q || '').trim(), list = db.pilgrims.filter(function (p) { return (!pfilter.st || p.status === pfilter.st) && (!pfilter.camp || p.campaign_id === pfilter.camp) && (!q || (p.name + ' ' + p.phone + ' ' + p.passport_no).indexOf(q) >= 0); }).slice().reverse();
    var out = head('المعتمرون', db.pilgrims.length + ' معتمر بكل الحملات', btn('+ إضافة معتمر', 'addPil', {}, 'pri'));
    out += '<div class="chips">' + [['', 'الكل']].concat(Object.keys(STATUS).map(function (k) { return [k, STATUS[k]]; })).map(function (s) { var n = s[0] ? db.pilgrims.filter(function (p) { return p.status === s[0]; }).length : db.pilgrims.length; return '<button type="button" class="chip' + (pfilter.st === s[0] ? ' on' : '') + '" data-act="pst" data-v="' + s[0] + '">' + s[1] + ' <em>' + n + '</em></button>'; }).join('') + '</div>';
    out += '<div class="bar"><input class="search" placeholder="بحث بالاسم أو الرقم أو الجواز…" data-chg="pq" value="' + h(q) + '"><select data-chg="pcamp" aria-label="الحملة"><option value="">كل الحملات</option>' + db.campaigns.map(function (c) { return '<option value="' + h(c.id) + '"' + (pfilter.camp === c.id ? ' selected' : '') + '>' + h(c.name) + '</option>'; }).join('') + '</select></div>';
    if (!list.length) return out + emptyBox('لا توجد نتائج.');
    return out + '<div class="plist">' + list.map(function (p) {
      var c = byId('campaigns', p.campaign_id) || {}, du = pilDue(p);
      return '<a class="prow" href="#/pilgrim/' + h(p.id) + '">' + pilAvatar(p) + '<div><b>' + h(p.name) + (p.gift_from ? ' ' : '') + '</b><span>' + h(c.name || '') + (p.room_type ? ' · ' + ROOMS[p.room_type] : '') + (p.booked_by && p.booked_by !== p.user_id ? ' · حجز ' + h(userName(p.booked_by)) : '') + (age(p.birth_date) !== '' ? ' · ' + age(p.birth_date) + ' سنة' : '') + (p.bus ? ' · باص ' + h(p.bus) + (p.seat ? ' مقعد ' + h(p.seat) : '') : '') + '</span></div><div class="pend">' + badge(p.status) + '<small>' + (du.left ? 'باقي ' + usd(du.left) : 'مدفوع') + (du.pending ? ' · ' : '') + '</small></div></a>';
    }).join('') + '</div>';
  }
  function vPilgrim(id) {
    var p = byId('pilgrims', id); if (!p) return emptyBox('المعتمر غير موجود.');
    var c = byId('campaigns', p.campaign_id) || {}, mgr = isMgr(); if (!mgr && !canCamp(c)) return emptyBox('لا تملك صلاحية.');
    var du = pilDue(p), po = passOk(p, c), u = byId('users', p.user_id);
    var out = back(mgr ? '#/pilgrims' : '#/campaign/' + c.id, mgr ? 'المعتمرون' : c.name || 'الحملة');
    out += '<div class="phead">' + pilAvatar(p, true) + '<div><h1>' + h(p.name) + '</h1><p>' + badge(p.status) + ' · ' + h(c.name || '') + ' · <bdi dir="ltr" class="mu">' + reqNo(p) + '</bdi></p><p class="mu">' + (p.gender === 'f' ? 'أنثى' : 'ذكر') + (age(p.birth_date) !== '' ? ' · ' + age(p.birth_date) + ' سنة' : '') + (p.phone ? ' · <a dir="ltr" href="' + tel(p.phone) + '">' + h(p.phone) + '</a>' : '') + '</p></div></div>';
    if (mgr) {
      var steps = { request: btn('قبول الطلب', 'pilStatus', { id: p.id, st: 'approved' }, 'pri'), approved: btn('رفع التأشيرة', 'visaUp', { id: p.id }, 'pri'), visa: btn('مسافر', 'pilStatus', { id: p.id, st: 'travel' }, 'pri'), travel: btn('أتمّ العمرة', 'pilStatus', { id: p.id, st: 'done' }, 'pri') };
      out += '<div class="acts wrap">' + (steps[p.status] || '') + btn('تعديل البيانات', 'editPil', { id: p.id }) + btn('تسجيل دفعة', 'addMove', { dir: 'in', camp: p.campaign_id, pil: p.id }) + (p.user_id ? btn('إرسال إشعار', 'pilNotify', { id: p.id }) + btn('كلمة سر جديدة', 'setPass', { user: p.user_id }) : btn('إنشاء دخول للمعتمر', 'pilLogin', { id: p.id })) + (p.phone ? link('واتساب', wa(p.phone, 'السلام عليكم ' + sir(p) + '، معك إدارة حملة السراج المنير.'), '', true) : '') + (p.status === 'done' ? btn('الشهادة', 'certFor', { id: p.id }) : '') + (p.status !== 'cancelled' ? btn('إلغاء', 'pilStatus', { id: p.id, st: 'cancelled' }, 'danger') : btn('حذف نهائي', 'delPil', { id: p.id }, 'danger')) + '</div>';
    }
    out += '<div class="tiles">';
    out += tile('البيانات', '', rows([
      ['رقم الجواز', h(p.passport_no || '—')], ['انتهاء الجواز', p.passport_exp ? h(p.passport_exp) + (po === false ? ' <span class="warn">أقل من 6 أشهر من السفر</span>' : ' ✓') : '—'],
      ['تاريخ الميلاد', h(p.birth_date || '—')], ['الجنسية', h(p.nationality || '—')], ['زمرة الدم', h(p.blood || '—')], ['ملاحظات صحية', h(p.health || '—')],
      ['المحرم', p.mahram_id ? h((byId('pilgrims', p.mahram_id) || {}).name || '') : '—'], ['نوع الغرفة', h(ROOMS[p.room_type] || '—')], ['الكفيل', h((p.guarantor_name || '—') + (p.guarantor_phone ? ' · ' + p.guarantor_phone : ''))]].concat(p.booked_by && p.booked_by !== p.user_id ? [['حجز عن طريق', h(userName(p.booked_by) || '') + (p.gift_from ? ' إهداء' : '')]] : []).concat(mgr ? [['ملاحظات داخلية', h(p.notes || '—')], ['حساب الدخول', u ? 'مفعّل · ' + h(u.login_phone || u.phone || '') : 'لا يوجد حساب']] : [])), true);
    out += tile('الباص والسكن', '', rows([['الباص', h(p.bus || '—')], ['المقعد', h(p.seat || '—')], ['مشرف الباص', h(p.bus_sup || '—')], ['السائق', h(p.driver || '—')], ['الغرفة', h(p.room || '—')]]), true);
    out += tile('الوثائق', '', docsGrid(p, mgr), true);
    if (mgr) {
      var ms = db.moves.filter(function (m) { return m.pilgrim_id === p.id; }).slice().reverse();
      out += tile('الحساب', usd(du.paid) + ' من ' + usd(du.price), '<div class="kpis sm">' + kpi('السعر', usd(du.price)) + kpi('المدفوع', usd(du.paid), 'hi') + kpi('الباقي', usd(du.left), du.left ? 'bad' : 'good') + '</div>' + movesTable(ms), true);
    }
    var loc = db.locations.filter(function (l) { return l.user_id === p.user_id; })[0];
    if (loc) out += tile('آخر موقع', ago(loc.at), '<p>' + link('فتح على الخريطة', 'https://maps.google.com/?q=' + loc.lat + ',' + loc.lng, 'pri', true) + '</p><p class="mu">الدقة ' + Math.round(loc.acc || 0) + ' م · ' + h(new Date(loc.at).toLocaleString('ar-SY-u-nu-latn')) + '</p>', true);
    out += '</div>';
    return out;
  }
  function docsGrid(p, canAll) {
    var mine = canDoc(p) && !isMgr();
    return '<div class="docs">' + Object.keys(DOC_KINDS).map(function (k) {
      var v = p.docs && p.docs[k], can = canAll || (mine && k !== 'visa');
      return '<div class="doc' + (v ? ' has' : '') + '"><span>' + DOC_KINDS[k] + (k === 'idcard' ? ' <small>(اختياري)</small>' : '') + '</span>' +
        (v ? '<button type="button" class="thumb" data-act="viewDoc" data-id="' + h(p.id) + '" data-k="' + k + '"><img ' + docAttr(v) + ' alt="' + h(DOC_KINDS[k]) + '"></button>' : '<div class="ph">' + (k === 'visa' ? 'بانتظار الإصدار' : 'لم تُرفع') + '</div>') +
        (can ? '<label class="btn sm">' + (v ? 'تغيير' : 'رفع') + '<input type="file" accept="image/*" hidden data-chg="doc" data-id="' + h(p.id) + '" data-k="' + k + '"></label>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function pilForm(p, campId) {
    var n = !p; p = p || { campaign_id: campId || (db.campaigns[0] || {}).id, gender: 'm', status: 'approved' };
    var camps = db.campaigns.map(function (c) { return [c.id, c.name]; });
    if (!camps.length) { toast('أضف حملة أولاً'); return; }
    var same = db.pilgrims.filter(function (x) { return x.campaign_id === p.campaign_id && x.id !== p.id && x.gender === 'm'; });
    openForm(n ? 'معتمر جديد' : 'تعديل بيانات المعتمر', [
      { k: 'name', label: 'الاسم الثلاثي', value: p.name, req: true, wide: true, max: 120 },
      { k: 'campaign_id', label: 'الحملة', type: 'select', options: camps, value: p.campaign_id },
      { k: 'status', label: 'الحالة', type: 'select', options: Object.keys(STATUS).map(function (k) { return [k, STATUS[k]]; }), value: p.status },
      { k: 'gender', label: 'الجنس', type: 'select', options: [['m', 'ذكر'], ['f', 'أنثى']], value: p.gender },
      { k: 'birth_date', label: 'تاريخ الميلاد', type: 'date', value: p.birth_date },
      { k: 'phone', label: 'الموبايل', type: 'tel', value: p.phone, max: 30 },
      { k: 'nationality', label: 'الجنسية', value: p.nationality || 'سوري', max: 40 },
      { k: 'passport_no', label: 'رقم الجواز', value: p.passport_no, max: 30 },
      { k: 'passport_exp', label: 'انتهاء الجواز', type: 'date', value: p.passport_exp },
      { k: 'bus', label: 'رقم الباص', value: p.bus, max: 20 },
      { k: 'seat', label: 'رقم المقعد', value: p.seat, max: 20 },
      { k: 'bus_sup', label: 'مشرف الباص', value: p.bus_sup, max: 120, list: db.users.filter(function (u) { return u.role === 'staff'; }).map(function (u) { return u.name; }) },
      { k: 'driver', label: 'السائق', value: p.driver, max: 120 },
      { k: 'room', label: 'رقم الغرفة', value: p.room, max: 40 },
      { k: 'room_type', label: 'نوع الغرفة', type: 'select', options: [['', '—']].concat(Object.keys(ROOMS).map(function (k) { return [k, ROOMS[k]]; })), value: p.room_type || '' },
      { k: 'price', label: 'سعر خاص ($) — الحقل الفارغ = سعر الغرفة', type: 'number', value: p.price },
      { k: 'guarantor_name', label: 'اسم الكفيل (مقيم بالشام)', value: p.guarantor_name, max: 120 },
      { k: 'guarantor_phone', label: 'رقم الكفيل', type: 'tel', value: p.guarantor_phone, max: 30 },
      { k: 'blood', label: 'زمرة الدم', type: 'select', options: [['', '—'], ['A+', 'A+'], ['A-', 'A-'], ['B+', 'B+'], ['B-', 'B-'], ['AB+', 'AB+'], ['AB-', 'AB-'], ['O+', 'O+'], ['O-', 'O-']], value: p.blood || '' },
      { k: 'mahram_id', label: 'المحرم (للمعتمرة)', type: 'select', options: [['', '—']].concat(same.map(function (x) { return [x.id, x.name]; })), value: p.mahram_id || '' },
      { k: 'health', label: 'ملاحظات صحية (أمراض مزمنة، أدوية)', type: 'area', value: p.health, wide: true, max: 600 },
      { k: 'notes', label: 'ملاحظات داخلية', type: 'area', value: p.notes, wide: true, max: 2000 }
    ], function (v) {
      var row = n ? { id: uid(), docs: {}, user_id: '' } : p, was = p.status;
      ['name', 'campaign_id', 'status', 'gender', 'birth_date', 'phone', 'nationality', 'passport_no', 'passport_exp', 'bus', 'seat', 'bus_sup', 'driver', 'room', 'blood', 'mahram_id', 'health', 'notes', 'room_type', 'guarantor_name', 'guarantor_phone'].forEach(function (k) { row[k] = String(v[k] || '').trim(); });
      row.price = v.price === '' ? '' : num(v.price);
      if (row.status === 'done' && !row.done_at) row.done_at = today();
      if (n) db.pilgrims.push(row);
      if (!n && was !== row.status) statusNotify(row, was);
      return n ? 'أُضيف المعتمر' : 'حُفظت البيانات';
    });
  }
  function statusNotify(p, was) {
    if (!p.user_id) return;
    var c = byId('campaigns', p.campaign_id) || {}, msg = null;
    if (p.status === 'approved') msg = { title: 'تم قبول طلب عمرتك', body: 'أهلاً ' + sir(p) + '، طلبك في رحلة ' + (c.name || '') + ' مقبول. أكمل الدفع ورفع الوثائق من التطبيق.' };
    if (p.status === 'visa') msg = visaMsg(p, c);
    if (p.status === 'done') msg = { title: 'تقبّل الله عمرتك', body: 'مبارك ' + sir(p) + '، شهادة إتمام العمرة جاهزة في التطبيق.' };
    if (msg) notify([Object.assign({ to: [p.user_id], tag: 'st-' + p.id, url: './' }, msg)]);
  }
  function visaMsg(p, c) { return { title: 'تم إصدار التأشيرة', body: 'يسّر الله لك عمرتك وجعلها مقبولة. موعد الانطلاق: ' + (c.start_date ? dayName(c.start_date) + ' ' + dateAr(c.start_date) : '') + (c.depart_time ? ' الساعة ' + c.depart_time : '') + (c.depart_place ? ' من ' + c.depart_place : '') }; }

  /* ---------- المالية ---------- */
  function movesTable(ms) {
    if (!ms.length) return '<p class="empty">لا توجد حركات بعد.</p>';
    return '<div class="moves">' + ms.map(function (m) {
      var p = byId('pilgrims', m.pilgrim_id), c = byId('campaigns', m.campaign_id);
      return '<div class="mv ' + (m.dir === 'in' ? 'in' : 'out') + (m.is_void ? ' void' : '') + (m.status === 'pending' ? ' pend' : '') + '"><div class="mv-a"><b dir="ltr">' + (m.dir === 'in' ? '+' : '−') + usd(num(m.usd)) + '</b>' + (m.cur !== 'USD' ? '<small>' + money(num(m.amount), m.cur) + '</small>' : '') + '</div><div class="mv-b"><span>' + h(m.cat) + (p ? ' · ' + h(p.name) : '') + '</span><small>' + h(m.date) + ' · ' + h(METHODS[m.method] || '') + (c && !p ? ' · ' + h(c.name) : '') + (m.note ? ' · ' + h(m.note) : '') + '</small></div><div class="mv-c">' +
        (m.status === 'pending' && !m.is_void ? '<span class="badge st-request">بانتظار التأكيد</span>' : m.status === 'rejected' ? '<span class="badge st-cancelled">مرفوضة</span>' : m.is_void ? '<span class="badge st-cancelled">ملغاة</span>' : '') +
        (m.receipt && isMgr() ? btn('الإيصال', 'viewReceipt', { id: m.id }, 'sm') : '') +
        (isMgr() ? (m.status === 'pending' && !m.is_void ? btn('تأكيد', 'confirmMove', { id: m.id }, 'sm pri') + btn('رفض', 'rejectMove', { id: m.id }, 'sm') : '') + (!m.is_void && m.status !== 'pending' ? btn('إلغاء', 'voidMove', { id: m.id }, 'sm') : m.is_void ? btn('حذف نهائي', 'delMove', { id: m.id }, 'sm') : '') : '') + '</div></div>';
    }).join('') + '</div>';
  }
  function vFinance() {
    var f = campFin(), pend = pendingMoves(), ms = db.moves.slice().reverse();
    var out = head('المالية', 'العرض بالدولار · الإدخال بالدولار أو الريال أو الليرة', btn('+ دفعة', 'addMove', { dir: 'in' }, 'pri') + btn('+ مصروف', 'addMove', { dir: 'out' }));
    out += '<div class="kpis">' + kpi('الدخل', usd(f.inc), 'hi') + kpi('المصروف', usd(f.out)) + kpi('الصافي', usd(f.net), f.net >= 0 ? 'good' : 'bad') + kpi('بانتظار التأكيد', usd(sum(pend, function (m) { return num(m.usd); })), pend.length ? 'warn' : '', pend.length + ' دفعة') + '</div>';
    out += '<div class="bar"><div class="pill"><label for="ratesyp">سعر الدولار بالليرة</label><input id="ratesyp" inputmode="decimal" data-chg="ratesyp" value="' + h(db.settings.rate_syp || '') + '" placeholder="مثلاً 11000"></div><span class="mu">الريال ثابت: 1$ = 3.75 ر.س</span></div>';
    if (pend.length) out += card('<h2>دفعات بانتظار التأكيد</h2>' + movesTable(pend.slice().reverse()), 'warnbox');
    out += '<div class="tiles">' + db.campaigns.map(function (c) { var fn = campFin(c.id); return tile(c.name, usd(fn.net) + ' صافي', rows([['الدخل', usd(fn.inc)], ['المصروف', usd(fn.out)], ['باقي على المعتمرين', usd(sum(campPil(c.id), function (p) { return pilDue(p).left; }))]])); }).join('') + '</div>';
    return out + '<h2 class="sec">كل الحركات</h2>' + movesTable(ms);
  }
  function moveForm(d) {
    var dir = d.dir === 'out' ? 'out' : 'in', camps = [['', 'عام (بدون حملة)']].concat(db.campaigns.map(function (c) { return [c.id, c.name]; }));
    var pils = [['', '—']].concat(db.pilgrims.filter(function (p) { return !d.camp || p.campaign_id === d.camp; }).map(function (p) { return [p.id, p.name]; }));
    openForm(dir === 'in' ? 'تسجيل دفعة' : 'تسجيل مصروف', [
      { k: 'date', label: 'التاريخ', type: 'date', value: today(), req: true },
      { k: 'cat', label: 'البند', type: 'select', options: (dir === 'in' ? CATS_IN : CATS_OUT).map(function (x) { return [x, x]; }), value: d.pil ? 'دفعة معتمر' : '' },
      { k: 'amount', label: 'المبلغ', type: 'number', req: true },
      { k: 'cur', label: 'العملة', type: 'select', options: [['USD', 'دولار $'], ['SAR', 'ريال سعودي'], ['SYP', 'ليرة سورية']], value: 'USD' },
      { k: 'method', label: 'طريقة الدفع', type: 'select', options: Object.keys(METHODS).map(function (k) { return [k, METHODS[k]]; }), value: 'cash' },
      { k: 'campaign_id', label: 'الحملة', type: 'select', options: camps, value: d.camp || '' }
    ].concat(dir === 'in' ? [{ k: 'pilgrim_id', label: 'المعتمر', type: 'select', options: pils, value: d.pil || '' }] : []).concat([{ k: 'note', label: 'ملاحظة', wide: true, max: 500 }]), function (v) {
      var a = num(v.amount); if (a <= 0) return { err: 'أدخل مبلغاً صحيحاً.' };
      if (v.cur === 'SYP' && !sypRate()) return { err: 'حدّد سعر الدولار بالليرة من صفحة المالية أولاً.' };
      var p = byId('pilgrims', v.pilgrim_id);
      var m = { id: uid(), date: v.date, dir: dir, cat: v.cat, amount: a, cur: v.cur, rate: v.cur === 'USD' ? 1 : v.cur === 'SAR' ? C.SAR_PER_USD : sypRate(), usd: Math.round(toUsd(a, v.cur) * 100) / 100, method: v.method, campaign_id: p ? p.campaign_id : v.campaign_id, pilgrim_id: v.pilgrim_id || '', receipt: '', status: 'confirmed', note: v.note.trim(), is_void: false, created_by: me().id };
      db.moves.push(m);
      if (p && p.user_id && dir === 'in') notify([{ to: [p.user_id], title: 'وصلتنا دفعتك', body: usd(m.usd) + ' · ' + (METHODS[m.method] || '') + '. جزاك الله خيراً', tag: 'pay-' + m.id, url: './#/pay' }]);
      return 'حُفظت الحركة';
    });
  }

  /* ---------- الرسائل ---------- */
  function senderName(m) { var u = byId('users', m.from_id); if (u) return u.name; var p = db.pilgrims.filter(function (x) { return x.user_id === m.from_id; })[0]; return p ? p.name : 'معتمر'; }
  function vMessages() {
    var vis = db.messages.filter(function (m) { return isMgr() || canCamp(byId('campaigns', m.campaign_id)) || m.from_id === me().id || m.to_id === me().id; });
    var qs = vis.filter(function (m) { return m.kind === 'question' || m.kind === 'sos'; }).slice().reverse();
    var bc = vis.filter(function (m) { return m.kind === 'broadcast'; }).slice().reverse().slice(0, 30);
    var out = head('الرسائل', 'أسئلة المعتمرين ونداءات الطوارئ والإعلانات', btn('إشعار جديد', 'broadcast', {}, 'pri'));
    out += '<h2 class="sec">الأسئلة والنداءات</h2>' + (qs.length ? '<div class="msgs">' + qs.map(function (m) {
      var reps = db.messages.filter(function (r) { return r.reply_to === m.id; }), c = byId('campaigns', m.campaign_id), p = db.pilgrims.filter(function (x) { return x.user_id === m.from_id && (!m.campaign_id || x.campaign_id === m.campaign_id); })[0];
      return '<article class="msg ' + (m.kind === 'sos' ? 'sos' : '') + (reps.length ? ' done' : '') + '"><div class="msg-h"><b>' + (m.kind === 'sos' ? 'نداء طوارئ · ' : '') + h(senderName(m)) + '</b><small>' + h(c ? c.name : '') + ' · ' + ago(m._at) + '</small></div><p>' + h(m.body) + '</p>' +
        (m.lat ? '<p>' + link('موقعه على الخريطة', 'https://maps.google.com/?q=' + m.lat + ',' + m.lng, 'sm pri', true) + '</p>' : '') +
        reps.map(function (r) { return '<div class="reply"><b>' + h(senderName(r)) + ':</b> ' + h(r.body) + '</div>'; }).join('') +
        '<div class="acts">' + btn('ردّ', 'reply', { id: m.id }, 'sm pri') + (isMgr() ? btn('حذف', 'delMsg', { id: m.id }, 'sm danger') : '') + (p ? link('الملف', '#/pilgrim/' + p.id, 'sm') : '') + (p && p.phone ? link(ico('phone', 16), tel(p.phone), 'sm icon') + link('واتساب', wa(p.phone), 'sm', true) : '') + '</div></article>';
    }).join('') + '</div>' : '<p class="empty">لا توجد أسئلة.</p>');
    out += '<h2 class="sec">الإعلانات المرسلة</h2>' + (bc.length ? '<div class="msgs">' + bc.map(function (m) { var c = byId('campaigns', m.campaign_id); return '<article class="msg bc"><div class="msg-h"><b>' + h(c ? c.name : 'الكل') + '</b><small>' + ago(m._at) + '</small></div><p>' + h(m.body) + '</p></article>'; }).join('') + '</div>' : '<p class="empty">لا توجد إعلانات.</p>');
    return out;
  }
  var PRESETS_BC = ['التجمّع في الاستقبال الساعة 9:30 بإذن الله', 'التجمّع عند باب الملك فهد بعد صلاة العصر', 'تتحرك الحافلة بعد ربع ساعة، يرجى الاستعداد', 'العمرة الجماعية بعد صلاة العشاء، والتجمّع في الاستقبال', 'غداً مزارات المدينة، والتجمّع الساعة 8 صباحاً', 'تذكير: لا تنسوا جوازاتكم وبطاقة الفندق معكم'];
  function broadcastForm(cid) {
    var camps = isMgr() ? db.campaigns : staffCamps();
    if (!camps.length) { toast('لا توجد حملات'); return; }
    openForm('إشعار لجميع معتمري الحملة', [
      { k: 'campaign_id', label: 'الحملة', type: 'select', options: camps.map(function (c) { return [c.id, c.name]; }), value: cid || (nextCamp() || camps[0]).id },
      { k: 'preset', label: 'رسالة جاهزة', type: 'select', options: [['', '— اختر أو اكتب تحت —']].concat(PRESETS_BC.map(function (x) { return [x, x]; })) },
      { k: 'body', label: 'نص الإشعار', type: 'area', wide: true, max: 300, ph: 'مثلاً: التجمّع في الاستقبال الساعة 9:30' }
    ], function (v) {
      var body = (v.body || '').trim() || v.preset; if (!body) return { err: 'اكتب نص الإشعار.' };
      var c = byId('campaigns', v.campaign_id);
      db.messages.push({ id: uid(), campaign_id: v.campaign_id, from_id: me().id, to_id: '', kind: 'broadcast', body: body, reply_to: '', lat: '', lng: '', _at: new Date().toISOString() });
      notify([{ to: { campaign: v.campaign_id }, title: '' + (c ? c.name : 'السراج المنير'), body: body, tag: 'bc-' + Date.now(), url: './' }]);
      return 'أُرسل الإشعار إلى الحملة';
    }, null, 'إرسال');
    var sel = document.getElementById('m_preset'); if (sel) sel.addEventListener('change', function () { var b = document.getElementById('m_body'); if (b && sel.value) b.value = sel.value; });
  }
  var PRESETS_ONE = [['تم قبول طلب عمرتك', 'أكمل الدفع ورفع الوثائق من التطبيق.'], ['تذكير بالدفعة', 'يتبقى عليك مبلغ من قيمة الرحلة، ويمكنك الدفع من التطبيق عبر شام كاش.'], ['ارفع جوازك', 'يرجى رفع صورة واضحة لجوازك وصورتك الشخصية من التطبيق.'], ['أين أنت؟', 'يرجى التواصل مع المشرف أو مشاركة موقعك من التطبيق.'], ['تقبّل الله', 'تقبّل الله طاعتكم، ولا تنسونا من صالح دعائكم.']];
  function pilNotifyForm(p) {
    openForm('إشعار لـ ' + p.name, [
      { k: 'preset', label: 'رسالة جاهزة', type: 'select', options: [['', '— رسالة أخرى —']].concat(PRESETS_ONE.map(function (x, i) { return [String(i), x[0]]; })) },
      { k: 'title', label: 'العنوان', value: '', max: 120, wide: true }, { k: 'body', label: 'النص', type: 'area', wide: true, max: 300 }
    ], function (v) {
      var t = v.title.trim(), b = v.body.trim(); if (!t && !b) return { err: 'اكتب الإشعار.' };
      db.messages.push({ id: uid(), campaign_id: p.campaign_id, from_id: me().id, to_id: p.user_id, kind: 'direct', body: (t ? t + ' · ' : '') + b, reply_to: '', lat: '', lng: '', _at: new Date().toISOString() });
      notify([{ to: [p.user_id], title: t || 'السراج المنير', body: b, tag: 'dm-' + Date.now(), url: './' }]);
      return 'أُرسل الإشعار';
    }, null, 'إرسال');
    var sel = document.getElementById('m_preset'); if (sel) sel.addEventListener('change', function () { var x = PRESETS_ONE[+sel.value]; if (x && sel.value !== '') { document.getElementById('m_title').value = x[0]; document.getElementById('m_body').value = x[1]; } });
  }

  /* ---------- الخريطة (OpenStreetMap بدون مكتبات) ---------- */
  var mapz = {};
  function lon2x(lng, z) { return (lng + 180) / 360 * Math.pow(2, z) * 256; }
  function lat2y(lat, z) { var r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z) * 256; }
  function mapView(userIds, key) {
    var pts = db.locations.filter(function (l) { return userIds.indexOf(l.user_id) >= 0; }).map(function (l) {
      var p = db.pilgrims.filter(function (x) { return x.user_id === l.user_id; })[0], u = byId('users', l.user_id);
      return { lat: +l.lat, lng: +l.lng, at: l.at, name: p ? p.name : u ? u.name : '؟', pid: p && p.id, old: Date.now() - new Date(l.at).getTime() > 3600e3 };
    });
    var bar = '<div class="bar"><p class="mu">مواقع المعتمرين الذين فعّلوا «شارك موقعي»، ويتحدّث الموقع أثناء فتح التطبيق لديهم.</p><div class="acts">' + btn('تحديث', 'locRefresh', {}, 'sm') + '</div></div>';
    if (!pts.length) return bar + emptyBox('لم يشارك أحد موقعه بعد.');
    var W = 720, H = 420, lats = pts.map(function (p) { return p.lat; }), lngs = pts.map(function (p) { return p.lng; });
    var z = mapz[key]; if (!z) { z = 17; while (z > 3 && (lon2x(Math.max.apply(null, lngs), z) - lon2x(Math.min.apply(null, lngs), z) > W - 80 || lat2y(Math.min.apply(null, lats), z) - lat2y(Math.max.apply(null, lats), z) > H - 80)) z--; }
    var cx = (lon2x(Math.max.apply(null, lngs), z) + lon2x(Math.min.apply(null, lngs), z)) / 2, cy = (lat2y(Math.min.apply(null, lats), z) + lat2y(Math.max.apply(null, lats), z)) / 2;
    var x0 = cx - W / 2, y0 = cy - H / 2, tiles = '', n = Math.pow(2, z);
    for (var tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + W) / 256); tx++) for (var ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + H) / 256); ty++) {
      if (ty < 0 || ty >= n) continue; var wx = ((tx % n) + n) % n;
      tiles += '<img class="tile-i" alt="" src="https://tile.openstreetmap.org/' + z + '/' + wx + '/' + ty + '.png" style="left:' + ((tx * 256 - x0) / W * 100) + '%;top:' + ((ty * 256 - y0) / H * 100) + '%;width:' + (256 / W * 100) + '%;height:' + (256 / H * 100) + '%">';
    }
    var marks = pts.map(function (p, i) { var x = (lon2x(p.lng, z) - x0) / W * 100, y = (lat2y(p.lat, z) - y0) / H * 100; return '<a class="mk' + (p.old ? ' old' : '') + '" style="left:' + x + '%;top:' + y + '%" href="https://maps.google.com/?q=' + p.lat + ',' + p.lng + '" target="_blank" rel="noopener" title="' + h(p.name) + '"><span>' + h(p.name.charAt(0)) + '</span></a>'; }).join('');
    var list = rows(pts.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }).map(function (p) { return [(p.pid ? '<a href="#/pilgrim/' + h(p.pid) + '">' + h(p.name) + '</a>' : h(p.name)), ago(p.at) + ' · ' + '<a href="https://maps.google.com/?q=' + p.lat + ',' + p.lng + '" target="_blank" rel="noopener">فتح </a>']; }));
    return bar + '<div class="map"><div class="map-in">' + tiles + marks + '</div><div class="map-z">' + btn('+', 'mapZoom', { k: key, z: z + 1 }, 'icon') + btn('−', 'mapZoom', { k: key, z: z - 1 }, 'icon') + '</div><small class="osm">© OpenStreetMap</small></div>' + list;
  }
  function vMap() {
    var ids = (isMgr() ? db.pilgrims : db.pilgrims.filter(function (p) { return canCamp(byId('campaigns', p.campaign_id)); })).map(function (p) { return p.user_id; }).filter(Boolean);
    return head('الخريطة', 'مواقع المعتمرين الآن') + mapView(ids, 'all');
  }

  /* ---------- الفريق ---------- */
  function vTeam() {
    var staff = db.users.filter(function (u) { return u.role === 'staff' || u.role === 'manager'; });
    return head('الفريق', 'المشرفين والمرشدين والمصورين والإداريين', btn('+ عضو جديد', 'addStaffUser', {}, 'pri')) + '<div class="people">' + staff.map(function (u) {
      var camps = db.campaigns.filter(function (c) { return (c.staff || []).some(function (s) { return s.user === u.id; }); });
      return '<div class="person' + (u.active === false ? ' off' : '') + '">' + avatar(u) + '<div><b>' + h(u.name) + '</b><span>' + h(u.role === 'manager' ? 'المدير' : u.title || 'الفريق') + (camps.length ? ' · ' + camps.map(function (c) { return h(c.name); }).join('، ') : '') + '</span><small dir="ltr">' + h(u.phone || '') + '</small></div><div class="acts">' + (u.phone ? link(ico('phone', 18), tel(u.phone), 'icon') : '') + (u.role !== 'manager' ? btn('تعديل', 'editStaffUser', { id: u.id }, 'sm') + btn('كلمة سر', 'setPass', { user: u.id }, 'sm') + btn(u.active === false ? 'تفعيل' : 'إيقاف', 'toggleUser', { id: u.id }, 'sm') : '') + '</div></div>';
    }).join('') + '</div>';
  }
  function staffUserForm(u) {
    var n = !u; u = u || { gender: 'm', title: 'شيخ العمرة' };
    openForm(n ? 'عضو فريق جديد' : 'تعديل العضو', [
      { k: 'name', label: 'الاسم', value: u.name, req: true, max: 120 }, { k: 'title', label: 'الصفة', type: 'select', value: u.title, options: STAFF_TITLES.concat(u.title && !STAFF_TITLES.includes(u.title) ? [u.title] : []).map(function (title) { return [title, title]; }) },
      { k: 'phone', label: 'رقم الموبايل (للدخول)', type: 'tel', value: u.phone, req: true, max: 30 }, { k: 'gender', label: 'الجنس', type: 'select', options: [['m', 'ذكر'], ['f', 'أنثى']], value: u.gender }
    ].concat(n ? [{ k: 'pass', label: 'كلمة السر (8 أحرف على الأقل)', type: 'password', req: true, max: 72 }] : []), function (v) {
      var ph = normPhone(v.phone); if (ph.length < 8) return { err: 'رقم غير صحيح.' };
      if (db.users.some(function (x) { return x.id !== u.id && normPhone(x.login_phone || x.phone) === ph; })) return { err: 'هذا الرقم مسجّل لحساب آخر.' };
      if (!n) { u.name = v.name.trim(); u.title = v.title.trim(); u.phone = v.phone.trim(); u.gender = v.gender; return 'حُفظ'; }
      if ((v.pass || '').length < 8) return { err: 'كلمة السر 8 أحرف على الأقل.' };
      return makeAccount(v.phone, v.pass).then(function (id) { db.users.push(Object.assign({ id: id, name: v.name.trim(), title: v.title.trim(), phone: v.phone.trim(), login_phone: ph, gender: v.gender, role: 'staff', active: true, prefs: { prayer: { on: true, city: 'makkah', before: 15 } } }, accLocal)); accLocal = {}; return 'أُضيف العضو. أعطه رقمه وكلمة السر لتسجيل الدخول'; });
    });
  }
  var accLocal = {};
  function makeAccount(phone, pass) {
    if (ONLINE) return SRV.createUser(phone, pass);
    var salt = uid(); return hash(pass, salt).then(function (hh) { accLocal = { pass: hh, salt: salt }; return uid(); });
  }

  /* ---------- الإعدادات ---------- */
  function vSettings() {
    var s = shamcash(), o = office();
    return head('الإعدادات', 'شام كاش وأرقام المكتب') + '<div class="tiles">' +
      tile('شام كاش', h(s.name), '<div class="shamset"><img src="' + h(s.qr) + '" alt="QR شام كاش" class="qrprev"><form class="form" data-form="shamcash"><div class="fld wide"><label for="sc_name">اسم الحساب</label><input id="sc_name" name="name" value="' + h(s.name) + '" maxlength="80"></div><div class="fld wide"><label for="sc_code">رمز الحساب</label><input id="sc_code" name="code" dir="ltr" value="' + h(s.code) + '" maxlength="80"></div><div class="fld wide"><label class="btn">تغيير صورة الـQR<input type="file" accept="image/*" hidden data-chg="shamqr"></label></div><div class="fld wide"><button class="btn pri" type="submit">حفظ</button></div></form></div>', true) +
      tile('أرقام المكتب', 'للواتساب والاتصال', '<form class="form" data-form="office"><div class="fld wide"><label for="of_sy">رقم المكتب السوري (واتساب)</label><input id="of_sy" name="phone_sy" type="tel" dir="ltr" value="' + h(o.phone_sy || '') + '" maxlength="30"></div><div class="fld wide"><label for="of_sa">رقم سعودي (اختياري)</label><input id="of_sa" name="phone_sa" type="tel" dir="ltr" value="' + h(o.phone_sa || '') + '" maxlength="30"></div><div class="fld wide"><button class="btn pri" type="submit">حفظ</button></div></form>', true) +
      tile('سعر الصرف', 'للإدخال بالليرة', '<div class="pill"><label for="ratesyp2">1$ =</label><input id="ratesyp2" inputmode="decimal" data-chg="ratesyp" value="' + h(db.settings.rate_syp || '') + '"><span>ل.س</span></div><p class="mu">الريال السعودي ثابت: 1$ = 3.75 ر.س</p>', true) +
      (!ONLINE ? tile('نسخة احتياطية', 'الوضع المحلي', '<div class="acts">' + btn('تنزيل نسخة', 'backup') + '<label class="btn">استرجاع نسخة<input type="file" accept=".json" hidden data-chg="restore"></label></div>', false) : '') + '</div>';
  }

  /* ---------- ملفي والمزيد ---------- */
  function vProfile() {
    var u = me(), pr = (u.prefs && u.prefs.prayer) || {};
    var st = pushStatus(), ptxt = { granted: 'مفعّلة على هذا الجهاز', 'default': 'غير مفعّلة', denied: 'محظورة من المتصفح. افتح إعدادات الموقع واسمح بالإشعارات.', ios: 'على الآيفون: أضف التطبيق للشاشة الرئيسية وافتحه من الأيقونة.', unsupported: 'المتصفح لا يدعم الإشعارات. استخدم متصفح كروم.', off: 'تعمل الإشعارات بعد ربط التطبيق بالخادم.' }[st];
    return head('ملفي', '') + '<div class="phead">' + avatar(u, true) + '<div><h1>' + h(u.name) + '</h1><p class="mu" dir="ltr">' + h(u.phone || u.login_phone || '') + '</p><label class="btn sm">تغيير الصورة<input type="file" accept="image/*" hidden data-chg="avatar"></label></div></div><div class="tiles">' +
      tile('بياناتي', '', '<form class="form" data-form="profile"><div class="fld wide"><label for="p_name">الاسم</label><input id="p_name" name="name" value="' + h(u.name) + '" maxlength="120" required></div><div class="fld"><label for="p_phone">رقم التواصل</label><input id="p_phone" name="phone" type="tel" dir="ltr" value="' + h(u.phone || '') + '" maxlength="30"></div><div class="fld"><label for="p_gender">الجنس</label><select id="p_gender" name="gender"><option value="m"' + (u.gender !== 'f' ? ' selected' : '') + '>ذكر</option><option value="f"' + (u.gender === 'f' ? ' selected' : '') + '>أنثى</option></select></div><div class="fld wide"><p class="err" id="perr"></p><button class="btn pri" type="submit">حفظ</button></div></form>', true) +
      tile('الإشعارات', ptxt, '<p class="mu">خبر التأشيرة، مواعيد التجمّع، ردود الأسئلة، وتذكير الصلاة.</p><div class="acts">' + (st === 'default' ? btn('تفعيل الإشعارات', 'pushOn', {}, 'pri') : '') + (st === 'granted' ? btn('إشعار تجريبي', 'pushTest', {}, 'pri') : '') + '</div>', true) +
      tile('تذكير الصلاة', pr.on ? 'مفعّل' : 'متوقف', prayerPrefs(pr), true) +
      tile('كلمة السر', '', '<form class="form" data-form="chpass"><div class="fld wide"><label for="cp1">كلمة السر الجديدة</label><input id="cp1" name="p1" type="password" minlength="8" required autocomplete="new-password"></div><div class="fld wide"><label for="cp2">أعد كتابتها</label><input id="cp2" name="p2" type="password" minlength="8" required autocomplete="new-password"></div><div class="fld wide"><p class="err" id="cperr"></p><button class="btn pri" type="submit">تغيير</button></div></form>') +
      '</div><div class="acts center">' + btn('تسجيل الخروج', 'logout', {}, 'danger') + '</div>';
  }
  function prayerPrefs(pr) {
    return '<form class="form" data-form="prayerprefs"><div class="fld wide"><label class="chk"><input type="checkbox" name="on"' + (pr.on ? ' checked' : '') + '><span>ذكّرني قبل الأذان</span></label></div>' +
      '<div class="fld"><label for="pp_city">المدينة</label><select id="pp_city" name="city"><option value="makkah"' + (pr.city !== 'madinah' ? ' selected' : '') + '>مكة المكرمة</option><option value="madinah"' + (pr.city === 'madinah' ? ' selected' : '') + '>المدينة المنورة</option></select></div>' +
      '<div class="fld"><label for="pp_before">قبل الأذان بـ</label><select id="pp_before" name="before">' + [[0, 'وقت الأذان'], [10, '10 دقائق'], [15, 'ربع ساعة'], [20, 'ثلث ساعة'], [30, 'نصف ساعة']].map(function (x) { return '<option value="' + x[0] + '"' + (+(pr.before == null ? 15 : pr.before) === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="fld wide"><small class="mu">يصل التذكير كإشعار حتى لو كان التطبيق مغلقاً (يجب تفعيل الإشعارات).</small><button class="btn pri" type="submit">حفظ</button></div></form>';
  }
  function vMore() {
    var items = navDef().reduce(function (a, g) { return a.concat(g[1]); }, []).filter(function (i) { return !tabsDef().some(function (t) { return t[1] === i[1]; }); });
    items.push(['ملفي', '#/profile', 'user']);
    return head('المزيد', '') + '<div class="gridnav">' + items.map(function (i) { return '<a href="' + i[1] + '">' + ico(i[2], 28) + '<span>' + i[0] + '</span></a>'; }).join('') + '</div><div class="acts center">' + btn(document.body.classList.contains('t-dark') ? 'الثيم الفاتح' : 'الثيم الغامق', 'theme') + btn('تسجيل الخروج', 'logout', {}, 'danger') + '</div>';
  }
  function vGuide() {
    return head('الدليل والأدوات', 'كل ما تحتاجه في العمرة، ويعمل دون إنترنت') + '<div class="gridnav big">' + GUIDE.map(function (g) { return '<a href="' + g[1] + '"' + (g[1].indexOf('#') ? ' download' : '') + '>' + ico(g[2], 30) + '<span>' + g[0] + '</span><small>' + g[3] + '</small></a>'; }).join('') + '</div>';
  }

  /* ---------- واجهة الفريق ---------- */
  function vStaffHome() {
    var u = me(), camps = staffCamps(), d = longDates();
    var out = '<div class="hero"><div><span class="mu">' + greet() + '</span><h1>' + h(u.name) + '</h1><p>' + h(d[0]) + ' · ' + h(d[1]) + '</p></div><div class="hero-clock"><span class="clock" id="clock2"></span>' + nextPrayerMini() + '</div></div>';
    var qs = openQs().filter(function (m) { return canCamp(byId('campaigns', m.campaign_id)); });
    if (qs.length) out += '<div class="alerts"><a class="alert ' + (qs.some(function (m) { return m.kind === 'sos'; }) ? 'sos' : '') + '" href="#/messages"><b>' + qs.length + '</b> سؤال أو نداء من المعتمرين</a></div>';
    if (!camps.length) return pushBanner() + out + emptyBox('لا توجد حملات مسندة إليك بعد، وسيضيفك المدير إلى الرحلة.');
    return pushBanner() + out + '<div class="cgrid">' + camps.map(function (c) { var cp = campPil(c.id); return '<a class="camp" href="#/campaign/' + h(c.id) + '"><div class="camp-h"><b>' + h(c.name) + '</b></div><span>' + h(dateAr(c.start_date, true)) + '</span><span>' + h(c.makkah_hotel || '—') + '</span><span>' + h(c.madinah_hotel || '—') + '</span><div class="minis"><span>' + cp.length + ' معتمر</span><span>' + Object.keys(busGroups(cp)).length + ' باص</span></div></a>'; }).join('') + '</div>';
  }

  /* ---------- بوابة المعتمر ---------- */
  function vPortal() {
    var u = me(), p = curPil(), d = longDates();
    var out = '<div class="hero pil"><div><span>' + greet() + '</span><h1>' + h(sir(Object.assign({}, u, { name: u.name }))) + '</h1><p>' + h(d[0]) + '<br>' + h(d[1]) + '</p></div><img src="' + MARK_W + '" alt="" class="hero-mark"></div>';
    if (!p) {
      return pushBanner() + out + card('<h2>لا توجد لديك رحلة حالية</h2><p class="mu">اختر رحلة واحجز لنفسك أو لعائلتك، أو أهدِ عمرة لمن تحب.</p><div class="acts">' + link('احجز رحلة', '#/book', 'pri big') + btn('أهدِ عمرة', 'giftStart', {}, 'gold big') + '</div>');
    }
    var c = byId('campaigns', p.campaign_id) || {}, du = pilDue(p), dd = c.start_date ? daysTo(c.start_date) : null, si = STATUS_ORDER.indexOf(p.status);
    out += famChips();
    if (p.user_id !== u.id) out += '<div class="alert gold">' + (p.gift_from ? 'حجزت هذه العمرة إهداءً لـ <b>' + h(p.name) + '</b>. ' + link('صمّم بطاقة الإهداء', '#/gift', 'sm gold') : 'هذا ملف <b>' + h(p.name) + '</b> من عائلتك، وتتابع وثائقه ودفعاته من هنا.') + '</div>';
    out += '<div class="stepper">' + ['الطلب', 'القبول', 'التأشيرة', 'السفر', 'تمت العمرة'].map(function (t, i) { return '<div class="' + (i < si ? 'ok' : i === si ? 'cur' : '') + '"><i>' + (i < si ? ico('ok', 14) : i + 1) + '</i><span>' + t + '</span></div>'; }).join('') + '</div>';
    var miss = ['photo', 'passport'].filter(function (k) { return !(p.docs && p.docs[k]); });
    var alerts = [];
    if (p.status === 'cancelled') alerts.push('<div class="alert sos">هذا الطلب ملغى. تواصل مع الإدارة.</div>');
    if (miss.length) alerts.push('<a class="alert" href="#/docs">ارفع ' + miss.map(function (k) { return DOC_KINDS[k]; }).join(' و') + ' لاستكمال إجراءات التأشيرة</a>');
    if (du.depLeft > 0 && p.status !== 'cancelled') alerts.push('<a class="alert gold" href="#/pay">الدفعة الأولى لتثبيت الحجز: ' + usd(du.depLeft) + ' · ادفع الآن</a>');
    else if (du.left > 0 && p.status !== 'cancelled') alerts.push('<a class="alert gold" href="#/pay">يتبقى عليك ' + usd(du.left) + (du.pending ? ' (لديك دفعة ' + usd(du.pending) + ' بانتظار التأكيد)' : '') + ' · ادفع الآن</a>');
    if (p.passport_exp && passOk(p, c) === false) alerts.push('<div class="alert sos">ينتهي جوازك قبل مرور 6 أشهر على السفر، ويجب تجديده.</div>');
    if (p.docs && p.docs.visa) alerts.push('<button type="button" class="alert good" data-act="viewDoc" data-id="' + h(p.id) + '" data-k="visa">صدرت تأشيرتك · اضغط لعرضها</button>');
    if (alerts.length) out += '<div class="alerts">' + alerts.join('') + '</div>';
    var last = db.messages.filter(function (m) { return (m.kind === 'broadcast' && m.campaign_id === c.id) || (m.kind === 'direct' && m.to_id === u.id); }).slice(-3).reverse();
    if (last.length) out += '<div class="news">' + last.map(function (m) { return '<div class="nitem"><span>' + h(m.body) + '</span><small>' + ago(m._at) + '</small></div>'; }).join('') + '</div>';
    out += card('<div class="nc"><div><span class="mu">رحلتك</span><h2>' + h(c.name || '') + '</h2><p>' + (c.start_date ? h(dayName(c.start_date)) + ' ' + h(dateAr(c.start_date, true)) + ' · ' + h(hijri(c.start_date)) : '') + '</p><p>' + (c.depart_place ? 'الانطلاق من ' + h(c.depart_place) : '') + (c.depart_time ? ' · الساعة ' + h(c.depart_time) : '') + '</p></div>' + (dd != null && dd >= 0 ? '<div class="count"><b>' + (dd === 0 ? 'اليوم' : dd) + '</b><span>' + (dd === 0 ? 'الانطلاق' : 'يوم للانطلاق') + '</span></div>' : '') + '</div>' +
      '<div class="hotels">' + hotelRow('makkah', c.makkah_hotel, c.makkah_nights, (c.hotel_info || {}).makkah) + hotelRow('madinah', c.madinah_hotel, c.madinah_nights, (c.hotel_info || {}).madinah) + '</div><div class="info-grid">' + (p.room_type ? infoBox('الغرفة', ROOMS[p.room_type]) : '') + infoBox('الباص والمقعد', (p.bus ? 'باص ' + p.bus : '—') + (p.seat ? ' · مقعد ' + p.seat : '')) + infoBox('مشرف الباص', (p.bus_sup || c.sup_name || '—') + (p.driver ? ' · السائق ' + p.driver : '')) + (p.room ? infoBox('رقم الغرفة', p.room) : '') + '</div><details class="tmore"><summary>تفاصيل الرحلة والشروط' + CHEV + '</summary>' + tripDetails(c, { room: p.room_type }) + '</details>' + supContact(c), 'feature');
    out += '<div class="tools">' + [['المطوّف', '#/mutawwif', 'kaaba'], ['مواقيت الصلاة', '#/prayer', 'clock'], ['حسابي والدفع', '#/pay', 'money'], ['برنامج الرحلة', '#/program', 'list'], ['وثائقي', '#/docs', 'card'], ['اسأل الشيخ', '#/ask', 'chat'], ['أحكام العمرة', '#/ahkam', 'book'], ['بطاقة المعتمر', '#/card', 'user'], ['الطوارئ', '#/emergency', 'sos'], ['الطقس والخرائط', '#/weather', 'map'], ['احجز رحلة', '#/book', 'kaaba']].concat(famPilgrims().some(function (x) { return x.user_id !== u.id; }) ? [['بطاقة الإهداء', '#/gift', 'star']] : []).concat(p.status === 'done' ? [['شهادة العمرة', '#/cert', 'cert'], ['تمّت عمرتي', '#/done', 'star']] : []).map(function (t) { return '<a href="' + t[1] + '">' + ico(t[2], 28) + '<span>' + t[0] + '</span></a>'; }).join('') + '</div>';
    out += card('<div class="locbox"><div><h2>شارك موقعي</h2><p class="mu">' + (locWatch ? 'موقعك يُشارك مع الإدارة والمشرف' : 'إذا ضللت الطريق أو أردت أن يجدك المشرف') + '</p></div>' + btn(locWatch ? 'إيقاف المشاركة' : 'شارك موقعي', 'locToggle', {}, locWatch ? '' : 'pri') + '</div>' + '<button type="button" class="sosbtn" data-act="sos">' + ico('sos', 22) + ' نداء طوارئ للمشرف</button>');
    return pushBanner() + out;
  }
  function supContact(c) {
    var o = office(), sy = c.sup_sy || o.phone_sy, sa = c.sup_sa || o.phone_sa;
    if (!sy && !sa) return '';
    return '<div class="contact">' + (sy ? link('واتساب المشرف', wa(sy, 'السلام عليكم، معك ' + me().name + ' من رحلة ' + (c.name || '') + '.'), 'pri', true) : '') + (sa ? link('اتصال (رقم سعودي)', tel(sa, '966'), 'gold') : '') + '</div>';
  }
  function vDocs() {
    var p = curPil(); if (!p) return head('وثائقي', '') + emptyBox('لا توجد لديك رحلة حالية.');
    return back('#/', 'الرئيسية') + head('وثائقي', 'صور واضحة بإضاءة جيدة، وصفحة بيانات الجواز كاملة') + famChips() + '<p class="mu">ملف: <b>' + h(p.name) + '</b></p>' + docsGrid(p, false) + card('<h2>بياناتي للرحلة</h2><form class="form" data-form="mypil"><div class="fld"><label for="mp_pno">رقم الجواز</label><input id="mp_pno" name="passport_no" value="' + h(p.passport_no || '') + '" maxlength="30"></div><div class="fld"><label for="mp_pexp">انتهاء الجواز</label><input id="mp_pexp" name="passport_exp" type="date" value="' + h(p.passport_exp || '') + '"></div><div class="fld"><label for="mp_birth">تاريخ الميلاد</label><input id="mp_birth" name="birth_date" type="date" value="' + h(p.birth_date || '') + '"></div><div class="fld"><label for="mp_blood">زمرة الدم</label><input id="mp_blood" name="blood" value="' + h(p.blood || '') + '" maxlength="6"></div><div class="fld"><label for="mp_gn">اسم الكفيل (مقيم بالشام)</label><input id="mp_gn" name="guarantor_name" value="' + h(p.guarantor_name || '') + '" maxlength="120"></div><div class="fld"><label for="mp_gp">رقم الكفيل</label><input id="mp_gp" name="guarantor_phone" type="tel" dir="ltr" value="' + h(p.guarantor_phone || '') + '" maxlength="30"></div><div class="fld wide"><label for="mp_health">أمراض مزمنة أو أدوية (تساعد المشرف في الطوارئ)</label><textarea id="mp_health" name="health" maxlength="600">' + h(p.health || '') + '</textarea></div><div class="fld wide"><button class="btn pri" type="submit">حفظ</button></div></form>');
  }

  // الدفع
  var pay = { method: '', amount: '', cur: 'USD' };
  function vPay() {
    var p = curPil(); if (!p) return head('حسابي', '') + emptyBox('لا توجد لديك رحلة حالية.');
    var du = pilDue(p), ms = db.moves.filter(function (m) { return m.pilgrim_id === p.id; }).slice().reverse();
    var fam = famPilgrims().filter(function (x) { return x.status !== 'cancelled' && x.campaign_id === p.campaign_id; }), famLeft = sum(fam, function (x) { return pilDue(x).left; });
    var out = back('#/', 'الرئيسية') + head('حسابي والدفع', fam.length > 1 ? 'ملف: ' + h(p.name) : '') + famChips() + (fam.length > 1 ? '<div class="alert">مجموع المتبقي على العائلة في هذه الرحلة: <b>' + usd(famLeft) + '</b> · يُدفع لكل شخص من ملفه.</div>' : '') + '<div class="kpis">' + kpi('قيمة الرحلة', usd(du.price)) + kpi('المدفوع', usd(du.paid), 'hi') + kpi('الباقي', usd(du.left), du.left ? 'bad' : 'good') + (du.pending ? kpi('بانتظار التأكيد', usd(du.pending), 'warn') : '') + '</div>' + (du.depLeft > 0 ? '<div class="alert gold">الدفعة الأولى لتثبيت الحجز: <b>' + usd(du.deposit) + '</b> (المتبقي منها ' + usd(du.depLeft) + ')</div>' : '');
    if (du.left > 0) {
      out += card('<h2>ادفع الآن</h2><p class="mu">اختر طريقة الدفع:</p><div class="methods">' +
        '<button type="button" class="method sham' + (pay.method === 'shamcash' ? ' on' : '') + '" data-act="payMethod" data-m="shamcash"><img src="icons/shamcash-logo.png" alt=""><span>شام كاش</span></button>' +
        '<button type="button" class="method' + (pay.method === 'cash' ? ' on' : '') + '" data-act="payMethod" data-m="cash">' + ico('money', 34) + '<span>نقداً بالمكتب</span></button>' +
        '<button type="button" class="method' + (pay.method === 'transfer' ? ' on' : '') + '" data-act="payMethod" data-m="transfer">' + ico('phone', 34) + '<span>حوالة</span></button></div>' +
        (pay.method ? '<form class="form" data-form="pay"><div class="fld"><label for="py_amt">المبلغ</label><input id="py_amt" name="amount" inputmode="decimal" required value="' + h(pay.amount || Math.round(du.depLeft || du.left)) + '"></div><div class="fld"><label for="py_cur">العملة</label><select id="py_cur" name="cur"><option value="USD">دولار $</option><option value="SYP"' + (pay.cur === 'SYP' ? ' selected' : '') + '>ليرة سورية</option></select></div>' +
          (pay.method === 'shamcash' ? '<div class="fld wide">' + btn('عرض QR شام كاش', 'shamOpen', {}, 'gold') + '</div>' : '') +
          '<div class="fld wide"><label for="py_rc">الإيصال أو الإشعار (صورة أو PDF حتى 5 ميغابايت)' + (pay.method === 'cash' ? ' (اختياري)' : '') + '</label><input id="py_rc" name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"' + (pay.method === 'cash' ? '' : ' required') + '></div><div class="fld wide"><label for="py_note">ملاحظة</label><input id="py_note" name="note" maxlength="300" placeholder="مثلاً: رقم العملية"></div><div class="fld wide"><p class="err" id="payerr"></p><button class="btn pri big" type="submit">' + (pay.method === 'cash' ? 'إبلاغ الإدارة بالدفع نقداً' : 'تم الدفع · أرسل للتأكيد') + '</button></div></form>' : ''));
    } else out += card('<p class="okline">' + ico('ok', 18) + ' الرحلة مدفوعة بالكامل. جزاك الله خيراً</p>');
    return out + '<h2 class="sec">دفعاتي</h2>' + movesTable(ms);
  }
  function shamSheet() {
    var s = shamcash();
    openSheet('<div class="sham-anim"><div class="sham-glow"></div><img class="sham-logo" src="icons/shamcash-logo.png" alt="شام كاش"><h2>ادفع عبر شام كاش</h2><div class="qrcard"><img src="' + h(s.qr) + '" alt="QR شام كاش"></div><p class="sham-name">' + h(s.name) + '</p><button type="button" class="sham-code" data-act="copyCode" data-v="' + h(s.code) + '" dir="ltr">' + h(s.code) + ' <small>نسخ</small></button>' +
      '<ol class="steps"><li>افتح تطبيق شام كاش واختر «مسح QR» أو الصق الرمز.</li><li>ادفع المبلغ واحفظ صورة الإشعار.</li><li>ارجع إلى هنا وارفع صورة الإيصال واضغط «تم الدفع».</li></ol><div class="acts">' + link('حفظ صورة الـQR', s.qr, '', false).replace('<a ', '<a download="shamcash-qr.jpg" ') + btn('تمام', 'close', {}, 'pri') + '</div></div>', 'sham');
  }

  function vProgram() {
    var p = curPil(), c = p && byId('campaigns', p.campaign_id);
    if (!c && (isMgr() || isStaff())) return head('البرنامج', '') + emptyBox('افتح الحملة لعرض برنامجها.');
    if (!c) return head('برنامج الرحلة', '') + emptyBox('لا توجد لديك رحلة حالية.');
    return back('#/', 'الرئيسية') + head('برنامج الرحلة', h(c.name)) + ((c.program || []).length ? '<div class="days">' + c.program.map(function (d, i) { return dayCard(c, d, i, false); }).join('') + '</div>' : emptyBox('سيُنشر البرنامج قريباً بإذن الله.')) + card('<p><b>الروضة الشريفة:</b> الدخول بموعد مسبق من تطبيق «نسك»، أو يتولى المشرف الحجز للمجموعة.</p>', 'tip');
  }
  function vAsk() {
    var u = me(), mine = db.messages.filter(function (m) { return m.from_id === u.id && (m.kind === 'question' || m.kind === 'sos'); }).slice().reverse();
    return back('#/', 'الرئيسية') + head('اسأل الشيخ', 'سؤال شرعي، أو عن مكان المجموعة، أو أي استفسار') + card('<form class="form" data-form="ask"><div class="fld wide"><label for="as_b">سؤالك</label><textarea id="as_b" name="body" required maxlength="1000" placeholder="مثلاً: ما حكم من نسي شوطاً من الطواف؟"></textarea></div><div class="fld wide"><button class="btn pri big" type="submit">إرسال</button></div></form>') +
      '<h2 class="sec">أسئلتي</h2>' + (mine.length ? '<div class="msgs">' + mine.map(function (m) { var reps = db.messages.filter(function (r) { return r.reply_to === m.id; }); return '<article class="msg' + (reps.length ? ' done' : '') + '"><div class="msg-h"><b>' + (m.kind === 'sos' ? 'نداء' : 'سؤالي') + '</b><small>' + ago(m._at) + '</small></div><p>' + h(m.body) + '</p>' + (reps.length ? reps.map(function (r) { return '<div class="reply"><b>' + h(senderName(r)) + ':</b> ' + h(r.body) + '</div>'; }).join('') : '<p class="mu sm">بانتظار الرد…</p>') + '</article>'; }).join('') + '</div>' : '<p class="empty">لم ترسل أي سؤال بعد.</p>');
  }
  function vCard() {
    var p = curPil(), u = me(), c = p && byId('campaigns', p.campaign_id) || {};
    if (!p) return head('بطاقة المعتمر', '') + emptyBox('لا توجد لديك رحلة حالية.');
    return back('#/', 'الرئيسية') + '<div class="idcard"><div class="idc-h"><img src="' + LOGO_W + '" alt=""><span>بطاقة معتمر</span></div><div class="idc-b">' + pilAvatar(p, true) + '<h2>' + h(p.name) + '</h2><p>' + h(c.name || '') + '</p>' +
      rows([['فندق مكة', h(c.makkah_hotel || '—')], ['فندق المدينة', h(c.madinah_hotel || '—')], ['الباص · المقعد', h((p.bus || '—') + ' · ' + (p.seat || '—'))], ['الغرفة', h(p.room || '—')], ['المشرف', h(p.bus_sup || c.sup_name || '—')], ['رقم سعودي', '<a dir="ltr" href="' + tel(c.sup_sa, '966') + '">' + h(c.sup_sa || '—') + '</a>'], ['رقم سوري', '<span dir="ltr">' + h(c.sup_sy || '—') + '</span>']].concat(p.blood ? [['زمرة الدم', h(p.blood)]] : [])) +
      '<p class="idc-f">إذا لقيت صاحب هذه البطاقة تائهاً، اتصل بالمشرف. جزاك الله خيراً<br><span dir="ltr">If found, please call the supervisor</span></p></div></div>';
  }

  /* ---------- المطوّف ---------- */
  function mutKey() { return 'siraj_mut_' + ((me() && me().id) || 'x'); }
  function mutGet() { try { return Object.assign({ step: 0, tawaf: 0, sai: 0, done: false }, JSON.parse(localStorage.getItem(mutKey()) || '{}')); } catch (e) { return { step: 0, tawaf: 0, sai: 0, done: false }; } }
  function mutSet(s) { try { localStorage.setItem(mutKey(), JSON.stringify(s)); } catch (e) {} }
  function duaList(arr) { return '<div class="duas">' + arr.map(function (d) { return '<figure class="dua"><blockquote>' + h(d[0]) + '</blockquote><figcaption>' + h(d[1]) + '</figcaption></figure>'; }).join('') + '</div>'; }
  function ring(n, total, label, sub) {
    var r = 88, L = 2 * Math.PI * r, off = L * (1 - n / total);
    var dots = ''; for (var i = 0; i < total; i++) { var a = (-90 + i * 360 / total) * Math.PI / 180; dots += '<circle cx="' + (110 + 88 * Math.cos(a)).toFixed(1) + '" cy="' + (110 + 88 * Math.sin(a)).toFixed(1) + '" r="7" class="' + (i < n ? 'd on' : 'd') + '"/>'; }
    return '<div class="ring"><svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="' + r + '" class="rbg"/><circle cx="110" cy="110" r="' + r + '" class="rfg" stroke-dasharray="' + L.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 110 110)"/>' + dots + '</svg><div class="ring-t"><b>' + label + '</b><span>' + sub + '</span></div></div>';
  }
  function vMutawwif() {
    var s = mutGet(), st = C.STEPS[s.step] || C.STEPS[0];
    var out = '<div class="mut-top">' + head('المطوّف', 'خطوة بخطوة، ويحفظ العدّاد موضعك', btn('بداية جديدة', 'mutReset', {}, 'sm')) + '<div class="msteps">' + C.STEPS.map(function (x, i) { return '<button type="button" class="' + (i < s.step || s.done ? 'ok' : i === s.step ? 'cur' : '') + '" data-act="mutGo" data-i="' + i + '"><i>' + (i < s.step || s.done ? ico('ok', 14) : i + 1) + '</i><span>' + h(x.title.split(' · ')[0]) + '</span></button>'; }).join('') + '</div></div>';
    if (s.done) return out + '<div class="mut-done"><img src="' + MARK_G + '" alt="" class="lg-c"><h2>تقبّل الله عمرتك </h2><p>اللَّهُمَّ اجْعَلْهَا عُمْرَةً مَبْرُورَةً، وَسَعْيًا مَشْكُورًا، وَذَنْبًا مَغْفُورًا</p><div class="acts center">' + (isPil() && myPilgrim() ? btn('شهادة إتمام العمرة', 'certMine', {}, 'gold big') + btn('بطاقة «تمّت عمرتي»', 'doneMine', {}, 'pri big') : '') + btn('عمرة جديدة', 'mutReset', {}, 'big') + '</div></div>';
    if (st.counter) {
      var isT = st.counter === 'tawaf', n = isT ? s.tawaf : s.sai, set = isT ? C.TAWAF : C.SAI, cur = set[Math.min(n, 6)];
      var sub = isT ? (n >= 7 ? 'اكتمل الطواف' : 'الشوط الحالي') : (n >= 7 ? 'اكتمل السعي' : 'من ' + cur.from + ' إلى ' + cur.to);
      out += '<div class="counter">' + ring(n, 7, n >= 7 ? ico('ok', 40) : (n + 1), sub) + '<p class="hint">' + (n < 7 ? '' + h(cur.start) : '') + '</p>' +
        (n < 7 ? '<button type="button" class="big-tap" data-act="mutNext">أنهيت الشوط ' + (n + 1) + '</button>' : '<button type="button" class="big-tap done" data-act="mutStep">التالي: ' + h(C.STEPS[s.step + 1].title) + ' ←</button>') +
        (n > 0 ? btn(ico('undo', 16) + ' تراجع شوط', 'mutPrev', {}, 'sm') : '') + '</div>';
      if (n < 7) out += '<h2 class="sec">أدعية الشوط ' + (n + 1) + '</h2><p class="mu sm">' + h(C.DUA_NOTE) + '</p>' + duaList(cur.duas);
      return out;
    }
    out += card('<h2>' + h(st.title) + '</h2><p>' + h(st.text) + '</p>' + duaList([st.dua]) + '<div class="acts">' + (s.step < C.STEPS.length - 1 ? btn('تمّت · التالي ←', 'mutStep', {}, 'pri big') : btn('أتممت عمرتي', 'mutFinish', {}, 'gold big')) + '</div>', 'mstep');
    return out;
  }

  /* ---------- مواقيت الصلاة ---------- */
  var pcity = '';
  function vPrayer() {
    var u = me(), pr = (u.prefs && u.prefs.prayer) || {}, city = pcity || pr.city || 'makkah', n = PR.ksaNow(), t = PR.times(n.day, city), nx = PR.next(city);
    var out = head('مواقيت الصلاة', 'بتوقيت السعودية · طريقة أم القرى') + '<div class="seg">' + ['makkah', 'madinah'].map(function (k) { return '<button type="button" class="' + (k === city ? 'on' : '') + '" data-act="pcity" data-c="' + k + '">' + PR.CITIES[k].name + '</button>'; }).join('') + '</div>';
    out += '<div class="nextp"><span>الصلاة القادمة</span><b>' + h(nx.name) + '</b><em>' + PR.hm12(nx.at) + '</em><small id="pcount" data-left="' + nx.left + '">بعد ' + (nx.left >= 60 ? Math.floor(nx.left / 60) + ' ساعة و' : '') + (nx.left % 60) + ' دقيقة</small></div>';
    out += '<div class="ptimes">' + PR.ORDER.map(function (k) { return '<div class="' + (k === nx.key ? 'on' : '') + (k === 'sunrise' ? ' sr' : '') + '"><span>' + PR.NAMES[k] + '</span><b>' + PR.hm12(t[k]) + '</b></div>'; }).join('') + '</div>';
    out += '<p class="mu sm center">الوقت الآن في السعودية: ' + PR.hm12(n.min) + ' · ' + h(hijri()) + '</p>';
    return out + card('<h2>تذكير قبل الأذان</h2>' + prayerPrefs(pr) + (pushStatus() === 'default' ? '<div class="acts">' + btn('تفعيل الإشعارات', 'pushOn', {}, 'gold') + '</div>' : ''));
  }

  /* ---------- الأحكام والمزارات والتحضير ---------- */
  function vAhkam() { return head('أحكام العمرة', 'باختصار، وعند الشك اسأل المرشد') + C.AHKAM.map(function (s, i) { return tile(s.t, '', '<ul class="lst">' + s.items.map(function (x) { return '<li>' + h(x) + '</li>'; }).join('') + '</ul>', i === 0); }).join('') + card('<p>للخطوات مع الأدعية افتح <a href="#/mutawwif">المطوّف</a>.</p>', 'tip'); }
  function vZiyarat() {
    var p = curPil(), c = p && byId('campaigns', p.campaign_id), mine = {};
    if (c) (c.program || []).forEach(function (d) { (d.ziyarat || []).forEach(function (z) { mine[z] = 1; }); });
    function grp(city) { return C.ZIYARAT.filter(function (z) { return z.city === city; }).map(function (z) { return '<details class="z' + (mine[z.id] ? ' mine' : '') + '"><summary>' + (mine[z.id] ? '' : '') + h(z.name) + CHEV + '</summary><p>' + h(z.d) + '</p></details>'; }).join(''); }
    return head('المزارات', Object.keys(mine).length ? '= ضمن برنامج رحلتك' : 'مزارات مكة والمدينة') + '<h2 class="sec">مكة المكرمة</h2><div class="zlist">' + grp('مكة') + '</div><h2 class="sec">المدينة المنورة</h2><div class="zlist">' + grp('المدينة') + '</div>' + card('<p><b>الروضة الشريفة:</b> احجز موعدك من تطبيق «نسك»، أو يتولى المشرف ذلك للمجموعة.</p>', 'tip');
  }
  var prepDone = {}; try { prepDone = JSON.parse(localStorage.getItem('siraj_prep') || '{}'); } catch (e) { prepDone = {}; }
  function vPrep() {
    var total = 0, done = 0; C.PREP.forEach(function (s, i) { s.items.forEach(function (x, j) { total++; if (prepDone[i + '-' + j]) done++; }); });
    return head('قبل السفر', 'علّم على ما جهّزته · ' + done + ' من ' + total) + '<div class="prog"><i style="width:' + Math.round(done / total * 100) + '%"></i></div>' + C.PREP.map(function (s, i) { return card('<h2>' + h(s.t) + '</h2><div class="checks">' + s.items.map(function (x, j) { var k = i + '-' + j; return '<label class="chk"><input type="checkbox" data-chg="prep" data-k="' + k + '"' + (prepDone[k] ? ' checked' : '') + '><span>' + h(x) + '</span></label>'; }).join('') + '</div>'); }).join('') + '<p class="center">' + link('تنزيل كتيّب المعتمر كامل', 'guide.pdf', 'gold', false).replace('<a ', '<a download ') + '</p>';
  }
  var ex = { v: '100', from: 'USD' };
  function vExchange() {
    var r = sypRate(), v = num(ex.v), u = ex.from === 'USD' ? v : ex.from === 'SAR' ? v / C.SAR_PER_USD : (r ? v / r : 0);
    return head('الصرف', 'سعر الريال مربوط بالدولار') + card('<div class="exch"><input inputmode="decimal" data-chg="exv" value="' + h(ex.v) + '" aria-label="المبلغ"><div class="seg">' + [['USD', 'دولار'], ['SAR', 'ريال'], ['SYP', 'ليرة']].map(function (x) { return '<button type="button" class="' + (ex.from === x[0] ? 'on' : '') + '" data-act="exFrom" data-c="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div><div class="exres">' +
      '<div><span>دولار</span><b dir="ltr">$' + (Math.round(u * 100) / 100).toLocaleString('en-US') + '</b></div><div><span>ريال سعودي</span><b>' + (Math.round(u * C.SAR_PER_USD * 100) / 100).toLocaleString('en-US') + ' ر.س</b></div>' + (r ? '<div><span>ليرة سورية</span><b>' + Math.round(u * r).toLocaleString('en-US') + ' ل.س</b></div>' : '') + '</div>') +
      card('<ul class="lst"><li>كل 1 دولار = 3.75 ريال سعودي تقريباً (السعر ثابت).</li><li>' + (r ? 'سعر الليرة المعتمد بالحملة: 1$ = ' + r.toLocaleString('en-US') + ' ل.س' : 'يحدّد المكتب سعر الليرة.') + '</li><li>صرّف جزءاً قبل السفر، والباقي في محلات الصرافة المرخّصة بمكة والمدينة.</li><li>احتفظ بفئات صغيرة للمشتريات البسيطة.</li></ul>', 'tip');
  }
  function vEmergency() {
    var p = curPil(), c = p && byId('campaigns', p.campaign_id), o = office();
    return head('الطوارئ', 'أرقام مهمة في السعودية') + (c && (c.sup_sa || c.sup_sy) ? card('<h2>مشرف رحلتك</h2><p>' + h(c.sup_name || '') + '</p>' + supContact(c)) : '') +
      '<div class="emerg">' + C.EMERGENCY.map(function (e) { return '<a href="tel:' + e[1] + '"><span>' + h(e[0]) + '</span><b>' + e[1] + '</b></a>'; }).join('') + '</div>' +
      (o.phone_sy ? card('<h2>مكتب السراج المنير</h2><div class="contact">' + link('واتساب المكتب', wa(o.phone_sy), 'pri', true) + (o.phone_sa ? link('رقم سعودي', tel(o.phone_sa, '966'), 'gold') : '') + '</div>') : '') +
      card('<h2>تطبيقات مهمة</h2>' + rows(C.APPS.map(function (a) { return ['<b>' + h(a[0]) + '</b>', h(a[1])]; }))) + card('<p><b>حجز الروضة الشريفة</b> عبر تطبيق «نسك»، أو يتولى المشرف ذلك.</p><p>إذا ضللت الطريق: ابقَ في مكانك، وشارك موقعك من الرئيسية واتصل بالمشرف.</p>', 'tip');
  }
  var tas = { n: 0, goal: 33, word: 'سُبْحَانَ اللَّهِ' };
  function vTasbeeh() {
    var words = ['سُبْحَانَ اللَّهِ', 'الْحَمْدُ لِلَّهِ', 'اللَّهُ أَكْبَرُ', 'لَا إِلَهَ إِلَّا اللَّهُ', 'أَسْتَغْفِرُ اللَّهَ', 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ'];
    return head('المسبحة', '') + '<div class="seg wrap">' + words.map(function (w) { return '<button type="button" class="' + (w === tas.word ? 'on' : '') + '" data-act="tasWord" data-w="' + h(w) + '">' + h(w) + '</button>'; }).join('') + '</div><div class="counter">' + ring(tas.n % tas.goal || (tas.n && tas.n % tas.goal === 0 ? tas.goal : 0), tas.goal, String(tas.n), h(tas.word)) + '<button type="button" class="big-tap" data-act="tasTap">سبّح</button><div class="seg">' + [33, 100].map(function (g) { return '<button type="button" class="' + (tas.goal === g ? 'on' : '') + '" data-act="tasGoal" data-g="' + g + '">' + g + '</button>'; }).join('') + '</div>' + btn('إعادة العدّ', 'tasReset', {}, 'sm') + '</div>';
  }

  /* ---------- شهادة إتمام العمرة ---------- */
  var certificateDedication = new Map();
  function vCert() {
    var p = curPil();
    if (!p || p.status !== 'done') return back('#/', 'الرئيسية') + head('شهادة العمرة', '') + emptyBox('تظهر الشهادة بعد إتمام عمرتك من المطوّف أو اعتمادها من الإدارة.', link('افتح المطوّف', '#/mutawwif', 'pri'));
    return back('#/', 'الرئيسية') + head('شهادة إتمام العمرة', 'مبارك، تقبّل الله منك') + '<form class="form one" data-form="certificate"><div class="fld"><label for="cert-dedication">عمرة عن روح شخص (اختياري)</label><input name="dedication" id="cert-dedication" maxlength="100" value="' + h(certificateDedication.get(p.id) || '') + '"></div><button type="submit" class="btn">حدّث المعاينة</button></form><div class="certwrap"><canvas id="certcv" width="1600" height="1130" data-id="' + h(p.id) + '"></canvas></div><div class="acts center">' + btn('تنزيل الشهادة', 'certDownload', {}, 'gold big') + link('بطاقة «تمّت عمرتي» للمشاركة', '#/done', 'pri big') + '</div>';
  }
  var imgCache = {};
  function loadImg(src) { if (imgCache[src]) return imgCache[src]; imgCache[src] = new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); return imgCache[src]; }
  function drawCert(cv, p) {
    var dedication = certificateDedication.get(p.id);
    var c = byId('campaigns', p.campaign_id) || {}, x = cv.getContext('2d'), W = cv.width, H = cv.height, f = p.gender === 'f';
    var fonts = document.fonts ? Promise.all(['700 40px Cairo', '400 40px Cairo', '300 40px Cairo'].map(function (q) { return document.fonts.load(q).catch(function () {}); })) : Promise.resolve();
    return fonts.then(function () { return loadImg(LOGO_G); }).then(function (logo) {
      x.fillStyle = '#FBF8F0'; x.fillRect(0, 0, W, H);
      var g = x.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.7); g.addColorStop(0, 'rgba(216,165,73,0)'); g.addColorStop(1, 'rgba(216,165,73,.10)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = '#0C4A33'; x.lineWidth = 14; x.strokeRect(40, 40, W - 80, H - 80);
      x.strokeStyle = '#D2A24C'; x.lineWidth = 3; x.strokeRect(66, 66, W - 132, H - 132); x.strokeRect(76, 76, W - 152, H - 152);
      // زخارف الزوايا
      [[76, 76, 1, 1], [W - 76, 76, -1, 1], [76, H - 76, 1, -1], [W - 76, H - 76, -1, -1]].forEach(function (k) { x.save(); x.translate(k[0], k[1]); x.scale(k[2], k[3]); x.fillStyle = '#D2A24C'; x.beginPath(); x.moveTo(0, 0); x.lineTo(90, 0); x.quadraticCurveTo(30, 30, 0, 90); x.closePath(); x.globalAlpha = .35; x.fill(); x.globalAlpha = 1; x.beginPath(); x.arc(22, 22, 8, 0, Math.PI * 2); x.fill(); x.restore(); });
      var lh = 250, lw = logo.width * lh / logo.height; x.drawImage(logo, (W - lw) / 2, 95, lw, lh);
      x.textAlign = 'center'; x.direction = 'rtl'; x.fillStyle = '#0C4A33';
      x.font = '700 76px Cairo, sans-serif'; x.fillText('شهادة إتمام عمرة', W / 2, 440);
      x.fillStyle = '#4B5A53'; x.font = '400 36px Cairo, sans-serif'; x.fillText('تشهد حملة السراج المنير للحج والعمرة بأنّ ' + (f ? 'الحاجّة' : 'الحاج'), W / 2, 520);
      x.fillStyle = '#0B7A4B'; x.font = '700 68px Cairo, sans-serif'; x.fillText(p.name, W / 2, 615);
      x.fillStyle = '#C9963C'; x.fillRect(W / 2 - 220, 640, 440, 4);
      if (dedication) {
        x.fillStyle = '#0C4A33'; x.font = '700 44px Cairo, sans-serif';
        x.fillText('عن روح ' + dedication, W / 2, 765, W - 260);
      }
      x.fillStyle = '#4B5A53'; x.font = '400 36px Cairo, sans-serif'; x.fillText((f ? 'قد أتمّت' : 'قد أتمّ') + ' مناسك العمرة بفضل الله تعالى وتوفيقه', W / 2, 705);
      x.fillText('ضمن رحلة «' + (c.name || 'السراج المنير') + '»', W / 2, 760);
      var d = p.done_at || today(); x.font = '300 32px Cairo, sans-serif'; x.fillText(dateAr(d, true) + '  ·  ' + hijri(d), W / 2, 820);
      x.fillStyle = '#0C4A33'; x.font = '400 40px Cairo, serif'; x.fillText('اللَّهُمَّ اجْعَلْهَا عُمْرَةً مَبْرُورَةً، وَسَعْيًا مَشْكُورًا، وَذَنْبًا مَغْفُورًا', W / 2, 905);
      x.font = '400 28px Cairo, sans-serif'; x.fillStyle = '#6F8178'; x.fillText('إدارة حملة السراج المنير للحج والعمرة', W / 2 + 430, 1010); x.fillText('تقبّل الله منّا ومنكم', W / 2 - 430, 1010);
      x.strokeStyle = '#B9AE90'; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 + 290, 970); x.lineTo(W / 2 + 570, 970); x.stroke();
    });
  }

  /* ---------- الموقع والطوارئ ---------- */
  var locWatch = null, locLast = null;
  function sendLoc(pos) {
    var c = pos.coords, now = Date.now();
    if (locLast && now - locLast.t < 60000 && Math.abs(c.latitude - locLast.lat) < 0.0005 && Math.abs(c.longitude - locLast.lng) < 0.0005) return;
    locLast = { t: now, lat: c.latitude, lng: c.longitude };
    if (ONLINE) SRV.rpc('set_location', { p_lat: c.latitude, p_lng: c.longitude, p_acc: Math.round(c.accuracy || 0) }).catch(function () {});
    else { var u = me(); db.locations = db.locations.filter(function (l) { return l.user_id !== u.id; }); db.locations.push({ user_id: u.id, lat: c.latitude, lng: c.longitude, acc: c.accuracy, _at: new Date().toISOString() }); save(); }
  }
  function locStart(quiet) {
    if (!navigator.geolocation) { toast('الجهاز لا يدعم تحديد الموقع'); return; }
    locWatch = navigator.geolocation.watchPosition(function (pos) { sendLoc(pos); }, function (e) { if (!quiet) toast(e.code === 1 ? 'لم يُسمح بالوصول إلى الموقع. اسمح به من إعدادات المتصفح.' : 'تعذر تحديد الموقع'); locStop(true); render(); }, { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000 });
    try { localStorage.setItem('siraj_loc_on', '1'); } catch (e) {}
  }
  function locStop(keepPref) {
    if (locWatch != null && navigator.geolocation) navigator.geolocation.clearWatch(locWatch);
    locWatch = null; locLast = null;
    if (!keepPref) { try { localStorage.removeItem('siraj_loc_on'); } catch (e) {} if (ONLINE) SRV.rpc('stop_location', {}).catch(function () {}); else { var u = me(); db.locations = db.locations.filter(function (l) { return l.user_id !== u.id; }); save(); } }
  }
  function getPos() { return new Promise(function (res) { if (!navigator.geolocation) return res(null); navigator.geolocation.getCurrentPosition(function (p) { res(p); }, function () { res(null); }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }); }); }

  /* ---------- إكسل ---------- */
  var CRC = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zipStore(files) {
    var enc = new TextEncoder(), parts = [], central = [], off = 0;
    function u16(v) { return [v & 255, (v >> 8) & 255]; } function u32(v) { return [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]; }
    files.forEach(function (f) {
      var name = enc.encode(f[0]), data = enc.encode(f[1]), crc = crc32(data);
      var hd = [].concat([0x50, 0x4b, 3, 4], u16(20), u16(0x800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      parts.push(new Uint8Array(hd), name, data);
      central.push(new Uint8Array([].concat([0x50, 0x4b, 1, 2], u16(20), u16(20), u16(0x800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), name);
      off += hd.length + name.length + data.length;
    });
    var cs = central.reduce(function (a, b) { return a + b.length; }, 0);
    return new Blob(parts.concat(central, [new Uint8Array([].concat([0x50, 0x4b, 5, 6], u16(0), u16(0), u16(files.length), u16(files.length), u32(cs), u32(off), u16(0)))]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function xesc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function xlCol(i) { var s = ''; i++; while (i) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function xlsx(sheetName, rowsArr) {
    var body = rowsArr.map(function (r, ri) { return '<row r="' + (ri + 1) + '">' + r.map(function (v, ci) { return typeof v === 'number' ? '<c r="' + xlCol(ci) + (ri + 1) + '"' + (ri ? '' : ' s="1"') + '><v>' + v + '</v></c>' : '<c r="' + xlCol(ci) + (ri + 1) + '" t="inlineStr"' + (ri ? '' : ' s="1"') + '><is><t>' + xesc(v) + '</t></is></c>'; }).join('') + '</row>'; }).join('');
    var sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="5" customWidth="1"/><col min="2" max="2" width="30" customWidth="1"/><col min="3" max="30" width="15" customWidth="1"/></cols><sheetData>' + body + '</sheetData></worksheet>';
    var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="12"/><name val="Arial"/></font><font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0C4A33"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>';
    return zipStore([
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + xesc(sheetName.slice(0, 30)) + '" sheetId="1" r:id="rId1"/></sheets></workbook>'],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', styles], ['xl/worksheets/sheet1.xml', sheet]
    ]);
  }
  function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }

  /* ---------- الإجراءات ---------- */
  var MGR_ONLY = ['addCamp', 'editCamp', 'addPil', 'editPil', 'pilStatus', 'visaUp', 'delPil', 'pilLogin', 'setPass', 'pilNotify', 'certFor', 'addMove', 'confirmMove', 'rejectMove', 'voidMove', 'delMove', 'viewReceipt', 'openReceipt', 'addDay', 'editDay', 'delDay', 'moveDay', 'autoProg', 'addStaff', 'delStaff', 'autoBus', 'editBus', 'exportCamp', 'addStaffUser', 'editStaffUser', 'toggleUser', 'backup', 'pst', 'addReview', 'delReview', 'addVideo', 'delVideo', 'delCamp', 'delMsg'];
  var TEAM_ONLY = ['broadcast', 'reply', 'ctab', 'roll', 'rollReset', 'mapZoom', 'locRefresh'];
  var acts = {
    close: closeForm,
    theme: function () { var dk = document.body.classList.toggle('t-dark'); document.body.classList.toggle('t-light', !dk); localStorage.setItem(TKEY, dk ? 'dark' : 'light'); render(); },
    logout: function () { certificateDedication.clear(); seatDraft = null; locStop(true); if (ONLINE) { SRV.idle().then(pushOff).then(function () { return SRV.signOut(); }).then(function () { db = blank(); location.hash = '#/'; checkSetup(); }); return; } localStorage.removeItem(SKEY); location.hash = '#/'; render(); },
    retry: function () { boot(); },
    forgotOpen: function () { fstate = { open: true, sent: false, phone: (document.getElementById('l_phone') || {}).value || '', wa: '' }; render(); },
    forgotClose: function () { fstate.open = false; fstate.sent = false; render(); },
    pushOn: function () {
      if (pushStatus() !== 'default') { render(); return; }
      Notification.requestPermission().then(function (p) { if (p !== 'granted') { toast('لم يُسمح بالإشعارات'); render(); return; } return pushSub(true).then(function () { pushSynced = true; toast('فُعّلت الإشعارات'); render(); }); }).catch(function (e) { toast('تعذر تفعيل الإشعارات: ' + (e && e.message || e)); render(); });
    },
    pushLater: function () { try { localStorage.setItem('siraj_push_later', today()); } catch (e) {} render(); },
    pushTest: function () { pushSub(true).then(function () { return SRV.notify([{ to: [me().id], title: 'السلام عليكم ' + sir(me()) + ' ', body: 'الإشعارات تعمل على هذا الجهاز.' }]); }).then(function (r) { toast(r && r.sent ? 'أُرسل إشعار تجريبي' : 'لم يصل: ' + ((r && r.errors && r.errors[0]) || 'تحقق من إعدادات الخادم')); }); },
    // الحملات
    addCamp: function () { campForm(null); },
    editCamp: function (d) { campForm(byId('campaigns', d.id)); },
    ctab: function (d) { ctab[d.id] = d.t; render(); },
    broadcast: function (d) { broadcastForm(d.id); },
    addDay: function (d) { dayForm(byId('campaigns', d.id), -1); },
    editDay: function (d) { dayForm(byId('campaigns', d.id), +d.i); },
    delDay: function (d) { if (!confirm('حذف هذا اليوم؟')) return; var c = byId('campaigns', d.id); c.program = c.program.filter(function (x, i) { return i !== +d.i; }); save(); render(); },
    moveDay: function (d) { var c = byId('campaigns', d.id), i = +d.i, p = c.program.slice(), t = p[i]; p[i] = p[i - 1]; p[i - 1] = t; c.program = p; save(); render(); },
    autoProg: function (d) { var c = byId('campaigns', d.id); c.program = autoProgram(c); save(); render(); toast('أُنشئ برنامج مقترح، ويمكنك تعديله'); },
    addStaff: function (d) {
      var c = byId('campaigns', d.id), team = db.users.filter(function (u) { return u.role === 'staff' && u.active !== false; });
      if (!team.length) { toast('أضف أعضاء من صفحة الفريق أولاً'); location.hash = '#/team'; return; }
      openForm('إضافة للرحلة', [{ k: 'user', label: 'العضو', type: 'select', options: team.map(function (u) { return [u.id, u.name + (u.title ? ' · ' + u.title : '')]; }) }, { k: 'role', label: 'دوره بالرحلة', type: 'select', value: 'شيخ العمرة', options: STAFF_TITLES.map(function (title) { return [title, title]; }) }], function (v) {
        c.staff = (c.staff || []).filter(function (s) { return s.user !== v.user; }).concat([{ user: v.user, role: v.role.trim() }]); return 'أُضيف للرحلة';
      });
    },
    delStaff: function (d) { var c = byId('campaigns', d.id); c.staff = c.staff.filter(function (x, i) { return i !== +d.i; }); save(); render(); },
    roll: function (d) { var k = d.id + ':' + d.p; if (roll[k]) delete roll[k]; else { roll[k] = 1; vib(20); } try { localStorage.setItem('siraj_roll', JSON.stringify(roll)); } catch (e) {} render(); },
    rollReset: function (d) { Object.keys(roll).forEach(function (k) { if (k.indexOf(d.id + ':') === 0) delete roll[k]; }); try { localStorage.setItem('siraj_roll', JSON.stringify(roll)); } catch (e) {} render(); },
    autoBus: function (d) {
      var c = byId('campaigns', d.id);
      if (!isMgr() || !c) return;
      openForm('قرعة توزيع المقاعد', [
        { k: 'cap', label: 'عدد المقاعد بكل باص', type: 'number', value: 50 },
        { k: 'buses', label: 'عدد الباصات', type: 'number', value: 1 }
      ], function (v) {
        var people = campPil(c.id).filter(function (p) { return p.status !== 'request' || p.bus || p.seat; });
        seatDraft = { campaign: c.id, plan: window.SIRAJ_SEATING(people, Number(v.cap), Number(v.buses)), capacity: Number(v.cap), buses: Number(v.buses) };
        return { preview: true };
      }, null, 'معاينة القرعة');
    },
    discardSeats: function () { seatDraft = null; render(); },
    approveSeats: function (d, el) {
      if (!isMgr() || !seatDraft || seatDraft.campaign !== d.id) return;
      var draft = seatDraft;
      el.disabled = true;
      if (ONLINE) {
        SRV.rpc('approve_bus_seats', { p_campaign: d.id, p_seats: draft.plan.assignments, p_capacity: draft.capacity, p_buses: draft.buses }).then(function () {
          seatDraft = null; toast('اعتُمد توزيع المقاعد'); return resync();
        }).catch(function (err) { el.disabled = false; toast(err.message); });
        return;
      }
      draft.plan.assignments.forEach(function (a) { var p = byId('pilgrims', a.id); p.bus = a.bus; p.seat = a.seat; });
      seatDraft = null; save(); render(); toast('اعتُمد توزيع المقاعد');
    },
    editBus: function (d) {
      var c = byId('campaigns', d.id), l = campPil(c.id).filter(function (p) { return p.bus === d.bus; }), f = l[0] || {};
      openForm('الباص ' + d.bus, [{ k: 'bus', label: 'رقم الباص', value: d.bus, max: 20 }, { k: 'bus_sup', label: 'مشرف الباص', value: f.bus_sup, max: 120, list: db.users.filter(function (u) { return u.role === 'staff'; }).map(function (u) { return u.name; }) }, { k: 'driver', label: 'السائق', value: f.driver, max: 120 }], function (v) { l.forEach(function (p) { p.bus = v.bus.trim(); p.bus_sup = v.bus_sup.trim(); p.driver = v.driver.trim(); }); return 'حُفظ'; });
    },
    exportCamp: function (d) {
      var c = byId('campaigns', d.id), head_ = ['#', 'الاسم', 'الجنس', 'العمر', 'الموبايل', 'رقم الجواز', 'انتهاء الجواز', 'الحالة', 'الباص', 'المقعد', 'مشرف الباص', 'السائق', 'الغرفة', 'زمرة الدم', 'ملاحظات صحية', 'الغرفة', 'الكفيل', 'رقم الكفيل', 'السعر $', 'المدفوع $', 'الباقي $'];
      var rs = [head_].concat(campPil(c.id).slice().sort(function (a, b) { return (num(a.bus) - num(b.bus)) || (num(a.seat) - num(b.seat)); }).map(function (p, i) { var du = pilDue(p); return [i + 1, p.name, p.gender === 'f' ? 'أنثى' : 'ذكر', age(p.birth_date) === '' ? '' : age(p.birth_date), p.phone || '', p.passport_no || '', p.passport_exp || '', STATUS[p.status] || '', p.bus || '', p.seat || '', p.bus_sup || '', p.driver || '', p.room || '', p.blood || '', p.health || '', ROOMS[p.room_type] || '', p.guarantor_name || '', p.guarantor_phone || '', du.price, du.paid, du.left]; }));
      download(xlsx('المعتمرون', rs), (c.name || 'حملة').replace(/[\\/:*?"<>|]/g, '-') + '.xlsx'); toast('نُزّل ملف الإكسل');
    },
    mapZoom: function (d) { mapz[d.k] = Math.max(3, Math.min(18, +d.z)); render(); },
    locRefresh: function () { if (!ONLINE) { render(); return; } SRV.locations().then(function (l) { db.locations = l || []; render(); toast('تحدّثت المواقع'); }).catch(function (e) { toast(e.message); }); },
    // المعتمرون
    pst: function (d) { pfilter.st = d.v; render(); },
    addPil: function (d) { pilForm(null, d.camp); },
    editPil: function (d) { pilForm(byId('pilgrims', d.id)); },
    pilStatus: function (d) {
      var p = byId('pilgrims', d.id); if (d.st === 'cancelled' && !confirm('إلغاء طلب ' + p.name + '؟')) return;
      var was = p.status; p.status = d.st; if (d.st === 'done' && !p.done_at) p.done_at = today(); save(); render(); statusNotify(p, was); toast(STATUS[d.st]);
    },
    visaUp: function (d) {
      var p = byId('pilgrims', d.id);
      openForm('رفع تأشيرة ' + p.name, [{ k: 'file', label: 'صورة التأشيرة', type: 'file', req: true, wide: true }], function (v, form) {
        var f = document.getElementById('m_file').files[0];
        return storeDoc(p.id, 'visa', f).then(function (val) { p.docs = Object.assign({}, p.docs, { visa: val }); var was = p.status; if (STATUS_ORDER.indexOf(p.status) < 2) p.status = 'visa'; if (p.user_id) notify([Object.assign({ to: [p.user_id], tag: 'visa-' + p.id, url: './' }, visaMsg(p, byId('campaigns', p.campaign_id) || {}))]); return 'رُفعت التأشيرة وأُرسل إشعار إلى المعتمر'; });
      }, { html: 'يصل إلى المعتمر إشعار: «تم إصدار التأشيرة، يسّر الله لك عمرتك» مع موعد الانطلاق ومكانه.' }, 'رفع وإرسال');
    },
    delPil: function (d) { var p = byId('pilgrims', d.id), nm = db.moves.filter(function (m) { return m.pilgrim_id === p.id; }).length; if (!confirm('حذف ' + p.name + ' نهائياً؟\n\nيُحذف معه: بياناته ووثائقه المرفوعة وحالة طلبه.\nتبقى في المالية: ' + nm + ' حركة مالية، بلا ربط بالمعتمر.\nلا يمكن التراجع.')) return; db.moves.forEach(function (m) { if (m.pilgrim_id === p.id) m.pilgrim_id = ''; }); db.pilgrims = db.pilgrims.filter(function (x) { return x.id !== p.id; }); save(); location.hash = '#/pilgrims'; },
    pilLogin: function (d) {
      var p = byId('pilgrims', d.id);
      openForm('إنشاء دخول لـ ' + p.name, [{ k: 'phone', label: 'رقم الموبايل (للدخول)', type: 'tel', value: p.phone, req: true }, { k: 'pass', label: 'كلمة السر (8 أحرف على الأقل)', req: true, max: 72 }], function (v) {
        var ph = normPhone(v.phone); if (ph.length < 8) return { err: 'رقم غير صحيح' }; if (v.pass.length < 8) return { err: 'كلمة السر 8 أحرف على الأقل' };
        var ex = db.users.filter(function (u) { return normPhone(u.login_phone || u.phone) === ph; })[0];
        if (ex && ex.role === 'pilgrim') { p.user_id = ex.id; return 'رُبط بحسابه الموجود'; }
        if (ex) return { err: 'الرقم مسجّل لحساب فريق' };
        return makeAccount(v.phone, v.pass).then(function (id) { db.users.push(Object.assign({ id: id, name: p.name, phone: v.phone.trim(), login_phone: ph, gender: p.gender, role: 'pilgrim', active: true, prefs: { prayer: { on: true, city: 'makkah', before: 15 } } }, accLocal)); accLocal = {}; p.user_id = id; p.phone = p.phone || v.phone.trim(); return save().then(function () { return 'أُنشئ الحساب. أعطه رقمه وكلمة السر'; }); });
      });
    },
    setPass: function (d) {
      var u = byId('users', d.user);
      openForm('كلمة سر جديدة' + (u ? ' لـ ' + u.name : ''), [{ k: 'pass', label: 'كلمة السر الجديدة (8 أحرف على الأقل)', req: true, max: 72 }], function (v) {
        if (v.pass.length < 8) return { err: 'كلمة السر 8 أحرف على الأقل' };
        if (ONLINE) return SRV.rpc('admin_set_password', { p_user: d.user, p_pass: v.pass }).then(function () { return 'تغيّرت كلمة السر'; });
        var salt = uid(); return hash(v.pass, salt).then(function (hh) { u.pass = hh; u.salt = salt; return 'تغيّرت كلمة السر'; });
      });
    },
    pilNotify: function (d) { pilNotifyForm(byId('pilgrims', d.id)); },
    certFor: function (d) { var p = byId('pilgrims', d.id); openSheet('<div class="dlg-h"><h2>شهادة ' + h(p.name) + '</h2>' + btn(ico('xx', 18), 'close', {}, 'x') + '</div><div class="certwrap"><canvas id="certcv" width="1600" height="1130"></canvas></div><div class="acts">' + btn('تنزيل', 'certDownload', { id: p.id }, 'gold') + '</div>'); drawCert(document.getElementById('certcv'), p); },
    viewDoc: function (d) { var p = byId('pilgrims', d.id), v = p && p.docs && p.docs[d.k]; if (!v) return; openSheet('<div class="dlg-h"><h2>' + h(DOC_KINDS[d.k]) + ' · ' + h(p.name) + '</h2>' + btn(ico('xx', 18), 'close', {}, 'x') + '</div><img class="docbig" ' + docAttr(v) + ' alt=""><div class="acts">' + btn('حفظ الصورة', 'saveImg', {}, 'pri') + '</div>'); },
    saveImg: function () { var im = document.querySelector('#modal img.docbig'); if (im && im.src) { var a = document.createElement('a'); a.href = im.src; a.download = 'siraj-doc.jpg'; document.body.appendChild(a); a.click(); a.remove(); } },
    viewReceipt: function (d) { var m = byId('moves', d.id); if (!m || !m.receipt) return; var isPdf = /\.pdf$|^data:application\/pdf/.test(m.receipt);
      openSheet('<div class="dlg-h"><h2>إيصال الدفع · ' + usd(num(m.usd)) + '</h2>' + btn(ico('xx', 18), 'close', {}, 'x') + '</div>' + (isPdf ? '<div class="pdfbox">' + ico('download', 36) + '<p>الإيصال ملف PDF.</p>' + btn('فتح الإيصال', 'openReceipt', { id: m.id }, 'pri') + '</div>' : '<img class="docbig" ' + docAttr(m.receipt) + ' alt="">')); },
    openReceipt: function (d) { var m = byId('moves', d.id); if (!m) return; var w = window.open('', '_blank'); var go = function (u) { if (w) w.location = u; else location.href = u; };
      if (/^data:/.test(m.receipt)) { var bin = atob(m.receipt.split(',')[1] || ''), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); go(URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }))); return; }
      SRV.fileUrl(m.receipt).then(go, function (x) { if (w) w.close(); toast('تعذّر فتح الإيصال: ' + (x && x.message || '')); }); },
    // المال
    addMove: function (d) { moveForm(d); },
    confirmMove: function (d) { var m = byId('moves', d.id); m.status = 'confirmed'; save(); render(); var p = byId('pilgrims', m.pilgrim_id); if (p && p.user_id) notify([{ to: [p.user_id], title: 'وصلتنا دفعتك', body: usd(num(m.usd)) + ' · ' + (METHODS[m.method] || '') + '. جزاك الله خيراً', tag: 'pay-' + m.id, url: './#/pay' }]); toast('تأكدت الدفعة'); },
    rejectMove: function (d) { var m = byId('moves', d.id); if (!confirm('رفض هذه الدفعة؟')) return; m.status = 'rejected'; save(); render(); var p = byId('pilgrims', m.pilgrim_id); if (p && p.user_id) notify([{ to: [p.user_id], title: 'تعذّر تأكيد دفعتك', body: 'يرجى التواصل مع المكتب بخصوص دفعة ' + usd(num(m.usd)) + '.', tag: 'pay-' + m.id, url: './#/pay' }]); },
    voidMove: function (d) { if (!confirm('إلغاء هذه الحركة؟\n\nتبقى الحركة في السجل بحالة «ملغاة» ولا تدخل في الحسابات. لا تُحذف.')) return; byId('moves', d.id).is_void = true; save(); render(); },
    delCamp: function (d) { var c = byId('campaigns', d.id); if (!c) return; var np = db.pilgrims.filter(function (x) { return x.campaign_id === c.id; }).length, nm = db.moves.filter(function (m) { return m.campaign_id === c.id; }).length, ng = db.messages.filter(function (m) { return m.campaign_id === c.id; }).length;
      if (!confirm('حذف حملة «' + c.name + '» نهائياً؟\n\nيُحذف معها: ' + np + ' معتمر مع وثائقهم، و' + ng + ' رسالة، والبرنامج والباص والطاقم.\nتبقى في المالية: ' + nm + ' حركة مالية، بلا ربط بالحملة.\nلا يمكن التراجع.')) return;
      var pids = db.pilgrims.filter(function (x) { return x.campaign_id === c.id; }).map(function (x) { return x.id; });
      db.moves.forEach(function (m) { if (m.campaign_id === c.id) m.campaign_id = ''; if (pids.indexOf(m.pilgrim_id) >= 0) m.pilgrim_id = ''; });
      db.messages = db.messages.filter(function (m) { return m.campaign_id !== c.id; }); db.pilgrims = db.pilgrims.filter(function (x) { return x.campaign_id !== c.id; }); db.campaigns = db.campaigns.filter(function (x) { return x.id !== c.id; }); save(); location.hash = '#/campaigns'; toast('حُذفت الحملة'); },
    delMsg: function (d) { var m = byId('messages', d.id); if (!m) return; var reps = db.messages.filter(function (r) { return r.reply_to === m.id; }).length; if (!confirm('حذف هذه الرسالة؟' + (reps ? '\n\nيُحذف معها: ' + reps + ' رد.' : '') + '\nلا يمكن التراجع.')) return; db.messages = db.messages.filter(function (r) { return r.id !== m.id && r.reply_to !== m.id; }); save(); render(); toast('حُذفت'); },
    delMove: function (d) { var mv = byId('moves', d.id); if (mv && !mv.is_void) { alertBox('لا يمكن الحذف', '<p>الحركات المؤكدة سجلّ مالي رسمي: ألغِها بدلاً من الحذف.</p>'); return; } if (!confirm('حذف هذه الحركة الملغاة نهائياً؟\n\nيُحذف معها: إيصالها المرفوع إن وُجد.\nلا يمكن التراجع.')) return; db.moves = db.moves.filter(function (m) { return m.id !== d.id; }); save(); render(); },
    // الرسائل
    reply: function (d) {
      var m = byId('messages', d.id);
      openForm('ردّ على ' + senderName(m), [{ k: 'body', label: 'الرد', type: 'area', req: true, wide: true, max: 1000 }], function (v) {
        var r = { id: uid(), campaign_id: m.campaign_id, from_id: me().id, to_id: m.from_id, kind: 'reply', body: v.body.trim(), reply_to: m.id, lat: '', lng: '', _at: new Date().toISOString() };
        db.messages.push(r); notify([{ to: [m.from_id], title: 'ردّ على سؤالك', body: r.body.slice(0, 200), tag: 'rep-' + m.id, url: './#/ask' }]); return 'أُرسل الرد';
      }, { html: '<b>' + h(senderName(m)) + ':</b> ' + h(m.body) }, 'إرسال');
    },
    // الفريق
    addStaffUser: function () { staffUserForm(null); },
    editStaffUser: function (d) { staffUserForm(byId('users', d.id)); },
    toggleUser: function (d) { var u = byId('users', d.id); u.active = u.active === false; save(); render(); },
    backup: function () { download(new Blob([JSON.stringify(db)], { type: 'application/json' }), 'siraj-backup-' + today() + '.json'); },
    // المعتمر
    lang: function () { redrawBooking(function () { LANG = LANG === 'en' ? 'ar' : 'en'; try { localStorage.setItem('siraj.lang', LANG); } catch (e) {} }); var toggle = document.querySelector('[data-act=lang]'); if (toggle) toggle.focus({ preventScroll: true }); },
    fd: function (d) { fd[d.k] = d.k === 'stars' ? +d.v : d.v; render(); },
    fdPeople: function (d) { fd.people = Math.max(1, Math.min(12, fd.people + (+d.d))); render(); },
    fdClear: function () { fd = { type: '', month: '', budget: '', room: '', stars: 0, people: 1 }; render(); },
    bookPick: function (d) { bk.camp = d.id; bk.rows = []; for (var i = 1; i < fd.people; i++) bk.rows.push({ room_type: fd.room }); if (!me()) location.hash = '#/register'; else if (route() !== '#/book') location.hash = '#/book'; render(); window.scrollTo(0, 0); },
    bookBack: function () { if (bk.camp) { bk.camp = ''; render(); } else location.hash = me() ? '#/' : '#/'; },
    bkMode: function (d) { redrawBooking(function () { bk.mode = d.m === 'gift' ? 'gift' : 'self'; }); },
    bkAdd: function () { var c = bookCamp(), box = document.getElementById('bkRows'); if (!c || !box) return; if (box.querySelectorAll('.bkrow').length >= 11) { toast('الحد الأقصى 12 شخصاً في الحجز'); return; } box.insertAdjacentHTML('beforeend', bkRow(c, {})); bkTotal(); },
    bkDel: function (d, el) { var r = el && el.closest('.bkrow'); if (r) r.remove(); bkTotal(); },
    giftStart: function () { bk.mode = 'gift'; bk.camp = ''; bk.rows = []; location.hash = me() ? '#/book' : '#/register'; render(); },
    pubTab: function (d) { pub.tab = d.t; render(); },
    selPil: function (d) { selPil = d.id; render(); },
    gcTheme: function (d) { gc.theme = d.t; render(); },
    cardDownload: function (d) { var cv = document.getElementById(d.cv); if (cv) cv.toBlob(function (b) { download(b, d.n + '.png'); }, 'image/png'); },
    cardShare: function (d) { var cv = document.getElementById(d.cv); if (cv) shareCanvas(cv, d.n, d.t); },
    doneMine: function () { var p = myPilgrim(); if (!p) return; selPil = p.id; if (p.status === 'done') { location.hash = '#/done'; return; } acts.certMine(); setTimeout(function () { location.hash = '#/done'; }, 600); },
    addReview: function () { openForm('رأي معتمر', [{ k: 'name', label: 'الاسم', req: true, max: 80 }, { k: 'trip', label: 'الرحلة', max: 120, list: db.campaigns.map(function (c) { return c.name; }) }, { k: 'stars', label: 'التقييم', type: 'select', options: [['5', '5 من 5'], ['4', '4 من 5'], ['3', '3 من 5']], value: '5' }, { k: 'text', label: 'الرأي', type: 'area', req: true, wide: true, max: 600 }], function (v) { var st = Object.assign({}, db.settings.public); st.reviews = (st.reviews || []).concat([{ name: v.name.trim(), trip: v.trip.trim(), stars: +v.stars, text: v.text.trim() }]).slice(-60); db.settings.public = st; return 'أُضيف الرأي'; }); },
    delReview: function (d) { if (!confirm('حذف هذا الرأي؟')) return; var st = Object.assign({}, db.settings.public); st.reviews = (st.reviews || []).filter(function (x, i) { return i !== +d.i; }); db.settings.public = st; save(); render(); },
    addVideo: function () { openForm('فيديو رحلة', [{ k: 'title', label: 'العنوان', req: true, max: 120, ph: 'مثلاً: الإحرام من مسجد عائشة' }, { k: 'url', label: 'الرابط', req: true, max: 300, ph: 'https://youtu.be/…' }, { k: 'date', label: 'التاريخ', type: 'date', value: today() }], function (v) { if (!/^https:\/\//.test(v.url.trim())) return { err: 'يجب أن يبدأ الرابط بـ https://' }; var st = Object.assign({}, db.settings.public); st.videos = (st.videos || []).concat([{ title: v.title.trim(), url: v.url.trim(), date: v.date }]).slice(-60); db.settings.public = st; return 'أُضيف الفيديو'; }); },
    delVideo: function (d) { if (!confirm('حذف هذا الفيديو؟')) return; var st = Object.assign({}, db.settings.public); st.videos = (st.videos || []).filter(function (x, i) { return i !== +d.i; }); db.settings.public = st; save(); render(); },
    payMethod: function (d) { pay.method = d.m; render(); if (d.m === 'shamcash') shamSheet(); },
    shamOpen: function () { shamSheet(); },
    copyCode: function (d) { var done = function () { toast('نُسخ الرمز'); }; if (navigator.clipboard) navigator.clipboard.writeText(d.v).then(done, function () { prompt('انسخ الرمز:', d.v); }); else prompt('انسخ الرمز:', d.v); },
    locToggle: function () { if (locWatch != null) { locStop(); toast('أُوقفت مشاركة الموقع'); } else { locStart(); toast('بدأت مشاركة موقعك'); } render(); },
    sos: function () {
      if (!confirm('إرسال نداء طوارئ للمشرف والإدارة مع موقعك؟')) return;
      var p = myPilgrim(); toast('جارٍ تحديد موقعك…');
      getPos().then(function (pos) {
        var m = { id: uid(), campaign_id: p ? p.campaign_id : '', from_id: me().id, to_id: '', kind: 'sos', body: 'نداء طوارئ من ' + me().name + (p && p.bus ? ' · باص ' + p.bus : ''), reply_to: '', lat: pos ? pos.coords.latitude : '', lng: pos ? pos.coords.longitude : '', _at: new Date().toISOString() };
        db.messages.push(m); save(); if (pos) sendLoc(pos);
        notify([{ to: p ? { campaignStaff: p.campaign_id } : 'managers', title: 'نداء طوارئ · ' + me().name, body: pos ? 'موقعه: https://maps.google.com/?q=' + pos.coords.latitude.toFixed(5) + ',' + pos.coords.longitude.toFixed(5) : 'تعذّر تحديد موقعه، اتصل به', tag: 'sos-' + m.id, url: './#/messages' }]);
        alertBox('أُرسل النداء', '<p>وصل النداء إلى المشرف والإدارة' + (pos ? ' مع موقعك' : '') + '. ابقَ مكانك إن أمكن.</p>' + (p ? supContact(byId('campaigns', p.campaign_id) || {}) : ''));
      });
    },
    certMine: function () { var p = myPilgrim(); if (!p) return; selPil = p.id; var go = function () { location.hash = '#/cert'; }; if (p.status === 'done') { go(); return; } if (ONLINE) SRV.rpc('finish_umrah', { p_pilgrim: p.id }).then(function () { return resync(); }).then(go, function (e) { toast(e.message); }); else { p.status = 'done'; p.done_at = today(); save(); go(); } notify([{ to: 'managers', title: 'أتمّ عمرته', body: p.name, tag: 'done-' + p.id }]); },
    certDownload: function (d) { var cv = document.getElementById('certcv'); if (!cv) return; var p = byId('pilgrims', d.id || cv.dataset.id); if (!p || p.status !== 'done') return; drawCert(cv, p).then(function () { cv.toBlob(function (b) { if (b) download(b, 'شهادة-عمرة.png'); }, 'image/png'); }).catch(function () { toast('تعذّر تجهيز الشهادة'); }); },
    // المطوّف والأدوات
    mutNext: function () { var s = mutGet(), k = C.STEPS[s.step].counter; s[k] = Math.min(7, s[k] + 1); mutSet(s); vib(s[k] === 7 ? [60, 60, 120] : 40); render(); window.scrollTo(0, 0); },
    mutPrev: function () { var s = mutGet(), k = C.STEPS[s.step].counter; s[k] = Math.max(0, s[k] - 1); mutSet(s); render(); },
    mutStep: function () { var s = mutGet(); s.step = Math.min(C.STEPS.length - 1, s.step + 1); mutSet(s); render(); window.scrollTo(0, 0); },
    mutGo: function (d) { var s = mutGet(); s.step = +d.i; s.done = false; mutSet(s); render(); },
    mutFinish: function () { var s = mutGet(); s.done = true; mutSet(s); vib([80, 60, 80]); render(); },
    mutReset: function () { if (!confirm('هل تريد البدء من جديد؟')) return; mutSet({ step: 0, tawaf: 0, sai: 0, done: false }); render(); },
    pcity: function (d) { pcity = d.c; render(); },
    exFrom: function (d) { ex.from = d.c; render(); },
    tasTap: function () { tas.n++; vib(tas.n % tas.goal === 0 ? [80, 40, 80] : 15); render(); },
    tasGoal: function (d) { tas.goal = +d.g; render(); },
    tasWord: function (d) { tas.word = d.w; tas.n = 0; render(); },
    tasReset: function () { tas.n = 0; render(); }
  };
  function autoProgram(c) {
    var p = [{ type: 'السفر', title: 'الانطلاق', note: 'التجمّع ' + (c.depart_place ? 'في ' + c.depart_place : '') + (c.depart_time ? ' الساعة ' + c.depart_time : '') + '، ودعاء السفر' }, { type: 'السفر', title: 'الحدود والطريق', note: 'ختم الجوازات والطريق إلى الميقات' }, { type: 'عمرة جماعية', title: 'الإحرام والوصول وأداء العمرة', note: 'الإحرام من الميقات، ثم الوصول إلى ' + (c.makkah_hotel || 'الفندق') + ' وأداء العمرة جماعةً مع المرشد' }];
    var mk = Math.max(0, (c.makkah_nights || 0) - 1);
    for (var i = 0; i < mk; i++) p.push(i === 1 ? { type: 'مزارات مكة', title: '', note: '', ziyarat: ['m-nour', 'm-thawr', 'm-arafat', 'm-mina', 'm-muzdalifa'] } : i === mk - 1 ? { type: 'طواف الوداع', title: '', note: 'طواف الوداع ثم التحرك' } : { type: 'استراحة وصلوات في الحرم', title: '', note: '' });
    if (c.madinah_nights) { p.push({ type: 'الانتقال إلى المدينة', title: '', note: 'السكن في ' + (c.madinah_hotel || 'الفندق') + ' والصلاة في المسجد النبوي' }); for (var j = 0; j < Math.max(0, c.madinah_nights - 1); j++) p.push(j === 0 ? { type: 'مزارات المدينة', title: '', note: '', ziyarat: ['d-quba', 'd-uhud', 'd-qiblatain', 'd-khandaq', 'd-baqi'] } : { type: 'زيارة المسجد النبوي', title: '', note: 'السلام على النبي ﷺ والروضة بحسب موعد نسك', ziyarat: ['d-rawda', 'd-salam'] }); }
    p.push({ type: 'العودة', title: 'العودة إلى الشام', note: 'تقبّل الله منّا ومنكم' });
    return p;
  }
  function dayForm(c, i) {
    var d = i >= 0 ? c.program[i] : { type: 'عمرة جماعية', ziyarat: [] };
    openForm(i >= 0 ? 'تعديل اليوم ' + (i + 1) : 'يوم جديد', [
      { k: 'type', label: 'نوع اليوم', type: 'select', options: C.DAY_TYPES.map(function (x) { return [x, x]; }), value: d.type },
      { k: 'title', label: 'عنوان (اختياري)', value: d.title, max: 120 },
      { k: 'note', label: 'تفاصيل', type: 'area', value: d.note, wide: true, max: 600 },
      { k: 'ziyarat', label: 'المزارات (لكل مزار شرح يراه المعتمر)', type: 'checks', wide: true, value: d.ziyarat || [], options: C.ZIYARAT.map(function (z) { return [z.id, (z.city === 'مكة' ? '' : '') + z.name]; }) }
    ], function (v, form) {
      var zs = Array.prototype.filter.call(document.querySelectorAll('#modal input[name=ziyarat]:checked'), function () { return true; }).map(function (x) { return x.value; });
      var row = { type: v.type, title: v.title.trim(), note: v.note.trim(), ziyarat: zs };
      c.program = (c.program || []).slice(); if (i >= 0) c.program[i] = row; else c.program.push(row); return 'حُفظ اليوم';
    });
  }

  /* ---------- الأحداث ---------- */
  function formVals(f) { var v = {}; Array.prototype.forEach.call(f.elements, function (e) { if (!e.name) return; if (e.type === 'checkbox') { if (!(e.name in v)) v[e.name] = e.checked; } else if (e.type !== 'file') v[e.name] = e.value; }); return v; }
  function allowed(a) {
    if (MGR_ONLY.indexOf(a) >= 0) return isMgr();
    if (TEAM_ONLY.indexOf(a) >= 0) return isMgr() || isStaff();
    return true;
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) { if (e.target.id === 'modal') closeForm(); return; }
    var a = el.getAttribute('data-act'); if (!acts[a] || !allowed(a)) return;
    acts[a](el.dataset, el);
  });
  document.addEventListener('change', function (e) {
    var el = e.target, k = el.getAttribute && el.getAttribute('data-chg'); if (!k) return;
    if (k === 'pq') { pfilter.q = el.value; render(); var s = document.querySelector('.search'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }
    if (k === 'pcamp') { pfilter.camp = el.value; render(); }
    if (k === 'ratesyp' && isMgr()) { var r = num(el.value); db.settings.rate_syp = r > 0 ? r : 0; save(); render(); toast('حُفظ سعر الصرف'); }
    if (k === 'prep') { if (el.checked) prepDone[el.dataset.k] = 1; else delete prepDone[el.dataset.k]; try { localStorage.setItem('siraj_prep', JSON.stringify(prepDone)); } catch (x) {} render(); }
    if (k === 'exv') { ex.v = el.value; render(); }
    if (k === 'gcFrom' || k === 'gcMsg') { gc[k === 'gcFrom' ? 'from' : 'msg'] = el.value; var gcv = document.getElementById('giftcv'); if (gcv) drawGift(gcv, byId('pilgrims', gcv.getAttribute('data-id'))); }
    if (k === 'doc' && el.files[0]) {
      var p = byId('pilgrims', el.dataset.id), kind = el.dataset.k, f = el.files[0]; el.value = '';
      if (!p || !canDoc(p) || (!isMgr() && kind === 'visa')) return;
      toast('جارٍ رفع الصورة…');
      storeDoc(p.id, kind, f).then(function (val) {
        p.docs = Object.assign({}, p.docs); p.docs[kind] = val;
        if (kind === 'visa' && isMgr()) { if (STATUS_ORDER.indexOf(p.status) < 2) p.status = 'visa'; if (p.user_id) notify([Object.assign({ to: [p.user_id], tag: 'visa-' + p.id, url: './' }, visaMsg(p, byId('campaigns', p.campaign_id) || {}))]); }
        if (isPil() && kind === 'passport') notify([{ to: 'managers', title: 'رُفع جواز', body: p.name, tag: 'doc-' + p.id, url: './#/pilgrim/' + p.id }]);
        return save().then(function () { render(); toast('رُفعت ' + DOC_KINDS[kind] + ' ✓'); });
      }).catch(function (x) { toast('تعذر الرفع: ' + x.message); });
    }
    if (k === 'avatar' && el.files[0]) { readImage(el.files[0], 256, 0.85).then(function (im) { me().photo = im.url; save(); render(); toast('حُفظت الصورة'); }).catch(function (x) { toast(x.message); }); }
    if (k === 'shamqr' && isMgr() && el.files[0]) { readImage(el.files[0], 900, 0.85).then(function (im) { db.settings.shamcash = Object.assign({}, shamcash(), { qr: im.url }); save(); render(); toast('تغيّرت صورة الـQR'); }).catch(function (x) { toast(x.message); }); }
    if (k === 'restore' && isMgr() && el.files[0]) { var fr = new FileReader(); fr.onload = function () { try { var d = JSON.parse(fr.result); if (!d.users || !d.pilgrims) throw 0; if (!confirm('الاسترجاع يستبدل كل البيانات. متابعة؟')) return; localStorage.setItem(KEY, JSON.stringify(d)); load(); render(); toast('تم الاسترجاع'); } catch (x) { toast('الملف غير صالح'); } }; fr.readAsText(el.files[0]); }
  });
  document.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('form[data-form=book]')) bkTotal(); });
  document.addEventListener('submit', function (e) {
    var f = e.target, kind = f.getAttribute('data-form'); if (!kind) return; e.preventDefault(); var v = formVals(f); if (v.website) return; delete v.website;
    if (kind === 'certificate') {
      var owner = isPil() && curPil();
      if (owner && owner.status === 'done') {
        certificateDedication.set(owner.id, (v.dedication || '').trim().slice(0, 100));
        render();
      }
      return;
    }
    var sb = f.querySelector('button[type=submit]');
    function busy(on, txt) { if (sb) { sb.disabled = on; if (txt) { sb.dataset.t = sb.dataset.t || sb.textContent; sb.textContent = txt; } else if (sb.dataset.t) sb.textContent = sb.dataset.t; } }
    if (kind === 'modal' && formCb) {
      busy(true);
      Promise.resolve().then(function () { return formCb(v, f); }).then(function (res) { busy(false); if (res && res.err) { document.getElementById('merr').textContent = res.err; return; } return (res && res.preview ? Promise.resolve() : save()).then(function () { closeForm(); render(); if (typeof res === 'string') toast(res); }); }, function (x) { busy(false); var m = document.getElementById('merr'); if (m) m.textContent = x.message || 'حدث خطأ.'; });
    }
    if (kind === 'setup') {
      if (!ONLINE && db.users.length) return; var ph = normPhone(v.phone), er = document.getElementById('aerr');
      if (ph.length < 8) { er.textContent = 'أدخل رقم موبايل صحيحاً.'; return; } if (v.pass.length < 8) { er.textContent = 'كلمة السر 8 أحرف على الأقل.'; return; }
      if (ONLINE) { er.textContent = 'جارٍ إنشاء الحساب…'; SRV.signUpManager(v.phone, v.pass).then(function () { return SRV.bootstrap(v.name.trim(), v.phone.trim()); }).then(function () { return SRV.pull(); }).then(function (d) { db = d; state.needSetup = false; location.hash = '#/'; render(); }, function (x) { var y = document.getElementById('aerr'); SRV.clear(); if (y) y.textContent = x.message; }); return; }
      var salt = uid(); hash(v.pass, salt).then(function (hh) { var u = { id: uid(), name: v.name.trim(), phone: v.phone.trim(), login_phone: ph, role: 'manager', title: 'المدير', gender: 'm', active: true, pass: hh, salt: salt, prefs: {} }; db.users.push(u); save(); localStorage.setItem(SKEY, u.id); render(); });
    }
    if (kind === 'forgot') {
      var fp = String(v.phone || '').trim(); if (normPhone(fp).length < 8) { document.getElementById('aerr').textContent = 'أدخل رقم موبايل صحيحاً.'; return; }
      busy(true, 'جارٍ الإرسال…');
      (ONLINE ? SRV.forgot(fp) : Promise.resolve({ phone: office().phone_sy || ((db.users.filter(function (u) { return u.role === 'manager'; })[0] || {}).phone) })).then(function (r) {
        var ph2 = (r && r.phone) || ''; fstate.phone = fp; fstate.sent = true;
        fstate.wa = ph2 ? wa(ph2, 'السلام عليكم، نسيت كلمة السر لحسابي في تطبيق السراج المنير.\nرقمي: ' + fp + '\nأرجو إعادة تعيين كلمة السر، وجزاكم الله خيراً') : ''; render();
      });
    }
    if (kind === 'login') {
      var ee = document.getElementById('aerr');
      if (ONLINE) { ee.textContent = 'جارٍ الدخول…'; busy(true); SRV.signIn(v.phone, v.pass).then(function () { return SRV.pull(); }).then(function (d) { db = d; if (!me()) return SRV.signOut().then(function () { throw new Error('هذا الحساب غير مفعّل. راجع الإدارة.'); }); location.hash = '#/'; render(); }).catch(function (x) { busy(false); var y = document.getElementById('aerr'); if (y) y.textContent = x.message; }); return; }
      var u = db.users.filter(function (x) { return normPhone(x.login_phone || x.phone) === normPhone(v.phone); })[0];
      if (!u) { ee.textContent = 'الرقم أو كلمة السر غير صحيحة.'; return; }
      hash(v.pass, u.salt).then(function (hh) { if (hh !== u.pass) { ee.textContent = 'الرقم أو كلمة السر غير صحيحة.'; return; } if (u.active === false) { ee.textContent = 'هذا الحساب موقوف.'; return; } localStorage.setItem(SKEY, u.id); location.hash = '#/'; render(); });
    }
    if (kind === 'book') {
      var be = document.getElementById('aerr'), c = bookCamp(), gift = bk.mode === 'gift', rws = readRows(), people = [];
      var invalid = Array.prototype.find.call(f.elements, function (el) { return el.willValidate && !el.validity.valid; });
      if (invalid) {
        var label = invalid.labels && invalid.labels[0];
        var fieldName = label ? label.textContent.trim() : invalid.getAttribute('aria-label');
        be.textContent = tr('راجع الحقل: ', 'Check this field: ') + (fieldName || '');
        invalid.setAttribute('aria-invalid', 'true');
        invalid.focus({ preventScroll: true });
        invalid.scrollIntoView({ block: 'center' });
        return;
      }
      if (!c || !bookingOpen(c)) { be.textContent = tr('الحجز مغلق.', 'Booking is closed.'); return; }
      if (!gift) people.push({ self: true, room_type: v.self_room || '' });
      for (var ri = 0; ri < rws.length; ri++) { var rr = rws[ri]; if (!rr.name.trim()) { be.textContent = tr('اكتب اسم كل شخص أو احذف السطر الفارغ.', 'Enter each person\'s name or remove the empty row.'); return; } people.push({ name: rr.name.trim(), gender: rr.gender, birth_date: rr.birth_date, room_type: rr.room_type, gift: gift }); }
      if (!people.length) { be.textContent = tr('أضف شخصاً واحداً على الأقل.', 'Add at least one person.'); return; }
      var acc = !me();
      if (acc) { var rph = normPhone(v.phone); if (v.name.trim().split(/\s+/).length < 2) { be.textContent = tr('اكتب اسمك الكامل.', 'Enter your full name.'); return; } if (rph.length < 8) { be.textContent = tr('رقم الموبايل غير صحيح.', 'Invalid mobile number.'); return; } if (v.pass.length < 8) { be.textContent = tr('كلمة السر 8 أحرف على الأقل.', 'Password must be 8+ characters.'); return; } }
      busy(true, tr('جارٍ الإرسال…', 'Sending…'));
      var gName = (v.guarantor_name || '').trim(), gPhone = (v.guarantor_phone || '').trim();
      var doneMsg = function () { var giftMsg = gift ? '<p>' + 'يمكنك الآن تصميم بطاقة الإهداء من صفحة «بطاقة الإهداء».' + '</p>' : ''; location.hash = gift ? '#/gift' : '#/'; bk = { camp: '', mode: 'self', rows: [] }; render(); setTimeout(function () { var mine = (db.pilgrims || []).filter(function (x) { return me() && (x.booked_by === me().id || x.user_id === me().id) && x.status === 'request'; }), last = mine[mine.length - 1]; alertBox('وصل طلبك', (last ? '<p class="reqno">' + tr('رقم الطلب', 'Request no.') + ': <bdi dir="ltr">' + reqNo(last) + '</bdi></p>' : '') + '<p>طلب الحجز (' + people.length + (people.length > 1 ? ' أشخاص' : ' شخص') + ') لدى الإدارة الآن.</p><p>الخطوة التالية: ارفع صور الجوازات، وادفع الدفعة الأولى من «حسابي والدفع».</p>' + giftMsg); }, 700); };
      var fail = function (x) { busy(false); var y = document.getElementById('aerr'); if (y) y.textContent = x.message; };
      if (ONLINE && acc) { SRV.register({ website: '', name: v.name.trim(), gender: v.gender, birth_date: v.birth_date, phone: v.phone.trim(), pass: v.pass, campaign_id: c.id, people: people, guarantor_name: gName, guarantor_phone: gPhone }).then(function () { return SRV.signIn(v.phone, v.pass); }).then(function () { return SRV.pull(); }).then(function (d) { db = d; LANG = LANG; doneMsg(); }).catch(fail); return; }
      if (ONLINE) { SRV.rpc('book_trip', { p_campaign: c.id, p_people: people, p_guarantor_name: gName, p_guarantor_phone: gPhone }).then(function () { notify([{ to: 'managers', title: (gift ? 'حجز إهداء' : 'طلب عمرة جديد') + (people.length > 1 ? '· ' + people.length + ' أشخاص' : ''), body: me().name + ' · ' + c.name, tag: 'req', url: './#/pilgrims' }]); return resync(); }).then(doneMsg).catch(fail); return; }
      var mk = function (u) { var group = uid(); people.forEach(function (x) { db.pilgrims.push({ id: uid(), booking_group: group, campaign_id: c.id, user_id: x.self ? u.id : '', booked_by: u.id, name: x.self ? u.name : x.name, gender: x.self ? u.gender : x.gender, birth_date: x.self ? (v.birth_date || '') : x.birth_date, phone: u.phone, room_type: x.room_type || '', guarantor_name: gName, guarantor_phone: gPhone, gift_from: x.gift ? u.name : '', status: 'request', docs: {} }); }); save(); doneMsg(); };
      if (!acc) { mk(me()); return; }
      if (db.users.some(function (x) { return normPhone(x.login_phone || x.phone) === normPhone(v.phone); })) { busy(false); be.textContent = tr('هذا الرقم مسجّل مسبقاً. سجّل الدخول.', 'This number is already registered. Sign in.'); return; }
      var rs = uid(); hash(v.pass, rs).then(function (hh) { var nu = { id: uid(), name: v.name.trim(), phone: v.phone.trim(), login_phone: normPhone(v.phone), gender: v.gender, role: 'pilgrim', active: true, pass: hh, salt: rs, prefs: { prayer: { on: true, city: 'makkah', before: 15 } } }; db.users.push(nu); localStorage.setItem(SKEY, nu.id); mk(nu); });
    }
    if (kind === 'sitecfg' && isMgr()) { var st0 = Object.assign({}, db.settings.public); st0.headline = v.headline.trim(); st0.hero_video = /^https:\/\//.test(v.hero_video.trim()) ? v.hero_video.trim() : ''; st0.privacy_email = v.privacy_email.trim(); db.settings.public = st0; save(); render(); toast('حُفظ'); }
    if (kind === 'profile') { var m = me(); if (!v.name.trim()) { document.getElementById('perr').textContent = 'الاسم مطلوب.'; return; } m.name = v.name.trim(); m.phone = v.phone.trim(); m.gender = v.gender === 'f' ? 'f' : 'm'; save(); render(); toast('حُفظ'); }
    if (kind === 'chpass') {
      var ce = document.getElementById('cperr'); if (v.p1.length < 8) { ce.textContent = 'كلمة السر 8 أحرف على الأقل.'; return; } if (v.p1 !== v.p2) { ce.textContent = 'الكلمتان غير متطابقتين.'; return; }
      if (ONLINE) { SRV.setPassword(v.p1).then(function () { toast('تغيّرت كلمة السر'); render(); }, function (x) { ce.textContent = x.message; }); return; }
      var cs = uid(); hash(v.p1, cs).then(function (hh) { me().pass = hh; me().salt = cs; save(); toast('تغيّرت كلمة السر'); render(); });
    }
    if (kind === 'prayerprefs') { var mu = me(); mu.prefs = Object.assign({}, mu.prefs, { prayer: { on: !!v.on, city: v.city === 'madinah' ? 'madinah' : 'makkah', before: +v.before } }); save(); render(); toast(v.on ? 'فُعّل تذكير الصلاة' : 'أُوقف تذكير الصلاة'); if (v.on && pushStatus() === 'default') acts.pushOn(); }
    if (kind === 'shamcash' && isMgr()) { db.settings.shamcash = Object.assign({}, shamcash(), { name: v.name.trim(), code: v.code.trim() }); save(); render(); toast('حُفظ'); }
    if (kind === 'office' && isMgr()) { db.settings.office = { phone_sy: v.phone_sy.trim(), phone_sa: v.phone_sa.trim() }; save(); render(); toast('حُفظ'); }
    if (kind === 'mypil') { var mp = curPil(); if (!mp) return; ['passport_no', 'passport_exp', 'birth_date', 'blood', 'health', 'guarantor_name', 'guarantor_phone'].forEach(function (k) { mp[k] = String(v[k] || '').trim(); }); save(); render(); toast('حُفظت بياناتك'); }
    if (kind === 'ask') {
      var ap = curPil(), q = { id: uid(), campaign_id: ap ? ap.campaign_id : '', from_id: me().id, to_id: '', kind: 'question', body: v.body.trim(), reply_to: '', lat: '', lng: '', _at: new Date().toISOString() };
      if (!q.body) return; db.messages.push(q); save(); render();
      notify([{ to: ap ? { campaignStaff: ap.campaign_id } : 'managers', title: 'سؤال من ' + me().name, body: q.body.slice(0, 200), tag: 'q-' + q.id, url: './#/messages' }]); toast('أُرسل سؤالك، وسيصلك الرد بإشعار');
    }
    if (kind === 'pay') {
      var pp = curPil(), amt = num(v.amount), pe = document.getElementById('payerr'), file = (document.getElementById('py_rc') || {}).files;
      if (!pp || amt <= 0) { pe.textContent = 'أدخل المبلغ.'; return; }
      if (v.cur === 'SYP' && !sypRate()) { pe.textContent = 'للدفع بالليرة: اسأل المكتب عن السعر، أو ادفع بالدولار.'; return; }
      if (pay.method !== 'cash' && !(file && file[0])) { pe.textContent = 'ارفع الإيصال (صورة أو PDF).'; return; }
      busy(true, 'جارٍ الإرسال…');
      var mid = uid(), rc = file && file[0] ? sniffFile(file[0]).then(function (kd) {
        if (kd === 'pdf') { if (ONLINE) return SRV.upload(pp.id + '/receipt-' + Date.now() + '.pdf', file[0]); if (file[0].size > 1.5 * 1024 * 1024) throw new Error('في الوضع المحلي يُقبل ملف PDF حتى 1.5 ميغابايت.'); return new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.readAsDataURL(file[0]); }); }
        return readImage(file[0], 1400, 0.8).then(function (im) { return ONLINE ? SRV.upload(pp.id + '/receipt-' + Date.now() + '.jpg', im.blob) : im.url; });
      }) : Promise.resolve('');
      rc.then(function (path) {
        var mv = { id: mid, date: today(), dir: 'in', cat: 'دفعة معتمر', amount: amt, cur: v.cur, rate: v.cur === 'USD' ? 1 : sypRate(), usd: Math.round(toUsd(amt, v.cur) * 100) / 100, method: pay.method, campaign_id: pp.campaign_id, pilgrim_id: pp.id, receipt: path, status: 'pending', note: (v.note || '').trim(), is_void: false, created_by: me().id };
        db.moves.push(mv); return save().then(function () {
          notify([{ to: 'managers', title: 'دفعة جديدة بانتظار التأكيد', body: pp.name + ' · ' + usd(mv.usd) + ' · ' + METHODS[mv.method], tag: 'pay-' + mid, url: './#/finance' }]);
          pay = { method: '', amount: '', cur: 'USD' }; render(); alertBox('وصلت دفعتك', '<p>ستؤكد الإدارة الدفعة ويصلك إشعار بذلك. جزاك الله خيراً.</p>');
        });
      }).catch(function (x) { busy(false); pe.textContent = x.message; });
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !document.getElementById('modal').hidden) closeForm(); });

  /* ---------- الرسم ---------- */
  function render() {
    var app = document.getElementById('app'), r = route(), html, full = false;
    if (ONLINE && !state.ready) { html = vLoading(); full = true; }
    else if (ONLINE && state.err) { html = authCard('<h1>تعذر الاتصال</h1><p>' + h(state.err) + '</p>' + btn('إعادة المحاولة', 'retry', {}, 'pri big')); full = true; }
    else if ((ONLINE && !SRV.hasSession()) || (!ONLINE && (!db.users.length || !me()))) {
      full = true;
      if (ONLINE ? state.needSetup : !db.users.length) html = vSetup();
      else if (r === '#/register') html = vBookPage(true);
      else if (r === '#/login') html = fstate.open ? vForgot() : vLogin();
      else html = vLanding();
    }
    else if (ONLINE && !me()) { html = authCard('<h1>الحساب غير مفعّل</h1><p>هذا الحساب موقوف أو لا يملك ملفاً. راجع الإدارة.</p>' + btn('تسجيل الخروج', 'logout', {}, 'big')); full = true; }
    else {
      var common = { '#/weather': vWeather, '#/mutawwif': vMutawwif, '#/prayer': vPrayer, '#/ahkam': vAhkam, '#/ziyarat': vZiyarat, '#/prep': vPrep, '#/exchange': vExchange, '#/emergency': vEmergency, '#/tasbeeh': vTasbeeh, '#/guide': vGuide, '#/profile': vProfile, '#/more': vMore };
      if (common[r]) html = common[r]();
      else if (isMgr()) {
        if (r === '#/preview') { full = true; html = vLanding(); }
        var M = { '#/site': vSiteAdmin, '#/campaigns': vCampaigns, '#/pilgrims': vPilgrims, '#/finance': vFinance, '#/messages': vMessages, '#/map': vMap, '#/team': vTeam, '#/settings': vSettings, '#/program': vProgram };
        if (html) {} else if (M[r]) html = M[r](); else if (r.indexOf('#/campaign/') === 0) html = vCampaign(r.slice(11)); else if (r.indexOf('#/pilgrim/') === 0) html = vPilgrim(r.slice(10)); else html = vDash();
      } else if (isStaff()) {
        var S = { '#/messages': vMessages, '#/map': vMap };
        if (S[r]) html = S[r](); else if (r.indexOf('#/campaign/') === 0) html = vCampaign(r.slice(11)); else if (r.indexOf('#/pilgrim/') === 0) html = vPilgrim(r.slice(10)); else html = vStaffHome();
      } else {
        var P = { '#/pay': vPay, '#/program': vProgram, '#/ask': vAsk, '#/card': vCard, '#/docs': vDocs, '#/cert': vCert, '#/book': function () { return vBookPage(false); }, '#/gift': vGift, '#/done': vDoneCard };
        html = P[r] ? P[r]() : vPortal();
      }
      if (!full) html = shell(html);
    }
    if (ONLINE && SRV.hasSession() && me() && state.ready) pushSync();
    var openTiles = Array.prototype.map.call(app.querySelectorAll('details.tile'), function (d) { return d.open; }), same = app.getAttribute('data-r') === r;
    app.innerHTML = html; app.setAttribute('data-r', r); app.className = full ? 'full' : '';
    if (same) Array.prototype.forEach.call(app.querySelectorAll('details.tile'), function (d, i) { if (openTiles[i] != null) d.open = openTiles[i]; });
    hydrate(app); tick();
    if (!same) reveal(app);
    var cv = document.getElementById('certcv'); if (cv && cv.getAttribute('data-id')) drawCert(cv, byId('pilgrims', cv.getAttribute('data-id')));
    var gcv = document.getElementById('giftcv'); if (gcv) drawGift(gcv, byId('pilgrims', gcv.getAttribute('data-id')));
    var dcv = document.getElementById('donecv'); if (dcv) drawDone(dcv, byId('pilgrims', dcv.getAttribute('data-id')));
    if (document.querySelector('form[data-form=book]')) bkTotal();
    var en = useEn(); document.documentElement.lang = en ? 'en' : 'ar'; document.documentElement.dir = en ? 'ltr' : 'rtl';
    if (me() && isPil() && locWatch == null && localStorage.getItem('siraj_loc_on') === '1' && !render.locTried) { render.locTried = true; locStart(true); }
  }
  function reveal(root) {
    if (!('IntersectionObserver' in window) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    var els = root.querySelectorAll('.public section, .trip, .card, .camp, .tools a, .gridnav a'); if (!els.length) return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -40px 0px' });
    Array.prototype.forEach.call(els, function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight) return; el.classList.add('rv'); io.observe(el); });
  }
  function tick() {
    var d = new Date(), t = pad(d.getHours()) + ':' + pad(d.getMinutes());
    ['clock', 'clock2'].forEach(function (id) { var c = document.getElementById(id); if (c && c.textContent !== t) c.textContent = t; });
  }
  function start() {
    var th = localStorage.getItem(TKEY); if (th === 'dark') { document.body.classList.add('t-dark'); document.body.classList.remove('t-light'); }
    load(); if (ONLINE) boot(); else render(); setInterval(tick, 5000);
    var lastPr = ''; setInterval(function () { var r = route(); if (r === '#/prayer' || r === '#/') { var k = PR.ksaNow().min; if (String(k) !== lastPr && document.getElementById('modal').hidden && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { lastPr = String(k); if (r === '#/prayer') render(); } } }, 30000);
    if (ONLINE) {
      var soft = function () { var a = document.activeElement, typing = a && /INPUT|TEXTAREA|SELECT/.test(a.tagName); if (SRV.hasSession() && state.ready && document.getElementById('modal').hidden && !typing) SRV.idle().then(resync); };
      window.addEventListener('focus', soft); setInterval(soft, 90000);
    }
    window.addEventListener('hashchange', function () { closeForm(); render(); window.scrollTo(0, 0); });
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  window.SIRAJ = { render: render, db: function () { return db; }, save: function () { save(); render(); } };
  start();
})();
