/* ============================================================================
 * RMC 社区 · 全站站内通知中心
 * ----------------------------------------------------------------------------
 * 依赖：页面已引入 @supabase/supabase-js@2 与 auth-config.js
 *       window.HRMA_PREFIX 由页面注入（相对站点根的路径前缀）
 * 行为：未登录不显示；登录后显示铃铛 + 未读红点，点击展开抽屉。
 * ========================================================================== */
(function () {
  "use strict";

  var PFX = window.HRMA_PREFIX || "";
  var cfg = window.HRMA_SUPABASE || {};
  if (!window.supabase || !cfg.url || !cfg.anonKey) return;

  var sb;
  try { sb = window.supabase.createClient(cfg.url, cfg.anonKey); } catch (e) { return; }

  var uid = null, wrap = null, badge = null, dot = null, panel = null, items = null;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var KINDS = {
    reply:       { tag: "回复",   cls: "nb-k-reply" },
    approval:    { tag: "审核",   cls: "nb-k-approval" },
    payment:     { tag: "开通",   cls: "nb-k-payment" },
    exam:        { tag: "考核",   cls: "nb-k-exam" },
    certificate: { tag: "证书",   cls: "nb-k-cert" },
    membership:  { tag: "会员",   cls: "nb-k-mem" },
    system:      { tag: "系统",   cls: "nb-k-sys" }
  };

  function ago(iso) {
    var d = new Date(iso), s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return "刚刚";
    if (s < 3600) return Math.floor(s / 60) + " 分钟前";
    if (s < 86400) return Math.floor(s / 3600) + " 小时前";
    if (s < 86400 * 30) return Math.floor(s / 86400) + " 天前";
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }

  /* ---------------- UI ---------------- */
  function build() {
    if (wrap) return;

    wrap = document.createElement("div");
    wrap.className = "nb-wrap";
    wrap.innerHTML =
      '<button class="nb-bell" id="nbBell" aria-label="通知" title="通知">' +
        '<span class="nb-glyph"></span>' +
        '<span class="nb-dot" id="nbDot" hidden></span>' +
        '<span class="nb-count" id="nbCount" hidden>0</span>' +
      '</button>' +
      '<div class="nb-panel" id="nbPanel" hidden>' +
        '<div class="nb-head">' +
          '<b>通知</b>' +
          '<button class="nb-readall" id="nbReadAll">全部已读</button>' +
        '</div>' +
        '<div class="nb-list" id="nbList"><div class="nb-loading">加载中…</div></div>' +
      '</div>';

    // 优先嵌入已有静态导航，其次挂到页面右上角
    var host = document.querySelector(".sn-inner");
    var before = document.querySelector(".sn-cta");
    if (host && before) host.insertBefore(wrap, before);
    else if (host) host.appendChild(wrap);
    else document.body.appendChild(wrap);

    badge = document.getElementById("nbCount");
    dot = document.getElementById("nbDot");
    panel = document.getElementById("nbPanel");
    items = document.getElementById("nbList");

    document.getElementById("nbBell").onclick = function (e) {
      e.stopPropagation();
      toggle();
    };
    document.getElementById("nbReadAll").onclick = function (e) {
      e.stopPropagation();
      markAllRead();
    };
    document.addEventListener("click", function (e) {
      if (panel && !panel.hidden && wrap && !wrap.contains(e.target)) panel.hidden = true;
    });
  }

  function toggle() {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) loadList();
  }

  function setBadge(n) {
    if (!badge || !dot) return;
    if (n > 0) {
      badge.hidden = false;
      badge.textContent = n > 99 ? "99+" : String(n);
      dot.hidden = true;
    } else {
      badge.hidden = true;
      dot.hidden = true;
    }
  }

  /* ---------------- 数据 ---------------- */
  async function refreshCount() {
    if (!uid) return;
    try {
      var r = await sb.from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid).is("read_at", null);
      setBadge(r && r.count ? r.count : 0);
    } catch (e) { /* 静默 */ }
  }

  async function loadList() {
    if (!uid) return;
    var r;
    try {
      r = await sb.from("notifications").select("*")
        .eq("user_id", uid).order("created_at", { ascending: false }).limit(30);
    } catch (e) {
      items.innerHTML = '<div class="nb-empty">加载失败，请稍后重试</div>';
      return;
    }
    var rows = (r && r.data) || [];
    if (!rows.length) {
      items.innerHTML = '<div class="nb-empty">暂无通知</div>';
      return;
    }
    items.innerHTML = rows.map(function (n) {
      var k = KINDS[n.kind] || KINDS.system;
      return '<div class="nb-item' + (n.read_at ? "" : " nb-unread") + '" data-id="' + n.id + '"' +
             ' data-link="' + esc(n.link || "") + '">' +
               '<div class="nb-row"><span class="nb-tag ' + k.cls + '">' + k.tag + '</span>' +
               '<span class="nb-time">' + ago(n.created_at) + '</span></div>' +
               '<div class="nb-title">' + esc(n.title) + '</div>' +
               (n.body ? '<div class="nb-body">' + esc(n.body) + '</div>' : "") +
             '</div>';
    }).join("");

    Array.prototype.forEach.call(items.querySelectorAll(".nb-item"), function (el) {
      el.onclick = function () {
        open_(el.getAttribute("data-id"), el.getAttribute("data-link"));
      };
    });
  }

  async function open_(id, link) {
    if (id) {
      await sb.from("notifications")
        .update({ read_at: new Date().toISOString() }).eq("id", id);
    }
    if (link) {
      location.href = PFX + String(link).replace(/^\//, "");
      return;
    }
    await Promise.all([loadList(), refreshCount()]);
  }

  async function markAllRead() {
    if (!uid) return;
    await sb.from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", uid).is("read_at", null);
    await Promise.all([loadList(), refreshCount()]);
  }

  /* ---------------- 启动 ---------------- */
  (async function boot() {
    try {
      var r = await sb.auth.getSession();
      var s = r && r.data && r.data.session;
      if (!s || !s.user) return;
      uid = s.user.id;
      build();
      await refreshCount();
      setInterval(refreshCount, 45000);
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) refreshCount();
      });
    } catch (e) { /* 静默降级：通知不可用时不影响页面 */ }
  })();
})();
