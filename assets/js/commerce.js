/* ==========================================================================
 * RMC 收益管理社区 · 商业变现数据层
 * 依赖：supabase-js（window.supabase）、auth-config.js（window.HRMA_SUPABASE）、auth.js（window.HRMAuth）
 * 自建一个与 auth.js 共享 localStorage 会话的客户端，专做商业层读写。
 * 所有用户内容渲染前必须经 esc() 转义，防止 XSS。
 * ========================================================================== */
window.RMCCommerce = (function () {
  "use strict";

  var _c = null;
  function client() {
    if (_c) return _c;
    if (!window.supabase || !window.HRMA_SUPABASE) return null;
    try {
      _c = window.supabase.createClient(
        window.HRMA_SUPABASE.url,
        window.HRMA_SUPABASE.anonKey
      );
    } catch (e) { _c = null; }
    return _c;
  }

  // HTML 转义，所有用户内容渲染前必过此函数
  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // 相对路径前缀（子目录页用 ../）
  function prefix() {
    return /\/((community|courses|exam|games|core|airline|attraction|entertainment|fnb|theater|benchmark))\/.*\.html$/.test(location.pathname)
      ? "../" : "";
  }

  // 必须登录；未登录跳登录页并带 redirect
  async function requireLogin(redirect) {
    var s = await window.HRMAuth.session();
    if (s && s.user) return s;
    var to = encodeURIComponent(redirect || (location.pathname + location.search));
    location.href = prefix() + "login.html?redirect=" + to;
    return null;
  }

  // 当前用户 id
  async function uid() {
    var u = await client().auth.getUser();
    return (u.data && u.data.user) ? u.data.user.id : null;
  }

  /* ---------------- 订单 ---------------- */

  // 创建订单：kind = membership|course|consult|job_post
  async function createOrder(d) {
    if (!await requireLogin()) return null;
    var c = client(); if (!c) return null;
    var id = await uid(); if (!id) return null;
    var row = {
      user_id: id,
      kind: d.kind,
      ref_id: d.ref_id || null,
      amount: Number(d.amount) || 0,
      status: "pending",
      note: d.note || null
    };
    var r = await c.from("orders").insert(row).select().single();
    if (r.error) { console.error("createOrder:", r.error); return null; }
    return r.data; // { id, ... }
  }

  // 我的订单
  async function myOrders() {
    var c = client(); if (!c) return [];
    var id = await uid(); if (!id) return [];
    var r = await c.from("orders").select("*")
      .eq("user_id", id).order("created_at", { ascending: false });
    return r.data || [];
  }

  // 单个订单（仅本人可读）
  async function getOrder(id) {
    var c = client(); if (!c || !id) return null;
    var r = await c.from("orders").select("*").eq("id", id).maybeSingle();
    return r.data || null;
  }

  // 占位“我已支付”：调用 security definer 函数（真实网关上线后由回调替代）
  async function confirmPayment(orderId, plan) {
    var c = client(); if (!c) return { ok: false, msg: "no client" };
    var r = await c.rpc("confirm_payment", { p_order: orderId, p_plan: plan || null });
    if (r.error) { console.error("confirmPayment:", r.error); return { ok: false, msg: r.error.message }; }
    return r.data || { ok: false };
  }

  // 放弃订单：调用 security definer 函数（仅置 cancelled）
  async function cancelOrder(orderId) {
    var c = client(); if (!c) return { ok: false, msg: "no client" };
    var r = await c.rpc("cancel_order", { p_order: orderId });
    if (r.error) { console.error("cancelOrder:", r.error); return { ok: false, msg: r.error.message }; }
    return r.data || { ok: false };
  }

  // 调用支付下单 Edge Function（gateway: stripe | wechat | alipay）
  // 返回 { ok, type:'redirect'|'qr', url, code_url }
  async function createPayment(orderId, gateway) {
    if (!await requireLogin()) return { ok: false, msg: "no login" };
    var c = client(); if (!c) return { ok: false, msg: "no client" };
    try {
      var r = await c.functions.invoke("payment-create", {
        body: { order_id: orderId, gateway: gateway }
      });
      if (r.error) return { ok: false, msg: r.error.message };
      var d = r.data || {};
      return Object.assign({ ok: true }, d);
    } catch (e) {
      return { ok: false, msg: String(e && e.message || e) };
    }
  }

  // 轮询订单状态（支付后确认是否已到账）
  async function pollOrder(orderId, onPaid, tries) {
    tries = tries || 20;
    var n = 0;
    var timer = setInterval(async function () {
      n++;
      var o = await getOrder(orderId);
      if (o && o.status === "paid") { clearInterval(timer); onPaid(o); return; }
      if (n >= tries) clearInterval(timer);
    }, 2500);
  }

  /* ---------------- 专家目录 ---------------- */

  async function listExperts() {
    var c = client(); if (!c) return [];
    var r = await c.from("experts").select("*")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });
    return r.data || [];
  }

  /* ---------------- 招聘 ---------------- */

  async function listJobs() {
    var c = client(); if (!c) return [];
    var r = await c.from("jobs").select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    return r.data || [];
  }

  async function postJob(d) {
    if (!await requireLogin()) return null;
    var c = client(); if (!c) return null;
    var id = await uid(); if (!id) return null;
    var row = {
      company: d.company,
      title: d.title,
      industry: d.industry,
      jtype: d.jtype || "fulltime",
      city: d.city || null,
      salary: d.salary || null,
      description: d.description || null,
      contact: d.contact || null,
      status: "open",
      posted_by: id
    };
    var r = await c.from("jobs").insert(row).select().single();
    if (r.error) { console.error("postJob:", r.error); return null; }
    return r.data;
  }

  return {
    client: client, esc: esc, prefix: prefix, requireLogin: requireLogin,
    createOrder: createOrder, myOrders: myOrders, getOrder: getOrder, confirmPayment: confirmPayment, cancelOrder: cancelOrder,
    createPayment: createPayment, pollOrder: pollOrder,
    listExperts: listExperts, listJobs: listJobs, postJob: postJob
  };
})();
