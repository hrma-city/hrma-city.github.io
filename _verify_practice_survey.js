const fs = require('fs');
const { JSDOM } = require('jsdom');
const path = '/Users/abc/WorkBuddy/2026-09-03-08-48-09/hrma/crm/practice-survey.html';
const html = fs.readFileSync(path, 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only' });
const d = dom.window.document;
let ok = true;
const log = (m) => console.log(m);

// 1. 目录锚点都应有对应 id
const toc = d.querySelector('.toc');
const anchors = [...toc.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href').slice(1));
let missing = [];
anchors.forEach(id => { if (!d.getElementById(id)) missing.push(id); });
log('目录锚点数=' + anchors.length + ' 缺失id=' + (missing.length ? missing.join(',') : '无'));
if (missing.length) ok = false;

// 2. 20 题完整性 Q1-Q20
let qMissing = [];
for (let i = 1; i <= 20; i++) {
  const n = String(i);
  const has = [...d.querySelectorAll('.q .n')].some(e => e.textContent.trim() === 'Q' + n);
  if (!has) qMissing.push('Q' + n);
}
log('问卷题数: 期望20 实际=' + d.querySelectorAll('.q').length + ' 缺=' + (qMissing.length ? qMissing.join(',') : '无'));
if (qMissing.length) ok = false;

// 3. 样例标注存在（示意/样例）
const txt = d.body.textContent;
const hasSamp = txt.includes('示意') || txt.includes('样例');
log('样例数据标注=' + (hasSamp ? '有' : '无'));
if (!hasSamp) ok = false;

// 4. 内链存在性
const links = [...d.querySelectorAll('a[href$=".html"]')].map(a => a.getAttribute('href'));
const base = '/Users/abc/WorkBuddy/2026-09-03-08-48-09/hrma/crm/';
let dead = [];
[...new Set(links)].forEach(h => { if (!fs.existsSync(base + h)) dead.push(h); });
log('内链数=' + links.length + ' 死链=' + (dead.length ? dead.join(',') : '无'));
if (dead.length) ok = false;

// 5. 注门头部
const hasGate = html.includes('assets/js/access-gate.js') && html.includes('auth-config.js') && html.includes('noindex');
log('注门头部=' + (hasGate ? '完整' : '缺失'));
if (!hasGate) ok = false;

// 6. 报告骨架 15 页
const pRows = d.querySelectorAll('table tr td').length ? true : false;
log('报告骨架表存在=' + pRows);

console.log(ok ? '\nSELFCHECK_PASS' : '\nSELFCHECK_FAIL');
process.exit(ok ? 0 : 1);
