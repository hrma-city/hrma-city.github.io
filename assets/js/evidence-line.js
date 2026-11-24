/* RMC 工具结果页 · 依据溯源行
 * 作用：在工具输出结果后自动追加一行「本判断依据：教材第 N 章 / 法典表 X」。
 * 设计原则：不改动各工具的计算逻辑与 DOM，只在结果容器后插入一个提示块。
 * 映射仅为该工具主要对应的章节/表号，具体以教材原文为准。
 */
(function () {
  var MAP = {
    'diagnose.html':                    { sel: '#findings',    text: '教材第 2–4 章（三项核心指标、竞争三件套）· 法典表 C / D' },
    'attribution-coach.html':           { sel: '#res',         text: '教材第 12 章（超额预订）· 法典表 H' },
    'pricing-decision.html':            { sel: '#res',         text: '教材第 5 章（什么时候涨价）· 法典表 A' },
    'team-replacement-decision.html':   { sel: '#res',         text: '教材第 18 章（团队置换）· 法典表 J' },
    'competitor-pricing-decision.html': { sel: '#res',         text: '教材第 6 章（竞品跟价）· 法典表 B' },
    'lesson-builder.html':              { sel: '#outCard',     text: '教材判定表 46 张（每章一张）· 教材题库 / 认证题库' },
    'xhs-note-gen.html':                { sel: '#out',         text: '教材第 37 章（中国渠道生态）· 内容依据须回查原文' },
    'rm-personality.html':              { sel: '#res',         text: '教材第 42 章（收益岗位与职业发展）' },
    'weekly-brief-gen.html':            { sel: '#out',         text: '教材第 27 章（报表体系）· 一页纸体例' },
    'skill-passport.html':              { sel: '#cert',        text: '教材 46 章 · 16 个知识域（见题库 dom 字段）' },
    'mock-interview.html':              { sel: '#stage',       text: '教材第 42 章 · 认证题库 253 题（按 14 模块）' },
    'global-content-card.html':         { sel: '#out',         text: '教材第 35 章（跨行业参数）· 出海场景需本地复核' },
    'rm-audit.html':                    { sel: '#out',         text: '教材第 22 章（执行标准与收益例会）· 法典表 A–O' },
    'benchmark-fit.html':               { sel: '#out',         text: '教材第 3 章（MPI / ARI / RGI）' },
    'action-plan-90.html':              { sel: '#out',         text: '教材第 21 章（每日实操流程）· 第 25 章（年度预算）' },
    'blocker-check.html':               { sel: '#result',      text: '教材第 36 章（常见误区 30 个坑）' },
    'quiz-battle.html':                 { sel: '#stage',       text: '教材题库 466 题（按 46 章组织）' },
    'class-insight.html':               { sel: '#stats',       text: '决策留痕（localStorage）· 汇总口径见各工具页' }
  };

  var file = location.pathname.split('/').pop();
  var cfg = MAP[file];
  if (!cfg) return;

  function insert() {
    var el = document.querySelector(cfg.sel);
    if (!el || document.querySelector('.evidence-line')) return;
    var d = document.createElement('div');
    d.className = 'evidence-line';
    d.setAttribute('style', 'font-size:12px;color:#1c7a5a;background:#eaf6f0;border-left:3px solid #1c7a5a;border-radius:5px;padding:7px 10px;margin-top:10px;line-height:1.6');
    d.innerHTML = '<b>本判断依据：</b>' + cfg.text + ' · <a href="naming-convention.html" style="color:#1c7a5a">资源口径说明</a>';
    el.parentNode.insertBefore(d, el.nextSibling);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(insert, 120); });
  } else {
    setTimeout(insert, 120);
  }

  // 结果区多为动态显示/替换，持续观察；依据行若被重绘冲掉则补插。
  // 不在 15 秒后断开——工具可能延迟重绘，断开会让溯源行永久丢失。
  if (window.MutationObserver) {
    var ob = new MutationObserver(function () { insert(); });
    ob.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }
})();
