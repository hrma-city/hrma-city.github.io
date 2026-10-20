# -*- coding: utf-8 -*-
"""重建 pocket-41.html 的内联正文区：用平衡 div 解析只抽取每个 pocket-noNN.html 的
<div class="paper">…</div> 本体，绝不卷入 rm-toc 抽屉/按钮/脚本。网格卡片（已在页头固定）保留不动。"""
import re, os

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'pocket-41.html')
OUT = SRC  # 原地重建

s = open(SRC, encoding='utf-8').read()

# 只抽取 paper 本体的平衡解析（从 <div class="paper"> 起到匹配的 </div>）
def extract_paper(no):
    p = os.path.join(ROOT, 'pocket-no%02d.html' % no)
    t = open(p, encoding='utf-8').read()
    m = re.search(r'<div class="paper">', t)
    i = m.end()
    depth = 1
    for mm in re.finditer(r'<div\b|</div>', t[i:]):
        depth += -1 if mm.group() == '</div>' else 1
        if depth == 0:
            j = i + mm.start()
            break
    return t[m.start():j + 6]  # 含闭合 </div>

# head = 第一个 no01 锚点之前（含网格 41 卡片，已正确）
head_end = s.index('<div class="anchor" id="no01">')
head = s[:head_end]

# allfoot 只取自身的 <div class="allfoot">…</div>，丢弃其后可能残留的旧尾部（抽屉/脚本等）
allfoot_start = s.index('<div class="allfoot">')
allfoot_end = s.index('</div>', allfoot_start) + 6
allfoot = s[allfoot_start:allfoot_end]

# 重建 41 册内联正文
papers = ''
for no in range(1, 42):
    pid = '%02d' % no
    papers += '<div class="anchor" id="no%s"></div>%s\n' % (pid, extract_paper(no))

new = head + papers + allfoot + '\n</body>\n</html>\n'
open(OUT, 'w', encoding='utf-8').write(new)

# 校验：体内不得再出现 drawer/toggle/script 元素
body = new.split('</head>', 1)[1]
leak = {tag: body.count(tag) for tag in
        ['<nav id="rm-toc-drawer"', '<button id="rm-toc-toggle"', '<script id="rm-toc-script"']}
print('written', OUT, 'bytes=', len(new))
print('papers=', papers.count('<div class="anchor"'), 'leaked drawer/toggle/script=', leak)
