# 第 4 层 · 商业变现 · 启用指南

本指南对应 `SUPABASE-COMMERCE-schema.sql`，与 `SUPABASE-UGC-schema.sql` 同构（幂等 DO 块，可重复执行）。

## 一、一次性跑数据库结构（你来做，无法自动跑）

1. 打开 Supabase 项目 → **SQL Editor**。
2. 粘贴 `SUPABASE-COMMERCE-schema.sql` **全文** → 点 **Run**。
3. 跑完即建好：
   - `profiles` 增加 `plan`（free/standard/enterprise）、`plan_expire`
   - `experts`（专家目录，含 1v1 咨询价 / 企业内训价，已预置 4 位种子专家）
   - `jobs`（招聘职位，已预置 3 条种子职位）
   - `orders`（统一订单表）
   - 函数 `confirm_payment(order_id, plan)`（占位“我已支付”）
   - 全套 RLS（匿名可读公开内容；登录用户只写自己的订单；管理员全权）

> 验证：Run 之后，
> `GET /rest/v1/orders?select=*&limit=1` 应从 404 变为 401（表已建 + RLS 生效）。

## 二、页面与入口（已随站发布）

| 页面 | 作用 |
|---|---|
| `pricing.html` | 会员三档（免费 / 标准 ¥299 / 企业版 ¥1999）+ 选档下单 |
| `academy.html`（底部新增「课程包与解锁」） | L1/L2/L3/全套 四档课程包标价 + 购买 |
| `experts.html`（新增「专家目录」） | 专家列表 + 1v1 咨询 / 企业内训 预约下单 |
| `jobs.html` | 招聘 / 内推；企业会员登录后发布职位 |
| `checkout.html` | 统一结算：订单详情 + 支付指引 + 我已支付 + 我的订单 |

顶部导航已新增「会员」「招聘」两项（其它页面由 `app.js` 统一注入）。

## 三、支付怎么跑通（当前为演示占位）

本层采用「**下单 → 生成订单(pending) → 展示支付指引 → 我已支付标记 paid**」流程，
**不涉及真实资金通道**，因此现在就能完整跑通：

1. 用户点任意「购买 / 预约」→ 未登录先跳登录，登录后生成 `orders` 行（status=pending）。
2. 跳转 `checkout.html?order=<id>`，展示**支付指引**（收款方 / 转账账号 / 收款码占位 + 备注说明）。
3. 用户完成转账 / 联系后，点「我已支付」→ 调用 `confirm_payment()`：
   - 订单标记 `paid`、`paid_at` 写入；
   - 若为会员订单，自动把 `profiles.plan` 升级为对应档位、`plan_expire` 设为一年。
4. 会员权益即生效（排行榜计权、专家折扣等按 `plan` 字段判断）。

## 四、收款信息配置

编辑 `auth-config.js` 末尾的 `window.HRMA_PAY`：

```js
window.HRMA_PAY = {
  payee: "RMC收益管理社区",
  contact: "rm-community@qq.com",
  wechatQR: "",   // 微信收款码图片地址
  alipayQR: "",   // 支付宝收款码图片地址
  bank: "",       // 转账账号说明
  note: "..."     // 支付指引备注
};
```

填好二维码地址后，结算页自动展示扫码直付；为空则显示「收款码待接入」占位。

## 五、权限矩阵

| 角色 | experts | jobs | orders |
|---|---|---|---|
| 匿名 | 可读 | 可读（仅 open） | 不可 |
| 登录用户 | 写自己的 | 发 + 写自己的 | 写自己的、读自己的 |
| 管理员（两邮箱） | 全权 | 全权 | 全权 |

## 六、接入真实支付（后续，非本期）

真实网关（微信支付 / 支付宝 / Stripe）上线时：
- 用 **Supabase Edge Function** 接收支付回调，回调内调用等价逻辑把 `orders.status` 置 `paid`；
- 前端把 `checkout.html` 的「我已支付」按钮替换为「去支付」跳转；
- `confirm_payment()` 仅作回退/对账用，不再对前端暴露。

数据层（orders / experts / jobs / profiles.plan）**无需改动**，本期已为真实网关预留好结构。

## 七、排错

- 页面报「组件未加载」：确认 `auth-config.js` / `auth.js` / `assets/js/commerce.js` 已随站发布。
- 点购买跳转登录后回不来：登录页 `?redirect=` 参数已带当前页，正常。
- 专家目录 / 职位空白：先在 Supabase 跑本 SQL（种子数据会写入）；或手动往 `experts` / `jobs` 插数据。
- 订单 404：SQL 未跑；orders 表不存在。
