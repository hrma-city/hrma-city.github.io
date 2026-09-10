-- ============================================================================
-- RMC 社区 · 通知中枢 + 学习进度 + 证书 + 会员到期
-- ----------------------------------------------------------------------------
-- 依赖：profiles(id,email,full_name,plan,plan_expire,exam_score,exam_level)
--       posts(id,author_id,title) / replies(post_id,author_id,author_name)
--       payments(order_id,status) / orders(id,user_id,amount,kind)
-- 幂等：可重复执行
-- ============================================================================
begin;

-- ---------------- 1. 站内通知 ----------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'system',
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notif_user_unread on public.notifications(user_id) where read_at is null;
alter table public.notifications enable row level security;

drop policy if exists notif_own_select on public.notifications;
create policy notif_own_select on public.notifications
  for select using (auth.uid() = user_id);
drop policy if exists notif_own_update on public.notifications;
create policy notif_own_update on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- 写入只由 security definer 函数/触发器进行

-- ---------------- 2. 邮件发件箱（Edge Function 拉取投递） ----------------
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  to_email text not null,
  subject text not null,
  html text not null,
  kind text default 'notify',
  status text not null default 'pending',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists idx_outbox_pending on public.email_outbox(status, created_at);
alter table public.email_outbox enable row level security;
-- 不向普通用户开放策略：仅 service_role 可读写

-- ---------------- 3. 通用通知函数（同时排队邮件） ----------------
create or replace function public.notify_user(
  p_user_id uuid, p_kind text, p_title text,
  p_body text default null, p_link text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_email text; v_url text; v_site text := 'https://hrma-city.github.io/';
begin
  if p_user_id is null then return null; end if;

  insert into public.notifications(user_id, kind, title, body, link)
  values (p_user_id, p_kind, p_title, p_body, p_link)
  returning id into v_id;

  select email into v_email from public.profiles where id = p_user_id;

  if coalesce(trim(v_email), '') <> '' then
    if p_link is null then v_url := v_site;
    elsif p_link like 'http%' then v_url := p_link;
    else v_url := v_site || ltrim(p_link, '/');
    end if;

    insert into public.email_outbox(user_id, to_email, subject, html, kind)
    values (
      p_user_id, v_email, p_title,
      '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;'
      || 'line-height:1.7;color:#223">'
      || '<h3 style="margin:0 0 12px;color:#16324f">' || p_title || '</h3>'
      || coalesce('<p>' || replace(p_body, chr(10), '<br>') || '</p>', '')
      || '<p><a href="' || v_url || '" style="color:#b9914a;font-weight:600">'
      || '打开 RMC 社区查看</a></p>'
      || '<hr style="border:0;border-top:1px solid #eee;margin:20px 0">'
      || '<p style="color:#888;font-size:12px">RMC收益管理社区 · '
      || '<a href="mailto:rm-community@qq.com">rm-community@qq.com</a></p>'
      || '</div>',
      p_kind
    );
  end if;

  return v_id;
end $$;
grant execute on function public.notify_user(uuid,text,text,text,text) to service_role;

-- ---------------- 4. 触发器 A：帖子被回复 ----------------
create or replace function public.tg_notify_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_title text;
begin
  select author_id, coalesce(title, '你的提问') into v_author, v_title
  from public.posts where id = new.post_id;

  if v_author is not null and v_author <> new.author_id then
    perform public.notify_user(
      v_author, 'reply', '你的提问有了新回复',
      coalesce(new.author_name, '社区成员') || ' 回复了《' || v_title || '》',
      'community/board.html?post=' || new.post_id::text
    );
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_reply on public.replies;
create trigger trg_notify_reply after insert on public.replies
  for each row execute function public.tg_notify_reply();

-- ---------------- 5. 触发器 B：账号审批结果 ----------------
create or replace function public.tg_notify_profile_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'approved' then
      perform public.notify_user(new.id, 'approval', '账号已通过审核',
        '欢迎加入 RMC 社区！你现在可以访问全部会员内容。', 'index.html');
    elsif new.status = 'rejected' then
      perform public.notify_user(new.id, 'approval', '账号审核未通过',
        coalesce(nullif(new.note, ''), '如有疑问请回复邮件联系社区。'), 'pending.html');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_profile_status on public.profiles;
create trigger trg_notify_profile_status after update of status on public.profiles
  for each row execute function public.tg_notify_profile_status();

-- ---------------- 6. 触发器 C：支付成功开通会员 ----------------
create or replace function public.tg_notify_paid() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_amount numeric;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    select user_id, amount into v_user, v_amount from public.orders where id = new.order_id;
    if v_user is not null then
      perform public.notify_user(v_user, 'payment', '会员权益已开通',
        '我们已收到 ¥' || to_char(coalesce(v_amount, 0), 'FM999999999.00')
        || '，会员权益已生效。感谢你的支持！', 'index.html');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_paid on public.payments;
create trigger trg_notify_paid after update of status on public.payments
  for each row execute function public.tg_notify_paid();

-- ---------------- 7. 学习进度 ----------------
create table if not exists public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  completed boolean not null default true,
  completed_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, course_id)
);
alter table public.course_progress enable row level security;
drop policy if exists cp_own on public.course_progress;
create policy cp_own on public.course_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------- 8. 考核成绩 ----------------
create table if not exists public.exam_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null,
  total int not null,
  level text not null,
  passed boolean not null,
  taken_at timestamptz not null default now()
);
create index if not exists idx_exam_user on public.exam_results(user_id, taken_at desc);
alter table public.exam_results enable row level security;
drop policy if exists er_own on public.exam_results;
create policy er_own on public.exam_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------- 9. 证书 ----------------
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cert_no text not null unique,
  level text not null,
  holder_name text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_cert_user on public.certificates(user_id);
alter table public.certificates enable row level security;
drop policy if exists cert_own on public.certificates;
create policy cert_own on public.certificates
  for select using (auth.uid() = user_id);

-- ---------------- 10. 公开证书验证（不泄露 user_id / email） ----------------
create or replace function public.verify_certificate(p_cert_no text)
returns table(level text, holder_name text, issued_at timestamptz,
              expires_at timestamptz, is_valid boolean)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select c.level, c.holder_name, c.issued_at, c.expires_at,
         (c.expires_at is null or c.expires_at > now()) as is_valid
  from public.certificates c
  where upper(c.cert_no) = upper(trim(coalesce(p_cert_no, '')));
end $$;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ---------------- 11. 记录考核成绩 ----------------
create or replace function public.record_exam(
  p_score int, p_total int, p_level text, p_pass_score int default 60
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_passed boolean; v_pct numeric;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  v_pct := (p_score::numeric / greatest(p_total, 1)) * 100;
  v_passed := v_pct >= p_pass_score;

  insert into public.exam_results(user_id, score, total, level, passed)
  values (v_uid, p_score, p_total, p_level, v_passed);

  update public.profiles
     set exam_score = p_score,
         exam_level = case when v_passed then p_level else exam_level end
   where id = v_uid;

  if v_passed then
    perform public.notify_user(v_uid, 'exam', '考核通过',
      '恭喜！你在 ' || p_level || ' 级考核中得分 ' || p_score || '/' || p_total
      || '，现在可以申领证书了。', 'cert.html');
  end if;

  return v_passed;
end $$;
grant execute on function public.record_exam(int,int,text,int) to authenticated;

-- ---------------- 12. 申领证书 ----------------
create or replace function public.claim_certificate(p_level text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_pass boolean := false;
  v_name text; v_no text; v_existing text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select exists(
    select 1 from public.exam_results e
     where e.user_id = v_uid and e.level = p_level and e.passed
  ) into v_pass;
  if not v_pass then
    raise exception '尚未通过该级别考核，无法申领证书';
  end if;

  select coalesce(nullif(full_name, ''), email) into v_name
    from public.profiles where id = v_uid;

  select cert_no into v_existing from public.certificates
   where user_id = v_uid and level = p_level
   order by issued_at desc limit 1;
  if v_existing is not null then return v_existing; end if;

  v_no := upper(p_level) || '-' || to_char(now(), 'YYYYMMDD') || '-'
          || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.certificates(user_id, cert_no, level, holder_name, expires_at)
  values (v_uid, v_no, p_level, coalesce(v_name, '学员'), now() + interval '3 years');

  perform public.notify_user(v_uid, 'certificate', '资格证书已颁发',
    '你的 ' || p_level || ' 级证书已生成，编号 ' || v_no || '，可在社区证书验证页公开查验。',
    'cert.html');

  return v_no;
end $$;
grant execute on function public.claim_certificate(text) to authenticated;

-- ---------------- 13. 会员到期提醒（每日一次，供 Edge Function 调用） ----------------
create or replace function public.dispatch_expiry_reminders(p_days int default 7)
returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_n int := 0;
begin
  for r in
    select p.id as uid, coalesce(p.plan, '会员') as plan_nm, p.plan_expire,
           (p.plan_expire::date - current_date) as days_left
      from public.profiles p
     where p.plan_expire is not null
       and p.status = 'approved'
       and p.plan_expire::date between current_date and current_date + p_days
       and not exists (
         select 1 from public.notifications n
          where n.user_id = p.id and n.kind = 'membership'
            and n.created_at::date = current_date
       )
  loop
    perform public.notify_user(r.uid, 'membership',
      '会员即将到期',
      '你的 ' || r.plan_nm || ' 将在 ' || r.days_left || ' 天后（'
      || to_char(r.plan_expire, 'YYYY-MM-DD') || '）到期，续期后可继续访问会员内容。',
      'pricing.html');
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
grant execute on function public.dispatch_expiry_reminders(int) to service_role;

commit;
