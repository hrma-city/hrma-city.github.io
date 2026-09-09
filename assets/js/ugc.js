/* ==========================================================================
 * RMC 收益管理社区 · UGC 数据层
 * 依赖：supabase-js（window.supabase）、auth-config.js（window.HRMA_SUPABASE）、auth.js（window.HRMAAuth）
 * 自建一个与 auth.js 共享 localStorage 会话的客户端，专做 UGC 读写。
 * 所有用户内容渲染前必须经 esc() 转义，防止 XSS。
 * ========================================================================== */
window.RMCUGC = (function () {
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
  async function requireLogin() {
    var s = await window.HRMAAuth.session();
    if (s && s.user) return s;
    location.href = prefix() + "login.html?redirect=" +
      encodeURIComponent(location.pathname.split("/").pop() || "community/board.html");
    return null;
  }

  // 当前用户名（用于发帖署名）
  async function authorName() {
    var p = await window.HRMAAuth.profile();
    if (p && p.full_name) return p.full_name;
    var s = await window.HRMAAuth.session();
    if (s && s.user && s.user.email) return s.user.email.split("@")[0];
    return "匿名用户";
  }

  /* ---------------- 帖子 / 讨论 / 提问 ---------------- */
  async function listPosts(opt) {
    opt = opt || {};
    var c = client(); if (!c) return [];
    var q = c.from("posts").select("*").eq("status", "published");
    if (opt.board && opt.board !== "all") q = q.eq("board", opt.board);
    if (opt.type && opt.type !== "all") q = q.eq("type", opt.type);
    if (opt.q) q = q.ilike("title", "%" + opt.q + "%");
    q = q.order("created_at", { ascending: false })
         .range(opt.offset || 0, (opt.offset || 0) + (opt.limit || 30) - 1);
    var r = await q;
    return (r && r.data) || [];
  }

  async function getPost(id) {
    var c = client(); if (!c) return null;
    var p = await c.from("posts").select("*").eq("id", id).maybeSingle();
    var rs = await c.from("replies").select("*").eq("post_id", id)
                  .order("created_at", { ascending: true });
    return {
      post: (p && p.data) || null,
      replies: (rs && rs.data) || []
    };
  }

  async function createPost(d) {
    var s = await requireLogin(); if (!s) return null;
    var c = client(); if (!c) throw new Error("服务未就绪");
    var r = await c.from("posts").insert({
      author_id: s.user.id,
      author_name: await authorName(),
      board: d.board || "core",
      type: d.type || "discussion",
      title: d.title,
      body: d.body,
      tags: d.tags || []
    }).select().single();
    if (r.error) throw r.error;
    return r.data;
  }

  async function addReply(postId, body) {
    var s = await requireLogin(); if (!s) return null;
    var c = client(); if (!c) throw new Error("服务未就绪");
    var r = await c.from("replies").insert({
      post_id: postId,
      author_id: s.user.id,
      author_name: await authorName(),
      body: body,
      is_expert: window.HRMAAuth.isAdmin(s.user.email)
    }).select().single();
    if (r.error) throw r.error;
    return r.data;
  }

  async function vote(kind, id, delta) {
    var s = await window.HRMAAuth.session();
    if (!s) { await requireLogin(); return; }
    var c = client(); if (!c) return;
    await c.rpc("inc_votes", { tbl: kind, pid: id, delta: delta });
  }

  /* ---------------- 案例投稿 ---------------- */
  async function listCases() {
    var c = client(); if (!c) return [];
    var r = await c.from("cases").select("*").eq("status", "approved")
                  .order("created_at", { ascending: false });
    return (r && r.data) || [];
  }

  async function submitCase(d) {
    var s = await requireLogin(); if (!s) return null;
    var c = client(); if (!c) throw new Error("服务未就绪");
    var r = await c.from("cases").insert({
      author_id: s.user.id,
      author_name: await authorName(),
      title: d.title,
      industry: d.industry || "core",
      summary: d.summary || "",
      situation: d.situation || "",
      action: d.action || "",
      outcome: d.outcome || "",
      lesson: d.lesson || "",
      tags: d.tags || [],
      status: "pending"
    }).select().single();
    if (r.error) throw r.error;
    return r.data;
  }

  /* ---------------- 排行榜 ---------------- */
  async function getLeaderboard(limit) {
    var c = client(); if (!c) return [];
    var r = await c.from("public_leaderboard")
      .select("*")
      .order("exam_score", { ascending: false })
      .order("contributions", { ascending: false })
      .limit(limit || 50);
    return (r && r.data) || [];
  }

  /* ---------------- 社区概览（首页/枢纽最新帖） ---------------- */
  async function latestPosts(limit) {
    return listPosts({ limit: limit || 5 });
  }

  return {
    client: client, esc: esc, prefix: prefix, requireLogin: requireLogin,
    listPosts: listPosts, getPost: getPost, createPost: createPost,
    addReply: addReply, vote: vote,
    listCases: listCases, submitCase: submitCase,
    getLeaderboard: getLeaderboard, latestPosts: latestPosts
  };
})();
