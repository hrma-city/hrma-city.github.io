# -*- coding: utf-8 -*-
"""
HRMA · 工作簿 05-08 生成器
05 房型价差与价格体系 / 06 年度预算与月度分解 / 07 周报月报模板 / 08 超额预订计算器
"""
import datetime as dt
import random

from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.formatting.rule import CellIsRule

from _common import *  # noqa
from _common import fill, put, row as wrow, header_row, set_widths, title, section, para, cf_rule

RNG = random.Random(20250903)

# 2027 需求日历（SPEC 2.5）
D1_2027 = set()
def _add_range(y, m, d0, d1):
    for d in range(d0, d1 + 1):
        D1_2027.add(dt.date(y, m, d))
_add_range(2027, 2, 8, 11)     # 春节初三–初六
_add_range(2027, 5, 1, 3)      # 五一 1–3
_add_range(2027, 10, 1, 5)     # 国庆 1–5
_add_range(2027, 4, 29, 30)    # 滨江动漫节
_add_range(2027, 10, 20, 22)   # 云栖大会
_add_range(2027, 11, 6, 7)     # 国际马拉松
_add_range(2027, 3, 18, 19)    # 春季展会
_add_range(2027, 9, 23, 24)    # 秋季论坛

POST_HOL_2027 = set()
_add_range_tmp = POST_HOL_2027


def _add_post(y, m, d0, d1):
    for d in range(d0, d1 + 1):
        POST_HOL_2027.add(dt.date(y, m, d))
_add_post(2027, 2, 12, 16)
_add_post(2027, 5, 4, 8)
_add_post(2027, 10, 6, 10)


def demand_2027(d):
    if d in D1_2027:
        return "D1"
    if d in POST_HOL_2027:
        return "D4"
    wd = d.weekday()
    if d.month == 1 or (d.month == 2 and d.day <= 7) or (d.month == 7 and d.day <= 15):
        return "D3" if wd in (4, 5) else "D4"
    if wd in (4, 5):
        return "D2" if d.month in (4, 5, 9, 10, 7, 8) else "D3"
    if d.month in (11, 12) and d.day >= 20:
        return "D4"
    return "D3"


COEF_BASE = {"D1": 1.75, "D2": 1.35, "D3": 1.02, "D4": 0.78}
COEF_LO = {"D1": 1.50, "D2": 1.20, "D3": 0.95, "D4": 0.70}
COEF_HI = {"D1": 2.00, "D2": 1.50, "D3": 1.10, "D4": 0.85}


def coef_2027(d, lvl):
    c = COEF_BASE[lvl] + (d.weekday() - 3) * 0.012
    if lvl == "D1" and d.month in (3, 9):
        c -= 0.12
    return round(min(max(c, COEF_LO[lvl]), COEF_HI[lvl]), 3)


# =============================================================== 05 房型价差与价格体系
def build_05(path):
    wb = Workbook()
    ws_intro = wb.active
    ws_intro.title = "说明"
    ws_l = wb.create_sheet("房型清单")
    ws_s = wb.create_sheet("价格阶梯")
    ws_c = wb.create_sheet("全年价格日历")
    ws_v = wb.create_sheet("价差校验")

    # ---------------- 房型清单
    ws_l.sheet_view.showGridLines = False
    set_widths(ws_l, [10, 16, 8, 10, 14, 12, 10, 10, 10, 14, 34])
    title(ws_l, "房型清单 · 杭州滨江云璟酒店（SPEC 2.1）",
          "灰底为 SPEC 2.1 固定参数；白底为公式。合计行自动校验总房量是否为 320 间。", "K")
    header_row(ws_l, 3, 1, ["房型代码", "房型名称", "间数", "面积(㎡)", "床型", "平峰 BAR",
                            "价差系数", "间数占比", "房型组", "加权 BAR 贡献", "备注"], height=34)
    freeze(ws_l, "C4")
    L0 = 4
    for i, rt in enumerate(ROOM_TYPES):
        r = L0 + i
        wrow(ws_l, r, 1, [
            (rt[0], "r"), (rt[1], "r", None, "left"), (rt[2], "i", INT), (rt[3], "i", NUM1),
            (rt[4], "r", None, "left"), (rt[5], "i", MONEY), (rt[6], "i", NUM1),
            (f'=IFERROR($C{r}/$C${L0 + 10},"")', "f", PCT1),
            (f'=LEFT($A{r},3)', "f"),
            (f'=IFERROR($F{r}*$H{r},"")', "f", MONEY2),
            ("无障碍连通房共 12 间，分布在 STD/SUP" if rt[0] in ("STD-K", "SUP-K") else None, "r", None, "left"),
        ])
    r = L0 + 10
    wrow(ws_l, r, 1, [
        ("合计", "t"), ("10 个房型", "t"), (f"=SUM($C${L0}:$C${L0 + 9})", "f", INT), (None, "r"),
        ("—", "r"), (f"=IFERROR(SUM($J${L0}:$J${L0 + 9}),\"\")", "f", MONEY2), ("—", "r"),
        (f"=SUM($H${L0}:$H${L0 + 9})", "f", PCT1), ("—", "r"), (None, "r"),
        (f'=IF($C{r}=320,"✓ 合计 320 间，与 SPEC 2.1 一致（含 12 间无障碍连通房）",'
         f'"✗ 合计 "&$C{r}&" 间，与 SPEC 2.1 的 320 间不符")', "f", None, "left"),
    ])
    cf_rule(ws_l, f"K{r}:K{r}", f'LEFT($K{r},1)="✓"', TEAL, TEAL_LIGHT)
    cf_rule(ws_l, f"K{r}:K{r}", f'LEFT($K{r},1)="✗"', RED, RED_LIGHT)
    put(ws_l, f"A{r + 2}", "注：加权 BAR 贡献合计 ¥726.9 元为「全部房型按平峰 BAR 售罄」的理论值，"
                           "高于实际 ADR ¥618，差额来自客源折扣与房型销售结构（升级/免费房）。",
        "n", None, "left", wrap=True, border=False)
    ws_l.merge_cells(f"A{r + 2}:K{r + 2}")
    ws_l.row_dimensions[r + 2].height = 30

    # ---------------- 价格阶梯
    ws_s.sheet_view.showGridLines = False
    set_widths(ws_s, [10, 16, 10, 12, 12, 12, 12, 13, 12, 14, 13, 12, 30])
    title(ws_s, "价格阶梯 · 由基准 BAR 自动生成全房型价格（SPEC 表 F）",
          "只改 B4 基准 BAR（高级房）与附加项参数，下方全部价格自动重算。附加项口径见 SPEC 2.1 / 表 F。", "M")
    r = 4
    put(ws_s, f"A{r}", "基准 BAR（高级房 SUP，系数 100）", "t", None, "left")
    put(ws_s, f"B{r}", 680, "i", MONEY)
    put(ws_s, f"C{r}", "元", "r")
    put(ws_s, f"D{r}", "SPEC 2.1：高级房平峰 BAR ¥680；SPEC 2.4：竞争组合加权均价 ¥680", "n", None, "left", border=False)
    ws_s.merge_cells(f"D{r}:M{r}")
    r += 2
    r = section(ws_s, r, "附加项参数（黄底可改）", "M")
    r = header_row(ws_s, r, 1, ["附加项", "数值", "单位", "说明", "", "", "", "", "", "", "", "", ""], height=22)
    ADD0 = r
    adds = [
        ("高楼层", 0.05, "比例", "同楼层、同朝向的高低层差价 +5%"),
        ("江景 / 特色景观", 0.10, "比例", "江景 vs 城景 +10%"),
        ("含早（元/人）", 68, "元", "自助早餐门市价 ¥128/人，打包价 +¥68/人"),
        ("加床（元/晚）", 180, "元", "含早"),
        ("连通房（元/间）", 50, "元", "表 F 附加项"),
        ("价格圆整到（元）", 10, "元", "所有价格按此步长取整"),
    ]
    for i, a in enumerate(adds):
        wrow(ws_s, ADD0 + i, 1, [(a[0], "r", None, "left"), (a[1], "i", PCT1 if a[0].startswith(("高", "江")) else NUM1),
                                 (a[2], "r"), (a[3], "r", None, "left")] + [(None, "r")] * 9)
    WS_S_B = "$B$4"
    W_HI, W_VIEW, W_BRK, W_BED, W_CON, W_RND = (f"$B${ADD0}", f"$B${ADD0+1}", f"$B${ADD0+2}",
                                                f"$B${ADD0+3}", f"$B${ADD0+4}", f"$B${ADD0+5}")
    r = ADD0 + len(adds) + 1
    r = section(ws_s, r, "价格阶梯表（白底公式，勿改）", "M")
    r = header_row(ws_s, r, 1, ["房型代码", "房型名称", "价差系数", "基础 BAR", "高楼层 +5%", "江景 +10%",
                                "含早 1 人", "含早 2 人", "加床 +180", "最高组合价", "相对高级房差价",
                                "差价%", "备注"], height=34)
    S0 = r
    SUP_ROW = S0 + 2           # SUP-K 行（高级房基准）
    for i in range(10):
        rr = S0 + i
        wrow(ws_s, rr, 1, [
            (f"=房型清单!$A${L0 + i}", "f"),
            (f"=房型清单!$B${L0 + i}", "f", None, "left"),
            (f"=房型清单!$G${L0 + i}", "f", NUM1),
            (f"=ROUND({WS_S_B}*$C{rr}/100/{W_RND},0)*{W_RND}", "f", MONEY),
            (f"=ROUND($D{rr}*(1+{W_HI})/{W_RND},0)*{W_RND}", "f", MONEY),
            (f"=ROUND($D{rr}*(1+{W_VIEW})/{W_RND},0)*{W_RND}", "f", MONEY),
            (f"=$D{rr}+{W_BRK}", "f", MONEY),
            (f"=$D{rr}+2*{W_BRK}", "f", MONEY),
            (f"=$D{rr}+{W_BED}", "f", MONEY),
            (f"=ROUND($D{rr}*(1+{W_HI})*(1+{W_VIEW})/{W_RND},0)*{W_RND}+2*{W_BRK}", "f", MONEY),
            (f"=$D{rr}-$D${SUP_ROW}", "f", MONEY),
            (f'=IFERROR(($D{rr}-$D${SUP_ROW})/$D${SUP_ROW},"")', "f", PCT1),
            (None, "r", None, "left"),
        ])
    for i, note in enumerate(["", "", "← 表 F 基准（系数 100）", "", "仅 DLX-V 等江景房实际适用",
                              "", "", "", "", "高楼层 + 江景 + 双早"]):
        if note:
            put(ws_s, f"M{S0 + i}", note, "n", None, "left", border=False)
    cf_updown(ws_s, f"L{S0}:L{S0 + 9}")
    cf_updown(ws_s, f"K{S0}:K{S0 + 9}")

    # ---------------- 全年价格日历
    ws_c.sheet_view.showGridLines = False
    heads = ["日期", "星期", "需求\n等级", "价格\n系数", "系数\n下限", "系数\n上限", "系数\n合规", "BAR"] + \
            [rt[0] for rt in ROOM_TYPES]
    set_widths(ws_c, [11, 7, 8, 9, 9, 9, 9, 10] + [9] * 10)
    title(ws_c, "全年价格日历 2027 · 365 天（需求等级 → 系数 → BAR → 各房型价）",
          "输入：C 列需求等级、D 列价格系数（已按 SPEC 2.5 分档预填默认值）。其余全部为公式。", "R")
    header_row(ws_c, 3, 1, heads, height=34)
    freeze(ws_c, "D4")
    C0 = 4
    C1 = C0 + 364
    put(ws_c, f"A{C0}", dt.date(2027, 1, 1), "i", DATE)
    for i in range(365):
        r = C0 + i
        d = dt.date(2027, 1, 1) + dt.timedelta(days=i)
        lvl = demand_2027(d)
        coef = coef_2027(d, lvl)
        cells = [
            (dt.date(2027, 1, 1) if i == 0 else f"=$A{r - 1}+1", "i" if i == 0 else "f", DATE),
            (f'=IF($A{r}="","",{WEEKDAY_CHOOSE.format(c="A", r=r)})', "f"),
            (lvl, "i"),
            (coef, "i", PCT1),
            (f'=IF($C{r}="","",IF($C{r}="D1",1.5,IF($C{r}="D2",1.2,IF($C{r}="D3",0.95,IF($C{r}="D4",0.7,"")))))', "f", PCT1),
            (f'=IF($C{r}="","",IF($C{r}="D1",2,IF($C{r}="D2",1.5,IF($C{r}="D3",1.1,IF($C{r}="D4",0.85,"")))))', "f", PCT1),
            (f'=IF(OR($D{r}="",$E{r}=""),"",IF(AND($D{r}>=$E{r},$D{r}<=$F{r}),"合规","超范围"))', "f"),
            (f'=IFERROR(ROUND(价格阶梯!{WS_S_B}*$D{r}/价格阶梯!{W_RND},0)*价格阶梯!{W_RND},"")', "f", MONEY),
        ]
        for k in range(10):
            cells.append((f'=IFERROR(ROUND($H{r}*价格阶梯!$C${S0 + k}/100/价格阶梯!{W_RND},0)*价格阶梯!{W_RND},"")', "f", MONEY))
        wrow(ws_c, r, 1, cells)
    dv_list(ws_c, f"C{C0}:C{C1}", DEMAND_LEVELS)
    dv_num(ws_c, f"D{C0}:D{C1}", 0.3, 3)
    cf_rule(ws_c, f"G{C0}:G{C1}", f'EXACT($G{C0},"超范围")', RED, RED_LIGHT)
    cf_rule(ws_c, f"G{C0}:G{C1}", f'EXACT($G{C0},"合规")', TEAL, TEAL_LIGHT)
    cf_rule(ws_c, f"C{C0}:C{C1}", f'EXACT($C{C0},"D1")', RED, RED_LIGHT)
    cf_rule(ws_c, f"C{C0}:C{C1}", f'EXACT($C{C0},"D4")', GREEN, GREEN_LIGHT)

    # ---------------- 价差校验
    ws_v.sheet_view.showGridLines = False
    set_widths(ws_v, [6, 14, 12, 14, 12, 10, 12, 34, 30])
    title(ws_v, "价差校验 ·《法典》表 F（每周一执行）",
          "全部为公式，数据源＝「价格阶梯」页基础价列。改动基准 BAR 或系数后，本页结论自动更新。", "I")
    r = 4
    r = section(ws_v, r, "一、相邻房型价差校验（<8% 拉开价差，>35% 收敛价差）", "I")
    r = header_row(ws_v, r, 1, ["序号", "下档房型", "下档价", "上档房型", "上档价", "价差%", "判定", "建议动作", "备注"], height=30)
    V0 = r
    # 表 F 阶梯：(下档行, 上档行, 备注)  行号相对 价格阶梯 S0
    pairs = [(0, 2, "STD → SUP"), (2, 3, "SUP → DLX"), (3, 4, "DLX → DLX-V"),
             (4, 6, "DLX-V → EXE"), (6, 8, "EXE → STE-B"), (8, 9, "STE-B → STE-E")]
    notes = {
        "DLX-V → EXE": "SPEC 表 F 中 DLX-V(140) 与 EXE(145) 仅差 3.6%，<8% → 判定为「价差过小」，须拉开",
        "STE-B → STE-E": "SPEC 表 F 中 STE-B(180) 与 STE-E(265) 差 47.2%，>35% → 判定为「价差过大」，须收敛",
        "EXE → STE-B": "商务套房相对行政房 +24.1%，处于 8%–35% 健康区间",
    }
    for i, (lo, hi, nm) in enumerate(pairs):
        rr = V0 + i
        wrow(ws_v, rr, 1, [
            (i + 1, "r", INT),
            (f"=价格阶梯!$A${S0 + lo}&\" \"&价格阶梯!$B${S0 + lo}", "f", None, "left"),
            (f"=价格阶梯!$D${S0 + lo}", "f", MONEY),
            (f"=价格阶梯!$A${S0 + hi}&\" \"&价格阶梯!$B${S0 + hi}", "f", None, "left"),
            (f"=价格阶梯!$D${S0 + hi}", "f", MONEY),
            (f'=IFERROR(($E{rr}-$C{rr})/$C{rr},"")', "f", PCT1),
            (f'=IF($F{rr}="","",IF($F{rr}<0.08,"价差过小",IF($F{rr}>0.35,"价差过大","健康")))', "f"),
            (f'=IF($F{rr}="","",IF($F{rr}<0.08,"拉开价差（降下一档或提上一档）",'
             f'IF($F{rr}>0.35,"收敛价差（提下一档）","维持")))', "f", None, "left"),
            (notes.get(nm), "r", None, "left", ),
        ])
    V1 = V0 + len(pairs) - 1
    cf_rule(ws_v, f"G{V0}:G{V1}", f'EXACT($G{V0},"健康")', TEAL, TEAL_LIGHT)
    cf_rule(ws_v, f"G{V0}:G{V1}", f'OR(EXACT($G{V0},"价差过小"),EXACT($G{V0},"价差过大"))', RED, RED_LIGHT)
    r = V1 + 2

    r = section(ws_v, r, "二、套房与最高房型价差校验（<60% 提套房价）", "I")
    r = header_row(ws_v, r, 1, ["序号", "套房", "套房价", "最高非套房房型", "该房型价", "价差%", "判定", "建议动作", "备注"], height=30)
    S0v = r
    suites = [(8, "STE-B 商务套房"), (9, "STE-E 行政套房")]
    for i, (si, nm) in enumerate(suites):
        rr = S0v + i
        wrow(ws_v, rr, 1, [
            (i + 1, "r", INT),
            (nm, "r", None, "left"),
            (f"=价格阶梯!$D${S0 + si}", "f", MONEY),
            ("EXE-K 行政大床房（非套房最高档）", "r", None, "left"),
            (f"=价格阶梯!$D${S0 + 6}", "f", MONEY),
            (f'=IFERROR(($C{rr}-$E{rr})/$E{rr},"")', "f", PCT1),
            (f'=IF($F{rr}="","",IF($F{rr}<0.6,"价差不足","达标"))', "f"),
            (f'=IF($F{rr}="","",IF($F{rr}<0.6,"提套房价","维持"))', "f", None, "left"),
            (("按 SPEC 表 F 阶梯，STE-B(180) 相对 EXE(145) 仅 +24.1%，会持续报「价差不足」；"
              "教学时说明：表 F 该条主要针对顶级套房（STE-E 265，+82.8% 达标），商务套房须结合升级路径与"
              "行政楼层权益综合判断，不宜机械执行。") if si == 8 else
             "STE-E(265) 相对 EXE(145) +82.8%，≥60%，达标。", "r", None, "left"),
        ])
        ws_v.row_dimensions[rr].height = 46
    cf_rule(ws_v, f"G{S0v}:G{S0v + 1}", f'EXACT($G{S0v},"达标")', TEAL, TEAL_LIGHT)
    cf_rule(ws_v, f"G{S0v}:G{S0v + 1}", f'EXACT($G{S0v},"价差不足")', RED, RED_LIGHT)
    r = S0v + 3

    r = section(ws_v, r, "三、《法典》表 F 校验规则（原文）", "I")
    for line in ["相邻房型价差 <8% → 拉开价差（降下一档或提上一档）",
                 "相邻房型价差 >35% → 收敛价差（提下一档）",
                 "套房与最高房型价差 <60% → 提套房价",
                 "附加项：高楼层 +5%；江景/特色景观 +10%；含早 +¥68/人；连通房 +¥50；加床 +¥180",
                 "执行频率：每周一（《法典》表 N）；结果写入 04 号《调价台账》"]:
        ws_v.merge_cells(f"A{r}:I{r}")
        put(ws_v, f"A{r}", line, "r", None, "left", border=False)
        r += 1

    # ---------------- 说明
    write_intro(ws_intro, "05", "房型价差与价格体系",
                ["对应《法典》表 F（房型价差阶梯表）与课程 M06《价格体系设计：BAR 与价差阶梯》。",
                 "「房型清单」页固化 SPEC 2.1 的 10 个房型，自动校验总房量 = 320 间。",
                 "「价格阶梯」页只输入一个基准 BAR（高级房），全房型价格与所有附加项自动算出。",
                 "「全年价格日历」页 365 天，逐日给出需求等级、价格系数、BAR 与 10 个房型的价格，是价格日历（Rate Grid）落位的底稿。",
                 "「价差校验」页自动执行表 F 的三条校验规则并标红报警。"],
                [
                    ("B4(阶梯)", "基准 BAR", "输入", "默认 680", "SPEC 2.1 高级房平峰 BAR"),
                    ("价格阶梯 6-11 行", "附加项参数", "输入", "5% / 10% / ¥68 / ¥180 / ¥50 / ¥10", "SPEC 2.1 附加价格规则 + 表 F 附加项"),
                    ("D(阶梯)", "基础 BAR", "公式", "=ROUND(基准×系数÷100÷圆整步长,0)×圆整步长", "表 F 价差系数"),
                    ("E-F(阶梯)", "高楼层 / 江景", "公式", "=ROUND(基础价×(1+比例)÷10,0)×10", ""),
                    ("G-H(阶梯)", "含早 1 人 / 2 人", "公式", "=基础价+68 ； =基础价+136", "¥68/人 × 人数"),
                    ("J(阶梯)", "最高组合价", "公式", "=ROUND(基础价×1.05×1.10÷10,0)×10+136", "高楼层+江景+双早"),
                    ("C(日历)", "需求等级", "输入", "D1/D2/D3/D4", "已按 2027 日历预填 SPEC 2.5 默认值"),
                    ("D(日历)", "价格系数", "输入", "已按等级分档预填", "D1 150–200%、D2 120–150%、D3 95–110%、D4 70–85%"),
                    ("E-G(日历)", "系数下限/上限/合规", "公式", "由等级自动带出并校验", "超范围标红"),
                    ("H-R(日历)", "BAR + 10 房型价", "公式", "=ROUND(基准×系数÷10,0)×10", ""),
                    ("F-G(校验)", "价差% / 判定", "公式", "相邻档位价差与表 F 三档规则", "过小/过大标红"),
                ],
                ["在「房型清单」页确认 10 个房型的间数与平峰 BAR（默认 SPEC 2.1），看合计行是否显示「✓ 合计 320 间」。",
                 "在「价格阶梯」页确认基准 BAR 与 6 个附加项参数；下方 10 个房型的基础价、附加价、差价自动生成。",
                 "在「全年价格日历」页逐日核对需求等级（C 列），必要时改价格系数（D 列）——超出该等级区间会标红。",
                 "打印「价差校验」页，红色行即为本周须处理的价差问题；动作写入 04 号《调价台账》，触发表选「表F」以外的实动作表。",
                 "每周一按《法典》表 N 重复执行一次。"],
                ["表 F · 房型价差阶梯表 —— 三条校验规则已用公式实现，并内嵌原文作参考。",
                 "表 A · 每日价格调整判定表 —— 系数调整属于调价动作，须满足「单次≥3%、单日同方向≤20%、24h 内≤2 次」。",
                 "表 J · 免费升级规则表 —— 相邻档位价差过小时，升级路径会失真，须先修价差。",
                 "表 N · 每周一执行房型价差校验。"],
                lede="价格体系不是一张价目表，是一把梯子：每一档都要踩得上去，也踩得出差别。")

    wb.save(path)
    return wb


# =============================================================== 06 年度预算与月度分解
def build_06(path):
    wb = Workbook()
    ws_intro = wb.active
    ws_intro.title = "说明"
    ws_a = wb.create_sheet("年度假设")
    ws_m = wb.create_sheet("月度预算")
    ws_d = wb.create_sheet("分日预算")
    ws_r = wb.create_sheet("滚动预测")
    ws_v = wb.create_sheet("差异分析")

    M0, M1 = 4, 15        # 月度预算数据行
    MTOT = 16             # 合计行
    D0 = 4                # 分日预算首行
    D1 = D0 + 364

    # ---------------- 年度假设
    ws_a.sheet_view.showGridLines = False
    set_widths(ws_a, [26, 18, 10, 56])
    title(ws_a, "年度假设 · 预算模型的唯一参数入口",
          "黄底=输入，白底=公式。改这里，月度/分日/滚动/差异四张表全部联动。校准开关说明见第三节。", "D")
    r = section(ws_a, 4, "一、基本信息", "D")
    r = header_row(ws_a, r, 1, ["项目", "数值", "单位", "说明"], height=22)
    rows_a = [
        ("酒店名称", "杭州滨江云璟酒店", "r", None, "SPEC 2.1 虚构原型"),
        ("总房量（间）", 320, "i", INT, "SPEC 2.1：320 间，含 12 间无障碍连通房"),
        ("预算年度", 2027, "i", INT, "2027 年为平年，共 365 天"),
        ("年度开始日", dt.date(2027, 1, 1), "i", DATE, "分日预算的首日"),
        ("年度结束日", "=DATE($B$8,12,31)", "f", DATE, "自动"),
        ("年天数", "=$B$10-$B$9+1", "f", INT, "2027 年 = 365 天"),
        ("年可售房晚", "=$B$7*$B$11", "f", INT, "320 × 365 = 116,800（与 SPEC 2.3 一致）"),
    ]
    for i, (k, v, kind, fmt, note) in enumerate(rows_a):
        wrow(ws_a, 6 + i, 1, [(k, "r", None, "left"), (v, kind, fmt), (None, "r"), (note, "r", None, "left")])
    r = 6 + len(rows_a) + 1

    r = section(ws_a, r, "二、SPEC 2.3 经营基线（校准目标）", "D")
    r = header_row(ws_a, r, 1, ["指标", "数值", "单位", "来源 / 口径"], height=22)
    base_rows = [
        ("目标 OCC", 0.72, "i", PCT1, "SPEC 2.3：年平均出租率 72.0%"),
        ("目标 ADR（元）", 618, "i", MONEY, "SPEC 2.3：年平均房价 ¥618"),
        ("目标 RevPAR（元）", "=$B$16*$B$17", "f", MONEY2, "= OCC × ADR；SPEC 2.3 载 ¥445"),
        ("客房收入目标（元）", 51977328, "i", MONEY, "SPEC 2.3：¥51,977,328"),
        ("餐饮收入目标（元）", 28600000, "i", MONEY, "SPEC 2.3：¥28,600,000"),
        ("其他收入目标（元）", 4100000, "i", MONEY, "SPEC 2.3：¥4,100,000"),
        ("总营收目标（元）", "=$B$19+$B$20+$B$21", "f", MONEY, "SPEC 2.3 载 ¥84,677,328"),
        ("GOP 率", 0.32, "i", PCT1, "SPEC 2.3：GOP 率 32.0%"),
        ("GOP 目标（元）", "=$B$22*$B$23", "f", MONEY, "SPEC 2.3 载 ¥27,098,741（按 32% 算得 27,096,745，差 0.007%）"),
        ("GOPPAR 目标（元）", "=$B$24/$B$12", "f", MONEY2, "SPEC 2.3 载 ¥232"),
    ]
    for i, (k, v, kind, fmt, note) in enumerate(base_rows):
        wrow(ws_a, 16 + i, 1, [(k, "r", None, "left"), (v, kind, fmt), (None, "r"), (note, "r", None, "left")])
    r = 16 + len(base_rows) + 1

    r = section(ws_a, r, "三、派生系数与校准开关", "D")
    r = header_row(ws_a, r, 1, ["系数", "数值", "单位", "口径 / 说明"], height=22)
    wrow(ws_a, 29, 1, [("餐饮收入系数", "r", None, "left"), ("=IFERROR($B$20/$B$19,\"\")", "f", "0.0000"),
                       (None, "r"),
                       ("= 餐饮收入目标 ÷ 客房收入目标 ≈ 0.5502；月度餐饮 = 客房收入 × 本系数", "r", None, "left")])
    wrow(ws_a, 30, 1, [("其他收入系数", "r", None, "left"), ("=IFERROR($B$21/$B$19,\"\")", "f", "0.0000"),
                       (None, "r"),
                       ("= 其他收入目标 ÷ 客房收入目标 ≈ 0.0789", "r", None, "left")])
    wrow(ws_a, 31, 1, [("校准开关", "r", None, "left"), ("启用", "i"), (None, "r"),
                       ("启用＝把自下而上结果按校准系数缩放到 SPEC 2.3 基线；不启用＝直接用月度 OCC/ADR 乘算结果",
                        "r", None, "left")])
    wrow(ws_a, 32, 1, [("校准系数", "r", None, "left"),
                       ("=IF($B$31=\"启用\",IFERROR($B$19/月度预算!$J$16,\"\"),1)", "f", "0.0000"), (None, "r"),
                       ("= 客房收入目标 ÷ 自下而上原始客房收入 ≈ 0.9472（偏差来源见下）", "r", None, "left")])
    wrow(ws_a, 33, 1, [("自下而上原始客房收入", "r", None, "left"), ("=月度预算!$J$16", "f", MONEY), (None, "r"),
                       ("由 SPEC 2.5 月度 OCC/ADR 直接乘算", "r", None, "left")])
    wrow(ws_a, 34, 1, [("自下而上原始 OCC", "r", None, "left"),
                       ("=IFERROR(月度预算!$I$16/月度预算!$E$16,\"\")", "f", PCT1), (None, "r"),
                       ("约 74.9%", "r", None, "left")])
    wrow(ws_a, 35, 1, [("自下而上原始 ADR", "r", None, "left"),
                       ("=IFERROR(月度预算!$J$16/月度预算!$I$16,\"\")", "f", MONEY2), (None, "r"),
                       ("约 ¥622", "r", None, "left")])
    wrow(ws_a, 36, 1, [("自下而上原始 RevPAR", "r", None, "left"),
                       ("=IFERROR(月度预算!$J$16/月度预算!$E$16,\"\")", "f", MONEY2), (None, "r"),
                       ("约 ¥469.7", "r", None, "left")])
    ws_a["B29"].number_format = "0.0000"
    ws_a["B30"].number_format = "0.0000"
    ws_a["B32"].number_format = "0.0000"
    dv_list(ws_a, "B31", ["启用", "不启用"])
    r = 38

    r = section(ws_a, r, "四、双轨校验（自下而上 vs SPEC 2.3 基线）", "D")
    r = header_row(ws_a, r, 1, ["指标", "SPEC 2.3 基线", "模型输出（校准后）", "偏差%"], height=22)
    checks = [
        ("OCC", "=$B$16", "=IFERROR(月度预算!$I$16/月度预算!$E$16,\"\")", PCT1),
        ("ADR（元）", "=$B$17", "=IFERROR(月度预算!$L$16/月度预算!$I$16,\"\")", MONEY2),
        ("RevPAR（元）", "=$B$18", "=IFERROR(月度预算!$L$16/月度预算!$E$16,\"\")", MONEY2),
        ("客房收入（元）", "=$B$19", "=月度预算!$L$16", MONEY),
        ("餐饮收入（元）", "=$B$20", "=月度预算!$M$16", MONEY),
        ("其他收入（元）", "=$B$21", "=月度预算!$N$16", MONEY),
        ("总营收（元）", "=$B$22", "=月度预算!$O$16", MONEY),
        ("GOP（元）", "=$B$24", "=月度预算!$P$16", MONEY),
        ("GOPPAR（元）", "=$B$25", "=IFERROR(月度预算!$P$16/月度预算!$E$16,\"\")", MONEY2),
        ("年可售房晚", "=$B$12", "=月度预算!$E$16", INT),
    ]
    C0a = r
    for i, (k, spec_v, model_v, fmt) in enumerate(checks):
        rr = C0a + i
        wrow(ws_a, rr, 1, [(k, "r", None, "left"), (spec_v, "f", fmt), (model_v, "f", fmt),
                           (f'=IFERROR($C{rr}/$B{rr}-1,"")', "f", PCT1)])
    for i, (k, spec_v, model_v, fmt) in enumerate(checks):
        ws_a[f"B{C0a + i}"].number_format = fmt
        ws_a[f"C{C0a + i}"].number_format = fmt
    cf_updown(ws_a, f"D{C0a}:D{C0a + len(checks) - 1}")
    r = C0a + len(checks) + 1
    ws_a.merge_cells(f"A{r}:D{r}")
    put(ws_a, f"A{r}", "⚠ 口径说明：SPEC 2.5 的月度 OCC/ADR 是「目标/预算」口径，加权后 OCC≈74.9%、ADR≈¥622、"
                       "客房收入≈¥54,871,488，比 SPEC 2.3 的实绩基线（OCC 72.0%、ADR ¥618、客房收入 ¥51,977,328）高约 5.6%。"
                       "本模型用「校准开关」处理这一差异：启用＝对齐 SPEC 2.3 基线（默认），不启用＝保留自下而上结果。",
        "n", None, "left", wrap=True, border=False)
    ws_a.row_dimensions[r].height = 56

    # ---------------- 月度预算
    ws_m.sheet_view.showGridLines = False
    heads = ["月份", "月份起始日", "天数", "可售房晚", "目标 OCC", "目标 ADR", "RevPAR\n(原始)", "已售房晚",
             "客房收入\n(原始)", "校准系数", "客房收入\n(校准后)", "餐饮收入", "其他收入", "总营收", "GOP",
             "GOPPAR", "校准后\nADR", "校准后\nRevPAR"]
    set_widths(ws_m, [7, 13, 7, 11, 10, 10, 11, 11, 12, 10, 12, 12, 11, 13, 13, 10, 10, 11])
    title(ws_m, "月度预算 · 2027（SPEC 2.5 月度 OCC / ADR）",
          "输入：B 列起始日、E 列 OCC、F 列 ADR。其余全部为公式。合计行自动汇总并与 SPEC 2.3 对齐。", "R")
    header_row(ws_m, 3, 1, heads, height=40)
    freeze(ws_m, "B4")
    for i in range(12):
        r = M0 + i
        wrow(ws_m, r, 1, [
            (i + 1, "r", INT),
            (dt.date(2027, i + 1, 1), "i", DATE),
            (f"=EOMONTH($B{r},0)-$B{r}+1", "f", INT),
            (f"=$C{r}*年度假设!$B$7", "f", INT),
            (SPEC_MONTH_OCC[i], "i", PCT1),
            (SPEC_MONTH_ADR[i], "i", MONEY),
            (f"=$E{r}*$F{r}", "f", MONEY2),
            (f"=$D{r}*$E{r}", "f", NUM1),
            (f"=$H{r}*$F{r}", "f", MONEY),
            ("=年度假设!$B$32", "f", "0.0000"),
            (f"=$I{r}*$J{r}", "f", MONEY),
            (f"=$K{r}*年度假设!$B$29", "f", MONEY),
            (f"=$K{r}*年度假设!$B$30", "f", MONEY),
            (f"=$K{r}+$L{r}+$M{r}", "f", MONEY),
            (f"=$N{r}*年度假设!$B$23", "f", MONEY),
            (f"=IFERROR($O{r}/$D{r},\"\")", "f", MONEY2),
            (f"=IFERROR($K{r}/$H{r},\"\")", "f", MONEY2),
            (f"=IFERROR($K{r}/$D{r},\"\")", "f", MONEY2),
        ])
    wrow(ws_m, MTOT, 1, [
        ("合计", "t"), ("—", "r"),
        (f"=SUM($C${M0}:$C${M1})", "f", INT),
        (f"=SUM($D${M0}:$D${M1})", "f", INT),
        (f"=IFERROR($H${MTOT}/$D${MTOT},\"\")", "f", PCT1),
        (f"=IFERROR($K${MTOT}/$H${MTOT},\"\")", "f", MONEY2),
        (f"=IFERROR($K${MTOT}/$D${MTOT},\"\")", "f", MONEY2),
        (f"=SUM($H${M0}:$H${M1})", "f", NUM1),
        (f"=SUM($I${M0}:$I${M1})", "f", MONEY),
        ("—", "r"),
        (f"=SUM($K${M0}:$K${M1})", "f", MONEY),
        (f"=SUM($L${M0}:$L${M1})", "f", MONEY),
        (f"=SUM($M${M0}:$M${M1})", "f", MONEY),
        (f"=SUM($N${M0}:$N${M1})", "f", MONEY),
        (f"=SUM($O${M0}:$O${M1})", "f", MONEY),
        (f"=IFERROR($O${MTOT}/$D${MTOT},\"\")", "f", MONEY2),
        (f"=IFERROR($K${MTOT}/$H${MTOT},\"\")", "f", MONEY2),
        (f"=IFERROR($K${MTOT}/$D${MTOT},\"\")", "f", MONEY2),
    ])
    for col in "DEFGHIJKLMNOPQR":
        ws_m[f"{col}{MTOT}"].fill = fill(GOLD_SOFT)
        ws_m[f"{col}{MTOT}"].font = Font(name=FONT, size=10, bold=True, color=NAVY)
    dv_date(ws_m, f"B{M0}:B{M1}")
    dv_num(ws_m, f"E{M0}:E{M1}", 0, 1)
    cf_scale(ws_m, f"R{M0}:R{M1}", 400, 520, 300, 400)

    # ---------------- 分日预算
    ws_d.sheet_view.showGridLines = False
    set_widths(ws_d, [11, 7, 9, 11, 9, 11, 9, 9, 10, 10, 9, 11, 10, 11])
    title(ws_d, "分日预算 · 365 天（按星期权重把月度 OCC 拆到日）",
          "输入：右侧「星期权重」参数（黄底）。日 OCC = 月 OCC × 当日权重 × 月天数 ÷ 月权重和，保证月内加权平均回月度目标。", "N")
    header_row(ws_d, 3, 1, ["日期", "星期", "星期权重", "月度目标\nOCC", "月度\n天数", "月度\n权重和",
                            "日 OCC", "可售房晚", "已售房晚", "月度目标\nADR", "日 ADR",
                            "客房收入\n(原始)", "校准系数", "客房收入\n(校准后)"], height=40)
    freeze(ws_d, "B4")

    # 星期权重参数块 P:R
    header_row(ws_d, 3, 16, ["星期", "权重", "说明"], height=22)
    wd_weights = [0.88, 0.93, 0.96, 1.00, 1.12, 1.22, 1.04]
    wd_note = ["商务日，需求偏低", "商务日", "商务日", "商务日", "周末前夜，需求抬升", "周末峰值", "返程日，高于平日"]
    for i in range(7):
        wrow(ws_d, 4 + i, 16, [(f"周{['一','二','三','四','五','六','日'][i]}", "r"), (wd_weights[i], "i", NUM1),
                               (wd_note[i], "r", None, "left")])
    # 月度汇总块 T:V
    header_row(ws_d, 3, 20, ["月份", "天数", "权重和"], height=22)
    for m in range(12):
        rr = 4 + m
        wrow(ws_d, rr, 20, [
            (m + 1, "r", INT),
            (f"=SUMPRODUCT((MONTH($A${D0}:$A${D1})=$T{rr})*1)", "f", INT),
            (f"=SUMPRODUCT((MONTH($A${D0}:$A${D1})=$T{rr})*$C${D0}:$C${D1})", "f", NUM1),
        ])

    for i in range(365):
        r = D0 + i
        wrow(ws_d, r, 1, [
            (dt.date(2027, 1, 1) if i == 0 else f"=$A{r - 1}+1", "i" if i == 0 else "f", DATE),
            (f'=IF($A{r}="","",{WEEKDAY_CHOOSE.format(c="A", r=r)})', "f"),
            (f"=IFERROR(INDEX($Q$4:$Q$10,WEEKDAY($A{r},2)),\"\")", "f", NUM1),
            (f"=IFERROR(INDEX(月度预算!$E${M0}:$E${M1},MONTH($A{r})),\"\")", "f", PCT1),
            (f"=IFERROR(INDEX($U$4:$U$15,MONTH($A{r})),\"\")", "f", INT),
            (f"=IFERROR(INDEX($V$4:$V$15,MONTH($A{r})),\"\")", "f", NUM1),
            (f'=IFERROR($D{r}*$C{r}*$E{r}/$F{r},"")', "f", PCT1),
            ("=年度假设!$B$7", "f", INT),
            (f"=$H{r}*$G{r}", "f", NUM1),
            (f"=IFERROR(INDEX(月度预算!$F${M0}:$F${M1},MONTH($A{r})),\"\")", "f", MONEY),
            (f"=$J{r}", "f", MONEY),
            (f"=$I{r}*$K{r}", "f", MONEY),
            ("=年度假设!$B$32", "f", "0.0000"),
            (f"=$L{r}*$M{r}", "f", MONEY),
        ])
    cf_scale(ws_d, f"G{D0}:G{D1}", 0.55, 0.98, 0.40, 0.55)

    # 月度校验块 X:AA
    header_row(ws_d, 3, 24, ["月份", "分日加权 OCC", "月度预算 OCC", "差异(pp)"], height=22)
    for m in range(12):
        rr = 4 + m
        wrow(ws_d, rr, 24, [
            (m + 1, "r", INT),
            (f"=IFERROR(SUMPRODUCT((MONTH($A${D0}:$A${D1})=$X{rr})*$I${D0}:$I${D1})"
             f"/SUMPRODUCT((MONTH($A${D0}:$A${D1})=$X{rr})*$H${D0}:$H${D1}),\"\")", "f", PCT1),
            (f"=IFERROR(INDEX(月度预算!$E${M0}:$E${M1},$X{rr}),\"\")", "f", PCT1),
            (f"=IFERROR(($Y{rr}-$Z{rr})*100,\"\")", "f", "0.00"),
        ])
    cf_rule(ws_d, f"AA4:AA15", "ABS($AA4)>0.01", RED, RED_LIGHT)
    cf_rule(ws_d, f"AA4:AA15", "ABS($AA4)<=0.01", TEAL, TEAL_LIGHT)

    # ---------------- 滚动预测
    ws_r.sheet_view.showGridLines = False
    set_widths(ws_r, [8, 13, 10, 11, 11, 11, 11, 11, 13, 13, 12, 14])
    title(ws_r, "滚动预测 · 未来 12 个月",
          "输入：起始月份、每月状态与 OCC/ADR（已过月份填实际，未来月份填预测）。其余全部为公式。", "L")
    r = 4
    wrow(ws_r, r, 1, [("滚动起始月份", "r", None, "left"), (dt.date(2027, 1, 1), "i", DATE),
                      ("未来 12 个月的第一天；改这里整表重排", "n", None, "left")] + [(None, "r")] * 9)
    ws_r.merge_cells(f"C{r}:L{r}")
    r += 1
    r = section(ws_r, r, "未来 12 个月滚动预测", "L")
    r = header_row(ws_r, r, 1, ["月份", "月份起始日", "状态", "OCC\n实际/预测", "ADR\n实际/预测", "RevPAR",
                                "天数", "可售房晚", "已售房晚", "客房收入", "餐饮收入", "总营收"], height=38)
    R0 = r
    for i in range(12):
        rr = R0 + i
        wrow(ws_r, rr, 1, [
            (i + 1, "r", INT),
            (f"=$B$4" if i == 0 else f"=EOMONTH($B{rr - 1},0)+1", "f", DATE),
            ("已过" if i < 3 else "预测", "i"),
            (round(0.70 + 0.06 * ((i % 5) - 2) / 2 + RNG.uniform(-0.02, 0.02), 3), "i", PCT1),
            (round(600 + 40 * ((i % 4) - 1.5) + RNG.uniform(-15, 15)), "i", MONEY),
            (f"=$D{rr}*$E{rr}", "f", MONEY2),
            (f"=EOMONTH($B{rr},0)-$B{rr}+1", "f", INT),
            (f"=$G{rr}*年度假设!$B$7", "f", INT),
            (f"=$H{rr}*$D{rr}", "f", NUM1),
            (f"=$I{rr}*$E{rr}", "f", MONEY),
            (f"=$J{rr}*年度假设!$B$29", "f", MONEY),
            (f"=$J{rr}+$K{rr}+$J{rr}*年度假设!$B$30", "f", MONEY),
        ])
    RT = R0 + 12
    wrow(ws_r, RT, 1, [("滚动 12 个月合计", "t"), ("—", "r"), ("—", "r"),
                       (f"=IFERROR($I${RT}/$H${RT},\"\")", "f", PCT1),
                       (f"=IFERROR($J${RT}/$I${RT},\"\")", "f", MONEY2),
                       (f"=IFERROR($J${RT}/$H${RT},\"\")", "f", MONEY2),
                       (f"=SUM($G${R0}:$G${R0 + 11})", "f", INT),
                       (f"=SUM($H${R0}:$H${R0 + 11})", "f", INT),
                       (f"=SUM($I${R0}:$I${R0 + 11})", "f", NUM1),
                       (f"=SUM($J${R0}:$J${R0 + 11})", "f", MONEY),
                       (f"=SUM($K${R0}:$K${R0 + 11})", "f", MONEY),
                       (f"=SUM($L${R0}:$L${R0 + 11})", "f", MONEY)])
    for col in "BCDEFGHIJKL":
        ws_r[f"{col}{RT}"].fill = fill(GOLD_SOFT)
        ws_r[f"{col}{RT}"].font = Font(name=FONT, size=10, bold=True, color=NAVY)
    dv_list(ws_r, f"C{R0}:C{R0 + 11}", ["已过", "预测"])
    dv_date(ws_r, "B4")
    dv_num(ws_r, f"D{R0}:D{R0 + 11}", 0, 1)
    cf_scale(ws_r, f"F{R0}:F{R0 + 11}", 420, 520, 350, 420)

    # ---------------- 差异分析
    ws_v.sheet_view.showGridLines = False
    set_widths(ws_v, [7, 12, 12, 11, 11, 11, 10, 13, 13, 13, 13, 13, 12, 30])
    title(ws_v, "差异分析 · 量差 / 价差分解",
          "量差 =（实际房晚 − 预算房晚）× 预算 ADR；价差 =（实际 ADR − 预算 ADR）× 实际房晚。输入实际值即可。", "N")
    r = 4
    r = section(ws_v, r, "月度差异分解", "N")
    r = header_row(ws_v, r, 1, ["月份", "预算房晚", "实际房晚", "房晚差异", "预算 ADR", "实际 ADR", "ADR 差异",
                                "量差(元)", "价差(元)", "总差异(元)", "预算客房收入", "实际客房收入",
                                "校验差异(元)", "结论"], height=38)
    V0 = r
    for i in range(12):
        rr = V0 + i
        wrow(ws_v, rr, 1, [
            (i + 1, "r", INT),
            (f"=IFERROR(INDEX(月度预算!$H${M0}:$H${M1},$A{rr}),\"\")", "f", NUM1),
            (None, "i", NUM1),
            (f"=IFERROR($C{rr}-$B{rr},\"\")", "f", NUM1),
            (f"=IFERROR(INDEX(月度预算!$F${M0}:$F${M1},$A{rr}),\"\")", "f", MONEY),
            (None, "i", MONEY),
            (f"=IFERROR($F{rr}-$E{rr},\"\")", "f", MONEY2),
            (f"=IFERROR(($C{rr}-$B{rr})*$E{rr},\"\")", "f", MONEY),
            (f"=IFERROR(($F{rr}-$E{rr})*$C{rr},\"\")", "f", MONEY),
            (f"=IFERROR($H{rr}+$I{rr},\"\")", "f", MONEY),
            (f"=IFERROR(INDEX(月度预算!$K${M0}:$K${M1},$A{rr}),\"\")", "f", MONEY),
            (f"=IFERROR($C{rr}*$F{rr},\"\")", "f", MONEY),
            (f"=IFERROR($L{rr}-$K{rr}-$J{rr},\"\")", "f", MONEY2),
            (f'=IF(OR($C{rr}="",$F{rr}=""),"待填实际值",IF(ABS($M{rr})<1,'
             f'"✓ 量差+价差 与 收入差 一致",'
             f'"✗ 差异 "&TEXT($M{rr},"#,##0")&" 元，检查输入"))', "f", None, "left"),
        ])
    VT = V0 + 12
    wrow(ws_v, VT, 1, [("合计", "t"), (f"=SUM($B${V0}:$B${V0 + 11})", "f", NUM1), (f"=SUM($C${V0}:$C${V0 + 11})", "f", NUM1),
                       (f"=SUM($D${V0}:$D${V0 + 11})", "f", NUM1), ("—", "r"), ("—", "r"), ("—", "r"),
                       (f"=SUM($H${V0}:$H${V0 + 11})", "f", MONEY), (f"=SUM($I${V0}:$I${V0 + 11})", "f", MONEY),
                       (f"=SUM($J${V0}:$J${V0 + 11})", "f", MONEY), (f"=SUM($K${V0}:$K${V0 + 11})", "f", MONEY),
                       (f"=SUM($L${V0}:$L${V0 + 11})", "f", MONEY), (f"=SUM($M${V0}:$M${V0 + 11})", "f", MONEY2),
                       ("—", "r")])
    for col in "BCDEFGHIJKLMN":
        ws_v[f"{col}{VT}"].fill = fill(GOLD_SOFT)
        ws_v[f"{col}{VT}"].font = Font(name=FONT, size=10, bold=True, color=NAVY)
    cf_updown(ws_v, f"H{V0}:H{VT}")
    cf_updown(ws_v, f"I{V0}:I{VT}")
    cf_updown(ws_v, f"J{V0}:J{VT}")
    cf_rule(ws_v, f"N{V0}:N{VT}", f'LEFT($N{V0},1)="✗"', RED, RED_LIGHT)
    cf_rule(ws_v, f"N{V0}:N{VT}", f'LEFT($N{V0},1)="✓"', TEAL, TEAL_LIGHT)
    r = VT + 2
    r = section(ws_v, r, "分解口径", "N")
    for line in ["量差（Volume Variance）=（实际房晚 − 预算房晚）× 预算 ADR —— 卖多卖少带来的差异",
                 "价差（Rate Variance）=（实际 ADR − 预算 ADR）× 实际房晚 —— 卖贵卖便宜带来的差异",
                 "总差异 = 量差 + 价差，应等于「实际客房收入 − 预算客房收入」（M 列校验，绝对值 <1 元即通过）",
                 "若量差为正、价差为负：说明靠降价换量，须判断 NRevPAR 是否同步改善",
                 "若量差为负、价差为正：说明提价成功但丢量，须结合 MPI 判断是否份额流失"]:
        ws_v.merge_cells(f"A{r}:N{r}")
        put(ws_v, f"A{r}", line, "r", None, "left", border=False)
        r += 1

    # ---------------- 说明
    write_intro(ws_intro, "06", "年度预算与月度分解",
                ["对应课程 M11《年度预算与滚动预测》与《法典》表 N「每年 9 月下年度预算编制」。",
                 "「年度假设」页是唯一参数入口：房量、年度、SPEC 2.3 基线、餐饮/其他收入系数、校准开关。",
                 "「月度预算」页按 SPEC 2.5 的月度 OCC/ADR 自动算 RevPAR、房晚、客房收入、餐饮、其他、总营收、GOP、GOPPAR。",
                 "「分日预算」页按星期权重把月度 OCC 拆到 365 天，并保证月内加权平均回到月度目标。",
                 "「滚动预测」页与「差异分析」页分别用于每月 1 日的滚动更新与量价分解复盘。"],
                [
                    ("年度假设 B7", "总房量", "输入", "320", "SPEC 2.1"),
                    ("年度假设 B16-B25", "SPEC 2.3 基线", "输入", "OCC 72% / ADR 618 / 客房 51,977,328 / 餐饮 28,600,000 / 其他 4,100,000 / GOP 率 32%", "校准目标"),
                    ("年度假设 B29/B30", "餐饮/其他收入系数", "公式", "= 目标餐饮 ÷ 目标客房 ； = 目标其他 ÷ 目标客房", "≈0.5502 / ≈0.0789"),
                    ("年度假设 B31", "校准开关", "输入", "启用 / 不启用", "默认启用＝对齐 SPEC 2.3 基线"),
                    ("年度假设 B32", "校准系数", "公式", "= 客房收入目标 ÷ 自下而上原始客房收入", "≈0.9472"),
                    ("月度预算 B/E/F", "起始日 / OCC / ADR", "输入", "SPEC 2.5", "12 个月"),
                    ("月度预算 C", "天数", "公式", "=EOMONTH(B,0)-B+1", "自动取 2027 实际天数（28/30/31）"),
                    ("月度预算 G-R", "收入与利润", "公式", "见各列表头", "含校准后 ADR/RevPAR"),
                    ("分日预算 Q4:Q10", "星期权重", "输入", "默认 0.88/0.93/0.96/1.00/1.12/1.22/1.04", "可按需调整"),
                    ("分日预算 G", "日 OCC", "公式", "= 月OCC × 当日权重 × 月天数 ÷ 月权重和", "保证月内平均回到月度目标"),
                    ("分日预算 Y-AA", "月度校验", "公式", "分日加权 OCC vs 月度 OCC", "差异 <0.01pp 显示青绿"),
                    ("差异分析 H/I", "量差 / 价差", "公式", "=(实际房晚−预算房晚)×预算ADR ； =(实际ADR−预算ADR)×实际房晚", ""),
                ],
                ["在「年度假设」页填总房量、预算年度与年度开始日，确认 SPEC 2.3 基线数值（默认已填好）。",
                 "打开「月度预算」页，核对 12 个月的 OCC/ADR 是否与本店判断一致（默认 SPEC 2.5）。",
                 "看「年度假设」页第四节的双轨校验：偏差% 列应接近 0；如需保留自下而上口径，把 B31 改为「不启用」。",
                 "在「分日预算」页调整右侧星期权重，观察日 OCC 曲线；看 X:AA 的月度校验是否全部青绿。",
                 "每月 1 日：在「滚动预测」页更新已过月份的实际值与未来月份的预测值；在「差异分析」页填实际房晚与实际 ADR，读量差/价差结论。"],
                ["表 N · 每年 9 月下年度预算编制；每月 1 日上月复盘与滚动预测更新。",
                 "《法典》全文未单独设置「预算判定表」，预算偏差的处理走表 A（价格）与表 D（份额）。",
                 "表 O · 决策优先级 —— 预算达成率只是诊断信号，动作仍须回到表 A–表 H。"],
                lede="预算不是拍脑袋的数字，是 365 天每天该怎么卖的作战计划。")

    wb.save(path)
    return wb


# =============================================================== 07 周报月报模板
def build_07(path):
    wb = Workbook()
    ws_intro = wb.active
    ws_intro.title = "说明"
    ws_w = wb.create_sheet("周报")
    ws_m = wb.create_sheet("月报")
    ws_o = wb.create_sheet("业主一页纸")
    ws_b = wb.create_sheet("周末作战表")

    # ---------------- 周报
    ws_w.sheet_view.showGridLines = False
    set_widths(ws_w, [12, 14, 14, 14, 14, 12, 12, 12, 12, 12, 12, 12, 12, 20])
    title(ws_w, "收益周报 · 杭州滨江云璟酒店",
          "黄底=输入，白底=公式。用于《法典》表 N 每周一的《周度收益报告》与收益晨会。", "N")
    r = 4
    r = section(ws_w, r, "一、本周基础数据（输入）", "N")
    inp = [("周起始日", dt.date(2026, 3, 2), "i", DATE), ("周结束日", "=$B$6+6", "f", DATE),
           ("本周可售房晚", 2240, "i", INT), ("本周已售房晚", 1768, "i", INT),
           ("本周客房收入", 1089500, "i", MONEY), ("渠道综合成本率", 0.101, "i", PCT2)]
    for i, (k, v, kind, fmt) in enumerate(inp):
        wrow(ws_w, 6 + i, 1, [(k, "r", None, "left"), (v, kind, fmt)])
    r = 13
    r = section(ws_w, r, "二、核心指标（本周实际 vs 上周 vs 去年同期 vs 预算）", "N")
    r = header_row(ws_w, r, 1, ["指标", "本周实际", "上周", "去年同期", "本周预算", "环比",
                                "环比%", "同比%", "达成率", "判定"], height=26)
    W0 = r
    inds = [
        ("OCC", "=IFERROR($B$9/$B$8,\"\")", PCT1),
        ("ADR（元）", "=IFERROR($B$10/$B$9,\"\")", MONEY2),
        ("RevPAR（元）", "=IFERROR($B$10/$B$8,\"\")", MONEY2),
        ("NRevPAR（元）", "=IFERROR($B$10/$B$8*(1-$B$11),\"\")", MONEY2),
        ("客房收入（元）", "=$B$10", MONEY),
    ]
    prev = [0.782, 601, 470, 423, 1054000]
    ly = [0.741, 578, 428, 386, 958000]
    bud = [0.790, 616, 487, 438, 1090000]
    for i, (nm, f, fmt) in enumerate(inds):
        rr = W0 + i
        wrow(ws_w, rr, 1, [
            (nm, "r", None, "left"), (f, "f", fmt),
            (prev[i], "i", fmt), (ly[i], "i", fmt), (bud[i], "i", fmt),
            (f"=IFERROR($B{rr}-$C{rr},\"\")", "f", fmt),
            (f"=IFERROR($B{rr}/$C{rr}-1,\"\")", "f", PCT1),
            (f"=IFERROR($B{rr}/$D{rr}-1,\"\")", "f", PCT1),
            (f"=IFERROR($B{rr}/$E{rr},\"\")", "f", PCT1),
            (f'=IF($I{rr}="","",IF($I{rr}>=1,"达标",IF($I{rr}>=0.95,"基本达标","未达标")))', "f"),
        ])
    cf_updown(ws_w, f"F{W0}:F{W0 + 4}")
    cf_updown(ws_w, f"G{W0}:H{W0 + 4}")
    for col in "IJ":
        ws_w.conditional_formatting.add(f"{col}{W0}:{col}{W0 + 4}", CellIsRule(
            operator="greaterThanOrEqual", formula=["1"], fill=fill(TEAL_LIGHT),
            font=Font(name=FONT, size=10, color=TEAL, bold=True)))
        ws_w.conditional_formatting.add(f"{col}{W0}:{col}{W0 + 4}", CellIsRule(
            operator="lessThan", formula=["0.95"], fill=fill(RED_LIGHT),
            font=Font(name=FONT, size=10, color=RED, bold=True)))
    cf_rule(ws_w, f"J{W0}:J{W0 + 4}", f'EXACT($J{W0},"达标")', TEAL, TEAL_LIGHT)
    cf_rule(ws_w, f"J{W0}:J{W0 + 4}", f'EXACT($J{W0},"基本达标")', AMBER, AMBER_LIGHT)
    cf_rule(ws_w, f"J{W0}:J{W0 + 4}", f'EXACT($J{W0},"未达标")', RED, RED_LIGHT)

    r = W0 + 6
    r = section(ws_w, r, "三、下周预测", "N")
    r = header_row(ws_w, r, 1, ["项目", "数值", "说明", "", "", "", "", "", "", ""], height=24)
    nx = [("下周预测 OCC", 0.813, "i", PCT1, "在手 + 预测增量"),
          ("下周预测 ADR（元）", 638, "i", MONEY, ""),
          ("下周预测 RevPAR（元）", "=$B$22*$B$23", "f", MONEY2, "= OCC × ADR"),
          ("下周在手房晚", 1420, "i", INT, "距下周还有 7 天"),
          ("下周关键日（D1/D2）", "3/14 周六 展会尾日", "i", None, "须重点盯防，必要时走表 B 限制条件"),
          ("下周风险等级", "中", "i", None, "高/中/低")]
    for i, (k, v, kind, fmt, note) in enumerate(nx):
        wrow(ws_w, 22 + i, 1, [(k, "r", None, "left"), (v, kind, fmt), (note, "r", None, "left")] + [(None, "r")] * 7)
    dv_list(ws_w, "B27", ["高", "中", "低"])
    r = 30
    r = section(ws_w, r, "四、本周动作清单", "N")
    r = header_row(ws_w, r, 1, ["序号", "日期", "目标入住日", "动作", "触发判定表", "执行人", "执行结果", "备注", "", ""], height=24)
    A0 = r
    acts = [(dt.date(2026, 3, 2), dt.date(2026, 3, 14), "SUP 提价 +5%", "表A", "张岚", "已执行"),
            (dt.date(2026, 3, 3), dt.date(2026, 3, 14), "设 MinLOS 2 晚", "表B", "王越", "已执行"),
            (dt.date(2026, 3, 4), dt.date(2026, 3, 15), "关闭批发商渠道", "表H", "王越", "已执行"),
            (dt.date(2026, 3, 5), dt.date(2026, 3, 8), "上「今日特惠」尾房", "表I", "陈舸", "已执行"),
            (dt.date(2026, 3, 6), dt.date(2026, 3, 21), "ARI 106，维持观察", "表C", "张岚", "记入观察清单")]
    for i in range(8):
        rr = A0 + i
        a = acts[i] if i < len(acts) else (None,) * 6
        wrow(ws_w, rr, 1, [(i + 1, "r", INT), (a[0], "i", DATE), (a[1], "i", DATE), (a[2], "i", None, "left"),
                           (a[3], "i"), (a[4], "i"), (a[5], "i"), (None, "i", None, "left"), (None, "r"), (None, "r")])
    dv_list(ws_w, f"E{A0}:E{A0 + 7}", TABLE_CODES)
    dv_list(ws_w, f"G{A0}:G{A0 + 7}", ["已执行", "待执行", "已取消"])
    r = A0 + 10
    r = section(ws_w, r, "五、下周计划动作", "N")
    r = header_row(ws_w, r, 1, ["序号", "计划日期", "目标入住日", "计划动作", "依据", "责任人", "状态", "备注", "", ""], height=24)
    P0 = r
    plans = [(dt.date(2026, 3, 9), dt.date(2026, 3, 14), "展会尾日二次提价 +10%", "预测 OCC 91%，Pickup 领先 14%", "张岚", "待执行"),
             (dt.date(2026, 3, 10), dt.date(2026, 3, 15), "协议客户外呼", "15-30 天窗口落后 22%", "王越", "待执行")]
    for i in range(8):
        rr = P0 + i
        a = plans[i] if i < len(plans) else (None,) * 6
        wrow(ws_w, rr, 1, [(i + 1, "r", INT), (a[0], "i", DATE), (a[1], "i", DATE), (a[2], "i", None, "left"),
                           (a[3], "i", None, "left"), (a[4], "i"), (a[5], "i"), (None, "i", None, "left"),
                           (None, "r"), (None, "r")])
    dv_list(ws_w, f"G{P0}:G{P0 + 7}", ["待执行", "已完成", "已取消"])
    r = P0 + 10
    r = section(ws_w, r, "六、风险提示", "N")
    r = header_row(ws_w, r, 1, ["序号", "风险项", "影响", "概率", "应对预案", "责任人", "", "", "", ""], height=24)
    K0 = r
    risks = [("竞对 D 持续降价", "本店 ARI 被动升至 112，OTA 曝光下滑", "高", "不盲目跟价；做含早/江景差异化套餐", "张岚"),
             ("3/18–3/20 展会订单集中取消", "下周 OCC 可能回落至 70% 以下", "中", "预付 48h 闪购 + 协议客户外呼", "王越"),
             ("系统价格一致性未同步", "直销价高于 OTA，触发红线", "中", "调价后 30 分钟内核查 6 个渠道", "陈舸")]
    for i in range(6):
        rr = K0 + i
        a = risks[i] if i < len(risks) else (None,) * 5
        wrow(ws_w, rr, 1, [(i + 1, "r", INT), (a[0], "i", None, "left"), (a[1], "i", None, "left"),
                           (a[2], "i"), (a[3], "i", None, "left"), (a[4], "i"),
                           (None, "r"), (None, "r"), (None, "r"), (None, "r")])
    dv_list(ws_w, f"D{K0}:D{K0 + 5}", ["高", "中", "低"])
    cf_rule(ws_w, f"D{K0}:D{K0 + 5}", f'EXACT($D{K0},"高")', RED, RED_LIGHT)
    cf_rule(ws_w, f"D{K0}:D{K0 + 5}", f'EXACT($D{K0},"中")', AMBER, AMBER_LIGHT)
    cf_rule(ws_w, f"D{K0}:D{K0 + 5}", f'EXACT($D{K0},"低")', TEAL, TEAL_LIGHT)

    # ---------------- 月报
    ws_m.sheet_view.showGridLines = False
    set_widths(ws_m, [14, 13, 13, 13, 14, 13, 13, 12, 12, 12, 12, 13, 13, 30])
    title(ws_m, "收益月报 · 三维诊断 + 客源结构 + 渠道净收益",
          "黄底=输入，白底=公式。用于《法典》表 N 每月 1 日《月度收益复盘报告》与每月 10 日业主汇报。", "N")
    r = 4
    r = section(ws_m, r, "一、三维诊断（MPI / ARI / RGI）", "N")
    r = header_row(ws_m, r, 1, ["指标", "本月值", "上月值", "去年同期", "竞争组合值", "指数/判定",
                                "差异（vs 上月）", "", "", "", "", "", "", "文字诊断（输入）"], height=28)
    D0 = r
    diag = [("MPI 市场渗透指数", 104.2, 101.8, 99.5, 0.782,
             '=IF($B{r}="","",IF($B{r}>110,"份额领先",IF($B{r}>=100,"健康",IF($B{r}>=95,"略弱",'
             'IF($B{r}>=85,"落后","严重落后")))))',
             "份额连续两月领先，主因 OTA 挂牌位优化 + 协议客户回补。"),
            ("ARI 平均房价指数", 98.6, 101.2, 97.0, 686,
             '=IF($B{r}="","",IF($B{r}>120,"严重偏高",IF($B{r}>=110,"偏高",IF($B{r}>=103,"略高",'
             'IF($B{r}>=97,"健康",IF($B{r}>=90,"略低",IF($B{r}>=80,"偏低","严重偏低")))))))',
             "落入 97–103 健康区间；竞对 D 降价后本店被动偏贵，靠含早套餐对冲，未跟价。"),
            ("RGI 收入生成指数", 102.7, 103.0, 96.5, 536,
             '=IF($B{r}="","",IF($B{r}>=100,"竞争力领先",IF($B{r}>=95,"基本同步","落后")))',
             "RGI 102.7 略高于组合，主要由份额（MPI 104.2）驱动，价格端仍有 1.4 点空间。")]
    for i, (nm, bv, pv, lyv, cv, judge, txt) in enumerate(diag):
        rr = D0 + i
        wrow(ws_m, rr, 1, [(nm, "r", None, "left"), (bv, "i", IDX), (pv, "i", IDX), (lyv, "i", IDX),
                           (cv, "i", MONEY2 if i in (1, 2) else PCT1),
                           (judge.format(r=rr), "f"),
                           (f"=IFERROR($B{rr}-$C{rr},\"\")", "f", NUM1),
                           (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r"),
                           (txt, "i", None, "left")])
        ws_m.row_dimensions[rr].height = 34
    cf_updown(ws_m, f"G{D0}:G{D0 + 2}")
    cf_scale(ws_m, f"B{D0}:B{D0}", 100, 110, 95, 100)
    cf_scale(ws_m, f"B{D0 + 1}:B{D0 + 1}", 97, 103, 90, 110)
    ws_m.conditional_formatting.add(f"B{D0 + 2}:B{D0 + 2}", CellIsRule(
        operator="greaterThanOrEqual", formula=["100"], fill=fill(TEAL_LIGHT),
        font=Font(name=FONT, size=10, color=TEAL, bold=True)))
    ws_m.conditional_formatting.add(f"B{D0 + 2}:B{D0 + 2}", CellIsRule(
        operator="lessThan", formula=["95"], fill=fill(RED_LIGHT),
        font=Font(name=FONT, size=10, color=RED, bold=True)))

    r = D0 + 4
    r = section(ws_m, r, "二、客源结构（SPEC 2.3 七细分）", "N")
    r = header_row(ws_m, r, 1, ["细分代码", "细分名称", "房晚", "占比", "ADR", "客房收入", "渠道",
                                "渠道成本率", "渠道成本", "净收入", "可售房晚", "NRevPAR 贡献", "",
                                "备注"], height=30)
    G0 = r
    tot_rn = 6894
    for i, sg in enumerate(SEGMENTS):
        rr = G0 + i
        rn = round(tot_rn * sg[2])
        wrow(ws_m, rr, 1, [
            (sg[0], "r"), (sg[1], "r", None, "left"), (rn, "i", INT),
            (f"=IFERROR($C{rr}/$C${G0 + 7},\"\")", "f", PCT1),
            (sg[3], "i", MONEY),
            (f"=$C{rr}*$E{rr}", "f", MONEY),
            (sg[4], "i"),
            (sg[5], "i", PCT2),
            (f"=$F{rr}*$H{rr}", "f", MONEY),
            (f"=$F{rr}-$I{rr}", "f", MONEY),
            (9920, "i" if i == 0 else "f", INT),
            (f"=IFERROR($J{rr}/$K{rr},\"\")", "f", MONEY2),
            (None, "r"),
            ("细分→渠道映射 SPEC 未唯一指定，按教学惯例设定，可按本店实际调整" if i == 5 else None, "n", None, "left"),
        ])
        if i > 0:
            ws_m[f"K{rr}"].value = f"=$K${G0}"
            ws_m[f"K{rr}"].number_format = INT
    GT = G0 + 7
    wrow(ws_m, GT, 1, [("合计", "t"), ("7 个细分", "t"), (f"=SUM($C${G0}:$C${G0 + 6})", "f", INT),
                       (f"=SUM($D${G0}:$D${G0 + 6})", "f", PCT1),
                       (f"=IFERROR($F${GT}/$C${GT},\"\")", "f", MONEY2),
                       (f"=SUM($F${G0}:$F${G0 + 6})", "f", MONEY), ("—", "r"),
                       (f"=IFERROR($I${GT}/$F${GT},\"\")", "f", PCT2),
                       (f"=SUM($I${G0}:$I${G0 + 6})", "f", MONEY),
                       (f"=SUM($J${G0}:$J${G0 + 6})", "f", MONEY),
                       (f"=$K${G0}", "f", INT),
                       (f"=IFERROR($J${GT}/$K${GT},\"\")", "f", MONEY2), (None, "r"),
                       ("综合渠道成本率 = 渠道成本合计 ÷ 客房收入合计", "n", None, "left")])
    for col in "CDEFIJKL":
        ws_m[f"{col}{GT}"].fill = fill(GOLD_SOFT)
        ws_m[f"{col}{GT}"].font = Font(name=FONT, size=10, bold=True, color=NAVY)
    r = GT + 2
    put(ws_m, f"A{r}", "加权 ADR 校验", "t", None, "left")
    ws_m.merge_cells(f"A{r}:B{r}")
    put(ws_m, f"C{r}", f"=IFERROR($F${GT}/$C${GT},\"\")", "f", MONEY2)
    put(ws_m, f"D{r}", "全店实际 ADR", "r", None, "left")
    put(ws_m, f"E{r}", 618, "i", MONEY)
    put(ws_m, f"F{r}", f"=IFERROR($C{r}/$E{r}-1,\"\")", "f", PCT1)
    ws_m.merge_cells(f"G{r}:N{r}")
    put(ws_m, f"G{r}", "⚠ SPEC 2.3 七个细分的占比×ADR 加权后为 ¥581.1，与全店 ADR ¥618 差 −6.0%"
                       "（SPEC 内部取整差异）。教学时说明：细分加权 ADR 与全店 ADR 的差异反映了升级/包价/免费房等因素。",
        "n", None, "left", wrap=True)
    ws_m.row_dimensions[r].height = 34
    r += 2

    r = section(ws_m, r, "三、渠道成本与 NRevPAR 分析", "N")
    r = header_row(ws_m, r, 1, ["指标", "数值", "口径", "", "", "", "", "", "", "", "", "", "", ""], height=24)
    nrev = [("客房收入合计（元）", f"=$F${GT}", MONEY, "来自客源结构表"),
            ("渠道成本合计（元）", f"=$I${GT}", MONEY, ""),
            ("净客房收入（元）", f"=$B{r + 1}-$B{r + 2}", MONEY, ""),
            ("可售房晚", f"=$K${GT}", INT, ""),
            ("RevPAR（元）", f"=IFERROR($B{r + 1}/$B{r + 4},\"\")", MONEY2, "客房收入 ÷ 可售房晚"),
            ("综合渠道成本率", f"=IFERROR($B{r + 2}/$B{r + 1},\"\")", PCT2, "渠道成本 ÷ 客房收入"),
            ("NRevPAR（元）", f"=IFERROR($B{r + 3}/$B{r + 4},\"\")", MONEY2, "净客房收入 ÷ 可售房晚"),
            ("NRevPAR 目标（元）", 400, MONEY2, "= 445 ×（1 − 10.1%）≈ 400，SPEC 2.3 RevPAR 445"),
            ("NRevPAR 达成率", f"=IFERROR($B{r + 7}/$B{r + 8},\"\")", PCT1, ""),
            ("结论", f'=IF($B{r + 9}="","",IF($B{r + 9}>=1,"净收益达标",'
                     f'IF($B{r + 9}>=0.95,"基本达标，压降 OTA 占比","未达标，启动渠道结构优化")))', None, "")]
    for i, (k, v, fmt, note) in enumerate(nrev):
        wrow(ws_m, r + i, 1, [(k, "r", None, "left"), (v, "f", fmt), (note, "r", None, "left")] + [(None, "r")] * 11)
    r = r + len(nrev) + 1
    r = section(ws_m, r, "四、下月策略（输入）", "N")
    for i in range(5):
        wrow(ws_m, r + i, 1, [(i + 1, "r", INT), (None, "i", None, "left")] + [(None, "r")] * 12)
        ws_m.merge_cells(f"B{r + i}:N{r + i}")
        ws_m.row_dimensions[r + i].height = 24

    # ---------------- 业主一页纸
    ws_o.sheet_view.showGridLines = False
    set_widths(ws_o, [16, 16, 16, 16, 16, 16, 16, 30])
    title(ws_o, "业主一页纸 · 4 个数字 + 3 个动作 + 1 个请求",
          "极简汇报。给业主看的东西，一页纸能说完才叫想清楚了。", "H")
    r = 4
    wrow(ws_o, r, 1, [("汇报月份", "r", None, "left"), ("2026 年 3 月", "i"),
                      ("汇报人", "r", None, "left"), ("李默（收益经理 L3）", "i"),
                      (None, "r"), (None, "r"), (None, "r"), (None, "r")])
    r += 2
    r = section(ws_o, r, "一、4 个核心数字", "H")
    r = header_row(ws_o, r, 1, ["指标", "实际", "预算", "去年同期", "达成率", "同比%", "", "一句话结论"], height=26)
    O0 = r
    core = [("OCC", 0.789, 0.790, 0.741, PCT1),
            ("ADR（元）", 616, 616, 578, MONEY),
            ("RevPAR（元）", 486, 487, 428, MONEY),
            ("GOPPAR（元）", 232, 234, 205, MONEY)]
    for i, (nm, act, bud, ly, fmt) in enumerate(core):
        rr = O0 + i
        wrow(ws_o, rr, 1, [(nm, "r", None, "left"), (act, "i", fmt), (bud, "i", fmt), (ly, "i", fmt),
                           (f"=IFERROR($B{rr}/$C{rr},\"\")", "f", PCT1),
                           (f"=IFERROR($B{rr}/$D{rr}-1,\"\")", "f", PCT1), (None, "r"),
                           (None, "i", None, "left")])
    for col in "EF":
        ws_o.conditional_formatting.add(f"{col}{O0}:{col}{O0 + 3}", CellIsRule(
            operator="greaterThanOrEqual", formula=["1"], fill=fill(TEAL_LIGHT),
            font=Font(name=FONT, size=10, color=TEAL, bold=True)))
        ws_o.conditional_formatting.add(f"{col}{O0}:{col}{O0 + 3}", CellIsRule(
            operator="lessThan", formula=["0.95"], fill=fill(RED_LIGHT),
            font=Font(name=FONT, size=10, color=RED, bold=True)))
    r = O0 + 5
    r = section(ws_o, r, "二、3 个动作", "H")
    r = header_row(ws_o, r, 1, ["序号", "动作", "负责人", "完成时间", "预期影响", "", "", ""], height=24)
    B0 = r
    oacts = [("展会周（3/14–3/16）执行 MinLOS 2 晚 + 二次提价 10%", "张岚", dt.date(2026, 3, 13), "RevPAR +¥22"),
             ("压降 OTA 占比：官网小程序上线会员专享价（低于 OTA 5%）", "王越", dt.date(2026, 3, 20), "渠道成本 −0.8pp"),
             ("协议客户分级：TOP20 客户外呼 + 续签价上调 4%", "李默", dt.date(2026, 3, 31), "CORP ADR +¥21")]
    for i in range(3):
        rr = B0 + i
        a = oacts[i]
        wrow(ws_o, rr, 1, [(i + 1, "r", INT), (a[0], "i", None, "left"), (a[1], "i"), (a[2], "i", DATE),
                           (a[3], "i", None, "left"), (None, "r"), (None, "r"), (None, "r")])
    r = B0 + 4
    r = section(ws_o, r, "三、1 个请求", "H")
    wrow(ws_o, r, 1, [("请求事项", "r", None, "left"),
                      ("请批准 3 月展会周启用超售（≤8 间）并预置步行客人预案预算 ¥6,000", "i", None, "left"),
                      (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r")])
    ws_o.merge_cells(f"B{r}:H{r}")
    ws_o.row_dimensions[r].height = 30

    # ---------------- 周末作战表
    ws_b.sheet_view.showGridLines = False
    set_widths(ws_b, [12, 9, 11, 11, 11, 22, 11, 11, 22, 11, 11, 22])
    title(ws_b, "周末作战表 · 周五 / 周六 / 周日（每周五确认）",
          "黄底=输入（在手房晚与建议动作），白底=公式（剩余房量）。用于《法典》表 N 每周五《周末作战表》。", "L")
    r = 4
    r = section(ws_b, r, "一、三日概览", "L")
    r = header_row(ws_b, r, 1, ["", "周五", "周六", "周日", "", "", "", "", "", "", "", ""], height=24)
    wrow(ws_b, r, 1, [("日期", "t", None, "left"),
                      (dt.date(2026, 3, 13), "i", DATE), (dt.date(2026, 3, 14), "i", DATE), (dt.date(2026, 3, 15), "i", DATE),
                      (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r")])
    r += 1
    wrow(ws_b, r, 1, [("在手房晚合计", "t", None, "left"),
                      (f"=SUM($D$13:$D$17)", "f", INT), (f"=SUM($G$13:$G$17)", "f", INT), (f"=SUM($J$13:$J$17)", "f", INT),
                      (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r")])
    r += 1
    wrow(ws_b, r, 1, [("预测 OCC", "t", None, "left"),
                      (f"=IFERROR($B{6}/320,\"\")", "f", PCT1),
                      (f"=IFERROR($C{6}/320,\"\")", "f", PCT1),
                      (f"=IFERROR($D{6}/320,\"\")", "f", PCT1),
                      (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r"), (None, "r")])
    r += 2
    r = section(ws_b, r, "二、分房型作战", "L")
    r = header_row(ws_b, r, 1, ["房型组", "房量", "当前 BAR",
                                "周五在手", "周五剩余", "周五建议动作",
                                "周六在手", "周六剩余", "周六建议动作",
                                "周日在手", "周日剩余", "周日建议动作"], height=34)
    BB = r
    groups = [("STD", 120, 580), ("SUP", 100, 680), ("DLX", 60, 820), ("EXE", 30, 990), ("STE", 10, 1280)]
    onh = [[92, 108, 74], [86, 95, 62], [52, 56, 38], [22, 26, 16], [8, 9, 5]]
    for i, (g, n, bar) in enumerate(groups):
        rr = BB + i
        wrow(ws_b, rr, 1, [
            (g, "r"), (n, "i", INT), (bar, "i", MONEY),
            (onh[i][0], "i", INT), (f"=IFERROR($B{rr}-$D{rr},\"\")", "f", INT), (None, "i", None, "left"),
            (onh[i][1], "i", INT), (f"=IFERROR($B{rr}-$G{rr},\"\")", "f", INT), (None, "i", None, "left"),
            (onh[i][2], "i", INT), (f"=IFERROR($B{rr}-$J{rr},\"\")", "f", INT), (None, "i", None, "left"),
        ])
    BT = BB + 5
    wrow(ws_b, BT, 1, [("合计", "t"), (f"=SUM($B${BB}:$B${BB + 4})", "f", INT), ("—", "r"),
                       (f"=SUM($D${BB}:$D${BB + 4})", "f", INT), (f"=SUM($E${BB}:$E${BB + 4})", "f", INT), (None, "r"),
                       (f"=SUM($G${BB}:$G${BB + 4})", "f", INT), (f"=SUM($H${BB}:$H${BB + 4})", "f", INT), (None, "r"),
                       (f"=SUM($J${BB}:$J${BB + 4})", "f", INT), (f"=SUM($K${BB}:$K${BB + 4})", "f", INT), (None, "r")])
    for col in "BDEGHJK":
        ws_b[f"{col}{BT}"].fill = fill(GOLD_SOFT)
        ws_b[f"{col}{BT}"].font = Font(name=FONT, size=10, bold=True, color=NAVY)
    dv_list(ws_b, f"F{BB}:F{BB + 4}", ["维持", "提价", "降价", "关房", "CTA", "MinLOS", "开放低价渠道", "上促销"])
    dv_list(ws_b, f"I{BB}:I{BB + 4}", ["维持", "提价", "降价", "关房", "CTA", "MinLOS", "开放低价渠道", "上促销"])
    dv_list(ws_b, f"L{BB}:L{BB + 4}", ["维持", "提价", "降价", "关房", "CTA", "MinLOS", "开放低价渠道", "上促销"])
    cf_rule(ws_b, f"E{BB}:E{BT}", f"AND($E{BB}<>\"\",$E{BB}<=0)", RED, RED_LIGHT)
    cf_rule(ws_b, f"H{BB}:H{BT}", f"AND($H{BB}<>\"\",$H{BB}<=0)", RED, RED_LIGHT)
    cf_rule(ws_b, f"K{BB}:K{BT}", f"AND($K{BB}<>\"\",$K{BB}<=0)", RED, RED_LIGHT)
    r = BT + 2
    for line in ["《法典》表 N：每周五确认下周 D1/D2 日重点盯防与周末策略。",
                 "剩余房量 ≤0 的房型组标红：须检查是否超售过度或需要关房（表 B）。",
                 "高档房（EXE/STE）剩余 >20% 时，按表 J 启动免费升级（每次最多升 1 档）。"]:
        ws_b.merge_cells(f"A{r}:L{r}")
        put(ws_b, f"A{r}", line, "r", None, "left", border=False)
        r += 1

    # ---------------- 说明
    write_intro(ws_intro, "07", "周报月报模板",
                ["对应课程 M04《报表与台账》与 M12《会议与汇报》，以及《法典》表 N 的周度/月度节奏。",
                 "「周报」页：本周实际 vs 上周 vs 去年同期 vs 预算，加下周预测、动作清单、计划动作、风险提示。",
                 "「月报」页：MPI/ARI/RGI 三维诊断 + 客源结构表 + 渠道成本与 NRevPAR 分析 + 下月策略。",
                 "「业主一页纸」页：4 个核心数字 + 3 个动作 + 1 个请求，用于每月 10 日业主/管理层汇报。",
                 "「周末作战表」页：周五/周六/周日分房型在手、剩余房量与动作。"],
                [
                    ("周报 B6-B11", "周基础数据", "输入", "起始日/可售房晚/已售房晚/客房收入/渠道成本率", "其余指标全部由公式推导"),
                    ("周报 B-E", "上周/去年同期/预算", "输入", "—", "用于环比、同比、达成率"),
                    ("周报 I", "达成率", "公式", "= 本周实际 ÷ 本周预算", "≥100% 青绿，<95% 红"),
                    ("周报 J", "判定", "公式", "达标 / 基本达标 / 未达标", ""),
                    ("月报 B-E", "三维指标值", "输入", "本月/上月/去年同期/竞争组合值", ""),
                    ("月报 F", "指数判定", "公式", "MPI 走表 D 五档，ARI 走表 C 七档，RGI 三档", ""),
                    ("月报 C-H", "客源结构", "输入", "房晚 / ADR / 渠道 / 渠道成本率", "占比、收入、净收入、NRevPAR 贡献自动算"),
                    ("月报 合计行", "综合渠道成本率", "公式", "= 渠道成本合计 ÷ 客房收入合计", "≈10.1%"),
                    ("周末作战表 D/G/J", "分房型在手", "输入", "—", "剩余房量 = 房量 − 在手（公式）"),
                ],
                ["每周一：填「周报」页的周基础数据（B6:B11）与上周/去年同期/预算（C:E 列），读达成率与判定。",
                 "填「本周动作清单」与「下周计划动作」，把未执行的项同步到 04 号《调价台账》的「观察清单」。",
                 "每月 1 日：填「月报」页三维诊断的本月/上月/去年同期值，读判定列，在 N 列写文字诊断。",
                 "填「客源结构」表的房晚与 ADR，看加权 ADR 校验与综合渠道成本率、NRevPAR 达成率。",
                 "每月 10 日：把「业主一页纸」页填满，打印一页带走。",
                 "每周五：更新「周末作战表」，剩余房量 ≤0 的房型组标红须立即处理。"],
                ["表 N · 每周一《周度收益报告》；每周五《周末作战表》；每月 1 日月度复盘；每月 10 日业主汇报。",
                 "表 C / 表 D —— 月报三维诊断中 ARI 走表 C、MPI 走表 D，判定列已用嵌套 IF 实现。",
                 "表 J · 免费升级规则 —— 周末高档房剩余 >20% 时启动升级，每次最多升 1 档。",
                 "表 O · 决策优先级 —— 多表结论冲突时只执行最高优先级一条。"],
                lede="报表不是给领导交作业，是逼自己把问题说清楚。")

    wb.save(path)
    return wb


# =============================================================== 08 超额预订计算器
def build_08(path):
    wb = Workbook()
    ws_intro = wb.active
    ws_intro.title = "说明"
    ws_o = wb.create_sheet("超售计算")
    ws_h = wb.create_sheet("历史取消率")
    ws_g = wb.create_sheet("团队询价决策")
    ws_k = wb.create_sheet("会议综合贡献")

    # ---------------- 超售计算
    ws_o.sheet_view.showGridLines = False
    heads = ["目标日期", "可售房量", "近30天\nNo-show率", "24h内\n取消率", "合计率", "基准\n超售率",
             "D1/D2\n日?", "担保预订\n占比", "会议团队\n占比", "协议客户\n集中度", "30min内\n备用酒店",
             "修正系数", "修正后\n超售率", "理论\n超售间数", "硬上限", "最终\n超售间数", "L3审批", "备注"]
    set_widths(ws_o, [12, 10, 11, 10, 10, 10, 9, 11, 11, 11, 12, 10, 11, 11, 9, 11, 10, 28])
    title(ws_o, "超额预订计算器 ·《法典》表 E 全自动",
          "输入：可售房量、No-show 率、24h 取消率、四个修正条件、备用酒店。输出：最终超售间数与是否需要 L3 审批。", "R")
    header_row(ws_o, 3, 1, heads, height=40)
    freeze(ws_o, "B4")
    O0, O1 = 4, 33
    base = dt.date(2026, 3, 1)
    for i in range(O1 - O0 + 1):
        r = O0 + i
        ns = round(RNG.uniform(0.02, 0.16), 4)
        cx = round(RNG.uniform(0.02, 0.18), 4)
        wrow(ws_o, r, 1, [
            (base + dt.timedelta(days=i), "i", DATE),
            (320, "i", INT),
            (ns, "i", PCT1),
            (cx, "i", PCT1),
            (f"=IFERROR($C{r}+$D{r},\"\")", "f", PCT1),
            (f'=IF($E{r}="","",IF($E{r}<0.05,0,IF($E{r}<0.1,0.02,IF($E{r}<0.15,0.03,'
             f'IF($E{r}<0.2,0.05,IF($E{r}<=0.3,0.07,0.1))))))', "f", PCT1),
            ("是" if (i % 7) in (4, 5) else "否", "i"),
            (round(RNG.uniform(0.25, 0.85), 3), "i", PCT1),
            (round(RNG.uniform(0.05, 0.55), 3), "i", PCT1),
            (round(RNG.uniform(0.20, 0.70), 3), "i", PCT1),
            ("有", "i"),
            (f'=IF($E{r}="","",IF($G{r}="是",0.5,1)*IF($H{r}>0.6,0.5,1)*IF($I{r}>0.4,0.5,1)*IF($J{r}>0.5,0.8,1))', "f", "0.000"),
            (f"=IFERROR($F{r}*$L{r}*IF($K{r}=\"无\",0.5,1),\"\")", "f", PCT2),
            (f'=IFERROR(FLOOR($B{r}*$M{r},1),"")', "f", INT),
            (f'=IFERROR(MIN(FLOOR($B{r}*0.05,1),15),"")', "f", INT),
            (f'=IFERROR(MIN($N{r},$O{r}),"")', "f", INT),
            (f'=IF($P{r}="","",IF($F{r}>=0.1,"是（基准率 10%，须 L3 审批）",'
             f'IF($P{r}>=10,"是（≥10 间，须 L3 审批）","否")))', "f", None, "left"),
            (None, "i", None, "left"),
        ])
    dv_list(ws_o, f"G{O0}:G{O1}", ["是", "否"])
    dv_list(ws_o, f"K{O0}:K{O1}", ["有", "无"])
    dv_num(ws_o, f"C{O0}:D{O1}", 0, 1)
    dv_num(ws_o, f"H{O0}:J{O1}", 0, 1)
    dv_date(ws_o, f"A{O0}:A{O1}")
    cf_updown(ws_o, f"P{O0}:P{O1}")
    ws_o.conditional_formatting.add(f"P{O0}:P{O1}", CellIsRule(
        operator="lessThanOrEqual", formula=["0"], fill=fill(GREY_LIGHT),
        font=Font(name=FONT, size=10, color=INK2)))
    cf_rule(ws_o, f"Q{O0}:Q{O1}", f'LEFT($Q{O0},1)="是"', RED, RED_LIGHT)
    cf_rule(ws_o, f"Q{O0}:Q{O1}", f'EXACT($Q{O0},"否")', TEAL, TEAL_LIGHT)

    r = O1 + 2
    r = section(ws_o, r, "《法典》表 E · 超额预订标准表（参考区，勿改）", "R")
    r = header_row(ws_o, r, 1, ["步骤", "条件", "取值", "说明", "", "", "", "", "", "", "", "", "", "", "", "", "", ""], height=24)
    te = [
        ("第一步", "No-show 率 + 24h 内取消率 <5%", "0%", "查基准超售率"),
        ("第一步", "5%–10%", "2%", ""),
        ("第一步", "10%–15%", "3%", ""),
        ("第一步", "15%–20%", "5%", ""),
        ("第一步", "20%–30%", "7%", ""),
        ("第一步", ">30%", "10%（需 L3 经理审批）", ""),
        ("第二步", "D1 峰值日 / D2 高涨日", "× 0.5", "修正系数连乘"),
        ("第二步", "担保预订（预付/信用卡担保）占比 >60%", "× 0.5", ""),
        ("第二步", "会议团队占当日 >40%", "× 0.5", ""),
        ("第二步", "协议客户集中度 >50%", "× 0.8", ""),
        ("第三步", "超售间数不超过可售房量的 5%", "硬上限 1", ""),
        ("第三步", "超售间数不超过 15 间", "硬上限 2", ""),
        ("第三步", "步行 30 分钟内无同档次备用酒店", "超售率减半", "对应 K 列选「无」"),
        ("基础公式", "超售间数 = 可售房量 × 超售率（向下取整）", "—", ""),
    ]
    for t in te:
        wrow(ws_o, r, 1, [(t[0], "r"), (t[1], "r", None, "left"), (t[2], "r"), (t[3], "r", None, "left")] + [(None, "r")] * 14)
        r += 1

    # ---------------- 历史取消率
    ws_h.sheet_view.showGridLines = False
    set_widths(ws_h, [12, 11, 11, 12, 13, 13, 11, 30])
    title(ws_h, "历史取消率 · 近 30 天（超售参数的来源）",
          "输入：每日预订数、No-show 数、24h 内取消数。三种率与近 30 天平均自动算出，供「超售计算」页引用。", "H")
    header_row(ws_h, 3, 1, ["日期", "预订数", "No-show 数", "No-show 率", "24h 内取消数", "24h 内取消率", "合计率", "备注"], height=32)
    freeze(ws_h, "B4")
    H0, H1 = 4, 33
    for i in range(30):
        r = H0 + i
        bk = RNG.randint(120, 260)
        wrow(ws_h, r, 1, [
            (base - dt.timedelta(days=30 - i), "i", DATE),
            (bk, "i", INT),
            (RNG.randint(2, 18), "i", INT),
            (f"=IFERROR($C{r}/$B{r},\"\")", "f", PCT1),
            (RNG.randint(3, 26), "i", INT),
            (f"=IFERROR($E{r}/$B{r},\"\")", "f", PCT1),
            (f"=IFERROR($D{r}+$F{r},\"\")", "f", PCT1),
            (None, "i", None, "left"),
        ])
    HT = H1 + 1
    wrow(ws_h, HT, 1, [("近 30 天平均", "t"), (f"=SUM($B${H0}:$B${H1})", "f", INT), (f"=SUM($C${H0}:$C${H1})", "f", INT),
                       (f"=IFERROR($C${HT}/$B${HT},\"\")", "f", PCT1), (f"=SUM($E${H0}:$E${H1})", "f", INT),
                       (f"=IFERROR($E${HT}/$B${HT},\"\")", "f", PCT1), (f"=IFERROR($D${HT}+$F${HT},\"\")", "f", PCT1),
                       ("← 把合计率抄到「超售计算」页 C、D 列作为默认输入", "n", None, "left")])
    for col in "BCDEFG":
        ws_h[f"{col}{HT}"].fill = fill(GOLD_SOFT)
        ws_h[f"{col}{HT}"].font = Font(name=FONT, size=10, bold=True, color=NAVY)
    dv_date(ws_h, f"A{H0}:A{H1}")
    cf_scale(ws_h, f"G{H0}:G{H1}", 0.05, 0.20, 0.0, 0.05)

    # ---------------- 团队询价决策
    ws_g.sheet_view.showGridLines = False
    set_widths(ws_g, [12, 22, 11, 12, 10, 12, 10, 13, 11, 24, 13, 13, 13, 24])
    title(ws_g, "团队／协议询价接受判定 ·《法典》表 G（5×3 矩阵）",
          "输入：团队报价、预期散客 ADR、团队间夜、目标日预测 OCC。输出：比率 R、决策、可接受上限与置换成本。", "N")
    header_row(ws_g, 3, 1, ["询价日期", "客户 / 团队名称", "团队报价", "预期散客 ADR", "团队间夜",
                            "目标日预测 OCC", "比率 R", "比率档", "OCC 档", "决策（表 G）",
                            "可接受上限间数", "团队客房收入", "置换成本", "备注"], height=40)
    freeze(ws_g, "C4")
    G0, G1 = 4, 23
    demos_g = [
        ("杭州某科技公司年会", 560, 680, 40, 0.62),
        ("上海某旅行社华东线", 430, 660, 60, 0.78),
        ("滨江动漫节参展团", 620, 720, 25, 0.93),
        ("某医药公司区域会", 520, 700, 30, 0.71),
        ("网络平台包房商", 380, 640, 80, 0.55),
        ("某高校校友返校", 480, 690, 45, 0.82),
        ("政府事业单位会议", 600, 680, 20, 0.88),
    ]
    for i in range(20):
        r = G0 + i
        if i < len(demos_g):
            nm, quote, adr, nights, occ = demos_g[i]
            d = base + dt.timedelta(days=i)
        else:
            nm, quote, adr, nights, occ, d = (None,) * 5 + (None,)
        wrow(ws_g, r, 1, [
            (d, "i", DATE),
            (nm, "i", None, "left"),
            (quote, "i", MONEY),
            (adr, "i", MONEY),
            (nights, "i", INT),
            (occ, "i", PCT1),
            (f"=IFERROR($C{r}/$D{r},\"\")", "f", PCT1),
            (f'=IF($G{r}="","",IF($G{r}>=0.85,"R≥85%",IF($G{r}>=0.75,"75%≤R<85%",'
             f'IF($G{r}>=0.65,"65%≤R<75%",IF($G{r}>=0.55,"55%≤R<65%","R<55%")))))', "f"),
            (f'=IF($F{r}="","",IF($F{r}<0.7,"<70%",IF($F{r}<=0.85,"70-85%",">85%")))', "f"),
            (f'=IF(OR($G{r}="",$F{r}=""),"",'
             f'IF($G{r}>=0.85,IF($F{r}<0.7,"接受",IF($F{r}<=0.85,"接受","接受（≤10 间）")),'
             f'IF($G{r}>=0.75,IF($F{r}<0.7,"接受",IF($F{r}<=0.85,"接受（≤20 间）","上报 L3")),'
             f'IF($G{r}>=0.65,IF($F{r}<0.7,"接受（≤30 间）",IF($F{r}<=0.85,"上报 L3","拒绝")),'
             f'IF($G{r}>=0.55,IF($F{r}<0.7,"上报 L3","拒绝"),"拒绝")))))', "f", None, "left"),
            (f'=IF($G{r}="","",IF(AND($G{r}>=0.85,$F{r}>0.85),10,'
             f'IF(AND($G{r}>=0.75,$F{r}>=0.7,$F{r}<=0.85),20,'
             f'IF(AND($G{r}>=0.65,$F{r}<0.7),30,'
             f'IF(OR($J{r}="拒绝",$J{r}="上报 L3"),0,$E{r})))))', "f", INT),
            (f"=IFERROR($C{r}*$E{r},\"\")", "f", MONEY),
            (f"=IFERROR($E{r}*($D{r}-$C{r}),\"\")", "f", MONEY),
            (None, "i", None, "left"),
        ])
    dv_date(ws_g, f"A{G0}:A{G1}")
    dv_num(ws_g, f"F{G0}:F{G1}", 0, 1)
    for txt, col, bgc in [("接受", TEAL, TEAL_LIGHT), ("上报 L3", AMBER, AMBER_LIGHT), ("拒绝", RED, RED_LIGHT)]:
        cf_rule(ws_g, f"J{G0}:J{G1}", f'ISNUMBER(SEARCH("{txt}",$J{G0}))', col, bgc)

    r = G1 + 2
    r = section(ws_g, r, "《法典》表 G · 团队/协议询价接受判定矩阵（5×3）", "N")
    r = header_row(ws_g, r, 1, ["比率 R ＼ 预测 OCC", "<70%", "70–85%", ">85%", "", "", "", "", "", "", "", "", "", ""], height=24)
    matrix_g = [
        ("R ≥ 85%", "接受", "接受", "接受（≤10 间）"),
        ("75% ≤ R < 85%", "接受", "接受（≤20 间）", "上报 L3"),
        ("65% ≤ R < 75%", "接受（≤30 间）", "上报 L3", "拒绝"),
        ("55% ≤ R < 65%", "上报 L3", "拒绝", "拒绝"),
        ("R < 55%", "拒绝", "拒绝", "拒绝"),
    ]
    for m in matrix_g:
        wrow(ws_g, r, 1, [(m[0], "r", None, "left"), (m[1], "r"), (m[2], "r"), (m[3], "r")] + [(None, "r")] * 10)
        r += 1
    r += 1
    for line in ["置换成本 = 被挤占房晚数 ×（预期散客 ADR − 团队价）+ 被挤占的餐饮/其他边际收益（供 L3 复核）",
                 "全服务酒店附加条款（会议团队专属）：综合贡献 = 客房收入 + 餐饮收入 + 会场租金 + 其他；"
                 "若综合贡献 ≥（占用房晚 × 预期散客 ADR × 85%），则即使 R<55% 也可接受，但须 L3 审批并记入《团队决策档案》（见「会议综合贡献」页）",
                 "决策顺序：先问餐饮/宴会承接能力 → 再算综合贡献 → 最后查表 G 客房比率"]:
        ws_g.merge_cells(f"A{r}:N{r}")
        put(ws_g, f"A{r}", line, "r", None, "left", wrap=True, border=False)
        ws_g.row_dimensions[r].height = 30
        r += 1

    # ---------------- 会议综合贡献
    ws_k.sheet_view.showGridLines = False
    set_widths(ws_k, [22, 12, 12, 11, 11, 12, 12, 11, 11, 11, 12, 12, 12, 12, 11, 12, 11, 11, 11, 30, 12])
    title(ws_k, "会议／宴会综合贡献 ·《法典》表 K + 表 G 附加条款",
          "输入：规模、占用房晚、团队房价、餐饮收入、餐饮毛利率、会场租金、其他、预期散客 ADR。输出：综合贡献、接受底线与建议。", "U")
    header_row(ws_k, 3, 1, ["会议名称", "日期", "规模", "占用房晚", "团队房价", "客房收入", "餐饮收入",
                            "餐饮毛利率", "餐饮毛利", "会场租金", "其他收入", "综合贡献", "预期散客 ADR",
                            "客房置换成本", "底线系数", "接受底线", "是否达标", "餐饮保底", "保底达标",
                            "建议", "L3 审批"], height=42)
    freeze(ws_k, "C4")
    K0, K1 = 4, 15
    # 表 K 参数块
    PK = K1 + 3
    put(ws_k, f"A{PK - 1}", "《法典》表 K · 会议/宴会综合收益联动表（参考区，勿改）", "s", None, "left", border=False)
    ws_k[f"A{PK - 1}"].font = Font(name=FONT, size=11, bold=True, color=NAVY)
    header_row(ws_k, PK, 1, ["会议规模", "人数", "客房需求", "餐饮保底", "接受底线（综合贡献）", "底线系数（计算用）"] +
               [None] * 15, height=26)
    for i, ms in enumerate(MEETING_SCALE):
        wrow(ws_k, PK + 1 + i, 1, [(ms[0], "r"), (ms[1], "r"), (ms[2], "r"), (ms[3], "r", MONEY),
                                   (ms[4], "r", None, "left"), (ms[4], "r", NUM1)] + [(None, "r")] * 15)
    PK0, PK1 = PK + 1, PK + 4

    demos_k = [
        ("某科技公司季度会", "中型", 42, 560, 68000, 0.62, 18000, 3000, 680),
        ("医药全国经销商大会", "大型", 96, 600, 168000, 0.58, 45000, 12000, 700),
        ("校友返校小型聚会", "小型", 12, 520, 12000, 0.60, 4000, 0, 650),
        ("国际论坛分会场", "超大型", 165, 620, 320000, 0.55, 60000, 25000, 720),
    ]
    for i in range(12):
        r = K0 + i
        if i < len(demos_k):
            nm, scale, nights, price, fnb, gm, rent, other, adr = demos_k[i]
            d = base + dt.timedelta(days=i * 7)
        else:
            nm, scale, nights, price, fnb, gm, rent, other, adr, d = (None,) * 9 + (None,)
        wrow(ws_k, r, 1, [
            (nm, "i", None, "left"),
            (d, "i", DATE),
            (scale, "i"),
            (nights, "i", INT),
            (price, "i", MONEY),
            (f"=IFERROR($D{r}*$E{r},\"\")", "f", MONEY),
            (fnb, "i", MONEY),
            (gm, "i", PCT1),
            (f"=IFERROR($G{r}*$H{r},\"\")", "f", MONEY),
            (rent, "i", MONEY),
            (other, "i", MONEY),
            (f"=IFERROR($F{r}+$G{r}+$J{r}+$K{r},\"\")", "f", MONEY),
            (adr, "i", MONEY),
            (f"=IFERROR($D{r}*$M{r},\"\")", "f", MONEY),
            (f'=IFERROR(VLOOKUP($C{r},$A${PK0}:$F${PK1},6,FALSE),"")', "f", NUM1),
            (f"=IFERROR($N{r}*$O{r},\"\")", "f", MONEY),
            (f'=IF(OR($L{r}="",$P{r}=""),"",IF($L{r}>=$P{r},"达标","未达标"))', "f"),
            (f'=IFERROR(VLOOKUP($C{r},$A${PK0}:$F${PK1},4,FALSE),"")', "f", MONEY),
            (f'=IF(OR($G{r}="",$R{r}=""),"",IF($G{r}>=$R{r},"达标","未达标"))', "f"),
            (f'=IF($Q{r}="","",'
             f'IF($Q{r}="未达标",IF($H{r}<0.55,"拒绝（未达底线且毛利率不足）","拒绝（未达综合贡献底线）"),'
             f'IF($H{r}<0.55,"可接受（餐饮毛利率<55%，须 L3 审批）",'
             f'IF($C{r}="超大型","接受（须 L3/业主审批）","接受"))))', "f", None, "left"),
            (f'=IF($Q{r}="","",IF(OR($H{r}<0.55,$C{r}="超大型"),"是","否"))', "f"),
        ])
    dv_list(ws_k, f"C{K0}:C{K1}", [m[0] for m in MEETING_SCALE])
    dv_num(ws_k, f"H{K0}:H{K1}", 0, 1)
    dv_date(ws_k, f"B{K0}:B{K1}")
    cf_rule(ws_k, f"Q{K0}:Q{K1}", f'EXACT($Q{K0},"达标")', TEAL, TEAL_LIGHT)
    cf_rule(ws_k, f"Q{K0}:Q{K1}", f'EXACT($Q{K0},"未达标")', RED, RED_LIGHT)
    cf_rule(ws_k, f"S{K0}:S{K1}", f'EXACT($S{K0},"达标")', TEAL, TEAL_LIGHT)
    cf_rule(ws_k, f"S{K0}:S{K1}", f'EXACT($S{K0},"未达标")', RED, RED_LIGHT)
    cf_rule(ws_k, f"H{K0}:H{K1}", "$H4<0.55", RED, RED_LIGHT)
    cf_rule(ws_k, f"U{K0}:U{K1}", f'EXACT($U{K0},"是")', RED, RED_LIGHT)
    cf_rule(ws_k, f"U{K0}:U{K1}", f'EXACT($U{K0},"否")', TEAL, TEAL_LIGHT)

    # ---------------- 说明
    write_intro(ws_intro, "08", "超额预订计算器",
                ["对应课程 M07《库存与限制条件战术》与 M10《客源细分战略》，实现《法典》表 E、表 G、表 K 三张表。",
                 "「超售计算」页：输入 No-show 率与 24h 取消率，自动查表 E 得基准超售率，乘四个修正系数，再过两道硬上限，输出最终超售间数。",
                 "「历史取消率」页：30 天历史，自动算出近 30 天平均 No-show 率与取消率，是超售参数的来源。",
                 "「团队询价决策」页：输入团队报价与预期散客 ADR，自动算比率 R 并查表 G 的 5×3 矩阵，输出决策与可接受上限。",
                 "「会议综合贡献」页：算会议的综合贡献，对照表 K 的接受底线，输出是否接受与是否需要 L3 审批。"],
                [
                    ("超售 B-E", "可售房量 / 两个率", "输入", "—", "合计率＝No-show 率 + 24h 取消率"),
                    ("超售 F", "基准超售率", "公式", "表 E 第一步六档", "<5%→0；5-10%→2%；10-15%→3%；15-20%→5%；20-30%→7%；>30%→10%"),
                    ("超售 G-L", "四个修正条件", "输入", "D1/D2 日、担保占比>60%、会议>40%、协议>50%", "连乘：0.5 / 0.5 / 0.5 / 0.8"),
                    ("超售 M", "修正后超售率", "公式", "= 基准 × 修正系数 ×（无备用酒店则 ×0.5）", ""),
                    ("超售 N-P", "超售间数", "公式", "= FLOOR(可售 × 率,1)，再 MIN(≤可售5%, ≤15)", "表 E 第三步硬上限"),
                    ("超售 Q", "L3 审批", "公式", "基准率 10% 或 ≥10 间 → 是", ""),
                    ("团队 G", "比率 R", "公式", "= 团队报价 ÷ 预期散客 ADR", "表 G 输入 1"),
                    ("团队 J-K", "决策 / 上限", "公式", "嵌套 IF 实现 5×3 矩阵", "接受 / 限额接受 / 上报 L3 / 拒绝"),
                    ("团队 M", "置换成本", "公式", "= 团队间夜 ×（预期散客 ADR − 团队价）", "供 L3 复核，未含餐饮边际"),
                    ("会议 L", "综合贡献", "公式", "= 客房 + 餐饮 + 会场租金 + 其他", "表 G 附加条款"),
                    ("会议 N-P", "置换成本 / 底线", "公式", "= 占用房晚 × 预期散客 ADR × 表 K 系数", "小型 1.1 / 中型 1.0 / 大型 0.95 / 超大型 0.9"),
                    ("会议 T-U", "建议 / L3 审批", "公式", "综合贡献 vs 底线 + 餐饮毛利率 <55% 红线", ""),
                ],
                ["先在「历史取消率」页填 30 天的预订数、No-show 数、24h 取消数，读底部「近 30 天平均」的合计率。",
                 "把合计率抄到「超售计算」页的 C、D 列（或直接分拆填入），填可售房量与四个修正条件、备用酒店情况。",
                 "读 P 列最终超售间数；Q 列显示「是」的须报 L3 审批后方可执行。",
                 "团队询价来了：在「团队询价决策」页填报价、预期散客 ADR、间夜、目标日预测 OCC，读 J 列决策与 K 列可接受上限。",
                 "若 J 列为「拒绝」但客户是会议团队，转「会议综合贡献」页算综合贡献；达标则即使 R<55% 也可接受，但须 L3 审批。",
                 "所有超售与团队决策须写入 04 号《调价台账》（触发判定表选「表E」或「表G」）。"],
                ["表 E · 超额预订标准表 —— 三步法已用公式完整实现，并内嵌原文作参考。",
                 "表 G · 团队/协议询价接受判定表 —— 5×3 矩阵用嵌套 IF 实现，另附置换成本公式。",
                 "表 K · 会议/宴会综合收益联动表 —— 参数块内嵌，接受底线 = 客房置换成本 × 规模系数。",
                 "表 L · 异常事件应急 —— 超售过度（到店无房）时启动《步行客人预案》四条补偿包。",
                 "表 O · 决策优先级 —— 表 E（库存安全）优先级 2，高于表 A（价格）。"],
                lede="超售不是赌运气，是把历史的取消率算清楚之后的一次有把握的冒险。")

    wb.save(path)
    return wb
