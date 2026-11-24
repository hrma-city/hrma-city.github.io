-- RMC 收益管理社区 · 访问审核数据表
-- 在 Supabase → SQL Editor → New query 中粘贴全部内容，点 Run

-- 1) 建表
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text,
  org         text,
  phone       text,
  reason      text,
  status      text not null default 'pending'
              check (status in ('pending','approved','rejected')),
  note        text,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

-- 2) 索引
create index if not exists profiles_status_idx on public.profiles (status);

-- 3) 开启行级安全（必须开，否则匿名密钥可读写全表）
alter table public.profiles enable row level security;

-- 4) 策略
drop policy if exists "allow insert pending" on public.profiles;
create policy "allow insert pending" on public.profiles
  for insert to anon, authenticated
  with check (status = 'pending');

drop policy if exists "read own" on public.profiles;
create policy "read own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists "admin read all" on public.profiles;
create policy "admin read all" on public.profiles
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'rm-community@qq.com');

drop policy if exists "admin update" on public.profiles;
create policy "admin update" on public.profiles
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'rm-community@qq.com')
  with check ((auth.jwt() ->> 'email') = 'rm-community@qq.com');

-- 5) 新用户注册自动建 pending 记录；管理员邮箱自动 approved
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, status, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    case when new.email = 'rm-community@qq.com' then 'approved' else 'pending' end,
    now()
  )
  on conflict (email) do update set status = excluded.status;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
