# -*- coding: utf-8 -*-
"""
HRMA · 工作簿 01-04 生成器
01 每日收益日报 / 02 Pickup 预订速度追踪表 / 03 竞争比价监测表 / 04 调价台账
"""
import datetime as dt
import random

from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.formatting.rule import CellIsRule

from _common import *  # noqa
from _common import fill, put, row as wrow, header_row, set_widths, title, section, para, cf_rule

RNG = random.Random(20250903)


# =============================================================== 01 每日收益日报
def build_01(path):
    wb = Workbook()
    ws_intro = wb.active
    ws_intro.title = "说明"
    ws = wb.create_sheet("日报")
    ws_dict = wb.create_sheet("数据字典")

    LAST = "AA"
    FIRST, LASTROW = 4, 34           # 31 天
    DICT_OCC_ROW0 = 5                # 数据字典 月度参数首行（12 行：5-16）

    # ---------------- 数据字典
    ws_dict.sheet_view.showGridLines = False
    set_widths(ws_dict, [14, 18, 12, 46, 40])
    r = title(ws_dict, "数据字典 · 指标口径 / 参数主数据",
              "本页为《每日收益日报》的参数来源。口径以 SPEC.md 第三、四章为准，灰底为参考参数。", "E")

    r = section(ws_dict, 3, "一、月度预算参数（SPEC 2.5，日报预算列自动引用本表）", "E")
    r = header_row(ws_dict, 4, 1, ["月份", "预算 OCC", "预算 ADR"], height=22)
    for m in range(12):
        wrow(ws_dict, 5 + m, 1, [
            (m + 1, "r", INT),
            (SPEC_MONTH_OCC[m], "i", PCT1),
            (SPEC_MONTH_ADR[m], "i", MONEY),
        ])
    r = 18

    r = section(ws_dict, r, "二、渠道成本率（SPEC 2.3）", "E")
    r = header_row(ws_dict, r, 1, ["渠道", "代码", "综合成本率", "说明", ""], height=22)
    chan_first = r
    channels = [
        ("直销（官网/小程序/前台）", "DIR", 0.03, "含支付手续费与系统费"),
        ("协议公司（含返佣/账期）", "CORP", 0.08, "含返佣与账期成本"),
        ("会员直订", "LOY", 0.04, "积分成本"),
        ("OTA 国内（携程/美团/飞猪）", "OTA", 0.16, "佣金"),
        ("OTA 国际（Booking/Agoda）", "OTA-I", 0.18, "佣金"),
        ("GDS / 商旅 TMC", "GDS", 0.13, "佣金+通道费"),
        ("批发商 / 包房商", "WHO", 0.26, "净价结算"),
    ]
    for ch in channels:
        wrow(ws_dict, r, 1, [(ch[0], "r", None, "left"), (ch[1], "r"), (ch[2], "i", PCT2), (ch[3], "r", None, "left")])
        r += 1
    chan_last = r - 1
    r += 1

    r = section(ws_dict, r, "三、客源结构与综合渠道成本率（SPEC 2.3）", "E")
    r = header_row(ws_dict, r, 1, ["细分代码", "细分名称", "房晚占比", "平均 ADR", "渠道", "渠道成本率"], height=22)
    seg_first = r
    for code, name, share, adr, chan, _cost in SEGMENTS:
        wrow(ws_dict, r, 1, [
            (code, "r"), (name, "r", None, "left"), (share, "i", PCT2), (adr, "i", MONEY), (chan, "i"),
            (f'=IFERROR(VLOOKUP($E{r},$A${chan_first}:$C${chan_last},3,FALSE),"")', "f", PCT2),
        ])
        r += 1
    seg_last = r - 1
    wrow(ws_dict, r, 1, [
        ("合计", "t"), ("加权平均", "t"),
        (f"=SUM($C${seg_first}:$C${seg_last})", "f", PCT2),
        (f"=IFERROR(SUMPRODUCT($C${seg_first}:$C${seg_last},$D${seg_first}:$D${seg_last})/SUM($C${seg_first}:$C${seg_last}),\"\")", "f", MONEY2),
        ("综合渠道成本率", "t"),
        (f"=IFERROR(SUMPRODUCT($C${seg_first}:$C${seg_last},$F${seg_first}:$F${seg_last})/SUM($C${seg_first}:$C${seg_last}),\"\")", "f", PCT2),
    ])
    blended_cost_row = r
    r += 2

    r = section(ws_dict, r, "四、核心指标口径（SPEC 3.1）", "E")
    r = header_row(ws_dict, r, 1, ["指标", "中文名", "单位", "公式", "说明"], height=22)
    metrics = [
        ("OCC", "出租率", "%", "已售房晚 ÷ 可售房晚 × 100%", "分母为可售房晚（剔除装修/OOO 房）"),
        ("ADR", "平均房价", "元", "客房收入 ÷ 已售房晚", "含服务费、不含增值税"),
        ("RevPAR", "每间可售房收入", "元", "客房收入 ÷ 可售房晚 = OCC × ADR", "收益管理第一指标"),
        ("TrevPAR", "每间可售房总营收", "元", "总营收 ÷ 可售房晚", "全服务酒店须同时看（等价 RevPE）"),
        ("GOPPAR", "每间可售房毛利润", "元", "GOP ÷ 可售房晚", "最终考核指标"),
        ("MPI", "市场渗透指数", "指数", "本店 OCC ÷ 竞争组合 OCC × 100", ">100 表示份额领先"),
        ("ARI", "平均房价指数", "指数", "本店 ADR ÷ 竞争组合 ADR × 100", ">100 表示卖得比竞对贵"),
        ("RGI", "收入生成指数", "指数", "本店 RevPAR ÷ 竞争组合 RevPAR × 100", "= MPI × ARI ÷ 100"),
        ("NRevPAR", "净 RevPAR", "元", "RevPAR × (1 − 渠道综合成本率)", "剔除渠道成本后的真实收益"),
        ("Pickup", "预订增量", "房晚", "某目标日在某时段内新增的预订房晚", "正值=新增，负值=取消净额"),
        ("Booking Window", "预订窗口", "天", "入住日 − 预订日", "分档见《法典》表 I"),
        ("RW", "剩余需求分析", "房晚", "预测总需求 − 在手预订", "Remaining Demand"),
        ("BAR", "最优可用房价", "元", "公开可订的基准弹性价", "所有折扣的锚点"),
        ("Displacement", "置换分析", "元", "比较团队/协议与散客的边际收益", "见《法典》表 G"),
    ]
    for m in metrics:
        wrow(ws_dict, r, 1, [(m[0], "r"), (m[1], "r", None, "left"), (m[2], "r"), (m[3], "r", None, "left"), (m[4], "r", None, "left")])
        r += 1
    r += 1

    r = section(ws_dict, r, "五、需求等级（SPEC 2.5）", "E")
    r = header_row(ws_dict, r, 1, ["等级", "名称", "价格系数", "目标 OCC", "典型日期"], height=22)
    for lv in [("D1", "峰值日 PEAK", "150–200%", "≥95%", "国庆1–5、五一1–3、春节初三–初六、动漫节/云栖大会/马拉松"),
               ("D2", "高涨日 HIGH", "120–150%", "88–95%", "旺季周五六、展会周边日、暑期周末"),
               ("D3", "平峰日 SHOULDER", "95–110%", "72–85%", "平季周五六、旺季周日–周四"),
               ("D4", "低谷日 LOW", "70–85%", "45–65%", "1–2月淡季、7月上中旬、节后3–5天、极端天气")]:
        wrow(ws_dict, r, 1, [(lv[0], "r"), (lv[1], "r", None, "left"), (lv[2], "r"), (lv[3], "r"), (lv[4], "r", None, "left")])
        r += 1
    r += 1

    r = section(ws_dict, r, "六、日报字段字典", "E")
    r = header_row(ws_dict, r, 1, ["列", "字段", "类型", "口径 / 预置公式", "说明"], height=22)
    for d in [
        ("A", "日期", "输入", "—", "经营日（或目标日），所有月度累计按此列归月"),
        ("B", "星期", "公式", 'CHOOSE(WEEKDAY(A,2),"周一"…"周日")', "自动"),
        ("C", "需求等级", "输入", "D1/D2/D3/D4 下拉", "SPEC 2.5"),
        ("D-E", "可售房量 / 已售房晚", "输入", "—", "分母为可售房晚"),
        ("F", "OCC", "公式", "=E/D", "出租率"),
        ("G", "客房收入", "输入", "—", "含服务费不含税"),
        ("H-I", "ADR / RevPAR", "公式", "=G/E ； =G/D", ""),
        ("J-K", "竞争组合 OCC / ADR", "输入", "—", "5 家竞对加权"),
        ("L", "竞争组合 RevPAR", "公式", "=J*K", ""),
        ("M-O", "MPI / ARI / RGI", "公式", "=F/J*100 ； =H/K*100 ； =I/L*100", "SPEC 3.1"),
        ("P", "渠道成本率", "输入", "默认 10.1%", "来自本页第三节综合渠道成本率"),
        ("Q", "NRevPAR", "公式", "=I*(1-P)", ""),
        ("R", "昨日 Pickup", "输入", "净增预订房晚", "取自 02_Pickup 追踪表"),
        ("S-U", "本月累计 OCC/ADR/RevPAR", "公式", "SUMIFS（按 A 列归月）", ""),
        ("V-X", "预算 OCC/ADR/RevPAR", "公式", "INDEX(数据字典!$B$5:$B$16,MONTH(A))", "SPEC 2.5 月度基准"),
        ("Y-AA", "达成率 OCC/ADR/RevPAR", "公式", "实际 ÷ 预算", "≥100% 达标"),
    ]:
        wrow(ws_dict, r, 1, [(d[0], "r"), (d[1], "r", None, "left"), (d[2], "r"), (d[3], "r", None, "left"), (d[4], "r", None, "left")])
        r += 1

    # ---------------- 日报
    ws.sheet_view.showGridLines = False
    headers = ["日期", "星期", "需求\n等级", "可售\n房量", "已售\n房晚", "OCC", "客房收入", "ADR", "RevPAR",
               "竞争组合\nOCC", "竞争组合\nADR", "竞争组合\nRevPAR", "MPI", "ARI", "RGI",
               "渠道\n成本率", "NRevPAR", "昨日\nPickup",
               "本月累计\nOCC", "本月累计\nADR", "本月累计\nRevPAR",
               "预算\nOCC", "预算\nADR", "预算\nRevPAR",
               "达成率\nOCC", "达成率\nADR", "达成率\nRevPAR"]
    widths = [11, 7, 8, 8, 8, 8, 11, 8, 9, 10, 10, 11, 8, 8, 8, 9, 9, 9,
              10, 10, 11, 8, 8, 9, 9, 9, 10]
    set_widths(ws, widths)
    title(ws, "每日收益日报 · 杭州滨江云璟酒店（320 间）",
          "黄底=输入，白底=公式。先填 A/C/D/E/G/J/K/P/R 列，其余全部自动生成。示例数据为 2026 年 1 月，可直接覆盖。", LAST)
    header_row(ws, 3, 1, headers, height=38)
    freeze(ws, "D4")

    E_S, E_E = f"$E${FIRST}", f"$E${LASTROW}"
    D_S, D_E = f"$D${FIRST}", f"$D${LASTROW}"
    G_S, G_E = f"$G${FIRST}", f"$G${LASTROW}"
    A_S, A_E = f"$A${FIRST}", f"$A${LASTROW}"

    def _mtd(sum_rng, crit_a):
        return (f'IFERROR(SUMIFS({sum_rng},{A_S}:{A_E},">="&EOMONTH($A{{r}},-1)+1,{A_S}:{A_E},"<="&EOMONTH($A{{r}},0))'
                f'/SUMIFS({crit_a},{A_S}:{A_E},">="&EOMONTH($A{{r}},-1)+1,{A_S}:{A_E},"<="&EOMONTH($A{{r}},0)),"")')

    demo = []
    base = dt.date(2026, 1, 1)
    for i in range(31):
        d = base + dt.timedelta(days=i)
        wd = d.weekday()
        uplift = {0: 0.90, 1: 0.94, 2: 0.96, 3: 1.00, 4: 1.14, 5: 1.26, 6: 1.06}[wd]
        if d.day <= 3:
            lvl, uplift = "D1", 1.45
        elif d.month == 1:
            lvl = "D4" if uplift < 1.05 else "D3"
        else:
            lvl = "D3"
        occ = min(0.97, 0.58 * uplift * (1 + RNG.uniform(-0.05, 0.05)))
        rn = round(320 * occ)
        adr = round(540 * (1 + (uplift - 1) * 0.55) * (1 + RNG.uniform(-0.03, 0.03)))
        demo.append(dict(date=d, lvl=lvl, avail=320, rn=rn, rev=rn * adr))

    for i in range(31):
        r = FIRST + i
        d = demo[i]
        comp_occ = round(0.72 + RNG.uniform(-0.04, 0.04), 4)
        comp_adr = round(680 * (1 + RNG.uniform(-0.05, 0.05)))
        cost = 0.101
        pickup = RNG.randint(-6, 26) if i else ""
        wrow(ws, r, 1, [
            (d["date"], "i", DATE),
            (f'=IF($A{r}="","",{WEEKDAY_CHOOSE.format(c="A", r=r)})', "f"),
            (d["lvl"], "i"),
            (d["avail"], "i", INT),
            (d["rn"], "i", INT),
            (f'=IFERROR($E{r}/$D{r},"")', "f", PCT1),
            (d["rev"], "i", MONEY),
            (f'=IFERROR($G{r}/$E{r},"")', "f", MONEY2),
            (f'=IFERROR($G{r}/$D{r},"")', "f", MONEY2),
            (comp_occ, "i", PCT1),
            (comp_adr, "i", MONEY),
            (f'=IFERROR($J{r}*$K{r},"")', "f", MONEY2),
            (f'=IFERROR($F{r}/$J{r}*100,"")', "f", IDX),
            (f'=IFERROR($H{r}/$K{r}*100,"")', "f", IDX),
            (f'=IFERROR($I{r}/$L{r}*100,"")', "f", IDX),
            (cost, "i", PCT2),
            (f'=IFERROR($I{r}*(1-$P{r}),"")', "f", MONEY2),
            (pickup, "i", INT),
            ("=" + _mtd(E_S, D_S).format(r=r), "f", PCT1),
            ("=" + _mtd(G_S, E_S).format(r=r), "f", MONEY2),
            ("=" + _mtd(G_S, D_S).format(r=r), "f", MONEY2),
            (f'=IF($A{r}="","",IFERROR(INDEX(数据字典!$B${DICT_OCC_ROW0}:$B${DICT_OCC_ROW0 + 11},MONTH($A{r})),""))', "f", PCT1),
            (f'=IF($A{r}="","",IFERROR(INDEX(数据字典!$C${DICT_OCC_ROW0}:$C${DICT_OCC_ROW0 + 11},MONTH($A{r})),""))', "f", MONEY),
            (f'=IFERROR($V{r}*$W{r},"")', "f", MONEY2),
            (f'=IFERROR($F{r}/$V{r},"")', "f", PCT1),
            (f'=IFERROR($H{r}/$W{r},"")', "f", PCT1),
            (f'=IFERROR($I{r}/$X{r},"")', "f", PCT1),
        ])

    dv_list(ws, f"C{FIRST}:C{LASTROW}", DEMAND_LEVELS)
    dv_date(ws, f"A{FIRST}:A{LASTROW}")
    dv_num(ws, f"F{FIRST}:F{LASTROW}", 0, 1)
    dv_num(ws, f"J{FIRST}:J{LASTROW}", 0, 1)
    dv_num(ws, f"P{FIRST}:P{LASTROW}", 0, 0.6)
    dv_num(ws, f"D{FIRST}:E{LASTROW}", 0, 1000)
    dv_num(ws, f"R{FIRST}:R{LASTROW}", -500, 500)

    rng_all = f"A{FIRST}:{LAST}{LASTROW}"
    # MPI：≥100 青绿，95–100 琥珀，<95 红
    ws.conditional_formatting.add(f"M{FIRST}:M{LASTROW}", CellIsRule(
        operator="greaterThanOrEqual", formula=["100"], fill=fill(TEAL_LIGHT),
        font=Font(name=FONT, size=10, color=TEAL, bold=True)))
    ws.conditional_formatting.add(f"M{FIRST}:M{LASTROW}", CellIsRule(
        operator="between", formula=["95", "100"], fill=fill(AMBER_LIGHT),
        font=Font(name=FONT, size=10, color=AMBER, bold=True)))
    ws.conditional_formatting.add(f"M{FIRST}:M{LASTROW}", CellIsRule(
        operator="lessThan", formula=["95"], fill=fill(RED_LIGHT),
        font=Font(name=FONT, size=10, color=RED, bold=True)))
    # ARI：97–103 健康
    cf_scale(ws, f"N{FIRST}:N{LASTROW}", 97, 103, 90, 110)
    ws.conditional_formatting.add(f"O{FIRST}:O{LASTROW}", CellIsRule(
        operator="greaterThanOrEqual", formula=["100"], fill=fill(TEAL_LIGHT),
        font=Font(name=FONT, size=10, color=TEAL, bold=True)))
    ws.conditional_formatting.add(f"O{FIRST}:O{LASTROW}", CellIsRule(
        operator="between", formula=["95", "100"], fill=fill(AMBER_LIGHT),
        font=Font(name=FONT, size=10, color=AMBER, bold=True)))
    ws.conditional_formatting.add(f"O{FIRST}:O{LASTROW}", CellIsRule(
        operator="lessThan", formula=["95"], fill=fill(RED_LIGHT),
        font=Font(name=FONT, size=10, color=RED, bold=True)))
    # 达成率：≥100% 青绿，≥95% 琥珀，<95% 红
    for col in ("Y", "Z", "AA"):
        rr = f"{col}{FIRST}:{col}{LASTROW}"
        ws.conditional_formatting.add(rr, CellIsRule(
            operator="greaterThanOrEqual", formula=["1"], fill=fill(TEAL_LIGHT),
            font=Font(name=FONT, size=10, color=TEAL, bold=True)))
        ws.conditional_formatting.add(rr, CellIsRule(
            operator="between", formula=["0.95", "0.9999"], fill=fill(AMBER_LIGHT),
            font=Font(name=FONT, size=10, color=AMBER, bold=True)))
        ws.conditional_formatting.add(rr, CellIsRule(
            operator="lessThan", formula=["0.95"], fill=fill(RED_LIGHT),
            font=Font(name=FONT, size=10, color=RED, bold=True)))
    cf_updown(ws, f"R{FIRST}:R{LASTROW}")

    # ---------------- 说明
    write_intro(ws_intro, "01", "每日收益日报",
                ["用于每日 07:30–08:30 的《每日收益数据包》汇总（《法典》表 M 流水线第 1-3 步）。",
                 "一行 = 一个经营日。填入房晚与收入后，OCC / ADR / RevPAR / MPI / ARI / RGI / NRevPAR 与月度累计、预算达成率全部自动计算。",
                 "《法典》表 M 要求 07:30 抓取数据、08:30 前完成查表，本表即为其数据底座。"],
                [
                    ("A", "日期", "输入", "—", "经营日；本月累计按此列自动归月"),
                    ("C", "需求等级", "输入", "D1/D2/D3/D4", "SPEC 2.5，决定价格系数与目标 OCC"),
                    ("D", "可售房量", "输入", "默认 320", "剔除装修/OOO 房后的可卖房量"),
                    ("E", "已售房晚", "输入", "—", "含免费房的房晚"),
                    ("G", "客房收入", "输入", "—", "含服务费、不含增值税"),
                    ("J/K", "竞争组合 OCC/ADR", "输入", "—", "5 家竞对按房量加权（见 03 号工作簿）"),
                    ("P", "渠道成本率", "输入", "默认 10.1%", "数据字典第三节自动加权结果"),
                    ("R", "昨日 Pickup", "输入", "净增预订房晚", "取自 02_Pickup 追踪表"),
                    ("F/H/I", "OCC/ADR/RevPAR", "公式", "=E/D ； =G/E ； =G/D", "SPEC 3.1"),
                    ("L", "竞争组合 RevPAR", "公式", "=J*K", "用于 RGI 分母"),
                    ("M", "MPI", "公式", "=F/J*100", "市场渗透指数"),
                    ("N", "ARI", "公式", "=H/K*100", "平均房价指数"),
                    ("O", "RGI", "公式", "=I/L*100", "等价于 MPI×ARI÷100"),
                    ("Q", "NRevPAR", "公式", "=I*(1-P)", "SPEC 3.1"),
                    ("S-U", "本月累计", "公式", "SUMIFS（EOMONTH 归月）", "自动按月累计"),
                    ("V-X", "预算", "公式", "INDEX(数据字典!月度参数,MONTH(A))", "SPEC 2.5"),
                    ("Y-AA", "达成率", "公式", "实际 ÷ 预算", "≥100% 达标（青绿）"),
                ],
                ["在「数据字典」页确认月度预算 OCC/ADR 与渠道成本率是否符合本店实际（默认取自 SPEC 2.5 / 2.3）。",
                 "在「日报」页黄底列逐日填入：日期、需求等级、可售房量、已售房晚、客房收入、竞争组合 OCC/ADR、渠道成本率、昨日 Pickup。",
                 "读白色列：先看 RevPAR 与达成率，再看 MPI / ARI / RGI 三维，判定当日是「份额问题」还是「价格问题」。",
                 "把 MPI 代入《法典》表 D、ARI 代入表 C、RGI 看综合，得出动作；动作写入 04 号《调价台账》。",
                 "每日 09:55 前完成台账登记（《法典》表 M）。"],
                ["表 C · 价格指数（ARI）判定表 —— ARI 列读出后直接查表 C 取动作。",
                 "表 D · 市场渗透指数（MPI）判定表 —— MPI 列读出后查表 D。",
                 "表 M · 每日收益操作流水线 —— 本表对应 07:30 与 07:50 两个节点。",
                 "表 O · 决策优先级 —— 表 D 优先级最低，多为分析而非动作；同日只执行优先级最高的一条。"],
                lede="收益管理第一张表：把昨天的经营结果和竞争位置，在一行里说清楚。")

    wb.save(path)
    return wb


# =============================================================== 02 Pickup 追踪
def build_02(path):
    wb = Workbook()
    ws_intro = wb.active
    ws_intro.title = "说明"
    ws_p = wb.create_sheet("Pickup追踪")
    ws_y = wb.create_sheet("去年同期对照")
    ws_f = wb.create_sheet("预测计算")

    NDAYS = 30
    TIERS = [60, 45, 30, 21, 14, 7, 3, 1, 0]
    TIER_LABEL = {60: "60 天档", 45: "45 天档", 30: "30 天档", 21: "21 天档", 14: "14 天档",
                  7: "7 天档", 3: "3 天档", 1: "1 天档", 0: "到达日"}
    WIN_LABEL = {60: "31–60 天窗口", 45: "31–60 天窗口", 30: "15–30 天窗口", 21: "15–30 天窗口",
                 14: "8–14 天窗口", 7: "4–7 天窗口", 3: "0–3 天窗口", 1: "0–3 天窗口", 0: "0–3 天窗口"}
    R0 = 4                       # 档位首行
    R_INC = R0 + len(TIERS) + 3  # 增量区首行（=16）

    def build_grid(wsx, fill_demo):
        set_widths(wsx, [12, 16] + [10] * NDAYS)
        wsx.sheet_view.showGridLines = False
        title(wsx, "Pickup 预订速度追踪矩阵（本年）" if fill_demo else "Pickup 预订速度追踪矩阵（去年同期 · 对照用）",
              "行＝提前天数档，列＝目标入住日，单元格＝该档时点的累计在手房晚。黄底为输入，白底为公式。",
              get_column_letter(2 + NDAYS))
        header_row(wsx, 3, 1, ["提前天数档", "《法典》表 I 窗口"] +
                   [f"D{i+1}" for i in range(NDAYS)], height=24)
        freeze(wsx, "C4")
        base = dt.date(2026, 3, 1)
        for j in range(NDAYS):
            d = base + dt.timedelta(days=j)
            put(wsx, f"{get_column_letter(3 + j)}3", d, "i", DATE, "center", wrap=True)
            wsx.row_dimensions[3].height = 30

        # 档位行
        for i, t in enumerate(TIERS):
            r = R0 + i
            put(wsx, f"A{r}", TIER_LABEL[t], "t")
            put(wsx, f"B{r}", WIN_LABEL[t], "r", None, "left")
            for j in range(NDAYS):
                col = get_column_letter(3 + j)
                if fill_demo:
                    val = demo_onhand(t, j)
                    put(wsx, f"{col}{r}", val, "i", INT)
                else:
                    put(wsx, f"{col}{r}", None, "i", INT)

        # 增量区
        rr = R_INC - 1
        put(wsx, f"A{rr}", "各档间 Pickup 增量（自动生成 · 白底勿改）", "s", None, "left", border=False)
        wsx[f"A{rr}"].font = Font(name=FONT, size=11, bold=True, color=NAVY)
        wsx.cell(row=rr, column=2).fill = fill(GOLD_SOFT)
        wsx.merge_cells(f"A{rr}:B{rr}")
        for i, t in enumerate(TIERS):
            r = R_INC + i
            put(wsx, f"A{r}", TIER_LABEL[t], "t")
            put(wsx, f"B{r}", WIN_LABEL[t], "r", None, "left")
            for j in range(NDAYS):
                col = get_column_letter(3 + j)
                if i == 0:
                    f = ""
                else:
                    f = f"=IFERROR({col}{R0 + i}-{col}{R0 + i - 1},\"\")"
                put(wsx, f"{col}{r}", f, "f", INT)
        cf_updown(wsx, f"C{R_INC}:{get_column_letter(2 + NDAYS)}{R_INC + len(TIERS) - 1}")
        return wsx

    def demo_onhand(tier, j):
        """演示在手房晚：越接近到达日在手越高。"""
        snap = 89 - j                      # 该目标日在快照日的提前天数
        f_final = build_factor(min(tier, snap))
        final = 320 * (0.70 + 0.14 * ((j % 7) in (4, 5)) + RNG.uniform(-0.06, 0.06))
        return max(0, int(round(final * f_final)))

    def build_factor(d):
        """预订累积曲线：d 天前已收到的最终预订占比。"""
        pts = [(0, 1.00), (1, 0.97), (3, 0.93), (7, 0.86), (14, 0.72), (21, 0.58),
               (30, 0.45), (45, 0.28), (60, 0.18), (90, 0.08)]
        if d <= 0:
            return 1.0
        if d >= 90:
            return 0.08
        for k in range(len(pts) - 1):
            d0, f0 = pts[k]
            d1, f1 = pts[k + 1]
            if d0 <= d <= d1:
                return f0 + (f1 - f0) * (d - d0) / (d1 - d0)
        return 0.08

    build_grid(ws_p, True)
    build_grid(ws_y, False)
    ws_y["A1"].value = "Pickup 预订速度追踪矩阵（去年同期 · 对照用）"
    for j in range(NDAYS):
        ws_p[f"{get_column_letter(3 + j)}3"].number_format = DATE

    # ---------------- 预测计算
    ws_f.sheet_view.showGridLines = False
    LASTF = "R"
    heads = ["目标日", "星期", "提前\n天数", "窗口分档\n(表I)", "当前在手\n房晚", "去年同窗口\n在手", "去年同期\n最终房晚",
             "Pickup\n偏差%", "预测最终\n房晚", "可售\n房晚", "预测\nOCC", "目标\nOCC", "差距\n(pp)",
             "监控频率", "落后触发\n阈值", "落后幅度\n%", "是否触发", "触发动作"]
    set_widths(ws_f, [11, 7, 8, 11, 11, 12, 12, 10, 11, 9, 9, 9, 9, 20, 11, 10, 10, 26])
    title(ws_f, "Pickup 预测计算（目标日维度）",
          "输入：当前在手、去年同窗口在手、去年同期最终房晚。输出：Pickup 偏差、预测 OCC，并按《法典》表 I 自动判窗口、比阈值、出动作。", LASTF)
    header_row(ws_f, 3, 1, heads, height=38)
    freeze(ws_f, "B4")

    # 表 I 参数块
    pr = 36
    put(ws_f, f"A{pr - 1}", "《法典》表 I · 预订窗口分档监控表（参考区，勿改）", "s", None, "left", border=False)
    ws_f[f"A{pr - 1}"].font = Font(name=FONT, size=11, bold=True, color=NAVY)
    header_row(ws_f, pr, 1, ["窗口分档", "监控频率", "落后触发阈值", "触发动作", "阈值数值"], height=24)
    for i, wt in enumerate(WINDOW_TABLE):
        wrow(ws_f, pr + 1 + i, 1, [(wt[0], "r"), (wt[1], "r", None, "left"), (wt[2], "r"),
                                   (wt[3], "r", None, "left"), (wt[4], "r", PCT1)])
    TI0, TI1 = pr + 1, pr + 6

    base = dt.date(2026, 3, 1)
    for j in range(NDAYS):
        r = 4 + j
        d = base + dt.timedelta(days=j)
        snap_ahead = 89 - j
        col = get_column_letter(3 + j)
        wrow(ws_f, r, 1, [
            (f"=IF(Pickup追踪!{col}3=\"\",\"\",Pickup追踪!{col}3)", "f", DATE),
            (f'=IF($A{r}="","",{WEEKDAY_CHOOSE.format(c="A", r=r)})', "f"),
            (snap_ahead, "i", INT),
            ("=" + window_bucket_expr(f"$C{r}"), "f"),
            (f"=IFERROR(Pickup追踪!{col}{R0 + len(TIERS) - 1},\"\")", "f", INT),
            (f'=IFERROR(去年同期对照!{col}{R0 + windex(TIERS, snap_ahead)},"")', "f", INT),
            (f'=IFERROR(去年同期对照!{col}{R0 + len(TIERS) - 1},"")', "f", INT),
            (f'=IFERROR(($E{r}-$F{r})/$F{r},"")', "f", PCT1),
            (f'=IFERROR($G{r}*(1+$H{r}),"")', "f", NUM1),
            (320, "i", INT),
            (f'=IFERROR($I{r}/$J{r},"")', "f", PCT1),
            (round(0.78 + 0.10 * ((j % 7) in (4, 5)), 3), "i", PCT1),
            (f'=IFERROR(($K{r}-$L{r})*100,"")', "f", NUM1),
            (f'=IFERROR(VLOOKUP($D{r},$A${TI0}:$E${TI1},2,FALSE),"")', "f", None, "left"),
            (f'=IFERROR(VLOOKUP($D{r},$A${TI0}:$E${TI1},3,FALSE),"")', "f", None, "left"),
            (f'=IFERROR(($F{r}-$E{r})/$F{r},"")', "f", PCT1),
            (f'=IF(OR($C{r}="",$F{r}=""),"",IF($D{r}="0-3天",IF($K{r}<0.7,"触发","未触发"),'
             f'IF($P{r}>VLOOKUP($D{r},$A${TI0}:$E${TI1},5,FALSE),"触发","未触发")))', "f"),
            (f'=IF($Q{r}="触发",VLOOKUP($D{r},$A${TI0}:$E${TI1},4,FALSE),"—")', "f", None, "left"),
        ])
    dv_num(ws_f, f"C4:C{3 + NDAYS}", 0, 400)
    dv_num(ws_f, f"J4:J{3 + NDAYS}", 1, 2000)
    dv_num(ws_f, f"L4:L{3 + NDAYS}", 0, 1)
    cf_updown(ws_f, f"H4:H{3 + NDAYS}")
    cf_rule(ws_f, f"Q4:Q{3 + NDAYS}", f'EXACT($Q4,"触发")', RED, RED_LIGHT)
    cf_rule(ws_f, f"Q4:Q{3 + NDAYS}", f'EXACT($Q4,"未触发")', TEAL, TEAL_LIGHT)
    cf_rule(ws_f, f"K4:K{3 + NDAYS}", "$K4>=$L4", TEAL, TEAL_LIGHT)
    cf_rule(ws_f, f"K4:K{3 + NDAYS}", "$K4<$L4-0.05", RED, RED_LIGHT)

    # ---------------- 说明
    write_intro(ws_intro, "02", "Pickup 预订速度追踪表",
                ["用于《法典》表 M 07:50 节点「抓取未来 30 天在手 + Pickup」，以及表 I 的窗口分档监控。",
                 "「Pickup追踪」页是核心矩阵：行＝提前天数档，列＝目标入住日，格子里填累计在手房晚。",
                 "「去年同期对照」页结构完全相同，填去年数据做基准（本模板留空，学员可用 data/03 数据集填写）。",
                 "「预测计算」页把在手与去年对照代入公式，自动算 Pickup 偏差、预测 OCC，并按表 I 判窗口、比阈值、出动作。"],
                [
                    ("第 3 行", "目标入住日", "输入", "—", "30 列，快照日之后的连续 30 天"),
                    ("A 列", "提前天数档", "参考", "60/45/30/21/14/7/3/1/0", "行维度＝预订窗口"),
                    ("C:AF", "累计在手房晚", "输入", "—", "该档时点上，该目标日已收到的累计房晚"),
                    ("增量区", "档间 Pickup 增量", "公式", "=本档 − 上一档", "负值＝净取消（绿色）"),
                    ("H", "Pickup 偏差%", "公式", "=(当前在手 − 去年同窗口在手) ÷ 去年同窗口在手", "正值＝领先（红色）"),
                    ("I", "预测最终房晚", "公式", "=去年同期最终房晚 × (1 + Pickup 偏差%)", "本模板采用「同比增速外推法」"),
                    ("K", "预测 OCC", "公式", "=预测最终房晚 ÷ 可售房晚", ""),
                    ("D", "窗口分档", "公式", "按提前天数嵌套 IF 判档", "《法典》表 I 六档"),
                    ("P", "落后幅度%", "公式", "=(去年同窗口在手 − 当前在手) ÷ 去年同窗口在手", "正值＝落后"),
                    ("Q", "是否触发", "公式", "0-3 档看 OCC<70%，其余档比阈值数值", ""),
                    ("R", "触发动作", "公式", "VLOOKUP 表 I 第 4 列", "触发即输出，未触发显示「—」"),
                ],
                ["在「Pickup追踪」页第 3 行填 30 个目标入住日（快照日之后连续 30 天）。",
                 "按当日实际，把每个目标日在各提前天数档上的累计在手房晚填入黄底格。",
                 "在「去年同期对照」页用同样的结构填入去年的对应数据（留空则预测计算会显示空白）。",
                 "打开「预测计算」页：目标日、当前在手会自动引用「Pickup追踪」页，无需手填。",
                 "读「是否触发」列：红色＝触发，须按「触发动作」列执行；执行后写入 04 号《调价台账》。"],
                ["表 I · 预订窗口分档监控表 —— 已内嵌在「预测计算」页第 36–42 行作为查找表。",
                 "表 A · 每日价格调整判定表 —— 预测 OCC 与 Pickup 偏差算出后，直接查表 A 得调价幅度。",
                 "表 M · 07:50 节点要求 20 分钟内完成本表更新。"],
                lede="Pickup 是唯一能提前看到未来的指标：今天的在手，就是 30 天后的结果。")

    wb.save(path)
    return wb


def windex(tiers, d):
    """给定提前天数，返回最接近的档位行下标（用于去年同期对照取数）。"""
    for i, t in enumerate(tiers):
        if d >= t:
            return i
    return len(tiers) - 1


# =============================================================== 03 竞争比价监测表
def build_03(path):
    wb = Workbook()
    ws_intro = wb.active
    ws_intro.title = "说明"
    ws_c = wb.create_sheet("竞对档案")
    ws_p = wb.create_sheet("每日比价")
    ws_d = wb.create_sheet("ARI诊断")
    wb.move_sheet("每日比价", offset=-1)

    # ---------------- 竞对档案（先建，供每日比价引用）
    ws_c.sheet_view.showGridLines = False
    set_widths(ws_c, [8, 22, 14, 10, 12, 12, 12, 34])
    title(ws_c, "竞争组合（Comp Set）档案 · 5 家",
          "SPEC 2.4。房量列会被「每日比价」页引用作为加权权重。灰底为 SPEC 固定参数。", "H")
    r = header_row(ws_c, 3, 1, ["代码", "竞对名称", "档次", "房量", "平峰 BAR", "距本店(km)", "房量权重", "备注"], height=30)
    C_F = r
    for i, cs in enumerate(COMPSET):
        wrow(ws_c, C_F + i, 1, [
            (cs[0], "r"), (cs[1], "r", None, "left"), (cs[2], "r"), (cs[3], "i", INT),
            (cs[4], "i", MONEY), (cs[5], "i", NUM1),
            (f"=IFERROR($D{C_F + i}/$D${C_F + 5},\"\")", "f", PCT1),
            ("平峰基准价", "r", None, "left"),
        ])
    C_E = C_F + 4
    wrow(ws_c, C_F + 5, 1, [("合计", "t"), ("5 家", "t"), ("—", "r"), (f"=SUM($D${C_F}:$D${C_E})", "f", INT),
                            (f"=IFERROR(SUMPRODUCT($D${C_F}:$D${C_E},$E${C_F}:$E${C_E})/$D${C_F + 5},\"\")", "f", MONEY2),
                            ("—", "r"), (f"=SUM($G${C_F}:$G${C_E})", "f", PCT1), ("加权平峰 BAR", "r", None, "left")])
    rr = C_F + 7
    put(ws_c, f"A{rr}", "校验", "s", None, "left")
    ws_c.merge_cells(f"A{rr}:B{rr}")
    put(ws_c, f"C{rr}", "SPEC 2.4 载明的竞争组合加权均价（平峰）", "r", None, "left")
    ws_c.merge_cells(f"C{rr}:E{rr}")
    put(ws_c, f"F{rr}", 680, "r", MONEY)
    put(ws_c, f"G{rr}", f"=IFERROR($F${C_F + 5}/$F{rr}-1,\"\")", "f", PCT1)
    ws_c.merge_cells(f"H{rr}:H{rr}")
    put(ws_c, f"H{rr}", "按房量加权算得 ¥691.7，与 SPEC 载明的 ¥680 差 +1.7%（SPEC 内部取整差异），教学时以房量加权口径为准",
        "n", None, "left", wrap=True)
    ws_c.row_dimensions[rr].height = 30
    freeze(ws_c, "A4")

    # ---------------- 每日比价
    ws_p.sheet_view.showGridLines = False
    heads = ["日期", "星期", "需求\n等级",
             "本店\nSTD", "本店\nSUP", "本店\nDLX", "本店\n加权BAR"]
    for cs in COMPSET:
        heads += [f"{cs[0]}\nSTD", f"{cs[0]}\nSUP", f"{cs[0]}\nDLX"]
    heads += ["竞争组合\n加权均价", "ARI\n(BAR口径)", "ARI\n环比", "本店昨日\nADR", "ARI\n(实绩口径)", "备注"]
    widths = [11, 7, 8, 9, 9, 9, 11] + [9] * 15 + [12, 11, 10, 11, 11, 26]
    set_widths(ws_p, widths)
    title(ws_p, "每日竞争比价监测表 · 本店 vs 5 家竞对",
          "黄底=输入（每日采集的 BAR）。白底=公式：组合加权均价按竞对房量加权，ARI = 本店加权 BAR ÷ 组合加权均价 × 100。",
          get_column_letter(len(heads)))
    header_row(ws_p, 3, 1, heads, height=40)
    freeze(ws_p, "D4")

    P0, P1 = 4, 33
    # 列映射
    COL_SHOP = 4     # D 本店 STD
    COL_COMP0 = 7    # G 开始，每家 3 列
    COMPN = 5
    COL_SET = COL_COMP0 + COMPN * 3            # V(22)
    COL_SHOPW = COL_SET + 1                    # W(23) 组合加权均价
    COL_ARI = COL_SET + 2                      # X(24)
    COL_ARID = COL_SET + 3                     # Y(25)
    COL_ADR = COL_SET + 4                      # Z(26)
    COL_ARIA = COL_SET + 5                     # AA(27)
    COL_NOTE = COL_SET + 6                     # AB(28)

    def L(n):
        return get_column_letter(n)

    base = dt.date(2026, 3, 1)
    shop_bar = {"D1": (1180, 1380, 1680), "D2": (880, 1030, 1250), "D3": (620, 730, 890), "D4": (450, 530, 650)}
    comp_base = [650, 690, 560, 880, 620]
    comp_ratio = [(0.86, 1.00, 1.22), (0.86, 1.00, 1.22), (0.85, 1.00, 1.24), (0.84, 1.00, 1.26), (0.87, 1.00, 1.20)]

    for i in range(P1 - P0 + 1):
        r = P0 + i
        d = base + dt.timedelta(days=i)
        wd = d.weekday()
        lvl = "D1" if i in (12, 13, 14) else ("D2" if wd in (4, 5) else ("D4" if i < 6 else "D3"))
        sb = shop_bar[lvl]
        cells = [
            (d, "i", DATE),
            (f'=IF($A{r}="","",{WEEKDAY_CHOOSE.format(c="A", r=r)})', "f"),
            (lvl, "i"),
        ]
        for k in range(3):
            cells.append((int(round(sb[k] * (1 + RNG.uniform(-0.02, 0.02)))), "i", MONEY))
        cells.append((f"=IFERROR(AVERAGE($D{r}:$F{r}),\"\")", "f", MONEY2))
        for ci in range(COMPN):
            mult = 1.0
            if lvl == "D1":
                mult = 1.35
            elif lvl == "D2":
                mult = 1.15
            elif lvl == "D4":
                mult = 0.82
            if ci == 3 and 18 <= i <= 21:      # 埋点：D 竞对恶意降价
                mult = 0.60
            for k in range(3):
                px = comp_base[ci] * comp_ratio[ci][k] * mult * (1 + RNG.uniform(-0.03, 0.03))
                cells.append((int(round(px / 10.0) * 10), "i", MONEY))
        # 组合加权均价
        terms = "+".join(
            f"({L(COL_COMP0 + ci * 3)}{r}+{L(COL_COMP0 + ci * 3 + 1)}{r}+{L(COL_COMP0 + ci * 3 + 2)}{r})*竞对档案!$D${C_F + ci}"
            for ci in range(COMPN))
        setf = f'=IFERROR(({terms})/(3*竞对档案!$D${C_F + 5}),"")'
        cells.append((setf, "f", MONEY2))
        cells.append((f'=IFERROR({L(COL_SHOP + 6)}{r}/{L(COL_SET)}{r}*100,"")', "f", IDX))
        cells.append((("" if i == 0 else
                       f'=IFERROR({L(COL_ARI)}{r}-{L(COL_ARI)}{r - 1},"")'), "f", NUM1))
        cells.append((int(round(sb[1] * (1 + RNG.uniform(-0.06, 0.06)))), "i", MONEY))
        cells.append((f'=IFERROR({L(COL_ADR)}{r}/{L(COL_SET)}{r}*100,"")', "f", IDX))
        cells.append(("D 竞对 3/18–3/21 恶意降价（埋点）" if 18 <= i <= 21 else None, "i", None, "left"))
        wrow(ws_p, r, 1, cells)

    dv_list(ws_p, f"C{P0}:C{P1}", DEMAND_LEVELS)
    dv_date(ws_p, f"A{P0}:A{P1}")
    cf_scale(ws_p, f"{L(COL_ARI)}{P0}:{L(COL_ARI)}{P1}", 97, 103, 90, 110)
    cf_scale(ws_p, f"{L(COL_ARIA)}{P0}:{L(COL_ARIA)}{P1}", 97, 103, 90, 110)
    cf_updown(ws_p, f"{L(COL_ARID)}{P0}:{L(COL_ARID)}{P1}")

    # ---------------- ARI 诊断
    ws_d.sheet_view.showGridLines = False
    set_widths(ws_d, [11, 9, 9, 9, 11, 12, 30, 11, 12, 26])
    title(ws_d, "ARI 诊断（《法典》表 C 自动查表）",
          "只需输入 ARI、MPI、预测 OCC 三个数，判定 / 动作 / 调整幅度全部自动输出。白底为公式，勿改。", "J")
    header_row(ws_d, 3, 1, ["日期", "ARI", "MPI", "RGI", "预测 OCC", "判定\n(表C)", "建议动作\n(表C)",
                            "调整幅度%", "是否执行", "备注"], height=38)
    freeze(ws_d, "B4")
    D0, D1 = 4, 33
    for i in range(D1 - D0 + 1):
        r = D0 + i
        ari = round(RNG.uniform(76, 126), 1)
        mpi = round(RNG.uniform(84, 116), 1)
        occ = round(RNG.uniform(0.42, 0.97), 3)
        wrow(ws_d, r, 1, [
            (base + dt.timedelta(days=i), "i", DATE),
            (ari, "i", NUM1),
            (mpi, "i", NUM1),
            (f'=IFERROR($B{r}*$C{r}/100,"")', "f", NUM1),
            (occ, "i", PCT1),
            (f'=IF($B{r}="","",IF($B{r}>120,"严重偏高",IF($B{r}>=110,"偏高",IF($B{r}>=103,"略高",'
             f'IF($B{r}>=97,"健康",IF($B{r}>=90,"略低",IF($B{r}>=80,"偏低","严重偏低")))))))', "f"),
            (f'=IF($B{r}="","",IF($B{r}>120,IF($C{r}<95,"降 8%（MPI<95）","维持并每日盯 Pickup"),'
             f'IF($B{r}>=110,IF($D{r}<100,"降 5%（RGI<100）","维持"),'
             f'IF($B{r}>=103,"维持，观察 Pickup",'
             f'IF($B{r}>=97,"维持",'
             f'IF($B{r}>=90,IF($E{r}>=0.8,"提 3%（预测 OCC≥80%）","维持"),'
             f'IF($B{r}>=80,"提 5%","提 8%，并核查房型配置与含早策略")))))))', "f", None, "left"),
            (f'=IF($B{r}="","",IF($B{r}>120,IF($C{r}<95,-0.08,0),IF($B{r}>=110,IF($D{r}<100,-0.05,0),'
             f'IF($B{r}>=103,0,IF($B{r}>=97,0,IF($B{r}>=90,IF($E{r}>=0.8,0.03,0),'
             f'IF($B{r}>=80,0.05,0.08)))))))', "f", PCT1),
            ("", "i"),
            (None, "i", None, "left"),
        ])
    dv_list(ws_d, f"I{D0}:I{D1}", ["执行", "记入观察清单", ""])
    dv_num(ws_d, f"E{D0}:E{D1}", 0, 1)
    dv_date(ws_d, f"A{D0}:A{D1}")
    cf_updown(ws_d, f"H{D0}:H{D1}")
    cf_scale(ws_d, f"B{D0}:B{D1}", 97, 103, 90, 110)
    for txt, col, bgc in [("严重偏高", RED, RED_LIGHT), ("严重偏低", RED, RED_LIGHT),
                          ("健康", TEAL, TEAL_LIGHT), ("偏高", AMBER, AMBER_LIGHT),
                          ("略高", AMBER, AMBER_LIGHT), ("略低", AMBER, AMBER_LIGHT),
                          ("偏低", AMBER, AMBER_LIGHT)]:
        cf_rule(ws_d, f"F{D0}:F{D1}", f'EXACT($F{D0},"{txt}")', col, bgc)

    # 表 C 参考块
    pr = D1 + 3
    put(ws_d, f"A{pr}", "《法典》表 C · 价格指数（ARI）判定表（参考区，勿改）", "s", None, "left", border=False)
    ws_d[f"A{pr}"].font = Font(name=FONT, size=11, bold=True, color=NAVY)
    header_row(ws_d, pr + 1, 1, ["ARI", "判定", "动作", "执行约束"], height=24)
    table_c = [
        (">120", "严重偏高", "MPI<95 → 降 8%；MPI≥95 → 维持并每日盯 Pickup", ""),
        ("110–120", "偏高", "RGI<100 → 降 5%；RGI≥100 → 维持", ""),
        ("103–110", "略高", "维持，观察 Pickup", ""),
        ("97–103", "健康", "维持", ""),
        ("90–97", "略低", "预测 OCC≥80% → 提 3%；否则维持", ""),
        ("80–90", "偏低", "提 5%", ""),
        ("<80", "严重偏低", "提 8%，并核查房型配置与含早策略", ""),
    ]
    for i, t in enumerate(table_c):
        wrow(ws_d, pr + 2 + i, 1, [(t[0], "r"), (t[1], "r"), (t[2], "r", None, "left"), (t[3], "r", None, "left")])
    wrow(ws_d, pr + 9, 1, [("执行约束", "t"),
                           ("① 每次调整不超过 8%，每周不超过 2 次", "r", None, "left"),
                           ("② 不得与表 A 结论叠加执行；同日只执行优先级更高的一条（表 A > 表 C）", "r", None, "left"),
                           ("③ 冲突时按《法典》表 O 仲裁", "r", None, "left"), (None, "r")])

    # ---------------- 说明
    write_intro(ws_intro, "03", "竞争比价监测表",
                ["用于《法典》表 M 08:10 节点「采集竞争组合 5 家价格」，以及表 C（ARI）、表 D（MPI）的每日诊断。",
                 "「每日比价」页按 STD / SUP / DLX 三个房型层级采集本店与 5 家竞对的 BAR，按房量加权算出竞争组合均价与 ARI。",
                 "「竞对档案」页是 5 家竞对的固定参数（SPEC 2.4），房量列作为加权权重被引用。",
                 "「ARI诊断」页输入 ARI / MPI / 预测 OCC，自动查表 C 输出判定、动作与调整幅度。"],
                [
                    ("A-C", "日期 / 星期 / 需求等级", "输入", "—", "需求等级按 SPEC 2.5 判 D1–D4"),
                    ("D-F", "本店 STD/SUP/DLX BAR", "输入", "—", "公开可订的最优可用房价"),
                    ("G", "本店加权 BAR", "公式", "=AVERAGE(D:F)", "三房型层级等权平均"),
                    ("H-V", "5 家竞对 × 3 房型 BAR", "输入", "—", "每日 08:10 采集"),
                    ("W", "竞争组合加权均价", "公式", "=Σ(竞对三房型价之和 × 竞对房量) ÷ (3 × 房量合计)", "按房量加权，非简单平均"),
                    ("X", "ARI（BAR 口径）", "公式", "=G ÷ W × 100", "SPEC 3.1"),
                    ("Y", "ARI 环比", "公式", "=本行 ARI − 上行 ARI", "涨红跌绿"),
                    ("AA", "ARI（实绩口径）", "公式", "=本店昨日 ADR ÷ W × 100", "用实际 ADR，与日报一致"),
                    ("B-E(诊断页)", "ARI / MPI / 预测 OCC", "输入", "—", "三个输入驱动整行输出"),
                    ("F-H(诊断页)", "判定 / 动作 / 调整幅度", "公式", "嵌套 IF 实现表 C 七档", "幅度正=提价(红)，负=降价(绿)"),
                ],
                ["在「竞对档案」页确认 5 家竞对的房量与平峰 BAR（默认取自 SPEC 2.4）。",
                 "每日 08:10 采集 5 家竞对 STD / SUP / DLX 的 BAR，填入「每日比价」页黄底区。",
                 "读 W 列组合加权均价与 X 列 ARI；把 ARI 抄到「ARI诊断」页 B 列，同时填 C 列 MPI 与 E 列预测 OCC。",
                 "读「建议动作」列，按《法典》表 O 与表 A 冲突时取优先级：表 A > 表 C。",
                 "动作写入 04 号《调价台账》，未执行的记入「观察清单」。"],
                ["表 C · 价格指数（ARI）判定表 —— 已内嵌在「ARI诊断」页底部作参考，并用嵌套 IF 实现自动查表。",
                 "表 D · 市场渗透指数（MPI）判定表 —— MPI 列读出后查表 D（在 01 号日报套用）。",
                 "表 O · 决策优先级 —— 表 C 优先级 4，低于表 A（3）与表 B（2），不得与表 A 叠加执行。",
                 "表 M · 08:10 节点要求 20 分钟内完成比价采集。"],
                lede="不知道竞对今天卖多少钱，就不知道自己该卖多少钱。")

    wb.save(path)
    return wb


# =============================================================== 04 调价台账
def build_04(path):
    wb = Workbook()
    ws_intro = wb.active
    ws_intro.title = "说明"
    ws = wb.create_sheet("台账")
    ws_h = wb.create_sheet("命中率复盘")
    ws_w = wb.create_sheet("观察清单")

    T0, T1 = 4, 63          # 60 行
    # ---------------- 台账
    ws.sheet_view.showGridLines = False
    heads = ["序号", "操作日期", "目标入住日", "提前\n天数", "动作类型", "调整前\n(元)", "调整后\n(元)", "变化\n幅度%",
             "触发判定表", "当时\nOCC预测", "当时Pickup\n偏差%", "执行人", "复核人", "执行时间",
             "30天后\n实际OCC", "30天后\n实际ADR", "复盘结论", "收益影响\n(元)"]
    widths = [6, 12, 12, 7, 10, 10, 10, 9, 11, 10, 12, 9, 9, 17, 10, 11, 10, 11]
    set_widths(ws, widths)
    title(ws, "调价台账 · 让每一个决策可追溯",
          "《法典》表 A 执行约束第 5 条：调价动作全部写入《调价台账》。黄底=输入，白底=公式。", "R")
    header_row(ws, 3, 1, heads, height=38)
    freeze(ws, "C4")

    base = dt.date(2026, 3, 2)
    demos = [
        ("调价", 680, 748, "表A", 0.91, 12.4, "张岚", "李默", "做对", 13600),
        ("调价", 748, 710, "表A", 0.66, -8.2, "张岚", "李默", "做错", -9200),
        ("MinLOS", 0, 2, "表B", 0.93, 6.0, "张岚", "李默", "做对", 6400),
        ("CTA", 0, 1, "表B", 0.96, 3.1, "王越", "李默", "中性", 0),
        ("关渠道", 0, 1, "表H", 0.88, 4.5, "王越", "李默", "做对", 4100),
        ("调价", 820, 860, "表C", 0.84, 1.2, "张岚", "李默", "做对", 5800),
        ("超售", 0, 6, "表E", 0.87, 2.0, "陈舸", "李默", "做对", 3900),
        ("升级", 0, 3, "表J", 0.79, -1.5, "陈舸", "李默", "中性", 0),
        ("关房", 0, 1, "表B", 0.98, 18.0, "王越", "李默", "做对", 7200),
        ("调价", 620, 560, "表L", 0.38, -42.0, "张岚", "李默", "做对", -3100),
    ]
    for i in range(T1 - T0 + 1):
        r = T0 + i
        if i < len(demos):
            dm = demos[i]
            atype, bf, af, tbl, occ, pk, ex, rv, concl, impact = dm
            opp = base + dt.timedelta(days=i)
            tgt = opp + dt.timedelta(days=RNG.randint(5, 45))
            tstr = dt.datetime(2026, 3, 2, 9, 20 + i, 0)
        else:
            atype, bf, af, tbl, occ, pk, ex, rv, concl, impact = (None,) * 10
            opp = tgt = tstr = None
        wrow(ws, r, 1, [
            (f'=IF($B{r}="","",ROW()-{T0 - 1})', "f", INT),
            (opp, "i", DATE),
            (tgt, "i", DATE),
            (f'=IFERROR($C{r}-$B{r},"")', "f", INT),
            (atype, "i"),
            (bf, "i", MONEY),
            (af, "i", MONEY),
            (f'=IF(OR($F{r}="",$G{r}="",$F{r}=0),"",IFERROR(($G{r}-$F{r})/$F{r},""))', "f", PCT1),
            (tbl, "i"),
            (occ, "i", PCT1),
            (pk, "i", NUM1),
            (ex, "i"),
            (rv, "i"),
            (tstr, "i", DT),
            (round(RNG.uniform(0.45, 0.97), 3) if i < len(demos) else None, "i", PCT1),
            (round(RNG.uniform(480, 780)) if i < len(demos) else None, "i", MONEY),
            (concl, "i"),
            (impact if i < len(demos) else None, "i", MONEY),
        ])

    dv_list(ws, f"E{T0}:E{T1}", ACTION_TYPES)
    dv_list(ws, f"I{T0}:I{T1}", TABLE_CODES)
    dv_list(ws, f"Q{T0}:Q{T1}", ["做对", "做错", "中性"])
    dv_date(ws, f"B{T0}:C{T1}")
    dv_num(ws, f"J{T0}:J{T1}", 0, 1)
    dv_num(ws, f"O{T0}:O{T1}", 0, 1)
    cf_updown(ws, f"H{T0}:H{T1}")
    cf_updown(ws, f"K{T0}:K{T1}")
    cf_updown(ws, f"R{T0}:R{T1}")
    cf_rule(ws, f"Q{T0}:Q{T1}", f'EXACT($Q{T0},"做对")', RED, RED_LIGHT)
    cf_rule(ws, f"Q{T0}:Q{T1}", f'EXACT($Q{T0},"做错")', GREEN, GREEN_LIGHT)
    cf_rule(ws, f"Q{T0}:Q{T1}", f'EXACT($Q{T0},"中性")', INK2, GREY_LIGHT)
    cf_rule(ws, f"D{T0}:D{T1}", f"AND($D{T0}<>\"\",$D{T0}<0)", RED, RED_LIGHT)

    # ---------------- 命中率复盘
    ws_h.sheet_view.showGridLines = False
    set_widths(ws_h, [10, 14, 12, 10, 10, 10, 11, 14, 14, 30])
    title(ws_h, "命中率复盘 · 判定表好不好用，用数字说话",
          "全部为公式，数据源＝「台账」页。命中率 = 复盘结论为「做对」的条数 ÷ 已复盘总条数。", "J")
    r = 4
    r = section(ws_h, r, "一、总览", "J")
    tot = [
        ("台账总条数", f'=COUNTA(台账!$B${T0}:$B${T1})', INT, "已登记的动作总数"),
        ("已复盘条数", f'=COUNTIFS(台账!$Q${T0}:$Q${T1},"做对")+COUNTIFS(台账!$Q${T0}:$Q${T1},"做错")+COUNTIFS(台账!$Q${T0}:$Q${T1},"中性")', INT, "复盘结论非空的条数"),
        ("「做对」条数", f'=COUNTIFS(台账!$Q${T0}:$Q${T1},"做对")', INT, ""),
        ("「做错」条数", f'=COUNTIFS(台账!$Q${T0}:$Q${T1},"做错")', INT, ""),
        ("「中性」条数", f'=COUNTIFS(台账!$Q${T0}:$Q${T1},"中性")', INT, ""),
        ("总命中率", "=$C$6/$C$5", PCT1, "= 「做对」条数 ÷ 已复盘总条数"),
        ("累计收益影响(元)", f'=SUM(台账!$R${T0}:$R${T1})', MONEY, "正=增收，负=减收"),
        ("平均单条收益影响(元)", "=IFERROR($C$10/$C$4,\"\")", MONEY, "= 累计收益影响 ÷ 台账总条数"),
    ]
    for label, f, fmt, note in tot:
        put(ws_h, f"A{r}", label, "t", None, "left")
        put(ws_h, f"B{r}", None, "t")
        ws_h.merge_cells(f"A{r}:B{r}")
        put(ws_h, f"C{r}", f, "f", fmt)
        put(ws_h, f"D{r}", note, "n", None, "left", border=False)
        ws_h.merge_cells(f"D{r}:J{r}")
        r += 1
    r += 1

    r = section(ws_h, r, "二、按《法典》判定表统计", "J")
    hdr = ["判定表", "调用次数", "已复盘", "做对", "做错", "中性", "命中率", "平均收益影响(元)", "累计收益影响(元)", "说明"]
    r = header_row(ws_h, r, 1, hdr, height=30)
    H0 = r
    table_note = {
        "表A": "每日价格调整（双因子矩阵：预测OCC × Pickup偏差）",
        "表B": "库存与限制条件配置（MinLOS/CTA/Stop Sell/超售）",
        "表C": "价格指数 ARI 判定（7 档）",
        "表D": "市场渗透指数 MPI 判定（多为分析而非动作）",
        "表E": "超额预订标准表",
        "表G": "团队/协议询价接受判定（置换分析）",
        "表H": "渠道开关判定表",
        "表L": "异常事件应急判定表（优先级最高）",
    }
    for i, tb in enumerate(TABLE_CODES):
        rr = H0 + i
        wrow(ws_h, rr, 1, [
            (tb, "r"),
            (f'=COUNTIFS(台账!$I${T0}:$I${T1},$A{rr})', "f", INT),
            (f'=COUNTIFS(台账!$I${T0}:$I${T1},$A{rr},台账!$Q${T0}:$Q${T1},"做对")'
             f'+COUNTIFS(台账!$I${T0}:$I${T1},$A{rr},台账!$Q${T0}:$Q${T1},"做错")'
             f'+COUNTIFS(台账!$I${T0}:$I${T1},$A{rr},台账!$Q${T0}:$Q${T1},"中性")', "f", INT),
            (f'=COUNTIFS(台账!$I${T0}:$I${T1},$A{rr},台账!$Q${T0}:$Q${T1},"做对")', "f", INT),
            (f'=COUNTIFS(台账!$I${T0}:$I${T1},$A{rr},台账!$Q${T0}:$Q${T1},"做错")', "f", INT),
            (f'=COUNTIFS(台账!$I${T0}:$I${T1},$A{rr},台账!$Q${T0}:$Q${T1},"中性")', "f", INT),
            (f'=IFERROR($D{rr}/$C{rr},"")', "f", PCT1),
            (f'=IFERROR(AVERAGEIFS(台账!$R${T0}:$R${T1},台账!$I${T0}:$I${T1},$A{rr},台账!$R${T0}:$R${T1},"<>"),"")', "f", MONEY),
            (f'=SUMIFS(台账!$R${T0}:$R${T1},台账!$I${T0}:$I${T1},$A{rr})', "f", MONEY),
            (table_note[tb], "r", None, "left"),
        ])
    rr = H0 + len(TABLE_CODES)
    wrow(ws_h, rr, 1, [("合计", "t"), (f"=SUM($B${H0}:$B${rr - 1})", "f", INT), (f"=SUM($C${H0}:$C${rr - 1})", "f", INT),
                       (f"=SUM($D${H0}:$D${rr - 1})", "f", INT), (f"=SUM($E${H0}:$E${rr - 1})", "f", INT),
                       (f"=SUM($F${H0}:$F${rr - 1})", "f", INT), (f'=IFERROR($D{rr}/$C{rr},"")', "f", PCT1),
                       ("—", "r"), (f"=SUM($I${H0}:$I${rr - 1})", "f", MONEY), ("—", "r")])
    r = rr + 2

    r = section(ws_h, r, "三、按动作类型统计", "J")
    r = header_row(ws_h, r, 1, ["动作类型", "调用次数", "已复盘", "做对", "命中率", "平均收益影响(元)", "累计收益影响(元)", "", "", ""], height=30)
    A0 = r
    for i, at in enumerate(ACTION_TYPES):
        rr = A0 + i
        wrow(ws_h, rr, 1, [
            (at, "r"),
            (f'=COUNTIFS(台账!$E${T0}:$E${T1},$A{rr})', "f", INT),
            (f'=COUNTIFS(台账!$E${T0}:$E${T1},$A{rr},台账!$Q${T0}:$Q${T1},"做对")'
             f'+COUNTIFS(台账!$E${T0}:$E${T1},$A{rr},台账!$Q${T0}:$Q${T1},"做错")'
             f'+COUNTIFS(台账!$E${T0}:$E${T1},$A{rr},台账!$Q${T0}:$Q${T1},"中性")', "f", INT),
            (f'=COUNTIFS(台账!$E${T0}:$E${T1},$A{rr},台账!$Q${T0}:$Q${T1},"做对")', "f", INT),
            (f'=IFERROR($D{rr}/$C{rr},"")', "f", PCT1),
            (f'=IFERROR(AVERAGEIFS(台账!$R${T0}:$R${T1},台账!$E${T0}:$E${T1},$A{rr},台账!$R${T0}:$R${T1},"<>"),"")', "f", MONEY),
            (f'=SUMIFS(台账!$R${T0}:$R${T1},台账!$E${T0}:$E${T1},$A{rr})', "f", MONEY),
            (None, "r"), (None, "r"), (None, "r"),
        ])
    r = A0 + len(ACTION_TYPES) + 1
    r = section(ws_h, r, "四、指标定义", "J")
    for line in [
        "调价命中率 = 复盘结论为「做对」的条数 ÷ 已复盘总条数（已复盘总条数 = 做对 + 做错 + 中性，不含未复盘条数）。",
        "复盘结论判定建议：调价后 30 天，若目标日实际 RevPAR ≥ 调价前预测 RevPAR 且未造成份额流失 → 「做对」；"
        "若实际 RevPAR < 预测且 MPI 下降 → 「做错」；其余 → 「中性」。",
        "收益影响(元) = 调价后 30 天该目标日实际客房收入 − 按调价前价格测算的客房收入（正=增收）。",
        "《法典》表 M 要求 09:55 前完成台账登记；表 N 要求每月 1 日做上月复盘。",
    ]:
        ws_h.merge_cells(f"A{r}:J{r}")
        put(ws_h, f"A{r}", line, "r", None, "left", wrap=True, border=False)
        ws_h.row_dimensions[r].height = 30
        r += 1

    cf_scale(ws_h, f"G{H0}:G{H0 + len(TABLE_CODES) - 1}", 0.7, 1.0, 0.5, 0.7)
    cf_updown(ws_h, f"I{H0}:I{H0 + len(TABLE_CODES) - 1}")

    # ---------------- 观察清单
    ws_w.sheet_view.showGridLines = False
    set_widths(ws_w, [6, 12, 26, 10, 24, 11, 11, 12, 10, 12, 28])
    title(ws_w, "观察清单 · 未执行但需盯防的动作",
          "《法典》表 O：同日只执行优先级最高的那一条动作，其余记录在《观察清单》。", "K")
    header_row(ws_w, 3, 1, ["序号", "日期", "事项", "来源表", "触发条件", "当前值", "阈值", "状态", "责任人", "下次复核日", "备注"], height=30)
    freeze(ws_w, "B4")
    W0, W1 = 4, 33
    obs = [
        ("ARI 连续 3 日 >110，但表 A 已给出提价动作", "表C", "ARI>110 连续 3 日", 112.4, 110, "观察中", "张岚", "日盯 Pickup"),
        ("MPI 92，OTA 曝光位下降", "表D", "MPI<95", 92.0, 95, "升为执行", "王越", "补 OTA 挂牌与点评分"),
        ("周末 DLX 房型在手落后 15%", "表B", "落后>15%", -15.2, -15, "观察中", "陈舸", "8-14 天窗口复查"),
        ("竞对 D 恶意降价，本店被动 ARI 升高", "表L", "竞对降价>15%", -18.0, -15, "观察中", "张岚", "不盲目跟价，做差异化"),
        ("会议团队询价 R=62%，未达接受线", "表G", "R<65%", 0.62, 0.65, "关闭", "李默", "已拒绝，加算综合贡献后再议"),
    ]
    for i in range(W1 - W0 + 1):
        r = W0 + i
        o = obs[i] if i < len(obs) else (None,) * 8
        wrow(ws_w, r, 1, [
            (f'=IF($B{r}="","",ROW()-{W0 - 1})', "f", INT),
            ((base + dt.timedelta(days=i)) if i < len(obs) else None, "i", DATE),
            (o[0] if i < len(obs) else None, "i", None, "left"),
            (o[1] if i < len(obs) else None, "i"),
            (o[2] if i < len(obs) else None, "i", None, "left"),
            (o[3] if i < len(obs) else None, "i", NUM1),
            (o[4] if i < len(obs) else None, "i", NUM1),
            (o[5] if i < len(obs) else None, "i"),
            (o[6] if i < len(obs) else None, "i"),
            (None, "i", DATE),
            (o[7] if i < len(obs) else None, "i", None, "left"),
        ])
    dv_list(ws_w, f"D{W0}:D{W1}", TABLE_CODES)
    dv_list(ws_w, f"H{W0}:H{W1}", ["观察中", "升为执行", "已关闭"])
    dv_date(ws_w, f"B{W0}:B{W1}")
    dv_date(ws_w, f"J{W0}:J{W1}")
    cf_rule(ws_w, f"H{W0}:H{W1}", f'EXACT($H{W0},"升为执行")', RED, RED_LIGHT)
    cf_rule(ws_w, f"H{W0}:H{W1}", f'EXACT($H{W0},"观察中")', AMBER, AMBER_LIGHT)
    cf_rule(ws_w, f"H{W0}:H{W1}", f'EXACT($H{W0},"已关闭")', TEAL, TEAL_LIGHT)

    # ---------------- 说明
    write_intro(ws_intro, "04", "调价台账",
                ["《法典》表 A 执行约束第 5 条与表 M 09:55 节点的强制产出物：所有调价与库存动作必须登记，形成可追溯的决策档案。",
                 "「台账」页逐条记录动作：谁、什么时候、依据哪张表、改了多少、30 天后结果如何。",
                 "「命中率复盘」页自动统计各判定表的调用次数、命中率与平均收益影响——这是衡量收益经理水平的核心指标。",
                 "「观察清单」页承接《法典》表 O：同日被更高优先级动作压掉的其余动作，全部落到这里盯防。"],
                [
                    ("B", "操作日期", "输入", "—", "动作在系统里落位的日期"),
                    ("C", "目标入住日", "输入", "—", "动作所作用的入住日"),
                    ("D", "提前天数", "公式", "=C−B", "负数＝目标日早于操作日，须立即核查"),
                    ("E", "动作类型", "输入", "调价/MinLOS/CTA/关房/关渠道/超售/升级", ""),
                    ("F-G", "调整前 / 调整后", "输入", "元", "非金额类动作（如 MinLOS）填限制值"),
                    ("H", "变化幅度%", "公式", "=(调整后−调整前)÷调整前", "涨红跌绿；低于 3% 不计为调价"),
                    ("I", "触发判定表", "输入", "表A/表B/表C/表D/表E/表G/表H/表L", ""),
                    ("J-K", "当时 OCC 预测 / Pickup 偏差", "输入", "%", "决策当时的证据，用于事后复盘"),
                    ("N", "执行时间", "输入", "yyyy-mm-dd hh:mm", "用于核查 24h 内同方向调价次数"),
                    ("O-P", "30 天后实际 OCC / ADR", "输入", "—", "复盘输入"),
                    ("Q", "复盘结论", "输入", "做对/做错/中性", "驱动命中率计算"),
                    ("R", "收益影响(元)", "输入", "元", "正=增收，负=减收"),
                    ("命中率", "总命中率", "公式", "= 做对条数 ÷ 已复盘总条数", "已复盘 = 做对+做错+中性"),
                ],
                ["每次执行动作后 10 分钟内，在「台账」页新增一行，填黄底列（白底列自动生成）。",
                 "目标日过后 30 天，回到该行补填 O/P 列实际 OCC 与 ADR，并给出 Q 列复盘结论与 R 列收益影响。",
                 "打开「命中率复盘」页，看总命中率与分表命中率；命中率长期 <60% 的表，说明阈值需要按本店实际重新校准。",
                 "被更高优先级动作压掉的动作，登记到「观察清单」页，指定责任人与下次复核日。",
                 "每月 1 日按《法典》表 N 做上月复盘，把结论写进 07 号《月报》。"],
                ["表 O · 决策优先级与冲突仲裁表 —— 优先级：表L > 表B > 表A > 表C > 表H > 表D；同日只执行最高优先级一条。",
                 "表 A 执行约束 —— 单日同方向累计 ≤20%；24h 内同方向 ≤2 次；单次 ≥3%；调价后 30 分钟内核查 OTA 挂牌；D1 日调价须 L3 审批。",
                 "表 M · 09:55 节点要求 10 分钟内完成台账登记。",
                 "表 N · 每月 1 日上月复盘。"],
                lede="没有台账的收益管理，只是在猜。",
                extra_sections=[("六、颜色规则（复盘结论）", [
                    "「做对」= 红底（涨价/增收方向，符合中国酒店业习惯）；「做错」= 绿底（跌/减收）；「中性」= 灰底。",
                    "变化幅度% 与收益影响列同样采用涨红/跌绿/持平灰，并请用 ↑↓ 箭头在备注中补充说明。"])])

    wb.save(path)
    return wb
