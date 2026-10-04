#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 textbook.html 抽取知识点，生成可在线判分的题库 data/textbook_quiz.js
规则（只抽教材里明确写过的表述，不自己编知识）：
  1) 术语定义题  ：<b>术语</b>＝定义 / <b>术语</b>——定义
  2) 判定表题    ：本章判定表每行「情形 → 结论」，考"遇到该情形怎么办"
  3) 公式题      ：核心公式块的公式名与式子
干扰项从同章其他条目里取，保证同质、可区分。
"""
import re, json, os, random

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, 'textbook.html')
OUT = os.path.join(BASE, 'data', 'textbook_quiz.js')

def clean(s):
    s = re.sub(r'<[^>]+>', '', s)
    s = (s.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<')
          .replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'"))
    s = s.replace(' ', ' ')
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def trim(s, n=110):
    s = clean(s)
    return s if len(s) <= n else s[:n].rstrip('，。；、 ') + '…'

BAD_START = ('例：', '例:', '例')

def _ok_def(d):
    """定义要像定义：不太短、不以"例"开头、不以逗号断在半句、不带对错符号。"""
    if len(d) < 8 or len(d) > 130:
        return False
    if d.startswith(BAD_START):
        return False
    if d[0] in '✗✓×√':
        return False
    # 「……，」结尾多半是残句
    if d[-1] in '，、；':
        return False
    return True

def split_terms(seg):
    """从一段 HTML 里抽 (术语, 定义)。教材里定义有三种写法：
       <b>术语</b>＝定义   <b>术语</b>：定义   <b>术语</b>——定义
       「——例：」那一类是例句，不是定义，必须排除。"""
    cand = {}
    def add(term, d, pref):
        term = re.sub(r'（.*?）$', '', clean(term)).strip() or clean(term)
        d = clean(d)
        if not _ok_def(d) or len(term) < 2:
            return
        cur = cand.get(term)
        # ＝/： 的定义比「——」的更权威；同源则取更长的
        if cur is None or (pref < cur[1] and True) or (pref == cur[1] and len(d) > len(cur[0])):
            if cur is None or pref <= cur[1] or len(d) > len(cur[0]):
                cand[term] = (d, pref)
    for m in re.finditer(r'<b>([^<>]{2,34}?)</b>\s*[＝=]\s*([^<]{6,200})', seg):
        add(m.group(1), m.group(2), 0)
    for m in re.finditer(r'<b>([^<>]{2,34}?)</b>\s*：\s*([^<]{6,200})', seg):
        add(m.group(1), m.group(2), 0)
    for m in re.finditer(r'<b>([^<>]{2,34}?)</b>\s*——\s*([^<]{6,200})', seg):
        add(m.group(1), m.group(2), 1)
    return [(t, v[0]) for t, v in cand.items()]

def main():
    h = open(SRC, encoding='utf-8').read()
    # 按章切
    idx = [(m.group(1), m.start(), m.end()) for m in
           re.finditer(r'<h2 class="ch"[^>]*id="ch(\d\d)"[^>]*>.*?</h2>', h, re.S)]
    chapters = []
    for i, (no, s, e) in enumerate(idx):
        end = idx[i + 1][1] if i + 1 < len(idx) else h.find('id="appA"', s)
        if end < 0:
            end = len(h)
        seg = h[s:end]
        _tt = clean(re.sub(r'<[^>]+>', '', re.search(r'id="ch\d\d">(.*?)</h2>', seg, re.S).group(1)))
        # 去掉「第 N 章」前缀，只留题名（否则题干会变成「第2章『第2章 xxx』」）
        title = trim(re.sub(r'^第\s*\d+\s*章\s*', '', _tt), 40)
        # 本章正文（去掉 h2 行）
        body = seg[seg.find('</h2>') + 5:]

        def block(cls):
            r = re.findall(r'<div class="' + cls + r'"[^>]*>(.*?)</div>\s*(?=<)', body, re.S)
            return r

        pts = ''.join(re.findall(r'<div class="pts">(.*?)</ul>', body, re.S))
        judge = ''.join(re.findall(r'<div class="judge">(.*?)</table>', body, re.S))
        fml = ''.join(re.findall(r'<div class="fml">(.*?)</div>\s*</div>', body, re.S))
        case = ''.join(re.findall(r'<div class="case">(.*?)</div>\s*(?=<div class="case">|<h4|</h2)', body, re.S))

        terms = split_terms(pts)
        # 判定表行
        rows = []
        for tr in re.findall(r'<tr>(.*?)</tr>', judge, re.S):
            tds = [clean(x) for x in re.findall(r'<td>(.*?)</td>', tr, re.S)]
            if len(tds) == 2 and 2 < len(tds[0]) < 40 and 8 < len(tds[1]) < 90:
                if tds[1][0] in '✗✓×√':
                    continue
                rows.append((tds[0], tds[1]))
        # 公式（只取真正的公式块，「算例 N ·…」是示例不是公式）
        formulas = []
        for fn, fe in re.findall(r'<div class="fn">(.*?)</div>\s*<div class="fe">(.*?)</div>', fml, re.S):
            fn, fe = trim(fn, 40), trim(fe, 120)
            if not fn or not fe:
                continue
            if fn.startswith('算例') or fn.startswith('例'):
                continue
            if len(fn) > 26:
                continue
            if not re.search(r'[＝=×÷+\-%]', fe):
                continue
            formulas.append((fn, fe))
        # 案例结论
        cse = []
        for ce in re.findall(r'<div class="end">(.*?)</div>\s*(?=<div class="case">|<h4)', case, re.S):
            cse.append(trim(ce, 80))
        chapters.append(dict(no=no, title=title, terms=terms, rows=rows,
                             formulas=formulas, cases=cse[:4]))

    random.seed(7)
    qs = []
    # 全书同类题池：某章不够用干扰项时，从全书同类型里挑长度相近的，
    # 保证选项同质、学生是靠知识选不是靠长度猜。
    all_def = [d for c in chapters for _, d in c['terms']]
    all_row = [a for c in chapters for _, a in c['rows']]
    all_fml = [f for c in chapters for _, f in c['formulas']]

    def distract(ans, local, pool, k=3):
        cands = [x for x in local if x != ans]
        # 长度相近优先
        cands.sort(key=lambda x: abs(len(x) - len(ans)))
        out = cands[:k]
        if len(out) < k:
            near = [x for x in pool if x != ans and x not in out]
            near.sort(key=lambda x: abs(len(x) - len(ans)))
            out += near[:k - len(out)]
        return out

    for ch in chapters:
        no, title = ch['no'], ch['title']
        pool_def = [d for _, d in ch['terms']]
        # ① 术语定义题
        for i, (t, d) in enumerate(ch['terms'][:6]):
            opts = [d] + distract(d, pool_def, all_def)
            random.shuffle(opts)
            qs.append(dict(
                ch=no, type='def', stem=f'教材第 {int(no)} 章中，「{t}」指的是：',
                opts=[trim(o, 150) for o in opts], ans=trim(d, 150),
                exp=f'教材第 {int(no)} 章原文：{t}＝{trim(d, 90)}'))
        # ② 判定表题
        for i, (sit, act) in enumerate(ch['rows'][:5]):
            others = distract(act, [a for _, a in ch['rows']], all_row)
            opts = [act] + others
            random.shuffle(opts)
            qs.append(dict(
                ch=no, type='judge', stem=f'第 {int(no)} 章判定表：遇到「{sit}」，正确做法是？',
                opts=[trim(o, 90) for o in opts], ans=trim(act, 90),
                exp=f'教材第 {int(no)} 章判定表：「{sit}」→ {trim(act, 80)}'))
        # ③ 公式题（fn 常都叫"核心公式"，题干改用章名才有区分度）
        short_f = [x for x in ch['formulas'] if len(x[1]) <= 110] or ch['formulas']
        for i, (fn, fe) in enumerate(short_f[:2]):
            others = distract(fe, [f for _, f in short_f], all_fml)
            opts = [fe] + others
            random.shuffle(opts)
            name = trim(fn, 30)
            if name in ('核心公式', '公式', '') or len(name) < 4 or len(name) > 12:
                name = title if len(title) <= 12 else '核心公式'
            qs.append(dict(
                ch=no, type='fml', stem=f'第 {int(no)} 章「{name}」的正确写法是：',
                opts=[trim(o, 100) for o in opts], ans=trim(fe, 100),
                exp=f'教材第 {int(no)} 章公式：{name} = {trim(fe, 80)}'))
        # ④ 案例结论题
        for c in ch['cases'][:1]:
            others = distract(c, [], [x for c2 in chapters for x in c2['cases']])
            if len(others) >= 3:
                opts = [c] + others[:3]
                random.shuffle(opts)
                qs.append(dict(
                    ch=no, type='case',
                    stem=f'第 {int(no)} 章的案例给出的结论是：',
                    opts=[trim(o, 90) for o in opts], ans=trim(c, 90),
                    exp='教材第 %d 章案例结论原文：%s' % (int(no), trim(c, 80))))

    for i, q in enumerate(qs):
        q['id'] = 'q%03d' % (i + 1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('/* 自动生成，源：textbook.html。生成器：build_textbook_quiz.py（改教材后重跑） */\n')
        f.write('window.HRMA_QUIZ=' + json.dumps(qs, ensure_ascii=False) + ';\n')
    # 汇总
    from collections import Counter
    cnt = Counter(q['ch'] for q in qs)
    print('题目总数', len(qs), '| 覆盖章数', len(cnt))
    print('每章题量：', ' '.join('%s:%d' % (k, cnt[k]) for k in sorted(cnt)))
    print('无题章：', [c['no'] for c in chapters if cnt[c['no']] < 4])
    for c in chapters:
        if cnt[c['no']] < 4:
            print('  缺', c['no'], c['title'], 'terms', len(c['terms']), 'rows', len(c['rows']),
                  'fml', len(c['formulas']))

if __name__ == '__main__':
    main()
