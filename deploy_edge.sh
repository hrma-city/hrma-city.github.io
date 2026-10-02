#!/usr/bin/env bash
# ============================================================================
# 部署支付 Edge Functions 到 Supabase
# 前置：已安装 Supabase CLI（npm i supabase 或 brew install supabase/tap/supabase）
# 用法：
#   ./deploy_edge.sh <ACCESS_TOKEN> <PROJECT_REF>
#   ACCESS_TOKEN    : Supabase 个人设置 → Access Tokens 生成的 token
#   PROJECT_REF     : 项目 ref，本社区为 ivcylkcbodoacajyvnpy
#
# 注意：变量一律用 ${VAR} 花括号写法。
#   $VAR 后紧跟中文时，bash 会把中文首字节并入变量名导致 unbound variable。
# ============================================================================
set -euo pipefail

TOKEN="${1:-${SUPABASE_ACCESS_TOKEN:-}}"
REF="${2:-ivcylkcbodoacajyvnpy}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
ENVFILE="${ROOT}/supabase/.env"

if [ -z "${TOKEN}" ]; then
  echo "错误：缺少 Access Token。用法：./deploy_edge.sh <token> ${REF}"
  exit 1
fi

echo "== 登录 Supabase CLI =="
supabase login --token "${TOKEN}"

echo "== 关联项目 =="
supabase link --project-ref "${REF}" || true

echo "== 注入密钥 =="
if [ -f "${ENVFILE}" ]; then
  supabase secrets set --env-file "${ENVFILE}" --project-ref "${REF}"
else
  echo "未找到 ${ENVFILE}，跳过密钥注入。请复制 supabase/.env.example 为 .env 并填值。"
fi

echo "== 部署 payment-create =="
supabase functions deploy payment-create --project-ref "${REF}"

echo "== 部署 payment-webhook =="
supabase functions deploy payment-webhook --project-ref "${REF}"

echo "== 部署 notify-dispatch（通知邮件分发 + 会员到期扫描）=="
supabase functions deploy notify-dispatch --project-ref "${REF}"

echo "== 完成 =="
echo "回调地址（去各网关后台填写）："
echo "  微信  : https://${REF}.supabase.co/functions/v1/payment-webhook?gw=wechat"
echo "  支付宝: https://${REF}.supabase.co/functions/v1/payment-webhook?gw=alipay"
echo "  Stripe: https://${REF}.supabase.co/functions/v1/payment-webhook?gw=stripe"
echo ""
echo "通知邮件（可选）：在 ${ENVFILE} 中追加以下配置后重跑本脚本即可启用；"
echo "未配置时站内通知照常工作，仅跳过邮件投递。"
echo "  -- 通道一：QQ 邮箱 SMTP（国内到达率更好，推荐）--"
echo "  SMTP_HOST=smtp.qq.com"
echo "  SMTP_PORT=465"
echo "  SMTP_USER=你的邮箱@qq.com"
echo "  SMTP_PASS=邮箱设置里生成的 16 位 SMTP 授权码（不是 QQ 登录密码）"
echo "  EMAIL_FROM_NAME=RMC收益管理社区"
echo "  -- 通道二：Resend（境外，需先验证发信域名）--"
echo "  RESEND_API_KEY=re_xxxxxxxx"
echo "  EMAIL_FROM=RMC收益管理社区 <notify@已验证域名>"
