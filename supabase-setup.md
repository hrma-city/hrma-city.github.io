# HRMA 学院官网 · Supabase 鉴权配置指南

本站采用「审核制」登录：访客在 `register.html` 提交申请 → 资料进入 `profiles` 表、状态为 `pending`
→ 管理员在 `admin.html` 审批 → 通过后用户方可在 `login.html` 登录，访问全部受保护内容。

本指南帮助你把这套后端接起来。完成第 1–4 步即可投入使用；第 6 步（邮件通知）为可选增强。

---

## 1. 新建 Supabase 项目

1. 打开 https://supabase.com ，用 GitHub 或邮箱注册（免费版足够）。
2. 新建一个项目（区域任选，名字随意，如 `hrma`）。
3. 项目创建后，进入 **Settings → API**。记下两样东西：
   - **Project URL** （形如 `https://xxxxxxxxxxxxxx.supabase.co`）
   - **anon public key** （很长的 `eyJ...` 字符串，以 `role: anon` 标注）

---

## 2. 填入 auth-config.js

打开本站根目录的 `auth-config.js`，把上面的两行替换掉占位符：

```js
window.HRMA_SUPABASE = {
  url: "https://xxxxxxxxxxxxxx.supabase.co",   // ← 贴 Project URL
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9......"  // ← 贴 anon public key
};

/* 管理员邮箱（拥有审批权限）。多个用逗号分隔。 */
window.HRMA_ADMIN_EMAILS = ["rm-community@qq.com"];

/* 联系邮箱（页面展示用） */
window.HRMA_CONTACT_EMAIL = "rm-community@qq.com";
```

> 管理员的邮箱也在这里配置：把它加入 `HRMA_ADMIN_EMAILS`，该邮箱登录后即可进入 `admin.html` 审批。

---

## 3. 建表 + 触发器 + 权限（一次性 SQL）

在 Supabase 控制台 **SQL Editor** 里新建查询，粘贴下面整段，点击 **Run**。

```sql
-- 1) 档案表
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text default '',
  org         text default '',
  role_text   text default '',
  phone       text default '',
  reason      text default '',
  status      text not null default 'pending'
                check (status in ('pending','approved','rejected')),
  note        text default '',
  reviewed_at timestamptz,
  reviewed_by text default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 2) 新用户注册时自动建档案（状态 pending）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, org, role_text, phone, reason, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'org',''),
    coalesce(new.raw_user_meta_data->>'role_text',''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    coalesce(new.raw_user_meta_data->>'reason',''),
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) 行级安全策略（RLS）
-- 用户自己可读、改自己的档案
create policy "profiles_self_select" on public.profiles
  for select to authenticated using ( auth.uid() = id );

create policy "profiles_self_insert" on public.profiles
  for insert to authenticated with check ( auth.uid() = id );

create policy "profiles_self_update" on public.profiles
  for update to authenticated
  using ( auth.uid() = id ) with check ( auth.uid() = id );

-- 管理员可读写全部（把下面邮箱换成你的管理员邮箱，与 auth-config.js 保持一致）
create policy "profiles_admin_all" on public.profiles
  for all to authenticated
  using ( (select auth.jwt() ->> 'email') = 'rm-community@qq.com' )
  with check ( (select auth.jwt() ->> 'email') = 'rm-community@qq.com' );
```

> 提示：若之后要换管理员邮箱，改两处即可——`auth-config.js` 的 `HRMA_ADMIN_EMAILS`，以及上面 SQL 里的 `profiles_admin_all`（重新执行该 `create policy` 语句）。

---

## 4. 邮箱确认（建议开启）

路径：**Authentication → Providers → Email**。

- **建议保持「Confirm email」开启**：用户注册后会收到验证邮件，点链接确认邮箱归属后再等待你审批。这是双重保险（确认邮箱 + 管理员审核）。
- 若你希望注册即进入待审、跳过邮箱确认，可关闭它——但任何人填邮箱即可注册，安全性更低，不推荐。

> 注意：若开启了邮箱确认，用户在**点击验证链接之前**用该邮箱登录会提示「Email not confirmed」，这是正常的，确认后即可。

---

## 5. 日常审批流程

1. 访客在 `register.html` 提交申请（填写姓名/单位/职位/手机/理由 + 邮箱密码）。
2. 你登录自己的管理员邮箱账号（该邮箱须已在 `HRMA_ADMIN_EMAILS` 中），打开 `admin.html`。
   - 管理员即使自身还是 `pending` 也能进入后台并自助审批（包括审批自己）。
3. 在「待审核」标签下逐条 **通过 / 驳回**（驳回可填理由）。
4. 通过后，用户在 `login.html` 登录即可访问法典、课件、题库与下载区。

---

## 6. （可选）有新申请时邮件通知你

核心功能不依赖此步。若想「有人申请就自动收到邮件」，用 Supabase Edge Function + 数据库 Webhook 实现：

**(a) 建 Edge Function**（`supabase/functions/notify-admin/index.ts`）：

```ts
// Deno 运行时；部署：supabase functions deploy notify-admin
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const ADMIN_EMAIL = "rm-community@qq.com";
const RESEND_KEY  = Deno.env.get("RESEND_API_KEY") || "";

serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  const r = body.record ?? {};
  const text =
    `有新账号申请待审核：\n姓名：${r.full_name ?? ""}\n邮箱：${r.email ?? ""}\n` +
    `单位：${r.org ?? ""}\n职位：${r.role_text ?? ""}\n理由：${r.reason ?? ""}`;

  if (RESEND_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "HRMA <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject: "[HRMA] 新的账号申请待审核",
        text,
      }),
    });
  }
  return new Response("ok");
});
```

在 Supabase 控制台 **Project Settings → API → Edge Functions** 里添加密钥 `RESEND_API_KEY`（到 https://resend.com 免费申请）。

**(b) 建数据库 Webhook**：**Database → Webhooks → Create a new hook**，
监听表 `profiles`、事件 `Insert`，目标选上面的 Edge Function `notify-admin`。

此后每次新申请都会触发邮件通知你。

---

## 7. 重新部署

改完 `auth-config.js` 后，把整个 `site/` 目录重新发布即可（CloudStudio / 任意静态托管）。
未填密钥前，受保护页会显示「鉴权未配置」提示，不会泄露内容。

---

### 常见问题

- **受保护页一直转圈 / 显示「鉴权未配置」**：说明 `auth-config.js` 还是占位符，去第 2 步填好并重新部署。
- **注册后登录提示 Email not confirmed**：开了邮箱确认，先去点验证邮件。
- **管理员进不了 admin.html**：确认登录的邮箱已写入 `HRMA_ADMIN_EMAILS`，且与 SQL 里 `profiles_admin_all` 的邮箱一致。
- **登录提示 Invalid login credentials**：邮箱或密码错；若点过「重置密码」，请用新密码。
