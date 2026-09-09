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
    using ( (select auth.jwt() ->> 'email') = any(admin_emails) )
    with check ( (select auth.jwt() ->> 'email') = any(admin_emails) );

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
    using ( (select auth.jwt() ->> 'email') = any(admin_emails) )
    with check ( (select auth.jwt() ->> 'email') = any(admin_emails) );

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
    using ( (select auth.jwt() ->> 'email') = any(admin_emails) )
    with check ( (select auth.jwt() ->> 'email') = any(admin_emails) );
end $$;
