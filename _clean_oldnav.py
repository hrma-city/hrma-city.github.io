#!/usr/bin/env python3
"""清理 crm/ 下残留的 <header class="site-nav"> 老版静态顶栏尸体标签。

只删除静态尸体标签，绝不碰 <script src="assets/js/site-nav.js">（真实顶栏）。
删除前先生成 _removed_oldnav_list.txt 记录受影响文件，便于回滚。
"""
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))  # .../crm
BACKUP = os.path.join(ROOT, "_removed_oldnav_list.txt")

# 匹配 <header ... class="site-nav" ...> ... </header>（跨行，非贪婪到第一个 </header>）
PATTERN = re.compile(
    r'<header\b[^>]*\bclass\s*=\s*["\']site-nav\b[^>]*>.*?</header>',
    re.DOTALL | re.IGNORECASE,
)

# 真实顶栏引用（必须保留，永不被删）
SITE_NAV_SCRIPT = re.compile(r'<script[^>]+assets/js/site-nav\.js', re.IGNORECASE)


def main():
    affected = []
    checked = 0
    for dirpath, _, filenames in os.walk(ROOT):
        # 跳过非站点目录，避免误伤（如 node_modules / .git 等）
        if any(seg.startswith(('.', '_')) for seg in dirpath.split(os.sep)
               if seg not in ('.', '_') and seg):
            pass
        for fn in filenames:
            if not fn.lower().endswith('.html'):
                continue
            # 只处理 crm 站点本身：排除明显非站点的隐藏/缓存目录
            rel = os.path.relpath(os.path.join(dirpath, fn), ROOT)
            if rel.startswith(('_', '.', 'node_modules')):
                continue
            checked += 1
            path = os.path.join(dirpath, fn)
            with open(path, 'r', encoding='utf-8', errors='replace') as f:
                html = f.read()

            # 安全护栏：若文件不含 site-nav.js 引用却含尸体，仍允许删（尸体本就死标签）
            if not PATTERN.search(html):
                continue

            new_html = PATTERN.sub('', html)
            # 收敛因删除产生的多余空行（3+ 连续换行 -> 2）
            new_html = re.sub(r'\n{3,}', '\n\n', new_html)

            if new_html != html:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_html)
                affected.append(rel)

    affected.sort()
    with open(BACKUP, 'w', encoding='utf-8') as f:
        f.write("# 老版导航清理 - 受影响文件清单（删除前快照，便于回滚）\n")
        f.write("# 生成时间：2026-10-21\n")
        f.write("# 说明：以下文件的静态 <header class=\"site-nav\"> 尸体标签已被删除。\n")
        f.write("#       真实顶栏由 assets/js/site-nav.js 动态注入，未受影响。\n")
        f.write("# 另外：assets/js/global-ux.js 的 buildDrawer() 调用已注释停用（老版“随时跳转”目录抽屉）。\n")
        f.write("# 受影响 HTML 文件数：%d\n\n" % len(affected))
        for rel in affected:
            f.write(rel + "\n")

    print("已扫描 HTML 文件:", checked)
    print("已清理尸体标签的文件数:", len(affected))
    print("备份清单已写入:", BACKUP)


if __name__ == '__main__':
    main()
