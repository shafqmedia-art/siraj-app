/* السراج المنير — الاتصال بقاعدة البيانات (Supabase) بدون مكتبات خارجية */
(function () {
  'use strict';
  var CFG = window.SIRAJ_CONFIG || {};
  var URL_ = (CFG.serverUrl || '').replace(/\/+$/, ''), KEY = CFG.serverKey || '';
  var SKEY = 'siraj.srv.session', DOMAIN = CFG.loginDomain || 'siraj.app';
  var TABLES = { users: 'profiles', campaigns: 'campaigns', pilgrims: 'pilgrims', moves: 'moves', messages: 'messages' };
  var LOCAL_ONLY = ['pass', 'salt', 'created_at'];
  var sess = null, shadow = null, chain = Promise.resolve(), files = {};
  try { sess = JSON.parse(localStorage.getItem(SKEY)); } catch (e) { sess = null; }

  function setSess(r) {
    if (r && r.access_token) { sess = { access_token: r.access_token, refresh_token: r.refresh_token, user_id: r.user && r.user.id, exp: Date.now() + (r.expires_in || 3600) * 1000 }; localStorage.setItem(SKEY, JSON.stringify(sess)); }
    else { sess = null; localStorage.removeItem(SKEY); }
  }
  function digits(p) { return String(p || '').replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }).replace(/[^\d]/g, ''); }
  function email(phone) { return digits(phone) + '@' + DOMAIN; }
  function msgOf(j, status) {
    var m = j && (j.msg || j.message || j.error_description || j.error) || ('تعذّر تنفيذ الطلب (رمز ' + status + ')');
    if (/mime type|invalid_mime/i.test(m)) return 'نوع الملف غير مقبول في التخزين. حدّث إعدادات المخزن من ترقية v3.';
    if (/payload too large|maximum allowed size|exceeded/i.test(m)) return 'حجم الملف أكبر من المسموح.';
    if (/jwt expired/i.test(m)) return 'انتهت الجلسة. سجّل الدخول من جديد.';
    if (/already registered|already been registered/i.test(m)) return 'هذا الرقم مسجّل من قبل.';
    if (/invalid login credentials/i.test(m)) return 'الرقم أو كلمة السر غير صحيحة.';
    if (/row-level security|permission denied|not allowed/i.test(m)) return 'لا تملك صلاحية هذا الإجراء.';
    if (/manager already exists/i.test(m)) return 'يوجد مدير للنظام من قبل.';
    if (/password/i.test(m) && /6|8|short|weak/i.test(m)) return 'كلمة السر ضعيفة أو قصيرة.';
    return m;
  }
  function raw(method, path, body, opts) {
    opts = opts || {};
    var hd = { apikey: KEY };
    if (!opts.blob) hd['Content-Type'] = 'application/json';
    else hd['Content-Type'] = body.type || 'image/jpeg';
    if (sess && !opts.anon) hd.Authorization = 'Bearer ' + sess.access_token;
    if (opts.prefer) hd.Prefer = opts.prefer;
    if (opts.upsert) hd['x-upsert'] = 'true';
    return fetch(URL_ + path, { method: method, headers: hd, body: body == null ? undefined : (opts.blob ? body : JSON.stringify(body)) }).then(function (res) {
      if (opts.asBlob && res.ok) return res.blob();
      return res.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
        if (!res.ok) { var er = new Error(msgOf(j, res.status)); er.status = res.status; throw er; }
        return j;
      });
    }, function () { var er = new Error('تعذر الاتصال بالسيرفر. تحقق من الإنترنت.'); er.offline = true; throw er; });
  }
  var refreshing = null;
  function refresh() {
    if (refreshing) return refreshing;
    if (!sess || !sess.refresh_token) return Promise.reject(new Error('انتهت الجلسة. سجّل الدخول من جديد.'));
    refreshing = raw('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: sess.refresh_token }, { anon: true }).then(function (r) { refreshing = null; setSess(r); }, function (e) { refreshing = null; if (!e.offline) setSess(null); throw e; });
    return refreshing;
  }
  function call(method, path, body, opts) {
    var pre = (sess && sess.exp - Date.now() < 60000) ? refresh() : Promise.resolve();
    return pre.then(function () { return raw(method, path, body, opts); }).catch(function (e) {
      if (e.status === 401 && sess && !(opts && opts.retried)) return refresh().then(function () { return raw(method, path, body, Object.assign({}, opts, { retried: true })); });
      throw e;
    });
  }

  function toSrv(row) { var o = {}; Object.keys(row).forEach(function (k) { if (LOCAL_ONLY.indexOf(k) < 0 && k.charAt(0) !== '_') o[k] = row[k] === '' ? null : row[k]; }); return o; }
  function fromSrv(row) { var o = {}; Object.keys(row).forEach(function (k) { o[k] = row[k] === null ? '' : row[k]; }); delete o.created_at; if (row.created_at) o._at = row.created_at; return o; }
  function snap(db) {
    var s = { settings: JSON.parse(JSON.stringify(db.settings)) };
    Object.keys(TABLES).forEach(function (t) { s[t] = {}; (db[t] || []).forEach(function (r) { s[t][r.id] = JSON.stringify(toSrv(r)); }); });
    return s;
  }
  function pull() {
    var names = Object.keys(TABLES);
    return Promise.all(names.map(function (t) { return call('GET', '/rest/v1/' + TABLES[t] + '?select=*&order=created_at.asc'); })
      .concat([call('GET', '/rest/v1/settings?select=*'), call('GET', '/rest/v1/locations?select=*').catch(function () { return []; })])).then(function (res) {
      var db = { settings: {}, locations: [] };
      names.forEach(function (t, i) { db[t] = (res[i] || []).map(fromSrv); });
      (res[names.length] || []).forEach(function (r) { db.settings[r.key] = r.value; });
      db.locations = res[names.length + 1] || [];
      db.campaigns.forEach(function (c) { if (!Array.isArray(c.staff)) c.staff = []; if (!Array.isArray(c.program)) c.program = []; });
      db.pilgrims.forEach(function (p) { if (!p.docs || typeof p.docs !== 'object') p.docs = {}; });
      db.users.forEach(function (u) { if (!u.prefs || typeof u.prefs !== 'object') u.prefs = {}; });
      shadow = snap(db); return db;
    });
  }
  function ops(db) {
    var now = snap(db), list = [];
    Object.keys(TABLES).forEach(function (t) {
      var path = '/rest/v1/' + TABLES[t];
      Object.keys(now[t]).forEach(function (id) {
        if (!(id in shadow[t])) list.push(['POST', path, JSON.parse(now[t][id]), 'return=minimal']);
        else if (shadow[t][id] !== now[t][id]) list.push(['PATCH', path + '?id=eq.' + encodeURIComponent(id), JSON.parse(now[t][id]), 'return=minimal']);
      });
      Object.keys(shadow[t]).forEach(function (id) { if (!(id in now[t])) list.push(['DELETE', path + '?id=eq.' + encodeURIComponent(id), null, 'return=minimal']); });
    });
    Object.keys(now.settings).forEach(function (k) { if (JSON.stringify(shadow.settings[k]) !== JSON.stringify(now.settings[k])) list.push(['POST', '/rest/v1/settings?on_conflict=key', { key: k, value: now.settings[k] }, 'resolution=merge-duplicates,return=minimal']); });
    // الملفات الجديدة بالترتيب: profiles قبل pilgrims قبل moves
    var order = { profiles: 0, campaigns: 1, pilgrims: 2, moves: 3, messages: 4, settings: 5 };
    list.sort(function (a, b) { var ta = a[1].split('/')[3].split('?')[0], tb = b[1].split('/')[3].split('?')[0]; var da = a[0] === 'DELETE' ? 10 - order[ta] : order[ta], dbb = b[0] === 'DELETE' ? 10 - order[tb] : order[tb]; return da - dbb; });
    return { list: list, now: now };
  }
  function push(db) {
    chain = chain.catch(function () {}).then(function () {
      if (!shadow) return;
      var o = ops(db), i = 0;
      function next() { if (i >= o.list.length) { shadow = o.now; return; } var x = o.list[i++]; return call(x[0], x[1], x[2], { prefer: x[3] }).then(next); }
      return next();
    });
    return chain;
  }
  function encPath(p) { return p.split('/').map(encodeURIComponent).join('/'); }

  window.SIRAJ_SERVER = {
    enabled: CFG.mode === 'server',
    hasSession: function () { return !!sess; },
    uid: function () { return sess && sess.user_id; },
    digits: digits,
    hasManager: function () { return raw('POST', '/rest/v1/rpc/has_manager', {}, { anon: true }); },
    publicInfo: function () { return raw('POST', '/rest/v1/rpc/public_info', {}, { anon: true }); },
    signIn: function (phone, pass) { return raw('POST', '/auth/v1/token?grant_type=password', { email: email(phone), password: pass }, { anon: true }).then(setSess); },
    signUpManager: function (phone, pass) {
      return raw('POST', '/auth/v1/signup', { email: email(phone), password: pass }, { anon: true }).then(function (r) {
        if (!r || !r.access_token) throw new Error('عطّل خيار Confirm email وفعّل التسجيل مؤقتاً بإعدادات Supabase ثم أعد المحاولة.');
        setSess(r);
      });
    },
    bootstrap: function (name, phone) { return call('POST', '/rest/v1/rpc/bootstrap_manager', { p_name: name, p_phone: phone }); },
    setPassword: function (p) { return call('PUT', '/auth/v1/user', { password: p }); },
    signOut: function () { var p = sess ? raw('POST', '/auth/v1/logout', {}, {}).catch(function () {}) : Promise.resolve(); return p.then(function () { setSess(null); shadow = null; }); },
    clear: function () { setSess(null); shadow = null; },
    pull: pull, push: push,
    register: function (data) { return raw('POST', '/functions/v1/push', Object.assign({ action: 'register' }, data), { anon: true }).then(function (r) { if (!r || !r.ok) throw new Error((r && r.error) || 'تعذر التسجيل'); return r; }); },
    forgot: function (phone) { return raw('POST', '/functions/v1/push', { action: 'forgot', phone: phone }, { anon: true }).catch(function () { return null; }); },
    createUser: function (phone, pass) { return call('POST', '/functions/v1/push', { action: 'create_user', phone: phone, pass: pass }).then(function (r) { if (!r || !r.id) throw new Error((r && r.error) || 'تعذر إنشاء الحساب.'); return r.id; }); },
    rpc: function (name, body) { return call('POST', '/rest/v1/rpc/' + name, body || {}); },
    notify: function (items) { if (!sess) return Promise.resolve(null); return call('POST', '/functions/v1/push', { action: 'notify', items: items }).catch(function () { return null; }); },
    locations: function () { return call('GET', '/rest/v1/locations?select=*'); },
    upload: function (path, blob) { return call('POST', '/storage/v1/object/docs/' + encPath(path), blob, { blob: true }).then(function () { return path; }); },
    fileUrl: function (path) {
      if (!path) return Promise.resolve('');
      if (files[path]) return files[path];
      files[path] = call('GET', '/storage/v1/object/authenticated/docs/' + encPath(path), null, { asBlob: true }).then(function (b) { return URL.createObjectURL(b); }, function (e) { delete files[path]; throw e; });
      return files[path];
    },
    idle: function () { return chain.catch(function () {}); }
  };
})();
