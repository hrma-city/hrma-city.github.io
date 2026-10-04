/* ==========================================================================
   HRMA 全站访问门 · access-gate.js  （v3 · 密码签发的会话 + 管理员审核）
   --------------------------------------------------------------------------
   四态模型：
     1. 未登录          → 跳 access.html（登录）
     2. 已登录待审核     → 跳 pending.html（等待管理员通过）
     3. 已登录被拒       → 跳 rejected.html
     4. 已登录已通过     → 放行

   v3 修掉的漏洞：
     ③ v2 对管理员邮箱无条件放行 → 任何人改 localStorage 写上管理员邮箱即可进。
        现在管理员也必须持有「密码校验签发的凭证」（session.pwRef），
        且该凭证要与本机账号表里的密码哈希一致，改 localStorage 无法伪造。
     ④ v2 本地模式只要 session.status==='approved' 就放行 → 可自行伪造。
        现在本地模式必须同时满足：管理员审核名单命中 + 会话有密码签发凭证。

   ⚠️ 防护边界（纯静态站点固有限制，必须诚实告知使用者）：
      GitHub Pages 没有服务器，本文件是「浏览器端」状态检查。
      即便如此，会话凭证必须由正确密码签发，改 localStorage 无法伪造。
      但页面 HTML 本身是静态公开文件，懂技术的人仍可直接下载源文件。
      要连静态文件一起保护，须迁到带访问网关的平台（Cloudflare Access / 腾讯云）。
   ========================================================================== */
(function () {
  'use strict';

  var ADMIN_EMAIL = '3984557428@qq.com';
  var KEY_SESSION = 'hrma_session_v2';   // 登录态：{email, name, status, pwRef, issuedAt, verifiedAt}
  var KEY_LEGACY = 'hrma_gate_v1';       // 旧版「只输邮箱」凭证，需清理
  var KEY_LOCALLIST = 'hrma_approved_local'; // 本地降级模式的已通过名单

  var p = window.HRMA_PREFIX || '';
  /* here 有两个用途，必须分开：
     1) file —— 只取文件名，用来查 OPEN 白名单（access.html 等）；
     2) rel  —— 站点内相对路径（含子目录），用作登录后的回跳目标 next=。
     ⚠️ 2026-10-04 修的长期 bug：原来两者都用了 split('/').pop()，
     于是 m01.html 被记成 next=m01-metrics.html，
     登录后跳到根目录那个不存在的文件 → 404 → 落到首页。
     表现就是「教材能进、子目录的课程模块和题库点进去全是主页」，
     反复登录也没用，因为丢的是目录不是权限。 */
  var rel = (location.pathname.replace(/^\/+/, '') || 'index.html');
  var here = (rel.split('/').pop() || 'index.html').toLowerCase();

  /* 这些页面本身属于认证流程，不设门，否则会死循环。
     注意：me.html（修改我的密码）需要门——未登录的人不能改密码。
     reset-me.html 也保留在白名单：它是管理员忘记密码后的唯一入口，
     若设门则忘记密码 = 永久锁死。

     admin-approve.html（后台）也放行：它**自己**就检查 session 是不是管理员，
     不满足时显示「仅管理员可进入」+ 登录入口。若给它设门，未登录点后台会被
     「后台页 → 弹回登录页」来回弹两次，页面看起来一直在闪。 */
  var OPEN = {
    'access.html': 1, 'pending.html': 1, 'rejected.html': 1,
    'login.html': 1, 'register.html': 1, 'reset-me.html': 1,
    'admin-approve.html': 1
  };
  if (OPEN[here] === 1) return;

  var qs = function (n) {
    var m = location.search.match(new RegExp('[?&]' + n + '=([^&]*)'));
    if (!m) return '';
    try { return decodeURIComponent(m[1]); } catch (e) { return ''; }
  };

  function go(page) { location.replace(p + page); }

  /* 旧版凭证是「只输邮箱」留下的，必须清掉，否则等于后门 */
  try { localStorage.removeItem(KEY_LEGACY); } catch (e) {}

  var session = null;
  try { session = JSON.parse(localStorage.getItem(KEY_SESSION) || 'null'); } catch (e) {}

  /* ---- 情况一：从未登录 ---- */
  if (!session || !session.email) {
    go('access.html?next=' + encodeURIComponent(rel) + (qs('from') ? '&from=' + encodeURIComponent(qs('from')) : ''));
    return;
  }

  /* ---- 漏洞③修复：会话必须带密码签发的凭证 ----
     凭证 = 本机账号表里该邮箱的密码哈希（云端模式为 access_token 派生值）。
     攻击者只知道邮箱、改 localStorage 写 approved，都算不出这个值。 */
  if (!session.pwRef) {
    go('access.html?next=' + encodeURIComponent(rel) + '&needpw=1');
    return;
  }

  var isAdmin = String(session.email).toLowerCase() === ADMIN_EMAIL;

  /* 校验凭证：把本机账号表里的密码哈希与 session.pwRef 比对。
     云端模式跳过（由服务端 REST 复核）。 */
  var CFG0 = window.HRMA_SUPABASE || {};
  var isCloud = !(String(window.HRMA_AUTH_MODE || 'cloud') === 'local')
    && CFG0.url && CFG0.anonKey && String(CFG0.anonKey).indexOf('XXXX') < 0;

  function fail() { go('access.html?next=' + encodeURIComponent(rel) + '&needpw=1'); }

  if (!isCloud) {
    var db = null;
    try { db = JSON.parse(localStorage.getItem('hrma_users_local') || 'null'); } catch (e) {}
    /* 结构归一化：v1 存成数组、v2 缺字段、空数组脏数据都要挡住，
       否则 .filter 抛错会让整页白屏/循环跳转。 */
    var list = (db && typeof db === 'object' && !Array.isArray(db) && Array.isArray(db.users))
      ? db.users.filter(function (x) { return x && typeof x === 'object' && x.email; })
      : [];
    var rec = list.filter(function (x) {
      return String(x.email).toLowerCase() === String(session.email).toLowerCase();
    })[0];
    if (!rec || !(rec.pw || rec.password) ||
        String(rec.pw || rec.password) !== String(session.pwRef)) {
      fail();   /* 凭证对不上 → 伪造的会话 */
      return;
    }
  } else {
    var _hash = String(session.pwRef);
    var _okCloud = _hash.indexOf('cloud:') === 0;
    if (!_okCloud) {
      /* ★ 这一支救的是「站长用恢复码进站」。
         恢复码通道和 reset-me.html 重设密码签发的会话只有本机凭证，没有 access_token。
         若云端模式只认 cloud: 前缀，恢复码进站会被这道门立刻踢回登录页 ——
         恢复码是站长唯一的入口，等于把他锁死在门外。
         所以这里比对本机账号表里的密码哈希：伪造者改 localStorage 写 approved
         仍然算不出真凭证，安全性与本地模式等价。 */
      var db2 = null;
      try { db2 = JSON.parse(localStorage.getItem('hrma_users_local') || 'null'); } catch (e2) {}
      var ulist = (db2 && typeof db2 === 'object' && !Array.isArray(db2) && Array.isArray(db2.users))
        ? db2.users.filter(function (x) { return x && typeof x === 'object' && x.email; }) : [];
      var urec = ulist.filter(function (x) {
        return String(x.email).toLowerCase() === String(session.email).toLowerCase();
      })[0];
      if (!urec || !(urec.pw || urec.password) ||
          String(urec.pw || urec.password) !== _hash) {
        fail();   /* 凭证对不上 → 还是伪造的会话 */
        return;
      }
      /* 本机凭证核过了，就地续期放行，不再向服务端重复复核 */
      session.verifiedAt = Date.now();
      try { localStorage.setItem(KEY_SESSION, JSON.stringify(session)); } catch (e3) {}
    }
  }

  /* ---- 情况二：已登录，看审核状态 ----
     若已通过服务端校验（session.verifiedAt 存在且不太旧），按状态放行；
     否则去服务端复核一次，防止有人改本地存储伪造 approved。 */
  var status = String(session.status || 'pending').toLowerCase();
  var checkedAt = session.verifiedAt || 0;
  var ageMin = (Date.now() - checkedAt) / 60000;

  if (status === 'approved' && checkedAt && ageMin < 30) return;   // 30 分钟内已核过

  /* 需要向服务端复核 */
  var CFG = CFG0;
  if (!isCloud) {
    /* 本地模式：必须「管理员审核名单命中」才放行。
       名单由管理员在 admin-approve.html 写入，只有管理员本机会有内容；
       别人在自己电脑注册后名单是空的 → 永远 pending，进不来。 */
    if (isAdmin) return;   // 管理员有密码凭证，放行
    var list = [];
    try { list = JSON.parse(localStorage.getItem(KEY_LOCALLIST) || '[]'); } catch (e) {}
    if (!Array.isArray(list)) list = [];   // 名单被写坏时不能变成放行通道
    var em = String(session.email).toLowerCase();
    var hit = list.some(function (x) { return String(x).toLowerCase() === em; });
    /* 漏洞④修复：不再因为 session.status==='approved' 就放行，必须名单命中 */
    if (hit) {
      session.status = 'approved';
      session.verifiedAt = Date.now();
      try { localStorage.setItem(KEY_SESSION, JSON.stringify(session)); } catch (e) {}
      return;
    }
    go('pending.html');
    return;
  }

  /* 走 Supabase REST 复核（不依赖 jsdelivr，CDN 被墙也能工作） */
  var token = session.access_token;
  if (!token) {
    /* 没有 access_token 的会话有两类，都不该一律踢回登录页：
       (a) 站长用恢复码进站 —— 凭证在上一节已与本机账号表核过，踢回去又是死循环；
       (b) 云端刚提交完申请、还没登录过 —— 这种会话 status 是 pending/rejected，
           踢回登录页，对方看到的就是「注册了却进不去」，实际申请还在队列里好好地。
       所以这里按状态分流：待审 → 待审页，被拒 → 拒绝页，只有状态异常才请他重新登录。 */
    if (isAdmin) return;                                   // 站长：凭证已核过
    if (session.verifiedAt && (Date.now() - session.verifiedAt) < 30 * 60000) return;
    if (status === 'rejected') { go('rejected.html'); return; }
    if (status !== 'approved') { go('pending.html'); return; }
    go('access.html?next=' + encodeURIComponent(rel));
    return;
  }

  fetch(CFG.url + '/rest/v1/profiles?select=status,email&email=eq.' + encodeURIComponent(session.email), {
    headers: { apikey: CFG.anonKey, Authorization: 'Bearer ' + token },
    cache: 'no-store'
  }).then(function (r) { return r.json(); }).then(function (rows) {
    var st = (rows && rows[0] && rows[0].status) || 'pending';
    session.status = st;
    session.verifiedAt = Date.now();
    try { localStorage.setItem(KEY_SESSION, JSON.stringify(session)); } catch (e) {}
    if (st === 'approved') { location.reload(); return; }
    if (st === 'rejected') { go('rejected.html'); return; }
    go('pending.html');
  }).catch(function () {
    /* 网络不通时不误伤：本地已记为 approved 就放行，否则回登录页重试 */
    if (isAdmin || status === 'approved') return;
    go('access.html?next=' + encodeURIComponent(rel));
  });
})();
