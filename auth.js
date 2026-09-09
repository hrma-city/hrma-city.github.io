/* ==========================================================================
   HRMA 学院官网 · 鉴权核心
   --------------------------------------------------------------------------
   公开页面：index / about / contact / login / register / pending
   受保护页面：codex / curriculum / courses/* / exam/* / games/* / resources
   受保护页面只需引入本文件 + auth.js，会自动校验登录与审批状态。
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.HRMA_SUPABASE || {};
  var ADMINS = window.HRMA_ADMIN_EMAILS || [];
  var CONTACT = window.HRMA_CONTACT_EMAIL || "";

  var _sb = null;
  function sb() {
    if (_sb) return _sb;
    if (!window.supabase || !CFG.url || !CFG.anonKey) return null;
    try {
      _sb = window.supabase.createClient(CFG.url, CFG.anonKey);
    } catch (e) { _sb = null; }
    return _sb;
  }

  function configured() {
    return !!(CFG.url && CFG.anonKey &&
              /^https:\/\/.+\.supabase\.co/.test(CFG.url) &&
              CFG.anonKey.length > 40);
  }

  function isAdmin(email) {
    return ADMINS.indexOf((email || "").toLowerCase()) >= 0;
  }

  /* ---------- 会话与档案 ---------- */
  async function session() {
    var c = sb(); if (!c) return null;
    var r = await c.auth.getSession();
    return (r && r.data && r.data.session) || null;
  }

  async function profile() {
    var c = sb(); if (!c) return null;
    var s = await session(); if (!s) return null;
    var r = await c.from("profiles")
      .select("*")
      .eq("id", s.user.id)
      .maybeSingle();
    return (r && r.data) || null;
  }

  async function signUp(email, password, extra) {
    var c = sb(); if (!c) throw new Error("鉴权未配置");
    extra = extra || {};
    var r = await c.auth.signUp({
      email: email,
      password: password,
      // 把所有申请字段写进 auth metadata，触发器据此写入 profiles，
      // 即使开启邮箱确认导致后续 upsert 被 RLS 拦截，资料也不会丢。
      options: { data: {
        full_name: extra.full_name || "",
        org: extra.org || "",
        role_text: extra.role_text || "",
        phone: extra.phone || "",
        reason: extra.reason || ""
      } }
    });
    if (r.error) throw r.error;
    // 写入 profiles（触发器若已建则忽略冲突）；邮箱确认未过时此步可能被 RLS 拦，靠触发器兜底
    if (r.data && r.data.user) {
      try {
        await c.from("profiles").upsert({
          id: r.data.user.id,
          email: email,
          full_name: extra.full_name || "",
          org: extra.org || "",
          role_text: extra.role_text || "",
          phone: extra.phone || "",
          reason: extra.reason || "",
          status: "pending",
          updated_at: new Date().toISOString()
        }, { onConflict: "id" });
      } catch (e) { /* 由触发器兜底 */ }
    }
    return r.data;
  }

  async function signIn(email, password) {
    var c = sb(); if (!c) throw new Error("鉴权未配置");
    var r = await c.auth.signInWithPassword({ email: email, password: password });
    if (r.error) throw r.error;
    return r.data;
  }

  async function signOut() {
    var c = sb(); if (!c) return;
    await c.auth.signOut();
  }

  /* ---------- 管理员：审批 ---------- */
  async function adminList(status) {
    var c = sb(); if (!c) throw new Error("鉴权未配置");
    var q = c.from("profiles").select("*").order("created_at", { ascending: false });
    if (status && status !== "all") q = q.eq("status", status);
    var r = await q;
    if (r.error) throw r.error;
    return r.data || [];
  }

  async function adminSetStatus(id, status, note) {
    var c = sb(); if (!c) throw new Error("鉴权未配置");
    var s = await session();
    var r = await c.from("profiles").update({
      status: status,
      note: note || "",
      reviewed_at: new Date().toISOString(),
      reviewed_by: (s && s.user && s.user.email) || ""
    }).eq("id", id);
    if (r.error) throw r.error;
    return true;
  }

  /* ---------- 页面守卫 ---------- */
  var OVERLAY_ID = "hrmaAuthOverlay";

  function showBox(html) {
    var d = document.createElement("div");
    d.id = OVERLAY_ID;
    d.innerHTML =
      '<div class="auth-mask"><div class="auth-box">' + html + "</div></div>";
    document.body.appendChild(d);
    // 隐藏正文，避免闪现
    var m = document.querySelector(".layout") || document.querySelector("main");
    if (m) m.style.visibility = "hidden";
  }

  function pass() {
    var o = document.getElementById(OVERLAY_ID);
    if (o) o.remove();
    var m = document.querySelector(".layout") || document.querySelector("main");
    if (m) m.style.visibility = "";
    injectAccountChip();
  }

  function go(url) {
    // 用完整 pathname（含前导 / 与子目录），登录后从根目录按绝对路径跳回，
    // 避免子目录页只存文件名导致跳错位置。
    var here = location.pathname || "/index.html";
    location.href = url + (url.indexOf("?") < 0 ? "?" : "&") +
      "redirect=" + encodeURIComponent(here);
  }

  async function guard(opts) {
    opts = opts || {};
    showBox('<div class="auth-spin"></div><p class="auth-tip">正在验证登录状态…</p>');

    if (!configured()) {
      showBox(
        '<div class="auth-h">鉴权未配置</div>' +
        '<p class="auth-p">本页需要登录后访问，但网站还没有接入 Supabase。</p>' +
        '<p class="auth-p">管理员请打开 <code>auth-config.js</code>，' +
        '填入 Project URL 与 anon key，然后重新部署。' +
        '步骤见同目录 <code>supabase-setup.md</code>。</p>' +
        '<p class="auth-p"><a href="index.html">← 返回首页</a></p>'
      );
      return;
    }

    if (!window.supabase) {
      showBox('<div class="auth-h">依赖加载失败</div>' +
              '<p class="auth-p">无法加载 Supabase 客户端，请检查网络后刷新。</p>');
      return;
    }

    var s;
    try { s = await session(); }
    catch (e) {
      showBox('<div class="auth-h">连接失败</div><p class="auth-p">' +
              (e.message || e) + "</p>");
      return;
    }

    if (!s) { go(prefix() + "login.html"); return; }

    // 管理员后台：仅管理员可进，且不受自身审批状态限制（可自助审批自己与他人）
    if (opts.admin) {
      if (!isAdmin(s.user.email)) {
        showBox('<div class="auth-h">无权限</div>' +
                '<p class="auth-p">本页面仅管理员可访问。</p>' +
                '<p class="auth-p"><a href="index.html">← 返回首页</a></p>');
        return;
      }
      pass();
      return;
    }

    // 管理员访问普通受保护页：始终放行
    if (isAdmin(s.user.email)) { pass(); return; }

    // 普通用户：按审批状态门禁
    var p = null;
    try { p = await profile(); } catch (e) { p = null; }

    if (!p) { go(prefix() + "pending.html?state=noprofile"); return; }
    if (p.status === "pending") { go(prefix() + "pending.html?state=pending"); return; }
    if (p.status === "rejected") {
      go(prefix() + "pending.html?state=rejected&note=" +
         encodeURIComponent(p.note || ""));
      return;
    }
    if (p.status !== "approved") {
      go(prefix() + "pending.html?state=unknown");
      return;
    }
    pass();
  }

  function prefix() {
    // 受保护页面在子目录时，需要回到根目录
    return /\/((courses|exam|games|core|airline|attraction|entertainment|fnb|templates|data|ppt|theater|benchmark|community))\//.test(location.pathname)
      ? "../" : "";
  }

  /* ---------- 右上角账号条 ---------- */
  function addLoginLink() {
    // 未登录的公开页：在主导航追加「登录」入口，让账户区可被找到
    var nav = document.getElementById("snLinks");
    if (!nav) return;
    if (nav.querySelector('a[href="login.html"]') ||
        nav.querySelector('a[href="../login.html"]')) return; // 已有则跳过
    var a = document.createElement("a");
    a.href = prefix() + "login.html";
    a.textContent = "登录";
    a.className = "hrma-login-link";
    nav.appendChild(a);
  }

  async function injectAccountChip() {
    if (document.getElementById("hrmaChip")) return;
    var s = await session();
    if (!s) { addLoginLink(); return; }
    var chip = document.createElement("div");
    chip.id = "hrmaChip";
    chip.innerHTML =
      '<span class="chip-mail">' + (s.user.email || "") + "</span>" +
      (isAdmin(s.user.email) ? '<a class="chip-ad" href="' + prefix() + 'admin.html">管理后台</a>' : "") +
      '<button class="chip-out" id="hrmaOut">退出</button>';
    document.body.appendChild(chip);
    document.getElementById("hrmaOut").onclick = async function () {
      await signOut();
      location.href = prefix() + "login.html";
    };
  }

  window.HRMAAuth = {
    configured: configured, isAdmin: isAdmin,
    session: session, profile: profile,
    signUp: signUp, signIn: signIn, signOut: signOut,
    adminList: adminList, adminSetStatus: adminSetStatus,
    guard: guard, prefix: prefix, contact: CONTACT
  };

  // 自动守卫：带 data-auth 属性的页面
  document.addEventListener("DOMContentLoaded", function () {
    var b = document.body;
    if (!b) return;
    var mode = b.getAttribute("data-auth");
    if (mode === "protected") guard();
    else if (mode === "admin") guard({ admin: true });
    else if (mode === "public") injectAccountChip();
  });
})();
