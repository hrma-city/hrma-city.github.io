#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 textbook.html（1–32 章）+ textbook-merged.html（33–41 现实篇）抽取知识点，
生成可在线判分的题库 textbook_quiz.js（crm 根目录，learn.html 直接加载）。
规则（只抽教材里明确写过的表述，不自己编知识）：
  1) 术语定义题  ：<b>术语</b>＝定义 / <b>术语</b>——定义
  2) 判定表题    ：本章判定表每行「情形 → 结论」，考"遇到该情形怎么办"
  3) 公式题      ：核心公式块的公式名与式子
  4) 33–41 章   ：merged 新章无三源结构块，改抽 <b>术语</b>：定义 与「学习目标」分句；
    素材不足的章（36/38/40/41）由 EXTRA 补人工题（全部依据 merged 正文，题解带出处）。
干扰项从同章其他条目里取，保证同质、可区分。
"""
import re, json, os, random

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, 'textbook.html')
SRC_MERGED = os.path.join(BASE, 'textbook-merged.html')   # 33–41 章现实篇（成书全本）
# ⚠️ OUT 必须是 crm 根目录：learn.html 用 <script src="textbook_quiz.js?v=2"> 直接加载；
# 过去曾指向 data/ 导致线上文件与生成器脱节，已修正。
OUT = os.path.join(BASE, 'textbook_quiz.js')

# ── 双体系 16 域 + 兜底（对照 optimize-plan-2026.html 第二节逐域覆盖矩阵）──
# 域码统一为 D01–D16 + D00（兜底/综合）。章→域映射只引用 textbook.html 现存的 1–32 章；
# 原方案里的第 33、41 章在本教材不存在，其知识点（广告牌效应/总收益）已并入对应现存章。
DOMAINS = {
    'D01': '基础与战略杠杆',
    'D02': '指标体系与绩效分析',
    'D03': '需求预测',
    'D04': '可用性与时长控制',
    'D05': '定价策略',
    'D06': '价格栅栏',
    'D07': '分销渠道与战略分销',
    'D08': '超售',
    'D09': '团队业务与销售协同',
    'D10': '总收益战略与非传统应用',
    'D11': '收益专业者',
    'D12': '经济学成本',
    'D13': '部门整合',
    'D14': '理解市场',
    'D15': '客源细分与最优组合',
    'D16': '新兴要素（AI等）',
    'D00': '综合与跨域（兜底）',
}
# 章号（字符串 '01'..'32'）→ 域码列表。每章≥4题，故单章映射的域也天然≥2题。
DOMAIN_OF = {
    '01': ['D01'],
    '02': ['D02'],
    '03': ['D02', 'D14'],
    '04': ['D05', 'D12'],
    '05': ['D05'], '06': ['D05'], '07': ['D05'], '08': ['D05'], '09': ['D05'],
    '10': ['D04', 'D06'],
    '11': ['D08'],
    '12': ['D04'],
    '13': ['D07'],
    '14': ['D06', 'D15'],
    '15': ['D09'],
    '16': ['D07', 'D15'],
    '17': ['D00'], '18': ['D00'], '28': ['D00'], '32': ['D00'],
    '19': ['D11', 'D13'],
    '20': ['D03'], '21': ['D03'],
    '22': ['D05', 'D06'],
    '23': ['D02'],
    '24': ['D07', 'D16'],
    '25': ['D11'],
    '26': ['D12'],
    '27': ['D16'],
    '29': ['D10'],
    '30': ['D09', 'D10'],
    '31': ['D10'],
    # 33–41 现实篇（成书新增九章）
    '33': ['D07'],              # 中国渠道生态
    '34': ['D07'],              # 连锁与中央预订
    '35': ['D16'],              # AI 工具做收益分析
    '36': ['D00'],              # 危机与极端场景（跨域综合）
    '37': ['D11'],              # 收益岗位与职业发展
    '38': ['D00'],              # 变革篇五件事（跨域综合）
    '39': ['D03'],              # 周期与不确定性（需求预测）
    '40': ['D16'],              # 人工智能与收益管理（科普）
    '41': ['D10'],              # 绿色收益管理与可持续
}
def doms_of(no):
    return DOMAIN_OF.get(no, ['D00'])

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

# ── 33–41 现实篇：人工补题（素材不足的章；全部依据 textbook-merged.html 正文，题解带出处）──
EXTRA_3341 = {
    '36': [
        dict(type='judge', stem='第 36 章：极端场景下的第一动作，永远是"止血"，不是"优化"。',
             opts=['对', '错'], ans='对',
             exp='教材第 36 章：先停止自动动作、冻结激进策略、保护可售库存与现金流，再谈恢复。'),
        dict(type='choice', stem='第 36 章：需求骤停时该不该降价？',
             opts=['不该——客人不来是因为"不能来"不是"嫌贵"，降价白送利润且破坏恢复期价格体系',
                   '该——降价总能换来量',
                   '该——先降 30% 占住市场再涨回来',
                   '视超售率而定，超售高就降价'],
             ans='不该——客人不来是因为"不能来"不是"嫌贵"，降价白送利润且破坏恢复期价格体系',
             exp='教材第 36 章两条原则①：不恐慌降价。降价是"需求弹性问题"的解药，不是"需求消失问题"的解药。'),
        dict(type='choice', stem='第 36 章：危机期取消政策为什么要主动放宽？',
             opts=['竞争对手也在放宽；取消变改期，收入只是延后不是消失',
                   '为了清空库存回笼现金',
                   '为了提高当期出租率',
                   '因为系统故障无法执行原政策'],
             ans='竞争对手也在放宽；取消变改期，收入只是延后不是消失',
             exp='教材第 36 章 36.2：危机期放宽是为保住客户关系与未来复购；改期让收入延后而非消失。'),
        dict(type='choice', stem='第 36 章：恢复期最贵的是什么？',
             opts=['把价格涨回去——降 30% 后价格记忆要 3–6 个月才能修复',
                   '重新招聘员工',
                   '赎回低价渠道的库存',
                   '修补 PMS 系统'],
             ans='把价格涨回去——降 30% 后价格记忆要 3–6 个月才能修复',
             exp='教材第 36 章：正确动作是用权益换（改期、储值、升级），不用价格换。'),
    ],
    '38': [
        dict(type='choice', stem='第 38 章：算法化时代，收益经理的角色位移到哪三个地方？',
             opts=['定规则、看异常、担责任',
                   '调价、报表、排房',
                   '预测、比价、执行',
                   '采购、谈判、培训'],
             ans='定规则、看异常、担责任',
             exp='教材第 38 章 38.1：人从"调价的"变成"管调价系统的"，位移到定规则/看异常/担责任。'),
        dict(type='choice', stem='第 38 章：全域化之后，宴会与餐厅的收益判据分别是什么？',
             opts=['宴会看总贡献（客房+餐饮+场地+附加）；餐厅看 RevPASH（每座位时收入）',
                   '宴会看房价；餐厅看出翻台率',
                   '宴会看出租率；餐厅看客单价',
                   '都看 RevPAR'],
             ans='宴会看总贡献（客房+餐饮+场地+附加）；餐厅看 RevPASH（每座位时收入）',
             exp='教材第 38 章 38.2：跨业态看同一问题——库存会不会过期、边际成本低不低、需求能不能预测。'),
        dict(type='choice', stem='第 38 章：成熟市场与不成熟市场里，收益岗位的分水岭是什么？',
             opts=['汇报能力——能把"进度落后 4%"翻译成"少赚 18 万、原因是 OTA 让利 3%、下月收窄促销"',
                   '会不会用 RMS 系统',
                   '学历与证书',
                   '英语水平'],
             ans='汇报能力——能把"进度落后 4%"翻译成"少赚 18 万、原因是 OTA 让利 3%、下月收窄促销"',
             exp='教材第 38 章 38.3：分水岭不是技术，是汇报能力；翻译得出来是利润中心，翻译不出来是成本中心。'),
        dict(type='choice', stem='第 38 章：渠道透明化后，从"规矩"升级为"生死线"的两个动作是？',
             opts=['净价思维与价格一致性',
                   '超售与升档',
                   '团队与协议价',
                   '促销与会员积分'],
             ans='净价思维与价格一致性',
             exp='教材第 38 章 38.4：客人扫码即比价，净价思维（看到手价）与价格一致性（直销不得高于最低 OTA）成为生死线。'),
    ],
    '40': [
        dict(type='choice', stem='第 40 章：AI 在收益管理里做的事，本质是哪三件事的自动化？',
             opts=['预测、定价、优化',
                   '记账、对账、开票',
                   '排班、采购、维修',
                   '获客、留客、复购'],
             ans='预测、定价、优化',
             exp='教材第 40 章：收益管理的人工智能应用，本质是预测、定价、优化三件事的自动化。'),
        dict(type='choice', stem='第 40 章：成熟的动态定价与预测系统对 RevPAR 的边际贡献约是多少？',
             opts=['5%–8%，是"放大器"不是"引擎"',
                   '30% 以上，用系统就能起死回生',
                   '1% 以下，基本没用',
                   '与酒店规模成正比，无固定区间'],
             ans='5%–8%，是"放大器"不是"引擎"',
             exp='教材第 40 章：行业通行口径下，边际贡献通常在 5%–8% 区间——锦上添花，不是起死回生。'),
        dict(type='choice', stem='第 40 章：AI 不能替代、必须由人掌握的三件事是？',
             opts=['设定边界、识别异常、对业主解释',
                   '清数据、跑模型、出报表',
                   '订价、订房、订餐',
                   '招聘、排班、考核'],
             ans='设定边界、识别异常、对业主解释',
             exp='教材第 40 章：一个无法解释的决定，在酒店这种重信任的行业里落不了地。'),
        dict(type='judge', stem='第 40 章：这轮 AI 替代会先从一线操作岗开始，坐办公室的专业岗靠后。',
             opts=['对', '错'], ans='错',
             exp='教材第 40 章：顺序与直觉相反——先被追平的是"会算数的"专业岗，因为 AI 进步最快的是有标准答案、对错能马上验算的环节。'),
        dict(type='choice', stem='第 40 章：用 AI 的三条纪律是？',
             opts=['脏数据先清后喂；建议不等于指令（不可逆动作要人批）；留痕可溯',
                   '多买系统、多招人、多开会',
                   '全自动、全托管、全信任',
                   '先上系统、再补数据、后建流程'],
             ans='脏数据先清后喂；建议不等于指令（不可逆动作要人批）；留痕可溯',
             exp='教材第 40 章：算法给建议，判定表做校验与兜底，不可逆动作必须人工批准。'),
    ],
    '41': [
        dict(type='choice', stem='第 41 章：可持续给收益管理带来的两个新变量是？',
             opts=['成本侧抬高打平量；需求侧提供差异化卖点',
                   '涨价空间变大；能耗归零',
                   '出租率上升；房价下降',
                   '佣金减免；税负降低'],
             ans='成本侧抬高打平量；需求侧提供差异化卖点',
             exp='教材第 41 章：能源/水/洗涤/一次性用品是变动成本，会抬高打平量；绿色认证成为部分客源的筛选条件与差异化卖点。'),
        dict(type='choice', stem='第 41 章：绿色怎么写进已有判定表？',
             opts=['在降价底线计入节能降耗带来的变动成本下降；客源细分用"绿色权益包"替代直接降价',
                   '另建一套绿色判定表，与原表并行',
                   '所有房型统一加收绿色附加费',
                   '只做宣传叙事，不动判定表'],
             ans='在降价底线计入节能降耗带来的变动成本下降；客源细分用"绿色权益包"替代直接降价',
             exp='教材第 41 章：绿色权益包是"用感知价值换支付意愿"，不是不可逆的降价。'),
        dict(type='judge', stem='第 41 章：绿色收益的正确顺序是先讲好故事，再算成本。',
             opts=['对', '错'], ans='错',
             exp='教材第 41 章三条纪律：先算成本再谈叙事；防漂绿（认证可核验、承诺可兑现）；与定位一致。'),
    ],
}

LABELS = ['A', 'B', 'C', 'D']

def _distract(ans, local, pool, k=3):
    cands = [x for x in local if x != ans]
    cands.sort(key=lambda x: abs(len(x) - len(ans)))
    out = cands[:k]
    if len(out) < k:
        near = [x for x in pool if x != ans and x not in out]
        near.sort(key=lambda x: abs(len(x) - len(ans)))
        out += near[:k - len(out)]
    return out

def build_3341(hm):
    """从 textbook-merged.html 抽 33–41 章术语题与学习目标题，返回题目列表。"""
    qs = []
    goal_pool = []   # (章号, 目标句) 全书目标池，互为干扰项
    chapters = []
    all_def = []     # 全书定义池（跨章兜底干扰项）
    for n in range(33, 42):
        i = hm.find('id="mch%d"' % n)
        if i < 0:
            continue
        j = hm.find('id="mch%d"' % (n + 1)) if n < 41 else hm.find('id="appA"', i)
        if j < 0:
            j = len(hm)
        seg = hm[i:j]
        m = re.search(r'<summary[^>]*>(.*?)</summary>', seg, re.S)
        title = trim(re.sub(r'^第\s*\d+\s*章', '', clean(m.group(1))).replace('新增', '').strip(), 40) if m else ''
        no = str(n)
        # ① 定义句：<b>术语</b>：定义（merged 新章的写法）；排除占位与叙述标签
        terms = []
        for tm, df in re.findall(r'<b>([^<>]{3,24})</b>[：:]\s*([^<]{15,130})', seg):
            tm = re.sub(r'^[①②③④⑤⑥⑦⑧]\s*', '', clean(tm))
            if tm in ('学习目标', '案例导入', '本章口诀', '学完这章你能', '易错点', '共同规律',
                      '为什么危机期要放宽', '常规期', '危机期', '恢复期', '思政融入点'):
                continue
            df = clean(df)
            if _ok_def(df) and not df.startswith(('云璟', '教材')):
                terms.append((tm, df))
                all_def.append(df)
        chapters.append(dict(no=no, title=title, terms=terms, goals=[]))
        # ② 学习目标分句
        g = re.search(r'学习目标</b>\s*(.*?)</div>', seg, re.S)
        if g:
            parts = re.split(r'[①②③④⑤⑥]', clean(g.group(1)))
            for p in parts:
                p = p.strip('；;。 ')
                if len(p) >= 12:
                    goal_pool.append((no, p))
                    chapters[-1]['goals'].append(p)
    for ch in chapters:
        no, title = ch['no'], ch['title']
        pool_def = [d for _, d in ch['terms']]
        for t, d in ch['terms'][:4]:
            opts = [d] + _distract(d, pool_def, all_def)
            random.shuffle(opts)
            qs.append(dict(
                ch=no, type='def', stem=f'教材第 {int(no)} 章中，「{t}」指的是：',
                opts=[trim(o, 150) for o in opts], ans=trim(d, 150),
                exp=f'教材第 {int(no)} 章原文：{t}＝{trim(d, 90)}'))
        my_goals = ch['goals']
        for gp in my_goals[:2]:
            others = [x for n2, x in goal_pool if n2 != no][:3]
            if len(others) < 3:
                continue
            opts = [gp] + others
            random.shuffle(opts)
            qs.append(dict(
                ch=no, type='goal', stem=f'以下哪一项是第 {int(no)} 章「{title}」的学习目标？',
                opts=[trim(o, 120) for o in opts], ans=trim(gp, 120),
                exp=f'教材第 {int(no)} 章学习目标原文：{trim(gp, 100)}'))
        # ③ 人工补题
        for e in EXTRA_3341.get(no, []):
            q = dict(ch=no); q.update(e)
            qs.append(q)
    return qs


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
        q['dom'] = doms_of(q['ch'])          # 双体系知识域标签（列表，可多域）

    # ── 33–41 现实篇（成书新增九章）：追加编号，保持 1–32 章原 id 稳定 ──
    try:
        hm = open(SRC_MERGED, encoding='utf-8').read()
    except FileNotFoundError:
        hm = ''
    extra = build_3341(hm) if hm else []
    for k, q in enumerate(extra):
        q['id'] = 'q%03d' % (len(qs) + k + 1)
        q['dom'] = doms_of(q['ch'])
    qs += extra
    n33 = len(extra)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('/* 自动生成，源：textbook.html(1–32) + textbook-merged.html(33–41 现实篇)。'
                '生成器：build_textbook_quiz.py（改教材后重跑） */\n')
        f.write('window.HRMA_QUIZ=' + json.dumps(qs, ensure_ascii=False) + ';\n')
        # 域→{名称, 覆盖章, 题量} 元信息，供 learn.html 等知识域筛选/掌握图使用
        from collections import Counter, defaultdict
        dom_ch = defaultdict(set)
        for k, v in DOMAIN_OF.items():
            for d in v:
                dom_ch[d].add(k)
        dom_n = Counter()
        for q in qs:
            for d in q['dom']:
                dom_n[d] += 1
        dom_meta = {code: {'name': DOMAINS[code], 'chapters': sorted(dom_ch.get(code, [])),
                           'n': dom_n.get(code, 0)} for code in DOMAINS}
        f.write('window.HRMA_QUIZ_DOMAINS=' + json.dumps(dom_meta, ensure_ascii=False) + ';\n')
    # 汇总
    from collections import Counter
    cnt = Counter(q['ch'] for q in qs)
    print('题目总数', len(qs), '| 1–32章', len(qs) - n33, '| 33–41章(现实篇)', n33, '| 覆盖章数', len(cnt))
    print('每章题量：', ' '.join('%s:%d' % (k, cnt[k]) for k in sorted(cnt)))
    print('无题章：', [c['no'] for c in chapters if cnt[c['no']] < 4])
    for c in chapters:
        if cnt[c['no']] < 4:
            print('  缺', c['no'], c['title'], 'terms', len(c['terms']), 'rows', len(c['rows']),
                  'fml', len(c['formulas']))
    # 域覆盖校验：每个知识域≥2题（验收口径：100% 覆盖、每域≥2题）
    print('--- 域覆盖校验 ---')
    weak = [code for code in DOMAINS if dom_n.get(code, 0) < 2]
    for code in DOMAINS:
        flag = 'OK' if dom_n.get(code, 0) >= 2 else '⚠ <2'
        print('  %s %s 题量=%d 章=%s %s' % (code, DOMAINS[code], dom_n.get(code, 0),
                                            ','.join(sorted(dom_ch.get(code, []))) or '-', flag))
    print('弱覆盖域（<2题）：', weak if weak else '无，全部达标')

if __name__ == '__main__':
    main()
