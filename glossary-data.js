/* ============================================================
   名词解释字典（全局）
   - a: 匹配词（中文子串 / 英文按词边界，大小写不敏感）
   - def: 浮窗里的解释（1–2 句）
   - video: 各个击破单集 id（有则显示“看 1 分钟解说”）
   - anchor: 站内角链（如法典判定表 #table-a）
   - more: 可选补充链接文案
   本文件由 gen_concepts.py 生成：每条术语均有专属解释 + 视频。
   ============================================================ */
window.GJP_GLOSSARY = [
  { k:"收益管理", a:["收益管理", "revenue management", "rm"], video:"c1", def:"在正确的时间、把正确的库存、以正确的价格、卖给正确的客户，追求整体收益最大化，而非单笔售价最高。" },
  { k:"易逝库存", a:["易逝库存", "perishable", "过期库存", "不可储存"], video:"c21", def:"房晚、舱位、号源、车位等，今天卖不掉明天价值归零——这是收益管理存在的根本原因，必须在有效期内卖出。" },
  { k:"固定产能", a:["固定产能", "产能固定", "不可扩张"], video:"c22", def:"酒店的房、邮轮的舱、医生的号，短期几乎无法增加。产能锁死，只能把现有产能卖给更值钱的人。" },
  { k:"入住率", a:["入住率", "出租率", "occupancy", "occ"], video:"c2", def:"已售房数 ÷ 可售房数。衡量“卖了多少”，是收益管理最基础的饱和指标。" },
  { k:"平均房价", a:["平均房价", "adr", "average daily rate"], video:"c3", def:"客房总收入 ÷ 已售房数。衡量“卖得贵不贵”，和入住率一起决定 RevPAR。" },
  { k:"RevPAR", a:["revpar"], video:"c4", def:"每可售房收入 = 客房总收入 ÷ 可售房数 = 入住率 × 平均房价。综合反映“量价”结果，是酒店最核心的收益指标。" },
  { k:"MPI", a:["mpi", "市场渗透指数"], video:"c10", def:"市场渗透指数 = 本店入住率 ÷ 竞组平均入住率。>100 表示抢到了比对手更多的份额。", anchor:"codex.html#table-d", more:"calc-templates.html#mpi" },
  { k:"ARI", a:["ari", "价格指数"], video:"c11", def:"价格指数 = 本店 ADR ÷ 竞组平均 ADR。>100 表示卖得比对手贵，要结合 MPI 一起看。", anchor:"codex.html#table-c", more:"calc-templates.html#ari" },
  { k:"RGI", a:["rgi", "综合收益指数", "revenue generation index"], video:"c12", def:"综合收益指数 = 本店 RevPAR ÷ 竞组平均 RevPAR，是量价合一的最终竞争力指标。", anchor:"codex.html#table-d" },
  { k:"TrevPAR", a:["trevpar", "每可售房总收入"], video:"c13", def:"每可售房总收入 =（房费+餐饮+会议+其他全部收入）÷ 可售房，衡量单间房的综合产出，比 RevPAR 更全面。", more:"calc-templates.html#trevpar" },
  { k:"GOPPAR", a:["goppar", "每可售房经营毛利"], video:"c14", def:"每可售房经营毛利 =（收入−运营成本）÷ 可售房，扣掉人工/能耗/物料后的真赚，反映经营效率。", more:"calc-templates.html#goppar" },
  { k:"NRevPAR", a:["nrevpar", "净可售房收入"], video:"c15", def:"净可售房收入 =（房收入−佣金/渠道费）÷ 可售房，揭示不同渠道的真实净贡献，直订高于 OTA。", more:"calc-templates.html#nrevpar" },
  { k:"需求预测", a:["需求预测", "demand forecasting"], video:"c5", def:"基于历史、在手预订、节假日与事件，判断未来各日期会有多少需求，是所有调价与房量动作的前提。" },
  { k:"市场细分", a:["市场细分", "market segmentation"], video:"c6", def:"把客户按渠道、价格敏感度、预订提前期等分成若干类，对不同细分定不同价、给不同库存。" },
  { k:"价格弹性", a:["价格弹性", "price elasticity"], video:"c7", def:"需求量随价格变动的敏感程度。弹性大的客群提价会跑光，弹性小的客群可以涨。" },
  { k:"提前期", a:["提前期", "lead time", "预订提前期", "booking window"], video:"c24", def:"从预订到实际使用（入住/起飞/出诊）的间隔。提前期越长计划性越强、价格越不敏感；越临近越急、越肯出价。" },
  { k:"需求曲线", a:["需求曲线", "demand curve"], video:"c25", def:"价格与需求的反向关系：价越高需求越少。收益管理的目标不是最高价，而是总收入最大的那个价。" },
  { k:"动态调价", a:["动态调价", "动态定价", "dynamic pricing"], video:"o4", def:"根据需求、库存与竞争，持续调整价格，而不是一年不变价。涨满房靠它，淡季保价也靠它。" },
  { k:"早鸟价", a:["早鸟价", "early bird", "提前预订优惠"], video:"c26", def:"用折扣换“提前锁定”：先把远期库存卖出去、回笼资金，把临近的高价库存留给临时客。" },
  { k:"尾单甩卖", a:["尾单甩卖", "last minute", "临期甩卖", "甩舱"], video:"c27", def:"临近使用还有空房，空着也是归零——尾单甩卖哪怕低价也要尽量收回变动成本，优先覆盖变动成本。" },
  { k:"差别定价", a:["差别定价", "price discrimination", "差异化定价"], video:"c28", def:"同一种库存，对不同细分（渠道/提前期/弹性）卖不同价，把每间房卖到它肯出的价；前提是不引起客诉与渠道冲突。" },
  { k:"价格体系 / BAR", a:["价格体系", "房型价差", "rate structure", "rate ladder", "bar", "最佳可用房价", "best available rate"], video:"o1", def:"以基准 BAR 为锚，按房型、渠道、提前期展开的完整价格阶梯，保证价差合理、不互相打架。BAR 是当日散客公开渠道可售的最高弹性房价。" },
  { k:"价格一致性", a:["价格一致性", "rate parity", "渠道同价"], video:"c19", def:"同一房型在各渠道挂牌价（含含税总价）必须一致，否则客人比价后流失、伤品牌，是渠道管理红线。", anchor:"codex.html#table-h" },
  { k:"调价台账", a:["调价台账", "定价台账", "价格日志"], video:"c40", def:"每次调价都要登记：依据哪张表、改了什么价、实际与预期差多少，用于事后复盘命中率、沉淀经验。", anchor:"codex.html#table-a" },
  { k:"超额预订", a:["超额预订", "超售", "overbooking", "超订"], video:"o3", def:"预计会有“订了不来/提前退房”的空房，故意多卖几间，把空置损失降到最低；但要控 walk-in 风险。" },
  { k:"No-show / 取消", a:["no-show", "noshow", "未到店", "订了不来", "取消率", "cancellation"], video:"c18", def:"No-show 率＝预订了却未到店的比例；取消率＝预订后又取消的比例。两者是超额预订与房量决策的地基。" },
  { k:"置换分析", a:["置换分析", "displacement", "displacement analysis"], video:"c17", def:"比较同一房量给不同客源的净收益，把房留给净收益最高的客源；是超额预订与关低价决策的依据。", more:"calc-templates.html#displacement" },
  { k:"嵌套式库存控制", a:["嵌套库存", "nested", "库存嵌套", "nesting"], video:"c30", def:"库存按价格从高到低嵌套开放：先卖高价房类，卖不动再放低一档，确保不把高价房低价卖掉。" },
  { k:"Walk 拒载", a:["walk", "拒载", "denied boarding", "翻房", "超售翻房"], video:"c29", def:"超售过头或 No-show 没发生，到店无房即为 Walk。要升级/赔礼/安置周边，是超售失控的最高成本。" },
  { k:"竞品对标组", a:["竞品对标组", "竞争组合", "competitive set", "compset", "对标组"], video:"c8", def:"选 3–5 家最可比的竞争对手组成一个组，用来算 ARI、MPI、RGI，判断自己相对市场的位置。" },
  { k:"渠道管理", a:["渠道管理", "channel management", "渠道分配"], video:"c31", def:"不同渠道成本不同（直订最便宜、OTA 有佣金）。渠道管理就是分配各渠道房量与价，让净收益最大。" },
  { k:"OTA 与直订", a:["ota", "直订", "direct", "在线旅行平台", "渠道占比"], video:"c32", def:"OTA 带来客源但有佣金，直订零佣金却要自己引流。两端搭配：用直订提净收益、用 OTA 补量，价格一致性是底线。" },
  { k:"竞争响应", a:["竞争响应", "竞品降价", "competitive response"], video:"c33", def:"对手降价别慌：先看自己定位与客群敏感度，差异化守住，只对有价格敏感的部分局部跟，不盲跟。" },
  { k:"RevPAC（邮轮）", a:["revpac", "邮轮收益", "单舱产出"], video:"c34", def:"单舱产出 =（船票+岸上餐饮）×已售 ÷ 可用舱位夜。舱位=房、航次=连住、套舱=房型，邮轮版 RevPAR。", more:"tools.html#cruise" },
  { k:"RevPASH（餐饮）", a:["revpash", "餐饮收益", "每餐位每小时"], video:"c35", def:"每餐位每小时收入 = 营收 ÷ 餐位 ÷ 营业小时。翻台率×客单价，是餐饮收益管理的核心指标。" },
  { k:"RASK（航空）", a:["rask", "航空收益", "每座位公里"], video:"c36", def:"每座位公里收入 = 总收入 ÷ 可用座位公里（ASK）。座公里=座位×飞行公里，衡量单位运力产出。" },
  { k:"RevPAS（研学营地）", a:["revpas", "研学收益", "单营位产出"], video:"c37", def:"单营位产出 =（营费+餐饮）×已售 ÷ 可用营位夜。营位=房、营期=连住、批次=档期，营地版 RevPAR。", more:"tools.html#research-camp" },
  { k:"RevPAT（租车）", a:["revpat", "租车收益", "单车产出"], video:"c38", def:"单车产出 = 总营收 ÷ 可用车辆·天。车=房、租期=连住、车型=房型，租车版 RevPAR。", more:"tools.html#car-rental" },
  { k:"RevPAA（医疗号源）", a:["revpaa", "号源收益", "单号产出"], video:"c39", def:"单号产出 = 总营收 ÷ 可用号源。号源=库存、医生时段=房、号别=房型、No-show=爽约，医疗版 RevPAR。", more:"tools.html#medical-appointment" },
  { k:"表A 每日调价判定", a:["表a", "表 a"], video:"ca", def:"《法典》表 A：每日价格调整判定表——看当天需求与库存，读出该涨价、降价还是持平。", anchor:"codex.html#table-a" },
  { k:"表B 库存与限制", a:["表b", "表 b"], video:"cb", def:"《法典》表 B：库存与限制条件配置表——价格定完后配库存动作（关房/连住/超售）。", anchor:"codex.html#table-b" },
  { k:"表C 价格指数 ARI", a:["表c", "表 c"], video:"cc", def:"《法典》表 C：价格指数（ARI）判定表——按相对竞对贵贱决定提价或降价。", anchor:"codex.html#table-c" },
  { k:"表D 渗透指数 MPI", a:["表d", "表 d"], video:"cd", def:"《法典》表 D：市场渗透指数（MPI）判定表——按份额领先/落后决定抢量还是提价。", anchor:"codex.html#table-d" },
  { k:"表E 超售标准", a:["表e", "表 e"], video:"ce", def:"《法典》表 E：超额预订标准表——按历史 no-show/取消率算出可超售几间及安全上限。", anchor:"codex.html#table-e" },
  { k:"表F 房型价差", a:["表f", "表 f"], video:"cf", def:"《法典》表 F：房型价差与价格体系展开规则——基准 BAR 如何展开全房型价格。", anchor:"codex.html#table-f" },
  { k:"表G 团队询价", a:["表g", "表 g"], video:"cg", def:"《法典》表 G：客户/团队询价决策表——大客户或团队打折是否划算的判定逻辑（看置换分析）。", anchor:"codex.html#table-g" },
  { k:"表H 渠道与一致性", a:["表h", "表 h"], video:"ch", def:"《法典》表 H：渠道与价格一致性表——各渠道该不该卖、挂牌价（含含税总价）怎么对齐。", anchor:"codex.html#table-h" },
  { k:"表O 冲突仲裁", a:["表o", "表 o"], video:"co", def:"《法典》表 O：多表冲突仲裁表——几张表结论打架时，只执行最高优先级那一条。", anchor:"codex.html#table-o" },
];
