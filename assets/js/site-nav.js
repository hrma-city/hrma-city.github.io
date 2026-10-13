/* HRMA 全站统一导航栏 v13（2026-10-11）
   在 v12 身份制基础上增加：
   ①「更多 ▾」加入「全站导览」(tour.html)，一次看清所有板块/系列/行业课/工具；
   ② 内容页顶部「面包屑」(首页 › 板块 › 当前)，点击任一级即可退回上一步/上上步；
   ③ 顺序内容(口袋书/主题系列/通用内核/模块)在面包屑处提供「上一页/下一页」，进退自如。
   保留 v12：唯一顶栏、搜资料框、M01–M14 模块条、管理员入口、← 返回上一页。
   用法：页面里引入 <script src="assets/js/site-nav.js?v=v15"></script> */
(function () {
  var P = (function () {
    var ss = document.getElementsByTagName('script');
    for (var i = ss.length - 1; i >= 0; i--) {
      var m = (ss[i].src || '').match(/^(.*)assets\/js\/site-nav\.js(?:\?.*)?$/);
      if (m) return m[1];
    }
    return '';
  })();

  /* 主入口：以「内容取材类型」为主轴（站长 2026-10-13 定案）。
     不再按身份分流：同一份内容常被不同身份重复引用，按身份分只会让每个人
     都要绕一圈才找到。改成直接问你这次要取哪一类材料：
     学理 → 理论馆；看别人怎么应对 → 案例馆；练某项能力 → 游戏馆；上课或考证 → 培训认证馆。 */
  var MAIN = [
    ['index.html', '首页'],
    ['theory.html', '理论'],
    ['cases-hub.html', '案例'],
    ['games-hub.html', '游戏'],
    ['training.html', '教培'],
    ['resources.html', '资料库']
  ];
  /* 次级页面：收进「更多」。原身份门户（酒店人/教师/学生/社区）降到这里，
     按身份找入口的人仍有退路，但不再占主导航首位。 */
  var MORE = [
    ['tour.html', '全站导览'],
    ['hotelier.html', '酒店人'],
    ['teacher.html', '教师'],
    ['student.html', '学生'],
    ['community.html', '社区'],
    ['industries.html', '行业矩阵'],
    ['cert.html', '认证体系'],
    ['codex.html', '操作法典'],
    ['about.html', '关于学院'],
    ['contact.html', '联系我们']
  ];
  var ADMIN_EMAIL = '3984557428@qq.com';
  var STU = /^m(\d\d)\.html$/;

  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var here = file.replace(/^\/?/, '');
  var isAdmin = false, acct = '', loggedIn = false;
  try {
    var s = JSON.parse(localStorage.getItem('hrma_session_v2') || 'null');
    if (s && s.status === 'approved') { loggedIn = true; acct = s.email || s.name || '已登录'; }
    isAdmin = !!(s && String(s.email).toLowerCase() === ADMIN_EMAIL);
  } catch (e) { isAdmin = false; }

  var F = "-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif";
  function esc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
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
  bar += '<a href="' + P + 'index.html" style="' + a('color:#fff;font-weight:800;margin-right:6px;font-size:14.5px') + '">RMC<span style="color:#e8b84b">收益管理</span>社区</a>';
  MAIN.forEach(function (n) { bar += link(n); });

  /* 搜索框：直达资料库检索 */
  bar += '<form id="hrmaSearch" onsubmit="return false" style="margin-left:auto;display:inline-flex;align-items:center;height:32px;background:#0a2138;border:1px solid #29486b;border-radius:8px;padding:0 8px;gap:4px">'
    + '<span style="color:#7fa6cf;font-size:13px">🔍</span>'
    + '<input id="hrmaQ" type="text" placeholder="搜资料…" '
    + 'style="border:0;outline:0;background:transparent;color:#fff;font-size:13px;width:120px;font-family:' + F + '" '
    + 'onkeydown="if(event.key===\'Enter\'){var v=this.value.trim();location.href=\'' + P + 'resources.html?q=\'+encodeURIComponent(v);}">'
    + '</form>';

  /* 已登录态：显示账号名 + 退出（仅登录后的用户可见；访客被门挡住看不到） */
  if (loggedIn) {
    bar += '<span id="hrmaAcct" style="display:inline-flex;align-items:center;gap:7px;margin-left:8px">'
      + '<span style="color:#cfe0f5;font-size:13px">' + esc(acct) + '</span>'
      + '<a href="javascript:void(0)" id="hrmaLogout" title="退出登录" style="' + a('color:#ffd9d9;background:#5a2331;border:1px solid #7d3142') + '">退出</a>'
      + '</span>';
  }

  /* 更多下拉 */
  var moreHtml = '';
  MORE.forEach(function (n) { moreHtml += '<a href="' + P + n[0] + '" style="display:block;padding:8px 14px;color:#1f2a37;text-decoration:none;font-size:14px;white-space:nowrap">' + n[1] + '</a>'; });
  if (isAdmin) moreHtml += '<a href="' + P + 'admin-approve.html" style="display:block;padding:8px 14px;color:#b3600a;font-weight:700;text-decoration:none;font-size:14px">后台审核</a>';
  bar += '<div style="position:relative" id="hrmaMoreWrap">'
    + '<button type="button" id="hrmaMore" style="' + a('color:#d4e2f2;background:#16375f;border:1px solid #29486b') + '">更多 ▾</button>'
    + '<div id="hrmaMorePanel" style="display:none;position:absolute;right:0;top:38px;background:#fff;border:1px solid #d6e2ee;border-radius:10px;box-shadow:0 8px 24px rgba(15,42,74,.18);min-width:140px;z-index:10000">' + moreHtml + '</div>'
    + '</div>';
  bar += '</nav>';

  /* ---- 模块条：M01–M14 线性轨道（酒店人路径）---- */
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
    var prev = cur > 1 ? 'm' + (cur - 1 < 10 ? '0' + (cur - 1) : cur - 1) + '.html' : 'hotelier.html';
    var next = cur < 14 ? 'm' + (cur + 1 < 10 ? '0' + (cur + 1) : cur + 1) + '.html' : 'wb.html';
    mbar = '<div style="position:sticky;top:46px;z-index:9998;background:#123a5c;'
      + 'border-bottom:1px solid #1d3a5c;padding:6px 12px;display:flex;gap:4px;align-items:center;'
      + 'flex-wrap:wrap;font-family:' + F + '">'
      + '<a href="' + P + 'index.html" style="' + a('color:#cfe0f5;margin-right:4px') + '">首页</a>'
      + '<span style="color:#8fb4dd;font-size:12.5px;margin-right:4px">酒店人路径</span>'
      + '<a href="' + P + prev + '" style="' + a('color:#cfe0f5') + '">← 上</a>' + dots
      + '<a href="' + P + next + '" style="' + a('color:#cfe0f5') + '">下 →</a></div>';
  } else if (here === 'wb.html') {
    mbar = '<div style="position:sticky;top:46px;z-index:9998;background:#123a5c;'
      + 'border-bottom:1px solid #1d3a5c;padding:7px 12px;font-family:' + F + ';font-size:13.5px">'
      + '<a href="' + P + 'hotelier.html" style="color:#cfe0f5;text-decoration:none">← 回到酒店人路径</a>'
      + '<span style="color:#8fb4dd;margin-left:10px">认证演练题库</span>'
      + '<a href="' + P + 'm14.html" style="color:#cfe0f5;text-decoration:none;margin-left:10px">M14 →</a>'
      + '</div>';
  }

  /* ---- 面包屑：层级返回 + 顺序内容上下页 ---- */
  var TOP = ['index.html', 'hotelier.html', 'teacher.html', 'student.html', 'community.html',
    'resources.html', 'industries.html', 'cert.html', 'codex.html', 'about.html', 'contact.html', 'tour.html'];

  function sectionParent() {
    if (/^m\d\d\.html$|^courses\/|^pocket-no|^theme-no|^no\d|^series\/|^core\/|^k0/.test(here)) return { url: 'hotelier.html', label: '酒店人' };
    if (/^industries\/|industries-[a-z-]+\.html$|[a-z-]*-index\.html$/.test(here)) return { url: 'industries.html', label: '行业矩阵' };
    if (/^exam\/|^cert|wb\.html|quiz\.html|quest\.html|game-quiz/.test(here)) return { url: 'cert.html', label: '认证体系' };
    if (/^codex/.test(here)) return { url: 'codex.html', label: '操作法典' };
    if (/^games\/|^sim\.html|^reigns\.html|^pipeline\.html|^duty\.html|^arena\.html|^level\.html|^classroom\.html|^flow-quest\.html|^games-cases\.html|^game-/.test(here)) return { url: 'games.html', label: '游戏化教具' };
    if (/^community\/|^board\.html|^leaderboard\.html|^community-cases\.html/.test(here)) return { url: 'community.html', label: '社区' };
    if (/^books\/|^textbook|series-textbook|books-textbook|glossary\.html|^guide\.html|series-16|series-topics|pocket-32/.test(here)) return { url: 'resources.html', label: '资料库' };
    if (/^benchmark/.test(here)) return { url: 'benchmark.html', label: '基准数据' };
    if (/report|series\/tools|preview\.html$/.test(here)) return { url: 'report-preview.html', label: '报表工具' };
    if (/^teacher|slides?|teach|micro|open-course|^ai-|coach/.test(here)) return { url: 'teacher.html', label: '教师' };
    if (/^student|^learn|^study|roleplay|^cases/.test(here)) return { url: 'student.html', label: '学生' };
    return { url: 'resources.html', label: '资料库' };
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function seqNav() {
    var r, base = null, n = 0, tot = 0, fmt = null;
    if ((r = here.match(/^pocket-no(\d+)\.html$/))) { base = 'pocket-no'; n = +r[1]; tot = 32; fmt = function (i) { return 'pocket-no' + pad2(i) + '.html'; }; }
    else if ((r = here.match(/^(?:theme-)?no(\d+)\.html$/))) { base = 'theme-no'; n = +r[1]; tot = 16; fmt = function (i) { return 'theme-no' + pad2(i) + '.html'; }; }
    else if ((r = here.match(/^m(\d\d)\.html$/))) { base = 'm'; n = +r[1]; tot = 14; fmt = function (i) { return 'm' + pad2(i) + '.html'; }; }
    else if ((r = here.match(/^k0?(\d+)-/))) { base = 'k'; n = +r[1]; tot = 6; fmt = function (i) { return 'k' + pad2(i) + '-forecast.html'; }; }
    if (!base) return '';
    var prev = n > 1 ? fmt(n - 1) : null, nx = n < tot ? fmt(n + 1) : null;
    var b = '';
    if (prev) b += '<a href="' + P + prev + '" style="' + a('color:#2f6fb0') + '">← 上一页</a>';
    else b += '<span style="color:#7b8794">← 上一页</span>';
    if (nx) b += '<a href="' + P + nx + '" style="' + a('color:#2f6fb0;margin-left:10px') + '">下一页 →</a>';
    else b += '<span style="color:#7b8794;margin-left:10px">下一页 →</span>';
    return b;
  }

  var crumbsBar = '';
  if (TOP.indexOf(here) < 0 && !mm && here !== 'wb.html') {
    var par = sectionParent();
    var parts = ['<a href="' + P + 'index.html" style="color:#2f6fb0;text-decoration:none">首页</a>'];
    if (par) parts.push('<a href="' + P + par.url + '" style="color:#2f6fb0;text-decoration:none">' + par.label + '</a>');
    var curTitle = (document.title || here).replace(/\s*[·•].*$/, '').slice(0, 24);
    parts.push('<span style="color:#5a6b7d">' + curTitle + '</span>');
    var sep = ' <span style="color:#8a97a5">›</span> ';
    var sn = seqNav();
    crumbsBar = '<div style="background:#eef3f8;border-bottom:1px solid #dbe5ef;padding:6px 12px;'
      + 'font-size:13px;font-family:' + F + ';display:flex;gap:10px;align-items:center;flex-wrap:wrap">'
      + '<span>' + parts.join(sep) + '</span>'
      + (sn ? '<span style="margin-left:auto">' + sn + '</span>' : '')
      + '</div>';
  }

  function mount() {
    if (!document.body || document.getElementById('hrmaNav')) return;
    /* 隐藏旧版静态顶栏（152 页残留的 <header class="site-nav">，其链接配色
       是给浅底设计的、压在深底上不可见；全站顶栏只保留本脚本注入的一条） */
    var kill = document.createElement('style');
    kill.textContent = 'header.site-nav{display:none!important}';
    document.head.appendChild(kill);
    document.body.insertAdjacentHTML('afterbegin', bar + mbar + crumbsBar);
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
    var lo = document.getElementById('hrmaLogout');
    if (lo) lo.addEventListener('click', function (e) {
      e.preventDefault();
      try { localStorage.removeItem('hrma_session_v2'); } catch (err) {}
      /* 退出后跳回登录门；?t=v5 与 signin.html 部署参数一致，门页重新部署时同步修改 */
      location.replace(P + 'signin.html?t=v5');
    });
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
