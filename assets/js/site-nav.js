/* HRMA 全站统一导航栏 v10（2026-10-04 重构）
   统一解决三件事：① 打开就对（站内链接全在根目录）② 跳转有规律（四入口 + 模块条）
   ③ 返回一定回得来（← 返回按钮 + 面包屑）
   用法：页面里引入 <script src="assets/js/site-nav.js?v=v10"></script>
   前缀从脚本自身 src 反推，根页 = ''，深层页自动得到 '../' */
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
    ['learn.html', '学'],
    ['practice.html', '练'],
    ['teach.html', '教'],
    ['use.html', '用'],
    ['resources.html', '资料库'],
    ['community.html', '社区']
  ];
  var ADMIN_EMAIL = '3984557428@qq.com';
  var STU = '/^m(\\d\\d)\\.html$/';

  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var here = file.replace(/^\/?/, '');
  var isAdmin = false;
  try {
    var s = JSON.parse(localStorage.getItem('hrma_session_v2') || 'null');
    isAdmin = !!(s && String(s.email).toLowerCase() === ADMIN_EMAIL);
  } catch (e) { isAdmin = false; }

  var items = NAV.slice();
  if (isAdmin) items.push(['admin-approve.html', '后台']);

  var F = '-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif';
  function a(css) { return 'display:inline-block;padding:7px 12px;font-size:13.5px;line-height:1.2;'
    + 'white-space:nowrap;text-decoration:none;border-radius:7px;font-family:' + F + ';' + css; }
  var AOFF = a('color:#cfe0f5');
  var AON = a('background:#1d6fb8;color:#fff;font-weight:700');

  /* ---- 顶栏 ---- */
  var bar = '<nav id="hrmaNav" style="position:sticky;top:0;z-index:9999;background:#0f2a4a;'
    + 'border-bottom:2px solid #e8b84b;padding:8px 12px;display:flex;gap:4px;align-items:center;'
    + 'flex-wrap:wrap">';
  bar += '<a href="javascript:void(0)" id="hrmaBack" title="返回上一页" style="' + a('color:#e8b84b;font-weight:700') + '">← 返回</a>';
  bar += '<a href="' + P + 'index.html" style="' + a('color:#fff;font-weight:700;margin-left:6px') + '">RMC 收益管理</a>';
  items.forEach(function (n) {
    var on = (here === n[0]);
    bar += '<a href="' + P + n[0] + '" style="' + (on ? AON : AOFF) + '">' + n[1] + '</a>';
  });
  bar += '</nav>';

  /* ---- 模块条：让 M01-M14 走成一条线性轨道，翻页永远对得上 ---- */
  var mm = here.match(new RegExp(STU));
  var mbar = '';
  if (mm) {
    var cur = parseInt(mm[1], 10);
    var dots = '';
    for (var i = 1; i <= 14; i++) {
      var nm = 'm' + (i < 10 ? '0' + i : i) + '.html';
      dots += '<a href="' + P + nm + '" style="' + a(i === cur ? 'background:#e8b84b;color:#3a2a05;font-weight:700'
        : (i < cur ? 'color:#9fd0ff' : AOFF)) + '">M' + (i < 10 ? '0' + i : i) + '</a>';
    }
    var prev = cur > 1 ? 'm' + (cur - 1 < 10 ? '0' + (cur - 1) : cur - 1) + '.html' : 'learn-path.html';
    var next = cur < 14 ? 'm' + (cur + 1 < 10 ? '0' + (cur + 1) : cur + 1) + '.html' : 'wb.html';
    mbar = '<div style="position:sticky;top:44px;z-index:9998;background:#123;'
      + 'border-bottom:1px solid #24405f;padding:6px 12px;display:flex;gap:4px;align-items:center;'
      + 'flex-wrap:wrap;font-family:' + F + '">'
      + '<span style="color:#8fb4dd;font-size:12.5px;margin-right:4px">酒店人路径</span>'
      + '<a href="' + P + prev + '" style="' + a('color:#cfe0f5') + '">← 上一模块</a>' + dots
      + '<a href="' + P + next + '" style="' + a('color:#cfe0f5') + '">下一模块 →</a></div>';
  } else if (here === 'wb.html') {
    mbar = '<div style="position:sticky;top:44px;z-index:9998;background:#123;'
      + 'border-bottom:1px solid #24405f;padding:7px 12px;font-family:' + F + ';font-size:13.5px">'
      + '<a href="' + P + 'learn-path.html" style="color:#cfe0f5;text-decoration:none">← 回到酒店人路径</a>'
      + '<span style="color:#8fb4dd;margin-left:10px">认证演练题库</span>'
      + '<a href="' + P + 'm14.html" style="color:#cfe0f5;text-decoration:none;margin-left:10px">M14 →</a>'
      + '</div>';
  }

  function mount() {
    if (!document.body || document.getElementById('hrmaNav')) return;
    document.body.insertAdjacentHTML('afterbegin', bar + mbar);
    var b = document.getElementById('hrmaBack');
    /* 返回：有历史就退一步，没有就回首页——两种情况都不会把人留在死路 */
    if (b) b.addEventListener('click', function () {
      try {
        if (history.length > 1) history.back();
        else location.href = P + 'index.html';
      } catch (e) { location.href = P + 'index.html'; }
    });
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
