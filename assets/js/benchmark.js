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

  /* ================= 社区共建样本池（Supabase） ================= */
  var _c = null;
  function client() {
    if (_c) return _c;
    if (!window.supabase || !window.HRMA_SUPABASE) return null;
    try {
      _c = window.supabase.createClient(window.HRMA_SUPABASE.url, window.HRMA_SUPABASE.anonKey);
    } catch (e) { _c = null; }
    return _c;
  }

  function prefix() {
    return /\/((community|courses|exam|games|core|airline|attraction|entertainment|fnb|theater|benchmark))\/.*\.html$/.test(location.pathname)
      ? "../" : "";
  }

  async function requireLogin() {
    if (!window.HRMAAuth) return null;
    var s = await window.HRMAAuth.session();
    if (s && s.user) return s;
    location.href = prefix() + "login.html?redirect=" +
      encodeURIComponent(location.pathname + location.search);
    return null;
  }

  async function uid() {
    var c = client(); if (!c) return null;
    var u = await c.auth.getUser();
    return (u.data && u.data.user) ? u.data.user.id : null;
  }

  // 上报一个月度数据点；同人同城同月自动覆盖（唯一索引防灌水）
  async function submitPoint(d) {
    if (!await requireLogin()) return { ok: false, msg: "请先登录" };
    var c = client(); if (!c) return { ok: false, msg: "组件未加载" };
    var id = await uid(); if (!id) return { ok: false, msg: "请先登录" };
    var row = {
      user_id: id,
      city: d.city,
      month: d.month,
      adr: Number(d.adr),
      occ: Number(d.occ),
      rooms: d.rooms ? Number(d.rooms) : null,
      property_type: d.property_type || "other",
      status: "approved"
    };
    var r = await c.from("benchmark_points")
      .upsert(row, { onConflict: "user_id,city,month" })
      .select().single();
    if (r.error) return { ok: false, msg: r.error.message };
    return { ok: true, data: r.data };
  }

  // 聚合池（视图已保证 n>=3 才出现）
  async function listPool(city) {
    var c = client(); if (!c) return [];
    var q = c.from("benchmark_pool").select("*");
    if (city) q = q.eq("city", city);
    var r = await q.order("city").order("month", { ascending: false });
    return r.data || [];
  }

  // 我自己的上报（用于修改/核对）
  async function myPoints() {
    var c = client(); if (!c) return [];
    var id = await uid(); if (!id) return [];
    var r = await c.from("benchmark_points").select("*")
      .eq("user_id", id).order("month", { ascending: false });
    return r.data || [];
  }

  return {
    get: get, renderGroup: renderGroup, renderMonthly: renderMonthly, init: init,
    esc: esc, client: client, prefix: prefix, requireLogin: requireLogin,
    submitPoint: submitPoint, listPool: listPool, myPoints: myPoints
  };
})();
