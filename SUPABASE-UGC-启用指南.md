# RMC 收益管理社区 · UGC（用户生成内容）启用指南

本指南对应 `SUPABASE-UGC-schema.sql`。社区互动层（讨论/提问板、案例投稿、排行榜）的前端已随站发布，
但**数据库表与权限策略需要你在 Supabase 后台手动执行一次 SQL** 才会真正生效。

> 与第 1 层账户系统同理：前端已部署，数据库侧策略需你跑一次 SQL。

---

## 一、一次性：执行数据库 schema（必做）

1. 打开 Supabase 后台 → 你的项目（URL：`https://ivcylkcbodoacajyvnpy.supabase.co`）。
2. 左侧菜单 **SQL Editor** → **New query**。
3. 打开本仓库同目录的 `SUPABASE-UGC-schema.sql`，**全选复制**粘贴进编辑器。
4. 点击 **Run**（或 `Cmd/Ctrl + Enter`）。

该脚本是**幂等**的，可重复执行：
- 新建 `posts` / `replies` / `cases` 三张表（已存在则跳过）。
- 给 `profiles` 表加 `exam_score / exam_level / contributions / bio / avatar_url` 字段。
- 新建公开视图 `public_leaderboard`（排行榜只读，绕过 profiles 的私有 RLS）。
- 新建点赞函数 `inc_votes`（登录用户可调用）。
- 用 DO 块重置 RLS 策略：任何人可读已发布内容，登录用户只能写自己的，管理员（`rm-community@qq.com`、`3984557428@qq.com`）可审。

执行无报错即完成。之后无需再动数据库。

---

## 二、使用流程

### 1. 注册并登录
- 访问 `register.html` 注册 → 邮箱确认 → 登录。
- 管理员在 `admin.html` 把该账号状态置为 `approved`。

### 2. 讨论 / 提问板（`community/board.html`）
- **浏览**：任何人可看，无需登录。
- **发帖 / 回帖 / 点赞**：需登录。点「＋ 发新帖」→ 选板块与类型 → 发布。
- 专家账号（管理员）的回复会自动标记「专家作答」。

### 3. 案例投稿（`community/cases.html`）
- 登录后点「＋ 投稿案例」填写真实案例 → 状态为 `pending`。
- 管理员在 Supabase 把该案例 `status` 改为 `approved` 后，即出现在公开展示廊。
  （也可在 `admin.html` 或 SQL Editor 执行：`update public.cases set status='approved' where id='<案例id>';`）

### 4. 排行榜（`community/leaderboard.html`）
- 公开可读，按 `exam_score` 降序、再按 `contributions` 降序。
- `contributions` 会在你发帖 / 回帖 / 投稿时自动 +1（触发器维护）。
- `exam_score` 来自认证考试结果（下阶段接入 exam 页写入，现阶段可由管理员在 profiles 表手动赋值用于演示）。

---

## 三、权限模型（速查）

| 资源 | 匿名(anon) | 登录用户 | 管理员 |
|------|-----------|---------|--------|
| 已发布帖子 / 已审核案例 | 读 | 读 + 写自己 | 全部 |
| 自己的草稿/回复 | — | 写/改/删自己 | 全部 |
| 排行榜视图 | 读 | 读 | 读 |
| 点赞 `inc_votes` | — | 调用 | 调用 |

若某天想收紧/放开某条策略，直接在 `SUPABASE-UGC-schema.sql` 改对应 `create policy` 再跑一次即可。

---

## 四、排错

- **页面能打开但发帖报错 / 列表空白**：多半是步骤一 SQL 未执行或执行失败。回 SQL Editor 重跑并看报错。
- **登录后发帖提示 403 / 被拒**：检查 `profiles` 里你的账号 `status` 是否为 `approved`（未审批的账号受保护内容会拒绝写入）。
- **排行榜为空**：正常——还没有人产生成绩或贡献。发几条帖就会上榜。
- **本地预览 vs 线上不一致**：GitHub Pages 有 CDN 缓存，部署后等 30–60 秒再测。
