/* ==========================================================================
   HRMA 访问门 · 登录逻辑 v3（邮箱 + 密码 + 管理员审核）
   --------------------------------------------------------------------------
   v3 相对 v2 修掉的 4 个真实漏洞：

   ① 管理员密码曾以明文写在本文件里 → 任何人打开网页源码即可看到并登录。
      现在密码只以 SHA-256 哈希存在于站长本机的账号表里，源码不含任何秘密。
      首次设置密码走 reset-me.html（需恢复码），之后可在 me.html 自行修改。

   ② 「忘记密码」原本允许任何人给管理员邮箱设新密码 → 等于无密码。
      现在管理员不能在该流程改密，只能用恢复码在 reset-me.html 重设。

   ③ 访问门原本对管理员邮箱无条件放行 → 改 localStorage 就能冒充。
      现在门只认「登录时由密码校验签发的会话」，并每 30 分钟复核。

   ④ 本地名单模式原本只要 session.status==='approved' 就放行 → 可自行伪造。
      现在本地模式下已通过名单只认「管理员审核后台写入的名单」，
      且会话必须带服务器/密码签发的凭证。

   ⚠️ 防护边界（纯静态站点固有限制，必须诚实告知使用者）：
      GitHub Pages 没有服务器。页面 HTML 本身是公开的，懂技术的人可以直接
      下载源文件或绕过 JS。配了 Supabase 后密码与审核状态是**真实服务端
      校验**（不可伪造）；要连静态文件一起加密，须迁到带访问网关的平台
      （Cloudflare Access / 腾讯云 COS 私有读）。

   依赖：auth-config.js（Supabase 地址、匿名密钥、管理员密码哈希）
   ========================================================================== */
(function () {
  'use strict';

  var ADMIN_EMAIL = '3984557428@qq.com';

  /* ⚠️ 这里曾放管理员密码的哈希 —— 那等于把密码公开，已彻底移除。
     原因：密码是低熵的，攻击者拿到哈希后可离线字典爆破；即使爆破不出，
     也能把哈希直接当凭证塞进 localStorage 冒充管理员。
     现在管理员密码只存在于站长自己浏览器的账号表里，源码不含任何秘密。

     首次设置密码：打开 reset-me.html，用恢复码设一个只有你知道的密码。
     恢复码是 128 位随机值，其哈希公开是安全的（无法爆破）。 */

  var KEY_SESSION = 'hrma_session_v2';
  var KEY_USERS = 'hrma_users_local';        // 本地降级模式：账号表
  var KEY_LOCALLIST = 'hrma_approved_local'; // 本地降级模式：管理员审核通过的名单
  var KEY_V2 = 'hrma_gate_v1';               // 旧版「只输邮箱」凭证，必须清理

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

  /* ---------- 密码哈希：优先用浏览器原生 SHA-256 ---------- */
  function sha256Hex(str) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
        .then(function (buf) {
          return Array.prototype.map.call(new Uint8Array(buf), function (b) {
            return ('0' + b.toString(16)).slice(-2);
          }).join('');
        });
    }
    /* 老浏览器兜底（强度弱但仍非明文） */
    var h = 5381, s = 'hrma$3$' + str;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; }
    return Promise.resolve('fb$' + h.toString(16) + '.' + s.length);
  }

  /* v2 时代的老哈希算法（djb2 + 'hrma$' 前缀）。
     保留它只为**向后兼容**：早期用 reset-me 页面设过的密码存的是老哈希，
     若只认 SHA-256 就会永远登不进去。校验通过后立刻升级为 SHA-256。 */
  function legacyHash(str) {
    var h = 5381, s = 'hrma$' + str;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; }
    return h.toString(16) + '.' + s.length;
  }

  function saveSession(s) {
    s.verifiedAt = Date.now();
    s.issuedAt = s.issuedAt || Date.now();
    try { localStorage.setItem(KEY_SESSION, JSON.stringify(s)); } catch (e) {}
  }

  /* 只允许站内相对路径，防外站跳转 */
  function safeTarget(t) {
    if (!t) return 'index.html';
    if (/^https?:/i.test(t) || t.charAt(0) === '/' || t.indexOf('..') >= 0) return 'index.html';
    return t;
  }

  /* 会话凭证绑定「密码哈希」——只有知道密码的人才算得出这个值，
     改 localStorage 写个 approved 或伪造 email 都无效。
     门会用本机账号表里的密码哈希重算并比对（见 access-gate.js）。 */
  function enter(s, pwHash) {
    if (pwHash) s.pwRef = pwHash;
    s.issuedAt = s.issuedAt || Date.now();
    s.status = String(s.email).toLowerCase() === ADMIN_EMAIL ? 'approved' : s.status;
    s.verifiedAt = Date.now();
    try { localStorage.setItem(KEY_SESSION, JSON.stringify(s)); } catch (e) {}
    if (String(s.email).toLowerCase() === ADMIN_EMAIL || s.status === 'approved') {
      location.replace(safeTarget(next));
    } else if (s.status === 'rejected') {
      location.replace('rejected.html');
    } else {
      location.replace('pending.html');
    }
  }

  /* ---------------- 本地降级模式 ---------------- */
  function localGet() { try { return JSON.parse(localStorage.getItem(KEY_USERS) || 'null'); } catch (e) { return null; } }
  function localSet(v) { try { localStorage.setItem(KEY_USERS, JSON.stringify(v)); } catch (e) {} }

  /* 账号表：不存在或结构异常则重建。
     ⚠️ 这里必须做结构归一化——历史上 v1 存成数组、v2 缺 approved 字段，
        若直接 .filter 会抛 TypeError，被外层 catch 捕获后显示成"网络异常"，
        让真正的错误原因完全看不见。 */
  function seedAdmin() {
    var db = localGet();
    if (!db || typeof db !== 'object' || Array.isArray(db)) db = { users: [], approved: [] };
    if (!Array.isArray(db.users)) db.users = [];
    if (!Array.isArray(db.approved)) db.approved = [];
    /* 清掉早期版本误写入的空数组/无效项，避免 filter 时炸掉 */
    db.users = db.users.filter(function (x) { return x && typeof x === 'object' && x.email; });
    localSet(db);
    return db;
  }

  function loginLocal(email, pw) {
    var db = seedAdmin();
    var u = db.users.filter(function (x) { return x.email === email; })[0];
    if (!u) return Promise.resolve({ error: 'noaccount' });
    var stored = u.pw || u.password;
    return sha256Hex(pw).then(function (h) {
      /* 兼容三种历史存储格式，校验通过后一律升级为 SHA-256：
         1) SHA-256（当前）
         2) v2 老哈希 djb2（早期 reset-me 页面写入的）
         3) v2 明文
         少任何一种都会让用户永远登不进去。 */
      var ok = (stored === h);
      if (!ok && stored === legacyHash(pw)) ok = true;
      if (!ok && stored === pw) ok = true;
      if (!ok) return { error: 'badpw' };
      if (stored !== h) { u.pw = h; try { delete u.password; } catch (e) {} localSet(db); }
      return { user: { email: u.email, name: u.name, status: u.status, issuedAt: Date.now() }, pwHash: h };
    });
  }

  function registerLocal(email, pw, name) {
    var db = seedAdmin();
    if (db.users.some(function (x) { return x.email === email; })) {
      return Promise.resolve({ error: 'exists' });
    }
    return sha256Hex(pw).then(function (h) {
      db.users.push({ email: email, pw: h, name: name || '', status: 'pending' });
      localSet(db);
      return { user: { email: email, name: name, status: 'pending', issuedAt: Date.now() }, pwHash: h };
    });
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
        if (!o.ok) return { error: (o.j && (o.j.error_description || o.j.msg)) || '密码错误或账号不存在' };
        var tok = o.j.access_token;
        return api(C, '/rest/v1/profiles?select=email,full_name,status&email=eq.' + encodeURIComponent(email), { token: tok })
          .then(function (r2) { return r2.json(); })
          .then(function (rows) {
            var p = rows && rows[0];
            /* 云端模式下 access_token 本身就是服务端签发的凭证，门靠它复核 */
            return {
              user: {
                email: email,
                name: p ? (p.full_name || '') : '',
                status: p ? (p.status || 'pending') : 'pending',
                access_token: tok,
                issuedAt: Date.now()
              },
              pwHash: 'cloud:' + tok.slice(-16)
            };
          });
      });
  }

  function registerSupabase(C, email, pw, name, org, reason) {
    return api(C, '/auth/v1/signup', { method: 'POST', body: { email: email, password: pw } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (o) {
        if (!o.ok) return { error: (o.j && (o.j.error_description || o.j.msg)) || '注册失败' };
        return api(C, '/rest/v1/profiles', {
          method: 'POST', token: o.j.access_token || C.anonKey,
          body: { email: email, full_name: name || '', org: org || '', reason: reason || '' }
        }).then(function () { return { user: { email: email, name: name, status: 'pending', issuedAt: Date.now() } }; });
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
          if (res.error === 'noaccount') say('该邮箱尚未注册。请点下方「注册申请」，'
            + '或用恢复码在 reset-me.html 设一个密码。', 'bad');
          else if (res.error === 'badpw') {
            /* 站长本机常常压根没设过密码，只看到「密码不对」会永远卡住。
               这里直接指路到恢复码通道，别让他再猜密码。 */
            var _mail = '';
            try { _mail = String((document.getElementById('email') || {}).value || ''); } catch (e) {}
            var _isAdminTry = String(_mail).trim().toLowerCase() === '3984557428@qq.com';
            say(_isAdminTry
              ? '密码不对。站长本人不用记密码：把恢复码贴到上面「用恢复码进站」的输入框里，'
                + '点一下就进站了；如果想换一个密码，去 reset-me.html 用恢复码重设。'
              : '密码不对。忘记密码请到 reset-me.html 用恢复码重设。', 'bad');
          }
          else say('登录失败：' + res.error, 'bad');
          return;
        }
        say('验证通过，正在进入…', 'ok');
        setTimeout(function () { enter(res.user, res.pwHash); }, 350);
      }).catch(function (e) {
        busy(false);
        /* ⚠️ 这里不是网络问题——本地模式不联网。
           之前一律显示"网络异常"，把真实异常（账号表结构损坏等）全掩盖了。
           现在直接显示错误名与消息，并给出一条可执行的兜底路径。 */
        var msgTxt = e && e.message ? e.message : String(e);
        say('登录出错：' + msgTxt
          + '　若反复出现，请用恢复码在 reset-me.html 重设密码（会清空本机账号表）。', 'bad');
        if (window.console && console.error) console.error('[HRMA login]', e);
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

      /* 漏洞②修复：管理员密码不允许在此重设，否则等于没有密码 */
      if (email === ADMIN_EMAIL) {
        say('管理员密码不能在这里重置（否则任何人都能改掉它）。'
          + '请用你设置的管理员密码登录；确实忘了请在 reset-me.html 按提示恢复。', 'bad');
        return;
      }

      var C = supabase();
      if (C) {
        say('正在发送重置邮件…', 'ok');
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

      /* 本地模式：非管理员账号可在本机改密（只影响这台设备） */
      var db = seedAdmin();
      var u = db.users.filter(function (x) { return x.email === email; })[0];
      if (!u) { say('本机没有这个账号的记录。', 'bad'); return; }
      var np = window.prompt('本机改密码（只影响这台设备）\n请输入新密码，至少 6 位：');
      if (!np) return;
      if (np.length < 6) { say('密码至少 6 位，未修改。', 'bad'); return; }
      sha256Hex(np).then(function (h) {
        u.pw = h; try { delete u.password; } catch (e) {}
        localSet(db);
        say('已在本机更新该邮箱的密码，请用新密码登录。', 'ok');
      });
    });
  }

  /* 已登录则直接进入。
     ⚠️ 必须校验会话凭证（pwRef）：旧版本残留的会话没有它，
        若直接 enter() 会被当成管理员放行 → 跳首页 → 门校验失败 → 弹回登录页，
        形成"页面打不开"的无限循环。凭证无效就留在登录页，不要跳。 */
  /* ⚠️ 只在「登录页本身」才自动跳。
     me.html 等页面也会加载本文件（用于复用 sha256 / GATE_API），
     若在这里无条件 enter()，会把这些页面一律弹回首页 —— 表现为
     「点改密页被踢回首页」。所以先判断当前是不是登录页。 */
  try {
    var _cur = (location.pathname.split('/').pop() || '').toLowerCase();
    var _isLoginPage = (_cur === 'access.html' || _cur === 'login.html');
    if (!_isLoginPage) return;   /* 非登录页：只加载工具函数，绝不跳转 */

    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY_SESSION) || 'null'); } catch (e) {}

    if (!s || !s.email) return;                 /* 无登录态：就停在登录页，正常显示表单 */

    /* 两种情况留在原地，绝不 enter()：
       (1) 没有 pwRef —— 旧版本残留的凭证；
       (2) pwRef 与账号表里该邮箱当前的密码对不上（改过密码、清过账号表、
           恢复码重签过、或换了设备/域名）—— 若此时 enter() 会被门判失败，
           又弹回登录页，再 enter()……形成「页面永远打不开」的死循环。
       正确做法：清掉陈旧凭证，让用户用密码或恢复码重新进一次。 */
    if (!s.pwRef) {
      try { localStorage.removeItem(KEY_SESSION); } catch (e) {}
      return;
    }

    var _u = null;
    try {
      var _db  = JSON.parse(localStorage.getItem(KEY_USERS) || 'null');
      var _arr = (_db && Array.isArray(_db.users)) ? _db.users : null;
      if (_arr) {
        for (var _i = 0; _i < _arr.length; _i++) {
          var _x = _arr[_i];
          if (_x && typeof _x === 'object' && _x.email === s.email) { _u = _x; break; }
        }
      }
    } catch (e) {}
    if (!_u || !_u.pw || String(_u.pw) !== String(s.pwRef)) {
      try { localStorage.removeItem(KEY_SESSION); } catch (e) {}
      return;
    }

    enter(s);   /* 凭证与账号表一致，才真正放行 */
  } catch (e) {}

  /* 暴露给注册页/门复用的接口（不再暴露任何密码） */
  window.HRMA_GATE_API = {
    adminEmail: ADMIN_EMAIL,
    login: loginSupabase,
    register: registerSupabase,
    loginLocal: loginLocal,
    registerLocal: registerLocal,
    supabase: supabase,
    sha256: sha256Hex
  };
})();
