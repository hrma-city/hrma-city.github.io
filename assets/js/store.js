/* =============================================================
 * store.js — 收益管理社区 统一进度数据层（阶段二·数据访问收敛）
 * -------------------------------------------------------------
 * 设计目标（离线优先 + 登录合并可扩展）：
 *   1. 所有"学习进度"只用这一层读写，页面不再直接碰 localStorage。
 *   2. 与历史 8 个 localStorage 键向后兼容（键名/JSON 编解码一致）。
 *   3. 内置合并语义：标量取 max、数组取并集、对象递归合并、字符串取新值
 *      —— 正好覆盖"训练营天数/最佳分取 max，打卡/错题/案例取并集"。
 *   4. 预留云同步接口 cloud.*：登录后 push/pull/sync，未接入时为安全 no-op。
 *
 * 当前状态：数据仍落在浏览器 localStorage（离线优先）。
 *           cloud 接口已写好，待 Supabase 客户端注入即生效（详见 cloud.init）。
 * ============================================================= */
(function () {
  "use strict";

  // feature -> 历史 localStorage 键（向后兼容，切勿改键名，否则老用户数据丢失）
  var KEYS = {
    camp7:    "hrma_camp7_v1",     // 7 天训练营进度
    fqBest:   "hrma_fq_best_v1",   // 闯关各关最佳分 {levelId: score}
    fqDaka:   "hrma_fq_daka_v1",   // 打卡日期数组 [ "2026-09-18", ... ]
    fqWrong:  "hrma_fq_wrong_v2",  // 错题本 { qid: {...} }
    caseDone: "hrma_case_done_v1", // 已完成案例 id 数组
    diagnose: "hrma_diagnose_v1",  // 最近一次健康自检报告对象
    myths:    "hrma_myths_v1",     // 已理解的误区 id 数组
    path:     "hrma_path_v1"       // 最近一次学习路径测评结果
  };

  var LS = (function () {
    try {
      var t = "__hrma_store_test__";
      window.localStorage.setItem(t, "1");
      window.localStorage.removeItem(t);
      return window.localStorage;
    } catch (e) {
      // 隐私模式 / 无 localStorage：退化到内存，仅当前会话有效
      var mem = {};
      return {
        getItem: function (k) { return k in mem ? mem[k] : null; },
        setItem: function (k, v) { mem[k] = String(v); },
        removeItem: function (k) { delete mem[k]; }
      };
    }
  })();

  function readRaw(key) {
    try {
      var s = LS.getItem(key);
      return s == null ? null : JSON.parse(s);
    } catch (e) { return null; }
  }
  function writeRaw(key, val) {
    try { LS.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }

  // ---- 合并语义：本地(local) 与 远端(remote) 合并，返回更"优"的结果 ----
  function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }
  function arrUnion(a, b) {
    // 原始值按值去重；对象按 id 去重（无 id 则按 JSON 去重）
    var seen = {}, out = [];
    function keyOf(v) {
      if (v && typeof v === "object") return "o:" + (v.id != null ? v.id : JSON.stringify(v));
      return (Array.isArray(v) ? "a:" : typeof v + ":") + v;
    }
    a.concat(b).forEach(function (v) {
      var k = keyOf(v);
      if (!seen[k]) { seen[k] = 1; out.push(v); }
    });
    return out;
  }
  function mergeValue(a, b) {
    if (b === undefined || b === null) return a;
    if (a === undefined || a === null) return b;
    if (Array.isArray(a) && Array.isArray(b)) return arrUnion(a, b);
    if (isObj(a) && isObj(b)) {
      var out = {}, k;
      for (k in a) out[k] = mergeValue(a[k], b[k]);
      for (k in b) if (!(k in out)) out[k] = b[k];
      return out;
    }
    if (typeof a === "number" && typeof b === "number") return Math.max(a, b);
    if (typeof a === "string" && typeof b === "string") return b || a;
    if (typeof a === "boolean" && typeof b === "boolean") return a || b;
    return b; // 其它类型：远端较新，取远端
  }
  function mergeAll(local, remote) {
    local = local || {}; remote = remote || {};
    var out = {}, f;
    for (f in KEYS) {
      var lv = f in local ? local[f] : readRaw(KEYS[f]);
      var rv = remote[f];
      out[f] = rv === undefined ? (lv === undefined ? undefined : lv) : mergeValue(lv, rv);
      if (out[f] === undefined) delete out[f];
    }
    return out;
  }

  // ---- 公开 API ----
  function get(feature) {
    var key = KEYS[feature];
    return key ? readRaw(key) : null;
  }
  function set(feature, val) {
    var key = KEYS[feature];
    if (!key) return false;
    return writeRaw(key, val);
  }
  // 局部更新：把 partial 合并进现有值（对象递归合并，其余覆盖）
  function update(feature, partial) {
    if (partial === undefined) return get(feature);
    var cur = get(feature);
    var next = (cur && isObj(cur) && isObj(partial)) ? mergeValue(cur, partial) : partial;
    set(feature, next);
    return next;
  }
  function getAll() {
    var o = {}, f;
    for (f in KEYS) { var v = readRaw(KEYS[f]); if (v !== null) o[f] = v; }
    return o;
  }
  function reset(feature) {
    if (feature) { var k = KEYS[feature]; if (k) LS.removeItem(k); }
    else { for (var f in KEYS) LS.removeItem(KEYS[f]); }
  }
  // 匿名 -> 登录：把本地全部数据合并进远端（调用方负责拿到 remote 后写回）
  function adopt(remote) { return mergeAll(getAll(), remote); }

  // ---- 云同步（Supabase 待接入；未注入客户端时为安全 no-op）----
  // 需要的表（建表 SQL 见 supabase/ 或阶段二说明）：
  //   create table progress ( user_id uuid primary key, data jsonb not null, updated_at timestamptz default now() );
  var CLOUD_TABLE = "progress";
  var cloud = {
    enabled: false,
    user: null,
    client: null,
    init: function (supabaseClient) { this.client = supabaseClient; return this; },
    login: function (user) { this.user = user; this.enabled = !!user; return this; },
    logout: function () { this.user = null; this.enabled = false; return this; },
    push: function () {
      var self = this;
      if (!self.enabled || !self.client) return Promise.resolve(false);
      return self.client.from(CLOUD_TABLE)
        .upsert({ user_id: self.user.id, data: getAll(), updated_at: new Date().toISOString() })
        .then(function () { return true; })
        .catch(function () { return false; });
    },
    pull: function () {
      var self = this;
      if (!self.enabled || !self.client) return Promise.resolve(null);
      return self.client.from(CLOUD_TABLE)
        .select("data").eq("user_id", self.user.id).single()
        .then(function (r) { return r && r.data ? r.data.data : null; })
        .catch(function () { return null; });
    },
    // 拉取远端 -> 与本地合并 -> 写回本地 + 推回远端，保证两端一致
    sync: function () {
      var self = this;
      if (!self.enabled || !self.client) return Promise.resolve(null);
      return self.pull().then(function (remote) {
        if (!remote) return self.push().then(function () { return getAll(); });
        var merged = mergeAll(getAll(), remote);
        for (var f in merged) { if (KEYS[f]) set(f, merged[f]); }
        return self.push().then(function () { return merged; });
      });
    }
  };

  window.Store = {
    KEYS: KEYS,
    features: Object.keys(KEYS),
    get: get,
    set: set,
    update: update,
    getAll: getAll,
    reset: reset,
    adopt: adopt,
    merge: mergeAll,
    mergeValue: mergeValue,
    cloud: cloud,
    version: "1.0.0"
  };
})();
