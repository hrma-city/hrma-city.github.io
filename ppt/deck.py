# -*- coding: utf-8 -*-
"""
HRMA 酒店收益管理学院 · 讲师版 PPT 生成框架
================================================
版式与配色严格遵循 hrma/SPEC.md 第七章视觉规范。
对外只暴露 Deck 类与若干内容辅助函数；所有页面元素均限制在 16:9 画布内。
"""

import math

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

# --------------------------------------------------------------------------
# 一、配色（SPEC 7.1）
# --------------------------------------------------------------------------
NAVY = "1B3A5C"   # 主色
NAVY2 = "2C5282"  # 次级蓝
GOLD = "B8894A"   # 强调金
GOLD_SOFT = "F5EDE0"
TEAL = "2E7D74"   # 辅助青绿：正向/通过
GREEN = "2F7A3E"  # 跌/下降
RED = "C0392B"    # 涨/提升、警告
AMBER = "D98324"  # 警示
INK = "1F2933"    # 正文
INK2 = "52606D"   # 次要
LINE = "E1E5EA"   # 边框
BG = "FAFAF8"     # 页面背景
BG2 = "F2F0EB"    # 卡片浅底
WHITE = "FFFFFF"

# 字体（SPEC 7.2）
F_EA = "微软雅黑"     # 中文
F_LAT = "Arial"       # 英文/数字

# --------------------------------------------------------------------------
# 二、画布几何
# --------------------------------------------------------------------------
SW = 13.3333          # slide width  (in)
SH = 7.5              # slide height (in)
ML = 0.62             # 左边距
MR = 0.62             # 右边距
CW = SW - ML - MR     # 内容宽度 12.0933
BODY_TOP = 1.52       # 内容区起始
BODY_BOT = 6.74       # 内容区结束
FOOT_Y = 6.90


def _c(hexstr):
    return RGBColor.from_string(hexstr)


# --------------------------------------------------------------------------
# 三、底层工具
# --------------------------------------------------------------------------
def _set_run_font(run, size, color, bold=False, italic=False,
                  latin=F_LAT, ea=F_EA):
    """同时设置拉丁字体与东亚字体，保证中文在 Windows/macOS 上都正确落字。"""
    f = run.font
    f.size = Pt(size)
    f.bold = bold
    f.italic = italic
    f.color.rgb = _c(color)
    f.name = latin
    rPr = run._r.get_or_add_rPr()
    for tag, face in (("a:ea", ea), ("a:cs", latin)):
        el = rPr.find(qn(tag))
        if el is None:
            el = rPr.makeelement(qn(tag), {})
            rPr.insert_element_before(
                el, "a:sym", "a:hlinkClick", "a:hlinkMouseOver",
                "a:rtl", "a:extLst",
            )
        el.set("typeface", face)


def est_lines(text, width_in, pt):
    """估算文本在给定宽度下的行数（CJK 按 1.0 em、ASCII 按 0.56 em）。"""
    if not text:
        return 1
    limit = max(width_in * 72.0, 1.0)
    total = 0
    for para in str(text).split("\n"):
        cur = 0.0
        for ch in para:
            cur += pt * (1.0 if ord(ch) > 0x2E80 else 0.56)
        total += max(1, int(math.ceil(cur / limit)))
    return total


def fit_pt(text, width_in, height_in, base, minimum, spacing=1.30):
    """按可用宽高把字号从 base 逐级压到 minimum，返回可容纳的字号。"""
    pt = base
    while pt > minimum:
        if est_lines(text, width_in, pt) * pt * spacing <= (height_in * 72.0):
            return pt
        pt -= 1
    return minimum


class _Box:
    """薄封装：一个文本框 = 位置 + 若干段落。"""

    def __init__(self, slide, x, y, w, h, anchor=MSO_ANCHOR.TOP,
                 align=PP_ALIGN.LEFT):
        self.shape = slide.shapes.add_textbox(
            Inches(x), Inches(y), Inches(w), Inches(h))
        tf = self.shape.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = Inches(0.0)
        tf.margin_top = tf.margin_bottom = Inches(0.0)
        tf.vertical_anchor = anchor
        self.tf = tf
        self.align = align
        self._first = True

    def para(self, text, size, color, bold=False, space_after=0,
             space_before=0, line=1.28, align=None, latin=F_LAT):
        p = self.tf.paragraphs[0] if self._first else self.tf.add_paragraph()
        self._first = False
        p.alignment = align or self.align
        p.line_spacing = line
        p.space_after = Pt(space_after)
        p.space_before = Pt(space_before)
        run = p.add_run()
        run.text = str(text)
        _set_run_font(run, size, color, bold=bold, latin=latin)
        return p

    def rich(self, segments, size, color, space_after=0, space_before=0,
             line=1.28, align=None):
        """segments: [(text, {bold/color/size}), ...] 用于同段落多样式（涨跌标色）。"""
        p = self.tf.paragraphs[0] if self._first else self.tf.add_paragraph()
        self._first = False
        p.alignment = align or self.align
        p.line_spacing = line
        p.space_after = Pt(space_after)
        p.space_before = Pt(space_before)
        for text, opt in segments:
            run = p.add_run()
            run.text = str(text)
            _set_run_font(run, opt.get("size", size),
                          opt.get("color", color),
                          bold=opt.get("bold", False))
        return p


# --------------------------------------------------------------------------
# 四、讲师备注辅助
# --------------------------------------------------------------------------
def N(minutes, opening, example, ask, pitfall, extra=None):
    """统一格式的讲师备注。"""
    parts = [
        "【本页讲授时长】%s" % minutes,
        "【开场引入（照读即可）】%s" % opening,
        "【要举的例子】%s" % example,
        "【要问学员的问题】%s" % ask,
        "【容易讲错 / 被问倒的地方】%s" % pitfall,
    ]
    if extra:
        parts.append("【补充】%s" % extra)
    return "\n".join(parts)


# --------------------------------------------------------------------------
# 五、Deck
# --------------------------------------------------------------------------
class Deck:
    """一套讲师版 PPT。"""

    def __init__(self, level, level_name, course_title, weeks, hours):
        self.prs = Presentation()
        self.prs.slide_width = Inches(SW)
        self.prs.slide_height = Inches(SH)
        self.blank = self.prs.slide_layouts[6]
        self.level = level
        self.level_name = level_name
        self.course_title = course_title
        self.weeks = weeks
        self.hours = hours
        self.page = 0
        self.index = []          # (页码, 版式, 标题) 供自检与手册使用

    # ---------- 基础绘制 ----------
    def _slide(self, bgcolor=BG):
        s = self.prs.slides.add_slide(self.blank)
        bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0,
                                Inches(SW), Inches(SH))
        bg.fill.solid()
        bg.fill.fore_color.rgb = _c(bgcolor)
        bg.line.fill.background()
        bg.shadow.inherit = False
        return s

    def _rect(self, s, x, y, w, h, color, rounded=False, radius=0.10,
              line_color=None, line_w=0.75):
        shp = s.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE,
            Inches(x), Inches(y), Inches(w), Inches(h))
        if rounded:
            try:
                shp.adjustments[0] = radius
            except Exception:
                pass
        if color is None:
            shp.fill.background()
        else:
            shp.fill.solid()
            shp.fill.fore_color.rgb = _c(color)
        if line_color:
            shp.line.color.rgb = _c(line_color)
            shp.line.width = Pt(line_w)
        else:
            shp.line.fill.background()
        shp.shadow.inherit = False
        return shp

    def _oval(self, s, x, y, d, color):
        shp = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y),
                                 Inches(d), Inches(d))
        shp.fill.solid()
        shp.fill.fore_color.rgb = _c(color)
        shp.line.fill.background()
        shp.shadow.inherit = False
        return shp

    def _shape_text(self, shp, text, size, color, bold=True,
                    align=PP_ALIGN.CENTER):
        tf = shp.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = Inches(0.04)
        tf.margin_top = tf.margin_bottom = Inches(0.01)
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.alignment = align
        p.line_spacing = 1.0
        run = p.add_run()
        run.text = str(text)
        _set_run_font(run, size, color, bold=bold)

    def _footer(self, s, dark=False):
        self.page += 1
        b = _Box(s, SW - MR - 6.2, FOOT_Y, 6.2, 0.32,
                 anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.RIGHT)
        b.rich([
            ("HRMA · 酒店收益管理学院", {"color": GOLD if dark else INK2,
                                  "bold": False}),
            ("    ", {}),
            ("P%02d" % self.page, {"color": GOLD, "bold": True}),
        ], 9.5, GOLD if dark else INK2, line=1.0)
        return self.page

    def _head(self, s, title, eyebrow=None, rule_y=1.26, title_pt=25.5):
        """内容页统一页头：眉标 + 标题 + 金色短尺 + 浅色长线。"""
        if eyebrow:
            eb = _Box(s, ML, 0.30, CW, 0.26)
            eb.para(eyebrow, 11, GOLD, bold=True, line=1.0)
        ty = 0.58 if eyebrow else 0.46
        pt = fit_pt(title, CW, 0.66, title_pt, 17)
        tb = _Box(s, ML, ty, CW, 0.70, anchor=MSO_ANCHOR.TOP)
        tb.para(title, pt, NAVY, bold=True, line=1.10)
        self._rect(s, ML, rule_y, 1.10, 0.045, GOLD)
        self._rect(s, ML + 1.10, rule_y + 0.016, CW - 1.10, 0.013, LINE)

    def _pill(self, s, text, color, x=ML, y=0.30, w=1.42, h=0.38, size=12.5):
        shp = self._rect(s, x, y, w, h, color, rounded=True, radius=0.30)
        self._shape_text(shp, text, size, WHITE, bold=True)
        return x + w

    def _notes(self, s, notes):
        tf = s.notes_slide.notes_text_frame
        tf.text = notes or ""

    # ---------- 版式 1：封面 ----------
    def cover(self, subtitle, bullets, notes):
        s = self._slide(NAVY)
        # 装饰
        self._rect(s, 0, 0, SW, 0.20, GOLD)
        self._rect(s, 0, SH - 0.10, SW, 0.10, TEAL)
        self._oval(s, SW - 3.4, -1.5, 4.6, NAVY2)
        self._oval(s, SW - 1.9, 4.6, 3.2, "20486B")

        b = _Box(s, ML + 0.10, 1.05, 9.6, 0.4)
        b.para("酒店收益管理学院 · Hotel Revenue Management Academy", 13,
               GOLD, bold=True, line=1.0)

        badge = self._rect(s, ML + 0.10, 1.66, 1.28, 0.52, GOLD,
                           rounded=True, radius=0.22)
        self._shape_text(badge, self.level, 22, WHITE, bold=True)
        lv = _Box(s, ML + 1.58, 1.70, 6.0, 0.46, anchor=MSO_ANCHOR.MIDDLE)
        lv.para("%s 认证课程" % self.level_name, 19, WHITE, bold=True, line=1.0)

        t = _Box(s, ML + 0.10, 2.44, 10.3, 1.5)
        t.para(self.course_title, 43, WHITE, bold=True, line=1.12)

        st = _Box(s, ML + 0.10, 3.98, 10.3, 0.5)
        st.para(subtitle, 16.5, GOLD_SOFT, bold=False, line=1.2)

        self._rect(s, ML + 0.10, 4.66, 3.2, 0.035, GOLD)

        y = 4.96
        for label, val in bullets:
            row = _Box(s, ML + 0.10, y, 10.3, 0.36, anchor=MSO_ANCHOR.MIDDLE)
            row.rich([
                ("%s  " % label, {"color": GOLD, "bold": True, "size": 13}),
                (val, {"color": WHITE, "bold": False, "size": 13.5}),
            ], 13.5, WHITE, line=1.05)
            y += 0.40

        self._footer(s, dark=True)
        self._notes(s, notes)
        self.index.append((self.page, "封面", self.course_title))
        return s

    # ---------- 版式 2：章节分隔页 ----------
    def section(self, code, name, meta, lede, agenda, notes):
        s = self._slide(NAVY)
        self._rect(s, 0, 0, 0.22, SH, GOLD)
        self._rect(s, 0, SH - 0.10, SW, 0.10, TEAL)

        ghost = _Box(s, SW - 5.0, 0.55, 4.5, 3.2, align=PP_ALIGN.RIGHT)
        ghost.para(code, 130, "24486E", bold=True, line=1.0)

        eb = _Box(s, ML + 0.18, 1.28, 8.4, 0.34)
        eb.para(meta, 13, GOLD, bold=True, line=1.0)

        badge = self._rect(s, ML + 0.18, 1.76, 1.42, 0.52, GOLD,
                           rounded=True, radius=0.22)
        self._shape_text(badge, code, 22, WHITE, bold=True)

        t = _Box(s, ML + 0.18, 2.52, 8.6, 1.30)
        t.para(name, fit_pt(name, 8.6, 1.24, 36, 22), WHITE, bold=True,
               line=1.14)

        self._rect(s, ML + 0.18, 3.92, 2.6, 0.035, GOLD)

        ld = _Box(s, ML + 0.18, 4.16, 8.6, 0.86)
        ld.para(lede, fit_pt(lede, 8.6, 0.82, 16, 12), GOLD_SOFT, line=1.34)

        y = 5.16
        for i, item in enumerate(agenda, 1):
            dot = self._oval(s, ML + 0.20, y + 0.045, 0.24, GOLD)
            self._shape_text(dot, str(i), 11, NAVY, bold=True)
            rb = _Box(s, ML + 0.58, y, 8.4, 0.34, anchor=MSO_ANCHOR.MIDDLE)
            rb.para(item, 13.5, WHITE, line=1.05)
            y += 0.40

        self._footer(s, dark=True)
        self._notes(s, notes)
        self.index.append((self.page, "章节页", "%s %s" % (code, name)))
        return s

    # ---------- 版式 3：内容页（概念页） ----------
    def content(self, title, points, eyebrow=None, callout=None, notes="",
                lede=None):
        """points: [(小标题, 正文), ...] 最多 3 个（SPEC：概念页不超过 3 个要点）"""
        assert len(points) <= 3, "概念页要点不得超过 3 个：%s" % title
        s = self._slide()
        self._head(s, title, eyebrow)
        top = BODY_TOP
        bot = BODY_BOT
        if lede:
            lb = _Box(s, ML, top, CW, 0.44)
            lb.para(lede, fit_pt(lede, CW, 0.42, 14.5, 11), INK2, line=1.28)
            top += 0.56
        if callout:
            bot -= 1.02
        n = len(points)
        gap = 0.20
        ch = (bot - top - gap * (n - 1)) / n
        y = top
        for i, (head, body) in enumerate(points, 1):
            self._rect(s, ML, y, CW, ch, BG2, rounded=True, radius=0.055)
            self._rect(s, ML, y, 0.055, ch, GOLD)
            dot = self._oval(s, ML + 0.26, y + 0.24, 0.44, GOLD)
            self._shape_text(dot, str(i), 16, WHITE, bold=True)
            tw = CW - 1.10
            hb = _Box(s, ML + 0.88, y + 0.19, tw, 0.42)
            hb.para(head, fit_pt(head, tw, 0.40, 17.5, 13), NAVY, bold=True,
                    line=1.06)
            bh = ch - 0.74
            bb = _Box(s, ML + 0.88, y + 0.66, tw, bh)
            bpt = fit_pt(body, tw, bh, 14.5, 10.5)
            for ln in str(body).split("\n"):
                bb.para(ln, bpt, INK, line=1.36, space_after=2.4)
            y += ch + gap
        if callout:
            self._callout(s, BODY_BOT - 0.86, callout)
        self._footer(s)
        self._notes(s, notes)
        self.index.append((self.page, "概念页", title))
        return s

    def _callout(self, s, y, callout, h=0.86):
        kind, text = callout
        pal = {"key": (GOLD, GOLD_SOFT, "关键"),
               "warn": (AMBER, "FDF3E6", "注意"),
               "danger": (RED, "FBECEA", "红线"),
               "do": (TEAL, "E9F2F1", "动作")}
        c, bgc, label = pal.get(kind, pal["key"])
        self._rect(s, ML, y, CW, h, bgc, rounded=True, radius=0.07)
        self._rect(s, ML, y, 0.055, h, c)
        lb = self._rect(s, ML + 0.20, y + (h - 0.30) / 2, 0.62, 0.30, c,
                        rounded=True, radius=0.30)
        self._shape_text(lb, label, 10.5, WHITE, bold=True)
        tw = CW - 1.14
        tb = _Box(s, ML + 0.94, y + 0.08, tw, h - 0.16,
                  anchor=MSO_ANCHOR.MIDDLE)
        pt = fit_pt(text, tw, h - 0.20, 13.5, 10.5)
        for ln in str(text).split("\n"):
            tb.para(ln, pt, INK, line=1.30, space_after=1.6)

    # ---------- 版式 4：判定表页 ----------
    def table(self, badge, title, headers, rows, col_ratios=None,
              subtitle=None, highlight=None, note=None, notes="",
              first_col_head=True, max_pt=14.0):
        """
        badge      : 法典表编号，如「表 A」；None 则为普通数据表
        highlight  : [(行号, 列号)] 从 0 计（含表头行），命中格金色底纹
        """
        s = self._slide()
        highlight = set(highlight or [])

        if badge:
            bshape = self._rect(s, ML, 0.28, 1.20, 0.50, GOLD,
                                rounded=True, radius=0.20)
            self._shape_text(bshape, badge, 19, WHITE, bold=True)
            tx = ML + 1.40
            tw = CW - 1.40
            tag = self._rect(s, tx, 0.30, 1.16, 0.26, NAVY,
                             rounded=True, radius=0.30)
            self._shape_text(tag, "《法典》判定表", 9.5, WHITE, bold=True)
            tb = _Box(s, tx + 1.28, 0.28, tw - 1.28, 0.32,
                      anchor=MSO_ANCHOR.MIDDLE)
            tb.para("阈值逐字照抄 SPEC，不得改动", 10.5, INK2, line=1.0)
            th = _Box(s, tx, 0.62, tw, 0.44)
            th.para(title, fit_pt(title, tw, 0.42, 23, 15), NAVY, bold=True,
                    line=1.06)
            rule_y = 1.16
        else:
            self._head(s, title, None, rule_y=1.10, title_pt=25.5)
            rule_y = 1.10

        top = rule_y + 0.28
        if subtitle:
            sb = _Box(s, ML, top, CW, 0.40)
            sb.para(subtitle, fit_pt(subtitle, CW, 0.38, 13, 10.5), INK2,
                    line=1.26)
            top += 0.48
        bot = BODY_BOT
        if note:
            nh = 0.30 + 0.22 * len(str(note).split("\n"))
            nh = min(nh, 1.30)
            bot -= nh + 0.16
        self._draw_table(s, headers, rows, ML, top, CW, bot - top,
                         col_ratios, highlight, first_col_head, max_pt)
        if note:
            self._callout(s, bot + 0.16, ("key", note),
                          h=min(1.30, 0.30 + 0.22 * len(str(note).split("\n"))))
        self._footer(s)
        self._notes(s, notes)
        self.index.append((self.page, "判定表页" if badge else "数据表页",
                           ("%s %s" % (badge, title)) if badge else title))
        return s

    def _draw_table(self, s, headers, rows, x, y, w, h, col_ratios,
                    highlight, first_col_head, max_pt):
        nrow = len(rows) + 1
        ncol = len(headers)
        gf = s.shapes.add_table(nrow, ncol, Inches(x), Inches(y),
                                Inches(w), Inches(h))
        tbl = gf.table
        tbl.first_row = False
        tbl.horz_banding = False

        ratios = col_ratios or [1.0] * ncol
        tot = float(sum(ratios))
        widths = [w * r / tot for r in ratios]
        for i, cw in enumerate(widths):
            tbl.columns[i].width = Emu(int(cw * 914400))

        # 行高：表头略高
        head_h = min(0.58, max(0.34, h / nrow * 1.10))
        body_h = (h - head_h) / max(1, nrow - 1)
        tbl.rows[0].height = Emu(int(head_h * 914400))
        for r in range(1, nrow):
            tbl.rows[r].height = Emu(int(body_h * 914400))

        # 字号：先按行数给基准，再按最挤的单元格压缩，下限 10pt
        base = 14.0
        for lim, val in ((5, 14.0), (7, 13.0), (9, 12.0),
                         (11, 11.0), (99, 10.5)):
            if nrow <= lim:
                base = val
                break
        base = min(base, max_pt)
        pt = base
        grid = [list(headers)] + [list(r) for r in rows]
        while pt > 10.0:
            ok = True
            for ri, row in enumerate(grid):
                rh = head_h if ri == 0 else body_h
                for ci, cell in enumerate(row):
                    avail_w = widths[ci] - 0.14
                    lines = est_lines(cell, avail_w, pt)
                    if lines * pt * 1.22 > (rh - 0.08) * 72:
                        ok = False
                        break
                if not ok:
                    break
            if ok:
                break
            pt -= 0.5
        pt = max(pt, 10.0)

        for ri, row in enumerate(grid):
            for ci, val in enumerate(row):
                cell = tbl.cell(ri, ci)
                cell.margin_left = Inches(0.07)
                cell.margin_right = Inches(0.07)
                cell.margin_top = Inches(0.025)
                cell.margin_bottom = Inches(0.025)
                cell.vertical_anchor = MSO_ANCHOR.MIDDLE
                hit = (ri, ci) in highlight
                if ri == 0:
                    fill, fg, bold = NAVY, WHITE, True
                elif hit:
                    fill, fg, bold = GOLD_SOFT, GOLD, True
                elif ci == 0 and first_col_head:
                    fill, fg, bold = BG2, NAVY, True
                else:
                    fill, fg, bold = (WHITE if ri % 2 else BG), INK, False
                cell.fill.solid()
                cell.fill.fore_color.rgb = _c(fill)
                self._cell_border(cell, WHITE if ri == 0 else LINE)
                tf = cell.text_frame
                tf.word_wrap = True
                first = True
                for ln in str(val).split("\n"):
                    p = tf.paragraphs[0] if first else tf.add_paragraph()
                    first = False
                    p.alignment = PP_ALIGN.LEFT if (ci == 0 and ncol <= 4) \
                        else PP_ALIGN.CENTER
                    p.line_spacing = 1.14
                    p.space_after = Pt(0)
                    run = p.add_run()
                    run.text = ln
                    _set_run_font(run, pt, fg, bold=bold)
        return tbl

    def _cell_border(self, cell, color, wpt=0.75):
        tcPr = cell._tc.get_or_add_tcPr()
        for tag in ("a:lnL", "a:lnR", "a:lnT", "a:lnB"):
            old = tcPr.find(qn(tag))
            if old is not None:
                tcPr.remove(old)
        for tag in ("a:lnL", "a:lnR", "a:lnT", "a:lnB"):
            ln = tcPr.makeelement(qn(tag), {
                "w": str(int(wpt * 12700)), "cap": "flat",
                "cmpd": "sng", "algn": "ctr"})
            fill = ln.makeelement(qn("a:solidFill"), {})
            clr = fill.makeelement(qn("a:srgbClr"), {"val": color})
            fill.append(clr)
            ln.append(fill)
            tcPr.append(ln)

    # ---------- 版式 5：示范（案例）页 ----------
    def case(self, title, steps, result=None, eyebrow=None, notes="",
             tag="讲师示范"):
        """steps: [(步骤标签, 内容), ...]  result: (结论标题, 结论正文)"""
        s = self._slide()
        endx = self._pill(s, tag, TEAL, y=0.30, w=1.42)
        if eyebrow:
            eb = _Box(s, endx + 0.18, 0.30, CW - (endx - ML) - 0.18, 0.38,
                      anchor=MSO_ANCHOR.MIDDLE)
            eb.para(eyebrow, 11.5, GOLD, bold=True, line=1.0)
        tb = _Box(s, ML, 0.80, CW, 0.48)
        tb.para(title, fit_pt(title, CW, 0.46, 24, 15), NAVY, bold=True,
                line=1.06)
        self._rect(s, ML, 1.36, 1.10, 0.045, GOLD)
        self._rect(s, ML + 1.10, 1.376, CW - 1.10, 0.013, LINE)

        top = 1.62
        bot = BODY_BOT
        if result:
            bot -= 1.14
        n = len(steps)
        gap = 0.12
        rh = (bot - top - gap * (n - 1)) / n
        y = top
        for i, (label, body) in enumerate(steps, 1):
            self._rect(s, ML, y, CW, rh, WHITE, rounded=True, radius=0.05,
                       line_color=LINE, line_w=0.75)
            num = self._oval(s, ML + 0.16, y + (rh - 0.38) / 2, 0.38, NAVY)
            self._shape_text(num, str(i), 14, WHITE, bold=True)
            lb = _Box(s, ML + 0.66, y + 0.06, 2.05, rh - 0.12,
                      anchor=MSO_ANCHOR.MIDDLE)
            lb.para(label, fit_pt(label, 2.0, rh - 0.16, 13.5, 10.5), NAVY,
                    bold=True, line=1.14)
            self._rect(s, ML + 2.80, y + 0.10, 0.012, rh - 0.20, LINE)
            tw = CW - 3.06
            bb = _Box(s, ML + 2.94, y + 0.06, tw, rh - 0.12,
                      anchor=MSO_ANCHOR.MIDDLE)
            bpt = fit_pt(body, tw, rh - 0.16, 13.5, 10.0)
            for ln in str(body).split("\n"):
                bb.para(ln, bpt, INK, line=1.28, space_after=1.4)
            y += rh + gap
        if result:
            rt, rb_ = result
            ry = BODY_BOT - 1.02
            self._rect(s, ML, ry, CW, 1.02, GOLD_SOFT, rounded=True,
                       radius=0.06)
            self._rect(s, ML, ry, 0.055, 1.02, GOLD)
            hb = _Box(s, ML + 0.24, ry + 0.10, CW - 0.50, 0.32)
            hb.para("查表结论：%s" % rt,
                    fit_pt(rt, CW - 0.55, 0.30, 15.5, 12), GOLD, bold=True,
                    line=1.06)
            db = _Box(s, ML + 0.24, ry + 0.48, CW - 0.50, 0.46)
            db.para(rb_, fit_pt(rb_, CW - 0.50, 0.44, 13.5, 10.5), INK,
                    line=1.26)
        self._footer(s)
        self._notes(s, notes)
        self.index.append((self.page, "示范页", title))
        return s

    # ---------- 版式 6：练习页 ----------
    def exercise(self, title, question, blanks=4, hint=None, notes="",
                 eyebrow=None, sub=None):
        s = self._slide()
        endx = self._pill(s, "学员跟练", AMBER, y=0.30, w=1.42)
        if eyebrow:
            eb = _Box(s, endx + 0.18, 0.30, CW - (endx - ML) - 0.18, 0.38,
                      anchor=MSO_ANCHOR.MIDDLE)
            eb.para(eyebrow, 11.5, GOLD, bold=True, line=1.0)
        tb = _Box(s, ML, 0.80, CW, 0.48)
        tb.para(title, fit_pt(title, CW, 0.46, 24, 15), NAVY, bold=True,
                line=1.06)
        self._rect(s, ML, 1.36, 1.10, 0.045, GOLD)
        self._rect(s, ML + 1.10, 1.376, CW - 1.10, 0.013, LINE)

        # 题目
        qlines = str(question).split("\n")
        qh = min(2.34, 0.42 + 0.30 * len(qlines))
        self._rect(s, ML, 1.62, CW, qh, BG2, rounded=True, radius=0.055)
        self._rect(s, ML, 1.62, 0.055, qh, AMBER)
        qb = _Box(s, ML + 0.30, 1.62 + 0.12, CW - 0.60, qh - 0.24)
        qpt = fit_pt(question, CW - 0.60, qh - 0.28, 15, 11)
        for ln in qlines:
            qb.para(ln, qpt, INK, line=1.36, space_after=2.6)

        # 答题留白
        ay = 1.62 + qh + 0.20
        ah = BODY_BOT - ay - (0.72 if hint else 0.0)
        self._rect(s, ML, ay, CW, ah, WHITE, rounded=True, radius=0.05,
                   line_color=LINE, line_w=1.0)
        lab = self._rect(s, ML + 0.22, ay + 0.16, 1.30, 0.30, NAVY,
                         rounded=True, radius=0.30)
        self._shape_text(lab, "答题区", 10.5, WHITE, bold=True)
        sb = _Box(s, ML + 1.64, ay + 0.16, CW - 1.90, 0.30,
                  anchor=MSO_ANCHOR.MIDDLE)
        sb.para(sub or "写出：① 输入条件 ② 命中哪张表哪一格 ③ 唯一动作 ④ 台账要记什么",
                10.5, INK2, line=1.0)
        step = (ah - 0.66) / max(1, blanks)
        for i in range(blanks):
            ly = ay + 0.62 + step * (i + 0.72)
            if ly < ay + ah - 0.10:
                self._rect(s, ML + 0.34, ly, CW - 0.68, 0.011, LINE)
        if hint:
            self._callout(s, BODY_BOT - 0.66, ("do", hint), h=0.66)
        self._footer(s)
        self._notes(s, notes)
        self.index.append((self.page, "练习页", title))
        return s

    # ---------- 版式 7：小结页 ----------
    def summary(self, title, takeaways, recite, next_up=None, notes="",
                tag="本模块小结"):
        s = self._slide()
        self._pill(s, tag, NAVY, y=0.30, w=1.62)
        tb = _Box(s, ML, 0.80, CW, 0.48)
        tb.para(title, fit_pt(title, CW, 0.46, 24, 15), NAVY, bold=True,
                line=1.06)
        self._rect(s, ML, 1.36, 1.10, 0.045, GOLD)
        self._rect(s, ML + 1.10, 1.376, CW - 1.10, 0.013, LINE)

        top = 1.62
        bot = BODY_BOT - (0.80 if next_up else 0.0)
        lw = CW * 0.545
        rw = CW - lw - 0.26

        # 左：带走三句话
        self._rect(s, ML, top, lw, bot - top, BG2, rounded=True, radius=0.055)
        self._rect(s, ML, top, 0.055, bot - top, GOLD)
        lh = _Box(s, ML + 0.26, top + 0.14, lw - 0.52, 0.32)
        lh.para("这一模块你要带走的", 14.5, GOLD, bold=True, line=1.0)
        n = len(takeaways)
        avail = bot - top - 0.62
        ih = avail / max(1, n)
        y = top + 0.56
        for i, t in enumerate(takeaways, 1):
            dot = self._oval(s, ML + 0.26, y + 0.06, 0.30, NAVY)
            self._shape_text(dot, str(i), 11.5, WHITE, bold=True)
            tw = lw - 0.92
            ib = _Box(s, ML + 0.66, y, tw, ih - 0.08)
            ipt = fit_pt(t, tw, ih - 0.14, 13.5, 10.5)
            ib.para(t, ipt, INK, line=1.30)
            y += ih

        # 右：判定表默写清单
        rx = ML + lw + 0.26
        self._rect(s, rx, top, rw, bot - top, WHITE, rounded=True,
                   radius=0.055, line_color=LINE, line_w=1.0)
        rh_ = _Box(s, rx + 0.24, top + 0.14, rw - 0.48, 0.32)
        rh_.para("当堂默写清单（70–85 min）", 14.5, NAVY, bold=True, line=1.0)
        m = len(recite)
        avail2 = bot - top - 0.62
        ih2 = avail2 / max(1, m)
        y = top + 0.56
        for item in recite:
            bx = self._rect(s, rx + 0.24, y + 0.05, 0.24, 0.24, None,
                            line_color=GOLD, line_w=1.1)
            tw = rw - 0.72
            ib = _Box(s, rx + 0.60, y, tw, ih2 - 0.06)
            ib.para(item, fit_pt(item, tw, ih2 - 0.12, 12.5, 10), INK,
                    line=1.26)
            y += ih2
        if next_up:
            self._callout(s, BODY_BOT - 0.76, ("do", next_up), h=0.76)
        self._footer(s)
        self._notes(s, notes)
        self.index.append((self.page, "小结页", title))
        return s

    # ---------- 版式 8：四步闭环总览 ----------
    def loop(self, title, steps, bottom, notes="", eyebrow="全院灵魂 · 每日必做"):
        """steps: [(步骤名, 一句话, 明细多行), ...] 固定 4 个"""
        s = self._slide()
        self._head(s, title, eyebrow)
        n = len(steps)
        aw = 0.44
        bw = (CW - aw * (n - 1)) / n
        y = 1.66
        bh = 0.86
        for i, (name, one, detail) in enumerate(steps):
            x = ML + i * (bw + aw)
            self._rect(s, x, y, bw, bh, NAVY, rounded=True, radius=0.09)
            nb = _Box(s, x + 0.10, y + 0.10, bw - 0.20, 0.36,
                      anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.CENTER)
            nb.para(name, 21, WHITE, bold=True, line=1.0)
            ob = _Box(s, x + 0.10, y + 0.50, bw - 0.20, 0.28,
                      align=PP_ALIGN.CENTER)
            ob.para(one, fit_pt(one, bw - 0.24, 0.26, 11.5, 9.5), GOLD,
                    bold=True, line=1.0)
            if i < n - 1:
                ar = s.shapes.add_shape(
                    MSO_SHAPE.RIGHT_ARROW, Inches(x + bw + 0.06),
                    Inches(y + bh / 2 - 0.13), Inches(aw - 0.12), Inches(0.26))
                ar.fill.solid()
                ar.fill.fore_color.rgb = _c(GOLD)
                ar.line.fill.background()
                ar.shadow.inherit = False
            # 明细卡
            dy = y + bh + 0.18
            dh = 2.62
            self._rect(s, x, dy, bw, dh, BG2, rounded=True, radius=0.06)
            self._rect(s, x, dy, bw, 0.045, GOLD)
            db = _Box(s, x + 0.18, dy + 0.18, bw - 0.36, dh - 0.34)
            dpt = fit_pt(detail, bw - 0.40, dh - 0.40, 12.5, 10)
            for ln in str(detail).split("\n"):
                db.para(ln, dpt, INK, line=1.34, space_after=3.0)
        by = y + bh + 0.18 + 2.62 + 0.20
        self._rect(s, ML, by, CW, 0.62, NAVY2, rounded=True, radius=0.12)
        bb = _Box(s, ML + 0.20, by + 0.06, CW - 0.40, 0.50,
                  anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.CENTER)
        bb.para(bottom, fit_pt(bottom, CW - 0.50, 0.48, 14.5, 11), WHITE,
                bold=True, line=1.12)
        self._footer(s)
        self._notes(s, notes)
        self.index.append((self.page, "闭环页", title))
        return s

    # ---------- 版式 9：清单页 ----------
    def checklist(self, title, groups, eyebrow=None, note=None, notes="",
                  cols=3):
        """groups: [(组名, [条目...]), ...] 按列排布"""
        s = self._slide()
        self._head(s, title, eyebrow)
        top = BODY_BOT if False else BODY_TOP
        bot = BODY_BOT - (0.94 if note else 0.0)
        n = len(groups)
        cols = min(cols, n)
        rows = int(math.ceil(n / float(cols)))
        gapx, gapy = 0.22, 0.20
        gw = (CW - gapx * (cols - 1)) / cols
        gh = (bot - top - gapy * (rows - 1)) / rows
        for idx, (gname, items) in enumerate(groups):
            r, c = divmod(idx, cols)
            x = ML + c * (gw + gapx)
            y = top + r * (gh + gapy)
            self._rect(s, x, y, gw, gh, WHITE, rounded=True, radius=0.05,
                       line_color=LINE, line_w=1.0)
            self._rect(s, x, y, gw, 0.40, NAVY, rounded=True, radius=0.12)
            self._rect(s, x, y + 0.24, gw, 0.16, NAVY)
            hb = _Box(s, x + 0.16, y + 0.04, gw - 0.32, 0.34,
                      anchor=MSO_ANCHOR.MIDDLE)
            hb.para(gname, fit_pt(gname, gw - 0.36, 0.32, 13.5, 10.5), WHITE,
                    bold=True, line=1.0)
            ih = (gh - 0.54) / max(1, len(items))
            iy = y + 0.48
            for it in items:
                self._rect(s, x + 0.18, iy + 0.04, 0.20, 0.20, None,
                           line_color=GOLD, line_w=1.1)
                tw = gw - 0.60
                ib = _Box(s, x + 0.48, iy, tw, ih - 0.04)
                ib.para(it, fit_pt(it, tw, ih - 0.10, 12, 10), INK, line=1.24)
                iy += ih
        if note:
            self._callout(s, BODY_BOT - 0.86, ("key", note))
        self._footer(s)
        self._notes(s, notes)
        self.index.append((self.page, "清单页", title))
        return s

    # ---------- 版式 10：结业页 ----------
    def closing(self, headline, lines, notes=""):
        s = self._slide(NAVY)
        self._rect(s, 0, 0, SW, 0.20, GOLD)
        self._rect(s, 0, SH - 0.10, SW, 0.10, TEAL)
        self._oval(s, -1.6, 4.2, 4.2, NAVY2)
        self._oval(s, SW - 2.8, -1.1, 3.8, "20486B")

        eb = _Box(s, ML + 0.10, 1.30, 10.0, 0.36)
        eb.para("酒店收益管理学院 · HRMA", 13, GOLD, bold=True, line=1.0)
        t = _Box(s, ML + 0.10, 1.86, 10.6, 1.20)
        t.para(headline, fit_pt(headline, 10.6, 1.14, 40, 24), WHITE,
               bold=True, line=1.12)
        self._rect(s, ML + 0.10, 3.20, 3.0, 0.035, GOLD)
        y = 3.54
        for ln in lines:
            rb = _Box(s, ML + 0.10, y, 10.6, 0.44)
            rb.para(ln, fit_pt(ln, 10.6, 0.42, 15, 11.5), GOLD_SOFT, line=1.28)
            y += 0.50
        band = self._rect(s, ML + 0.10, 6.02, 8.0, 0.60, GOLD, rounded=True,
                          radius=0.14)
        self._shape_text(band, "看数 → 查表 → 执行 → 记录", 18, WHITE, bold=True)
        self._footer(s, dark=True)
        self._notes(s, notes)
        self.index.append((self.page, "结业页", headline))
        return s

    # ---------- 保存 ----------
    def save(self, path):
        self.prs.save(path)
        return self.page
