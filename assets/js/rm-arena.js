/* ============================================================================
 * RMC 收益管理社区 · 多人联机游戏引擎（对抗 showdown + 协作 coop）
 * ----------------------------------------------------------------------------
 * 暴露在 window.RMCArena。依赖：window.HRMA_SUPABASE（url/anonKey）、
 *               window.supabase（CDN supabase-js@2，已注入页面）。
 *
 * 实时交互：Supabase Realtime（Presence + Broadcast），客户端自建 client，
 *           从 localStorage 自动恢复登录态，故 Realtime 可识别 auth.uid()。
 * 持久化：game_rooms / game_players / game_rounds（大厅列表、排行榜、复盘）。
 *
 * 结算由「房主客户端」汇总广播出价后计算（MVP 简单可复现），结果写库并广播。
 * ========================================================================== */
(function (w) {
  "use strict";

  var _sb = null;
  function client() {
    if (_sb) return _sb;
    var cfg = w.HRMA_SUPABASE || {};
    if (!w.supabase || !cfg.url || !cfg.anonKey) return null;
    try { _sb = w.supabase.createClient(cfg.url, cfg.anonKey); }
    catch (e) { _sb = null; }
    return _sb;
  }

  async function ensureSession() {
    var c = client();
    if (!c) return { ok: false, error: "未配置 Supabase" };
    var r = await c.auth.getSession();
    var s = r && r.data && r.data.session;
    if (!s) return { ok: false, error: "未登录，请先登录" };
    return { ok: true, user: s.user };
  }

  /* ---------------- 工具 ---------------- */
  function r1(x) { return Math.round(x * 10) / 10; }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function genCode() {
    var s = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var o = "";
    for (var i = 0; i < 6; i++) o += s[Math.floor(Math.random() * s.length)];
    return o;
  }
  function defaultConfig() {
    return { a: 1.3, b: 0.0012, adr_min: 200, adr_max: 1200, round_sec: 18 };
  }
  function occOf(p, cfg) {
    var a = cfg.a != null ? cfg.a : 1.3, b = cfg.b != null ? cfg.b : 0.0012;
    return Math.max(0, Math.min(1, a - b * p));
  }

  /* ---------------- 收益计算（两种模式共用） ---------------- */
  // bids: { user_id: { adr, name } }  ->  results: { user_id: {adr,occ,revpar,delta} }
  function compute(room, bids) {
    var cfg = room.config || defaultConfig();
    var ids = Object.keys(bids);
    var results = {};
    if (room.mode === "coop") {
      var ps = ids.map(function (id) { return bids[id].adr; }).sort(function (x, y) { return x - y; });
      var med = ps.length ? ps[Math.floor((ps.length - 1) / 2)] : 600;
      var occ = occOf(med, cfg);
      var revpar = med * occ;
      var delta = Math.round(revpar);
      ids.forEach(function (id) {
        results[id] = { adr: med, occ: r1(occ * 100), revpar: Math.round(revpar), delta: delta, shared: true };
      });
    } else {
      ids.forEach(function (id) {
        var p = bids[id].adr;
        var occ = occOf(p, cfg);
        var revpar = p * occ;
        results[id] = { adr: p, occ: r1(occ * 100), revpar: Math.round(revpar), delta: Math.round(revpar), shared: false };
      });
    }
    return results;
  }

  /* ---------------- 大厅 / 房间 CRUD ---------------- */
  async function getRooms() {
    var c = client();
    if (!c) return { ok: false, error: "未配置" };
    var r = await c.from("game_rooms")
      .select("id,code,mode,host,status,round,total_rounds,config,created_at,players:game_players(count)")
      .in("status", ["lobby", "playing"])
      .order("created_at", { ascending: false }).limit(40);
    if (r.error) return { ok: false, error: r.error.message };
    return { ok: true, rooms: r.data };
  }

  async function createRoom(opts) {
    var s = await ensureSession(); if (!s.ok) return s;
    var user = s.user;
    var c = client();
    var room = {
      code: genCode(), mode: (opts && opts.mode) || "showdown",
      host: user.id, status: "lobby", round: 0,
      total_rounds: (opts && opts.totalRounds) || 6,
      config: (opts && opts.config) || defaultConfig()
    };
    var r, inserted = null;
    for (var i = 0; i < 6; i++) {
      r = await c.from("game_rooms").insert(room).select().single();
      if (!r.error) { inserted = r.data; break; }
      room.code = genCode();
    }
    if (!inserted) return { ok: false, error: (r && r.error && r.error.message) || "创建失败" };
    await c.from("game_players").upsert(
      { room_id: inserted.id, user_id: user.id, name: (opts && opts.name) || user.email, is_host: true },
      { onConflict: "room_id,user_id" });
    return { ok: true, room: inserted, user: user };
  }

  async function joinRoom(code, name) {
    var s = await ensureSession(); if (!s.ok) return s;
    var user = s.user;
    var c = client();
    var r = await c.from("game_rooms").select("*").eq("code", code).maybeSingle();
    if (r.error) return { ok: false, error: r.error.message };
    if (!r.data) return { ok: false, error: "房间不存在" };
    if (r.data.status === "finished") return { ok: false, error: "该房间已结束" };
    await c.from("game_players").upsert(
      { room_id: r.data.id, user_id: user.id, name: name || user.email, is_host: r.data.host === user.id },
      { onConflict: "room_id,user_id" });
    return { ok: true, room: r.data, user: user };
  }

  async function getPlayers(roomId) {
    var c = client();
    var r = await c.from("game_players").select("user_id,name,is_host").eq("room_id", roomId);
    return (r && r.data) || [];
  }

  async function leaveRoom(roomId, user) {
    var c = client(); if (!c || !user) return;
    await c.from("game_players").delete().eq("room_id", roomId).eq("user_id", user.id);
  }

  /* ---------------- Realtime 连接 ---------------- */
  var _chan = null, _cb = {}, _host = null, _user = null, _roomId = null;

  function chName(roomId) { return "rm-arena:" + roomId; }

  async function connect(roomId, user, name, cb) {
    var c = client();
    if (!c) return { ok: false, error: "未配置" };
    _cb = cb || {}; _user = user; _roomId = roomId;
    _chan = c.channel(chName(roomId), { config: { presence: { key: user.id } } });
    _chan.on("presence", { event: "sync" }, function () {
      if (_cb.onPresence) _cb.onPresence(_chan.presenceState());
    });
    _chan.on("broadcast", { event: "bid" }, function (pl) {
      var p = pl && pl.payload;
      if (!p) return;
      if (_host && p.round === _host.round) _host.bids[p.userId] = { adr: p.adr, name: p.name };
      if (_cb.onBid) _cb.onBid(p);
    });
    _chan.on("broadcast", { event: "round_start" }, function (pl) {
      if (_cb.onRoundStart) _cb.onRoundStart(pl.payload);
    });
    _chan.on("broadcast", { event: "result" }, function (pl) {
      if (_cb.onResult) _cb.onResult(pl.payload);
    });
    _chan.on("broadcast", { event: "final" }, function (pl) {
      if (_cb.onFinal) _cb.onFinal(pl.payload);
    });
    var status = await _chan.subscribe(async function (st) {
      if (st === "SUBSCRIBED") {
        await _chan.track({ user_id: user.id, name: name });
        if (_cb.onReady) _cb.onReady();
      }
    });
    return { ok: true, channel: _chan, status: status };
  }

  async function submitBid(round, adr) {
    if (!_chan) return;
    if (_host && _user) _host.bids[_user.id] = { adr: adr, name: _user.name || _user.email };
    await _chan.send({ type: "broadcast", event: "bid", payload: { userId: _user.id, name: _user.name || _user.email, round: round, adr: adr } });
  }

  async function leave() {
    if (_host) { clearTimeout(_host.timer); _host = null; }
    if (_chan) { await _chan.unsubscribe(); _chan = null; }
  }

  /* ---------------- 房主回合机 ---------------- */
  async function runHost(room, user) {
    _user = user;
    var players = await getPlayers(room.id);
    _host = { room: room, user: user, round: 0, total: room.total_rounds || 6,
              bids: {}, scores: {}, lastAdr: {}, timer: null, players: players };
    nextRound();
  }

  function nextRound() {
    if (!_host) return;
    _host.round++;
    if (_host.round > _host.total) { broadcastFinal(); return; }
    _host.bids = {};
    if (_chan) _chan.send({ type: "broadcast", event: "round_start", payload: { round: _host.round, total: _host.total } });
    if (_cb.onRoundStart) _cb.onRoundStart({ round: _host.round, total: _host.total });
    var sec = (_host.room.config && _host.room.config.round_sec) || 18;
    _host.timer = setTimeout(resolveRound, sec * 1000);
  }

  async function resolveRound() {
    if (!_host) return;
    clearTimeout(_host.timer);
    var players = await getPlayers(_host.room.id);
    var cfg = _host.room.config || defaultConfig();
    players.forEach(function (p) {
      if (!_host.bids[p.user_id]) {
        var last = _host.lastAdr && _host.lastAdr[p.user_id];
        _host.bids[p.user_id] = {
          adr: last != null ? last : Math.round((cfg.adr_min + cfg.adr_max) / 2),
          name: p.name
        };
      }
    });
    var results = compute(_host.room, _host.bids);
    Object.keys(results).forEach(function (id) {
      _host.scores[id] = (_host.scores[id] || 0) + results[id].delta;
    });
    await persistRound(_host.room.id, _host.round, _host.bids, results, _host.scores, players);
    if (_chan) _chan.send({ type: "broadcast", event: "result", payload: { round: _host.round, results: results, scores: _host.scores } });
    if (_cb.onResult) _cb.onResult({ round: _host.round, results: results, scores: _host.scores });
    _host.lastAdr = {};
    Object.keys(_host.bids).forEach(function (id) { _host.lastAdr[id] = _host.bids[id].adr; });
    setTimeout(nextRound, 4000);
  }

  async function persistRound(roomId, round, bids, results, scores, players) {
    var c = client(); if (!c) return;
    await c.from("game_rounds").upsert(
      { room_id: roomId, round: round, bids: bids, results: results },
      { onConflict: "room_id,round" });
    var rows = players.map(function (p) {
      return { room_id: roomId, user_id: p.user_id, name: p.name, score: scores[p.user_id] || 0 };
    });
    if (rows.length) {
      await c.from("game_players").upsert(rows, { onConflict: "room_id,user_id" });
    }
    await c.from("game_rooms").update({ round: round, status: "playing" }).eq("id", roomId);
  }

  async function broadcastFinal() {
    if (!_host) return;
    var c = client();
    if (c) await c.from("game_rooms").update({ status: "finished", round: _host.total }).eq("id", _host.room.id);
    var ranking = Object.keys(_host.scores)
      .map(function (id) { return { user_id: id, score: _host.scores[id] }; })
      .sort(function (x, y) { return y.score - x.score; });
    if (_chan) _chan.send({ type: "broadcast", event: "final", payload: { scores: _host.scores, ranking: ranking } });
    if (_cb.onFinal) _cb.onFinal({ scores: _host.scores, ranking: ranking });
  }

  /* ---------------- 导出 ---------------- */
  w.RMCArena = {
    client: client, ensureSession: ensureSession,
    getRooms: getRooms, createRoom: createRoom, joinRoom: joinRoom,
    getPlayers: getPlayers, leaveRoom: leaveRoom,
    connect: connect, submitBid: submitBid, leave: leave,
    runHost: runHost, compute: compute, defaultConfig: defaultConfig,
    esc: esc
  };
})(window);
