/* ============================================
   游戏数据 — 场景、客户、费率配置
   ============================================ */

// ===== 定价大师：10轮场景 =====
const PRICING_SCENARIOS = [
  {
    icon: '🎊',
    title: '十一黄金周第3天',
    desc: '国庆假期正处高峰，全市酒店接近满房，你酒店位置优越。',
    tags: ['旺季', '长假', '高需求'],
    demand: '极高',
    demandLevel: 0.95,
    compPrice: 1280,
    basePrice: 900,
    elasticity: 0.6,
  },
  {
    icon: '📋',
    title: '周一工作日 · 无特殊活动',
    desc: '普通的周一，商务客陆续入住，但整体需求平稳。',
    tags: ['平季', '工作日', '中需求'],
    demand: '中',
    demandLevel: 0.55,
    compPrice: 680,
    basePrice: 500,
    elasticity: 1.2,
  },
  {
    icon: '🎤',
    title: '大型展会开幕前夜',
    desc: '国际消费电子展明天开幕，参展商今晚集中到店，周边酒店已满。',
    tags: ['展会', '旺季', '高需求'],
    demand: '高',
    demandLevel: 0.85,
    compPrice: 1100,
    basePrice: 800,
    elasticity: 0.7,
  },
  {
    icon: '🌧️',
    title: '梅雨季 · 周二',
    desc: '连日阴雨，非旅游旺季的普通工作日，休闲客几乎为零。',
    tags: ['淡季', '工作日', '低需求'],
    demand: '低',
    demandLevel: 0.35,
    compPrice: 420,
    basePrice: 380,
    elasticity: 1.8,
  },
  {
    icon: '🎆',
    title: '跨年夜',
    desc: '今晚是跨年夜，城市有大型烟花活动，一房难求。',
    tags: ['旺季', '节日', '极高需求'],
    demand: '极高',
    demandLevel: 0.98,
    compPrice: 1580,
    basePrice: 1100,
    elasticity: 0.5,
  },
  {
    icon: '🏖️',
    title: '暑期 · 周六',
    desc: '暑假家庭出游高峰，周末休闲客为主，竞品已调价应对。',
    tags: ['旺季', '周末', '高需求'],
    demand: '高',
    demandLevel: 0.78,
    compPrice: 920,
    basePrice: 700,
    elasticity: 0.9,
  },
  {
    icon: '✈️',
    title: '航司罢工第2天',
    desc: '主要航司罢工导致大量航班取消，外地客取消预订，需求骤降。',
    tags: ['突发事件', '低需求'],
    demand: '低',
    demandLevel: 0.30,
    compPrice: 380,
    basePrice: 350,
    elasticity: 2.0,
  },
  {
    icon: '🏥',
    title: '国际医学大会',
    desc: '三千名医生参会，会议酒店已满，溢出客源寻找周边酒店。',
    tags: ['会议', '旺季', '高需求'],
    demand: '高',
    demandLevel: 0.82,
    compPrice: 1050,
    basePrice: 750,
    elasticity: 0.75,
  },
  {
    icon: '❄️',
    title: '春节后 · 正月十五前',
    desc: '春节假期刚结束，商务出行尚未恢复，市场冷清。',
    tags: ['淡季', '节后', '低需求'],
    demand: '低',
    demandLevel: 0.32,
    compPrice: 400,
    basePrice: 360,
    elasticity: 1.9,
  },
  {
    icon: '🎓',
    title: '毕业季 · 周五',
    desc: '各大高校毕业典礼周末，家长集中到访，需求偏高。',
    tags: ['平季', '周末', '中高需求'],
    demand: '中高',
    demandLevel: 0.68,
    compPrice: 780,
    basePrice: 600,
    elasticity: 1.0,
  },
];

// ===== 超售博弈：5晚场景 =====
const OVERBOOKING_SCENARIOS = [
  {
    icon: '🌙',
    title: '普通工作日',
    desc: '周三晚上，商务客为主，No-show 率历史均值约 8%。',
    noshowRate: 0.08,
  },
  {
    icon: '🎊',
    title: '节前最后一晚',
    desc: '明天是国庆长假，不少人可能改变行程计划提前出发或取消。',
    noshowRate: 0.15,
  },
  {
    icon: '📅',
    title: '团队预订日',
    desc: '有一个 30 人的团队入住，团队通常 No-show 率较低。',
    noshowRate: 0.05,
  },
  {
    icon: '🌧️',
    title: '暴风雨天气',
    desc: '天气预报有大暴风雨，航班大面积取消，No-show 可能飙升。',
    noshowRate: 0.22,
  },
  {
    icon: '🎆',
    title: '跨年夜',
    desc: '跨年夜需求极高，但临时改变计划的人也不少。',
    noshowRate: 0.12,
  },
];

// ===== 客户匹配：客人题库 =====
const SEGMENTATION_CUSTOMERS = [
  { icon: '💼', name: '李总', desc: '某500强企业VP，周四入住1晚，公司协议客户', channel: 'corporate' },
  { icon: '🏖️', name: '王女士', desc: '提前30天预订，周末入住3晚，家庭度假', channel: 'advance' },
  { icon: '👥', name: '张导游', desc: '带20人旅行团，协议价入住2晚', channel: 'group' },
  { icon: '🚶', name: '赵先生', desc: '今晚临时到店，未预订，出差路过', channel: 'bar' },
  { icon: '💼', name: '陈经理', desc: '某科技公司，周二入住2晚，年度协议价', channel: 'corporate' },
  { icon: '🏖️', name: '刘一家', desc: '提前45天预订，暑假入住5晚', channel: 'advance' },
  { icon: '👥', name: '孙领队', desc: '35人老年团，提前2个月预订', channel: 'group' },
  { icon: '🚶', name: '周先生', desc: '航班延误，临时需要一间房', channel: 'bar' },
  { icon: '💼', name: '吴总监', desc: '某投行高管，工作日入住1晚，价格不敏感', channel: 'bar' },
  { icon: '🏖️', name: '郑情侣', desc: '纪念日出行，提前20天预订周末2晚', channel: 'advance' },
  { icon: '👥', name: '马老师', desc: '学校组织50学生来参赛，住3晚', channel: 'group' },
  { icon: '💼', name: '钱律师', desc: '某律所合伙人，协议客户，周三入住1晚', channel: 'corporate' },
  { icon: '🚶', name: '冯先生', desc: '开车自驾游，路过入住1晚，无预订', channel: 'bar' },
  { icon: '🏖️', name: '褚女士', desc: '提前60天预订，国庆入住4晚', channel: 'advance' },
  { icon: '👥', name: '卫会长', desc: '行业协会80人年会，提前3个月预订', channel: 'group' },
  { icon: '💼', name: '蒋CFO', desc: '某上市公司CFO，临时决定出差1晚', channel: 'bar' },
];

const CHANNEL_INFO = {
  bar: { name: 'BAR 公开价', price: 880 },
  corporate: { name: '商务协议价', price: 760 },
  advance: { name: '提前预订价', price: 620 },
  group: { name: '团队价', price: 520 },
};

// ===== 动态定价场景 =====
const DYNAMIC_SCENARIOS = {
  peak: {
    name: '旺季高峰',
    baseDemand: 0.95,
    slope: -0.0006,
    color: '#e85d5d',
  },
  normal: {
    name: '平季工作日',
    baseDemand: 0.60,
    slope: -0.0012,
    color: '#4a90d9',
  },
  low: {
    name: '淡季周末',
    baseDemand: 0.35,
    slope: -0.0018,
    color: '#8b95a8',
  },
};

// ===== 定价评论话术 =====
const PRICING_COMMENTS = {
  excellent: '出色！你的 RevPAR 显著超越竞品，精准捕捉了市场需求。',
  good_won: '不错！你的 RevPAR 略超竞品，定价策略基本合理。',
  close_lost: '你的 RevPAR 略低于竞品，差距不大但仍有改进空间。',
  poor: '你的 RevPAR 明显落后于竞品——注意需求弹性和最优定价点。',
};

// ===== 超售结果评语 =====
const OVERBOOKING_COMMENTS = {
  perfect: '完美！恰好满房，没有浪费也没有 Walking。',
  good: '不错！超售策略有效，收入接近最优。',
  noshow_loss: '有房间空了——超售不足，No-show 造成了收入损失。',
  walked: '出现了 Walking！超售过多，赔偿费用侵蚀了利润。',
  balanced: '有少量空房也有少量 Walking，整体基本平衡。',
};

// ===== 收益经理的一天：完整 SOP 步骤 =====
const DIL_STEPS = [
  {
    icon: '🌅', time: '07:00',
    title: '晨会准备：审阅昨日经营数据',
    desc: '你打开 PMS 系统，查看昨晚的最终经营报表。这是每一天的起点——昨天的数据告诉你今天的决策基础。',
    contextHTML: `
      <div class="dil-data">
        <div class="dil-data-row"><span>昨日可售房数</span><strong>200 间</strong></div>
        <div class="dil-data-row"><span>昨日售出</span><strong>142 间（入住率 71%）</strong></div>
        <div class="dil-data-row"><span>昨日平均房价 ADR</span><strong>¥620</strong></div>
        <div class="dil-data-row"><span>昨日 RevPAR</span><strong>¥440</strong></div>
        <div class="dil-data-row" style="color:var(--red)"><span>⚠ 与预测的偏差</span><strong>RevPAR 低于预测 8%</strong></div>
      </div>`,
    choices: [
      { label: 'A. 查看细分市场报表，找出偏差根源 ✓', points: 15,
        explanation: '✅ 正确！收益经理的第一步是找偏差原因。可能是商务客临时取消、竞品突然降价、或者天气因素。细分报表能帮你定位是哪个渠道/客群出了问题。' },
      { label: 'B. 直接降价 10% 来刺激入住', points: -5,
        explanation: '❌ 在没弄清楚原因之前就降价是不负责任的。如果偏差是由于一次性的团队取消（明天就恢复了），你降价只会白白损失收入。' },
      { label: 'C. 忽略偏差，按原计划执行', points: -10,
        explanation: '❌ 忽略 8% 的偏差就是放弃优化机会。收益管理的核心就是持续追踪和调整。' },
    ],
    correctIdx: 0,
    extraNote: '收益经理的工作循环：追踪数据 → 分析偏差 → 调整策略 → 再次追踪。这是一个持续的优化过程。',
  },
  {
    icon: '📊', time: '08:00',
    title: '预测审核：未来 7 天预订节奏',
    desc: '你拿到未来 7 天的 on-the-books 数据。今天的预订量直接决定了你要不要调价、要不要开放/关闭低价渠道。',
    contextHTML: `
      <div class="dil-data">
        <div class="dil-data-row"><span>今天是</span><strong>周一</strong></div>
        <div class="dil-data-row"><span>本周六（毕业典礼）</span><strong>已预订 165/200 间（82%）</strong></div>
        <div class="dil-data-row"><span>去年同期周六</span><strong>此时 140/200 间（70%）</strong></div>
        <div class="dil-data-row"><span>本周三-周五</span><strong>均仅 45~55%</strong></div>
        <div class="dil-data-row" style="color:var(--green)"><span>📈 周六预订节奏</span><strong>大幅领先去年同期</strong></div>
      </div>`,
    choices: [
      { label: 'A. 周六需求很强，立即上调周六 BAR 价 15% ✓', points: 15,
        explanation: '✅ 正确！预订节奏大幅领先去年同期（82% vs 70%），且毕业典礼是强需求事件。此时涨价不仅能提升 RevPAR，也符合动态定价原则。' },
      { label: 'B. 周六保持原价，周三-周五降价促销', points: 5,
        explanation: '⚠️ 部分正确——周三到周五确实需要促销。但周六很强时不涨价等于拱手让出额外收益。应该两端同时调整。' },
      { label: 'C. 所有日期保持原价，避免风险', points: -5,
        explanation: '❌ "保持原价"是收益经理最不应该说的话。市场在变，价格必须跟着变。' },
    ],
    correctIdx: 0,
    extraNote: '预订节奏（booking pace）是预测需求最直接的指标。当 on-the-books 大幅领先去年同期时，需求很可能超预期——此时涨价是最合理的选择。',
  },
  {
    icon: '💰', time: '09:00',
    title: '房价策略：设置未来 3 天的 BAR 和价格围栏',
    desc: '你需要在 PMS 中设定未来 3 天的公开价（BAR）并配置价格围栏。一个好消息：附近最大的竞品酒店刚刚宣布本周四开始停业装修 3 天。',
    contextHTML: `
      <div class="dil-data">
        <div class="dil-data-row"><span>竞品酒店</span><strong>周四~周六停业</strong></div>
        <div class="dil-data-row"><span>预计溢出需求</span><strong>约 60~80 间/天</strong></div>
        <div class="dil-data-row"><span>你今天在售</span><strong>周四 80间 / 周五 70间 / 周六 35间</strong></div>
      </div>`,
    choices: [
      { label: 'A. 三天都大幅提价 25%+，关闭所有折扣渠道 ✓', points: 18,
        explanation: '✅ 正确！竞品停业意味着周边供给骤减，溢出需求会涌向你的酒店。此时应该大幅提价并关闭低价渠道（提前预订、团队价），确保稀缺库存卖到最高价。' },
      { label: 'B. 小幅提价 5-10%，保持折扣渠道开放', points: 5,
        explanation: '⚠️ 保守了。竞品停业 3 天是难得的机会，溢出需求 60~80 间远超你的剩余库存（当前仅 80/70/35），定价权完全在你手里。大幅提价才是正确的。' },
      { label: 'C. 不调价，用低价格吸引更多客户', points: -8,
        explanation: '❌ 供给大幅减少时降价毫无意义——你已经不愁客源了。降低价格只会减少收入，不会带来更多客人（因为本来就没那么多竞争房源）。' },
    ],
    correctIdx: 0,
    extraNote: '竞品停业 = 供给冲击。当供给骤减而需求不变时，价格上涨是经济规律。收益经理要敏锐捕捉这种事件窗口。',
  },
  {
    icon: '👥', time: '10:00',
    title: '团队询价评估：接受还是拒绝？',
    desc: '销售部转发来一个团队询价：某科技公司想在两周后的周二~周四入住，需要 40 间房/晚，报价 ¥420/间。你需要做置换分析。',
    contextHTML: `
      <div class="dil-data">
        <div class="dil-data-row"><span>团队报价</span><strong>¥420/间 × 40间 × 3晚</strong></div>
        <div class="dil-data-row"><span>你的 BAR 价</span><strong>¥680</strong></div>
        <div class="dil-data-row"><span>历史同期散客</span><strong>售出约 55~65 间/晚 @ ¥620</strong></div>
        <div class="dil-data-row"><span>总可售房数</span><strong>200 间</strong></div>
      </div>`,
    choices: [
      { label: 'A. 提出反报价 ¥580/间，接受则签约 ✓', points: 15,
        explanation: '✅ 正确！¥420 太低（仅 BAR 的 62%），会严重拉低 ADR。但团队客户有谈判空间。¥580 是双方可能接受的价格，且散客历史仅售 55~65 间（共 200 间），有足够库存容纳团队。置换分析：就算少了 40 间给散客，剩下的 160 间足够覆盖散客需求。' },
      { label: 'B. 直接接受 ¥420，团队是稳定收入', points: -8,
        explanation: '❌ ¥420 远低于 BAR ¥680。如果全部卖给散客，收入 = 60 × ¥620 × 3 = ¥111,600；卖给团队 = 40 × ¥420 × 3 = ¥50,400。损失超过 ¥60,000！除非散客需求极低，否则这是在亏钱。' },
      { label: 'C. 直接拒绝，等待更高价的散客', points: 3,
        explanation: '⚠️ 可以有更好的处理方式。直接拒绝放弃了谈判机会。提出反报价是最优解——既不贱卖库存，又保留了成交可能。' },
    ],
    correctIdx: 0,
    extraNote: '团队置换分析公式：团队收入 vs 散客期望收入。如果团队占用大量库存且价格过低，会导致无法接纳更高价的散客——这就是"置换成本"。',
  },
  {
    icon: '🏨', time: '11:00',
    title: '竞品分析：响应对手的价格变动',
    desc: '你的 comp set 监控显示：排名第二的竞品酒店刚刚把本周四的 OTA 价格从 ¥680 降到了 ¥520。你的周四已预订 85 间（200 间总量）。',
    contextHTML: `
      <div class="dil-data">
        <div class="dil-data-row"><span>竞品降价</span><strong>¥680 → ¥520（-24%）</strong></div>
        <div class="dil-data-row"><span>你周四已售</span><strong>85/200 间（42.5%）</strong></div>
        <div class="dil-data-row"><span>你周四价格</span><strong>¥650</strong></div>
        <div class="dil-data-row"><span>周四距离今天</span><strong>仅剩 3 天</strong></div>
      </div>`,
    choices: [
      { label: 'A. 小幅降价至 ¥590，通过服务差异化保持溢价 ✓', points: 12,
        explanation: '✅ 最优策略。竞品降 24% 是激进行为，但你的酒店有更好的位置和早餐口碑。降到 ¥590（比竞品贵 ¥70 但比你的原价低 ¥60）是一个合理的竞争响应，既不完全跟风也不坐视客户流失。同时加推会员专享升级券来差异化竞争。' },
      { label: 'B. 跟进降到 ¥520，打价格战', points: -5,
        explanation: '❌ 你还有 115 间没卖出去，但只剩 3 天。如果两败俱伤打价格战，谁也赚不到钱。你的酒店定位和口碑优于对手，不应该在价格上跟风到底。' },
      { label: 'C. 保持 ¥650，不理会竞品', points: 3,
        explanation: '⚠️ 有些冒险。如果竞品的低价吸走了潜在客户，你可能在最后关头出现大量空房。小幅调整更为稳妥。' },
    ],
    correctIdx: 0,
    extraNote: '竞争响应策略：不跟到底（避免价格战），不完全无视（避免客户流失）。保有一定溢价来体现品牌和服务优势。',
  },
  {
    icon: '🎲', time: '13:00',
    title: '超售决策：今晚的 No-show 缓冲',
    desc: '午饭后，你需要在系统中设定今晚的超售水平。今晚是周二，商务客为主。历史上周二 No-show 率约 6%，但今天天气预报说傍晚有大暴雨。',
    contextHTML: `
      <div class="dil-data">
        <div class="dil-data-row"><span>当前预订数</span><strong>168 间 / 200 间</strong></div>
        <div class="dil-data-row"><span>历史周二 No-show</span><strong>约 6%（约 10 人）</strong></div>
        <div class="dil-data-row"><span>暴风雨预警</span><strong>可能导致航班取消，No-show 增加</strong></div>
      </div>`,
    choices: [
      { label: 'A. 继续接受预订，超售到 210 间（超 5%）✓', points: 15,
        explanation: '✅ 正确！暴风雨天气虽然增加不确定性，但目前已被订 168 间（预订率 84%），仍有 32 间可售。保守考虑下仍应继续接单——即使有 10~15 个 No-show（暴风雨增加了 No-show），预计仍有 195~200 人到店，超售 10 间是合理缓冲。Walk 风险很低。' },
      { label: 'B. 关闭预订通道，避免 Walking 风险', points: -5,
        explanation: '❌ 过于保守。168/200 还有 32 间没卖出去，加上可能的 No-show，你可能会空 20~30 间房。这相当于今晚损失 ¥10,000+。' },
      { label: 'C. 超售到 230 间（超 15%）', points: -8,
        explanation: '❌ 暴风雨确实可能增加 No-show，但 230 间预订如果碰巧只有 5% 的 No-show（约 12 人），到店 218 人——你得 Walk 18 位客人，赔偿 ¥14,400！这个风险太大了。' },
    ],
    correctIdx: 0,
    extraNote: '超售的黄金法则：最优超售数 = 平均 No-show 数。但天气等外部因素会增加不确定性——需要在"多赚"和"不 Walk"之间找平衡。',
  },
  {
    icon: '📡', time: '14:00',
    title: '渠道管理：优化 OTA vs 直销 vs 协议客',
    desc: '你打开渠道管理面板，发现携程的佣金率从 15% 涨到了 18%，而你的微信直销渠道转化率在上升。你需要重新分配渠道权重。',
    contextHTML: `
      <div class="dil-data">
        <div class="dil-data-row"><span>OTAs 携程/美团</span><strong>佣金 18%，贡献 55% 预订量</strong></div>
        <div class="dil-data-row"><span>官网直销</span><strong>佣金 0%，仅贡献 20% 预订量</strong></div>
        <div class="dil-data-row"><span>微信小程序</span><strong>佣金 ~2%，贡献 15% 预订量，增速快</strong></div>
        <div class="dil-data-row"><span>协议客户（商务）</span><strong>贡献 10%，ADR最高 ¥720</strong></div>
      </div>`,
    choices: [
      { label: 'A. 加强微信小程序推广，对 OTA 客户引导关注公众号（发放专属优惠券）✓', points: 15,
        explanation: '✅ 最优方案。OTA 佣金 18% 意味着每通过 OTA 卖 ¥500 就要支付 ¥90 佣金。而微信小程序仅 2%。你不需要完全抛弃 OTA（它们仍是最大渠道），但应该主动将 OTA 来的客户转化为你的直销客户（通过入住时引导关注、发放复购券）。这是收益管理中渠道成本优化的重要一环。' },
      { label: 'B. 立即关闭所有 OTA 渠道，只做直销', points: -10,
        explanation: '❌ OTA 贡献了 55% 的预订量，立刻关闭会让入住率暴跌。渠道转型需要时间，不是一刀切。' },
      { label: 'C. 保持现状，渠道配比不变', points: 0,
        explanation: '⚠️ 可以接受但不是最优。OTA 佣金上涨 3% 对你的净利润有实质影响。一个收益经理应该主动优化渠道组合，而不是被动接受。' },
    ],
    correctIdx: 0,
    extraNote: '渠道成本是 RevPAR 的隐形杀手。RevPAR ¥500 减去 18% 佣金实际只收到 ¥410。计算"净 RevPAR"时，渠道成本必须纳入考量。',
  },
  {
    icon: '📅', time: '15:00',
    title: 'LOS 管控：设置连住限制',
    desc: '毕业典礼周末（本周六）需求激增。你预计周六会满房。目前周五已预订 120 间，周日仅 40 间。你需要设置入住限制来优化入住结构。',
    contextHTML: `
      <div class="dil-data">
        <div class="dil-data-row"><span>周六（高峰）</span><strong>已售 185/200 间（93%）</strong></div>
        <div class="dil-data-row"><span>周五（前一天）</span><strong>已售 120/200 间（60%）</strong></div>
        <div class="dil-data-row"><span>周日（后一天）</span><strong>已售 40/200 间（20%，非常空）</strong></div>
      </div>`,
    choices: [
      { label: 'A. 对周六设置"须连住 2 晚（周五+周六或周六+周日）"的限制 ✓', points: 18,
        explanation: '✅ 这才是收益经理的操作！周六几乎满房（93%），剩余的 15 间不愁卖。但周五和周日还有大量空房。通过设置"CtA（Close to Arrival）+ MinLOS 2"限制，要求预订周六的客人必须同时预订周五或周日——用周六的强需带动周五和周日的弱需。这直接提升总体 RevPAR。' },
      { label: 'B. 周六涨价 30%，其他日不变', points: 5,
        explanation: '⚠️ 周六只差 15 间就满了，涨价是对的。但你没有解决周五和周日的空房问题。单独涨价的效果不如"连住限制 + 涨价"的组合拳。' },
      { label: 'C. 什么都不做，让自然预订填满', points: -3,
        explanation: '❌ 周六自然会满没错，但你的责任是优化全局 RevPAR。如果周五周日多卖出 60 间，额外收入就有 ¥30,000+。放任空房不管不是专业行为。' },
    ],
    correctIdx: 0,
    extraNote: 'LOS（Length of Stay）管控是进阶收益管理技能。用高需求日"拉动"低需求日——这个操作在现实中叫"shoulder night pattern management"。',
  },
  {
    icon: '🌟', time: '16:00',
    title: '升级销售：设计今晚的 Upsell 策略',
    desc: '今晚还有 18 间高级套房（¥1280）和 6 间总统套房（¥2880）没有卖出去。普通房今晚还剩 32 间。你想通过升级销售提高 ADR。',
    contextHTML: `
      <div class="dil-data">
        <div class="dil-data-row"><span>未售高级套房</span><strong>18 间 @ ¥1280</strong></div>
        <div class="dil-data-row"><span>未售总统套房</span><strong>6 间 @ ¥2880</strong></div>
        <div class="dil-data-row"><span>未售标准房</span><strong>32 间 @ ¥580</strong></div>
        <div class="dil-data-row"><span>预计今晚 walk-in</span><strong>约 15~20 人</strong></div>
      </div>`,
    choices: [
      { label: 'A. 对所有 walk-in 客人：标准房 ¥580，"+¥200 升级到高级套房"（优惠 ¥500），"+¥800 升级到总统套房"（优惠 ¥1500）✓', points: 15,
        explanation: '✅ 正确！空着的套房不产生任何收入，与其空着不如低价升级出去。+¥200 升级高级套房：客人觉得"加 200 就能住套房太值了"，你多赚了 ¥200 且清掉了空置套房库存。原本标准房卖 ¥580，现在收到 ¥780 住了套房——ADR 提高 34%！如果 10 个人选择升级，额外收入 ¥2000。' },
      { label: 'B. 套房按原价卖，不搞促销', points: -5,
        explanation: '❌ 高级套房空着就是 ¥0 收入。已经晚上 4 点了，深夜卖出去的概率极低。与其明天报表上写着"18 间套房空置"，不如优惠卖掉——至少还有收入。' },
      { label: 'C. 把所有 walk-in 直接安排进套房，不额外收费', points: 0,
        explanation: '⚠️ 免费升级虽然让客人满意，但你损失了获取额外收入的机会。小幅加价 + 大幅折扣的组合既让客人觉得值，又给你带来了增量收入。' },
    ],
    correctIdx: 0,
    extraNote: 'Upsell 的核心是"增量收入"——用已售的低价房做基础，让客人花更少的增量成本住更高级的房。你赚了增量，客人觉得赚了划算，双赢。',
  },
  {
    icon: '🌆', time: '17:00',
    title: '当日盘点与次日准备',
    desc: '一天即将结束。你需要审阅今天的所有决策结果，并确认明早的待办事项。这是收益经理 SOP 的闭环——从数据审视到策略执行再到结果验证。',
    contextHTML: `
      <div class="dil-data">
        <div class="dil-data-row"><span>今日共做了</span><strong>8 个关键决策</strong></div>
        <div class="dil-data-row"><span>涉及领域</span><strong>定价 · 预测 · 渠道 · 库存 · 升级</strong></div>
        <div class="dil-data-row"><span>明日重点工作</span><strong>审核今日决策效果、接收新团队询价</strong></div>
      </div>`,
    choices: [
      { label: 'A. 将所有决策和预期结果记录到收益管理日志，设置明早 7:00 自动报表提醒 ✓', points: 15,
        explanation: '✅ 完美！收益管理是一个持续优化的循环，不是一次性操作。记录决策和预期效果，明天早上对照实际数据验证你的判断是否准确——这是从"能做"到"做得越来越好"的关键。真正的收益管理大师靠的不是直觉，而是数据和复盘。' },
      { label: 'B. 下班，明天再说', points: -5,
        explanation: '❌ 没有记录就没有复盘，没有复盘就没有进步。今天不记下来，明天你就忘了为什么做了那些决策、预期结果是什么。' },
      { label: 'C. 发一条朋友圈庆祝今天的决策', points: 0,
        explanation: '😅 可以发，但别忘了先写工作日志。' },
    ],
    correctIdx: 0,
    extraNote: '收益管理的 PDCA 循环：Plan（计划）→ Do（执行）→ Check（检查）→ Act（改进）。这也是为什么晨会（Check）是一天的第一件事——它在检查昨天的 Plan 执行得如何。',
  },
];
