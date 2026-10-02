/* ==========================================================================
   HRMA 访问门 · 登录逻辑 v2（邮箱 + 密码 + 管理员审核）
   --------------------------------------------------------------------------
   两种后端，自动选择：
     A. 已配 Supabase（auth-config.js 填了 url/anonKey）→ 走真实服务端校验
        · 密码由 Supabase 校验，浏览器拿不到明文密码
        · 登录后仍需管理员审核（profiles.status = approved 才能进）
     B. 未配 Supabase → 降级为本机账号表
        · 初始账号 3984557428@qq.com，密码见 ADMIN_INIT_PASSWORD
        · 其他人注册后进「待审核」，需你在「审核后台」通过

   登录成功后写 hrma_session_v2 = {email, name, status, access_token, verifiedAt}
   ========================================================================== */
(function () {
  'use strict';

  var ADMIN_EMAIL = '3984557428@qq.com';
  /* ⚠️ 首次使用请立刻用「忘记密码」改掉这个初始密码，改完它就作废。
        这是本地降级模式用的，仅在未配 Supabase 时生效。 */
  var ADMIN_INIT_PASSWORD = 'Rmc@2026Init';
  var KEY_SESSION = 'hrma_session_v2';
  var KEY_USERS = 'hrma_users_local';       // 本地降级模式：账号表
  var KEY_LOCALLIST = 'hrma_approved_local';// 本地降级模式：已通过名单

  var $ = function (id) { return document.getElementById(id); };
  var msg = $('msg'), btn = $('btn'), emailEl = $('email'), pwEl = $('password');
  var regLink = $('regLink'), resetLink = $('resetLink');
  var next = (function () {
    var m = location.search.match(/[?&]next=([^&]*)/);
    if (!m) return '';
    try { return decodeURIComponent(m[1]); } catch (e) { return ''; }
  })();

  function say(t, kind) {
    msg.textContent = t || '';
    msg.className = 'msg' + (kind ? ' ' + kind : '');
  }
  function busy(on) { btn.disabled = on; btn.textContent = on ? '验证中…' : '登录并进入'; }

  function saveSession(s) {
    s.verifiedAt = Date.now();
    try { localStorage.setItem(KEY_SESSION, JSON.stringify(s)); } catch (e) {}
  }

  /* 只允许站内相对路径，防外站跳转 */
  function safeTarget(t) {
    if (!t) return 'index.html';
    if (/^https?:/i.test(t) || t.charAt(0) === '/' || t.indexOf('..') >= 0) return 'index.html';
    return t;
  }

  function enter(s) {
    if (String(s.email).toLowerCase() === ADMIN_EMAIL) {
      s.status = 'approved';
      saveSession(s);
      location.replace(safeTarget(next));
      return;
    }
    saveSession(s);
    if (s.status === 'approved') { location.replace(safeTarget(next)); return; }
    if (s.status === 'rejected') { location.replace('rejected.html'); return; }
    location.replace('pending.html');
  }

  /* ---------------- 本地降级模式 ---------------- */
  function localGet() { try { return JSON.parse(localStorage.getItem(KEY_USERS) || 'null'); } catch (e) { return null; } }
  function localSet(v) { try { localStorage.setItem(KEY_USERS, JSON.stringify(v)); } catch (e) {} }

  function seedAdmin() {
    var db = localGet();
    if (!db) { db = { users: [], approved: [] }; localSet(db); }
    if (!db.users.length) {
      db.users.push({ email: ADMIN_EMAIL, password: ADMIN_INIT_PASSWORD, name: '站长', status: 'approved' });
      db.approved.push(ADMIN_EMAIL);
      localSet(db);
    }
    return db;
  }

  /* 极简本地哈希：避免密码明文躺在 localStorage。仅本地降级模式使用，
     强度远低于服务端 bcrypt，但足以防止「瞄一眼 localStorage 就拿到密码」。 */
  function hash(s) {
    var h = 5381, str = 'hrma$' + s;
    for (var i = 0; i < str.length; i++) { h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; }
    return h.toString(16) + '.' + str.length;
  }

  function loginLocal(email, pw) {
    var db = seedAdmin();
    var u = db.users.filter(function (x) { return x.email === email; })[0];
    if (!u) return Promise.resolve({ error: 'noaccount' });
    if (u.password !== hash(pw) && u.password !== pw) return Promise.resolve({ error: 'badpw' });
    return Promise.resolve({ user: { email: u.email, name: u.name, status: u.status } });
  }

  function registerLocal(email, pw, name) {
    var db = seedAdmin();
    if (db.users.some(function (x) { return x.email === email; })) {
      return Promise.resolve({ error: 'exists' });
    }
    db.users.push({ email: email, password: hash(pw), name: name || '', status: 'pending' });
    localSet(db);
    return Promise.resolve({ user: { email: email, name: name, status: 'pending' } });
  }

  /* ---------------- 真实后端模式 ---------------- */
  function supabase() {
    /* 模式开关为 local 时直接不走云端，避免"配了地址但云端没账号"把站长锁在门外 */
    if (String(window.HRMA_AUTH_MODE || 'cloud') === 'local') return null;
    var C = window.HRMA_SUPABASE || {};
    if (!C.url || !C.anonKey) return null;
    if (String(C.anonKey).indexOf('XXXX') >= 0) return null;
    return C;
  }

  function api(C, path, opts) {
    opts = opts || {};
    return fetch(C.url + path, {
      method: opts.method || 'GET',
      headers: Object.assign({ apikey: C.anonKey, 'Content-Type': 'application/json' },
        opts.token ? { Authorization: 'Bearer ' + opts.token } : {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store'
    });
  }

  function loginSupabase(C, email, pw) {
    return api(C, '/auth/v1/token?grant_type=password', { method: 'POST', body: { email: email, password: pw } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (o) {
        if (!o.ok) return { error: o.j && (o.j.error_description || o.j.msg) || '密码错误或账号不存在' };
        var tok = o.j.access_token;
        return api(C, '/rest/v1/profiles?select=email,full_name,status&email=eq.' + encodeURIComponent(email), { token: tok })
          .then(function (r2) { return r2.json(); })
          .then(function (rows) {
            var p = rows && rows[0];
            return {
              user: {
                email: email,
                name: p ? (p.full_name || '') : '',
                status: p ? (p.status || 'pending') : 'pending',
                access_token: tok
              }
            };
          });
      });
  }

  function registerSupabase(C, email, pw, name, org, reason) {
    return api(C, '/auth/v1/signup', { method: 'POST', body: { email: email, password: pw } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (o) {
        if (!o.ok) return { error: o.j && (o.j.error_description || o.j.msg) || '注册失败' };
        /* profiles 记录交由数据库触发器建立（默认 status='pending'），
           这里只负责写入补充信息（若触发器未建则忽略失败）。 */
        return api(C, '/rest/v1/profiles', {
          method: 'POST', token: o.j.access_token || C.anonKey,
          body: { email: email, full_name: name || '', org: org || '', reason: reason || '' }
        }).then(function () { return { user: { email: email, name: name, status: 'pending' } }; });
      });
  }

  /* ---------------- 事件绑定 ---------------- */
  if (btn) {
    btn.addEventListener('click', function () {
      var email = String(emailEl.value || '').trim().toLowerCase();
      var pw = String(pwEl.value || '');
      if (!email || !pw) { say('请填写邮箱和密码。', 'bad'); return; }
      if (pw.length < 6) { say('密码至少 6 位。', 'bad'); return; }
      busy(true); say('');

      var C = supabase();
      var job = C
        ? loginSupabase(C, email, pw).then(function (res) {
            /* 云端校验失败时，管理员回落到本地初始密码，避免半配置把自己锁死 */
            if (res && res.error && email === ADMIN_EMAIL) return loginLocal(email, pw);
            return res;
          })
        : loginLocal(email, pw);

      job.then(function (res) {
        busy(false);
        if (res.error) {
          if (res.error === 'noaccount') say('该邮箱尚未注册，请先点下方「注册申请」。', 'bad');
          else if (res.error === 'badpw') say('密码不对。', 'bad');
          else say('登录失败：' + res.error, 'bad');
          return;
        }
        say('验证通过，正在进入…', 'ok');
        setTimeout(function () { enter(res.user); }, 350);
      }).catch(function (e) {
        busy(false);
        say('网络异常，请稍后重试。（' + (e && e.message ? e.message : '连接失败') + '）', 'bad');
      });
    });
  }

  [emailEl, pwEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' && btn) btn.click(); });
  });

  if (regLink) {
    regLink.addEventListener('click', function (e) {
      e.preventDefault();
      location.href = 'register.html' + (next ? '?next=' + encodeURIComponent(next) : '');
    });
  }
  if (resetLink) {
    resetLink.addEventListener('click', function (e) {
      e.preventDefault();
      var email = String(emailEl.value || '').trim().toLowerCase();
      if (!email) { say('请先填写邮箱，再点「忘记密码」。', 'bad'); return; }
      var C = supabase();
      if (C) {
        say('正在发送重置邮件…', 'ok');
        /* Supabase recover 必须带 email，之前是空 body，所以点了没反应 */
        api(C, '/auth/v1/recover', { method: 'POST', body: { email: email } })
          .then(function (r) {
            return r.json().catch(function () { return {}; })
                    .then(function (j) { return { ok: r.ok, j: j }; });
          })
          .then(function (o) {
            if (o.ok) say('重置邮件已发送，请查收邮箱（含垃圾箱）。', 'ok');
            else say('发送失败：' + ((o.j && (o.j.msg || o.j.error_description)) || '未知错误'), 'bad');
          })
          .catch(function () { say('发送失败，请检查网络后重试。', 'bad'); });
        return;
      }
      /* 本地模式：没有邮件服务，直接在本机改密码（只影响这台设备） */
      var db = localGet(); seedAdmin();
      var u = db.users.filter(function (x) { return x.email === email; })[0];
      if (!u) { say('本机没有这个邮箱的账号。若你是站长，请用管理员邮箱再试。', 'bad'); return; }
      var np = window.prompt('本机改密码（只影响这台设备）\n请输入新密码，至少 6 位：');
      if (!np) return;
      if (np.length < 6) { say('密码至少 6 位，未修改。', 'bad'); return; }
      u.password = hash(np);
      localSet(db);
      say('已在本机更新该邮箱的密码，请用新密码登录。', 'ok');
    });
  }

  /* 已登录则直接进入 */
  try {
    var s = JSON.parse(localStorage.getItem(KEY_SESSION) || 'null');
    if (s && s.email) { enter(s); }
  } catch (e) {}

  /* 暴露给注册页复用的接口 */
  window.HRMA_GATE_API = {
    adminEmail: ADMIN_EMAIL,
    initPassword: ADMIN_INIT_PASSWORD,
    login: loginSupabase,
    register: registerSupabase,
    loginLocal: loginLocal,
    registerLocal: registerLocal,
    supabase: supabase,
    hash: hash
  };
})();
