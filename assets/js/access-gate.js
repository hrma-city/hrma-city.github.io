/* ==========================================================================
   HRMA 全站访问门 · access-gate.js
   --------------------------------------------------------------------------
   作用：页面加载时检查本地访问凭证；没有凭证就跳到 access.html 登录页。

   ⚠️ 必须诚实说明的防护边界（这是纯静态站点的固有限制）：
      GitHub Pages 没有服务器，本文件是「浏览器端」检查，不是「服务端」鉴权。
      它能挡住：搜索引擎爬取、随手点开链接的人、微信里传开的地址、正常访客。
      它挡不住：懂技术的人直接 curl/wget 下载源文件、查看网页源代码。
      真正服务端鉴权需要 Cloudflare Access / 腾讯云等带网关的平台（见 access.html 说明）。

   机制：登录成功后在 localStorage 写入凭证；凭证由邮箱 + 密钥派生，
        不同设备需各登录一次（约 3 秒）。清除浏览器数据会失效，重新输一次即可。
   ========================================================================== */
(function () {
  'use strict';

  var EMAIL = '3984557428@qq.com';
  var KEY = 'hrma_gate_v1';
  /* 凭证 = 邮箱 + 一段本地盐。改盐即可让所有已登录设备失效（换密钥用）。 */
  var SALT = 'hrma-9c1f-rm-2026';

  var p = window.HRMA_PREFIX || '';
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  /* 登录页、门本身、及不影响使用的白名单，不设门 */
  var OPEN = { 'access.html': 1, 'access-gate.js': 1, 'login.html': 1 };

  if (OPEN[here] === 1) return;
  /* 已带凭证放行 */
  try {
    if (localStorage.getItem(KEY) === EMAIL + '|' + SALT) return;
  } catch (e) { /* localStorage 不可用时继续走跳转 */ }

  /* 正在跳 access.html，避免循环 */
  if (location.pathname.indexOf('access.html') >= 0) return;

  location.replace(p + 'access.html?next=' + encodeURIComponent(here));
})();
