/* ==========================================================================
   RMC 产品超市 · 商品目录数据层
   --------------------------------------------------------------------------
   用途：store.html 的唯一商品数据源。集中管理名称/分类/价格/预览/上手时间/下一步。
   原则：① 每件商品的"链接/预览"都指向站点真实存在的文件（已核实）；
        ② 价格全部沿用既有拍板体系，不新造；
        ③ 用户视角文案——只写"你能用它做什么"，不写"引流/转化/高客单"。
   维护：新增商品只改本文件，不动 store.html。
   ========================================================================== */
(function (w) {
  'use strict';

  var CATALOG = [
    /* ---------- 工具 · 4 件（免费自取 / 单品） ---------- */
    {
      id: 'tool-diagnose', cat: 'tool', name: '收益健康诊断',
      value: '填入本店 OCC / ADR，30 秒看处在什么位置、下一步该看哪张表。',
      price: '免费自取', priceType: 'free',
      link: 'diagnose.html', preview: '', minutes: 2,
      next: '看完诊断 → 拿《每日收益日报》模板开始记录',
      tags: ['经营诊断', '免登录']
    },
    {
      id: 'tool-rm-audit', cat: 'tool', name: '收益管理成熟度自评',
      value: '40 道题出一张能力雷达图，看清团队卡在取数、判断还是执行。',
      price: '免费自取', priceType: 'free',
      link: 'rm-audit.html', preview: '', minutes: 5,
      next: '看完雷达图 → 按最弱那一项去对应工具区',
      tags: ['自评', '免登录']
    },
    {
      id: 'tool-attribution', cat: 'tool', name: '归因追问陪练',
      value: '决策错了不直接给答案，先问"你当时看到什么信号"，再给纠偏卡。',
      price: '免费自取', priceType: 'free',
      link: 'attribution-drill.html', preview: '', minutes: 8,
      next: '做完 3 个场景 → 去社区晒你的偏误分布',
      tags: ['思维训练', '3 个样本']
    },
    {
      id: 'tool-calc', cat: 'tool', name: '收益计算中心',
      value: 'RevPAR / MPI / ARI / 量差价差一次算清，不用记公式。',
      price: '免费自取', priceType: 'free',
      link: 'calc-center-v2.html', preview: '', minutes: 3,
      next: '算完 → 用模板把结果落到每日台账',
      tags: ['计算', '免公式']
    },

    /* ---------- 模板 · 3 件（预览齐，付费） ---------- */
    {
      id: 'tpl-daily', cat: 'template', name: '每日收益日报',
      value: '填黄格、出结果，自动算 MPI / ARI / RGI / NRevPAR。',
      price: '单品 ¥99', priceType: 'paid',
      link: 'assets/previews/pv_71087bdb50_01_每日收益日报.html',
      preview: 'assets/previews/pv_71087bdb50_01_每日收益日报.html',
      download: 'templates/01_每日收益日报.xlsx', minutes: 5,
      next: '拿到表 → 配《收益健康诊断》一起用',
      tags: ['Excel', '有预览']
    },
    {
      id: 'tpl-ledger', cat: 'template', name: '调价台账（含命中率复盘）',
      value: '每次调价记下"看到什么数、查哪张表、做了什么"，30 天后自动算命中率。',
      price: '单品 ¥99', priceType: 'paid',
      link: 'assets/previews/pv_68d4a59eb9_04_调价台账.html',
      preview: 'assets/previews/pv_68d4a59eb9_04_调价台账.html',
      download: 'templates/04_调价台账.xlsx', minutes: 6,
      next: '记满 30 天 → 用命中率去社区晒战绩',
      tags: ['Excel', '有预览']
    },
    {
      id: 'tpl-overbook', cat: 'template', name: '超额预订计算器',
      value: '按 No-show 分档算超售上限，附团队询价与会议综合贡献。',
      price: '单品 ¥99', priceType: 'paid',
      link: 'assets/previews/pv_6d691de693_第08章-实验8-1超售测算表.html',
      preview: 'assets/previews/pv_6d691de693_第08章-实验8-1超售测算表.html',
      download: 'templates/08_超额预订计算器.xlsx', minutes: 5,
      next: '算完 → 对照教材第 12 章的归因陪练',
      tags: ['Excel', '有预览']
    },

    /* ---------- 教材 · 3 件（按章 / 全集） ---------- */
    {
      id: 'book-textbook', cat: 'book', name: '46 章教材在线读',
      value: '七篇框架、每章一个决定＋一张判定表，读者 / 学生 / 教师三版可选。',
      price: '章节选读', priceType: 'sample',
      link: 'textbook.html', preview: 'textbook.html', minutes: 10,
      next: '读完一章 → 用该章的工具和题库练一遍',
      tags: ['46 章', '三版']
    },
    {
      id: 'book-aicourse', cat: 'book', name: '46 门 AI 互动课',
      value: '每章 5 环节：讲稿 / 案例 / 沙盘 / 测验 / 判定表，单章可试听。',
      price: '单章 ¥9.9 · 全集 ¥999–1999', priceType: 'paid',
      link: 'ai-course-hub.html', preview: 'trial-ch12.html', minutes: 15,
      next: '试听一章 → 买全集配模板用',
      tags: ['AI 课', '可试听']
    },
    {
      id: 'book-quiz', cat: 'book', name: '466 题题库',
      value: '按 46 章 16 知识域自测，逐题带答案与解析回讲。',
      price: '自测免费 · 认证另计', priceType: 'sample',
      link: 'quiz-bank.html', preview: 'quiz-bank.html', minutes: 10,
      next: '自测完 → 对应章节补读教材',
      tags: ['466 题', '带解析']
    }
  ];

  var CATS = [
    { id: 'all', name: '全部', desc: '10 件代表商品（首批上架）' },
    { id: 'tool', name: '工具', desc: '打开就能算、能练' },
    { id: 'template', name: '模板', desc: '填数出结果，全部带预览' },
    { id: 'book', name: '课件教材', desc: '按章选购或整包' }
  ];

  w.RMC_STORE = { version: '2026-11-21', CATALOG: CATALOG, CATS: CATS };
})(window);
