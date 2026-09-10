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

echo "== 完成 =="
echo "回调地址（去各网关后台填写）："
echo "  微信  : https://${REF}.supabase.co/functions/v1/payment-webhook?gw=wechat"
echo "  支付宝: https://${REF}.supabase.co/functions/v1/payment-webhook?gw=alipay"
echo "  Stripe: https://${REF}.supabase.co/functions/v1/payment-webhook?gw=stripe"
