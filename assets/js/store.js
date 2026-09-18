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
    var ok = writeRaw(key, val);
    schedulePush();
    return ok;
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

  // ---- 云同步（真实接入 Supabase；未配置/未登录时为安全 no-op）----
  // 所需表（建表 SQL 见 SUPABASE-用户进度同步.sql，在 Supabase SQL Editor 跑一次）：
  //   create table user_progress ( user_id uuid primary key, data jsonb, updated_at timestamptz );
  var CLOUD_TABLE = "user_progress";
  var _pushTimer = null;
  var cloud = {
    enabled: false,
    user: null,
    client: null,
    syncing: false,
    lastSync: 0,
    status: "local",            // local | syncing | synced | error | noconf
    // 自动发现 Supabase 客户端（auth-config.js 提供的 url/anonKey）
    ensure: function () {
      if (this.client) return this.client;
      var CFG = window.HRMA_SUPABASE || {};
      if (window.supabase && CFG.url && CFG.anonKey) {
        try { this.client = window.supabase.createClient(CFG.url, CFG.anonKey); }
        catch (e) { this.client = null; }
      }
      return this.client;
    },
    // 刷新当前登录用户
    refreshUser: function () {
      var self = this, c = this.ensure();
      if (!c) { self.status = window.HRMA_SUPABASE ? "noconf" : "local"; return Promise.resolve(false); }
      return c.auth.getSession().then(function (r) {
        var u = r && r.data && r.data.session ? r.data.session.user : null;
        self.user = u; self.enabled = !!u;
        if (!u) self.status = "local";
        return self.enabled;
      }).catch(function () { self.enabled = false; self.status = "local"; return false; });
    },
    pull: function () {
      var self = this;
      if (!self.enabled) return Promise.resolve(null);
      return self.client.from(CLOUD_TABLE)
        .select("data,updated_at").eq("user_id", self.user.id).single()
        .then(function (r) { return (r && r.data) ? r.data : null; })
        .catch(function () { return null; });
    },
    push: function () {
      var self = this;
      if (!self.enabled) return Promise.resolve(false);
      return self.client.from(CLOUD_TABLE).upsert({
        user_id: self.user.id, data: getAll(), updated_at: new Date().toISOString()
      }, { onConflict: "user_id" })
        .then(function () { self.lastSync = Date.now(); self.status = "synced"; self._emit(); return true; })
        .catch(function () { self.status = "error"; self._emit(); return false; });
    },
    // 拉取远端 -> 与本地合并(更优值) -> 写回本地 -> 推回远端
    sync: function () {
      var self = this;
      if (!self.enabled) return Promise.resolve(null);
      if (self.syncing) return Promise.resolve("syncing");
      self.syncing = true; self.status = "syncing"; self._emit();
      return self.pull().then(function (remote) {
        if (!remote) return self.push().then(function () { return { pulled: false, pushed: true }; });
        var remoteData = (remote.data && typeof remote.data === "object") ? remote.data : {};
        var merged = mergeAll(getAll(), remoteData);
        for (var f in merged) { if (KEYS[f]) set(f, merged[f]); }
        return self.push().then(function () { return { pulled: true, pushed: true, remoteAt: remote.updated_at }; });
      }).then(function (res) { self.syncing = false; self._emit(); return res; })
        .catch(function () { self.syncing = false; self.status = "error"; self._emit(); return null; });
    },
    _emit: function () { if (typeof window.Store !== "undefined" && window.Store.onSync) window.Store.onSync(this.status); },
    signIn: function (email, pw) {
      var c = this.ensure();
      if (!c) return Promise.reject(new Error("鉴权未配置"));
      return c.auth.signInWithPassword({ email: email, password: pw });
    },
    signOut: function () {
      var c = this.ensure();
      return c ? c.auth.signOut() : Promise.resolve();
    },
    // 启动：等待 SDK 就绪 -> 刷新登录态 -> 已登录则同步；并监听登录态变化
    watch: function () {
      var self = this, tries = 0;
      (function wait() {
        if (window.supabase) { self.ensure(); self.refreshUser().then(function (on) { if (on) self.sync(); }); return; }
        if (++tries > 12) { self.status = window.HRMA_SUPABASE ? "noconf" : "local"; self._emit(); return; }
        setTimeout(wait, 300);
      })();
      var c = this.ensure();
      if (c && c.auth && c.auth.onAuthStateChange) {
        c.auth.onAuthStateChange(function (ev, sess) {
          self.user = (sess && sess.user) ? sess.user : null;
          self.enabled = !!(sess && sess.user);
          if (self.enabled) self.sync();
          else { self.status = "local"; self._emit(); }
        });
      }
    }
  };
  // 每次写进度后防抖(1.5s)推送到云端；离线/未登录则跳过
  function schedulePush() {
    if (!cloud.enabled) return;
    if (_pushTimer) clearTimeout(_pushTimer);
    _pushTimer = setTimeout(function () { cloud.push(); }, 1500);
  }

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
    onSync: null,            // 外部可挂：function(status){}
    version: "2.1.0"
  };

  // ---- 配置检测 / 相对路径（用于注册链接与弹窗定位）----
  function isSupabaseConfigured() {
    var C = window.HRMA_SUPABASE || {};
    return !!(C.url && C.anonKey &&
      /^https:\/\/.+\.supabase\.co/.test(C.url) &&
      (C.anonKey || "").length > 40);
  }
  function relPrefix() {
    return /\/((courses|exam|games|core|airline|attraction|entertainment|fnb|templates|data|ppt|theater|benchmark|community))\//.test(location.pathname) ? "../" : "";
  }

  // ---- 登录弹窗（未登录用户直接触发云同步入口）----
  function showLoginModal() {
    if (document.getElementById("hrmaLoginModal")) return;
    var root = relPrefix();
    var overlay = document.createElement("div");
    overlay.id = "hrmaLoginModal";
    overlay.className = "hrma-modal-mask";
    overlay.innerHTML =
      '<div class="hrma-modal">' +
        '<button class="hrma-modal-x" id="hrmaLMClose" aria-label="关闭">×</button>' +
        '<h3>登录后同步进度</h3>' +
        '<p class="hrma-modal-sub">登录即可把 8 项学习进度备份到云端，换设备不丢失。</p>' +
        '<div class="hrma-modal-msg" id="hrmaLMmsg"></div>' +
        '<input type="email" id="hrmaLMemail" class="hrma-modal-in" placeholder="邮箱" autocomplete="email">' +
        '<input type="password" id="hrmaLMpw" class="hrma-modal-in" placeholder="密码" autocomplete="current-password">' +
        '<button class="hrma-modal-btn" id="hrmaLMbtn">登 录</button>' +
        '<a class="hrma-modal-reg" href="' + root + 'register.html">还没有账号？去注册</a>' +
      '</div>';
    document.body.appendChild(overlay);
    var email = overlay.querySelector("#hrmaLMemail");
    var pw = overlay.querySelector("#hrmaLMpw");
    var btn = overlay.querySelector("#hrmaLMbtn");
    var msg = overlay.querySelector("#hrmaLMmsg");
    function close() { overlay.remove(); }
    overlay.querySelector("#hrmaLMClose").onclick = close;
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    function submit() {
      var e2 = email.value.trim(), p2 = pw.value;
      if (!e2 || !p2) { msg.textContent = "请填写邮箱和密码。"; msg.className = "hrma-modal-msg err"; return; }
      btn.disabled = true; btn.textContent = "登录中…";
      cloud.signIn(e2, p2).then(function () {
        close(); // onAuthStateChange 会触发 sync 与徽标刷新
      }).catch(function (err) {
        var m = (err && err.message) ? err.message : String(err);
        if (/Invalid login/i.test(m) || /credentials/i.test(m)) m = "邮箱或密码不正确。";
        else if (/Email not confirmed/i.test(m)) m = "邮箱尚未验证，请查收验证邮件后重试。";
        msg.textContent = m; msg.className = "hrma-modal-msg err";
        btn.disabled = false; btn.textContent = "登 录";
      });
    }
    btn.onclick = submit;
    pw.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    email.focus();
  }
  function confirmSignOut() {
    if (!window.confirm("确定退出登录？本地进度已保留，云端进度仍在。")) return;
    cloud.signOut();
  }

  function injectSyncBadge() {
    if (document.getElementById("hrmaSync")) return;
    if (!document.getElementById("hrmaSyncStyle")) {
      var st = document.createElement("style");
      st.id = "hrmaSyncStyle";
      st.textContent =
        ".hrma-sync{position:fixed;right:12px;bottom:64px;z-index:90;font:12px/1.4 system-ui,-apple-system,sans-serif;padding:6px 11px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,.18);background:#fff;color:#444;max-width:62vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}" +
        ".hrma-sync.syncing{color:#1d6fb8}.hrma-sync.synced{color:#1a9c5b}.hrma-sync.error{color:#c0392b}.hrma-sync.noconf{color:#888;cursor:default}" +
        "@media(max-width:768px){.hrma-sync{bottom:64px;right:8px;font-size:11px}}" +
        ".hrma-modal-mask{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;padding:16px}" +
        ".hrma-modal{position:relative;width:min(340px,92vw);background:#fff;border-radius:14px;padding:22px 20px 18px;box-shadow:0 12px 40px rgba(0,0,0,.25);font:14px/1.5 system-ui,-apple-system,sans-serif}" +
        ".hrma-modal h3{margin:0 0 4px;font-size:17px;color:#222}" +
        ".hrma-modal-sub{margin:0 0 12px;color:#777;font-size:12px}" +
        ".hrma-modal-msg{display:none;margin:0 0 10px;padding:8px 10px;border-radius:8px;font-size:12px}" +
        ".hrma-modal-msg.err{display:block;background:#fdecea;color:#c0392b}" +
        ".hrma-modal-in{display:block;width:100%;box-sizing:border-box;margin:0 0 10px;padding:10px 12px;border:1px solid #d9dde3;border-radius:9px;font-size:14px}" +
        ".hrma-modal-in:focus{outline:none;border-color:#1d6fb8;box-shadow:0 0 0 3px rgba(29,111,184,.15)}" +
        ".hrma-modal-btn{width:100%;padding:11px;border:0;border-radius:9px;background:#1d6fb8;color:#fff;font-size:15px;font-weight:600;cursor:pointer}" +
        ".hrma-modal-btn:disabled{opacity:.6;cursor:default}" +
        ".hrma-modal-reg{display:block;text-align:center;margin-top:12px;color:#1d6fb8;font-size:13px;text-decoration:none}" +
        ".hrma-modal-x{position:absolute;top:8px;right:10px;border:0;background:none;font-size:22px;line-height:1;color:#999;cursor:pointer}";
      document.head.appendChild(st);
    }
    var b = document.createElement("div");
    b.id = "hrmaSync"; b.className = "hrma-sync local";
    document.body.appendChild(b);
    window.Store.onSync = function (s) { renderSync(b, s); };
    b.addEventListener("click", function () {
      if (cloud.enabled) confirmSignOut();
      else if (isSupabaseConfigured()) showLoginModal();
    });
    renderSync(b, cloud.status);
  }
  function renderSync(b, s) {
    var conf = isSupabaseConfigured();
    var map = {
      local:    [conf ? "☁ 点击登录同步" : "⚙ 未配置云同步", "local"],
      syncing: ["⟳ 同步中…", "syncing"],
      synced:  ["✓ 已云同步", "synced"],
      error:   ["⚠ 同步失败（保留本地）", "error"],
      noconf:  ["⚙ 未配置云同步", "noconf"]
    };
    var m = map[s] || map.local;
    b.textContent = m[0]; b.className = "hrma-sync " + m[1];
  }

  function bootCloud() {
    cloud.watch();
    injectSyncBadge();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", bootCloud);
  else bootCloud();
})();
