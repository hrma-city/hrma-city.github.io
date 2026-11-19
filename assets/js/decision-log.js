/* ==========================================================================
   RMC 教学陪练 · 统一决策轨迹记录器
   --------------------------------------------------------------------------
   每个决策游戏提交时调用 RMCLog.add({game,type,round})，把决策轨迹写入本机。
   学情透镜（class-insight.html）读取同一 key 汇总。
   只存偏误类型与游戏标识，不存个人身份、不上传、可一键清空。
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'hrma_decision_log_v1';
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; }
    catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(-500))); } catch (e) {}
  }
  window.RMCLog = {
    add: function (rec) {
      var list = load();
      list.push({
        t: Date.now(),
        game: rec.game || '',
        type: rec.type || '',
        round: rec.round || 1,
        title: rec.title || ''
      });
      save(list);
    },
    all: load,
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };
})();
