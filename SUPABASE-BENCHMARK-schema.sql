/* ============================================================================
 * RMC 收益管理社区 · 行业基准「社区共建样本池」
 * ----------------------------------------------------------------------------
 * 一次性在 Supabase SQL Editor 粘贴运行（幂等，可重复执行）。
 *
 * 背景：除上海外，绝大多数城市不公开月度 ADR / 出租率。
 *       要补齐城市级月度基准，只能靠会员按月上报、脱敏聚合后回看。
 *
 * 三条底线（建表时就用约束固化，不靠前端自觉）：
 *   1. k-匿名：聚合视图只暴露「样本数 >= 3」的城市×月份，不足 3 条不显示
 *   2. 防灌水：同一用户对同一城市同一月份只能有一条（唯一索引），重复提交即覆盖
 *   3. 防垃圾：ADR 与出租率用 CHECK 约束卡在合理区间
 * ========================================================================== */

-- ---------------- 1. 原始上报点 ----------------
create table if not exists public.benchmark_points (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  city          text not null,
  month         text not null,               -- 'YYYY-MM'
  adr           numeric not null,            -- 平均房价（元/间天）
  occ           numeric not null,            -- 出租率（百分数，如 67.6 表示 67.6%）
  rooms         integer,                     -- 可售房数（可选，用于加权）
  property_type text default 'other',        -- luxury|upscale|midscale|economy|other
  status        text not null default 'approved',  -- approved|rejected（管理员可驳回）
  created_at    timestamptz not null default now(),

  -- 防垃圾：合理区间
  constraint bp_adr_range check (adr >= 20 and adr <= 50000),
  constraint bp_occ_range check (occ >= 1 and occ <= 100),
  constraint bp_month_fmt check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

-- 防灌水：每人每城每月一条
create unique index if not exists uq_bp_user_city_month
  on public.benchmark_points (user_id, city, month);

create index if not exists idx_bp_city_month on public.benchmark_points (city, month);

-- ---------------- 2. 聚合视图（k-匿名） ----------------
-- 只暴露「样本数 >= 3」的聚合结果，不暴露单条上报，也不暴露 user_id。
drop view if exists public.benchmark_pool;
create view public.benchmark_pool
with (security_invoker = false)   -- 以属主权限运行：绕过基表 RLS，让匿名也能读到聚合结果
as
select
  city,
  month,
  count(*)::int                     as n,
  round(avg(adr))::int              as adr,
  round(avg(occ)::numeric, 1)       as occ
from public.benchmark_points
where status = 'approved'
group by city, month
having count(*) >= 3;
-- 说明：视图只暴露「城市×月份」的聚合值与样本数，不含 user_id，也不含任何单条上报。
--       匿名角色对基表 benchmark_points 无任何权限，只能通过本视图读取聚合结果。

-- ---------------- 3. RLS ----------------
alter table public.benchmark_points enable row level security;

do $$
declare
  admin_emails text[] := array['rm-community@qq.com','3984557428@qq.com'];
begin
  -- 本人可读自己的全部（含被驳回的）
  drop policy if exists bp_read_own on public.benchmark_points;
  create policy bp_read_own on public.benchmark_points
    for select to authenticated
    using (user_id = auth.uid());

  -- 本人可上报
  drop policy if exists bp_insert_own on public.benchmark_points;
  create policy bp_insert_own on public.benchmark_points
    for insert to authenticated
    with check (user_id = auth.uid());

  -- 本人可改自己的（用于覆盖同月数据）
  drop policy if exists bp_update_own on public.benchmark_points;
  create policy bp_update_own on public.benchmark_points
    for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

  -- 管理员全权（驳回脏数据）
  drop policy if exists bp_admin on public.benchmark_points;
  create policy bp_admin on public.benchmark_points
    for all to authenticated
    using (auth.jwt() ->> 'email' = any(admin_emails))
    with check (auth.jwt() ->> 'email' = any(admin_emails));
end $$;

-- ---------------- 4. 授权 ----------------
-- 原始表：不给 anon 任何权限，聚合结果一律走视图
grant select, insert, update on public.benchmark_points to authenticated;
grant select on public.benchmark_pool to anon, authenticated;

/* ============================================================================
 * 日常运维（管理员用 · 按需在 SQL Editor 执行）
 *
 * -- 查看待处理/可疑数据（样本极少或数值离谱）：
 * select city, month, adr, occ, created_at from public.benchmark_points
 *  where status='approved' order by created_at desc limit 50;
 *
 * -- 驳回一条脏数据（把 id 换掉）：
 * update public.benchmark_points set status='rejected' where id='<uuid>';
 *
 * -- 查看当前已达到展示门槛（n>=3）的城市月份：
 * select * from public.benchmark_pool order by city, month;
 * ========================================================================== */
