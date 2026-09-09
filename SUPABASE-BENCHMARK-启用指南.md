# 社区共建样本池 · 启用指南

对应 `SUPABASE-BENCHMARK-schema.sql`（幂等，可重复执行）。

## 一、一次性跑数据库结构

1. Supabase → **SQL Editor**
2. 粘贴 `SUPABASE-BENCHMARK-schema.sql` 全文 → **Run**

建好后：
- `benchmark_points`：会员上报的原始月度数据点
- `benchmark_pool`：**聚合视图**（只暴露样本数 ≥ 3 的城市×月份均值）
- 三条底线已用数据库约束固化（不需前端配合）

> 验证：`GET /rest/v1/benchmark_pool?select=*` 应从 404 变为 200（返回空数组也可）。

## 二、三条底线（建表即固化）

| 底线 | 实现方式 |
|---|---|
| **k-匿名** | 视图 `having count(*) >= 3`，样本不足 3 条的城市月份**根本不出现在视图里** |
| **防灌水** | 唯一索引 `(user_id, city, month)`，同一人同月重复提交＝覆盖，无法刷量 |
| **防垃圾** | CHECK 约束：ADR 20–50000、出租率 1–100、月份必须 `YYYY-MM` |

额外：原始表**不给 anon 任何权限**，公众只能读到聚合视图，拿不到 `user_id` 也拿不到单条数据。

## 三、页面

| 页面 | 作用 |
|---|---|
| `benchmark/contribute.html` | 上报表单（登录门禁）+「我的上报」列表 |
| `benchmark/city.html` | 底部「社区共建样本池」区块，展示聚合结果，样本不足时引导上报 |

顶部「基准 → 共建样本池」入口也已加入。

## 四、使用流程

1. 会员登录 → 进 `benchmark/contribute.html`
2. 填城市 / 月份 / ADR / 出租率（房量、业态选填）→ 提交
3. 同一城市同一月份满 **3 条**后，该城市月份的均值自动出现在 `city.html` 的样本池区块
4. 会员可在「我的上报」里核对，重新提交同月即覆盖

## 五、日常运维（管理员）

```sql
-- 查看最新上报（可疑数据排查）
select city, month, adr, occ, created_at from public.benchmark_points
 where status='approved' order by created_at desc limit 50;

-- 驳回一条脏数据
update public.benchmark_points set status='rejected' where id='<uuid>';

-- 查看当前已达标（n>=3）的城市月份
select * from public.benchmark_pool order by city, month;
```

## 六、已知取舍

- 上报**默认直接纳入**（`status='approved'`），这样样本池能快速长起来；代价是有个别脏数据风险。
  若你更看重纯净度，可把默认值改成 `'rejected'` 再逐条审核：
  `alter table public.benchmark_points alter column status set default 'rejected';`
- 社区数据**未经审计**，页面已明确标注「请结合样本数 n 判断参考价值」，不与官方数据混排。

## 七、排错

- 点提交跳登录：正常，`requireLogin` 会带 `?redirect=` 回跳。
- 提交报「duplicate key」：唯一索引生效，正常应走 upsert 覆盖；确认前端用的是 `upsert(..., {onConflict:'user_id,city,month'})`。
- 样本池一直空：同一城市同一月份需 ≥3 条才显示，先看 `benchmark_points` 里有多少条。
- 报权限错误：确认已 `grant select on benchmark_pool to anon`。
