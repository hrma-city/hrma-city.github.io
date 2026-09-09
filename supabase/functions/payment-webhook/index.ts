// deno-lint-ignore-file no-explicit-any
// ============================================================================
// RMC 收益管理社区 · 支付回调 Edge Function
// 部署：supabase functions deploy payment-webhook --project-ref ivcylkcbodoacajyvnpy
// 回调地址（去各网关后台配置）：
//   微信： https://<project>.supabase.co/functions/v1/payment-webhook?gw=wechat
//   支付宝：https://<project>.supabase.co/functions/v1/payment-webhook?gw=alipay
//   Stripe：https://<project>.supabase.co/functions/v1/payment-webhook?gw=stripe
// 环境变量（Secrets）：
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  —— 自动注入
//   STRIPE_WEBHOOK_SECRET   —— Stripe 端点密钥（whsec_...）
//   WX_API_V3_KEY           —— 微信 APIv3 密钥（用于解密回调报文）
//   WX_PLATFORM_PUBLIC_KEY  —— 微信平台证书公钥（PEM，用于验签；从商户平台下载）
//   ALIPAY_PUBLIC_KEY       —— 支付宝公钥（PEM，用于验签）
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const svc = createClient(URL, SVC);

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
function bufToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hmacSha256Hex(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return bufToHex(sig);
}

// 用 payments.gateway_txn 反查订单 id
async function orderIdByTxn(gateway: string, txn: string): Promise<string | null> {
  if (!txn) return null;
  const { data } = await svc.from("payments").select("order_id").eq("gateway", gateway).eq("gateway_txn", txn).limit(1).maybeSingle();
  return data?.order_id || null;
}

async function complete(orderId: string | null, gateway: string, txn: string) {
  if (!orderId) return new Response("order not found", { status: 200 });
  await svc.rpc("complete_payment", { p_order: orderId, p_gateway: gateway, p_ref: txn });
  return new Response("success", { status: 200 });
}

// ---------------- Stripe ----------------
async function handleStripe(raw: string, headers: Headers): Promise<Response> {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return new Response("Stripe webhook secret 未配置", { status: 500 });
  const sig = headers.get("stripe-signature") || "";
  const m = sig.match(/t=(\d+)/);
  const v = sig.match(/v1=([^,]+)/);
  if (!m || !v) return new Response("bad signature", { status: 400 });
  const expected = await hmacSha256Hex(secret, `${m[1]}.${raw}`);
  if (expected !== v[1]) return new Response("signature mismatch", { status: 400 });
  const evt = JSON.parse(raw);
  if (evt.type === "checkout.session.completed") {
    const obj = evt.data.object;
    const orderId = obj.client_reference_id || (await orderIdByTxn("stripe", obj.id));
    return await complete(orderId, "stripe", obj.id);
  }
  return new Response("ignored", { status: 200 });
}

// ---------------- 微信 v3 ----------------
async function handleWechat(raw: string, headers: Headers): Promise<Response> {
  const v3key = Deno.env.get("WX_API_V3_KEY");
  const platformPub = Deno.env.get("WX_PLATFORM_PUBLIC_KEY");
  if (!v3key) return new Response("WX_API_V3_KEY 未配置", { status: 500 });
  if (!platformPub) return new Response("WX_PLATFORM_PUBLIC_KEY 未配置", { status: 500 });

  const ts = headers.get("wechatpay-timestamp") || "";
  const nonce = headers.get("wechatpay-nonce") || "";
  const sigB64 = headers.get("wechatpay-signature") || "";
  const msg = `${ts}\n${nonce}\n${raw}\n`;
  const key = await crypto.subtle.importKey("spki", pemToBuf(platformPub), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, new Uint8Array(atob(sigB64).split("").map((c) => c.charCodeAt(0))).buffer, new TextEncoder().encode(msg));
  if (!ok) return new Response("signature mismatch", { status: 400 });

  // 解密 resource
  const evt = JSON.parse(raw);
  const res = evt.resource || {};
  const keyBuf = new TextEncoder().encode(v3key);
  const cipher = new Uint8Array(atob(res.ciphertext).split("").map((c) => c.charCodeAt(0)));
  const iv = new TextEncoder().encode(res.nonce);
  const aad = new TextEncoder().encode(res.associated_data || "");
  const aesKey = await crypto.subtle.importKey("raw", keyBuf, { name: "AES-GCM" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad }, aesKey, cipher);
  const obj = JSON.parse(new TextDecoder().decode(plain));
  if (obj.trade_state === "SUCCESS") {
    const orderId = await orderIdByTxn("wechat", obj.out_trade_no);
    return await complete(orderId, "wechat", obj.out_trade_no);
  }
  return new Response("not paid", { status: 200 });
}

// ---------------- 支付宝 ----------------
async function handleAlipay(params: URLSearchParams): Promise<Response> {
  const pub = Deno.env.get("ALIPAY_PUBLIC_KEY");
  if (!pub) return new Response("ALIPAY_PUBLIC_KEY 未配置", { status: 500 });
  const sign = params.get("sign") || "";
  const sorted = Array.from(params.entries())
    .filter(([k]) => k !== "sign" && k !== "sign_type" && params.get(k) !== "")
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const key = await crypto.subtle.importKey("spki", pemToBuf(pub), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, new Uint8Array(atob(sign).split("").map((c) => c.charCodeAt(0))).buffer, new TextEncoder().encode(sorted));
  if (!ok) return new Response("sign mismatch", { status: 400 });
  if (params.get("trade_status") === "TRADE_SUCCESS" || params.get("trade_status") === "TRADE_FINISHED") {
    const orderId = await orderIdByTxn("alipay", params.get("out_trade_no") || "");
    return await complete(orderId, "alipay", params.get("trade_trade_no") || params.get("out_trade_no") || "");
  }
  return new Response("not paid", { status: 200 });
}

// ---------------- 主流程 ----------------
Deno.serve(async (req: Request) => {
  const gw = new URL(req.url).searchParams.get("gw") || req.headers.get("x-gateway") || "";
  const raw = await req.text();
  try {
    if (gw === "stripe") return await handleStripe(raw, req.headers);
    if (gw === "wechat") return await handleWechat(raw, req.headers);
    if (gw === "alipay") return await handleAlipay(new URLSearchParams(raw));
    return new Response("unknown gateway", { status: 400 });
  } catch (e: any) {
    return new Response("error: " + String(e?.message || e), { status: 400 });
  }
});
