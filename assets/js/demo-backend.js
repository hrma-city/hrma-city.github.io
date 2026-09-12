/* ==========================================================================
 * RMC 收益管理社区 · 本地演示后端（demo-backend）
 * --------------------------------------------------------------------------
 * 为什么需要它：
 *   全站的登录 / 注册 / 开通会员 / 发布职位 / 下单 都依赖 Supabase。
 *   但 Supabase JS 通过 cdn.jsdelivr.net 引入，该 CDN 在国内常被墙，
 *   脚本加载失败会导致 window.supabase 不存在，整层商业 / 鉴权交互「无反应」。
 *
 * 它做什么：
 *   当真实 Supabase 客户端未加载时，用 localStorage 模拟一套与 supabase-js
 *   最小兼容的客户端（from / select / eq / order / insert / update / upsert /
 *   auth.* / rpc / functions.invoke）。这样 commerce.js 与 auth.js 无需改动，
 *   交互在本地即可真实可用（纯演示占位，数据存在本机浏览器）。
 *
 * 真实 Supabase 可用时（CDN 可达）：本文件不安装 mock，仍走真实后端。
 * ========================================================================== */
(function () {
  "use strict";

  // 已安装过则跳过
  if (window.RMC_DEMO_MODE) return;

  var KEY = {
    users: "hrma_demo_users",
    session: "hrma_demo_session",
    orders: "hrma_demo_orders",
    jobs: "hrma_demo_jobs",
    profiles: "hrma_demo_profiles",
    experts: "hrma_demo_experts"
  };

  function lsGet(k, def) {
    try { var v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); }
    catch (e) { return def; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
  function nowISO() { return new Date().toISOString(); }
  function genId(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getTable(name) {
    switch (name) {
      case "orders": return lsGet(KEY.orders, []);
      case "jobs": return lsGet(KEY.jobs, []);
      case "profiles": return lsGet(KEY.profiles, []);
      case "experts": return lsGet(KEY.experts, []);
      case "users": return lsGet(KEY.users, []);
      default: return [];
    }
  }
  function setTable(name, rows) {
    switch (name) {
      case "orders": lsSet(KEY.orders, rows); break;
      case "jobs": lsSet(KEY.jobs, rows); break;
      case "profiles": lsSet(KEY.profiles, rows); break;
      case "experts": lsSet(KEY.experts, rows); break;
      case "users": lsSet(KEY.users, rows); break;
    }
  }

  function matchFilters(rows, filters) {
    return rows.filter(function (r) {
      return filters.every(function (f) { return r[f[0]] === f[1]; });
    });
  }
  function sortRows(rows, ob) {
    if (!ob) return rows;
    return rows.slice().sort(function (a, b) {
      var xn = a[ob.c] == null ? "" : a[ob.c];
      var yn = b[ob.c] == null ? "" : b[ob.c];
      if (xn < yn) return ob.asc ? -1 : 1;
      if (xn > yn) return ob.asc ? 1 : -1;
      return 0;
    });
  }

  /* ---------- 查询构建器（thenable，支持 await） ---------- */
  function builder(tableName) {
    var ops = { filters: [], orderBy: null, single: false, maybeSingle: false,
                insert: null, update: null, upsert: null, upsertKey: "id" };

    var api = {
      select: function () { return api; },
      insert: function (row) { ops.insert = row; return api; },
      update: function (obj) { ops.update = obj; return api; },
      upsert: function (obj, opts) {
        ops.upsert = obj;
        if (opts && opts.onConflict) ops.upsertKey = opts.onConflict;
        return api;
      },
      eq: function (c, v) { ops.filters.push([c, v]); return api; },
      order: function (c, o) { ops.orderBy = { c: c, asc: !(o && o.ascending === false) }; return api; },
      limit: function () { return api; },
      single: function () { ops.single = true; return api; },
      maybeSingle: function () { ops.maybeSingle = true; return api; },
      then: function (resolve, reject) {
        try { return Promise.resolve(execute(tableName, ops)).then(resolve, reject); }
        catch (e) { return Promise.reject(e); }
      }
    };
    return api;
  }

  function execute(tableName, ops) {
    var rows = getTable(tableName);

    if (ops.insert) {
      var row = Object.assign({ id: genId(tableName), created_at: nowISO() }, ops.insert);
      rows.push(row); setTable(tableName, rows);
      return { data: row, error: null };
    }
    if (ops.update) {
      var updated = [];
      rows.forEach(function (r) {
        if (ops.filters.every(function (f) { return r[f[0]] === f[1]; })) {
          Object.assign(r, ops.update); updated.push(r);
        }
      });
      setTable(tableName, rows);
      return { data: updated, error: null };
    }
    if (ops.upsert) {
      var key = ops.upsertKey;
      var existing = rows.find(function (r) { return r[key] === ops.upsert[key]; });
      if (existing) { Object.assign(existing, ops.upsert); }
      else { var nr = Object.assign({ created_at: nowISO() }, ops.upsert); rows.push(nr); existing = nr; }
      setTable(tableName, rows);
      return { data: existing, error: null };
    }
    // select
    var out = matchFilters(rows, ops.filters);
    out = sortRows(out, ops.orderBy);
    if (ops.single || ops.maybeSingle) return { data: out[0] || null, error: null };
    return { data: out, error: null };
  }

  function handleRpc(name, args) {
    var id = (args && (args.p_order || args.p_id)) || null;
    if (!id) return { data: { ok: true }, error: null };
    var rows = getTable("orders");
    var o = rows.find(function (r) { return r.id === id; });
    if (o) {
      o.status = (name === "cancel_order") ? "cancelled" : "paid";
      setTable("orders", rows);
    }
    return { data: { ok: true }, error: null };
  }

  function makeClient() {
    return {
      from: function (tableName) { return builder(tableName); },
      rpc: function (name, args) { return Promise.resolve(handleRpc(name, args)); },
      functions: {
        invoke: function () {
          return Promise.resolve({ data: { ok: true, type: "redirect", url: "" }, error: null });
        }
      },
      auth: {
        getSession: function () {
          return Promise.resolve({ data: { session: lsGet(KEY.session, null) }, error: null });
        },
        getUser: function () {
          var s = lsGet(KEY.session, null);
          return Promise.resolve({ data: { user: s ? s.user : null }, error: null });
        },
        signInWithPassword: function (creds) {
          var users = lsGet(KEY.users, []);
          var u = users.find(function (x) { return x.email === creds.email && x.password === creds.password; });
          if (!u) return Promise.resolve({ data: null, error: { message: "Invalid login credentials" } });
          var sess = { user: { id: u.id, email: u.email, user_metadata: { full_name: u.full_name || "" } }, access_token: "demo" };
          lsSet(KEY.session, sess);
          return Promise.resolve({ data: sess, error: null });
        },
        signUp: function (creds) {
          var users = lsGet(KEY.users, []);
          if (users.find(function (x) { return x.email === creds.email; })) {
            return Promise.resolve({ data: null, error: { message: "User already registered" } });
          }
          var meta = (creds.options && creds.options.data) || {};
          var u = {
            id: genId("user"),
            email: creds.email,
            password: creds.password,
            full_name: meta.full_name || "",
            org: meta.org || "",
            role_text: meta.role_text || "",
            phone: meta.phone || "",
            reason: meta.reason || "",
            created_at: nowISO()
          };
          users.push(u); lsSet(KEY.users, users);
          var profiles = lsGet(KEY.profiles, []);
          profiles.push({
            id: u.id, email: u.email, full_name: u.full_name, org: u.org,
            role_text: u.role_text, phone: u.phone, reason: u.reason,
            status: "approved", created_at: nowISO()
          });
          lsSet(KEY.profiles, profiles);
          var sess = { user: { id: u.id, email: u.email, user_metadata: { full_name: u.full_name } }, access_token: "demo" };
          lsSet(KEY.session, sess);
          return Promise.resolve({ data: { user: sess.user }, error: null });
        },
        signOut: function () {
          lsSet(KEY.session, null);
          return Promise.resolve({ error: null });
        },
        resetPasswordForEmail: function () {
          return Promise.resolve({ data: {}, error: null });
        }
      }
    };
  }

  /* ---------- 演示数据：首次访问给招聘页塞几条示例职位 ---------- */
  function seedDemoJobs() {
    var jobs = lsGet(KEY.jobs, null);
    if (jobs && jobs.length) return; // 已初始化过
    var now = nowISO();
    setTable("jobs", [
      {
        id: genId("job"), company: "杭州滨江云璟酒店", title: "收益管理经理",
        industry: "lodging", jtype: "fulltime", city: "杭州", salary: "25-40K·14薪",
        description: "负责动态定价、库存控制与渠道分销；有 PMS / RMS 经验优先。",
        contact: "hr@yunjing-example.com", status: "open", posted_by: "demo", created_at: now
      },
      {
        id: genId("job"), company: "某连锁餐饮集团", title: "定价策略专员",
        industry: "fnb", jtype: "fulltime", city: "上海", salary: "15-22K·13薪",
        description: "负责菜单工程与时段定价，配合门店翻台提升。",
        contact: "talent@example.com", status: "open", posted_by: "demo", created_at: now
      },
      {
        id: genId("job"), company: "某航司收益部", title: "收益分析顾问（外部）",
        industry: "airline", jtype: "consult", city: "北京", salary: "面议",
        description: "为航线网络与舱位管理提供收益优化咨询。",
        contact: "rm@example-air.com", status: "open", posted_by: "demo", created_at: now
      }
    ]);
  }

  /* ---------- 安装：仅当真实 Supabase 不存在 ---------- */
  if (!window.supabase) {
    window.supabase = { createClient: function () { return makeClient(); } };
    window.RMC_DEMO_MODE = true;
    try { seedDemoJobs(); } catch (e) {}
  }
})();
