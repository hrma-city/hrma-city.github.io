/* ============================================================================
 * RMC收益管理社区 · 第4层 商业变现 数据库结构
 * ----------------------------------------------------------------------------
 * 一次性在 Supabase SQL Editor 粘贴运行本文件（幂等，可重复执行）。
 *
 * 本文件负责：
 *   1. profiles 扩展：plan（免费/标准/企业）、plan_expire
 *   2. experts   专家目录（含 1v1 咨询价 / 企业内训价）
 *   3. jobs      招聘 / 内推职位
 *   4. orders    统一订单（会员 / 课程 / 咨询 / 职位推广）
 *   5. confirm_payment() 占位“我已支付”函数（真实网关后续替换）
 *   6. RLS：匿名可读公开内容，登录用户只写自己的订单，管理员全权
 *
 * 约定：管理员邮箱与 auth.js / supabase-setup.md 保持一致。
 * ========================================================================== */

-- 管理员邮箱（保持与现有策略一致）
do $$
declare
  admin_emails text[] := array['rm-community@qq.com','3984557428@qq.com'];
begin
  -- profiles 扩展字段
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='profiles' and column_name='plan') then
    alter table public.profiles add column plan text not null default 'free';
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='profiles' and column_name='plan_expire') then
    alter table public.profiles add column plan_expire timestamptz;
  end if;

  -- experts 表
  create table if not exists public.experts (
    id             uuid primary key default gen_random_uuid(),
    user_id        uuid references auth.users(id) on delete set null,
    name           text not null,
    industry       text not null,
    title          text,
    org            text,
    bio            text,
    consult_price  numeric not null default 0,
    training_price numeric not null default 0,
    available      boolean not null default true,
    featured       boolean not null default false,
    created_at     timestamptz not null default now()
  );

  -- jobs 表
  create table if not exists public.jobs (
    id          uuid primary key default gen_random_uuid(),
    company     text not null,
    title       text not null,
    industry    text not null,
    jtype       text not null default 'fulltime',   -- fulltime|parttime|contract|consult
    city        text,
    salary      text,
    description text,
    contact     text,
    status      text not null default 'open',       -- open|closed
    posted_by   uuid references auth.users(id) on delete set null,
    created_at  timestamptz not null default now()
  );

  -- orders 表（统一订单）
  create table if not exists public.orders (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references auth.users(id) on delete cascade,
    kind       text not null,     -- membership | course | consult | job_post
    ref_id     text,              -- 会员档位 / 课程包 / 专家 id / 职位 id
    amount     numeric not null default 0,
    status     text not null default 'pending',  -- pending | paid | refunded | cancelled
    paid_at    timestamptz,
    note       text,
    created_at timestamptz not null default now()
  );

  -- 索引
  create index if not exists idx_experts_featured on public.experts (featured, created_at desc);
  create index if not exists idx_jobs_status on public.jobs (status, created_at desc);
  create index if not exists idx_orders_user on public.orders (user_id, created_at desc);

  -- 种子数据：专家目录（仅当表为空时插入，保证幂等）
  if not exists (select 1 from public.experts) then
    insert into public.experts (name, industry, title, org, bio, consult_price, training_price, available, featured) values
    ('云璟', 'lodging', '高星酒店收益总监', '某集团收益管理中心', '操盘多家高星级酒店年度收益，擅长淡旺季价格体系与 RMS 落地。', 800, 8000, true, true),
    ('沈知微', 'fnb', '餐饮多店收益负责人', '某连锁餐饮集团', 'RevPASH 与翻台率实战派，做过完整的时段定价与套餐设计。', 600, 6000, true, true),
    ('陆_a', 'airline', '航空收益管理专家', '某航司网络收益部', '熟悉舱位控制、嵌套订座限制与 O&D 网络收益管理。', 1000, 10000, true, false),
    ('周野', 'attraction', '景区运营专家', '某文旅集团', '做过分时预约、承载量调控与淡旺季产品设计。', 600, 6000, true, false);
  end if;

  -- 种子数据：职位（仅当表为空时插入）
  if not exists (select 1 from public.jobs) then
    insert into public.jobs (company, title, industry, jtype, city, salary, description, contact, status) values
    ('某高星酒店集团', '收益管理经理', 'lodging', 'fulltime', '上海', '25-40K·14薪', '负责集团旗下高星级酒店定价与库存策略，3 年以上收益管理经验。', 'rm-community@qq.com', 'open'),
    ('某连锁餐饮', '多店收益分析师', 'fnb', 'fulltime', '北京', '15-25K', '搭建 RevPASH 监控体系，做时段定价与套餐优化。', 'rm-community@qq.com', 'open'),
    ('某文旅集团', '景区收益顾问（外部）', 'attraction', 'consult', '杭州', '按项目', '为景区做淡旺季产品设计与承载量调控咨询。', 'rm-community@qq.com', 'open');
  end if;
end $$;

/* ---------------- RLS ---------------- */

-- 开启行级安全
alter table public.experts enable row level security;
alter table public.jobs    enable row level security;
alter table public.orders  enable row level security;

do $$
declare
  admin_emails text[] := array['rm-community@qq.com','3984557428@qq.com'];
begin
  -- experts：匿名/登录可读；登录用户仅能写自己的（user_id=auth.uid()）
  drop policy if exists experts_read on public.experts;
  create policy experts_read on public.experts
    for select using (true);

  drop policy if exists experts_write on public.experts;
  create policy experts_write on public.experts
    for all
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

  drop policy if exists experts_admin on public.experts;
  create policy experts_admin on public.experts
    for all
    to authenticated
    using (auth.jwt() ->> 'email' = any(admin_emails))
    with check (auth.jwt() ->> 'email' = any(admin_emails));

  -- jobs：匿名/登录可读在招职位（open）；登录用户仅能写自己发布的
  drop policy if exists jobs_read on public.jobs;
  create policy jobs_read on public.jobs
    for select using (status = 'open');

  drop policy if exists jobs_write on public.jobs;
  create policy jobs_write on public.jobs
    for all
    to authenticated
    using (posted_by = auth.uid())
    with check (posted_by = auth.uid());

  drop policy if exists jobs_admin on public.jobs;
  create policy jobs_admin on public.jobs
    for all
    to authenticated
    using (auth.jwt() ->> 'email' = any(admin_emails))
    with check (auth.jwt() ->> 'email' = any(admin_emails));

  -- orders：仅本人可读写自己的；无直接 update 策略（状态由 confirm_payment 改变）
  drop policy if exists orders_read on public.orders;
  create policy orders_read on public.orders
    for select
    to authenticated
    using (user_id = auth.uid());

  drop policy if exists orders_insert on public.orders;
  create policy orders_insert on public.orders
    for insert
    to authenticated
    with check (user_id = auth.uid());

  drop policy if exists orders_admin on public.orders;
  create policy orders_admin on public.orders
    for all
    to authenticated
    using (auth.jwt() ->> 'email' = any(admin_emails))
    with check (auth.jwt() ->> 'email' = any(admin_emails));
end $$;

/* ---------------- 占位支付确认函数 ----------------
 * 这是“我已支付”占位逻辑：用户下单后，在结算页点“我已支付”即把订单标记为 paid，
 * 若是会员订单则同步把 profiles.plan 升级。
 * 真实支付网关（微信支付 / 支付宝 / Stripe via Supabase Edge Function）上线后，
 * 由支付回调来调用等价逻辑，前端不再暴露此按钮。
 */
create or replace function public.confirm_payment(p_order uuid, p_plan text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_uid   uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'msg', '未登录');
  end if;

  select * into v_order
  from public.orders
  where id = p_order and user_id = v_uid
  for update;

  if v_order is null then
    return jsonb_build_object('ok', false, 'msg', '订单不存在');
  end if;
  if v_order.status = 'paid' then
    return jsonb_build_object('ok', true, 'msg', '已支付');
  end if;

  update public.orders set status = 'paid', paid_at = now() where id = p_order;

  if v_order.kind = 'membership' and p_plan is not null then
    update public.profiles set plan = p_plan, plan_expire = now() + interval '1 year'
    where id = v_uid;
  end if;

  return jsonb_build_object('ok', true, 'msg', '支付成功');
end;
$$;

grant execute on function public.confirm_payment(uuid, text) to authenticated;

/* ---------------- 授权 ---------------- */
grant select on public.experts to anon, authenticated;
grant select on public.jobs    to anon, authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant all on public.experts to authenticated;
grant all on public.jobs to authenticated;
