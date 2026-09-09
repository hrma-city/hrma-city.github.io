# RMC 收益管理社区 · 账户系统启用指南（Layer 1）

本文件说明「审核制账户系统」如何启用、首次注册与审批流程，以及管理员邮箱的数据库对齐 SQL。
技术细节见同目录 `supabase-setup.md`；本文件是**操作手册**。

---

## 0. 当前已完成的事（部署侧）

- 4 个入口页已上线：`login.html` / `register.html` / `admin.html` / `pending.html`
- 全站 85 个页面已接入鉴权：
  - **33 个公开页**（首页、关于、各行业落地页、游戏、社区等）带 `data-auth="public"`
  - **51 个受保护页**（法典 / 课表 / 课件 / 内核 / 各行业专业课 / 考核 / 案例 / 打法手册）带 `data-auth="protected"`
  - **1 个管理后台** `admin.html` 带 `data-auth="admin"`
- Supabase 凭据已写入 `auth-config.js`，项目 `ivcylkcbodoacajyvnpy.supabase.co` 存活（未登录访问 `profiles` 返回 401，证明表与 RLS 已生效）。
- 未登录访问任意受保护页 → 自动跳转 `login.html`；登录后按审批状态放行/拦截。

---

## 1. 首次启用（仅需一次）

> 数据库 schema（表 + 触发器 + RLS）**可能已随早期版本建好**。但管理员邮箱策略必须与 `auth-config.js` 对齐，否则后台读不到用户列表。

### 1.1 对齐管理员邮箱策略（关键，避免后台锁死）

打开 Supabase 控制台 → **SQL Editor** → 新建查询，粘贴下面整段执行（幂等，可重复跑）：

```sql
-- 让 rm-community@qq.com 与 3984557428@qq.com 都拥有管理员权限
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all to authenticated
  using ( (select auth.jwt() ->> 'email') in ('rm-community@qq.com','3984557428@qq.com') )
  with check ( (select auth.jwt() ->> 'email') in ('rm-community@qq.com','3984557428@qq.com') );
```

> 若执行报 `relation "profiles" does not exist`，说明表还没建——请先到 `supabase-setup.md` 第 3 步执行「建表 + 触发器 + 权限」整段 SQL，再回来跑上面的策略。

### 1.2 （建议）开启邮箱确认

**Authentication → Providers → Email**，保持 `Confirm email` 开启。
用户注册后会收到验证邮件，点链接确认邮箱归属后再等管理员审批（双重保险）。
开启后，用户在**点验证链接之前**登录会提示 `Email not confirmed`，属正常。

---

## 2. 第一次注册 + 自审（管理员视角）

1. 浏览器打开 `https://hrma-city.github.io/register.html`
2. 用**管理员邮箱** `rm-community@qq.com` 提交申请（填姓名/单位/职位等，密码 ≥ 6 位）。
3. 若开启邮箱确认：去邮箱点验证链接。
4. 打开 `https://hrma-city.github.io/login.html`，用该邮箱登录。
   - 此时状态为 `pending`，会自动跳到 `pending.html`（审核中）。
5. 直接访问 `https://hrma-city.github.io/admin.html`：
   - 管理员即便自身还是 `pending` 也能进后台（auth.js 对 `admin` 模式放行）。
   - 在「待审核」里找到自己的申请，点 **通过**。
6. 退出登录再重新登录，或刷新 `curriculum.html` → 即可进入全部受保护内容。

> 备用方案：若上述后台读不到列表（说明数据库策略仍是旧邮箱），改用 `3984557428@qq.com` 走同一流程，或先执行 1.1 的 SQL。

---

## 3. 日常审批流程（审核制）

1. 访客在 `register.html` 提交申请 → `profiles` 表新增一行，状态 `pending`。
2. 管理员登录后打开 `admin.html` → 「待审核」逐条 **通过 / 驳回**（驳回可填理由，随邮件告知用户）。
3. 通过后，访客在 `login.html` 登录即可访问法典、课件、题库与下载区。

---

## 4. 常见问题

- **受保护页一直转圈 / 提示「鉴权未配置」**：`auth-config.js` 还是占位符。当前已填好真实 Supabase，正常。
- **注册后登录提示 Email not confirmed**：开了邮箱确认，先去点验证邮件。
- **管理员进不了 admin.html / 后台列表为空**：登录邮箱须同时出现在 `auth-config.js` 的 `HRMA_ADMIN_EMAILS` 与数据库 `profiles_admin_all` 策略里。两者现在都含两个邮箱，按 1.1 跑过 SQL 即可。
- **登录提示 Invalid login credentials**：邮箱或密码错；若点过「重置密码」请用新密码。

---

## 5. 架构要点（备查）

- 前端：`auth.js` 暴露 `window.HRMAAuth`，按 `<body data-auth>` 自动守卫（protected / admin / public）。
- 子目录受保护页（core/、courses/、exam/、games/、airline/、attraction/、entertainment/、fnb/）脚本用 `../` 前缀，重定向也由 `auth.js` 的 `prefix()` 正确处理。
- 用户资料表：`public.profiles`（id=auth.users.id，status ∈ pending/approved/rejected）。
- 新用户注册 → 触发器 `handle_new_user` 建档案（pending）→ 管理员审批。
