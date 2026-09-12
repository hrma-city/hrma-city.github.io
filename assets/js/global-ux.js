/* ============================================================
   全局 UX 增强引擎
   1) 左侧目录抽屉（板块 + 各个击破全集 + 法典判定表 + 名词解释开关）
   2) 名词解释浮窗（高亮 + 浮起文字 + 解说视频链接 + 不再显示）
   3) 法典“表 X”自动链接
   4) 表格内联预览（CSV 原生 / XLSX 走 SheetJS，失败回退下载）
   全部通过 app.js 注入，站点任意页面生效。
   ============================================================ */
(function () {
  "use strict";
  var HREF = window.HRMA_href || function (p) { return p; };
  var GLOSS = window.GJP_GLOSSARY || [];
  var EPS = window.GJP_EPISODES || [];
  var PARTS = window.GJP_PARTS || [];
  var LS_OFF = "hrma_gloss_off";
  var STORE = (function () { try { return window.localStorage; } catch (e) { return null; } })();

  var SECTIONS = [
    { t: "首页", p: "index.html", ic: "⌂" },
    { t: "学院", p: "academy.html", ic: "院" },
    { t: "资源", p: "resources.html", ic: "⚙" },
    { t: "书籍", p: "books.html", ic: "书" },
    { t: "各个击破", p: "gejijipo.html", ic: "▶" },
    { t: "游戏", p: "games/index.html", ic: "游" },
    { t: "认证", p: "cert.html", ic: "证" },
    { t: "专家", p: "experts.html", ic: "专" },
    { t: "会员", p: "pricing.html", ic: "★" },
    { t: "基准", p: "benchmark/index.html", ic: "◈" },
    { t: "社区", p: "community.html", ic: "聊" },
    { t: "资讯", p: "news.html", ic: "闻" },
    { t: "行业矩阵", p: "industries.html", ic: "▦" }
  ];

  function curPath() { return location.pathname.replace(/^\//, "").toLowerCase(); }
  function isOn(p) { var lp = HREF(p).replace(/^\//, "").toLowerCase(); return lp && curPath() === lp; }

  /* ============ 1. 左侧目录抽屉 ============ */
  function buildDrawer() {
    var legacy = document.getElementById("sidebar");
    var drawer, mask, menuBtn;

    if (legacy) {
      // 复用既有侧边栏：追加“各个击破”与“名词解释”区块
      appendUxSections(legacy);
      return;
    }

    drawer = document.createElement("aside");
    drawer.className = "ux-drawer";
    drawer.id = "uxDrawer";
    drawer.innerHTML = drawerHTML(false);
    document.body.appendChild(drawer);

    mask = document.createElement("div");
    mask.className = "ux-mask";
    document.body.appendChild(mask);

    menuBtn = document.createElement("button");
    menuBtn.className = "ux-menu-btn";
    menuBtn.id = "uxMenuBtn";
    menuBtn.innerHTML = '<span class="dot"></span>目录';
    document.body.appendChild(menuBtn);

    function open() { drawer.classList.add("open"); mask.classList.add("show"); }
    function close() { drawer.classList.remove("open"); mask.classList.remove("show"); }
    menuBtn.addEventListener("click", open);
    mask.addEventListener("click", close);
    drawer.addEventListener("click", function (e) {
      if (e.target.closest("a.ux-lk, a.ux-ep")) close();
    });
    var x = drawer.querySelector(".ux-close");
    if (x) x.addEventListener("click", close);
  }

  function drawerHTML(legacy) {
    var cur = curPath();
    var html = "";
    if (!legacy) {
      html += '<button class="ux-close" aria-label="关闭">✕</button>' +
        '<div class="ux-brand">RMC 收益管理社区<small>随时跳转到任意板块 / 视频 / 判定表</small></div>';
      // 板块
      html += '<div class="ux-sec"><div class="ux-h">板块</div>';
      SECTIONS.forEach(function (s) {
        var on = isOn(s.p) ? " on" : "";
        html += '<a class="ux-lk' + on + '" href="' + HREF(s.p) + '"><span class="ux-ic">' + s.ic +
          '</span><span>' + s.t + '</span></a>';
      });
      html += "</div>";
    }

    // 各个击破全集
    if (EPS.length) {
      var q = location.search.match(/[?&]id=([^&]+)/);
      var curId = q ? q[1] : "";
      html += '<div class="ux-sec"><div class="ux-h">各个击破 · 1 分钟解说</div>';
      PARTS.forEach(function (pt) {
        html += '<div class="ux-part"><div class="ux-ph">' + pt.icon + " " + pt.name + "</div>";
        EPS.filter(function (e) { return e.part === pt.key; }).forEach(function (e) {
          var on = e.id === curId ? " on" : "";
          html += '<a class="ux-ep' + on + '" href="' + HREF("gejijipo-player.html?id=" + e.id) + '">' +
            e.no + ". " + e.title + "</a>";
        });
        html += "</div>";
      });
      html += "</div>";
    }

    // 法典判定表
    if (document.getElementById("table-a")) {
      html += '<div class="ux-sec"><div class="ux-h">法典 · 15 张判定表</div>';
      for (var i = 0; i < 15; i++) {
        var L = String.fromCharCode(65 + i);
        html += '<a class="ux-lk" href="#table-' + L.toLowerCase() + '"><span class="ux-ic">表</span>' +
          '<span>表 ' + L + '</span></a>';
      }
      html += "</div>";
    }

    // 名词解释开关
    var off = STORE && STORE.getItem(LS_OFF) === "1";
    html += '<div class="ux-toggle-row"><span>名词解释浮窗</span>' +
      '<button class="ux-sw' + (off ? "" : " on") + '" id="uxGlossSw" aria-label="名词解释开关"></button></div>' +
      '<div class="ux-note">熟练后可在浮窗里点“不再显示”关闭；这里可随时重新打开。</div>';
    return html;
  }

  // 追加到既有侧边栏
  function appendUxSections(legacy) {
    if (legacy.querySelector(".ux-sec")) return; // 防重复
    var wrap = document.createElement("div");
    wrap.innerHTML = drawerHTML(true);
    while (wrap.firstChild) legacy.appendChild(wrap.firstChild);

    var sw = legacy.querySelector("#uxGlossSw");
    if (sw) sw.addEventListener("click", function () { toggleGloss(this.classList.contains("on")); });
    legacy.addEventListener("click", function (e) {
      if (e.target.closest("a.ux-ep, a.ux-lk")) {
        var sb = document.getElementById("sidebar");
        if (sb) sb.classList.remove("open");
      }
    });
  }

  function toggleGloss(turnOn) {
    if (STORE) {
      if (turnOn) STORE.removeItem(LS_OFF); else STORE.setItem(LS_OFF, "1");
    }
    if (turnOn) { highlightTerms(); }
    else { unwrapTerms(); }
    // 同步所有开关
    document.querySelectorAll("#uxGlossSw").forEach(function (b) {
      b.classList.toggle("on", turnOn);
    });
  }

  /* ============ 2. 名词解释 ============ */
  function compileGloss() {
    GLOSS.forEach(function (en) {
      en._m = (en.a || [en.k]).map(function (al) {
        var isEn = /^[a-z0-9 ]+$/i.test(al);
        var re = isEn
          ? new RegExp("\\b" + al.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi")
          : new RegExp(al.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
        return { re: re, isEn: isEn };
      });
    });
  }

  function skipParent(el) {
    return el.closest("a,button,code,pre,script,style,table,.gterm,.ux-drawer,.gpop,.codex-ref,.ux-menu-btn");
  }

  function highlightTerms() {
    if (STORE && STORE.getItem(LS_OFF) === "1") return;
    var roots = document.querySelectorAll("main,.site-main,article,.content,#plyContent,.codex-block,.gjp-main,.gjp-wrap,.ply-wrap,.sec,.codex-intro");
    if (!roots.length) roots = [document.body];
    var nodes = [];
    roots.forEach(function (r) {
      var w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          if (skipParent(n.parentNode)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var n; while ((n = w.nextNode())) nodes.push(n);
    });
    nodes.forEach(wrapNode);
  }

  function wrapNode(node) {
    var text = node.nodeValue;
    var hits = [];
    GLOSS.forEach(function (en) {
      en._m.forEach(function (m) {
        m.re.lastIndex = 0;
        var mm;
        while ((mm = m.re.exec(text)) !== null) {
          if (mm[0].length === 0) { m.re.lastIndex++; continue; }
          hits.push({ s: mm.index, e: mm.index + mm[0].length, en: en, word: mm[0] });
        }
      });
    });
    if (!hits.length) return;
    hits.sort(function (a, b) { return a.s - b.s || (b.e - b.s) - (a.e - a.s); });
    var keep = [], last = -1;
    hits.forEach(function (h) { if (h.s >= last) { keep.push(h); last = h.e; } });

    var frag = document.createDocumentFragment(), cursor = 0;
    keep.forEach(function (h) {
      if (h.s > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, h.s)));
      var sp = document.createElement("span");
      sp.className = "gterm";
      sp.setAttribute("data-term", h.en.k);
      sp.setAttribute("tabindex", "0");
      sp.textContent = h.word;
      frag.appendChild(sp);
      cursor = h.e;
    });
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    node.parentNode.replaceChild(frag, node);
  }

  function unwrapTerms() {
    document.querySelectorAll(".gterm").forEach(function (sp) {
      sp.parentNode.replaceChild(document.createTextNode(sp.textContent), sp);
    });
    hidePop();
  }

  // 浮窗
  var pop = null, pinned = false, showTimer = null, hideTimer = null;
  function ensurePop() {
    if (pop) return pop;
    pop = document.createElement("div");
    pop.className = "gpop";
    pop.innerHTML = '<div class="gpop-h"><span class="gpop-t"></span>' +
      '<button class="gpop-x" aria-label="关闭">✕</button></div>' +
      '<p class="gpop-d"></p><div class="gpop-links"></div>' +
      '<button class="gpop-hide">不再显示此浮窗</button>';
    document.body.appendChild(pop);
    pop.querySelector(".gpop-x").addEventListener("click", hidePop);
    pop.querySelector(".gpop-hide").addEventListener("click", function () {
      if (STORE) STORE.setItem(LS_OFF, "1");
      unwrapTerms();
      document.querySelectorAll("#uxGlossSw").forEach(function (b) { b.classList.remove("on"); });
    });
    // 关键修复：鼠标在浮窗内时保持显示，移出浮窗才隐藏。
    // 否则从名词移到浮窗经过间隙时浮窗已消失，按钮/链接无法点击。
    pop.addEventListener("mouseenter", function () { clearTimeout(hideTimer); clearTimeout(showTimer); });
    pop.addEventListener("mouseleave", function () { scheduleHide(); });
    return pop;
  }

  function entryByKey(k) {
    for (var i = 0; i < GLOSS.length; i++) if (GLOSS[i].k === k) return GLOSS[i];
    return null;
  }

  function showPop(termEl) {
    var en = entryByKey(termEl.getAttribute("data-term"));
    if (!en) return;
    var p = ensurePop();
    p.querySelector(".gpop-t").textContent = en.k;
    p.querySelector(".gpop-d").textContent = en.def || "";
    var links = p.querySelector(".gpop-links");
    links.innerHTML = "";
    if (en.video) {
      var a = document.createElement("a");
      a.className = "gold";
      a.href = HREF("gejijipo-player.html?id=" + en.video);
      a.innerHTML = "▶ 看 1 分钟解说";
      links.appendChild(a);
    }
    if (en.anchor) {
      var b = document.createElement("a");
      b.href = en.anchor;
      b.innerHTML = "打开相关表 / 内容 →";
      b.addEventListener("click", hidePop);
      links.appendChild(b);
    }
    p.classList.add("show");
    positionPop(termEl);
  }

  function positionPop(termEl) {
    var r = termEl.getBoundingClientRect();
    var p = pop;
    var pw = p.offsetWidth, ph = p.offsetHeight;
    var left = r.left + r.width / 2 - pw / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - pw - 10));
    var top = r.bottom + 6;
    if (top + ph > window.innerHeight - 8) top = r.top - ph - 6;
    if (top < 8) top = 8;
    p.style.left = left + "px";
    p.style.top = top + "px";
  }

  function hidePop() { if (pop) pop.classList.remove("show"); pinned = false; }

  function scheduleShow(t) { clearTimeout(hideTimer); showTimer = setTimeout(function () { showPop(t); }, 120); }
  function scheduleHide() { clearTimeout(showTimer); hideTimer = setTimeout(function () { if (!pinned) hidePop(); }, 300); }

  function wireGlossEvents() {
    document.addEventListener("mouseover", function (e) {
      var t = e.target.closest && e.target.closest(".gterm"); if (t) scheduleShow(t);
    });
    document.addEventListener("mouseout", function (e) {
      var t = e.target.closest && e.target.closest(".gterm"); if (t) scheduleHide();
    });
    document.addEventListener("focusin", function (e) {
      var t = e.target.closest && e.target.closest(".gterm"); if (t) showPop(t);
    });
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest(".gterm");
      if (t) {
        e.preventDefault();
        pinned = !pinned;
        showPop(t);
      } else if (!e.target.closest(".gpop")) {
        hidePop();
      }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") hidePop(); });
    window.addEventListener("scroll", function () { if (!pinned) hidePop(); }, true);
  }

  /* ============ 3. 法典“表 X”自动链接 ============ */
  function linkifyCodex() {
    if (!document.getElementById("table-a")) return;
    var roots = document.querySelectorAll(".codex-block, .codex-intro, .sec");
    if (!roots.length) roots = [document.body];
    var re = /表\s*([A-O])/gi;
    var nodes = [];
    roots.forEach(function (r) {
      var w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          if (n.parentNode.closest(".badge-codex,a,.gterm,.codex-ref,script,style")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var n; while ((n = w.nextNode())) nodes.push(n);
    });
    nodes.forEach(function (node) {
      var text = node.nodeValue, hits = [], m;
      re.lastIndex = 0;
      while ((m = re.exec(text)) !== null) {
        hits.push({ s: m.index, e: m.index + m[0].length, L: m[1] });
      }
      if (!hits.length) return;
      var frag = document.createDocumentFragment(), cursor = 0;
      hits.forEach(function (h) {
        if (h.s > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, h.s)));
        var sp = document.createElement("span");
        sp.className = "gterm";
        sp.setAttribute("data-term", "表" + h.L);
        sp.setAttribute("tabindex", "0");
        sp.textContent = h[0];
        frag.appendChild(sp);
        cursor = h.e;
      });
      if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  /* ============ 4. 表格内联预览 ============ */
  var modal = null;
  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "tbl-modal";
    modal.innerHTML = '<div class="tbl-box"><div class="tbl-head"><h3></h3>' +
      '<div class="tbl-acts"><a class="gold" id="tblDl" href="#" download>下载</a>' +
      '<button id="tblClose">关闭</button></div></div>' +
      '<div class="tbl-body"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    modal.querySelector("#tblClose").addEventListener("click", closeModal);
    return modal;
  }
  function closeModal() { modal.classList.remove("show"); }

  function openTableModal(title, bodyHTML, dlHref) {
    var m = ensureModal();
    m.querySelector("h3").textContent = title;
    m.querySelector(".tbl-body").innerHTML = bodyHTML;
    var dl = m.querySelector("#tblDl");
    dl.href = dlHref; dl.setAttribute("download", "");
    m.classList.add("show");
  }

  function parseCSV(t) {
    var rows = [], row = [], f = "", q = false;
    for (var i = 0; i < t.length; i++) {
      var c = t[i];
      if (q) {
        if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else {
        if (c === '"') q = true;
        else if (c === ",") { row.push(f); f = ""; }
        else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
        else if (c === "\r") { /* skip */ }
        else f += c;
      }
    }
    if (f.length || row.length) { row.push(f); rows.push(row); }
    return rows;
  }

  function csvToHTML(rows) {
    if (!rows.length) return '<div class="tbl-msg">文件为空。</div>';
    var h = rows[0], out = "<table><thead><tr>";
    h.forEach(function (c) { out += "<th>" + esc(c) + "</th>"; });
    out += "</tr></thead><tbody>";
    for (var i = 1; i < rows.length; i++) {
      out += "<tr>";
      rows[i].forEach(function (c) { out += "<td>" + esc(c) + "</td>"; });
      out += "</tr>";
    }
    out += "</tbody></table>";
    return out;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, function (c) {
      return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;";
    }).replace(/\n/g, "<br>");
  }

  function initTablePreview() {
    var MAP = window.GJP_PREVIEWS || {};
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[download]');
      if (!a || e.target.closest(".tbl-modal")) return;
      var href = a.getAttribute("href") || "";
      var lower = href.toLowerCase();
      var isCSV = /\.csv($|\?)/.test(lower);
      var isXLSX = /\.xlsx($|\?)/.test(lower);
      if (!isCSV && !isXLSX) return;
      e.preventDefault();
      var url = a.href;
      var name = (href.split("/").pop().split("?")[0]) || "表格";
      // 优先用构建期生成的本地静态预览（离线、无 CDN、国内秒开）
      var pv = MAP[href] || MAP[href.replace(/^\.\//, "")];
      if (pv) {
        openPreview(name + "（在线预览）", HREF(pv), url);
        return;
      }
      // 兜底：无预览文件时，CSV 仍可原生解析预览；XLSX 回退下载
      if (isCSV) {
        openTableModal(name + "（预览）", '<div class="tbl-msg">加载中…</div>', url);
        fetch(url).then(function (r) { return r.text(); }).then(function (t) {
          ensureModal().querySelector(".tbl-body").innerHTML = csvToHTML(parseCSV(t));
        }).catch(function () {
          ensureModal().querySelector(".tbl-body").innerHTML =
            '<div class="tbl-msg">无法在线预览。请使用右上角“下载”按钮查看。</div>';
        });
      } else {
        openTableModal(name + "（预览）",
          '<div class="tbl-msg">该文件暂未生成在线预览，请使用右上角“下载”按钮用 Excel 打开。</div>', url);
      }
    });
  }

  // 打开本地静态预览（iframe，离线可用）
  function openPreview(title, pvUrl, dlHref) {
    var m = ensureModal();
    m.querySelector("h3").textContent = title;
    m.querySelector(".tbl-body").innerHTML =
      '<iframe class="tbl-iframe" src="' + pvUrl + '" title="' + title + '"></iframe>';
    var dl = m.querySelector("#tblDl");
    dl.href = dlHref; dl.setAttribute("download", "");
    m.classList.add("show");
  }

  /* ============ 初始化 ============ */
  function init() {
    compileGloss();
    buildDrawer();
    highlightTerms();
    linkifyCodex();
    wireGlossEvents();
    initTablePreview();

    // 侧边栏里的名词解释开关
    document.querySelectorAll("#uxGlossSw").forEach(function (b) {
      b.addEventListener("click", function () { toggleGloss(b.classList.contains("on")); });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
