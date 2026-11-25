/* ==========================================================================
   RMC 工具承接条 · tool-next-step.js
   --------------------------------------------------------------------------
   用途：免费工具用完之后，告诉用户「下一步做什么」——三行结构：
     1) 用户自己马上能做的一件事（不依赖我们）；
     2) 与这个场景对应的产品（用户视角，不写内部营销术语）；
     3) 想继续就留个联系方式或登录保存。
   挂载：各工具页在结尾插入 <div id="toolNextStep"></div> 并传入配置：
     window.RMC_TOOL_NEXT = { title, lines:[{label, text, href?, note?}] }
   本文件不依赖登录、不发请求、不改业务逻辑；链接目标各走自己的门禁。
   ========================================================================== */
(function () {
  'use strict';
  var host = document.getElementById('toolNextStep');
  var cfg = window.RMC_TOOL_NEXT;
  if (!host || !cfg || !cfg.lines || !cfg.lines.length) return;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var css = document.createElement('style');
  css.textContent =
    '.rmc-next{max-width:880px;margin:26px auto 8px;background:#f7faf7;border:1px solid #d9e7dc;border-radius:14px;padding:18px 20px}' +
    '.rmc-next .h{font-size:15px;font-weight:700;color:#1d4b38;margin:0 0 12px}' +
    '.rmc-next ol{margin:0;padding:0;list-style:none;counter-reset:n}' +
    '.rmc-next li{position:relative;padding:8px 0 8px 34px;font-size:13.5px;line-height:1.7;color:#33483c;border-top:1px solid #e5eee7}' +
    '.rmc-next li:first-child{border-top:0}' +
    '.rmc-next li:before{content:counter(n);counter-increment:n;position:absolute;left:0;top:8px;width:22px;height:22px;border-radius:50%;background:#e4f1e9;color:#1f6b4f;font-size:12px;font-weight:700;text-align:center;line-height:22px}' +
    '.rmc-next b{color:#1d4b38}' +
    '.rmc-next a{color:#1f6b4f;text-decoration:underline;text-underline-offset:2px}' +
    '.rmc-next .muted{color:#6f8176;font-size:12.5px}' +
    '@media(max-width:640px){.rmc-next{padding:14px 16px}.rmc-next li{font-size:13px}}';
  document.head.appendChild(css);

  host.innerHTML = '<section class="rmc-next"><p class="h">' + esc(cfg.title) + '</p><ol>' +
    cfg.lines.map(function (x) {
      var body = esc(x.text);
      if (x.href) {
        body += ' <a href="' + esc(x.href) + '">' + esc(x.linkText || '打开') + '</a>';
      }
      if (x.note) body += '<div class="muted">' + esc(x.note) + '</div>';
      return '<li>' + body + '</li>';
    }).join('') + '</ol></section>';
})();
