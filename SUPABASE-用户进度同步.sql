-- ============================================================================
--  HRMA 学院 · 用户进度云同步表
-- ----------------------------------------------------------------------------
--  作用：把学员在本站的 8 项学习进度（训练营/闯关/打卡/错题/案例/误区/路径/
--        自检/自学）跨设备同步到云端，换手机、清缓存都不丢。
--
--  用法：在 Supabase 控制台 → SQL Editor 新建查询，整段粘贴，点 Run。只需一次。
--  依赖：auth.users 已存在（Supabase 鉴权自带），profiles 表可不存在。
-- ============================================================================

create table if not exists public.user_progress (
  user_id    uuid        primary key references auth.users(id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

-- 仅本人可读
drop policy if exists up_own_select on public.user_progress;
create policy up_own_select on public.user_progress
  for select using (auth.uid() = user_id);

-- 仅本人可写（插入/更新都限制为自己的 user_id）
drop policy if exists up_own_insert on public.user_progress;
create policy up_own_insert on public.user_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists up_own_update on public.user_progress;
create policy up_own_update on public.user_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 已登录角色可操作（anon 无权限，自动被 RLS 拒绝）
grant select, insert, update on public.user_progress to authenticated;
