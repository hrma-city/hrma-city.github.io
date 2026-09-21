# -*- coding: utf-8 -*-
import io, sys

sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PATH = "news.html"

with open(PATH, "r", encoding="utf-8") as f:
    html = f.read()

# ---- new cards (6) ----
NEW_CARDS = '''  <div class="nw-card">
    <div><span class="nw-tag">住宿业</span><span class="nw-src">2026-09-21 · 携程 / 去哪儿 / 途家 双节预订 + 市场监管总局·文旅部 9月行政指导会</span></div>
    <h2 class="nw-h">监管"把定价权还给酒店"叫停平台自动跟价，但双节预订近2倍、上半年却"量稳价跌"</h2>
    <div class="nw-data">
      <div class="nw-d"><div class="nw-dv nw-up">近2倍</div><div class="nw-dl">携程酒店订单量同比（热门城市 +30%、途家独栋别墅 +18.4%，需求分层释放）</div></div>
      <div class="nw-d"><div class="nw-dv nw-up">+55%</div><div class="nw-dl">县域目的地酒店预订较 7 月（黄山 +3.5 倍、黟县超 13 倍，下沉市场真实弹性）</div></div>
      <div class="nw-d"><div class="nw-dv nw-down">−11.92%</div><div class="nw-dl">五一平均房价同比（入住率仅微增 0.88pp，"量稳价跌"仍是上半年现实）</div></div>
      <div class="nw-d"><div class="nw-dv">叫停跟价</div><div class="nw-dl">9月中旬监管总局会同文旅部行政指导会：终止平台自动跟价、把定价权还给酒店；多地 60% 涨幅红线</div></div>
    </div>
    <p class="nw-p">
      携程数据显示双节酒店订单量同比近 2 倍、热门城市 +30%；途家独栋别墅 +18.4%，去哪儿 9/28–30 拼假出游 +52%、占 13 天长假 15%；县域预订较 7 月 +55%、黄山 +3.5 倍、黟县超 13 倍。但上半年仍是"量稳价跌"：五一房价 −11.92%、暑期华住/锦江/亚朵分别 −14.9%/−13.2%/−19.5%。9 月中旬监管总局会同文旅部召开行政指导会，要求终止平台通过技术工具自动跟价、把定价权还给酒店经营者，多地明确假期涨幅超此前 30 日同类房型均价 60% 一律视为哄抬。
    </p>
    <div class="nw-read">
      <b>社区解读 ·</b> 政策把定价权还给酒店是利好，但上半年量稳价跌说明定价权仍弱、且 60% 红线是硬天花板，裸价空间有限。可执行：① 把"30 日涨幅 60%"设为溢价合规上限，超阈值即预警；② 用套餐（房+餐+票）提 ADR 而非裸涨，避监管与舆情；③ 平台停跟价后须自建动态定价能力，别再把定价外包给 OTA 算法。
    </div>
  </div>

  <div class="nw-card">
    <div><span class="nw-tag">航空业</span><span class="nw-src">2026-09-21 · 财联社 / 航旅纵横 / 去哪儿 机票监测</span></div>
    <h2 class="nw-h">"抢跑错峰族"提前出发：9/22 起逐日翻倍，早走比国庆首日省近 50%</h2>
    <div class="nw-data">
      <div class="nw-d"><div class="nw-dv nw-up">1271万张</div><div class="nw-dl">航旅纵横截至 9/20 国内机票预订量同比 +4%（出境 138 万 +2%、入境 126 万 +4%）</div></div>
      <div class="nw-d"><div class="nw-dv nw-up">+50%</div><div class="nw-dl">9/24 乘飞机出游人数同比（9/23 已 +20%，"抢跑错峰族"蔓延至节前工作日）</div></div>
      <div class="nw-d"><div class="nw-dv nw-down">−50%</div><div class="nw-dl">9/22 出发均价较国庆首日 10/1 低近 50%、较中秋首日 9/25 低逾 30%（节前窗口价格弹性高）</div></div>
      <div class="nw-d"><div class="nw-dv nw-up">+86%</div><div class="nw-dl">同程"赏秋"搜索热度同比（赏秋跟团/定制/民宿连住产品预订 +50%，平季新增量）</div></div>
    </div>
    <p class="nw-p">
      财联社 9/21 报道，航旅纵横截至 9/20 国内航线机票预订超 1271 万张（+4%）、出境 138 万（+2%）、入境 126 万（+4%）。去哪儿称今年机票偏贵催生"抢跑错峰族"，9/22 起抢跑客流逐日递增，9/23 同比 +20%、9/24 近 +50%；9/22 出发较中秋首日低 30%、国庆首日低近 50%。同程"赏秋"搜索 +86%，赏秋主题跟团/定制游/民宿连住产品预订 +50%。
    </p>
    <div class="nw-read">
      <b>社区解读 ·</b> 需求显著前移——节前工作日（9/22–24）从"淡季"变成可售窗口，且比假期低 30–50% 仍有人买，错峰价格弹性高。可执行：① 建"节前错峰段"独立价格曲线，用动态折扣吃满前移需求，不按平日贱卖；② 返程分散（10/4–7）证明单日返程高峰已瓦解，按日期细粒度定价；③ 赏秋/长线深度游（+86%）是平季新增量，航司应推"赏秋航线包"对标酒店套餐。
    </div>
  </div>

  <div class="nw-card">
    <div><span class="nw-tag">餐饮业</span><span class="nw-src">2026-09-21 · 第一财经商业数据中心 消费公司中报盘点</span></div>
    <h2 class="nw-h">中报六成"只涨利润不涨营收"：关店降本派与外卖轻资产派两极分化</h2>
    <div class="nw-data">
      <div class="nw-d"><div class="nw-dv nw-up">+121%</div><div class="nw-dl">海底捞外卖收入同比（占收入比 4.5%→9.2%；但自营餐厅 −4.0%、同店 −1.3%）</div></div>
      <div class="nw-d"><div class="nw-dv nw-down">−23.1%</div><div class="nw-dl">呷哺呷哺营收同比（净亏 3619 万，同比收窄 55%，收缩式减亏）</div></div>
      <div class="nw-d"><div class="nw-dv nw-up">+112%</div><div class="nw-dl">全聚德扣非净利润同比（营收 −2.55% 但利润大增，关店降本换表）</div></div>
      <div class="nw-d"><div class="nw-dv">关店派</div><div class="nw-dl">九毛九/呷哺/全聚德靠关店+降本换利润；六成品牌只涨利润不涨营收，同店仍承压</div></div>
    </div>
    <p class="nw-p">
      第一财经商业数据中心盘点消费中报：六成品牌只涨利润不涨营收。海底捞外卖 +121%（占收入 9.2%），但自营餐厅 −4.0%、同店 −1.3%；呷哺营收 −23.1%、净亏 3619 万（同比收窄 55%）；全聚德营收 −2.55% 但扣非净利 +112%；九毛九关 42 店、收入 −13.2% 而净利 +24.9%。麦当劳特许经营占收入六成、营业利润率近 46%；百胜中国 Q2 经营利润创纪录、外卖占 55%。
    </p>
    <div class="nw-read">
      <b>社区解读 ·</b> 餐饮今年分层不在"涨或降"，而在"单店模型 vs 渠道/资产结构"。关店降本派（九毛九/呷哺/全聚德）用收缩换利润表但同店仍负；外卖轻资产派（海底捞外卖 +121%、百胜外卖 55%、麦当劳特许经营）用渠道结构对冲单店 RevPAR 波动。可执行：① 把外卖/零售/特许经营占比当餐饮版非房收入管，组合收益对冲客房疲软；② 关店设"关到哪为止"阈值，防关出增长真空；③ 看健康度盯同店而非净利，净利可被一次性因素粉饰。
    </div>
  </div>

  <div class="nw-card">
    <div><span class="nw-tag">景区文旅</span><span class="nw-src">2026-09-21 · 中国宁波网 / 极目新闻 / 四川广播 双节限流公告</span></div>
    <h2 class="nw-h">兵马俑国庆承载量提至 8 万、三星堆延时开放：限流从"硬封顶"变成"产能分配"</h2>
    <div class="nw-data">
      <div class="nw-d"><div class="nw-dv">8万人</div><div class="nw-dl">秦始皇帝陵国庆 10/1–7 每日最大承载量（中秋前 9/25–30 由 6.5 万→7.5 万；9/21 00:00 开放预约）</div></div>
      <div class="nw-d"><div class="nw-dv">8:30–20:00</div><div class="nw-dl">三星堆双节延时开放（中秋票额 9/20 20:00 放出、国庆 9/26 放出，全实名分时入园）</div></div>
      <div class="nw-d"><div class="nw-dv">数分钟–数十分钟</div><div class="nw-dl">热门场馆放票后约满时长（西湖灵隐须提前 1 天及以上、最早提前 7 天实名预约、当日不可约）</div></div>
      <div class="nw-d"><div class="nw-dv">提前7天</div><div class="nw-dl">西湖/故宫等核心景区预约窗口；放票即约满成常态，"预约权=产能分配权"</div></div>
    </div>
    <p class="nw-p">
      中国宁波网 9/21 汇总，双节前多地密集发布限流方案：秦始皇帝陵 9/20 公告，中秋前承载量 6.5 万→7.5 万、国庆提至 8 万；三星堆 9/20 宣布延时开放 8:30–20:00、票额分两批实名放出；杭州西湖灵隐须提前 1 天及以上、最早提前 7 天实名预约，当日不可约；多家平台称热门场馆放票后数分钟至数十分钟约满。
    </p>
    <div class="nw-read">
      <b>社区解读 ·</b> 限流正从"一刀切封顶"升级为"承载量可调+分时预约+放票即约满"的产能分配系统。兵马俑把承载量从 6.5 万动态抬到 8 万，是在合规天花板内做加法；放票即约满说明"预约权=产能分配权"。可执行：① 把承载量当可售库存动态管理，按日期/时段设阶梯上限而非固定封顶；② 热门时段用"提前放票+退票回流"机制最大化 occupancy；③ 二销（摆渡/讲解/体验）独立于门票按承载量实时定价，复制酒店非房收入逻辑。
    </div>
  </div>

  <div class="nw-card">
    <div><span class="nw-tag">娱乐休闲</span><span class="nw-src">2026-09-22 · 猫眼专业版 实时票房（01:09）</span></div>
    <h2 class="nw-h">排片占比与票房占比的"剪刀差"：奥德赛用 5.5% 厅产 35.8% 票房</h2>
    <div class="nw-data">
      <div class="nw-d"><div class="nw-dv nw-up">35.8% / 5.5%</div><div class="nw-dl">奥德赛 票房占比 / 排片占比（单厅产出≈均值 6.5 倍；上映 40 天 7.28 亿）</div></div>
      <div class="nw-d"><div class="nw-dv nw-down">14.9% / 26.4%</div><div class="nw-dl">欢迎来龙餐馆 票房 / 排片占比（占厅近 1/4 仅产 15%，单厅产出 &lt;0.6 倍，占厅不划算）</div></div>
      <div class="nw-d"><div class="nw-dv nw-up">4.9% / 0.4%</div><div class="nw-dl">密档 票房 / 排片占比（长尾小片高 yield，0.4% 厅产 4.9% 票房≈12 倍，值得保底）</div></div>
      <div class="nw-d"><div class="nw-dv">19.48亿</div><div class="nw-dl">八仙！累计票房（排片 9.6%、票房 5.9%，单厅产出居中，长线稳健）</div></div>
    </div>
    <p class="nw-p">
      猫眼专业版 9/22 01:09 实时：奥德赛上映 40 天 7.28 亿、票房占比 35.8% 却仅排片 5.5%；欢迎来龙餐馆 22.20 亿、排片 26.4% 但票房 14.9%；密档 1458.8 万、排片仅 0.4% 票房却占 4.9%。排片占比与票房占比严重错位——头部与长尾小片单厅产出极高，而部分大片占近 1/4 厅只产 15% 票房。
    </p>
    <div class="nw-read">
      <b>社区解读 ·</b> 排片占比≠票房贡献，单厅产出（等效 RevPASH）才是排片依据。奥德赛/密档用极少厅产极高票房，龙餐馆占近 1/4 厅却不到 15%——和酒店"把房给低价值客"一模一样。可执行：① 排片按单厅票房产出而非总厅数分配，每周滚动重排；② 长尾高 yield 小片（密档 0.4% 厅→4.9% 票房）值得保底场次，别被大片虹吸；③ 闲时厅用重映/会员场填，对标酒店闲时房态管理。
    </div>
  </div>

  <div class="nw-card">
    <div><span class="nw-tag">国际</span><span class="nw-src">2026-09-18 · Leading Hoteliers / CBRE·CoStar 中东 9月酒店报告</span></div>
    <h2 class="nw-h">中东酒店"运营寒冬中 pipeline 创新高"：迪拜 OCC 从 81% 崩到 56.4%，麦加逆势 +8.7%</h2>
    <div class="nw-data">
      <div class="nw-d"><div class="nw-dv nw-down">−35.2%</div><div class="nw-dl">迪拜 H1 RevPAR 同比（OCC 从 81% 崩至 56.4%；阿布扎比 −20.3% 更具韧性）</div></div>
      <div class="nw-d"><div class="nw-dv nw-up">+8.7%</div><div class="nw-dl">麦加 RevPAR 同比（OCC +4pp 至 68.2%；宗教旅游+事件驱动需求托底）</div></div>
      <div class="nw-d"><div class="nw-dv">724项目</div><div class="nw-dl">中东 Q2 pipeline（17.8 万间，同比 +11% 创历史新高，"运营寒冬中建设热"）</div></div>
      <div class="nw-d"><div class="nw-dv">66%</div><div class="nw-dl">迪拜 8 月 OCC 回升（从 3 月冲突峰值 33.1% 低位修复，分化式复苏进行中）</div></div>
    </div>
    <p class="nw-p">
      Leading Hoteliers 9/18 中东 9 月报告：受地缘冲突冲击，迪拜 H1 OCC 从 81% 崩至 56.4%、RevPAR −35.2%，阿布扎比 −20.3% 更具韧性；麦加 OCC +4pp 至 68.2%、RevPAR +8.7%。8 月迪拜 OCC 回升至 66%（3 月曾跌至 33.1%）。但 Q2 pipeline 达 724 项目 / 17.8 万间（+11%）创历史新高。
    </p>
    <div class="nw-read">
      <b>社区解读 ·</b> 这是"需求冲击下 OCC 封顶、恢复靠事件/宗教旅游"的极端样本。迪拜长线依赖型市场最脆弱（RevPAR −35.2%），麦加靠宗教旅游逆势 +8.7%——事件日历是 OCC 锚。运营寒冬中 pipeline 创新高，是逆周期供给下注，但短期 OCC 未恢复时新供给会压制 RevPAR。可执行：① 年度预算别被"pipeline 新高"误导，短期供给增会稀释 RevPAR；② 把事件/宗教/会议日历当 OCC 第一驱动，长线市场建需求预警；③ 韧性来自多元客源（国内+事件），单点依赖长线最危险，与国内"县域反向游对冲核心城市"同理。
    </div>
  </div>
'''

# replace from first nw-card up to (but not including) cm-btns
idx_card = html.index('  <div class="nw-card">')
idx_btns = html.index('  <div class="cm-btns"')
new_html = html[:idx_card] + NEW_CARDS + "\n" + html[idx_btns:]

# update nw-note date
import re
new_html = new_html.replace('最近更新：2026-09-21', '最近更新：2026-09-22')

with open(PATH, "w", encoding="utf-8") as f:
    f.write(new_html)

# ---- self checks ----
cards = new_html.count('class="nw-card"')
tags = new_html.count('class="nw-tag"')
reads = new_html.count('class="nw-read"')
data = new_html.count('class="nw-data"')
h2 = new_html.count('class="nw-h"')
opens = new_html.count('<div')
closes = new_html.count('</div>')
print("cards=%d tags=%d reads=%d data=%d h2=%d div_open=%d div_close=%d" % (cards, tags, reads, data, h2, opens, closes))
print("date_ok=", '最近更新：2026-09-22' in new_html)
print("note_ok=", '本期共 6 条' in new_html)
