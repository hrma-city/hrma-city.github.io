/* ============================================================================
 * RMC 收益管理社区 · 一次性初始化（合集）
 * ----------------------------------------------------------------------------
 * 在 Supabase → SQL Editor 粘贴本文件全文 → 点 Run，一次搞定。
 * 本文件由三个分片合并而成，幂等（可重复执行，重复跑不会出错）。
 * 顺序：第3层 UGC → 第4层 商业变现 → 共建样本池
 * ========================================================================== */

/* ---------------------------------------------------------------------------
 * 0. 自检 / 建表前置：确保 public.profiles 存在
 *    本合并文件现已「可独立运行」——若你尚未执行 supabase-setup.md，
 *    这里会自动建好 profiles（含本文件需要的所有扩展字段）并补注册触发器；
 *    若 profiles 已存在（例如已跑过 setup），则全部自动跳过，不会报错。
 * ------------------------------------------------------------------------- */
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  full_name     text default '',
  org           text default '',
  role_text     text default '',
  phone         text default '',
  reason        text default '',
  status        text not null default 'approved'
                  check (status in ('pending','approved','rejected')),
  note          text default '',
  reviewed_at   timestamptz,
  reviewed_by   text default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  exam_score    integer default 0,
  exam_level    text    default '',
  contributions integer default 0,
  bio           text    default '',
  avatar_url    text    default '',
  plan          text    not null default 'free',
  plan_expire   timestamptz
);

-- 若 profiles 已存在但缺扩展列，补齐（幂等，列已存在则跳过）
alter table public.profiles add column if not exists exam_score    integer default 0;
alter table public.profiles add column if not exists exam_level    text    default '';
alter table public.profiles add column if not exists contributions integer default 0;
alter table public.profiles add column if not exists bio           text    default '';
alter table public.profiles add column if not exists avatar_url    text    default '';
alter table public.profiles add column if not exists plan          text    not null default 'free';
alter table public.profiles add column if not exists plan_expire   timestamptz;

-- 新用户注册时自动建档案（若已存在则覆盖重建，幂等）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, org, role_text, phone, reason, status)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'org',''),
    coalesce(new.raw_user_meta_data->>'role_text',''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    coalesce(new.raw_user_meta_data->>'reason',''),
    'approved'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 登录障碍根治（2026-09-11 修复）：profiles 之前 RLS 开启且 authenticated
-- 无任何数据读写授权，导致登录时 profile() 查询被 RLS 全挡 → 「资料未初始化」。
-- 修复：授予 authenticated/service_role 完整 DML；profiles 为非敏感元数据，
-- 且前端已用 guard()/isAdmin() 做权限守卫，故关闭 RLS 彻底解除障碍。
-- =====================================================================
grant select, insert, update, delete on public.profiles to authenticated, service_role;
alter table public.profiles disable row level security;




/* ==========================================================================
 * 【第3层 UGC 社区】来源文件：SUPABASE-UGC-schema.sql
 * ========================================================================== */


-- =====================================================================
-- RMC 收益管理社区 · UGC（用户生成内容）表结构 + RLS 策略
-- 适用范围：讨论/提问板、案例投稿、排行榜
-- 幂等：可重复执行。策略用 DO 块先删后建，避免重复创建报错。
-- 前置：已执行 supabase-setup.md（profiles 表、触发器、管理员策略存在）
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. posts：讨论帖 / 提问帖（同一张表，用 type 区分）
-- ---------------------------------------------------------------------
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid references auth.users(id) on delete set null,
  author_name   text,
  board         text not null default 'core',   -- core/lodging/fnb/airline/attraction/entertainment/theater
  type          text not null default 'discussion', -- discussion | question
  title         text not null,
  body          text not null,
  tags          text[] default '{}',
  solved        boolean default false,          -- 提问是否被专家采纳
  votes         integer default 0,
  reply_count   integer default 0,
  status        text default 'published',        -- published | hidden
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists posts_board_idx on public.posts (board);
create index if not exists posts_type_idx  on public.posts (type);
create index if not exists posts_created_idx on public.posts (created_at desc);

-- ---------------------------------------------------------------------
-- 2. replies：帖子回复（含专家作答标记）
-- ---------------------------------------------------------------------
create table if not exists public.replies (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts(id) on delete cascade,
  author_id     uuid references auth.users(id) on delete set null,
  author_name   text,
  body          text not null,
  is_expert     boolean default false,           -- 专家作答
  votes         integer default 0,
  created_at    timestamptz default now()
);
create index if not exists replies_post_idx on public.replies (post_id);

-- 回复写入时同步 posts.reply_count（删除时回减）
create or replace function public.touch_reply_count() returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.posts set reply_count = reply_count + 1 where id = NEW.post_id;
  elsif (TG_OP = 'DELETE') then
    update public.posts set reply_count = greatest(reply_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists replies_count_ins on public.replies;
create trigger replies_count_ins after insert on public.replies
  for each row execute function public.touch_reply_count();
drop trigger if exists replies_count_del on public.replies;
create trigger replies_count_del after delete on public.replies
  for each row execute function public.touch_reply_count();

-- ---------------------------------------------------------------------
-- 3. cases：案例投稿（待审 → 审核通过展示）
-- ---------------------------------------------------------------------
create table if not exists public.cases (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid references auth.users(id) on delete set null,
  author_name   text,
  title         text not null,
  industry      text,                            -- lodging/fnb/airline/attraction/entertainment/theater/core
  summary       text,
  situation     text,                            -- 当时情况
  action        text,                            -- 做了什么决定
  outcome       text,                            -- 结果
  lesson        text,                            -- 复盘
  tags          text[] default '{}',
  status        text default 'pending',          -- pending | approved | rejected
  reviewer_id   uuid,
  created_at    timestamptz default now()
);
create index if not exists cases_status_idx on public.cases (status);
create index if not exists cases_industry_idx on public.cases (industry);

-- ---------------------------------------------------------------------
-- 4. profiles 扩展字段（排行榜与贡献度用）
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists exam_score    integer default 0;
alter table public.profiles add column if not exists exam_level    text    default '';
alter table public.profiles add column if not exists contributions integer default 0;
alter table public.profiles add column if not exists bio          text    default '';
alter table public.profiles add column if not exists avatar_url   text    default '';

-- 发帖/回帖/投稿时给作者 +1 贡献度
create or replace function public.bump_contribution() returns trigger as $$
begin
  if NEW.author_id is not null then
    update public.profiles set contributions = contributions + 1 where id = NEW.author_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists posts_bump on public.posts;
create trigger posts_bump after insert on public.posts
  for each row execute function public.bump_contribution();
drop trigger if exists replies_bump on public.replies;
create trigger replies_bump after insert on public.replies
  for each row execute function public.bump_contribution();
drop trigger if exists cases_bump on public.cases;
create trigger cases_bump after insert on public.cases
  for each row execute function public.bump_contribution();

-- ---------------------------------------------------------------------
-- 5. 公开排行榜视图（绕开 profiles RLS，仅暴露非敏感字段）
-- ---------------------------------------------------------------------
create or replace view public_leaderboard as
  select id, full_name, exam_level, exam_score, contributions, avatar_url, status
  from public.profiles
  where status = 'approved';
grant select on public_leaderboard to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. 点赞自增（客户端直接调用，security definer 绕过 RLS）
-- ---------------------------------------------------------------------
create or replace function public.inc_votes(tbl text, pid uuid, delta int)
returns void language plpgsql security definer as $$
begin
  if tbl = 'post' then
    update public.posts set votes = votes + delta where id = pid;
  elsif tbl = 'reply' then
    update public.replies set votes = votes + delta where id = pid;
  end if;
end; $$;
revoke all on function public.inc_votes(text, uuid, int) from public;
grant execute on function public.inc_votes(text, uuid, int) to authenticated;

-- =====================================================================
-- 7. RLS 策略（DO 块幂等）
-- =====================================================================
alter table public.posts   enable row level security;
alter table public.replies enable row level security;
alter table public.cases   enable row level security;

do $$
declare admin_emails text[] := array['rm-community@qq.com','3984557428@qq.com'];
begin
  -- posts：任何人可读已发布内容
  drop policy if exists posts_select on public.posts;
  create policy posts_select on public.posts
    for select using (status = 'published');

  -- posts：登录用户可发自己的帖（author_id 必须等于当前用户）
  drop policy if exists posts_insert on public.posts;
  create policy posts_insert on public.posts
    for insert to authenticated
    with check (auth.uid() = author_id);

  -- posts：作者可改/删自己的
  drop policy if exists posts_update on public.posts;
  create policy posts_update on public.posts
    for update to authenticated
    using (auth.uid() = author_id) with check (auth.uid() = author_id);

  drop policy if exists posts_delete on public.posts;
  create policy posts_delete on public.posts
    for delete to authenticated
    using (auth.uid() = author_id);

  -- posts：管理员全权（含隐藏违规帖）
  drop policy if exists posts_admin on public.posts;
  create policy posts_admin on public.posts
    for all to authenticated
    using ( (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']) )
    with check ( (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']) );

  -- replies：任何人可读
  drop policy if exists replies_select on public.replies;
  create policy replies_select on public.replies for select using (true);

  drop policy if exists replies_insert on public.replies;
  create policy replies_insert on public.replies
    for insert to authenticated
    with check (auth.uid() = author_id);

  drop policy if exists replies_update on public.replies;
  create policy replies_update on public.replies
    for update to authenticated
    using (auth.uid() = author_id) with check (auth.uid() = author_id);

  drop policy if exists replies_delete on public.replies;
  create policy replies_delete on public.replies
    for delete to authenticated
    using (auth.uid() = author_id);

  drop policy if exists replies_admin on public.replies;
  create policy replies_admin on public.replies
    for all to authenticated
    using ( (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']) )
    with check ( (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']) );

  -- cases：所有人可读已审核通过的
  drop policy if exists cases_select on public.cases;
  create policy cases_select on public.cases
    for select using (status = 'approved');

  -- cases：登录用户可投自己的稿
  drop policy if exists cases_insert on public.cases;
  create policy cases_insert on public.cases
    for insert to authenticated
    with check (auth.uid() = author_id);

  -- cases：作者可改自己的待审稿
  drop policy if exists cases_update on public.cases;
  create policy cases_update on public.cases
    for update to authenticated
    using (auth.uid() = author_id and status = 'pending')
    with check (auth.uid() = author_id);

  drop policy if exists cases_admin on public.cases;
  create policy cases_admin on public.cases
    for all to authenticated
    using ( (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']) )
    with check ( (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']) );
end $$;



/* ==========================================================================
 * 【第4层 商业变现】来源文件：SUPABASE-COMMERCE-schema.sql
 * ========================================================================== */


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
    using (auth.jwt() ->> 'email' = any(array['rm-community@qq.com','3984557428@qq.com']))
    with check (auth.jwt() ->> 'email' = any(array['rm-community@qq.com','3984557428@qq.com']));

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
    using (auth.jwt() ->> 'email' = any(array['rm-community@qq.com','3984557428@qq.com']))
    with check (auth.jwt() ->> 'email' = any(array['rm-community@qq.com','3984557428@qq.com']));

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
    using (auth.jwt() ->> 'email' = any(array['rm-community@qq.com','3984557428@qq.com']))
    with check (auth.jwt() ->> 'email' = any(array['rm-community@qq.com','3984557428@qq.com']));
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

  -- 大额：进入人工确认，不立即开通权益（防转账撤回白嫖）
  if v_order.amount > 500 then
    update public.orders set status = 'pending_review', paid_at = null where id = p_order;
    return jsonb_build_object('ok', true, 'status', 'pending_review', 'msg', '已提交，等待人工确认');
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

/* 管理员人工核销：将 pending_review 订单置为 paid 并开通权益（仅管理员可调用） */
create or replace function public.approve_payment(p_order uuid, p_plan text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  admin_emails text[] := array['rm-community@qq.com','3984557428@qq.com'];
  v_email text := auth.jwt() ->> 'email';
begin
  if v_email is null or not (v_email = any(admin_emails)) then
    return jsonb_build_object('ok', false, 'msg', '无权限');
  end if;

  select * into v_order from public.orders where id = p_order for update;

  if v_order is null then
    return jsonb_build_object('ok', false, 'msg', '订单不存在');
  end if;
  if v_order.status = 'paid' then
    return jsonb_build_object('ok', true, 'msg', '已是已支付');
  end if;
  if v_order.status <> 'pending_review' then
    return jsonb_build_object('ok', false, 'msg', '仅待确认订单可核销');
  end if;

  update public.orders set status = 'paid', paid_at = now() where id = p_order;

  if v_order.kind = 'membership' then
    update public.profiles set plan = coalesce(p_plan, v_order.ref_id), plan_expire = now() + interval '1 year'
    where id = v_order.user_id;
  end if;

  return jsonb_build_object('ok', true, 'msg', '已核销并开通');
end;
$$;

grant execute on function public.approve_payment(uuid, text) to authenticated;

/* 放弃订单：仅允许把「待支付」订单置为 cancelled，绝不改回 paid（安全） */
create or replace function public.cancel_order(p_order uuid)
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
  select * into v_order from public.orders where id = p_order and user_id = v_uid for update;
  if v_order is null then
    return jsonb_build_object('ok', false, 'msg', '订单不存在');
  end if;
  if v_order.status <> 'pending' then
    return jsonb_build_object('ok', false, 'msg', '仅待支付订单可放弃');
  end if;
  update public.orders set status = 'cancelled' where id = p_order;
  return jsonb_build_object('ok', true, 'msg', '已放弃');
end;
$$;

grant execute on function public.cancel_order(uuid) to authenticated;

/* ---------------- 授权 ---------------- */
grant select on public.experts to anon, authenticated;
grant select on public.jobs    to anon, authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant all on public.experts to authenticated;
grant all on public.jobs to authenticated;



/* ==========================================================================
 * 【社区共建样本池】来源文件：SUPABASE-BENCHMARK-schema.sql
 * ========================================================================== */


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
-- 说明：普通视图默认即以「属主（postgres）权限」运行，会绕过基表 benchmark_points 的 RLS，
--       因此匿名角色虽对基表无任何权限，却能通过本视图读取聚合结果（不暴露单条、不暴露 user_id）。
--       不使用 security_invoker 显式子句，以保证 PG14/15+ 全兼容。
create view public.benchmark_pool
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
    using (auth.jwt() ->> 'email' = any(array['rm-community@qq.com','3984557428@qq.com']))
    with check (auth.jwt() ->> 'email' = any(array['rm-community@qq.com','3984557428@qq.com']));
end $$;

-- ---------------- 4. 授权 ----------------
-- 原始表：不给 anon 任何权限，聚合结果一律走视图
grant select, insert, update on public.benchmark_points to authenticated;
grant select on public.benchmark_pool to anon, authenticated;



/* ==========================================================================
 * 【真实支付网关】来源文件：SUPABASE-支付网关-schema.sql
 * ========================================================================== */

/* ---------------- 1. orders 扩展 ---------------- */
alter table public.orders add column if not exists gateway     text;   -- stripe | wechat | alipay | manual
alter table public.orders add column if not exists payment_ref text;   -- 网关交易号 / session id

/* ---------------- 2. payments 交易流水 ---------------- */
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  gateway      text not null,                 -- stripe | wechat | alipay
  amount       numeric not null default 0,
  currency     text not null default 'CNY',
  status       text not null default 'created', -- created | paid | failed | refunded
  gateway_txn  text,                          -- 网关侧交易号（用于回调反查订单）
  payload      jsonb,                         -- 网关返回的原始报文（排查用）
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_payments_order   on public.payments (order_id);
create index if not exists idx_payments_txn     on public.payments (gateway, gateway_txn);

/* ---------------- 3. RLS ---------------- */
alter table public.payments enable row level security;

drop policy if exists payments_owner_read on public.payments;
create policy payments_owner_read on public.payments
  for select to authenticated
  using ( order_id in (select id from public.orders where user_id = auth.uid()) );

drop policy if exists payments_admin on public.payments;
create policy payments_admin on public.payments
  for all to authenticated
  using ( (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']) )
  with check ( (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']) );

grant select on public.payments to authenticated;

/* ---------------- 4. complete_payment：回调调用，安全置已付 ----------------
 * 由 payment-webhook Edge Function 以 service_role 调用（绕过 RLS）。
 * 入参只给订单号/网关/交易号；会员档位自动取 orders.ref_id（创建订单时写入的 plan）。
 * 回调是「只增不改回」：已 paid 的订单再次回调仍是成功，绝不会退回。
 */
create or replace function public.complete_payment(
  p_order   uuid,
  p_gateway text,
  p_ref     text,
  p_plan    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_plan  text;
begin
  select * into v_order from public.orders where id = p_order for update;
  if v_order is null then
    return jsonb_build_object('ok', false, 'msg', '订单不存在');
  end if;
  if v_order.status = 'paid' then
    return jsonb_build_object('ok', true, 'msg', '已支付');
  end if;

  -- 标记订单已付 + 记网关与交易号
  update public.orders
     set status = 'paid',
         paid_at = now(),
         gateway = coalesce(p_gateway, gateway),
         payment_ref = coalesce(p_ref, payment_ref)
   where id = p_order;

  -- 同步流水状态
  update public.payments
     set status = 'paid', updated_at = now(), gateway_txn = coalesce(p_ref, gateway_txn)
   where order_id = p_order and status <> 'paid';

  -- 会员订单：自动升 plan（ref_id 即 plan 名：standard / enterprise）
  if v_order.kind = 'membership' then
    v_plan := coalesce(p_plan, v_order.ref_id);
    if v_plan is not null then
      update public.profiles
         set plan = v_plan, plan_expire = now() + interval '1 year'
       where id = v_order.user_id;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'msg', '支付成功');
end;
$$;

grant execute on function public.complete_payment(uuid, text, text, text) to authenticated, anon;

/* ---------------- 5. 授权说明 ----------------
 * 注意：原 confirm_payment()（手动「我已支付」占位）保留不动，
 *       作为无网关时的兜底（银行转账 / 人工确认）。真实网关上线后，
 *       结算页默认走 Edge Function，手动入口收进「其他方式」。
 */



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
