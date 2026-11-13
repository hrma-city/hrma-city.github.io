/* 阅读辅助：为长文页补左侧可点目录与完整打印（逐章起新页 + 打印目录）
   只在引入本脚本的页面生效；已有目录或已有打印样式的页面不会被重复处理。 */
(function () {
  "use strict";
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }
  ready(function () {
    var heads = [].slice.call(document.querySelectorAll("h2, h3"));

    var hasToc = document.querySelector(
      "#rm-toc-drawer, #toc, .toc-body, .sidenav, .rm-toc, nav[aria-label='章节目录']"
    );
    var hasPrint = false;
    [].slice.call(document.styleSheets).forEach(function (ss) {
      try {
        [].slice.call(ss.cssRules || []).forEach(function (r) {
          if (r.type === CSSRule.MEDIA_RULE && /print/.test(r.conditionText || r.media.mediaText)) hasPrint = true;
        });
      } catch (e) {}
    });
    // 页面内联 <style> 里的 @media print 也算
    [].slice.call(document.querySelectorAll("style")).forEach(function (st) {
      if (/@media\s+print/.test(st.textContent || "")) hasPrint = true;
    });

    var items = [];
    heads.forEach(function (h, i) {
      if (!h.id) h.id = "ra-sec-" + i;
      var txt = (h.textContent || "").replace(/\s+/g, " ").trim();
      if (!txt) return;
      items.push({ id: h.id, text: txt.slice(0, 46), level: h.tagName === "H2" ? 2 : 3 });
    });
    var canToc = items.length >= 3;   // 章节标题不足的页不生成目录，但仍补打印样式
    if (!canToc && hasToc && hasPrint) return;   // 什么都不缺

    /* ---------- 1. 左侧可点目录 ---------- */
    if (!hasToc && canToc) {
      var st = document.createElement("style");
      st.setAttribute("data-reading-aid", "1");
      st.textContent =
        ".ra-toc{position:fixed;left:14px;top:96px;width:206px;max-height:70vh;overflow:auto;" +
        "background:#fff;border:1px solid #dbe4ee;border-radius:10px;padding:10px 12px;" +
        "box-shadow:0 4px 18px rgba(15,42,74,.08);z-index:60;font-size:12.5px;line-height:1.6}" +
        ".ra-toc b{display:block;font-size:12px;color:#5a6675;letter-spacing:1px;margin-bottom:6px}" +
        ".ra-toc a{display:block;color:#33465c;text-decoration:none;padding:2px 0;overflow:hidden;" +
        "text-overflow:ellipsis;white-space:nowrap}" +
        ".ra-toc a:hover{color:#1b4a7a}" +
        ".ra-toc a.lv3{padding-left:12px;color:#5a6675;font-size:12px}" +
        ".ra-toc a.active{color:#1b4a7a;font-weight:700}" +
        "@media(max-width:1100px){.ra-toc{display:none}}" +
        "@media print{.ra-toc{display:none!important}}";
      document.head.appendChild(st);

      var box = document.createElement("nav");
      box.className = "ra-toc";
      box.setAttribute("aria-label", "阅读目录");
      var html = "<b>本页目录</b>";
      items.forEach(function (it) {
        html += '<a href="#' + it.id + '" class="' + (it.level === 3 ? "lv3" : "") + '">' +
          it.text.replace(/[<>&]/g, function (c) { return { "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]; }) +
          "</a>";
      });
      box.innerHTML = html;
      document.body.appendChild(box);

      var links = [].slice.call(box.querySelectorAll("a"));
      function onScroll() {
        var cur = null;
        items.forEach(function (it, i) {
          var el = document.getElementById(it.id);
          if (el && el.getBoundingClientRect().top <= 150) cur = i;
        });
        links.forEach(function (a, i) { a.classList.toggle("active", i === cur); });
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    /* ---------- 2. 完整打印：逐章起新页 + 打印目录 ---------- */
    if (!hasPrint) {
      var pst = document.createElement("style");
      pst.setAttribute("data-reading-aid", "print");
      pst.textContent =
        "@media print{" +
        "body{background:#fff}" +
        "h2,h3{page-break-before:always;break-before:page;page-break-inside:avoid;break-inside:avoid}" +
        "h2:first-of-type,h3:first-of-type{page-break-before:auto;break-before:auto}" +
        "table,pre,.box,.warn,.ok,.card{page-break-inside:avoid;break-inside:avoid}" +
        "button,.btn,.ra-toc,#rm-toc-toggle,#rm-toc-drawer,#hrmaNav,.site-nav," +
        "nav[aria-label='章节目录'],.toolbar,.actions{display:none!important}" +
        "a[href^='http']:after{content:' (' attr(href) ')';font-size:9pt;color:#555}" +
        ".ra-print-toc{display:block!important}" +
        "}" +
        ".ra-print-toc{display:none;margin:0 0 18px;padding:12px 16px;border:1px solid #ccc;" +
        "border-radius:6px;font-size:11pt;line-height:1.8}" +
        ".ra-print-toc b{display:block;margin-bottom:6px}" +
        ".ra-print-toc a{color:#1a2330;text-decoration:none;display:block}";
      document.head.appendChild(pst);
    }

    // 打印目录（打印时可见，屏幕隐藏）；已有自带目录的页不再重复插入
    if (!hasToc && canToc) {
      var ptoc = document.createElement("div");
      ptoc.className = "ra-print-toc";
      var ph = "<b>目录</b>";
      items.forEach(function (it) {
        ph += '<a href="#' + it.id + '">' +
          it.text.replace(/[<>&]/g, function (c) { return { "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]; }) +
          "</a>";
      });
      ptoc.innerHTML = ph;
      document.body.insertBefore(ptoc, document.body.firstChild);
    }
  });
})();
