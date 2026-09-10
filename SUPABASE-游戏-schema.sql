/* ============================================================================
 * RMC 收益管理社区 · 多人联机游戏（对抗 + 协作双模式）
 * ----------------------------------------------------------------------------
 * 一次性在 Supabase → SQL Editor 粘贴运行（幂等，可重复执行）。
 *
 * 三张表：
 *   game_rooms     房间（模式 / 房主 / 状态 / 回合 / 场景配置）
 *   game_players   房间内玩家（累计分 / 是否房主）
 *   game_rounds    每回合出价与结算结果（持久化，可复盘）
 *
 * 实时交互走 Supabase Realtime（Presence + Broadcast），不经这些表；
 * 这些表只负责「大厅列表 + 持久化排行榜 + 复盘」，因此全部公开可读。
 *
 * 管理员邮箱与全站保持一致。
 * ========================================================================== */

/* ---------------- 1. 房间 ---------------- */
create table if not exists public.game_rooms (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,                 -- 房间号（加入用）
  mode         text not null default 'showdown',     -- showdown（对抗） | coop（协作）
  host         uuid,                                 -- 房主 user_id
  status       text not null default 'lobby',        -- lobby | playing | finished
  round        int  not null default 0,
  total_rounds int  not null default 6,
  config       jsonb not null default '{}'::jsonb,   -- {demand,capacity,target,adr_min,adr_max}
  created_at   timestamptz not null default now()
);
create index if not exists game_rooms_status_idx
  on public.game_rooms (status, created_at desc);

/* ---------------- 2. 玩家 ---------------- */
create table if not exists public.game_players (
  id       uuid primary key default gen_random_uuid(),
  room_id  uuid not null references public.game_rooms(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  name     text not null default '',
  score    int  not null default 0,
  is_host  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (room_id, user_id)
);
create index if not exists game_players_room_idx on public.game_players (room_id);

/* ---------------- 3. 回合 ---------------- */
create table if not exists public.game_rounds (
  id        uuid primary key default gen_random_uuid(),
  room_id   uuid not null references public.game_rooms(id) on delete cascade,
  round     int  not null,
  bids      jsonb not null default '{}'::jsonb,     -- {user_id: {adr, name}}
  results   jsonb not null default '{}'::jsonb,     -- {user_id: {adr, occ, revpar, delta}}
  created_at timestamptz not null default now(),
  unique (room_id, round)
);

/* ---------------- 4. RLS ---------------- */
alter table public.game_rooms   enable row level security;
alter table public.game_players enable row level security;
alter table public.game_rounds  enable row level security;

do $$
declare
  admin_emails text[] := array['rm-community@qq.com','3984557428@qq.com'];
begin
  -- rooms：公开可读（大厅展示）；登录可建（host=自己）；房主/管理员可改
  drop policy if exists gr_read on public.game_rooms;
  create policy gr_read on public.game_rooms for select using (true);

  drop policy if exists gr_insert on public.game_rooms;
  create policy gr_insert on public.game_rooms
    for insert to authenticated with check (auth.uid() = host);

  drop policy if exists gr_update on public.game_rooms;
  create policy gr_update on public.game_rooms
    for update to authenticated
    using  (auth.uid() = host
            or (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']))
    with check (auth.uid() = host
            or (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']));

  -- players：公开可读（大厅人数 / 排行榜）；本人可写自己；房主 / 管理员可管
  drop policy if exists gp_read on public.game_players;
  create policy gp_read on public.game_players for select using (true);

  drop policy if exists gp_write on public.game_players;
  create policy gp_write on public.game_players
    for all to authenticated
    using  (auth.uid() = user_id
            or auth.uid() = (select host from public.game_rooms where id = room_id)
            or (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']))
    with check (auth.uid() = user_id
            or auth.uid() = (select host from public.game_rooms where id = room_id)
            or (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']));

  -- rounds：公开可读（复盘）；房主 / 管理员可写
  drop policy if exists grd_read on public.game_rounds;
  create policy grd_read on public.game_rounds for select using (true);

  drop policy if exists grd_write on public.game_rounds;
  create policy grd_write on public.game_rounds
    for all to authenticated
    using  (auth.uid() = (select host from public.game_rooms where id = room_id)
            or (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']))
    with check (auth.uid() = (select host from public.game_rooms where id = room_id)
            or (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']));
end $$;

/* ---------------- 5. 授权 ---------------- */
grant select                                on public.game_rooms,   public.game_players, public.game_rounds to anon, authenticated;
grant insert, update, delete               on public.game_players to authenticated;
grant insert, update                        on public.game_rounds  to authenticated;
grant all                                   on public.game_rooms   to authenticated;

/* ============================================================================
 * 玩法说明（给管理员 / 联调参考）
 *
 * 对抗模式 showdown：同一晚虚拟需求 D 间夜，所有玩家是不同酒店（容量 cap）。
 *   每回合各报 ADR，份额 = (1/adr_i)/Σ(1/adr_j)，出租率 = min(份额·D/cap,1)，
 *   RevPAR = adr·出租率，累计 RevPAR 即总分，回合结束按总分排名。
 *
 * 协作模式 coop：全员共同经营一家虚拟酒店（容量 cap，需求 D 随价弹性）。
 *   每回合各报建议价，取中位数作统一售价，RevPAR 全员共享，合力冲刺目标线。
 *
 * 计算逻辑全部在客户端（房主汇总），结果写 game_rounds 并广播，简单可复现。
 * ========================================================================== */

/* ---------------- 6. Realtime 授权（关键！少了这段联机不通）----------------
 * 2024 年之后新建的 Supabase 项目默认开启 Realtime Authorization：
 * realtime.messages 表启用了 RLS，且默认**没有任何策略**。
 * 后果：客户端的 broadcast / presence 被静默拦截 —— 房间能进、人数能看，
 *       但出价、开回合、结算结果全都不同步，且控制台不一定报错，极难排查。
 * 下面两条策略放行「已登录用户收发广播」，是本游戏能真正联机的前提。
 * 幂等，可重复执行。
 * ------------------------------------------------------------------------ */
drop policy if exists "rt_recv_broadcast" on realtime.messages;
create policy "rt_recv_broadcast" on realtime.messages
  for select to authenticated using (true);

drop policy if exists "rt_send_broadcast" on realtime.messages;
create policy "rt_send_broadcast" on realtime.messages
  for insert to authenticated with check (true);
