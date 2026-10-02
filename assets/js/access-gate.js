/* ==========================================================================
   HRMA 全站访问门 · access-gate.js  （v2 · 邮箱+密码+管理员审核）
   --------------------------------------------------------------------------
   四态模型：
     1. 未登录          → 跳 access.html（登录）
     2. 已登录待审核     → 跳 pending.html（等待管理员通过）
     3. 已登录被拒       → 跳 rejected.html
     4. 已登录已通过     → 放行

   管理员 3984557428@qq.com 自动拥有 approved 身份，无需审核。

   ⚠️ 防护边界（纯静态站点固有限制，必须诚实告知使用者）：
      GitHub Pages 没有服务器，本文件是「浏览器端」状态检查。
      配了 Supabase 后，**密码校验与审核状态是真实的服务端校验**（不可伪造）；
      但页面文件本身仍是静态的——懂技术的人仍可直接下载源文件。
      真正连文件一起加密，须迁到带访问网关的平台（Cloudflare Access / 腾讯云）。

   依赖：auth-config.js（Supabase 地址与匿名密钥）。配置就绪前自动降级为
        「本地审核名单」模式，功能完整可用，只是名单在你本机、需你手动维护。
   ========================================================================== */
(function () {
  'use strict';

  var ADMIN_EMAIL = '3984557428@qq.com';
  var KEY_SESSION = 'hrma_session_v2';   // 登录态：{email, name, status}
  var KEY_LEGACY = 'hrma_gate_v1';       // 旧版「只输邮箱」凭证，需清理
  var KEY_LOCALLIST = 'hrma_approved_local'; // 本地降级模式的已通过名单

  var p = window.HRMA_PREFIX || '';
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  /* 这些页面本身属于认证流程，不设门，否则会死循环 */
  var OPEN = {
    'access.html': 1, 'pending.html': 1, 'rejected.html': 1,
    'login.html': 1, 'register.html': 1, 'access-gate.js': 1
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
    go('access.html?next=' + encodeURIComponent(here) + (qs('from') ? '&from=' + encodeURIComponent(qs('from')) : ''));
    return;
  }

  /* 管理员直接放行，不看审核状态 */
  if (String(session.email).toLowerCase() === ADMIN_EMAIL) return;

  /* ---- 情况二：已登录，看审核状态 ----
     若已通过服务端校验（session.verifiedAt 存在且不太旧），按状态放行；
     否则去服务端复核一次，防止有人改本地存储伪造 approved。 */
  var status = String(session.status || 'pending').toLowerCase();
  var checkedAt = session.verifiedAt || 0;
  var ageMin = (Date.now() - checkedAt) / 60000;

  if (status === 'approved' && checkedAt && ageMin < 30) return;   // 30 分钟内已核过

  /* 需要向服务端复核 */
  var CFG = window.HRMA_SUPABASE || {};
  if (!CFG.url || !CFG.anonKey) {
    /* 未配后端：降级为本地名单模式。名单是本机存的，只有你能改。 */
    var list = [];
    try { list = JSON.parse(localStorage.getItem(KEY_LOCALLIST) || '[]'); } catch (e) {}
    var em = String(session.email).toLowerCase();
    var hit = list.some(function (x) { return String(x).toLowerCase() === em; });
    if (hit || status === 'approved') {
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
  if (!token) { go('access.html?next=' + encodeURIComponent(here)); return; }

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
    if (status === 'approved') return;
    go('access.html?next=' + encodeURIComponent(here));
  });
})();
