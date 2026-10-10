/* HRMA 全站统一导航栏 v11（2026-10-10 重构）
   目标：① 全站只有这一套顶栏（删掉各页自带的 CSS <header>）② 一致的四入口 + 资料库 + 社区
   ③ 内置「搜资料」框，直达 resources.html 检索 ④ 次级页面收进「更多」下拉，避免顶栏过载
   用法：页面里引入 <script src="assets/js/site-nav.js?v=v11"></script>
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

  /* 主入口：常驻顶栏，覆盖绝大多数访问路径 */
  var MAIN = [
    ['index.html', '首页'],
    ['learn.html', '学'],
    ['practice.html', '练'],
    ['teach.html', '教'],
    ['use.html', '用'],
    ['resources.html', '资料库'],
    ['community.html', '社区']
  ];
  /* 次级页面：收进「更多」，既保持顶栏清爽，又不让任何页面变成孤岛 */
  var MORE = [
    ['about.html', '关于学院'],
    ['curriculum.html', '课程体系'],
    ['codex.html', '操作法典'],
    ['exam.html', '认证演练'],
    ['playbook.html', '教具与案例'],
    ['contact.html', '联系我们']
  ];
  var ADMIN_EMAIL = '3984557428@qq.com';
  var STU = /^m(\d\d)\.html$/;

  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var here = file.replace(/^\/?/, '');
  var isAdmin = false;
  try {
    var s = JSON.parse(localStorage.getItem('hrma_session_v2') || 'null');
    isAdmin = !!(s && String(s.email).toLowerCase() === ADMIN_EMAIL);
  } catch (e) { isAdmin = false; }

  var F = '-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif';
  function a(css) {
    return 'display:inline-flex;align-items:center;height:32px;padding:0 11px;font-size:13.5px;line-height:1;'
      + 'white-space:nowrap;text-decoration:none;border-radius:8px;font-family:' + F + ';' + css;
  }
  var AOFF = a('color:#d4e2f2');
  var AON = a('background:#1d6fb8;color:#fff;font-weight:700');

  function link(n, cls) {
    var on = (here === n[0]);
    return '<a href="' + P + n[0] + '" style="' + (on ? AON : (cls || AOFF)) + '">' + n[1] + '</a>';
  }

  /* ---- 顶栏 ---- */
  var bar = '<nav id="hrmaNav" style="position:sticky;top:0;z-index:9999;background:#0f2a4a;'
    + 'border-bottom:1px solid #1d3a5c;padding:7px 12px;display:flex;gap:6px;align-items:center;'
    + 'flex-wrap:wrap;font-family:' + F + '">';
  bar += '<a href="javascript:void(0)" id="hrmaBack" title="返回上一页" style="' + a('color:#e8b84b;font-weight:700;margin-right:2px') + '">←</a>';
  bar += '<a href="' + P + 'index.html" style="' + a('color:#fff;font-weight:800;margin-right:6px;font-size:14.5px') + '">RMC<span style="color:#e8b84b">收益管理</span></a>';
  MAIN.forEach(function (n) { bar += link(n); });

  /* 搜索框：直达资料库检索 */
  bar += '<form id="hrmaSearch" onsubmit="return false" style="margin-left:auto;display:inline-flex;align-items:center;height:32px;background:#0a2138;border:1px solid #29486b;border-radius:8px;padding:0 8px;gap:4px">'
    + '<span style="color:#7fa6cf;font-size:13px">🔍</span>'
    + '<input id="hrmaQ" type="text" placeholder="搜资料…" '
    + 'style="border:0;outline:0;background:transparent;color:#fff;font-size:13px;width:120px;font-family:' + F + '" '
    + 'onkeydown="if(event.key===\'Enter\'){var v=this.value.trim();location.href=\'' + P + 'resources.html?q=\'+encodeURIComponent(v);}">'
    + '</form>';

  /* 更多下拉 */
  var moreHtml = '';
  MORE.forEach(function (n) { moreHtml += '<a href="' + P + n[0] + '" style="display:block;padding:8px 14px;color:#1f2a37;text-decoration:none;font-size:14px;white-space:nowrap">' + n[1] + '</a>'; });
  if (isAdmin) moreHtml += '<a href="' + P + 'admin-approve.html" style="display:block;padding:8px 14px;color:#b3600a;font-weight:700;text-decoration:none;font-size:14px">后台审核</a>';
  bar += '<div style="position:relative" id="hrmaMoreWrap">'
    + '<button type="button" id="hrmaMore" style="' + a('color:#d4e2f2;background:#16375f;border:1px solid #29486b') + '">更多 ▾</button>'
    + '<div id="hrmaMorePanel" style="display:none;position:absolute;right:0;top:38px;background:#fff;border:1px solid #d6e2ee;border-radius:10px;box-shadow:0 8px 24px rgba(15,42,74,.18);min-width:140px;z-index:10000">' + moreHtml + '</div>'
    + '</div>';
  bar += '</nav>';

  /* ---- 模块条：M01–M14 线性轨道 ---- */
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
    mbar = '<div style="position:sticky;top:46px;z-index:9998;background:#123a5c;'
      + 'border-bottom:1px solid #1d3a5c;padding:6px 12px;display:flex;gap:4px;align-items:center;'
      + 'flex-wrap:wrap;font-family:' + F + '">'
      + '<span style="color:#8fb4dd;font-size:12.5px;margin-right:4px">酒店人路径</span>'
      + '<a href="' + P + prev + '" style="' + a('color:#cfe0f5') + '">← 上</a>' + dots
      + '<a href="' + P + next + '" style="' + a('color:#cfe0f5') + '">下 →</a></div>';
  } else if (here === 'wb.html') {
    mbar = '<div style="position:sticky;top:46px;z-index:9998;background:#123a5c;'
      + 'border-bottom:1px solid #1d3a5c;padding:7px 12px;font-family:' + F + ';font-size:13.5px">'
      + '<a href="' + P + 'learn-path.html" style="color:#cfe0f5;text-decoration:none">← 回到酒店人路径</a>'
      + '<span style="color:#8fb4dd;margin-left:10px">认证演练题库</span>'
      + '<a href="' + P + 'm14.html" style="color:#cfe0f5;text-decoration:none;margin-left:10px">M14 →</a>'
      + '</div>';
  }

  function mount() {
    if (!document.body || document.getElementById('hrmaNav')) return;
    document.body.insertAdjacentHTML('afterbegin', bar + mbar);
    var b = document.getElementById('hrmaBack');
    if (b) b.addEventListener('click', function () {
      try { if (history.length > 1) history.back(); else location.href = P + 'index.html'; }
      catch (e) { location.href = P + 'index.html'; }
    });
    var mb = document.getElementById('hrmaMore');
    var mp = document.getElementById('hrmaMorePanel');
    if (mb && mp) mb.addEventListener('click', function (e) {
      e.stopPropagation();
      mp.style.display = (mp.style.display === 'none' || !mp.style.display) ? 'block' : 'none';
    });
    document.addEventListener('click', function () { if (mp) mp.style.display = 'none'; });
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
