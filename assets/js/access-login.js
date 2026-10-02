/* ==========================================================================
   HRMA 访问门 · 登录页逻辑（内联在 access.html）
   邮箱白名单：只有登记邮箱可进入。凭证存 localStorage，跨页面有效。
   ========================================================================== */
(function () {
  'use strict';
  var EMAIL = '3984557428@qq.com';
  var KEY = 'hrma_gate_v1';
  var SALT = 'hrma-9c1f-rm-2026';

  var msg = document.getElementById('msg');
  var btn = document.getElementById('btn');
  var inp = document.getElementById('email');
  var nextEl = document.getElementById('next');
  var next = nextEl ? nextEl.value : '';

  function ok(t) { msg.textContent = t || ''; msg.className = t ? 'msg ok' : 'msg bad'; }

  function allowed(email) {
    return String(email || '').trim().toLowerCase() === EMAIL;
  }

  function enter() {
    try { localStorage.setItem(KEY, EMAIL + '|' + SALT); } catch (e) {}
    var target = next || 'index.html';
    /* 只允许站内相对路径，防止被改成外站地址 */
    if (/^https?:/i.test(target) || target.charAt(0) === '/' || target.indexOf('..') >= 0) {
      target = 'index.html';
    }
    location.replace(target);
  }

  /* 已登录直接进 */
  try {
    if (localStorage.getItem(KEY) === EMAIL + '|' + SALT) {
      ok('已通过验证，正在进入…');
      setTimeout(enter, 350);
    }
  } catch (e) {}

  btn.addEventListener('click', function () {
    var v = inp.value;
    if (!v) { ok('请输入邮箱'); return; }
    if (allowed(v)) { enter(); }
    else { ok('此邮箱不在白名单内'); }
  });

  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') btn.click(); });
})();
