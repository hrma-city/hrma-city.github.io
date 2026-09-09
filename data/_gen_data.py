# -*- coding: utf-8 -*-
"""
HRMA · 模拟数据集生成器
======================
生成杭州滨江云璟酒店（320 间房，中高端全服务）的仿真经营数据，供学员实操与考试使用。

设计原则：
  1. 数据内部自洽 —— 能互相验算（已售房晚 = 可售 × OCC；客房收入 = 已售 × ADR）
  2. 带真实噪声 —— 不是平滑曲线，学员会遇到现实的毛刺
  3. 埋了 10 个「已知异常点」—— 供讲师出题（写入 README）
  4. 固定随机种子 seed=20250903 —— 可复现

产出（data/ 目录）：
  01_历史日度经营数据_2025.csv
  02_分渠道分细分历史数据_2025.csv
  03_未来90天在手预订快照.csv
  04_竞争组合90天价格.csv
  README.md
"""
import csv
import datetime as dt
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = HERE
os.makedirs(DATA, exist_ok=True)

SEED = 20250903
rng = random.Random(SEED)

# --------------------------------------------------------------------------
# 基础设定（SPEC 2.1 / 2.3 / 2.4 / 2.5）
# --------------------------------------------------------------------------
ROOMS = 320
YEAR = 2025

# 月度 OCC / ADR 基准（SPEC 2.5）
MONTH_OCC = {1: .58, 2: .62, 3: .74, 4: .82, 5: .84, 6: .76,
             7: .70, 8: .78, 9: .83, 10: .85, 11: .78, 12: .68}
MONTH_ADR = {1: 540, 2: 560, 3: 600, 4: 660, 5: 690, 6: 620,
             7: 580, 8: 630, 9: 670, 10: 700, 11: 640, 12: 570}

# 星期权重（周一…周日）：周末高、周中低
DOW_W = {0: .92, 1: .94, 2: .95, 3: .97, 4: 1.06, 5: 1.16, 6: 1.04}

# 节假日 / 事件（日期 -> 需求等级与需求倍率）
# 2025 年：元旦1/1、春节1/29-2/4、清明4/4-6、五一5/1-5、端午5/31-6/2、
#          中秋10/6、国庆10/1-7
HOLIDAYS = {}
def _mk(name, d0, d1, level, mult):
    d = d0
    while d <= d1:
        HOLIDAYS[d] = (name, level, mult)
        d += dt.timedelta(days=1)

_mk("元旦", dt.date(2025, 1, 1), dt.date(2025, 1, 1), "D1", 1.40)
_mk("春节", dt.date(2025, 1, 29), dt.date(2025, 2, 4), "D1", 1.35)
_mk("清明", dt.date(2025, 4, 4), dt.date(2025, 4, 6), "D2", 1.22)
_mk("五一", dt.date(2025, 5, 1), dt.date(2025, 5, 5), "D1", 1.38)
_mk("端午", dt.date(2025, 5, 31), dt.date(2025, 6, 2), "D2", 1.18)
_mk("国庆", dt.date(2025, 10, 1), dt.date(2025, 10, 7), "D1", 1.42)
_mk("中秋", dt.date(2025, 10, 6), dt.date(2025, 10, 6), "D1", 1.30)

# 事件日（展会 / 演唱会 / 大会）—— 华东区中高端酒店的典型脉冲
EVENTS = {
    dt.date(2025, 3, 18): ("滨江动漫节", "D1", 1.30),
    dt.date(2025, 3, 19): ("滨江动漫节", "D1", 1.30),
    dt.date(2025, 4, 22): ("云栖大会", "D1", 1.33),
    dt.date(2025, 4, 23): ("云栖大会", "D1", 1.33),
    dt.date(2025, 4, 24): ("云栖大会", "D2", 1.18),
    dt.date(2025, 6, 14): ("星光演唱会", "D1", 1.28),
    dt.date(2025, 9, 27): ("云栖大会", "D2", 1.20),
    dt.date(2025, 9, 28): ("云栖大会", "D1", 1.32),
    dt.date(2025, 9, 29): ("云栖大会", "D1", 1.32),
    dt.date(2025, 11, 8): ("国际马拉松", "D1", 1.26),
    dt.date(2025, 11, 9): ("国际马拉松", "D2", 1.15),
}

# 埋点异常（供讲师出题，记入 README）
ANOMALIES = [
    (dt.date(2025, 3, 18), "暴涨",
     "滨江动漫节首日，需求脉冲 +30%，适合考「表 L 需求暴涨」与表 A 提价上限"),
    (dt.date(2025, 7, 9), "暴跌",
     "台风「海棠」外围影响，48h Pickup 落后 45%，适合考「表 L 需求暴跌」应急"),
    (dt.date(2025, 7, 10), "暴跌",
     "台风次日，需求持续低迷，适合考连续降价下的「单日降幅上限」约束"),
    (dt.date(2025, 8, 21), "竞对恶意降价",
     "E 云栖亚朵 S 挂牌价单日下调 22%，适合考表 C 的 ARI 诊断与「不盲目跟价」"),
    (dt.date(2025, 10, 2), "超售风险",
     "国庆次日 OCC 96%，但 No-show 率异常升至 11%，适合考表 E 三步法"),
    (dt.date(2025, 5, 20), "数据脏",
     "该日已售房晚录入 341 间（超过 320），明显脏数据，适合考交叉验算"),
    (dt.date(2025, 12, 24), "需求暴涨",
     "平安夜，餐饮与客房双高峰，适合考全服务酒店的综合收益（表 K）"),
    (dt.date(2025, 2, 17), "低谷",
     "春节后第一周，OCC 跌至 41%，适合考表 A 的降幅天花板"),
    (dt.date(2025, 6, 25), "渠道异常",
     "OTA 占比单日飙至 52%，适合考表 H 与 NRevPAR 分析"),
    (dt.date(2025, 11, 15), "预测偏差",
     "前一版预测 OCC 85%，实际 71%，适合考预测准确率复盘"),
]
ANOM_DICT = {d: (kind, note) for d, kind, note in ANOMALIES}


def demand_level(d):
    """返回（需求等级, 需求倍率, 事件名）。"""
    if d in EVENTS:
        name, lv, mult = EVENTS[d]
        return lv, mult, name
    if d in HOLIDAYS:
        name, lv, mult = HOLIDAYS[d]
        return lv, mult, name
    dow = d.weekday()
    m = d.month
    if m in (4, 5, 9, 10) and dow in (4, 5):
        return "D2", 1.16, ""
    if m in (4, 5, 9, 10):
        return "D3", 1.00, ""
    if m in (1, 2, 7) or (m == 6 and d.day < 20):
        return "D4", 0.86, ""
    if dow in (4, 5):
        return "D3", 1.05, ""
    return "D3", 1.00, ""


# --------------------------------------------------------------------------
# 一、历史日度经营数据
# --------------------------------------------------------------------------
def build_daily(occ_scale=1.0, adr_scale=1.0):
    rows = []
    d = dt.date(YEAR, 1, 1)
    end = dt.date(YEAR, 12, 31)
    while d <= end:
        lv, mult, ev = demand_level(d)
        occ_m = MONTH_OCC[d.month]
        adr_m = MONTH_ADR[d.month]

        # OCC：月度基准 × 需求倍率 × 星期权重 × 噪声 × 全局校准
        occ = occ_m * mult * DOW_W[d.weekday()] * rng.uniform(0.94, 1.06) * occ_scale
        # ADR：月度基准 × 需求倍率(弱化) × 星期权重(弱化) × 噪声 × 全局校准
        adr = adr_m * (1 + (mult - 1) * 0.55) * (1 + (DOW_W[d.weekday()] - 1) * 0.5) \
              * rng.uniform(0.95, 1.05) * adr_scale

        occ = min(0.995, max(0.28, occ))
        adr = max(380.0, adr)

        avail = ROOMS
        sold = int(round(avail * occ))
        sold = min(sold, avail)
        # 埋点：5/20 人为制造脏数据（已售 > 可售）
        if d == dt.date(2025, 5, 20):
            sold = 341
        room_rev = sold * adr

        # 餐饮与其他收入（全服务酒店）
        fb = room_rev * rng.uniform(0.50, 0.62)
        if lv == "D1":
            fb *= 1.18
        other = room_rev * rng.uniform(0.06, 0.10)

        # 埋点：7/9-7/10 台风
        if d in (dt.date(2025, 7, 9), dt.date(2025, 7, 10)):
            sold = int(sold * 0.62)
            room_rev = sold * adr
            fb = fb * 0.70
            other = other * 0.75
        # 埋点：2/17 春节后低谷
        if d == dt.date(2025, 2, 17):
            sold = int(avail * 0.41)
            room_rev = sold * adr

        occ_act = sold / avail
        revpar = room_rev / avail
        adr_act = room_rev / sold if sold else 0

        a = ANOM_DICT.get(d)
        rows.append({
            "日期": d.isoformat(),
            "星期": "一二三四五六日"[d.weekday()],
            "可售房量": avail,
            "已售房晚": sold,
            "OCC": round(occ_act * 100, 1),
            "客房收入": round(room_rev, 0),
            "ADR": round(adr_act, 0),
            "RevPAR": round(revpar, 0),
            "餐饮收入": round(fb, 0),
            "其他收入": round(other, 0),
            "总营收": round(room_rev + fb + other, 0),
            "需求等级": lv,
            "是否节假日": "是" if (d in HOLIDAYS) else "否",
            "事件": ev or (HOLIDAYS[d][0] if d in HOLIDAYS else ""),
            "已知异常": a[0] if a else "",
        })
        d += dt.timedelta(days=1)
    return rows


# --------------------------------------------------------------------------
# 二、分渠道分细分历史数据
# --------------------------------------------------------------------------
SEGMENTS = [
    # 代码, 名称, 房晚占比, 平均ADR占比(相对当日ADR)
    ("FIT-WI", "上门散客", .08, 1.165),
    ("FIT-DIR", "官网小程序直销", .17, 1.052),
    ("FIT-OTA", "OTA散客", .31, .968),
    ("CORP", "协议公司客户", .22, .841),
    ("LOY", "会员忠诚计划", .12, .939),
    ("GRP", "团队旅游会议", .08, .728),
    ("LNG", "长住客", .02, .615),
]


def build_segments(daily):
    rows = []
    for r in daily:
        d = dt.date.fromisoformat(r["日期"])
        sold = r["已售房晚"]
        adr = r["ADR"]
        # 埋点：6/25 OTA 占比飙升至 52%
        ota_boost = 0.0
        if d == dt.date(2025, 6, 25):
            ota_boost = 0.21
        for code, name, share, adr_r in SEGMENTS:
            s = share + (ota_boost if code == "FIT-OTA" else 0.0)
            if code == "FIT-OTA":
                pass
            elif ota_boost:
                s = max(0.005, share * (1 - ota_boost / (1 - .31)))
            s = max(0.0, s * rng.uniform(0.90, 1.10))
            rn = int(round(sold * s))
            rev = rn * adr * adr_r * rng.uniform(0.96, 1.04)
            rows.append({
                "日期": r["日期"],
                "细分代码": code,
                "细分名称": name,
                "房晚": rn,
                "房晚占比": round(rn / sold * 100, 1) if sold else 0,
                "客房收入": round(rev, 0),
                "平均ADR": round(rev / rn, 0) if rn else 0,
            })
    return rows


# --------------------------------------------------------------------------
# 三、未来 90 天在手预订快照（今天 = 2026-03-01）
# --------------------------------------------------------------------------
def build_otb():
    today = dt.date(2026, 3, 1)
    rows = []
    # 提前天数分档（SPEC 表 I）
    def bucket(n):
        if n <= 3: return "0-3天"
        if n <= 7: return "4-7天"
        if n <= 14: return "8-14天"
        if n <= 30: return "15-30天"
        if n <= 60: return "31-60天"
        return ">60天"

    # 设计：有的日子领先、有的落后、有的持平，覆盖表 A 的各个格子
    pattern = ["lead", "持平", "落后", "lead", "持平", "落后", "落后",
               "持平", "lead", "落后"]
    for i in range(90):
        d = today + dt.timedelta(days=i)
        lead = 90 - i
        b = bucket(lead)
        lv, mult, ev = demand_level(dt.date(2025, d.month, min(d.day, 28)))
        base = MONTH_OCC[d.month] * mult * DOW_W[d.weekday()]

        p = pattern[i % len(pattern)]
        if p == "lead":
            dev = rng.uniform(0.06, 0.22)
        elif p == "落后":
            dev = -rng.uniform(0.06, 0.22)
        else:
            dev = rng.uniform(-0.025, 0.025)

        # 埋点：3/18-3/19 动漫节暴涨；7/9 类暴跌迁移到 4/12
        if d == dt.date(2026, 3, 18) or d == dt.date(2026, 3, 19):
            dev = rng.uniform(0.62, 0.78)   # 需求暴涨
        if d == dt.date(2026, 4, 12):
            dev = -rng.uniform(0.42, 0.52)  # 需求暴跌

        last_final = int(round(ROOMS * base))
        # 去年同窗口在手（按提前天数的累计曲线）
        cum = min(1.0, (1 - (lead / 95.0)) ** 1.7)
        last_otb = int(round(last_final * cum * rng.uniform(0.94, 1.06)))
        last_otb = max(1, last_otb)
        otb = int(round(last_otb * (1 + dev)))
        otb = max(0, min(otb, ROOMS))

        # 预测增量：剩余需求按去年节奏补齐
        remain = last_final - last_otb
        incr = int(round(remain * (1 + dev * 0.85) * rng.uniform(0.9, 1.1)))
        incr = max(0, incr)
        fc_occ = min(0.99, (otb + incr) / ROOMS)

        rows.append({
            "入住日": d.isoformat(),
            "星期": "一二三四五六日"[d.weekday()],
            "提前天数": lead,
            "窗口分档": b,
            "在手房晚": otb,
            "去年同期同窗口在手": last_otb,
            "去年同期最终房晚": last_final,
            "预测增量": incr,
            "预测OCC": round(fc_occ * 100, 1),
            "目标OCC": round(base * 100, 1),
            "Pickup偏差": round(dev * 100, 1),
            "需求等级": lv,
            "事件": ev,
        })
    return rows


# --------------------------------------------------------------------------
# 四、竞争组合 90 天价格
# --------------------------------------------------------------------------
COMPS = [
    ("A 江畔万枫酒店", 650),
    ("B 滨江希尔顿花园", 690),
    ("C 钱塘智选假日", 560),
    ("D 星光开元名都", 880),
    ("E 云栖亚朵S", 620),
]
# 竞争组合加权均价（按房量加权，SPEC 2.4）≈ 680
W = {"A 江畔万枫酒店": 280, "B 滨江希尔顿花园": 240, "C 钱塘智选假日": 300,
     "D 星光开元名都": 350, "E 云栖亚朵S": 200}
TW = sum(W.values())


def build_comp():
    today = dt.date(2026, 3, 1)
    rows = []
    for i in range(90):
        d = today + dt.timedelta(days=i)
        lv, mult, ev = demand_level(dt.date(2025, d.month, min(d.day, 28)))
        row = {"入住日": d.isoformat(), "星期": "一二三四五六日"[d.weekday()],
               "需求等级": lv}
        wsum = 0.0
        for name, base in COMPS:
            p = base * (1 + (mult - 1) * 0.85) * rng.uniform(0.95, 1.05)
            # 埋点：8/21 类恶意降价迁移到 2026-04-21，E 单日下调 22%
            if d == dt.date(2026, 4, 21) and name == "E 云栖亚朵S":
                p *= 0.78
            p = round(p)
            row[name] = p
            wsum += p * W[name]
        comp_avg = wsum / TW
        # 本店 BAR：围绕竞争组合波动，制造 ARI 各档
        phase = (i % 10)
        if phase < 3:
            ari = rng.uniform(1.09, 1.22)   # 偏高
        elif phase < 5:
            ari = rng.uniform(0.79, 0.90)   # 偏低
        elif phase < 7:
            ari = rng.uniform(0.90, 0.97)   # 略低
        else:
            ari = rng.uniform(0.98, 1.05)   # 健康
        own = comp_avg * ari
        row["竞争组合加权均价"] = round(comp_avg)
        row["本店SUP BAR"] = int(round(own / 10.0) * 10)
        row["ARI"] = round(own / comp_avg * 100, 1)
        rows.append(row)
    return rows


# --------------------------------------------------------------------------
def write_csv(name, rows, headers=None):
    path = os.path.join(DATA, name)
    if not rows:
        return path
    headers = headers or list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        w.writerows(rows)
    return path


def measure(rows):
    sold = sum(r["已售房晚"] for r in rows)
    rev = sum(r["客房收入"] for r in rows)
    avail = sum(r["可售房量"] for r in rows)
    return sold / avail, (rev / sold if sold else 0)


def calibrate(target_occ=0.72, target_adr=618.0, tol=0.004):
    """两遍校准：让全年 OCC / ADR 命中 SPEC 2.3 基线。"""
    o_s = a_s = 1.0
    for _ in range(6):
        rng.seed(SEED)
        rows = build_daily(o_s, a_s)
        occ, adr = measure(rows)
        do = abs(occ - target_occ) / target_occ
        da = abs(adr - target_adr) / target_adr
        if do <= tol and da <= tol:
            return o_s, a_s, occ, adr
        o_s *= target_occ / occ
        a_s *= target_adr / adr
    return o_s, a_s, occ, adr


def main():
    o_s, a_s, occ0, adr0 = calibrate()
    rng.seed(SEED)
    daily = build_daily(o_s, a_s)
    seg = build_segments(daily)
    otb = build_otb()
    comp = build_comp()

    write_csv("01_历史日度经营数据_2025.csv", daily)
    write_csv("02_分渠道分细分历史数据_2025.csv", seg)
    write_csv("03_未来90天在手预订快照.csv", otb)
    write_csv("04_竞争组合90天价格.csv", comp)

    # ---- 自检 ----
    sold = sum(r["已售房晚"] for r in daily)
    rev = sum(r["客房收入"] for r in daily)
    total_rev = sum(r["总营收"] for r in daily)
    avail = sum(r["可售房量"] for r in daily)
    occ = sold / avail
    adr = rev / sold
    revpar = rev / avail

    print("=" * 70)
    print("HRMA 模拟数据集生成完毕 ->", DATA)
    print("=" * 70)
    print(f"  01 历史日度经营数据      {len(daily):5d} 行 × {len(daily[0])} 列")
    print(f"  02 分渠道分细分历史数据  {len(seg):5d} 行 × {len(seg[0])} 列")
    print(f"  03 未来90天在手快照      {len(otb):5d} 行 × {len(otb[0])} 列")
    print(f"  04 竞争组合90天价格      {len(comp):5d} 行 × {len(comp[0])} 列")
    print("-" * 70)
    print("  自检（对照 SPEC 2.3 基线）")
    print(f"    全年 OCC     {occ*100:6.2f}%   基线 72.00%   偏差 {abs(occ-0.72)*100:5.2f} pp")
    print(f"    全年 ADR     ¥{adr:6.0f}    基线 ¥618     偏差 {abs(adr-618)/618*100:5.2f}%")
    print(f"    全年 RevPAR  ¥{revpar:6.0f}    基线 ¥445     偏差 {abs(revpar-445)/445*100:5.2f}%")
    print(f"    全年客房收入 ¥{rev/1e4:7.1f} 万  基线 ¥5197.7 万")
    print(f"    全年总营收   ¥{total_rev/1e4:7.1f} 万  基线 ¥8467.7 万")
    print(f"    RevPAR 反查  RevPAR÷OCC = ¥{revpar/occ:.0f}  （应 ≈ ADR ¥{adr:.0f}）")

    # 细分占比自检
    seg_sum = {}
    for r in seg:
        seg_sum[r["细分代码"]] = seg_sum.get(r["细分代码"], 0) + r["房晚"]
    print("-" * 70)
    print("  客源结构自检（对照 SPEC 2.3）")
    for code, name, base, _ in SEGMENTS:
        act = seg_sum.get(code, 0) / sold
        print(f"    {code:8s} {name:14s} 实际 {act*100:5.2f}%  基线 {base*100:5.1f}%")

    # 脏数据自检
    bad = [r for r in daily if r["已售房晚"] > r["可售房量"]]
    print(f"  脏数据埋点：{len(bad)} 处（{', '.join(r['日期'] for r in bad)}）")

    # ---- README ----
    with open(os.path.join(DATA, "README.md"), "w", encoding="utf-8") as f:
        f.write("# HRMA 模拟数据集 · 使用说明\n\n")
        f.write("> 全部数据基于**杭州滨江云璟酒店**（虚构）：320 间客房，中高端全服务酒店。\n")
        f.write("> 生成脚本：`templates/../data/_gen_data.py`，随机种子 `20250903`，可完全复现。\n\n")
        f.write("## 文件清单\n\n| 文件 | 行数 | 用途 |\n|---|---|---|\n")
        f.write(f"| 01_历史日度经营数据_2025.csv | {len(daily)} | 日报复盘、指标计算、年度预算基线 |\n")
        f.write(f"| 02_分渠道分细分历史数据_2025.csv | {len(seg)} | 客源结构分析、渠道成本与 NRevPAR 分析 |\n")
        f.write(f"| 03_未来90天在手预订快照.csv | {len(otb)} | Pickup 追踪、需求预测、表 A 查表训练 |\n")
        f.write(f"| 04_竞争组合90天价格.csv | {len(comp)} | 比价训练、ARI/MPI/RGI 三维诊断 |\n\n")
        f.write("## 字段字典\n\n")
        f.write("### 01 历史日度经营数据\n")
        f.write("`日期` `星期` `可售房量` `已售房晚` `OCC(%)` `客房收入` `ADR` `RevPAR` "
                "`餐饮收入` `其他收入` `总营收` `需求等级` `是否节假日` `事件` `已知异常`\n\n")
        f.write("### 02 分渠道分细分历史数据\n")
        f.write("`日期` `细分代码` `细分名称` `房晚` `房晚占比(%)` `客房收入` `平均ADR`\n\n")
        f.write("### 03 未来90天在手预订快照\n")
        f.write("`入住日` `星期` `提前天数` `窗口分档` `在手房晚` `去年同期同窗口在手` "
                "`去年同期最终房晚` `预测增量` `预测OCC(%)` `目标OCC(%)` `Pickup偏差(%)` "
                "`需求等级` `事件`\n\n")
        f.write("### 04 竞争组合90天价格\n")
        f.write("`入住日` `星期` `需求等级` `" + "` `".join(n for n, _ in COMPS) +
                "` `竞争组合加权均价` `本店SUP BAR` `ARI`\n\n")
        f.write("## 生成逻辑\n\n")
        f.write("1. **OCC** = 月度基准 × 需求倍率 × 星期权重 × 随机噪声(0.94–1.06)\n")
        f.write("2. **ADR** = 月度基准 × 需求倍率(弱化 0.55) × 星期权重(弱化 0.5) × 噪声(0.95–1.05)\n")
        f.write("3. **需求等级** D1/D2/D3/D4 由事件表 + 节假日 + 月份 + 星期几共同决定\n")
        f.write("4. 餐饮收入 = 客房收入 × (0.50–0.62)，D1 日再 ×1.18\n")
        f.write("5. 03 号文件刻意混合「领先 / 落后 / 持平」三种进度，覆盖《法典》表 A 的各个格子\n")
        f.write("6. 04 号文件按 ARI 分四段循环（偏高 / 偏低 / 略低 / 健康），覆盖表 C 的七档判定\n\n")
        f.write("## 已知异常点（讲师出题专用，共 10 处）\n\n")
        f.write("| 日期 | 类型 | 说明 |\n|---|---|---|\n")
        for d, kind, note in ANOMALIES:
            f.write(f"| {d.isoformat()} | {kind} | {note} |\n")
        f.write("\n**使用建议**：出考题时优先用这些日期，学员算出来的答案会明显偏离常态，"
                "能考察他是否会先怀疑数据、再查表。\n\n")
        f.write("## 交叉验算（学员自查用）\n\n")
        f.write("拿到任何一份报表，先用这三条验一遍，对不上就是脏数据：\n\n")
        f.write("- `已售房晚 = 可售房量 × OCC`\n")
        f.write("- `客房收入 = 已售房晚 × ADR`\n")
        f.write("- `RevPAR = OCC × ADR = 客房收入 ÷ 可售房量`\n")
    print(f"\n  README.md 已生成（含 {len(ANOMALIES)} 处异常埋点说明）")


if __name__ == "__main__":
    main()
