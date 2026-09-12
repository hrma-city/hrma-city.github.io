/* ==========================================================================
   HRMA 学院官网 · 共享脚本
   - 注入侧边栏导航（按 data-page 高亮）
   - 自动适配根目录 / 子目录，链接不会错层
   - 移动端菜单
   - 法典搜索 / 分类筛选
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- 路径基准：自动判断当前在根还是子目录 ---------- */
  var SUB = /(^|\/)(courses|exam|games|templates|data|ppt|theater|core|airline|fnb|attraction|entertainment|benchmark)\//.test(location.pathname);
  var BASE = SUB ? "../" : "";
  function href(p) { return BASE + p; }
  window.HRMA_href = href;

  /* ---------- 导航数据 ---------- */
  var NAV = [
    {
      title: "八大板块",
      items: [
        { id: "home",      n: "首", t: "社区首页",       p: "index.html" },
        { id: "academy",   n: "院", t: "收益管理学院",   p: "academy.html" },
        { id: "books",     n: "书", t: "书籍专栏",       p: "books.html" },
        { id: "games",     n: "游", t: "收益管理游戏",   p: "games/index.html" },
        { id: "cert",      n: "证", t: "资格认证",       p: "cert.html" },
        { id: "experts",   n: "专", t: "专家高手",       p: "experts.html" },
        { id: "news",      n: "闻", t: "收益管理资讯",   p: "news.html" },
        { id: "community", n: "聊", t: "行业交流社区",   p: "community.html" },
        { id: "theater",   n: "剧", t: "收益管理剧院",   p: "theater.html" }
      ]
    },
    {
      title: "行业矩阵",
      items: [
        { id: "ind",     n: "矩", t: "行业矩阵总览", p: "industries.html" },
        { id: "lodging", n: "住", t: "住宿业",       p: "lodging.html" },
        { id: "fnb",     n: "餐", t: "餐饮业",       p: "fnb.html" },
        { id: "airline", n: "航", t: "航空业",       p: "airline.html" },
        { id: "attr",    n: "景", t: "景区文旅",     p: "attraction.html" },
        { id: "ent",     n: "娱", t: "娱乐休闲",     p: "entertainment.html" }
      ]
    },
    {
      title: "通用内核六模块",
      items: [
        { id: "kidx", n: "核", t: "内核总览",     p: "core/index.html" },
        { id: "k01",  n: "K01", t: "需求预测",     p: "core/k01-forecast.html" },
        { id: "k02",  n: "K02", t: "动态定价",     p: "core/k02-pricing.html" },
        { id: "k03",  n: "K03", t: "库存控制",     p: "core/k03-inventory.html" },
        { id: "k04",  n: "K04", t: "渠道管理",     p: "core/k04-channel.html" },
        { id: "k05",  n: "K05", t: "竞争响应",     p: "core/k05-competition.html" },
        { id: "k06",  n: "K06", t: "超售与No-show", p: "core/k06-noshow.html" }
      ]
    },
    {
      title: "航空业专业课",
      items: [
        { id: "airline-idx", n: "A", t: "课程首页", p: "airline/index.html" },
        { id: "airline-a1", n: "A1", t: "指标体系", p: "airline/a1-metrics.html" },
        { id: "airline-a2", n: "A2", t: "需求预测", p: "airline/a2-forecast.html" },
        { id: "airline-a3", n: "A3", t: "舱位与定价", p: "airline/a3-pricing.html" },
        { id: "airline-a4", n: "A4", t: "库存与网络", p: "airline/a4-inventory.html" },
        { id: "airline-a5", n: "A5", t: "渠道与竞争", p: "airline/a5-channel.html" },
        { id: "airline-a6", n: "A6", t: "落地清单", p: "airline/a6-ops.html" }
      ]
    },
    {
      title: "餐饮业专业课",
      items: [
        { id: "fnb-idx", n: "F", t: "课程首页", p: "fnb/index.html" },
        { id: "fnb-f1", n: "F1", t: "指标体系", p: "fnb/f1-metrics.html" },
        { id: "fnb-f2", n: "F2", t: "需求预测", p: "fnb/f2-forecast.html" },
        { id: "fnb-f3", n: "F3", t: "菜单与定价", p: "fnb/f3-pricing.html" },
        { id: "fnb-f4", n: "F4", t: "翻台与产能", p: "fnb/f4-inventory.html" },
        { id: "fnb-f5", n: "F5", t: "渠道与竞争", p: "fnb/f5-channel.html" },
        { id: "fnb-f6", n: "F6", t: "落地清单", p: "fnb/f6-ops.html" }
      ]
    },
    {
      title: "景区文旅专业课",
      items: [
        { id: "attraction-idx", n: "T", t: "课程首页", p: "attraction/index.html" },
        { id: "attraction-t1", n: "T1", t: "指标体系", p: "attraction/t1-metrics.html" },
        { id: "attraction-t2", n: "T2", t: "需求预测", p: "attraction/t2-forecast.html" },
        { id: "attraction-t3", n: "T3", t: "票务定价", p: "attraction/t3-pricing.html" },
        { id: "attraction-t4", n: "T4", t: "承载与分时", p: "attraction/t4-inventory.html" },
        { id: "attraction-t5", n: "T5", t: "渠道与竞争", p: "attraction/t5-channel.html" },
        { id: "attraction-t6", n: "T6", t: "落地清单", p: "attraction/t6-ops.html" }
      ]
    },
    {
      title: "娱乐休闲专业课",
      items: [
        { id: "entertainment-idx", n: "E", t: "课程首页", p: "entertainment/index.html" },
        { id: "entertainment-e1", n: "E1", t: "指标体系", p: "entertainment/e1-metrics.html" },
        { id: "entertainment-e2", n: "E2", t: "需求预测", p: "entertainment/e2-forecast.html" },
        { id: "entertainment-e3", n: "E3", t: "场次与座位", p: "entertainment/e3-pricing.html" },
        { id: "entertainment-e4", n: "E4", t: "产能控制", p: "entertainment/e4-inventory.html" },
        { id: "entertainment-e5", n: "E5", t: "渠道与竞争", p: "entertainment/e5-channel.html" },
        { id: "entertainment-e6", n: "E6", t: "落地清单", p: "entertainment/e6-ops.html" }
      ]
    },
    {
      title: "学院 · 核心资产",
      items: [
        { id: "codex",      n: "★", t: "操作法典（15 表）", p: "codex.html" },
        { id: "curriculum", n: "纲", t: "教案总纲",         p: "curriculum.html" },
        { id: "about",      n: "关", t: "关于学院",         p: "about.html" },
        { id: "contact",    n: "联", t: "联系与咨询",       p: "contact.html" }
      ]
    },
    {
      title: "L1 · 收益执行专员",
      items: [
        { id: "m01", n: "M01", t: "收益管理的语言", p: "courses/m01-metrics.html" },
        { id: "m02", n: "M02", t: "系统与数据导航", p: "courses/m02-systems.html" },
        { id: "m03", n: "M03", t: "每日操作流水线", p: "courses/m03-dailyops.html" },
        { id: "m04", n: "M04", t: "报表与台账",     p: "courses/m04-reports.html" }
      ]
    },
    {
      title: "L2 · 收益管理主管",
      items: [
        { id: "m05", n: "M05", t: "需求预测",         p: "courses/m05-forecast.html" },
        { id: "m06", n: "M06", t: "价格体系设计",     p: "courses/m06-pricing.html" },
        { id: "m07", n: "M07", t: "库存与限制条件",   p: "courses/m07-inventory.html" },
        { id: "m08", n: "M08", t: "渠道与分销",       p: "courses/m08-channel.html" },
        { id: "m09", n: "M09", t: "竞争监测与定位",   p: "courses/m09-compset.html" }
      ]
    },
    {
      title: "L3 · 收益管理经理",
      items: [
        { id: "m10", n: "M10", t: "客源细分战略",   p: "courses/m10-segment.html" },
        { id: "m11", n: "M11", t: "年度预算与预测", p: "courses/m11-budget.html" },
        { id: "m12", n: "M12", t: "会议与汇报",     p: "courses/m12-meetings.html" },
        { id: "m13", n: "M13", t: "跨部门协同",     p: "courses/m13-team.html" },
        { id: "m14", n: "M14", t: "系统自动化",     p: "courses/m14-rms.html" }
      ]
    },
    {
      title: "游戏 · 以练代学",
      items: [
        { id: "gduty",   n: "值", t: "值班叙事",          p: "games/duty.html" },
        { id: "greigns", n: "卡", t: "Reigns 卡牌",       p: "games/reigns.html" },
        { id: "gpipe",   n: "流", t: "一日流水线",        p: "games/pipeline.html" },
        { id: "glevel",  n: "闯", t: "决策闯关（经典）",  p: "games/level.html" },
        { id: "gsim",   n: "营", t: "经营模拟 30 天",  p: "games/sim.html" },
        { id: "cases",  n: "案", t: "案例分析集",      p: "games/cases.html" },
        { id: "play",   n: "具", t: "游戏化教具",      p: "games/playbook.html" }
      ]
    },
    {
      title: "考核与资源",
      items: [
        { id: "workbook", n: "EX", t: "演练题库",         p: "exam/workbook.html" },
        { id: "certstd",  n: "CE", t: "认证考核标准",     p: "exam/certification.html" },
        { id: "res",      n: "RC", t: "模板与资料下载",   p: "resources.html" }
      ]
    }
  ];

  /* ---------- 注入侧边栏 ---------- */
  function buildNav() {
    var sb = document.getElementById("sidebar");
    if (!sb) return;

    var page = sb.getAttribute("data-page") || document.body.getAttribute("data-page") || "";
    var html =
      '<div class="brand">' +
        '<a class="brand-mark" href="' + href("index.html") + '">' +
          '<span class="gem">收</span><span>RMC收益管理社区</span>' +
        "</a>" +
        '<div class="brand-sub">RMC Revenue Management Community<br>学院 · 游戏 · 社区 · 认证 · 剧院</div>' +
      "</div>";

    NAV.forEach(function (sec) {
      html += '<div class="nav-section"><div class="nav-section-title">' + sec.title + "</div>";
      sec.items.forEach(function (it) {
        var cls = it.id === page ? "nav-link active" : "nav-link";
        html +=
          '<a class="' + cls + '" href="' + href(it.p) + '">' +
            '<span class="n">' + it.n + "</span><span>" + it.t + "</span>" +
          "</a>";
      });
      html += "</div>";
    });

    sb.innerHTML = html;

    if (!document.getElementById("menuBtn")) {
      var btn = document.createElement("button");
      btn.id = "menuBtn";
      btn.className = "menu-btn";
      btn.innerHTML = "☰";
      btn.setAttribute("aria-label", "打开目录");
      document.body.appendChild(btn);
      btn.addEventListener("click", function () { sb.classList.toggle("open"); });
      sb.addEventListener("click", function (e) {
        if (e.target.closest("a")) sb.classList.remove("open");
      });
    }
  }

  /* ---------- 顶部导航：5 大板块 + hover 多级菜单 + 全站搜索 ---------- */
  var BOARDS = [
    { t: "知识分享", p: "knowledge.html", items: [
      { t: "概念篇", p: "gejijipo.html?part=concept" },
      { t: "操作篇", p: "gejijipo.html?part=op" },
      { t: "案例篇", p: "gejijipo.html?part=case" },
      { t: "通用内核六模块", p: "core/index.html" },
      { t: "收益管理学院", p: "academy.html" },
      { t: "操作法典（15表）", p: "codex.html" },
      { t: "书籍专栏", p: "books.html" },
      { t: "行业矩阵", p: "industries.html" }
    ]},
    { t: "教学咨询", p: "teach.html", items: [
      { t: "教学资源包", p: "teach.html#pack" },
      { t: "教案 / 课件 / PPT", p: "teach.html#ppt" },
      { t: "角色扮演经营游戏", p: "teach.html#role" },
      { t: "分组经营竞赛游戏", p: "teach.html#compete" },
      { t: "教学指导咨询", p: "teach.html#consult" },
      { t: "营销定价方案", p: "teach.html#pricing" }
    ]},
    { t: "行业实操", p: "practice.html", items: [
      { t: "行业操作指南", p: "practice.html#guide" },
      { t: "实操训练营", p: "practice.html#camp" },
      { t: "实操游戏", p: "practice.html#game" },
      { t: "住宿业", p: "lodging.html" },
      { t: "餐饮业", p: "fnb.html" },
      { t: "航空业", p: "airline/index.html" },
      { t: "景区文旅", p: "attraction/index.html" },
      { t: "娱乐休闲", p: "entertainment/index.html" }
    ]},
    { t: "社区互动", p: "community.html", items: [
      { t: "经验与案例分享", p: "community.html" },
      { t: "案例讨论", p: "community.html#discuss" },
      { t: "招聘内推", p: "jobs.html" },
      { t: "专家高手", p: "experts.html" },
      { t: "收益管理剧院", p: "theater.html" }
    ]},
    { t: "资讯", p: "news.html", items: [
      { t: "行业资讯", p: "news.html" },
      { t: "资讯总览", p: "news.html#all" }
    ]}
  ];

  function injectNavCss() {
    if (document.getElementById("snStyle")) return;
    var s = document.createElement("style");
    s.id = "snStyle";
    s.textContent =
      ".sn-links{display:flex;gap:2px;align-items:center;flex-wrap:wrap}" +
      ".sn-board{position:relative}" +
      ".sn-board>a{display:inline-block;padding:8px 12px;color:#33415c;border-radius:8px;white-space:nowrap}" +
      ".sn-board>a:hover,.sn-board>a.on{background:#eef3f8;color:#1B3A5C}" +
      ".sn-dd{display:none;position:absolute;top:100%;left:0;min-width:200px;background:#fff;border:1px solid #E1E5EA;" +
      "border-radius:10px;box-shadow:0 10px 30px rgba(27,58,92,.14);padding:8px;z-index:60}" +
      ".sn-board:hover .sn-dd{display:block}" +
      ".sn-dd a{display:block;padding:8px 12px;border-radius:8px;color:#33415c;font-size:14px}" +
      ".sn-dd a:hover{background:#F7F0E4;color:#B8894A}" +
      ".sn-search-btn{cursor:pointer;padding:8px 12px;border-radius:8px;color:#33415c}" +
      ".sn-search-btn:hover{background:#eef3f8}" +
      ".sn-overlay{position:fixed;inset:0;background:rgba(15,23,42,.42);display:none;z-index:200;align-items:flex-start;justify-content:center;padding-top:12vh}" +
      ".sn-overlay.show{display:flex}" +
      ".sn-search-box{width:min(680px,92vw);background:#fff;border-radius:14px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.25)}" +
      ".sn-search-box input{width:100%;padding:12px 14px;font-size:16px;border:1px solid #CBD2D9;border-radius:10px;outline:none}" +
      ".sn-search-box input:focus{border-color:#B8894A}" +
      ".sn-res{max-height:56vh;overflow:auto;margin-top:10px}" +
      ".sn-res a{display:block;padding:10px 12px;border-radius:8px;color:#1F2933;text-decoration:none}" +
      ".sn-res a:hover{background:#F7F0E4}" +
      ".sn-res .k{color:#B8894A;font-size:12px;margin-right:8px}" +
      ".sn-res .e{padding:18px;text-align:center;color:#7B8794}";
    document.head.appendChild(s);
  }

  function buildTopNav() {
    injectNavCss();
    var links = document.getElementById("snLinks");
    if (links) {
      var cur = location.pathname.replace(/^\//, "").toLowerCase();
      var html = "";
      BOARDS.forEach(function (b) {
        var on = (href(b.p).replace(/^\//, "").toLowerCase().indexOf(cur) === 0 || cur.indexOf(b.p.replace(/^\//, "").toLowerCase()) === 0) ? " on" : "";
        html += '<span class="sn-board"><a class="' + (on ? "on" : "") + '" href="' + href(b.p) + '">' + b.t + " ▾</a><span class=\"sn-dd\">";
        b.items.forEach(function (it) {
          html += '<a href="' + href(it.p) + '">' + it.t + "</a>";
        });
        html += "</span></span>";
      });
      html += '<span class="sn-search-btn" id="snSearch">🔍 搜索</span>';
      links.innerHTML = html;
      var sb = document.getElementById("snSearch");
      if (sb) sb.addEventListener("click", openSearch);
    }
    var logo = document.querySelector(".sn-logo");
    if (logo) {
      logo.setAttribute("href", href("index.html"));
      logo.innerHTML = '<span class="gem">收</span><span>RMC收益管理社区</span>';
    }
    var cta = document.querySelector(".sn-cta");
    if (cta) { cta.setAttribute("href", href("games/index.html")); cta.textContent = "开始练"; }
  }

  /* ---------- 全站搜索 ---------- */
  function buildSearchIndex() {
    var idx = [];
    BOARDS.forEach(function (b) {
      idx.push({ k: b.t, t: b.t, p: b.p });
      b.items.forEach(function (it) { idx.push({ k: it.t, t: it.t, p: it.p }); });
    });
    (window.GJP_EPISODES || []).forEach(function (e) {
      idx.push({ k: e.title + " " + (e.en || ""), t: "▶ " + e.title, p: "gejijipo-player.html?id=" + e.id });
    });
    (window.GJP_GLOSSARY || []).forEach(function (g) {
      idx.push({ k: g.k + " " + (g.def || ""), t: "名词：" + g.k, p: g.video ? "gejijipo-player.html?id=" + g.video : (g.anchor || "codex.html") });
    });
    return idx;
  }
  function openSearch() {
    var ov = document.getElementById("snOverlay");
    if (!ov) {
      ov = document.createElement("div");
      ov.className = "sn-overlay"; ov.id = "snOverlay";
      ov.innerHTML = '<div class="sn-search-box"><input type="text" placeholder="搜索概念 / 视频 / 板块 / 名词…" id="snQ"><div class="sn-res" id="snRes"></div></div>';
      document.body.appendChild(ov);
      ov.addEventListener("click", function (e) { if (e.target === ov) ov.classList.remove("show"); });
      var q = ov.querySelector("#snQ");
      q.addEventListener("input", function () {
        var kw = q.value.trim().toLowerCase(), res = ov.querySelector("#snRes");
        if (!kw) { res.innerHTML = ""; return; }
        var list = buildSearchIndex().filter(function (x) { return x.k.toLowerCase().indexOf(kw) >= 0; }).slice(0, 30);
        if (!list.length) { res.innerHTML = '<div class="e">没有匹配结果</div>'; return; }
        res.innerHTML = list.map(function (x) {
          return '<a href="' + href(x.p) + '"><span class="k">跳转</span>' + x.t + "</a>";
        }).join("");
      });
    }
    ov.classList.add("show");
    setTimeout(function () { var i = ov.querySelector("#snQ"); if (i) i.focus(); }, 30);
  }

  /* ---------- 法典搜索 / 筛选 ---------- */
  function initCodex() {
    var bar = document.getElementById("codexFilter");
    if (!bar) return;

    var input = bar.querySelector("input[type=text]");
    var chips = Array.prototype.slice.call(bar.querySelectorAll(".chip[data-cat]"));
    var blocks = Array.prototype.slice.call(document.querySelectorAll("[data-codex-block]"));
    var counter = document.getElementById("codexCount");
    var cat = "all";

    function apply() {
      var q = (input && input.value ? input.value : "").trim().toLowerCase();
      var shown = 0;
      blocks.forEach(function (b) {
        var bcat = b.getAttribute("data-cat") || "";
        var okCat = cat === "all" || bcat.indexOf(cat) >= 0;
        var okQ = !q || b.textContent.toLowerCase().indexOf(q) >= 0;
        var vis = okCat && okQ;
        b.style.display = vis ? "" : "none";
        if (vis) shown++;
      });
      if (counter) counter.textContent = shown + " / " + blocks.length;
      var noHit = document.getElementById("codexEmpty");
      if (noHit) noHit.style.display = shown === 0 ? "" : "none";
    }

    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        chips.forEach(function (x) { x.classList.remove("on"); });
        c.classList.add("on");
        cat = c.getAttribute("data-cat");
        apply();
      });
    });
    if (input) input.addEventListener("input", apply);
    apply();
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-hit]"), function (td) {
    td.classList.add("hit");
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      var input = document.querySelector("#codexFilter input[type=text]");
      if (input) { e.preventDefault(); input.focus(); }
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    buildTopNav();
    buildNav();
    initCodex();
    injectGlobalUX();
  });

  /* ---------- 全站 UX 增强：左侧目录 / 名词解释 / 表格预览 ---------- */
  function injectGlobalUX() {
    var css = document.createElement("link");
    css.rel = "stylesheet"; css.href = href("assets/css/global-ux.css");
    document.head.appendChild(css);
    var seq = [href("glossary-data.js"), href("gejijipo-data.js"), href("assets/previews-map.js"), href("assets/js/global-ux.js")];
    var i = 0;
    (function next() {
      if (i >= seq.length) return;
      var s = document.createElement("script");
      s.src = seq[i++];
      s.onload = next; s.onerror = next;
      document.head.appendChild(s);
    })();
  }
})();
