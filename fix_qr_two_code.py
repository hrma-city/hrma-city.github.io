#!/usr/bin/env python3
# 教材⑧配套资源二维码：三码 -> 两码（题库 + 游戏），移除云璟(qr-kd)，
# 将「登顶之路二维码」统一改名为通用「游戏二维码」，并去除子集书中的重复题库码。
# 用统一规范模板（正确 viewBox）重建每个 qrw 块，同时修掉旧版小写 viewbox 渲染缺陷。
# 幂等：仅对仍含 qr-kd 的文件生效；已为两码的文件跳过。
import re, os, zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))

SYM_KD = re.compile(r'<symbol id="qr-kd"[\s\S]*?</symbol>')
TPL_TK  = '<div class="qr"><svg viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="题库二维码"><use href="#qr-tk"/></svg><span>题库二维码</span></div>'
TPL_Q46 = '<div class="qr"><svg viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="游戏二维码"><use href="#qr-q46"/></svg><span>游戏二维码</span></div>'
NEW_BLOCK = f'<div class="qrw">{TPL_TK}{TPL_Q46}</div>'

def _qrw_spans(s):
    """返回所有 <div class="qrw"> ... 匹配闭合</div> 的 (start,end) 区间（支持子 div 嵌套）。"""
    spans=[]; i=0; L=len(s)
    while True:
        j=s.find('<div class="qrw">', i)
        if j<0: break
        depth=0; pos=j
        while pos<L:
            o=s.find('<div', pos); c=s.find('</div>', pos)
            if c<0: break
            if o>=0 and o<c:
                depth+=1; pos=o+4
            else:
                depth-=1; pos=c+6
                if depth==0:
                    spans.append((j,pos)); i=pos; break
        else:
            break
        if depth!=0: break
    return spans

def fix_html_text(s):
    if 'qr-kd' not in s and '通关游戏二维码' not in s and '登顶之路二维码' not in s:
        return s, 0
    spans=_qrw_spans(s)
    if not spans:
        # 兜底：无 qrw 时仅做全局改名与 sprite 清理
        s2=s.replace('通关游戏二维码','游戏二维码').replace('登顶之路二维码','游戏二维码')
        return SYM_KD.sub('', s2), 0
    # 从后往前替换，避免区间偏移
    out=s
    n=0
    for st,en in reversed(spans):
        out=out[:st]+NEW_BLOCK+out[en:]
        n+=1
    # 顺带归一化 qrw 之外的说明文字里残留的旧码名
    out=out.replace('通关游戏二维码','游戏二维码').replace('登顶之路二维码','游戏二维码')
    out=SYM_KD.sub('', out)            # 删掉云璟 sprite
    return out, n

def process_html(path):
    s = open(path, encoding='utf-8').read()
    if 'qr-kd' not in s and '通关游戏二维码' not in s and '登顶之路二维码' not in s:
        return f'{os.path.basename(path)}: 无 qr-kd，跳过'
    s2, n = fix_html_text(s)
    if s2 != s:
        open(path, 'w', encoding='utf-8').write(s2)
        assert 'qr-kd' not in s2, 'qr-kd 残留!'
        assert '通关游戏二维码' not in s2, '通关游戏二维码 残留!'
        assert '登顶之路二维码' not in s2, '登顶之路二维码 残留!'
        assert 'qr-q46' in s2, 'qr-q46 丢失!'
        assert s2.count('游戏二维码') >= n*2, f'游戏二维码 数量异常: {s2.count("游戏二维码")} vs {n*2}'
        return f'{os.path.basename(path)}: 规范化 {n} 个 qrw 块，移除 qr-kd ✓'
    return f'{os.path.basename(path)}: 无变化'

def process_epub(path):
    with zipfile.ZipFile(path, 'r') as z:
        names = z.namelist()
        data = {n: z.read(n) for n in names}
    changed = False
    for n in names:
        if n.lower().endswith(('.xhtml', '.html', '.htm')):
            try:
                txt = data[n].decode('utf-8')
            except Exception:
                continue
            if 'qr-kd' in txt:
                txt2, _ = fix_html_text(txt)
                if txt2 != txt:
                    data[n] = txt2.encode('utf-8')
                    changed = True
    if not changed:
        return f'{os.path.basename(path)}: 无 qr-kd，跳过'
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_STORED) as z:
        for n in sorted(names, key=lambda x: (x != 'mimetype', x)):
            z.writestr(n, data[n])
    return f'{os.path.basename(path)}: EPUB 内二维码已更新 ✓'

if __name__ == '__main__':
    targets = []
    for base, _, files in os.walk(ROOT):
        if '/backup/' in base or base.endswith('/backup'):
            continue
        for f in files:
            if f.endswith('.html') and f != 'index.html':
                targets.append(os.path.join(base, f))
    for t in sorted(targets):
        c = open(t, encoding='utf-8', errors='ignore').read()
        # 仅处理现行教材体系（class="qrw"）的二维码块；
        # class="qri" 为 L123「知识灯」旧版打印件的遗留结构，保留原貌不动。
        if 'class="qrw"' in c and ('qr-kd' in c or '通关游戏二维码' in c or '登顶之路二维码' in c):
            print(process_html(t))
    for ep in sorted(os.listdir(ROOT)):
        if ep.endswith('.epub') and 'book-reader' in ep:
            print(process_epub(os.path.join(ROOT, ep)))
