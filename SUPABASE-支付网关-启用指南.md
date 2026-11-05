# RMC 收益管理社区 · 真实支付网关 启用指南

> 把"下单 + 支付指引占位"升级为**真实支付**：用户选微信 / 支付宝 / Stripe → 扫码或跳转 → 回调自动开通权益。
> 设计目标：**统一脚手架**，三个网关共用同一套下单函数 `payment-create` 与回调函数 `payment-webhook`，密钥全部走 Supabase Secrets（环境变量），不落库、不进前端。

---

## 0. 整套文件清单

| 文件 | 作用 | 谁执行 |
|------|------|--------|
| `SUPABASE-支付网关-schema.sql` | 扩 orders 表 + 新建 payments 表 + `complete_payment()` 函数 | 你在 SQL Editor 跑 |
| `supabase/functions/payment-create/index.ts` | 下单分发（校验登录→建支付→记流水） | 部署到 Supabase |
| `supabase/functions/payment-webhook/index.ts` | 回调验签 + 调 `complete_payment` | 部署到 Supabase |
| `supabase/config.toml` | 关闭两个函数的自动 JWT 校验 | 随部署生效 |
| `supabase/.env.example` | 密钥模板 | 你填值后注入 |
| `deploy_edge.sh` | 一键登录/注入密钥/部署 | 你本地跑 |
| `assets/js/commerce.js` | 前端 `createPayment()` / `pollOrder()` | 已改好 |
| `checkout.html` + `commerce.css` | 网关选择 + 二维码 + 轮询 | 已改好 |

---

## 1. 数据库（5 分钟）

1. 打开 Supabase → **SQL Editor**
2. 粘贴 `SUPABASE-支付网关-schema.sql` 全文 → **Run**
3. 验证：
   ```sql
   select column_name from information_schema.columns
   where table_name='orders' and column_name in ('gateway','payment_ref');
   -- 应返回 2 行
   select count(*) from information_schema.tables where table_name='payments';
   -- 应返回 1
   ```
   > 此文件幂等，可重复执行。原有 `confirm_payment()`（手动"我已支付"）保留作兜底。

---

## 2. 部署 Edge Functions

Edge Function 无法在 SQL Editor 里建，必须用 **Supabase CLI**（或仪表盘粘贴代码）。两种方式任选。

### 方式 A：CLI 一键（推荐）

```bash
# 1. 安装 CLI（已装可跳过）
npm i -g supabase            # 或 brew install supabase/tap/supabase

# 2. 准备密钥：复制模板并填值
cp supabase/.env.example supabase/.env
#   用编辑器打开 supabase/.env，至少填你已开通的网关密钥

# 3. 一键部署（ACCESS_TOKEN 在 Supabase 个人设置 → Access Tokens 生成）
./deploy_edge.sh <ACCESS_TOKEN> ivcylkcbodoacajyvnpy
```

脚本会：登录 → 关联项目 → 注入 Secrets → 部署 `payment-create` 与 `payment-webhook`。

### 方式 B：仪表盘粘贴（无 CLI）

1. Supabase → **Edge Functions** → **New function**
2. 函数名 `payment-create` → 把 `supabase/functions/payment-create/index.ts` 全文粘贴 → Deploy
3. 再建 `payment-webhook`，粘贴 `payment-webhook/index.ts` → Deploy
4. **Settings → Functions** 里把两个函数的 `Verify JWT` 关掉（代码自行校验）
5. **Settings → Secrets** 里手动添加 `.env.example` 中的变量

---

## 3. 配置各网关密钥与回调

把下面回调地址填到对应商户后台的「回调 / Webhook / 通知」里：

```
微信  : https://ivcylkcbodoacajyvnpy.supabase.co/functions/v1/payment-webhook?gw=wechat
支付宝: https://ivcylkcbodoacajyvnpy.supabase.co/functions/v1/payment-webhook?gw=alipay
Stripe: https://ivcylkcbodoacajyvnpy.supabase.co/functions/v1/payment-webhook?gw=stripe
```

各网关需要的密钥（见 `.env.example`）：

| 网关 | 必填 | 获取位置 |
|------|------|----------|
| Stripe | `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET` | Dashboard → API keys / Webhooks |
| 微信 | `WX_MCH_ID`、`WX_APP_ID`、`WX_API_V3_KEY`、`WX_SERIAL_NO`、`WX_PRIVATE_KEY`、`WX_PLATFORM_PUBLIC_KEY` | 微信支付商户平台 → APIv3 / 证书 |
| 支付宝 | `ALIPAY_APP_ID`、`ALIPAY_PRIVATE_KEY`、`ALIPAY_PUBLIC_KEY` | 支付宝开放平台 → 应用 |

> **重点**：微信 `WX_PLATFORM_PUBLIC_KEY`（验签用平台证书公钥）与 `WX_PRIVATE_KEY`（商户 API 私钥）是两个**不同**的 PEM，别搞反。支付宝 `ALIPAY_PUBLIC_KEY` 是**支付宝**公钥（不是你应用私钥）。

---

## 4. 前端已就绪

结算页 `checkout.html` 现在会：
- 待支付订单展示 **微信 / 支付宝 / Stripe / 其他方式** 四个入口
- 微信 → 调 `payment-create` 拿到 `code_url` → 页面内渲染二维码 → 每 2.5 秒轮询订单状态，支付成功自动刷新
- 支付宝 / Stripe → 跳转网关收银台，成功后回跳 `checkout.html?order=...&paid=1` 自动确认
- 「其他方式」保留原手动转账 +「我已支付」兜底

下单来源（`pricing.html` / `academy.html` / `experts.html`）无需改动，它们走的是已有的 `createOrder()`，会员订单的 `ref_id` 已写入 plan 名，`complete_payment` 会自动升级。

---

## 5. 联调测试（务必走一遍）

1. 用测试金额最小档（如 ¥0.01）下一单
2. 选一个已配好密钥的网关支付
3. 支付后回到结算页，订单应自动变为「已支付」
4. 若是会员单：`select plan from profiles where id='<你的用户id>'` 应变为 `standard` / `enterprise`
5. 查流水对账：`select * from payments order by created_at desc limit 5;`

---

## 6. 已知约定与边界

- **金额单位**：微信 / 支付宝 / Stripe 的 `amount` 都按「分」传（`元×100`）；前端 `order.amount` 存的是「元」，函数在 Edge Function 里换算。
- **会员权益**：仅 `orders.kind='membership'` 且 `ref_id` 为 plan 名时，`complete_payment` 自动升 plan；课程 / 咨询 / 职位推广单只标记 paid，权益由各自业务逻辑读取。
- **幂等**：回调重复到达 → `complete_payment` 直接返回已支付，不会重复升 plan / 重复改状态。
- **安全**：所有密钥仅在 Supabase Secrets 与 Edge Function 服务端可见，前端只拿到「跳转链接」或「二维码内容」，拿不到任何密钥。
- **回退**：真实网关未配齐前，结算页「其他方式」仍可走手动转账 + 人工确认（原 `confirm_payment`）。
