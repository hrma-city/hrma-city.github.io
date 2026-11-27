/* ==========================================================================
   RMC 工具引用条 · tool-citation.js
   --------------------------------------------------------------------------
   用途：工具出结果后，告诉用户「这个判断依据在哪一章、哪张表」。
   只做展示与链接，不读取用户输入、不上传、不改工具逻辑、不依赖登录。
   挂载：工具页在工具正文后插入 <div id="toolCitation"></div>，并声明
     window.RMC_CITATION = { id, title, lines:[...], href, linkText }
   ========================================================================== */
(function () {
  'use strict';
  var host = document.getElementById('toolCitation');
  var cfg = window.RMC_CITATION;
  if (!host || !cfg) return;

  var css = document.createElement('style');
  css.textContent =
    '.rmc-cite{max-width:880px;margin:18px auto 0;background:#f6f9fc;border:1px solid #d9e4ef;border-radius:12px;padding:14px 18px;font-size:13.5px;line-height:1.8;color:#274260}' +
    '.rmc-cite b{color:#1d4b78}' +
    '.rmc-cite .t{font-weight:700;margin-bottom:4px}' +
    '.rmc-cite ul{margin:6px 0 6px 18px;padding:0}' +
    '.rmc-cite a{color:#155b8f;font-weight:700;text-decoration:underline;text-underline-offset:2px}' +
    '.rmc-cite .m{color:#6b8096;font-size:12.5px}';
  document.head.appendChild(css);

  var list = (cfg.lines || []).map(function (x) { return '<li>' + x + '</li>'; }).join('');
  host.innerHTML = '<section class="rmc-cite"><div class="t">这次判断的依据</div>' +
    '<ul>' + list + '</ul>' +
    '<div>想看完整的判定条件与例子：<a href="' + cfg.href + '">' + (cfg.linkText || '打开依据说明') + '</a></div>' +
    '<div class="m">这里只给公开摘要；完整判定表与题库在教材与知识库里。</div></section>';
})();
