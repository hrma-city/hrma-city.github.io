-- ============================================================
-- RMC · STR 标准共建池
-- 口径对齐 STR 报告：只收 Supply / Demand / Revenue 三要素，
-- Occ / ADR / RevPAR 由系统派生；他人原始经营数据不对外暴露，
-- 只经 SECURITY DEFINER 函数返回聚合基准，用于计算 MPI/ARI/RGI。
-- ============================================================

create table if not exists public.str_samples (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,

  -- 酒店属性（STR 分类口径）
  city          text not null,
  market        text,                 -- 商圈 / 细分市场，如「钱江新城」
  segment       text not null,        -- 奢华/超高端/高端/中高端/中端/经济
  rooms         int,                  -- 房量

  -- 期间
  month         date not null,        -- 统计月（取当月 1 号）

  -- 三要素（STR 原始口径）
  supply        numeric not null,     -- 可用房晚
  demand        numeric not null,     -- 已售房晚
  revenue       numeric not null,     -- 客房收入（元）

  -- 派生指标（提交时按三要素计算写入，便于统计）
  occ           numeric,              -- 出租率 %
  adr           numeric,              -- 平均房价
  revpar        numeric,              -- 每间可用房收入

  -- 结构数据（可选，用于更细的基准分析）
  ota_share     numeric,              -- OTA 渠道占比 %
  direct_share  numeric,              -- 直订占比 %
  corp_share    numeric,              -- 协议/企业占比 %
  member_share  numeric,              -- 会员占比 %
  var_cost      numeric,              -- 单房变动成本

  status        text not null default 'approved',
  created_at    timestamptz not null default now()
);

create index if not exists idx_str_samples_lookup
  on public.str_samples (city, segment, month);

alter table public.str_samples enable row level security;

-- 只能提交属于自己的数据
drop policy if exists "str_insert_own" on public.str_samples;
create policy "str_insert_own" on public.str_samples
  for insert to authenticated
  with check (auth.uid() = user_id);

-- 只能查看自己提交的数据（他人经营数据不暴露）
drop policy if exists "str_select_own" on public.str_samples;
create policy "str_select_own" on public.str_samples
  for select to authenticated
  using (auth.uid() = user_id);

-- 允许本人删除自己的样本
drop policy if exists "str_delete_own" on public.str_samples;
create policy "str_delete_own" on public.str_samples
  for delete to authenticated
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 聚合基准：同城市 + 同档次 + 同月 的市场均值
-- SECURITY DEFINER 绕过 RLS 汇总全量样本，但只返回聚合值，
-- 不返回任何单店原始数据，保护商业机密。
-- ------------------------------------------------------------
create or replace function public.str_benchmark(
  p_city    text,
  p_segment text,
  p_month   date
) returns table (
  sample_count int,
  occ          numeric,
  adr          numeric,
  revpar       numeric
) language sql
  security definer
  set search_path = public
as $$
  select
    count(*)::int,
    round(avg(s.occ), 1),
    round(avg(s.adr), 2),
    round(avg(s.revpar), 2)
  from public.str_samples s
  where s.city = p_city
    and s.segment = p_segment
    and date_trunc('month', s.month) = date_trunc('month', p_month)
    and s.status <> 'rejected';
$$;

grant execute on function public.str_benchmark(text, text, date) to anon, authenticated;

-- ------------------------------------------------------------
-- 池子总览：样本量与覆盖城市数（首页展示共建热度）
-- ------------------------------------------------------------
create or replace function public.str_pool_stats()
returns table (sample_count int, hotel_count int, city_count int)
language sql
  security definer
  set search_path = public
as $$
  select
    count(*)::int,
    count(distinct user_id)::int,
    count(distinct city)::int
  from public.str_samples
  where status <> 'rejected';
$$;

grant execute on function public.str_pool_stats() to anon, authenticated;
