// deno-lint-ignore-file no-explicit-any
// ============================================================================
// RMC 收益管理社区 · 支付下单 Edge Function
// 部署：supabase functions deploy payment-create --project-ref ivcylkcbodoacajyvnpy
// 环境变量（Supabase Secrets）：
//   SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY  —— 自动注入
//   SITE_URL                  —— 站点地址，用于拼接 success/cancel 回跳，如 https://hrma-city.github.io
//   STRIPE_SECRET_KEY         —— Stripe 密钥（sk_live_... / sk_test_...）
//   WX_MCH_ID / WX_APP_ID / WX_API_V3_KEY / WX_SERIAL_NO / WX_PRIVATE_KEY / WX_NOTIFY_URL
//   ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY / ALIPAY_NOTIFY_URL
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE = (Deno.env.get("SITE_URL") || "https://hrma-city.github.io").replace(/\/$/, "");
const WEBHOOK = `${URL}/functions/v1/payment-webhook`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// PEM 文本 → ArrayBuffer（去除头尾与换行后 base64 解码）
function pemToBuf(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN[^-]+-----/, "").replace(/-----END[^-]+-----/, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}
function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
async function rsaSignPkcs1v15(pem: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("pkcs8", pemToBuf(pem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(msg));
  return bufToB64(sig);
}

// ---------------- 微信支付 Native v3 ----------------
async function createWechat(order: any) {
  const mchid = Deno.env.get("WX_MCH_ID");
  const appid = Deno.env.get("WX_APP_ID");
  const v3key = Deno.env.get("WX_API_V3_KEY");
  const serial = Deno.env.get("WX_SERIAL_NO");
  const priv = Deno.env.get("WX_PRIVATE_KEY");
  const notify = Deno.env.get("WX_NOTIFY_URL") || `${WEBHOOK}?gw=wechat`;
  if (!mchid || !appid || !v3key || !serial || !priv) throw new Error("微信支付密钥未配置（WX_*）");

  const outTradeNo = String(order.id).replace(/-/g, "").slice(0, 32);
  const body: any = {
    mchid,
    appid,
    description: `RMC-${order.kind}`,
    out_trade_no: outTradeNo,
    notify_url: notify,
    amount: { total: Math.round(Number(order.amount) * 100), currency: "CNY" },
  };
  const apiUrl = "https://api.mch.weixin.qq.com/v3/pay/transactions/native";
  const ts = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const msg = `POST\n${apiUrl}\n${ts}\n${nonce}\n${JSON.stringify(body)}\n`;
  const sig = await rsaSignPkcs1v15(priv, msg);
  const auth = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce}",signature="${sig}",timestamp="${ts}",serial_no="${serial}"`;

  const resp = await fetch(apiUrl, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error("微信下单失败：" + (data.message || JSON.stringify(data)));
  return { txn: outTradeNo, payload: data, frontend: { type: "qr", code_url: data.code_url } };
}

// ---------------- 支付宝 电脑网站支付 ----------------
async function createAlipay(order: any) {
  const appId = Deno.env.get("ALIPAY_APP_ID");
  const priv = Deno.env.get("ALIPAY_PRIVATE_KEY");
  const notify = Deno.env.get("ALIPAY_NOTIFY_URL") || `${WEBHOOK}?gw=alipay`;
  const returnUrl = `${SITE}/checkout.html?order=${order.id}&paid=1`;
  if (!appId || !priv) throw new Error("支付宝密钥未配置（ALIPAY_*）");

  const biz = {
    out_trade_no: String(order.id),
    total_amount: String(Number(order.amount).toFixed(2)),
    subject: `RMC-${order.kind}`,
    product_code: "FAST_INSTANT_TRADE_PAY",
  };
  const params: Record<string, string> = {
    app_id: appId,
    method: "alipay.trade.page.pay",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: new Date().toISOString().slice(0, 19).replace(/[-:T]/g, ""),
    version: "1.0",
    notify_url: notify,
    return_url: returnUrl,
    biz_content: JSON.stringify(biz),
  };
  params.sign = await rsaSignPkcs1v15(priv, alipaySignStr(params));
  const query = new URLSearchParams(params).toString();
  return { txn: String(order.id), payload: params, frontend: { type: "redirect", url: `https://openapi.alipay.com/gateway.do?${query}` } };
}
function alipaySignStr(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((k) => k !== "sign" && params[k] !== "" && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

// ---------------- Stripe Checkout ----------------
async function createStripe(order: any) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY 未配置");
  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][price_data][currency]": "cny",
    "line_items[0][price_data][product_data][name]": `RMC-${order.kind}-${order.ref_id || ""}`,
    "line_items[0][price_data][unit_amount]": String(Math.round(Number(order.amount) * 100)),
    "line_items[0][quantity]": "1",
    client_reference_id: String(order.id),
    success_url: `${SITE}/checkout.html?order=${order.id}&paid=1`,
    cancel_url: `${SITE}/checkout.html?order=${order.id}`,
    "metadata[order_id]": String(order.id),
  });
  const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error("Stripe：" + (data.error?.message || "创建失败"));
  return { txn: data.id, payload: data, frontend: { type: "redirect", url: data.url } };
}

// ---------------- 主流程 ----------------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const auth = req.headers.get("authorization") || "";
    const anon = createClient(URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: u } = await anon.auth.getUser();
    if (!u.user) return json({ ok: false, msg: "未登录" }, 401);

    const body = await req.json().catch(() => ({}));
    const orderId = body.order_id;
    const gateway = body.gateway;
    if (!["stripe", "wechat", "alipay"].includes(gateway)) return json({ ok: false, msg: "不支持的网关" }, 400);

    const svc = createClient(URL, SVC);
    const { data: order, error } = await svc.from("orders").select("*").eq("id", orderId).single();
    if (error || !order) return json({ ok: false, msg: "订单不存在" }, 404);
    if (order.user_id !== u.user.id) return json({ ok: false, msg: "无权操作该订单" }, 403);
    if (order.status === "paid") return json({ ok: true, msg: "已支付", paid: true }, 200);

    let result: any;
    if (gateway === "stripe") result = await createStripe(order);
    else if (gateway === "wechat") result = await createWechat(order);
    else result = await createAlipay(order);

    await svc.from("payments").insert({
      order_id: order.id,
      gateway,
      amount: order.amount,
      currency: "CNY",
      status: "created",
      gateway_txn: result.txn ?? null,
      payload: result.payload ?? null,
    });
    await svc.from("orders").update({ gateway }).eq("id", order.id);

    return json({ ok: true, ...result.frontend }, 200);
  } catch (e: any) {
    return json({ ok: false, msg: String(e?.message || e) }, 500);
  }
});
