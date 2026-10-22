const fs = require('fs');
const { JSDOM } = require('jsdom');
const path = '/Users/abc/WorkBuddy/2026-09-03-08-48-09/hrma/crm/ai-drama-audio.html';
const html = fs.readFileSync(path, 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only' });
const d = dom.window.document;
let ok = true;
const log = (m) => console.log(m);

// 1. 目录锚点
const anchors = [...d.querySelectorAll('.toc a[href^="#"]')].map(a => a.getAttribute('href').slice(1));
let missing = anchors.filter(id => !d.getElementById(id));
log('目录锚点数=' + anchors.length + ' 缺失id=' + (missing.length ? missing.join(',') : '无'));
if (missing.length) ok = false;

// 2. 3 集齐全
let epMiss = [];
['ep01','ep02','ep03'].forEach(id => { if (!d.getElementById(id)) epMiss.push(id); });
log('样集集数: 期望3 实际=' + d.querySelectorAll('h2[id^="ep0"]').length + ' 缺=' + (epMiss.length ? epMiss.join(',') : '无'));
if (epMiss.length) ok = false;

// 3. 旁白/SFX/BGM 标注
const txt = d.body.textContent;
const nar = txt.includes('【旁白】');
const sfx = (txt.match(/【SFX：/g) || []).length;
const bgm = (txt.match(/【BGM：/g) || []).length;
log('旁白标注=' + nar + ' SFX数=' + sfx + ' BGM数=' + bgm);
if (!nar || sfx < 3 || bgm < 3) ok = false;

// 4. 知识点口播 + 金句
const kp = d.querySelectorAll('.kp').length;
const gold = d.querySelectorAll('.gold').length;
log('口播知识点=' + kp + ' 金句=' + gold);
if (kp < 3 || gold < 3) ok = false;

// 5. 内链存在
const links = [...new Set([...d.querySelectorAll('a[href$=".html"]')].map(a => a.getAttribute('href')))];
const base = '/Users/abc/WorkBuddy/2026-09-03-08-48-09/hrma/crm/';
let dead = links.filter(h => !fs.existsSync(base + h));
log('内链=' + links.join(',') + ' 死链=' + (dead.length ? dead.join(',') : '无'));
if (dead.length) ok = false;

// 6. 注门头部
const gate = html.includes('assets/js/access-gate.js') && html.includes('auth-config.js') && html.includes('noindex');
log('注门头部=' + (gate ? '完整' : '缺失'));
if (!gate) ok = false;

console.log(ok ? '\nSELFCHECK_PASS' : '\nSELFCHECK_FAIL');
process.exit(ok ? 0 : 1);
