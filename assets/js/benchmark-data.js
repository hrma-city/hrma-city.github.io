/* ==========================================================================
 * RMC 收益管理社区 · 行业基准真实数据
 * --------------------------------------------------------------------------
 * 更新方式：只改本文件即可完成一次基准数据更新（页面自动读取）。
 *
 * 数据纪律（重要，请遵守）：
 *   1. 每一个数字必须带 src（来源键）与 asOf（数据期）。
 *   2. tier 分级：official=官方口径；third=第三方样本；derived=由官方数字推算。
 *   3. 严禁填入无来源的数字。拿不到就留空并在页面标「待接入」。
 *   4. 不同口径（如文旅部星级饭店 vs STR 全样本）绝不可混在同一行对比。
 * ========================================================================== */
window.RMC_BENCHMARK = {
  meta: {
    updated: "2026-09-09",
    period: "2025 全年（最新可得官方数据）",
    disclaimer: "本页数据均来自公开渠道，仅供行业参考。官方统计为全量口径，第三方为抽样样本，两者不可直接混用。"
  },

  /* ---------------- 来源 ---------------- */
  sources: {
    mct2025: {
      name: "文化和旅游部《2025年文化和旅游发展统计公报》",
      org: "中华人民共和国文化和旅游部",
      pub: "2026-06-02",
      url: "https://new.qq.com/rain/a/20260602A06O4F00",
      caliber: "全国星级饭店统计直报系统（全量）"
    },
    str2025: {
      name: "STR / CoStar《2025 中国酒店业绩回顾》",
      org: "STR（CoStar Group）",
      pub: "2026-01-22",
      url: "https://www.costar.com/products/str-benchmark",
      caliber: "中国内地商业酒店抽样样本（含非星级与连锁）"
    },
    caacConf2026: {
      name: "2026 年全国民航工作会议（2025 年成绩单）",
      org: "中国民用航空局",
      pub: "2026-01",
      url: "https://www.caac.gov.cn/",
      caliber: "全行业（全量）"
    },
    caacH1: {
      name: "2025 年全国民航年中工作电视电话会议",
      org: "中国民用航空局",
      pub: "2025-07-22",
      url: "https://www.caac.gov.cn/XWZX/MHYW/202507/t20250722_228023.html",
      caliber: "2025 年上半年（全量）"
    },
    caacSummer: {
      name: "2025 年民航暑运数据（7/1–8/31）",
      org: "中国民用航空局（人民网转载）",
      pub: "2025-09-01",
      url: "https://finance.people.com.cn/n1/2025/0901/c1004-40554715.html",
      caliber: "暑运期间（全量）"
    },
    big3: {
      name: "2025 年三大航经营数据（年报）",
      org: "中国国航 / 东方航空 / 南方航空（中国旅游新闻网综述）",
      pub: "2026-04-09",
      url: "https://www.ctnews.com.cn/paper/content/202604/09/content_112136.html",
      caliber: "上市公司披露"
    },
    shStats9: {
      name: "上海市统计局《2025年9月份星级饭店》",
      org: "上海市统计局（数据源：上海市文化和旅游局）",
      pub: "2025-10-22",
      url: "https://tjj.sh.gov.cn/ydsj57/20251019/e00a763935ff4d86a5dd641062c95c9f.html",
      caliber: "上海市星级饭店（全量）"
    },
    shStats12: {
      name: "上海市统计局《2025年12月份星级饭店》",
      org: "上海市统计局（数据源：上海市文化和旅游局）",
      pub: "2026-01-19",
      url: "https://tjj.sh.gov.cn/ydsj57/20260119/4c9c938843f1466d8f14c4be7d0ac6d9.html",
      caliber: "上海市星级饭店（全量）"
    },
    shMonthly: {
      name: "上海市星级饭店 1–9 月月度经济指标",
      org: "东方财富（数据源：上海市文化和旅游局）",
      pub: "2025-11-23",
      url: "https://finance.eastmoney.com/a/202511233572195170.html",
      caliber: "上海市星级饭店（月度 ADR 序列）"
    },
    sh11: {
      name: "上海前 11 月入境游与住宿市场数据",
      org: "新民晚报（腾讯新闻转载）",
      pub: "2025-12-30",
      url: "https://new.qq.com/rain/a/20251230A03DXU00",
      caliber: "上海市星级饭店（1–11 月累计）"
    }
  },

  /* ---------------- 宏观：文旅大盘 ---------------- */
  macro: {
    period: "2025 全年",
    items: [
      { k: "国内出游人次",   v: "65.22 亿",   yoy: "+16.2%", src: "mct2025", tier: "official" },
      { k: "国内出游花费",   v: "6.30 万亿元", yoy: "+9.5%",  src: "mct2025", tier: "official" },
      { k: "入境游客",       v: "15,450 万人次", yoy: "+17.1%", src: "mct2025", tier: "official" },
      { k: "其中外国游客",   v: "3,517 万人次", yoy: "+30.6%", src: "mct2025", tier: "official" },
      { k: "内地居民出境",   v: "14,836 万人次", yoy: "+20.8%", src: "mct2025", tier: "official" },
      { k: "A 级景区接待游客", v: "75.1 亿人次", yoy: "—",   src: "mct2025", tier: "official" },
      { k: "A 级景区旅游收入", v: "5,544.9 亿元", yoy: "—",  src: "mct2025", tier: "official" }
    ]
  },

  /* ---------------- 住宿业 ---------------- */
  lodging: {
    official: {
      period: "2025 全年",
      caliber: "全国星级饭店（统计直报系统，全量）",
      note: "与 STR 样本口径不同：星级饭店多为全服务老酒店，出租率与房价均低于含有限服务连锁的全样本。",
      items: [
        { k: "星级饭店总数",   v: "7,586 家",        yoy: "—",      src: "mct2025", tier: "official" },
        { k: "营业收入",       v: "1,448.0 亿元",    yoy: "—",      src: "mct2025", tier: "official" },
        { k: "平均房价 ADR",   v: "360.2 元/间·夜",  yoy: "—",      src: "mct2025", tier: "official" },
        { k: "平均出租率 Occ", v: "46.8%",           yoy: "—",      src: "mct2025", tier: "official" },
        { k: "RevPAR",         v: "168.6 元/间·夜",  yoy: "—",      src: "mct2025", tier: "derived",
          note: "由 360.2 × 46.8% 推算，非官方直接公布" }
      ]
    },
    thirdParty: {
      period: "2025 全年（同比 2024）",
      caliber: "中国内地商业酒店抽样样本（STR）",
      note: "已交叉校验：422.50 × 63.2% = 267.02，与 STR 公布的 RevPAR 完全一致。",
      items: [
        { k: "平均出租率 Occ", v: "63.2%",           yoy: "-0.8pp", src: "str2025", tier: "third" },
        { k: "平均房价 ADR",   v: "422.50 元",       yoy: "-1.4%",  src: "str2025", tier: "third" },
        { k: "RevPAR",         v: "267.02 元",       yoy: "-2.6%",  src: "str2025", tier: "third" },
        { k: "供给（客房量）", v: "—",               yoy: "+3.2%",  src: "str2025", tier: "third" },
        { k: "需求（间夜量）", v: "—",               yoy: "+0.4%",  src: "str2025", tier: "third" },
        { k: "客房收入",       v: "—",               yoy: "-0.1%",  src: "str2025", tier: "third" }
      ]
    },
    structure: {
      period: "2025 全年",
      caliber: "STR 结构性观察（同比变化，非绝对值）",
      items: [
        { k: "商务需求（周日–周四）", v: "全面负增长",   yoy: "",   src: "str2025", tier: "third",
          note: "企业差旅预算趋保守，工作日需求集体走弱" },
        { k: "休闲需求（周五–周六）", v: "温和修复",     yoy: "",   src: "str2025", tier: "third",
          note: "散客同比仅 -1%，休闲韧性仍强于商务" },
        { k: "奢华档 RevPAR",         v: "与上年持平",   yoy: "",   src: "str2025", tier: "third" },
        { k: "中端/中高端 RevPAR",    v: "下滑明显",     yoy: "",   src: "str2025", tier: "third",
          note: "供给快速增加 + 溢价能力走弱" },
        { k: "节假日",                 v: "RevPAR 峰值",  yoy: "",   src: "str2025", tier: "third",
          note: "五一、十一峰值均超去年同期" }
      ]
    },
    submarket: {
      period: "2025 全年（同比 2024）",
      caliber: "STR 区域/次级市场（相对变化）",
      items: [
        { k: "成都",     v: "Occ / ADR 均 -5%", yoy: "RevPAR -10%", src: "str2025", tier: "third" },
        { k: "重庆",     v: "Occ -4% / ADR -3%", yoy: "RevPAR -7%", src: "str2025", tier: "third" },
        { k: "九寨沟",   v: "量价双优",          yoy: "业绩 +8%",    src: "str2025", tier: "third" },
        { k: "绵阳",     v: "量价双优",          yoy: "业绩 +6%",    src: "str2025", tier: "third" },
        { k: "三亚湾",   v: "次级市场领跑",      yoy: "RevPAR +15%", src: "str2025", tier: "third" },
        { k: "香港",     v: "6 月后加速",        yoy: "ADR +5%",     src: "str2025", tier: "third" }
      ]
    },
    gap: {
      title: "城市级绝对值为何暂不公开",
      body: "公开渠道对同一城市存在口径冲突（如成都 ADR 一个来源为 +3.1%、另一个为 -5%），" +
            "在核实清楚之前我们不发布城市级 ADR/RevPAR 绝对值。城市级基准需通过订阅或自建样本池获得。"
    }
  },

  /* ---------------- 航空业 ---------------- */
  airline: {
    official: {
      period: "2025 全年",
      caliber: "全行业（中国民用航空局）",
      items: [
        { k: "旅客运输量",     v: "7.7 亿人次",        yoy: "+5.5%",  src: "caacConf2026", tier: "official" },
        { k: "运输总周转量",   v: "1,640.8 亿吨公里",  yoy: "+10.5%", src: "caacConf2026", tier: "official" },
        { k: "正班客座率",     v: "85.1%",             yoy: "+1.8pp", src: "caacConf2026", tier: "official" },
        { k: "国际航班恢复",   v: "2019 年的 90% 以上", yoy: "—",      src: "caacConf2026", tier: "official" },
        { k: "国际旅客运输量", v: "—",                 yoy: "+21.6%", src: "caacConf2026", tier: "official" },
        { k: "2026 目标：旅客运输量", v: "8.1 亿人次", yoy: "—",      src: "caacConf2026", tier: "official" }
      ]
    },
    half: {
      period: "2025 上半年",
      caliber: "全行业（中国民用航空局）",
      items: [
        { k: "旅客运输量",   v: "3.7 亿人次",       yoy: "+6.0%",  src: "caacH1", tier: "official" },
        { k: "运输总周转量", v: "783.5 亿吨公里",   yoy: "+11.4%", src: "caacH1", tier: "official" },
        { k: "正班客座率",   v: "84.2%",            yoy: "+1.9pp", src: "caacH1", tier: "official" },
        { k: "载运率",       v: "72.6%",            yoy: "+1.6pp", src: "caacH1", tier: "official" },
        { k: "飞机日利用率", v: "9.0 小时",         yoy: "+0.2 小时", src: "caacH1", tier: "official" }
      ]
    },
    summer: {
      period: "2025 暑运（7/1–8/31）",
      caliber: "全行业（中国民用航空局）",
      items: [
        { k: "旅客运输量", v: "1.47 亿人次", yoy: "+3.6%",  src: "caacSummer", tier: "official" },
        { k: "日均旅客",   v: "237 万人次",  yoy: "+3.6%",  src: "caacSummer", tier: "official" },
        { k: "平均客座率", v: "84.8%",       yoy: "+2.2pp", src: "caacSummer", tier: "official" }
      ]
    },
    big3: {
      period: "2025 全年",
      caliber: "上市公司年报",
      items: [
        { k: "中国国航 客座率", v: "81.88%", yoy: "较上年 +2~3pp", src: "big3", tier: "official" },
        { k: "东方航空 客座率", v: "85.86%", yoy: "较上年 +2~3pp", src: "big3", tier: "official" },
        { k: "南方航空 客座率", v: "85.74%", yoy: "较上年 +2~3pp", src: "big3", tier: "official" }
      ]
    },
    /* 与收益管理教学的接口 */
    teaching: {
      title: "客座率 ≈ 出租率，但两者的杠杆不同",
      body: "航空 2025 年客座率已达 85.1%（历史高位），继续提升空间有限，" +
            "因此行业重心从「提量」转向「提价」——这与住宿业当前「供给 +3.2%、需求 +0.4%、价格承压」" +
            "所处的阶段正好相反，是跨行业收益管理最好的对照案例。"
    }
  },

  /* ---------------- 城市级月度基准 ---------------- */
  city: {
    shanghai: {
      name: "上海",
      period: "2025 年",
      caliber: "上海市星级饭店（全量 · 上海市文化和旅游局口径）",
      note: "上海是全国少数公开「城市级月度」饭店 ADR 与出租率的城市。空缺月份为未核实，不填推测值。"
        + "已交叉校验：月度序列算术均值 742.2 与官方 1–9 月累计 741 吻合；五星级全年累计 979 与媒体披露 978.80 一致。",
      monthly: {
        caliber: "月度平均房价（元/间天）与同比；出租率仅列已核实月份",
        rows: [
          { m: "1 月",  adr: 713, adrYoy: "-0.1%", occ: null, occYoy: null,     src: "shMonthly" },
          { m: "2 月",  adr: 701, adrYoy: "-6.7%", occ: null, occYoy: null,     src: "shMonthly" },
          { m: "3 月",  adr: 748, adrYoy: "-1.4%", occ: null, occYoy: null,     src: "shMonthly" },
          { m: "4 月",  adr: 805, adrYoy: "+0.9%", occ: null, occYoy: null,     src: "shMonthly" },
          { m: "5 月",  adr: 756, adrYoy: "-1.0%", occ: null, occYoy: null,     src: "shMonthly" },
          { m: "6 月",  adr: 749, adrYoy: "-1.0%", occ: null, occYoy: null,     src: "shMonthly" },
          { m: "7 月",  adr: 711, adrYoy: "-1.9%", occ: null, occYoy: null,     src: "shMonthly" },
          { m: "8 月",  adr: 726, adrYoy: "+0.2%", occ: null, occYoy: null,     src: "shMonthly" },
          { m: "9 月",  adr: 771, adrYoy: "+3.8%", occ: 67.6, occYoy: "+6.0pp", src: "shStats9" },
          { m: "10 月", adr: null, adrYoy: null,   occ: null, occYoy: null,     src: null, gap: true },
          { m: "11 月", adr: null, adrYoy: null,   occ: null, occYoy: null,     src: null, gap: true },
          { m: "12 月", adr: 824, adrYoy: "+8.8%", occ: 63.3, occYoy: null,     src: "shStats12" }
        ]
      },
      fiveStar: {
        caliber: "五星级分项（仅已核实月份）",
        items: [
          { k: "9 月 平均房价",     v: "993 元/间天",   yoy: "+6.8%",   src: "shStats9",  tier: "official" },
          { k: "9 月 出租率",       v: "73.1%",        yoy: "—",       src: "shStats9",  tier: "official" },
          { k: "12 月 平均房价",    v: "1,045 元/间天", yoy: "+9.3%",   src: "shStats12", tier: "official" },
          { k: "12 月 出租率",      v: "70.7%",        yoy: "+4.45pp", src: "shStats12", tier: "official" },
          { k: "全年累计 平均房价", v: "979 元/间天",   yoy: "+1.9%",   src: "shStats12", tier: "official" },
          { k: "全年累计 出租率",   v: "71.3%",        yoy: "+2.81pp", src: "shStats12", tier: "official" }
        ]
      },
      cumulative: {
        caliber: "累计口径对照（用于校验月度序列）",
        items: [
          { k: "1–9 月 平均房价",  v: "741 元/间天",    yoy: "-1.0%",  src: "shStats9",  tier: "official" },
          { k: "1–9 月 出租率",    v: "64.8%",         yoy: "+2.1pp", src: "shStats9",  tier: "official" },
          { k: "1–11 月 平均房价", v: "756.54 元/间天", yoy: "—",      src: "sh11",      tier: "official" },
          { k: "1–11 月 出租率",   v: "66.08%",        yoy: "—",      src: "sh11",      tier: "official" },
          { k: "1–12 月 平均房价", v: "767 元/间天",    yoy: "+1.4%",  src: "shStats12", tier: "official" },
          { k: "1–12 月 出租率",   v: "65.9%",         yoy: "+2.0pp", src: "shStats12", tier: "official" }
        ]
      }
    },
    others: {
      title: "其它城市为什么是空的",
      body: "除上海外，多数城市不公开「月度 ADR / 出租率」：北京公开的是营收与利润口径（2025 年 1–9 月 1,623 家酒店"
        + "平均每家营收 2,003 万元、同比 -7.9%），不是房价与出租率；其它城市则基本没有公开月度口径。"
        + "我们不把第三方抽样或节假日均价充作城市级月度基准——那会让你对标错对象。"
        + "补齐方式只有两条：订阅商业数据库，或由社区会员共建样本池。"
    }
  },

  /* ---------------- 其余四个行业：待接入 ---------------- */
  pending: [
    { ind: "餐饮业",  metric: "RevPASH / 翻台率 / 客单价", status: "待接入",
      why: "公开渠道无权威全量口径，需自建样本池或与连锁品牌数据合作" },
    { ind: "景区文旅", metric: "分时承载率 / 客单价 / 二次消费占比", status: "待接入",
      why: "A 级景区仅公布人次与总收入，缺可比的单位产出指标" },
    { ind: "娱乐休闲", metric: "场次上座率 / 单座产出", status: "待接入",
      why: "缺乏统一统计口径，需自行定义并对齐" },
    { ind: "剧院",     metric: "上座率 / 单座收入", status: "待接入",
      why: "同上，需与演出行业协会或票务平台对接" }
  ]
};
