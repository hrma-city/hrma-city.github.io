/* ============================================================
 * RMC 考级认证 · 决策闯关游戏
 * 设计原则：不背知识点，靠"做选择"学会原理与操作流程。
 * 每级 = 一条真实运营 SOP，关卡顺序即流程顺序；
 * 选对推进流程，选错显示后果+原理，理解后可重试。
 * 通关记录写入 exam_results（登录态），并解锁下一级。
 * ============================================================ */
(function () {
  "use strict";

  /* ---------- 关卡数据：三级认证，每级一条 SOP ---------- */
  var QUEST = {
    L1: {
      title: "L1 基础运营官",
      badge: "入门",
      summary: "掌握收益管理的指标口径、三前提与标准日运营流程。",
      // SOP 步骤（关卡顺序与之对应）
      flow: ["开盘准备", "需求预测", "定价决策", "渠道分配", "日报监控"],
      stages: [
        {
          step: "开盘准备",
          role: "你是一家 200 间房酒店的前台值班经理，早班开盘。",
          ask: "开盘第一件事，你先做哪个？",
          choices: [
            { id: "a", label: "把昨夜剩余空房全部挂低价甩卖，先填满再说", ok: false,
              hint: "未确认可售库存就降价，会把本可卖高价的房贱卖，且易超售。开盘应先摸清'底数'。" },
            { id: "b", label: "核对系统可售房量、在住/预离/维修房，确认今日价格体系与房量上限", ok: true },
            { id: "c", label: "直接给携程打电话要更多订单", ok: false,
              hint: "渠道是后续步骤。开盘先搞清楚'自己有多少、什么价'，否则渠道来单也无法承接。" }
          ],
          why: "收益管理三前提之一是『固定且易逝的产能』：房间过夜即作废。开盘先确认可售库存与价格体系，是一切定价的基线——这不靠记忆，是每天必做的动作。"
        },
        {
          step: "需求预测",
          role: "开盘完成，你要把今天的定价定下来。",
          ask: "怎么判断今天该定高价还是低价？",
          choices: [
            { id: "a", label: "凭感觉，今天天气好应该人多就定高价", ok: false,
              hint: "直觉不可复用。收益管理的核心是'用数据估需求'，否则定价就是赌博。" },
            { id: "b", label: "看历史同日出租率 + 当前在手预订进度 + 周边竞品价格与活动，判断需求热度", ok: true },
            { id: "c", label: "永远定中间价最安全", ok: false,
              hint: "中间价≠最优。需求旺时亏、需求淡时仍空置，放弃了收益管理的全部价值。" }
          ],
          why: "需求预测不用背公式：拉历史同日、看已订房进度（pick-up）、对标竞品与本地活动，就能估出'今天是旺还是淡'。这一步决定了后面定价的松紧。"
        },
        {
          step: "定价决策",
          role: "判断出今天是『中等偏旺』。",
          ask: "首价（挂牌基准价）怎么定？",
          choices: [
            { id: "a", label: "只要比成本高点就行，薄利多销", ok: false,
              hint: "低于'成本+目标利润'的定价是亏本赚吆喝。定价必须覆盖变动成本并争取收益。" },
            { id: "b", label: "在单房变动成本之上，参考竞品价与今日热度，定一个'有竞争力又能保收益'的基准价", ok: true },
            { id: "c", label: "直接定全年最高价，爱来不来", ok: false,
              hint: "无差别顶价会吓跑可替代客源，竞品一降价客人就跑。定价要随需求弹性走。" }
          ],
          why: "定价逻辑只有一句：价 = 成本底线 + 需求溢价。需求旺、可替代性低时可上浮；反之要贴近竞争。这就是 ADR（平均房价）与 RevPAR（营收/可用房）的来源——不必背，会算即可。"
        },
        {
          step: "渠道分配",
          role: "基准价定了，订单从哪来？",
          ask: "OTA（携程/美团）和官网直订，你怎么配比？",
          choices: [
            { id: "a", label: "全压 OTA，流量大不用自己操心", ok: false,
              hint: "OTA 佣金 10–15%，全压等于把利润让给平台，且客户资产不在自己手里。" },
            { id: "b", label: "以直订（官网/会员/企业协议）为主保留利润池，OTA 作补充高峰泄洪，并为直订设专属权益", ok: true },
            { id: "c", label: "直订和 OTA 完全同价同库存，无所谓", ok: false,
              hint: "同价会让直订毫无优势，客户永远走 OTA 付佣金。应给直订差异权益引导自有流量。" }
          ],
          why: "渠道管理的本质是'把高利润订单留给低成本渠道'。直订零/低佣金，应作为利润池重点经营；OTA 用于补高峰与拉新。配比随淡旺调整——这是持续动作，不是一次设定。"
        },
        {
          step: "日报监控",
          role: "营业结束，你要看今日成绩单。",
          ask: "最该盯哪个信号判断'今天收益做得好不好'？",
          choices: [
            { id: "a", label: "只看入住了多少间房", ok: false,
              hint: "满房≠赚到。低价满房可能不如高价 8 成出租。要看'每间可用房赚了多少'。" },
            { id: "b", label: "看 RevPAR（营收÷可用房）、出租率与渠道结构，对比目标找异常", ok: true },
            { id: "c", label: "看携程排名涨没涨", ok: false,
              hint: "排名是手段不是目的。排名好但收益差，是本末倒置。" }
          ],
          why: "RevPAR = ADR × 出租率，是衡量'每间房产出'的唯一综合指标。日报监控就是对比 RevPAR 与目标、拆解哪环掉了链子——看懂这一张表，基础运营就出师了。"
        }
      ]
    },

    L2: {
      title: "L2 进阶收益管理师",
      badge: "进阶",
      summary: "掌握竞争对标、需求弹性、超售、库存置换与动态调价。",
      flow: ["竞争对标", "弹性定价", "超售管理", "库存置换", "动态调价"],
      stages: [
        {
          step: "竞争对标",
          role: "你升任收益经理，要为酒店建立'竞争集'。",
          ask: "选哪几家做对标最合理？",
          choices: [
            { id: "a", label: "全市星级最高的几家豪华酒店", ok: false,
              hint: "客群与价位错位，对标无意义。竞争集要'客人会在它们之间比价'的酒店。" },
            { id: "b", label: "位置相近、档次相当、客群重叠（商务/ leisure 一致）的 4–6 家", ok: true },
            { id: "c", label: "只盯价格最低的那一家", ok: false,
              hint: "最低价者未必是你的真实竞争者，可能是不同定位。要看'可替代集合'。" }
          ],
          why: "竞争集不是'谁名气大'，而是'客人实际在它们之间切换'的酒店群。对标对了，价格战才打在点上——这是后续所有弹性决策的地基。"
        },
        {
          step: "弹性定价",
          role: "竞品突然全线下调 8%，你的酒店定位中端、可替代性强。",
          ask: "你怎么动价？",
          choices: [
            { id: "a", label: "纹丝不动，坚持品牌不降价", ok: false,
              hint: "可替代性强却不跟，客人直接去竞品。要看弹性：可替代高时应部分跟随。" },
            { id: "b", label: "评估自身弹性：可替代高则跟降保出租率，差异化强则守价保收益，并用权益而非裸价应战", ok: true },
            { id: "c", label: "立刻降得比它还低抢客", ok: false,
              hint: "自杀式价格战双输，且破坏价格体系。先算弹性再决定跟随幅度。" }
          ],
          why: "需求弹性=价格变一点、需求变多少。可替代性高（如标准商务房）弹性大，宜跟；有差异（位置/品牌/服务）弹性小，可守。核心决策：'我跟不跟、跟多少'，永远比'降不降'更精准。"
        },
        {
          step: "超售管理",
          role: "历史 no-show（预订未到）率约 6%，今天已订满。",
          ask: "要不要超售、超多少？",
          choices: [
            { id: "a", label: "绝不超售，满房就停，宁可空着", ok: false,
              hint: "6% no-show 意味着每天白白空置约 12 间。适度超售是行业标配，问题在于'度'。" },
            { id: "b", label: "按 no-show 分布适度超售（如超 3–5%），并备好超售补偿预案", ok: true },
            { id: "c", label: "既然常 no-show，直接超售 20% 冲收益", ok: false,
              hint: "超售过头必拒载，赔付+口碑损失远超收益。超售幅度要匹配历史波动，不是越多越好。" }
          ],
          why: "超售是用'概率'换'确定收益'：no-show 必然发生，适度超售能填满空房。但超售过头会拒载（walk-in 赔付+差评）。平衡点是'期望空置成本 ≈ 期望拒载成本'——理解这条，超售就不再神秘。"
        },
        {
          step: "库存置换",
          role: "剩最后 10 间房，一个低价团队（¥380/间）想包圆，但散客基准价 ¥680 仍在进单。",
          ask: "怎么处理？",
          choices: [
            { id: "a", label: "立刻接团队，10 间锁定省心", ok: false,
              hint: "若剩余房散卖期望收益 > 团队价，接团是亏的。要算'置换'后的边际收益。" },
            { id: "b", label: "对比'团队总价'与'剩房按当前节奏散卖的期望收益'，只在不亏时接，或限部分房数", ok: true },
            { id: "c", label: "一律不接团队，散客永远优先", ok: false,
              hint: "团队能带来确定量与餐饮连带，全拒也会错失。关键是'边际'比较而非绝对优先。" }
          ],
          why: "库存置换=比较'接这单'与'留房给更高价'的期望差。永远用边际收益决策，而非'类型偏好'。这是收益管理从'卖房'升级为'卖最优组合'的关键一步。"
        },
        {
          step: "动态调价",
          role: "入住日前 1 天，在手预订远超预期、剩余房不多且需求仍旺。",
          ask: "剩余房怎么调？",
          choices: [
            { id: "a", label: "维持原价，别节外生枝", ok: false,
              hint: "需求旺、库存少却不提价，等于把稀缺房贱卖，放弃了 yield（收益管理）的精华。" },
            { id: "b", label: "上调剩余房价格，随库存收紧逐档提价，收割高意愿客", ok: true },
            { id: "c", label: "反而降价促最后几间快清", ok: false,
              hint: "旺市降价是反向操作，把本可高卖的房送出去。淡市才用降价清尾。" }
          ],
          why: "动态定价（yield management）的核心：价随'剩余库存×剩余时间×需求强度'走。越临近、越稀缺、越旺，价越高。这套节奏贯穿所有行业——酒店、航司、景区、餐厅同理。"
        }
      ]
    },

    L3: {
      title: "L3 综合决策官",
      badge: "实战",
      summary: "跨六大行业通盘运营：研判、容量、收益保卫战、渠道协同与危机处置。",
      flow: ["场景研判", "容量规划", "收益保卫战", "跨渠道协同", "危机处置"],
      stages: [
        {
          step: "场景研判",
          role: "城市将办大型展会，你负责旗下酒店+周边餐厅+景区的联合收益。",
          ask: "第一步研判什么？",
          choices: [
            { id: "a", label: "直接全场涨价一倍", ok: false,
              hint: "未研判峰值分布就涨，可能错杀长尾需求、引发投诉。先看清'峰在哪、谁来得猛'。" },
            { id: "b", label: "拆解展会的客群结构、到离节奏与各行业需求峰值，定位真正的稀缺时段", ok: true },
            { id: "c", label: "只管酒店，餐厅景区各管各的", ok: false,
              hint: "综合收益的机会在'协同'。分散研判会漏掉跨业态的打包与导流红利。" }
          ],
          why: "综合决策先'拆解峰值'：展会客群住宿旺在到离日、用餐旺在午晚、观展动线带火周边。找准稀缺时段，资源才配得上价——研判不清，后面全错。"
        },
        {
          step: "容量规划",
          role: "你管的一家热门景区，节假日爆满、体验崩塌、投诉激增。",
          ask: "容量怎么管？",
          choices: [
            { id: "a", label: "来多少放多少，满负荷赚最多", ok: false,
              hint: "超载伤体验、引安全事故、毁口碑，长期收益反噬。容量有'舒适上限'。" },
            { id: "b", label: "设分时预约上限，用预约制削峰填谷，超载时段溢价+引流至闲时", ok: true },
            { id: "c", label: "直接限流关门谢客", ok: false,
              hint: "一刀切限流浪费收益。用'分时+预约+闲时激励'把总量留住、体验保住。" }
          ],
          why: "容量管理=在'体验上限'内最大化产出。分时预约削峰填谷，闲时低价引流、忙时溢价，既保口碑又吃满收益。这套逻辑餐厅翻台、航司舱位、剧院场次通用。"
        },
        {
          step: "收益保卫战",
          role: "竞品在展会期发动价格战， your 酒店定位偏高端。",
          ask: "怎么守住收益？",
          choices: [
            { id: "a", label: "立刻全面跟降到同一水平", ok: false,
              hint: "高端定位跟降，既丢利润又伤品牌，还未必抢到价格敏感客。价值战优于价格战。" },
            { id: "b", label: "守价值：强化差异（含早/延迟退/接驳/会员权益），用'总价值'而非裸价应战，仅对边际可替代房有限跟", ok: true },
            { id: "c", label: "涨价彰显高端，不理竞品", ok: false,
              hint: "完全无视会丢可替代客。应'核心守价值、边缘有限跟'，分层应对。" }
          ],
          why: "收益保卫战打的是'价值结构'不是'价格数字'。用权益包提升感知价值、用会员黏住高价值客、仅对可替代房做有限跟随——保住 RevPAR 同时护住品牌。这是 L3 的分水岭能力。"
        },
        {
          step: "跨渠道协同",
          role: "你要把酒店、餐厅、景区票打包成'展会通票'。",
          ask: "渠道与定价怎么协同？",
          choices: [
            { id: "a", label: "各渠道各定价，通票只是简单相加打折", ok: false,
              hint: "简单相加打折伤单品利润，且渠道各自为战。协同要'组合溢价+导流'。" },
            { id: "b", label: "用会员/直订作枢纽打包组合价，给跨业态专属权益，把 OTA 客流导向自有池", ok: true },
            { id: "c", label: "只在 OTA 上卖通票，省事", ok: false,
              hint: "OTA 上卖组合仍付佣金且无客户资产。自有渠道才是协同红利的归属地。" }
          ],
          why: "跨渠道协同的杠杆在'自有池'：用直订/会员把多业态打包成组合价与专属权益，既提升客单价又沉淀客户资产。OTA 作拉新入口而非利润归宿——这是综合收益官的操盘视角。"
        },
        {
          step: "危机处置",
          role: "突发极端天气，未来 3 天订单大量取消，酒店与景区需求骤降。",
          ask: "怎么止损与恢复？",
          choices: [
            { id: "a", label: "什么都不做，等天气过去", ok: false,
              hint: "坐等空置是纯损失。危机期要主动'保现金流+留客户资产'。" },
            { id: "b", label: "对受影响客免改签费留关系；对空置期推本地低价套餐/企业会议填仓；天气后做召回营销", ok: true },
            { id: "c", label: "趁机大幅涨价挽回损失", ok: false,
              hint: "危机中涨价既失道义又失客户。此时目标是'填仓保关系'，不是收割。" }
          ],
          why: "危机处置三动作：① 柔性政策（免改签）保客户资产；② 空置期用低价本地套餐/企业会议填仓保现金流；③ 事后召回营销恢复。收益管理的尽头，是'在不确定中保住可复购的关系与现金流'。"
        }
      ]
    }
  };

  var ORDER = ["L1", "L2", "L3"];
  var STORE_KEY = "rmc_quest_pass";

  function loadPass() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function savePass(p) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch (e) {}
  }
  function isUnlocked(lv, pass) {
    if (lv === "L1") return true;
    var i = ORDER.indexOf(lv);
    return !!(pass[ORDER[i - 1]]);
  }

  /* ---------- DOM 助手 ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------- 渲染：等级选择 ---------- */
  function renderLevels() {
    var pass = loadPass();
    $("qStage").hidden = true;
    $("qResult").hidden = true;
    $("qLevels").hidden = false;
    var box = $("qLevelCards");
    box.innerHTML = "";
    ORDER.forEach(function (lv) {
      var d = QUEST[lv];
      var unlocked = isUnlocked(lv, pass);
      var done = !!pass[lv];
      var card = el("div", "qz-lv" + (unlocked ? "" : " locked") + (done ? " done" : ""));
      card.innerHTML =
        "<b>" + esc(d.title) + "</b>" +
        "<span>" + esc(d.summary) + "</span>" +
        (done ? '<div class="qz-doneflag">✓ 已通关</div>' : (unlocked ? "" : '<div class="qz-lock">🔒 通关上一级解锁</div>'));
      if (unlocked) {
        card.onclick = function () { startLevel(lv); };
      }
      box.appendChild(card);
    });
  }

  /* ---------- 渲染：单级闯关 ---------- */
  var cur = { lv: null, idx: 0, picked: null };

  function startLevel(lv) {
    cur = { lv: lv, idx: 0, picked: null };
    $("qLevels").hidden = true;
    $("qResult").hidden = true;
    $("qStage").hidden = false;
    renderStage();
  }

  function renderStage() {
    var d = QUEST[cur.lv];
    var st = d.stages[cur.idx];
    // 流程条
    var flow = $("qFlow");
    flow.innerHTML = "";
    d.flow.forEach(function (name, i) {
      var cls = "qf-step" + (i < cur.idx ? " done" : (i === cur.idx ? " on" : ""));
      flow.appendChild(el("div", cls,
        '<span class="qf-dot">' + (i < cur.idx ? "✓" : (i + 1)) + "</span>" + esc(name)));
    });
    // 关卡卡
    var body = $("qStageBody");
    body.innerHTML = "";
    var head = el("div", "q-stage-head",
      '<div class="q-stage-step">' + esc(d.title) + " · 第 " + (cur.idx + 1) + "/" + d.stages.length +
      " 步 · " + esc(st.step) + "</div>");
    var role = el("p", "q-role", esc(st.role));
    var ask = el("p", "q-ask", esc(st.ask));
    body.appendChild(head);
    body.appendChild(role);
    body.appendChild(ask);
    st.choices.forEach(function (c) {
      var btn = el("button", "q-choice");
      btn.innerHTML = esc(c.label);
      btn.onclick = function () { pick(c, btn); };
      body.appendChild(btn);
    });
    $("qFeedback").innerHTML = "";
    $("qFeedback").hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function pick(choice, btn) {
    var d = QUEST[cur.lv];
    var st = d.stages[cur.idx];
    // 锁定所有选项
    var all = $("qStageBody").querySelectorAll(".q-choice");
    all.forEach(function (b) { b.disabled = true; b.classList.add("locked"); });
    var fb = $("qFeedback");
    fb.hidden = false;
    if (choice.ok) {
      btn.classList.add("correct");
      fb.className = "q-feedback ok";
      fb.innerHTML =
        '<div class="qf-badge">✓ 这一步选得对</div>' +
        '<div class="qf-why"><b>原理：</b>' + esc(st.why) + "</div>" +
        '<div class="qf-flow">📍 这一步在「' + esc(d.title) + "」流程里属于：<b>" + esc(st.step) + "</b></div>";
      var next = el("button", "qz-btn", cur.idx + 1 < d.stages.length ? "进入下一步 →" : "完成本級 →");
      next.onclick = advance;
      fb.appendChild(next);
    } else {
      btn.classList.add("wrong");
      fb.className = "q-feedback no";
      fb.innerHTML =
        '<div class="qf-badge">✗ 这一步欠妥，看看为什么</div>' +
        '<div class="qf-why"><b>后果：</b>' + esc(choice.hint) + "</div>" +
        '<div class="qf-why"><b>正确思路：</b>' + esc(st.why) + "</div>";
      var retry = el("button", "qz-btn qz-btn-ghost", "我理解了，重新选 →");
      retry.onclick = function () { renderStage(); };
      fb.appendChild(retry);
    }
  }

  function advance() {
    var d = QUEST[cur.lv];
    cur.idx++;
    if (cur.idx < d.stages.length) {
      renderStage();
    } else {
      finishLevel(cur.lv);
    }
  }

  /* ---------- 通关 ---------- */
  function finishLevel(lv) {
    var pass = loadPass();
    pass[lv] = true;
    savePass(pass);
    // 登录态写入 exam_results，使证书申领可用
    recordExam(lv);
    $("qStage").hidden = true;
    $("qLevels").hidden = true;
    $("qResult").hidden = false;
    var d = QUEST[lv];
    var nextLv = ORDER[ORDER.indexOf(lv) + 1];
    var mastered = d.flow.concat(["原理闭环", "操作流程"]);
    var html =
      '<div class="q-pass-hero">🎓 ' + esc(d.title) + " 通关！</div>" +
      '<p class="q-pass-sub">你已顺着真实运营流程做完决策，掌握了本级<b>原理</b>与<b>操作流程</b>——无需背诵任何知识点。</p>' +
      '<div class="q-pass-card"><h4>本級掌握的流程（SOP）</h4><ul>' +
      d.flow.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") +
      "</ul></div>";
    if (nextLv) {
      html +=
        '<div class="q-next"><button class="qz-btn" id="btnNextLv">解锁并进入 ' + esc(QUEST[nextLv].title) + " →</button>" +
        '<a class="qz-btn qz-btn-ghost" href="cert.html">前往资格认证页申领 ' + esc(lv) + " 证书</a></div>";
    } else {
      html +=
        '<div class="q-next"><div class="q-allclear">🏆 三级全通关，你已具备综合收益决策能力！</div>' +
        '<a class="qz-btn" href="cert.html">前往资格认证页申领 L3 证书</a></div>';
    }
    $("qResult").innerHTML = html;
    if (nextLv) {
      $("btnNextLv").onclick = function () { startLevel(nextLv); };
    }
  }

  function recordExam(lv) {
    try {
      if (window.SB && window.__rmcSession) {
        window.SB.from("exam_results").upsert({
          level: lv, passed: true, score: 100,
          finished_at: new Date().toISOString()
        }, { onConflict: "user_id,level" }).then(function () {}, function () {});
      }
    } catch (e) {}
  }

  /* ---------- 初始化 ---------- */
  function init() {
    if (!$("qLevelCards")) return;
    $("btnBack").onclick = renderLevels;
    renderLevels();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.RMCQuest = { QUEST: QUEST, ORDER: ORDER, renderLevels: renderLevels };
})();
