#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""教材上下游同步检查：对比母本与各版本的章数/判定表/附录/污染值，输出不一致清单。
用法：python3 _tools/sync_check.py   （在 gh-pages 根目录运行）"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER = 'textbook.html'
VERSIONS = [
    'book-reader.html', 'rmc-book-reader-46.html', 'rmc-book-student-46.html',
    'rmc-book-teacher-46.html', 'book-teach.html', 'book-reader-levels.html',
    'book-reader-undergraduate.html',  # 本科适用版（46章全本）
]
# 历史封装：沿用旧章结构(id=mchNN)与旧判定表格式，保留原貌不强制同步；
# 仅检查其无认证课程污染即可。
LEGACY = ['v2026-10-textbook-full.html', 'textbook-merged.html', 'textbook-print.html']

def read(fn):
    p = os.path.join(ROOT, fn)
    if not os.path.exists(p):
        return None
    return io.open(p, encoding='utf-8', errors='ignore').read()

def stats(s):
    return {
        '章数': len(set(int(x) for x in re.findall(r'id="ch(\d+)"', s))),
        '判定表': len(re.findall(r'本章判定表 ·', s)),
        '附录A_46': 1 if '全书 46 章各有一张' in s else 0,
        '附录A_32旧': s.count('全书 32 章各有一张判定表'),
        'M模块污染': len(re.findall(r'对应模块\s*M\d+', s)),
        '知识灯': s.count('知识灯'),
        '本章配套': s.count('本章配套'),
    }

def main():
    m = read(MASTER)
    if not m:
        print('母本缺失:', MASTER); sys.exit(1)
    ms = stats(m)
    print('=== 母本 %s ===' % MASTER)
    for k, v in ms.items():
        print('  %-10s %s' % (k, v))
    print('\n=== 各版本对比 ===')
    bad = 0
    for fn in VERSIONS:
        s = read(fn)
        if not s:
            print('  %-30s 文件缺失' % fn); bad += 1; continue
        st = stats(s)
        diffs = []
        if st['章数'] < 46: diffs.append('章数%d' % st['章数'])
        # 本科版/分层版沿用自身判定表格式，只要求 >= 40 张，不做严格46
        min_judge = 40 if fn in ('book-reader-undergraduate.html',) else 46
        if st['判定表'] < min_judge: diffs.append('判定表%d' % st['判定表'])
        if st['附录A_32旧']: diffs.append('附录A旧%d' % st['附录A_32旧'])
        if st['M模块污染']: diffs.append('M污染%d' % st['M模块污染'])
        if st['知识灯']: diffs.append('知识灯%d' % st['知识灯'])
        flag = 'OK' if not diffs else '不同步: ' + ', '.join(diffs)
        if diffs: bad += 1
        print('  %-30s %s' % (fn, flag))
    print('\n=== 历史封装（保留原貌，仅查污染）===')
    for fn in LEGACY:
        s = read(fn)
        if not s:
            print('  %-30s 文件缺失' % fn); continue
        st = stats(s)
        dirty = st['M模块污染'] or st['知识灯']
        print('  %-30s %s' % (fn, '有认证污染，需清理 ✗' if dirty else '无污染 ✓（历史版豁免）'))
        if dirty: bad += 1
    print('\n=== 章级配套资源数量（应均为46）===')
    checks = [
        ('口袋书 pocket-no*.html', len([f for f in os.listdir(ROOT) if re.match(r'pocket-no\d{2}\.html$', f)])),
        ('实验表 exp-data/*.csv', len([f for f in os.listdir(os.path.join(ROOT,'exp-data')) if re.match(r'第\d+章-实验.*\.csv$', f)]) if os.path.isdir(os.path.join(ROOT,'exp-data')) else 0),
        ('逐章课件 sl-ch*.html', len([f for f in os.listdir(ROOT) if re.match(r'sl-ch\d{2}\.html$', f)])),
        ('教材题库章数', len(set(re.findall(r'"ch"\s*:\s*"(\d+)"', read('textbook_quiz_46.js') or '')))),
    ]
    for name, cnt in checks:
        flag = 'OK' if cnt >= 46 else '⚠ %d（应46）' % cnt
        if cnt < 46: bad += 1
        print('  %-26s %s' % (name, flag))

    print('\n结论：%s' % ('全部同步 ✓' if bad == 0 else '%d 个文件需处理 ✗' % bad))
    sys.exit(0 if bad == 0 else 2)

if __name__ == '__main__':
    main()
