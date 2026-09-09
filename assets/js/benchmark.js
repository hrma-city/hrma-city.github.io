/* ==========================================================================
 * RMC 行业基准 · 渲染器
 * 页面只需写 <div data-bench="lodging.official"></div>，本脚本自动渲染。
 * 数据全部来自 assets/js/benchmark-data.js（window.RMC_BENCHMARK）。
 * ========================================================================== */
window.RMCBench = (function () {
  "use strict";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function get(path) {
    var d = window.RMC_BENCHMARK;
    if (!d) return null;
    return path.split(".").reduce(function (o, k) {
      return (o && o[k] != null) ? o[k] : null;
    }, d);
  }

  var TIER = { official: "官方口径", third: "第三方样本", derived: "推算值" };
  function tierLabel(t) { return TIER[t] || t || "—"; }

  function srcBlock(key) {
    var S = (window.RMC_BENCHMARK && window.RMC_BENCHMARK.sources || {})[key];
    if (!S) return "";
    return '<a class="bsrc" href="' + esc(S.url) + '" target="_blank" rel="noopener">' + esc(S.name) + "</a>" +
           (S.pub ? '<span class="bpub">发布 ' + esc(S.pub) + "</span>" : "");
  }

  function renderGroup(group) {
    if (!group || !group.items) return '<p class="bm-sub">暂无数据。</p>';
    var h = "";
    if (group.caliber) h += '<div class="bcal">口径：' + esc(group.caliber) + "</div>";
    h += '<table class="btable"><thead><tr><th>指标</th><th>数值</th><th>同比</th><th>来源</th></tr></thead><tbody>';
    group.items.forEach(function (it) {
      h += "<tr>" +
        "<td>" + esc(it.k) + (it.note ? '<div class="bnote">' + esc(it.note) + "</div>" : "") + "</td>" +
        '<td class="bv">' + esc(it.v) + "</td>" +
        '<td class="by">' + esc(it.yoy || "—") + "</td>" +
        '<td class="bs"><span class="btier t-' + esc(it.tier) + '">' + esc(tierLabel(it.tier)) + "</span>" +
          srcBlock(it.src) + "</td>" +
        "</tr>";
    });
    h += "</tbody></table>";
    if (group.note) h += '<p class="bnote-blk">' + esc(group.note) + "</p>";
    return h;
  }

  /* 月度序列（城市级）：带条形可视化；空缺月份标「待补充」，绝不填推测值 */
  function renderMonthly(group) {
    if (!group || !group.rows) return '<p class="bm-sub">暂无数据。</p>';
    var max = 0;
    group.rows.forEach(function (r) { if (r.adr && r.adr > max) max = r.adr; });
    var h = "";
    if (group.caliber) h += '<div class="bcal">口径：' + esc(group.caliber) + "</div>";
    h += '<table class="btable"><thead><tr><th>月份</th><th>平均房价（元/间天）</th><th>同比</th><th>出租率</th><th>来源</th></tr></thead><tbody>';
    group.rows.forEach(function (r) {
      var cell = r.adr
        ? '<div class="bbar-wrap"><div class="bbar" style="width:' + (r.adr / max * 100).toFixed(1) +
          '%"></div><span class="bbar-v">' + esc(r.adr) + "</span></div>"
        : '<span class="bgap">待补充</span>';
      h += "<tr>" +
        "<td>" + esc(r.m) + "</td>" +
        "<td>" + cell + "</td>" +
        '<td class="by">' + esc(r.adrYoy || "—") + "</td>" +
        "<td>" + (r.occ ? esc(r.occ) + "%" : '<span class="bgap">待补充</span>') + "</td>" +
        '<td class="bs">' + (r.src ? srcBlock(r.src) : "") + "</td>" +
        "</tr>";
    });
    h += "</tbody></table>";
    return h;
  }

  function renderSources() {
    var S = (window.RMC_BENCHMARK && window.RMC_BENCHMARK.sources) || {};
    var h = '<div class="bsrcs"><ol>';
    Object.keys(S).forEach(function (k) {
      var s = S[k];
      h += '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + "</a>" +
           " <span style=\"color:var(--ink-3)\">· " + esc(s.org) + " · 发布 " + esc(s.pub) + "</span></li>";
    });
    h += "</ol></div>";
    return h;
  }

  function init() {
    var nodes = document.querySelectorAll("[data-bench]");
    Array.prototype.forEach.call(nodes, function (el) {
      el.innerHTML = renderGroup(get(el.getAttribute("data-bench")));
    });
    var mn = document.querySelectorAll("[data-bench-monthly]");
    Array.prototype.forEach.call(mn, function (el) {
      el.innerHTML = renderMonthly(get(el.getAttribute("data-bench-monthly")));
    });
    var sn = document.querySelectorAll("[data-bench-sources]");
    Array.prototype.forEach.call(sn, function (el) { el.innerHTML = renderSources(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }

  return { get: get, renderGroup: renderGroup, renderMonthly: renderMonthly, init: init };
})();
