/* HRMA 全站统一导航栏
   用法：页面里引入 <script src="{前缀}assets/js/site-nav.js"></script>
   位置：用 sticky 占位（在文档流内），会把内容整体下推，不会遮挡任何已有元素。
   前缀：从本脚本自身的 src 反推，深层目录自动得到 ../ */
(function () {
  var P = (function () {
    var ss = document.getElementsByTagName('script');
    for (var i = ss.length - 1; i >= 0; i--) {
      var m = (ss[i].src || '').match(/^(.*)assets\/js\/site-nav\.js(?:\?.*)?$/);
      if (m) return m[1];
    }
    return '';
  })();

  var NAV = [
    ['index.html', '首页'],
    ['series/index.html', '判定表'],
    ['learn.html', '学'],
    ['teach.html', '教'],
    ['use.html', '用'],
    ['community.html', '社区']
  ];
  var ADMIN_EMAIL = '3984557428@qq.com';

  var here = (location.pathname.split('/').pop() || '').toLowerCase();
  if (!here) here = 'index.html';

  function isAdmin() {
    try {
      var s = JSON.parse(localStorage.getItem('hrma_session_v2') || 'null');
      return !!(s && String(s.email).toLowerCase() === ADMIN_EMAIL);
    } catch (e) { return false; }
  }

  var items = NAV.slice();
  if (isAdmin()) items.push(['admin-approve.html', '后台']);

  var a = 'display:inline-block;padding:9px 13px;color:#cfe0f0;text-decoration:none;font-size:14px;line-height:1;white-space:nowrap;border-radius:6px';
  var aOn = a + ';background:#1d6fb8;color:#fff;font-weight:700';

  var html = '<nav id="hrmaNav" style="position:sticky;top:0;z-index:9999;background:#0f2a4a;'
    + 'border-bottom:2px solid #e8b84b;padding:8px 12px;display:flex;gap:2px;'
    + 'align-items:center;flex-wrap:wrap;font-family:-apple-system,BlinkMacSystemFont,'
    + '"PingFang SC","Microsoft YaHei",sans-serif">';
  items.forEach(function (n) {
    var t = n[0].toLowerCase();
    var on = (here === t);
    html += '<a href="' + (P + n[0]) + '" style="' + (on ? aOn : a) + '">' + n[1] + '</a>';
  });
  html += '<span style="flex:1"></span>'
    + '<a href="' + P + 'index.html" style="' + a + ';color:#e8b84b;font-size:13px">RMC 收益管理</a>'
    + '</nav>';

  function mount() {
    if (!document.body || document.getElementById('hrmaNav')) return;
    document.body.insertAdjacentHTML('afterbegin', html);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
