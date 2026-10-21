#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""排查候选孤儿页：统计每个候选文件被哪些 crm 根目录 html 链接指向。"""
import os, re, glob

CRM = os.path.dirname(os.path.abspath(__file__))

# 顶栏入口集合（site-nav.js 的 MAIN + MORE 实际 html 文件名）
ENTRY = {
    'index.html','knowledge.html','games-hub.html','teach.html','training.html',
    'growth-hub.html','resources.html','tour.html','theory.html','cases-hub.html',
    'hotelier.html','teacher.html','student.html','community.html','industries.html',
    'cert.html','codex.html','about.html','contact.html'
}

candidates = []
for pat in ['news*.html','academy*.html','expert*.html','old-*.html','legacy-*.html','gejijipo*.html']:
    for f in glob.glob(os.path.join(CRM, pat)):
        candidates.append(os.path.basename(f))
candidates = sorted(set(candidates))

# 收集所有根目录 html
all_html = [os.path.basename(f) for f in glob.glob(os.path.join(CRM, '*.html'))]

# href 提取：匹配 href="xxx.html" 或 href='xxx.html' 或 href="sub/xxx.html"
href_re = re.compile(r'''href\s*=\s*["']([^"']*?\.html)["']''', re.IGNORECASE)

# 建立 文件名 -> 它链接到的目标名 映射
link_map = {}  # target -> set(sources)
for f in all_html:
    with open(os.path.join(CRM, f), encoding='utf-8', errors='ignore') as fh:
        txt = fh.read()
    targets = set()
    for m in href_re.finditer(txt):
        t = m.group(1)
        base = t.split('/')[-1].split('#')[0].split('?')[0]
        if base:
            targets.add(base.lower())
    for t in targets:
        link_map.setdefault(t, set()).add(f)

print('=' * 70)
print('候选孤儿页排查结果（入链来源分析）')
print('=' * 70)
for c in candidates:
    srcs = link_map.get(c.lower(), set())
    srcs.discard(c.lower())  # 去掉自身
    entry_srcs = sorted(s for s in srcs if s in ENTRY)
    other_srcs = sorted(s for s in srcs if s not in ENTRY)
    status = '可达(入口直达)' if entry_srcs else ('仅深页可达' if srcs else '完全无入链(孤儿)')
    print(f'\n### {c}  [{status}]')
    print(f'  入链总数(去自身): {len(srcs)}')
    if entry_srcs:
        print(f'  入口页来源: {entry_srcs}')
    if other_srcs:
        print(f'  深页来源({len(other_srcs)}): {other_srcs[:12]}' + (' ...' if len(other_srcs) > 12 else ''))
    if not srcs:
        print('  *** 无任何页面链接指向，是真正孤儿页 ***')
