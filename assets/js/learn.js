/* ============================================================================
 * RMC 社区 · 课程学习打卡
 * ----------------------------------------------------------------------------
 * 通过 window.HRMA_LEARN_COURSE 指定当前课程 id（由页面注入）。
 * 数据表：course_progress(user_id, course_id)
 * ========================================================================== */
(function () {
  "use strict";

  var PFX = window.HRMA_PREFIX || "";
  var COURSE = window.HRMA_LEARN_COURSE || null;
  if (!COURSE) return;

  var cfg = window.HRMA_SUPABASE || {};
  if (!window.supabase || !cfg.url || !cfg.anonKey) return;

  var sb;
  try { sb = window.supabase.createClient(cfg.url, cfg.anonKey); } catch (e) { return; }

  var COURSES = [
    "m01-metrics", "m02-systems", "m03-dailyops", "m04-reports", "m05-forecast",
    "m06-pricing", "m07-inventory", "m08-channel", "m09-compset", "m10-segment",
    "m11-budget", "m12-meetings", "m13-team", "m14-rms",
    "k01-forecast", "k02-pricing", "k03-inventory", "k04-channel",
    "k05-competition", "k06-noshow"
  ];
  var TOTAL = COURSES.length;

  var uid = null, done = false, count = 0, box = null, btn = null, bar = null, txt = null;

  function injectStyle() {
    if (document.getElementById("learnStyle")) return;
    var s = document.createElement("style");
    s.id = "learnStyle";
    s.textContent =
      ".learn-card{margin:22px 0 0;padding:18px 20px;background:var(--bg-2,#F2F0EB);" +
      "border:1px solid var(--line,#e6e2d8);border-radius:12px}" +
      ".learn-card h4{margin:0 0 10px;font-size:15px;color:var(--navy,#16324f)}" +
      ".learn-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}" +
      ".learn-btn{font:inherit;font-weight:600;cursor:pointer;padding:9px 18px;border-radius:9px;" +
      "border:1px solid transparent;background:linear-gradient(135deg,var(--gold-2,#D4A96A),var(--gold,#b9914a));" +
      "color:#fff;transition:.15s}" +
      ".learn-btn:hover{filter:brightness(1.04)}" +
      ".learn-btn.done{background:#fff;color:var(--gold,#b9914a);border-color:var(--gold-2,#D4A96A)}" +
      ".learn-btn:disabled{opacity:.6;cursor:default}" +
      ".learn-bar{flex:1;min-width:160px;height:8px;border-radius:5px;background:#fff;" +
      "border:1px solid var(--line,#e6e2d8);overflow:hidden}" +
      ".learn-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--gold-2,#D4A96A),var(--gold,#b9914a));" +
      "transition:width .3s}" +
      ".learn-txt{font-size:13px;color:var(--ink-2,#445)}" +
      ".learn-tip{font-size:12.5px;color:var(--ink-3,#7B8794);margin-top:8px;line-height:1.6}" +
      ".learn-tip a{color:var(--gold,#b9914a)}";
    document.head.appendChild(s);
  }

  function build() {
    if (box) return;
    injectStyle();
    box = document.createElement("div");
    box.className = "learn-card";
    box.innerHTML =
      '<h4>学习打卡</h4>' +
      '<div class="learn-row">' +
        '<button class="learn-btn" id="learnBtn">标记本课已完成</button>' +
        '<div class="learn-bar"><i id="learnBar" style="width:0%"></i></div>' +
        '<span class="learn-txt" id="learnTxt">—</span>' +
      '</div>' +
      '<p class="learn-tip" id="learnTip"></p>';

    var main = document.querySelector("main") || document.querySelector(".site-main");
    if (main) main.appendChild(box);
    else document.body.appendChild(box);

    btn = document.getElementById("learnBtn");
    bar = document.getElementById("learnBar");
    txt = document.getElementById("learnTxt");
    btn.onclick = toggle;
  }

  function renderState() {
    btn.className = "learn-btn" + (done ? " done" : "");
    btn.textContent = done ? "✓ 已完成（点击取消）" : "标记本课已完成";
    var pct = Math.round((count / TOTAL) * 100);
    bar.style.width = pct + "%";
    txt.textContent = count + " / " + TOTAL + " 课（" + pct + "%）";
    document.getElementById("learnTip").innerHTML =
      "完成后可在「<a href='" + PFX + "cert.html'>资格认证</a>」页查看学习地图进度；"
      + "累计完成并通过考核即可申领带编号、可公开验证的证书。";
  }

  async function load() {
    var r = await sb.from("course_progress").select("course_id").eq("user_id", uid);
    var ids = ((r && r.data) || []).map(function (x) { return x.course_id; });
    done = ids.indexOf(COURSE) >= 0;
    count = ids.filter(function (x) { return COURSES.indexOf(x) >= 0; }).length;
    renderState();
  }

  async function toggle() {
    btn.disabled = true;
    try {
      if (done) {
        await sb.from("course_progress").delete().eq("user_id", uid).eq("course_id", COURSE);
      } else {
        var now = new Date().toISOString();
        await sb.from("course_progress").upsert({
          user_id: uid, course_id: COURSE, completed: true,
          completed_at: now, updated_at: now
        }, { onConflict: "user_id,course_id" });
      }
      await load();
    } catch (e) {
      alert("保存失败：" + (e.message || e));
    }
    btn.disabled = false;
  }

  (async function boot() {
    try {
      var r = await sb.auth.getSession();
      var s = r && r.data && r.data.session;
      build();
      if (!s || !s.user) {
        btn.disabled = true;
        btn.textContent = "登录后打卡";
        document.getElementById("learnTip").innerHTML =
          "请<a href='" + PFX + "login.html?redirect=" +
          encodeURIComponent(location.pathname.replace(/^.*\//, "")) +
          "'>登录</a>后记录学习进度。";
        return;
      }
      uid = s.user.id;
      await load();
    } catch (e) { /* 静默 */ }
  })();
})();
