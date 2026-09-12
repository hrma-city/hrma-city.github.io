# -*- coding: utf-8 -*-
"""
HRMA · 表格内联预览 构建脚本
把 templates/*.xlsx 与 data/*.csv 预渲染成自包含的 HTML 预览文件，
放到 assets/previews/，并生成 assets/previews-map.js（原始 href -> 预览路径）。

原则：国内 · 免费 · 离线可用。预览文件本地生成、无 CDN 依赖，浏览器直接加载。
xlsx 的公式计算值用 pycel 求值；失败则回退为公式文本（仍可读）。

用法：
  /Users/abc/.workbuddy/binaries/python/envs/default/bin/python build_previews.py
"""
import os
import re
import sys
import json
import html as _html

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "templates"))

PY = "/Users/abc/.workbuddy/binaries/python/envs/default/bin/python"
OUT_DIR = os.path.join(HERE, "assets", "previews")
os.makedirs(OUT_DIR, exist_ok=True)

import openpyxl
from openpyxl.utils import get_column_letter, column_index_from_string

# pycel 可选；没有也能跑（公式格显示公式文本）
try:
    from pycel import ExcelCompiler
    HAVE_PYCEL = True
except Exception:
    HAVE_PYCEL = False

INPUT_BG = "FFF7D6"   # 输入区浅黄
REF_BG = "EDEDED"     # 参考区灰

CSS = """
<style>
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  color:#1F2933;background:#fff;font-size:13px;line-height:1.5}
.hd{position:sticky;top:0;background:#1B3A5C;color:#fff;padding:10px 16px;font-weight:600;
  display:flex;gap:8px;flex-wrap:wrap;align-items:center;z-index:5}
.hd .t{font-size:14px}
.tabs{display:flex;gap:6px;flex-wrap:wrap}
.tab{background:rgba(255,255,255,.14);color:#fff;border:0;padding:5px 12px;border-radius:20px;
  cursor:pointer;font-size:12.5px}
.tab.on{background:#B8894A;color:#fff}
.wrap{padding:14px}
.sheet{display:none;overflow:auto}
.sheet.on{display:block}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{border:1px solid #E1E5EA;padding:5px 9px;vertical-align:top;white-space:pre-wrap;
  word-break:break-word;max-width:320px}
thead th{background:#F2F0EB;color:#1B3A5C;font-weight:700;position:sticky;top:0}
tr:nth-child(even) td{background:#FAFAF8}
td.inp{background:#FFF7D6}
td.ref{background:#F4F4F2;color:#52606D}
td.calc{color:#2C5282;font-weight:600}
td.emp{color:#9AA5B1;font-style:italic}
.foot{color:#8895a7;font-size:11.5px;padding:0 16px 18px}
</style>
"""

def slugify(rel):
    s = re.sub(r"[^A-Za-z0-9\u4e00-\u9fff._-]", "_", rel)
    return s[:120]

def fmt_num(v, nf):
    try:
        f = float(v)
    except Exception:
        return v
    nf = (nf or "").replace("_", " ")
    try:
        if "0%" in nf or nf.endswith("%"):
            dec = 0
            m = re.search(r"0\.([0]+)%", nf)
            if m: dec = len(m.group(1))
            return ("{:." + str(dec) + "f}%").format(f * 100)
        if "#,##0" in nf or "0.0" in nf or "0.00" in nf:
            dec = 0
            m = re.search(r"0\.([0]+)", nf)
            if m: dec = len(m.group(1))
            return ("{:,. " + str(dec) + "f}").format(f).replace(" ", "")
        if dec_match := re.search(r"\.(0+)", nf):
            dec = len(dec_match.group(1))
            return ("{:." + str(dec) + "f}").format(f)
        return ("{:.2f}".format(f) if f != int(f) else "{:,.0f}".format(f))
    except Exception:
        return v

def cell_bg(ws, coord):
    try:
        fg = ws[coord].fill.fgColor.rgb
        if isinstance(fg, str):
            fg = fg.replace("FF", "", 1) if fg.startswith("FF") else fg
            return fg.upper()
    except Exception:
        return None
    return None

def render_xlsx(path, rel):
    wb = openpyxl.load_workbook(path, data_only=False)
    comp = None
    if HAVE_PYCEL:
        try:
            comp = ExcelCompiler(path)
        except Exception:
            comp = None
    sheets_html = []
    tab_names = []
    for si, ws in enumerate(wb.worksheets):
        tab_names.append(ws.title)
        maxr = ws.max_row or 0
        maxc = ws.max_column or 0
        if maxr == 0 or maxc == 0:
            sheets_html.append('<div class="sheet%s"><p class="emp">（空表）</p></div>' % (" on" if si == 0 else ""))
            continue
        merged = {}
        for mr in ws.merged_cells.ranges:
            merged[(mr.min_row, mr.min_col)] = (mr.max_row, mr.max_col)
        rows = []
        for r in range(1, maxr + 1):
            cells = []
            c = 1
            while c <= maxc:
                coord = "%s%d" % (get_column_letter(c), r)
                cc = ws[coord]
                if (r, c) in merged:
                    mr, mc = merged[(r, c)]
                    rs = mr - r + 1
                    cs = mc - c + 1
                    # 合并区只渲染左上角
                    val = read_val(ws, coord, comp)
                    cls = cell_class(ws, coord)
                    style = "background:#%s" % cell_bg(ws, coord) if cell_bg(ws, coord) else ""
                    cells.append('<td rowspan="%d" colspan="%d" class="%s" style="%s">%s</td>'
                                 % (rs, cs, cls, style, esc_cell(val)))
                    c = mc + 1
                    continue
                # 被合并覆盖的单元格跳过
                covered = False
                for (br, bc), (er, ec) in merged.items():
                    if br <= r <= er and bc <= c <= ec and not (br == r and bc == c):
                        covered = True
                        break
                if covered:
                    c += 1
                    continue
                val = read_val(ws, coord, comp)
                cls = cell_class(ws, coord)
                style = "background:#%s" % cell_bg(ws, coord) if cell_bg(ws, coord) else ""
                tag = "th" if r == 1 else "td"
                cells.append('<%s class="%s" style="%s">%s</%s>' % (tag, cls, style, esc_cell(val), tag))
                c += 1
            rows.append("<tr>" + "".join(cells) + "</tr>")
        sheets_html.append('<div class="sheet%s"><table>%s</table></div>'
                           % (" on" if si == 0 else "", "".join(rows)))
    tabs = "".join('<button class="tab%s" data-i="%d">%s</button>' % (" on" if i == 0 else "", i, _html.escape(n))
                   for i, n in enumerate(tab_names))
    return tabs, sheets_html

def read_val(ws, coord, comp):
    cc = ws[coord]
    if cc.data_type == "f" and comp is not None:
        try:
            v = comp.evaluate("%s!%s" % (ws.title, coord))
            if v is None:
                return ""
            if isinstance(v, float) and v.is_integer():
                return int(v)
            return v
        except Exception:
            return cc.value  # 回退公式文本
    if cc.value is None:
        return ""
    if cc.data_type == "n":
        return fmt_num(cc.value, cc.number_format)
    return cc.value

def cell_class(ws, coord):
    bg = cell_bg(ws, coord)
    cc = ws[coord]
    if cc.data_type == "f":
        return "calc"
    if bg == INPUT_BG:
        return "inp"
    if bg == REF_BG:
        return "ref"
    return ""

def esc_cell(v):
    if v is None:
        return ""
    s = str(v)
    if s == "":
        return '<span class="emp">—</span>'
    return _html.escape(s)

def render_csv(path):
    import csv as _csv
    rows = []
    with open(path, encoding="utf-8-sig", newline="") as f:
        rd = _csv.reader(f)
        for row in rd:
            rows.append(row)
    if not rows:
        return "", ['<div class="sheet on"><p class="emp">（空文件）</p></div>']
    head = "".join("<th>%s</th>" % esc_cell(c) for c in rows[0])
    body = ""
    for row in rows[1:]:
        body += "<tr>" + "".join("<td>%s</td>" % esc_cell(c) for c in row) + "</tr>"
    html = '<div class="sheet on"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (head, body)
    return "", [html]

def main():
    mapping = {}
    # xlsx
    tdir = os.path.join(HERE, "templates")
    for fn in sorted(os.listdir(tdir)):
        if not fn.lower().endswith(".xlsx") or fn.startswith("_"):
            continue
        rel = "templates/" + fn
        slug = slugify(rel)
        out = os.path.join(OUT_DIR, slug + ".html")
        print("render xlsx:", rel)
        tabs, sheets = render_xlsx(os.path.join(tdir, fn), rel)
        write_html(out, fn, tabs, sheets, "Excel 模板预览（公式计算值，输入格为示例/空）")
        mapping[rel] = "assets/previews/" + slug + ".html"
    # csv
    ddir = os.path.join(HERE, "data")
    for fn in sorted(os.listdir(ddir)):
        if not fn.lower().endswith(".csv"):
            continue
        rel = "data/" + fn
        slug = slugify(rel)
        out = os.path.join(OUT_DIR, slug + ".html")
        print("render csv:", rel)
        tabs, sheets = render_csv(os.path.join(ddir, fn))
        write_html(out, fn, tabs, sheets, "CSV 数据预览")
        mapping[rel] = "assets/previews/" + slug + ".html"

    mp = os.path.join(OUT_DIR, "previews-map.js")
    with open(mp, "w", encoding="utf-8") as f:
        f.write("window.GJP_PREVIEWS=" + json.dumps(mapping, ensure_ascii=False) + ";")
    print("written map:", mp, "entries:", len(mapping))
    print("pycel:", "yes" if HAVE_PYCEL else "no (formula cells show formula text)")

def write_html(out, title, tabs, sheets, note):
    html = ("<!doctype html><html lang=\"zh\"><head><meta charset=\"utf-8\">"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            "<title>%s</title>%s</head><body>" % (_html.escape(title), CSS))
    html += '<div class="hd"><span class="t">%s</span><span class="tabs">%s</span></div>' % (_html.escape(title), tabs)
    html += '<div class="wrap">' + "".join(sheets) + "</div>"
    html += '<div class="foot">%s · 在线预览，可直接查看；如需编辑请用“下载”按钮获取原文件。</div>' % _html.escape(note)
    html += "<script>var t=document.querySelectorAll('.tab');t.forEach(function(b){b.onclick=function(){" \
            "t.forEach(function(x){x.classList.remove('on')});" \
            "document.querySelectorAll('.sheet').forEach(function(s){s.classList.remove('on')});" \
            "b.classList.add('on');document.querySelectorAll('.sheet')[+b.dataset.i].classList.add('on');}});</script>"
    html += "</body></html>"
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)

if __name__ == "__main__":
    main()
