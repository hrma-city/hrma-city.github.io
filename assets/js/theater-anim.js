/* ============================================================
   收益管理剧院 · 动画引擎（代码驱动动态图形，零图片依赖）
   用法：页面内联脚本调用 window.THEATER.mount(cfg)
   cfg = {
     ep: "第 1 集", title, lead, table: {name, text, links:[{t,u}]},
     scenes: [ { cap, data, viz } ]   // viz 见下方 VIZ 注册表
   }
   viz.type: roll | bars | rooms | matrix | flow | gauge | ladder | chain | none
   ============================================================ */
(function () {
  "use strict";

  var CSS = [
    ".ta-stage{position:relative;width:100%;aspect-ratio:16/9;min-height:340px;background:radial-gradient(120% 100% at 50% 0%,#1B3A5C 0%,#101720 70%);border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(27,58,92,.18);color:#fff}",
    ".ta-vig{position:absolute;inset:0;background:radial-gradient(90% 70% at 50% 42%,transparent 40%,rgba(6,10,16,.55) 100%);pointer-events:none;z-index:2}",
    ".ta-data{position:absolute;left:0;right:0;top:9%;text-align:center;z-index:3;pointer-events:none}",
    ".ta-data span{display:inline-block;font-family:var(--mono);font-weight:800;font-size:clamp(30px,5.4vw,52px);color:#fff;letter-spacing:2px;text-shadow:0 4px 24px rgba(0,0,0,.6);opacity:0;transform:scale(.9);transition:.5s cubic-bezier(.2,.8,.3,1)}",
    ".ta-data span.on{opacity:1;transform:none}",
    ".ta-viz{position:absolute;left:0;right:0;top:24%;bottom:24%;display:flex;align-items:center;justify-content:center;z-index:3;opacity:0;transition:opacity .45s ease;padding:0 26px}",
    ".ta-viz.on{opacity:1}",
    ".ta-cap{position:absolute;left:0;right:0;bottom:0;padding:30px 34px 32px;font-size:clamp(13px,1.55vw,16.5px);line-height:1.9;z-index:4;opacity:0;transform:translateY(12px);transition:.5s ease;background:linear-gradient(transparent,rgba(8,12,20,.82) 55%)}",
    ".ta-cap.on{opacity:1;transform:none}",
    ".ta-cap .no{display:inline-block;font-family:var(--mono);font-size:11.5px;color:var(--gold-2);letter-spacing:1px;margin-bottom:6px}",
    ".ta-bar{display:flex;align-items:center;gap:12px;margin-top:14px;flex-wrap:wrap}",
    ".ta-btn{border:1px solid var(--line-2);background:var(--white);color:var(--navy);border-radius:8px;padding:9px 15px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;transition:.15s}",
    ".ta-btn:hover{background:var(--navy);color:#fff;border-color:var(--navy)}",
    ".ta-btn.primary{background:var(--navy);color:#fff;border-color:var(--navy);min-width:92px}",
    ".ta-btn.primary:hover{background:var(--navy-2)}",
    ".ta-prog{flex:1;min-width:180px;height:6px;background:var(--bg-2);border-radius:20px;overflow:hidden}",
    ".ta-prog i{display:block;height:100%;background:var(--gold);width:0;transition:.35s linear}",
    ".ta-count{font-family:var(--mono);font-size:13px;color:var(--ink-2)}",
    ".ta-list{display:grid;gap:8px;margin-top:18px;grid-template-columns:repeat(auto-fill,minmax(215px,1fr))}",
    ".ta-item{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--white);cursor:pointer;font-size:12.5px;color:var(--ink-2);line-height:1.65;transition:.15s;text-align:left}",
    ".ta-item:hover{border-color:var(--navy-3);background:#f6f9fc}",
    ".ta-item.now{border-color:var(--gold);background:var(--gold-soft);color:var(--ink)}",
    ".ta-item b{font-family:var(--mono);color:var(--gold);flex-shrink:0}",
    ".ta-note{margin-top:12px;font-size:12.5px;color:#B9C6D4;text-align:center;max-width:640px}",
    // 滚动数字
    ".ta-roll{text-align:center}",
    ".ta-roll .n{font-family:var(--mono);font-weight:800;font-size:clamp(38px,6vw,58px);color:var(--gold-2);letter-spacing:1px}",
    ".ta-roll .u{font-size:18px;color:#fff;margin-left:6px;font-weight:700}",
    ".ta-roll .lb{margin-top:8px;font-size:13px;color:#B9C6D4;letter-spacing:1px}",
    // 对比条
    ".ta-bars{width:100%;max-width:560px}",
    ".ta-bar-row{display:grid;grid-template-columns:120px 1fr 88px;gap:12px;align-items:center;margin:11px 0;font-size:13px}",
    ".ta-bar-row .k{color:#DCE6F0;text-align:right}",
    ".ta-bar-row .t{height:20px;background:rgba(255,255,255,.09);border-radius:7px;overflow:hidden}",
    ".ta-bar-row .t i{display:block;height:100%;border-radius:7px;width:0;transition:width .9s cubic-bezier(.2,.8,.3,1)}",
    ".ta-bar-row .v{font-family:var(--mono);font-weight:800;color:#fff}",
    // 房间网格
    ".ta-rooms{width:100%;max-width:560px}",
    ".ta-rooms .grid{display:grid;grid-template-columns:repeat(20,1fr);gap:4px}",
    ".ta-rooms .grid i{aspect-ratio:1;border-radius:3px;background:rgba(255,255,255,.1);transform:scale(.6);transition:.25s}",
    ".ta-rooms .grid i.on{background:var(--gold);transform:none;box-shadow:0 0 8px rgba(232,184,75,.5)}",
    ".ta-rooms .grid i.m{background:rgba(192,57,43,.35)}",
    ".ta-rooms .grid i.m.on{background:#E05A4D}",
    // 矩阵
    ".ta-matrix table{border-collapse:collapse;font-size:clamp(10px,1.25vw,13px)}",
    ".ta-matrix th{background:rgba(255,255,255,.08);color:#DCE6F0;padding:7px 11px;font-weight:600;white-space:nowrap}",
    ".ta-matrix td{border:1px solid rgba(255,255,255,.14);padding:7px 12px;text-align:center;font-family:var(--mono);color:#fff;min-width:56px}",
    ".ta-matrix td.hi{outline:2px solid var(--gold);outline-offset:-2px}",
    ".ta-matrix td.flash{animation:taFlash .7s ease}",
    ".ta-matrix td.lit{background:rgba(232,184,75,.28);color:#FFE9B8;font-weight:800}",
    "@keyframes taFlash{0%{background:rgba(232,184,75,.85);transform:scale(1.12)}100%{background:rgba(232,184,75,.28);transform:none}}",
    // 步骤流
    ".ta-flow{display:flex;align-items:stretch;gap:8px;flex-wrap:wrap;justify-content:center;max-width:760px}",
    ".ta-flow .s{display:flex;flex-direction:column;align-items:center;gap:6px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:12px 14px;min-width:104px;opacity:.25;transform:translateY(8px);transition:.4s}",
    ".ta-flow .s.on{opacity:1;transform:none;border-color:var(--gold);background:rgba(232,184,75,.12)}",
    ".ta-flow .s b{width:22px;height:22px;border-radius:50%;background:var(--navy);color:#fff;font-size:11.5px;display:flex;align-items:center;justify-content:center;font-family:var(--mono)}",
    ".ta-flow .s span{font-size:12.5px;color:#DCE6F0;text-align:center;line-height:1.5}",
    ".ta-flow .arr,.ta-chain .arr{align-self:center;color:var(--gold-2);font-size:15px}",
    // 仪表盘
    ".ta-gauge svg{width:min(300px,80%);height:auto}",
    // 价格阶梯
    ".ta-ladder{width:100%;max-width:460px}",
    ".ta-ladder .r{display:flex;align-items:center;gap:14px;padding:9px 14px;margin:7px 0;border:1px solid rgba(255,255,255,.14);border-radius:9px;background:rgba(255,255,255,.05);opacity:0;transform:translateX(-14px);transition:.4s}",
    ".ta-ladder .r.in{opacity:1;transform:none}",
    ".ta-ladder .r.on{border-color:var(--gold);background:rgba(232,184,75,.14)}",
    ".ta-ladder .r .p{font-family:var(--mono);font-weight:800;color:var(--gold-2);min-width:76px;font-size:15px}",
    ".ta-ladder .r .d{font-size:12.5px;color:#DCE6F0;line-height:1.55}",
    // 连锁反应
    ".ta-chain{display:flex;align-items:stretch;gap:7px;flex-wrap:wrap;justify-content:center;max-width:820px}",
    ".ta-chain .c{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:11px 13px;min-width:118px;max-width:170px;opacity:.2;transform:scale(.94);transition:.4s}",
    ".ta-chain .c.on{opacity:1;transform:none;border-color:var(--gold);background:rgba(232,184,75,.1)}",
    ".ta-chain .c b{display:block;font-size:13px;color:#fff;margin-bottom:4px}",
    ".ta-chain .c span{font-size:11.5px;color:#B9C6D4;line-height:1.55}",
    "@media (max-width:640px){.ta-bar-row{grid-template-columns:86px 1fr 70px;font-size:12px}.ta-rooms .grid{grid-template-columns:repeat(12,1fr)}.ta-flow .s{min-width:88px}}"
  ].join("\n");
  var styleEl = document.createElement("style");
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  /* ---------- 工具 ---------- */
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function on(node, ev, fn) { node.addEventListener(ev, fn); }

  /* ---------- 舞台骨架 ---------- */
  function buildStage(root) {
    root.innerHTML =
      '<div class="ta-stage" id="taStage">' +
      '  <div class="ta-vig"></div>' +
      '  <div class="ta-data" id="taData"><span id="taDataTxt"></span></div>' +
      '  <div class="ta-viz" id="taViz"></div>' +
      '  <div class="ta-cap" id="taCap">' +
      '    <div class="no" id="taCapNo"></div>' +
      '    <div class="tx" id="taCapTxt"></div>' +
      '  </div>' +
      '</div>' +
      '<div class="ta-bar">' +
      '  <button class="ta-btn primary" id="taPlay">▶ 播放</button>' +
      '  <button class="ta-btn" id="taPrev">← 上一幕</button>' +
      '  <button class="ta-btn" id="taNext">下一幕 →</button>' +
      '  <div class="ta-prog"><i id="taProg"></i></div>' +
      '  <span class="ta-count" id="taCount">1 / 1</span>' +
      '</div>' +
      '<div class="ta-list" id="taList"></div>';
  }

  /* ---------- 可视化组件 ---------- */
  var VIZ = {
    /* 大数字滚动 */
    roll: function (box, v) {
      box.innerHTML = '<div class="ta-roll"><span class="n" id="taRollN">0</span><span class="u">' + esc(v.unit || "") + "</span>" +
        '<div class="lb">' + esc(v.label || "") + "</div></div>";
      var n = box.querySelector("#taRollN");
      var target = v.value, from = v.from == null ? 0 : v.from, t0 = null;
      var dec = (String(target).indexOf(".") >= 0) ? 1 : 0;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / 900);
        var val = from + (target - from) * (1 - Math.pow(1 - p, 3));
        n.textContent = dec ? val.toFixed(1) : Math.round(val).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    },

    /* 对比条 */
    bars: function (box, v) {
      var max = 0;
      v.items.forEach(function (it) { if (it.value > max) max = it.value; });
      var h = '<div class="ta-bars">';
      v.items.forEach(function (it) {
        var wpc = Math.max(4, it.value / max * 100);
        h += '<div class="ta-bar-row"><div class="k">' + esc(it.label) + "</div>" +
          '<div class="t"><i style="width:' + wpc.toFixed(1) + "%;background:" + (it.color || "var(--gold)") + '"></i></div>' +
          '<div class="v">' + esc(it.display || it.value) + "</div></div>";
      });
      h += "</div>";
      if (v.note) h += '<div class="ta-note">' + esc(v.note) + "</div>";
      box.innerHTML = h;
    },

    /* 房间网格（卖一间少一间） */
    rooms: function (box, v) {
      var total = v.total, sold = v.sold, per = v.perRow || 20;
      var h = '<div class="ta-rooms"><div class="grid">';
      for (var i = 0; i < total; i++) {
        var cls = i < sold ? "s" : "";
        if (v.mark && v.mark.indexOf(i) >= 0) cls += " m";
        h += '<i class="' + cls + '"></i>';
      }
      h += "</div></div>";
      box.innerHTML = h;
      var cells = box.querySelectorAll(".grid i");
      var k = 0;
      (function light() {
        if (k >= sold) return;
        cells[k].classList.add("on");
        k++;
        setTimeout(light, Math.max(2, 240 / Math.max(1, per)));
      })();
    },

    /* 双因子矩阵（表 A 式） */
    matrix: function (box, v) {
      var h = '<div class="ta-matrix"><table><tr><th></th>';
      v.cols.forEach(function (c) { h += "<th>" + esc(c) + "</th>"; });
      h += "</tr>";
      v.rows.forEach(function (r, ri) {
        h += "<tr><th>" + esc(r) + "</th>";
        v.cols.forEach(function (c, ci) {
          var cell = v.cells[ri][ci];
          var cls = "";
          if (v.hi && v.hi[0] === ri && v.hi[1] === ci) cls = ' class="hi"';
          h += "<td" + cls + ">" + esc(cell) + "</td>";
        });
        h += "</tr>";
      });
      h += "</table></div>";
      if (v.note) h += '<div class="ta-note">' + esc(v.note) + "</div>";
      box.innerHTML = h;
      var hi = box.querySelector(".hi");
      if (hi) {
        hi.classList.add("flash");
        setTimeout(function () { hi.classList.remove("flash"); hi.classList.add("lit"); }, 700);
      }
    },

    /* 步骤流 */
    flow: function (box, v) {
      var h = '<div class="ta-flow">';
      v.steps.forEach(function (s, i) {
        h += '<div class="s" data-i="' + i + '"><b>' + (i + 1) + "</b><span>" + esc(s) + "</span></div>";
        if (i < v.steps.length - 1) h += '<div class="arr">→</div>';
      });
      h += "</div>";
      box.innerHTML = h;
      var nodes = box.querySelectorAll(".s");
      for (var i = 0; i < nodes.length; i++) {
        (function (n, d) { setTimeout(function () { n.classList.add("on"); }, 260 * d); })(nodes[i], i);
      }
    },

    /* 仪表盘（指数） */
    gauge: function (box, v) {
      var val = v.value, min = v.min == null ? 0 : v.min, max = v.max == null ? 140 : v.max;
      var pct = Math.max(0, Math.min(1, (val - min) / (max - min)));
      var zones = v.zones || [{ to: 0.9, c: "#C0392B" }, { to: 1.1, c: "#B8894A" }, { to: 2, c: "#2A7D4F" }];
      var h = '<div class="ta-gauge"><svg viewBox="0 0 200 112">' +
        '<path d="M20,100 A80,80 0 0,1 180,100" fill="none" stroke="#22303F" stroke-width="14" stroke-linecap="round"/>';
      var acc = 0;
      zones.forEach(function (z) {
        var to = Math.min(1, z.to / 2);
        var a0 = Math.PI * (1 - acc), a1 = Math.PI * (1 - to);
        var x0 = 100 + 78 * Math.cos(a0), y0 = 100 - 78 * Math.sin(a0);
        var x1 = 100 + 78 * Math.cos(a1), y1 = 100 - 78 * Math.sin(a1);
        h += '<path d="M' + x0.toFixed(1) + "," + y0.toFixed(1) + " A78,78 0 0,1 " + x1.toFixed(1) + "," + y1.toFixed(1) +
          '" fill="none" stroke="' + z.c + '" stroke-width="4" stroke-linecap="round" opacity=".55"/>';
        acc = to;
      });
      var ang = Math.PI * (1 - pct);
      var nx = 100 + 62 * Math.cos(ang), ny = 100 - 62 * Math.sin(ang);
      h += '<line id="taNeedle" x1="100" y1="100" x2="' + nx.toFixed(1) + '" y2="' + ny.toFixed(1) +
        '" stroke="#E8B84B" stroke-width="3.5" stroke-linecap="round"/>' +
        '<circle cx="100" cy="100" r="6" fill="#E8B84B"/>' +
        '<text x="100" y="86" text-anchor="middle" fill="#fff" font-size="26" font-weight="800" font-family="var(--mono)">' + esc(val) + "</text>" +
        '<text x="100" y="104" text-anchor="middle" fill="#8FA3B8" font-size="10">' + esc(v.label || "") + "</text>" +
        "</svg></div>";
      box.innerHTML = h;
    },

    /* 价格阶梯 */
    ladder: function (box, v) {
      var h = '<div class="ta-ladder">';
      v.steps.forEach(function (s, i) {
        h += '<div class="r' + (s.on ? " on" : "") + '" data-i="' + i + '"><span class="p">' + esc(s.price) + "</span><span class=\"d\">" + esc(s.desc) + "</span></div>";
      });
      h += "</div>";
      box.innerHTML = h;
      var rows = box.querySelectorAll(".r");
      for (var i = 0; i < rows.length; i++) {
        (function (n, d) { setTimeout(function () { n.classList.add("in"); }, 200 * d); })(rows[i], i);
      }
    },

    /* 连锁反应 */
    chain: function (box, v) {
      var h = '<div class="ta-chain">';
      v.nodes.forEach(function (n, i) {
        h += '<div class="c" data-i="' + i + '"><b>' + esc(n.t) + "</b><span>" + esc(n.d) + "</span></div>";
        if (i < v.nodes.length - 1) h += '<div class="arr">➜</div>';
      });
      h += "</div>";
      box.innerHTML = h;
      var nodes = box.querySelectorAll(".c");
      for (var i = 0; i < nodes.length; i++) {
        (function (n, d) { setTimeout(function () { n.classList.add("on"); }, 320 * d); })(nodes[i], i);
      }
    },

    none: function (box) { box.innerHTML = ""; }
  };

  /* ---------- 播放器 ---------- */
  function mount(cfg) {
    var root = document.getElementById("taRoot");
    if (!root) return;
    buildStage(root);
    var stage = document.getElementById("taStage"),
      capBox = document.getElementById("taCap"),
      dataTxt = document.getElementById("taDataTxt"),
      vizBox = document.getElementById("taViz"),
      list = document.getElementById("taList"),
      prog = document.getElementById("taProg"),
      count = document.getElementById("taCount");
    var S = cfg.scenes, cur = 0, playing = false, timer = null, DUR = cfg.dur || 6500;

    S.forEach(function (s, i) {
      var d = el("div", "ta-item", "<b>" + (i + 1) + "</b><span>" + esc(s.cap) + "</span>");
      on(d, "click", function () { pause(); show(i); });
      list.appendChild(d);
    });

    function show(i) {
      cur = (i + S.length) % S.length;
      var s = S[cur];
      stage.classList.remove("shake");
      void stage.offsetWidth;

      capBox.classList.remove("on");
      dataTxt.classList.remove("on");
      setTimeout(function () {
        document.getElementById("taCapNo").textContent = "第 " + (cur + 1) + " 幕 / 共 " + S.length + " 幕";
        document.getElementById("taCapTxt").textContent = s.cap;
        capBox.classList.add("on");
      }, 200);

      if (s.data) {
        dataTxt.textContent = s.data;
        dataTxt.classList.add("on");
      }
      var viz = s.viz || { type: "none" };
      vizBox.innerHTML = "";
      vizBox.classList.remove("on");
      setTimeout(function () {
        vizBox.classList.add("on");
        var fn = VIZ[viz.type] || VIZ.none;
        try { fn(vizBox, viz); } catch (e) { vizBox.innerHTML = ""; }
      }, 160);

      prog.style.width = ((cur + 1) / S.length * 100) + "%";
      count.textContent = (cur + 1) + " / " + S.length;
      var items = list.children;
      for (var k = 0; k < items.length; k++) items[k].className = "ta-item" + (k === cur ? " now" : "");
    }

    function play() {
      playing = true;
      document.getElementById("taPlay").textContent = "⏸ 暂停";
      clearInterval(timer);
      timer = setInterval(function () {
        if (cur === S.length - 1) { pause(); return; }
        show(cur + 1);
      }, DUR);
    }
    function pause() {
      playing = false;
      document.getElementById("taPlay").textContent = "▶ 播放";
      clearInterval(timer);
    }

    on(document.getElementById("taPlay"), "click", function () { playing ? pause() : play(); });
    on(document.getElementById("taPrev"), "click", function () { pause(); show(cur - 1); });
    on(document.getElementById("taNext"), "click", function () { pause(); show(cur + 1); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { pause(); show(cur + 1); }
      else if (e.key === "ArrowLeft") { pause(); show(cur - 1); }
      else if (e.key === " ") { e.preventDefault(); playing ? pause() : play(); }
    });

    show(0);
  }

  window.THEATER = { mount: mount };
})();
