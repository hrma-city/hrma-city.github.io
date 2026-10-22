/* ============================================================
   漫剧动画播放器引擎（字幕式逐句播放 + 场景推进 + 集末知识点/分镜卡）
   用法：页面内联脚本调用 window.DRAMA.mount(cfg)
   cfg = {
     series, subtitle, source,   // 源页（剧本页）
     groups: [{name, from, to}], // 剧集分组（可选）
     episodes: [{no,title,meta,scenes:[],lines:[{sp,tx}],know,shot}]
   }
   ============================================================ */
(function () {
  "use strict";

  var CSS = [
    ".dp-wrap{max-width:1120px;margin:0 auto}",
    ".dp-head{background:linear-gradient(120deg,var(--navy),#2A5680);color:#fff;border-radius:16px;padding:22px 26px;margin:14px 0 16px}",
    ".dp-head h1{font-size:23px;font-weight:800;margin:0 0 6px;color:#fff}",
    ".dp-head p{font-size:13px;color:rgba(255,255,255,.85);line-height:1.8;margin:0}",
    ".dp-grid{display:grid;grid-template-columns:250px 1fr;gap:16px;align-items:start}",
    "@media (max-width:900px){.dp-grid{grid-template-columns:1fr}}",
    ".dp-list{background:var(--white);border:1px solid var(--line);border-radius:12px;max-height:76vh;overflow:auto;padding:8px}",
    ".dp-group{font-size:11.5px;font-weight:800;color:var(--ink-3);letter-spacing:1px;padding:10px 10px 4px}",
    ".dp-ep{display:block;width:100%;text-align:left;border:none;background:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-family:inherit;transition:.12s}",
    ".dp-ep:hover{background:#F2F6FA}",
    ".dp-ep.now{background:var(--navy);color:#fff}",
    ".dp-ep .n{font-family:var(--mono);font-size:11px;color:var(--gold-2);font-weight:700;margin-right:6px}",
    ".dp-ep.now .n{color:var(--gold-2)}",
    ".dp-ep .t{font-size:12.5px;font-weight:600;line-height:1.5}",
    ".dp-ep .m{font-size:11px;color:var(--ink-3);margin-top:2px;line-height:1.5}",
    ".dp-ep.now .m{color:rgba(255,255,255,.7)}",
    ".dp-stage{background:var(--white);border:1px solid var(--line);border-radius:12px;overflow:hidden}",
    ".dp-scene{background:#101720;color:#DCE6F0;padding:13px 20px;font-size:13px;line-height:1.75;border-bottom:1px solid rgba(255,255,255,.08)}",
    ".dp-scene b{color:var(--gold-2);font-family:var(--mono);font-size:11.5px;letter-spacing:1px;margin-right:8px}",
    ".dp-dialog{padding:20px 22px;min-height:300px;max-height:52vh;overflow:auto;background:#FBFCFE}",
    ".dp-line{display:flex;gap:12px;margin:0 0 14px;opacity:0;transform:translateY(10px);transition:.4s ease}",
    ".dp-line.on{opacity:1;transform:none}",
    ".dp-line.past{opacity:.45}",
    ".dp-line .av{flex:0 0 34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#fff}",
    ".dp-line .bd{flex:1}",
    ".dp-line .sp{font-size:12px;font-weight:700;color:var(--navy);margin-bottom:2px}",
    ".dp-line .tx{font-size:14px;line-height:1.9;color:var(--ink)}",
    ".dp-bar{display:flex;align-items:center;gap:10px;padding:12px 16px;border-top:1px solid var(--line);flex-wrap:wrap;background:var(--white)}",
    ".dp-btn{border:1px solid var(--line-2);background:var(--white);color:var(--navy);border-radius:8px;padding:8px 13px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}",
    ".dp-btn:hover{background:var(--navy);color:#fff;border-color:var(--navy)}",
    ".dp-btn.primary{background:var(--navy);color:#fff;border-color:var(--navy);min-width:86px}",
    ".dp-prog{flex:1;min-width:140px;height:6px;background:var(--bg-2);border-radius:20px;overflow:hidden}",
    ".dp-prog i{display:block;height:100%;background:var(--gold);width:0;transition:.3s linear}",
    ".dp-count{font-family:var(--mono);font-size:12.5px;color:var(--ink-2)}",
    ".dp-end{padding:18px 22px;border-top:1px solid var(--line);background:#FFFDF7;display:none}",
    ".dp-end.show{display:block}",
    ".dp-end h4{margin:0 0 8px;font-size:14px;color:var(--navy)}",
    ".dp-end .know{font-size:13px;line-height:1.9;color:var(--ink);background:#FFF8E6;border:1px solid var(--gold);border-radius:10px;padding:12px 16px}",
    ".dp-end .shot{font-size:12.5px;line-height:1.85;color:var(--ink-2);margin-top:10px}",
    ".dp-end .nav{margin-top:12px;display:flex;gap:10px;flex-wrap:wrap}",
    ".dp-meta{font-size:12px;color:var(--ink-3);padding:10px 20px 0;line-height:1.7}"
  ].join("\n");
  var st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);

  var AV_COLORS = ["#1B3A5C", "#2A7D4F", "#B8894A", "#7A3FB0", "#A02C4A", "#0E7C86", "#8E44AD", "#C0392B"];

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function speakerColor(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return AV_COLORS[h % AV_COLORS.length];
  }

  function mount(cfg) {
    var root = document.getElementById("dpRoot");
    if (!root) return;
    var E = cfg.episodes;
    var ei = 0, li = 0, playing = false, timer = null;

    root.innerHTML =
      '<div class="dp-head"><h1>' + esc(cfg.series) + '</h1><p>' + esc(cfg.subtitle) + '</p></div>' +
      '<div class="dp-grid">' +
      '  <div class="dp-list" id="dpList"></div>' +
      '  <div class="dp-stage">' +
      '    <div class="dp-scene" id="dpScene"><b>SCENE</b><span id="dpSceneTxt"></span></div>' +
      '    <div class="dp-dialog" id="dpDialog"></div>' +
      '    <div class="dp-meta" id="dpMeta"></div>' +
      '    <div class="dp-bar">' +
      '      <button class="dp-btn primary" id="dpPlay">▶ 播放</button>' +
      '      <button class="dp-btn" id="dpPrevLine">← 上一句</button>' +
      '      <button class="dp-btn" id="dpNextLine">下一句 →</button>' +
      '      <div class="dp-prog"><i id="dpProg"></i></div>' +
      '      <span class="dp-count" id="dpCount">0 / 0</span>' +
      '    </div>' +
      '    <div class="dp-end" id="dpEnd">' +
      '      <h4>本集知识点</h4><div class="know" id="dpKnow"></div>' +
      '      <h4 style="margin-top:14px">分镜 / 画面提示</h4><div class="shot" id="dpShot"></div>' +
      '      <div class="nav">' +
      '        <button class="dp-btn" id="dpNextEp">下一集 →</button>' +
      '        <a class="dp-btn" href="' + esc(cfg.source) + '">看本集完整剧本</a>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    var list = document.getElementById("dpList"),
      dialog = document.getElementById("dpDialog"),
      sceneTxt = document.getElementById("dpSceneTxt"),
      meta = document.getElementById("dpMeta"),
      count = document.getElementById("dpCount"),
      prog = document.getElementById("dpProg"),
      endBox = document.getElementById("dpEnd");

    /* 剧集列表（支持分组） */
    var groups = cfg.groups && cfg.groups.length ? cfg.groups : [{ name: "全部剧集", from: 1, to: E.length }];
    groups.forEach(function (g) {
      list.appendChild(el("div", "dp-group", esc(g.name)));
      for (var n = g.from; n <= g.to && n <= E.length; n++) {
        (function (ep) {
          var b = el("button", "dp-ep",
            '<span class="n">EP' + ("0" + ep.no).slice(-2) + "</span>" +
            '<span class="t">' + esc(ep.title) + "</span>" +
            '<div class="m">' + esc(ep.meta) + "</div>");
          b.addEventListener("click", function () { loadEp(E.indexOf(ep)); });
          list.appendChild(b);
        })(E[n - 1]);
      }
    });

    function dur(tx) {
      var n = tx.length;
      return Math.min(9000, Math.max(1800, n * 0.24 * 1000));
    }

    function loadEp(i) {
      pause();
      ei = Math.max(0, Math.min(E.length - 1, i));
      li = 0;
      var ep = E[ei];
      document.getElementById("dpKnow").textContent = ep.know || "（本集未附知识点）";
      document.getElementById("dpShot").textContent = ep.shot || "（本集未附分镜）";
      meta.textContent = ep.meta || "";
      dialog.innerHTML = "";
      dialog.scrollTop = 0;
      endBox.classList.remove("show");
      var btns = list.querySelectorAll(".dp-ep");
      for (var k = 0; k < btns.length; k++) {
        var on = btns[k].textContent.indexOf("EP" + ("0" + ep.no).slice(-2)) >= 0;
        btns[k].className = "dp-ep" + (on ? " now" : "");
      }
      showLine(0, true);
    }

    function currentScene() {
      var ep = E[ei];
      // 场景推进：按累计句数比例落在场景上（每场至少 1 句）
      var per = ep.lines.length / Math.max(1, ep.scenes.length);
      var si = Math.min(ep.scenes.length - 1, Math.floor(li / per));
      return { idx: si + 1, txt: ep.scenes[si] || "" };
    }

    function showLine(i, jump) {
      var ep = E[ei];
      li = Math.max(0, Math.min(ep.lines.length - 1, i));
      var sc = currentScene();
      sceneTxt.textContent = "第 " + sc.idx + " 场 · " + sc.txt;

      // 只渲染当前窗口（当前句 + 前后各 6 句），避免百句长卡顿
      var from = Math.max(0, li - 6), to = Math.min(ep.lines.length, li + 6);
      var keep = dialog.querySelectorAll(".dp-line").length;
      if (jump || keep === 0 || Math.abs((dialog.firstChild && dialog.firstChild.__li || 0) - from) > 3) {
        dialog.innerHTML = "";
        for (var k = from; k < to; k++) dialog.appendChild(buildLine(ep.lines[k], k));
        dialog.firstChild.__li = from;
      } else {
        // 增量追加
        var last = dialog.lastChild;
        if (last && last.__li < to - 1) {
          for (var j = (last.__li || from) + 1; j < to; j++) {
            var nd = buildLine(ep.lines[j], j);
            dialog.appendChild(nd);
            last = nd;
          }
        }
      }
      var nodes = dialog.querySelectorAll(".dp-line");
      for (var m = 0; m < nodes.length; m++) {
        var idx = +nodes[m].getAttribute("data-li");
        nodes[m].classList.remove("on", "past");
        if (idx < li) nodes[m].classList.add("past");
        else if (idx === li) nodes[m].classList.add("on");
      }
      var cur = dialog.querySelector('.dp-line[data-li="' + li + '"]');
      if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ block: "nearest" }); } catch (e) {} }

      count.textContent = (li + 1) + " / " + ep.lines.length;
      prog.style.width = ((li + 1) / ep.lines.length * 100) + "%";
      endBox.classList.toggle("show", li === ep.lines.length - 1);
    }

    function buildLine(l, idx) {
      var d = el("div", "dp-line");
      d.setAttribute("data-li", idx);
      d.__li = idx;
      var c = speakerColor(l.sp || "?");
      d.appendChild(el("div", "av", esc((l.sp || "?")[0])));
      d.lastChild.style.background = c;
      var bd = el("div", "bd");
      bd.appendChild(el("div", "sp", esc(l.sp)));
      bd.appendChild(el("div", "tx", esc(l.tx)));
      d.appendChild(bd);
      return d;
    }

    function play() {
      playing = true;
      document.getElementById("dpPlay").textContent = "⏸ 暂停";
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      if (!playing) return;
      var ep = E[ei];
      if (li >= ep.lines.length - 1) { pause(); return; }
      timer = setTimeout(function () {
        showLine(li + 1);
        schedule();
      }, dur(ep.lines[li].tx));
    }
    function pause() {
      playing = false;
      clearTimeout(timer);
      document.getElementById("dpPlay").textContent = "▶ 播放";
    }

    document.getElementById("dpPlay").addEventListener("click", function () { playing ? pause() : play(); });
    document.getElementById("dpPrevLine").addEventListener("click", function () { pause(); showLine(li - 1); });
    document.getElementById("dpNextLine").addEventListener("click", function () { pause(); showLine(li + 1); });
    document.getElementById("dpNextEp").addEventListener("click", function () { loadEp(ei + 1); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { pause(); showLine(li + 1); }
      else if (e.key === "ArrowLeft") { pause(); showLine(li - 1); }
      else if (e.key === " ") { e.preventDefault(); playing ? pause() : play(); }
    });

    loadEp(0);
  }

  window.DRAMA = { mount: mount };
})();
