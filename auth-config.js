/* ==========================================================================
   HRMA 学院官网 · 鉴权配置
   --------------------------------------------------------------------------
   ▼▼▼ 需要填的就是下面两行 ▼▼▼
   1. 到 https://supabase.com 免费注册，新建一个项目
   2. 项目 → Settings → API
      · Project URL       → 贴在 url
      · anon public key   → 贴在 anonKey
   3. 保存本文件，重新部署

   详细步骤见同目录 supabase-setup.md
   ========================================================================== */

window.HRMA_SUPABASE = {
  // 例： "https://abcdefghijklmnop.supabase.co"
  url: "https://ivcylkcbodoacajyvnpy.supabase.co",

  // 例： "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9......"
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2Y3lsa2Nib2RvYWNhanl2bnB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2OTYzMzYsImV4cCI6MjEwNDI3MjMzNn0.oO7kU5OJ2TYY6U1ZD6Ol3Vuh6dMwaIvV2N6CzsqL4Xw"
};

/* 管理员邮箱（拥有审批权限）。多个用逗号分隔。
   同时保留新旧两个邮箱，兼容数据库里可能仍是旧策略的情况。
   数据库侧 profiles_admin_all 策略请见 supabase-setup.md（已支持这两个邮箱）。 */
window.HRMA_ADMIN_EMAILS = ["rm-community@qq.com", "3984557428@qq.com"];

/* 联系邮箱（页面展示用） */
window.HRMA_CONTACT_EMAIL = "rm-community@qq.com";

/* 收款信息（结算页「扫码支付」展示用）。
   --------------------------------------------------------------------------
   现在走的是「静态个人收款码」路线：无需商户号、无需资质，今天就能收款。
   你只需要做一件事：
     微信收款码  → 覆盖 assets/img/pay/wechat-qr.svg（或改下面路径指向你的图片）
     支付宝收钱码 → 覆盖 assets/img/pay/alipay-qr.svg（同上）
   注意：静态码没有回调到账通知，用户扫码付款后需手动点「我已支付」，
        属信任制自助开通；如要强制人工核销，见 SUPABASE-支付网关-启用指南.md。
   -------------------------------------------------------------------------- */
window.HRMA_PAY = {
  payee: "RMC收益管理社区",
  contact: "rm-community@qq.com",

  // 收款码图片地址（留空则回退到同名占位图，不会变成死链）
  wechatQR: "assets/img/pay/wechat-qr.svg",
  alipayQR: "assets/img/pay/alipay-qr.svg",

  // 银行转账补充说明（可留空；留空则结算页不展示该行）
  bank: "",

  // 扫码时给用户看的提示，建议引导用户在付款备注里填注册邮箱，便于你核对到账
  note: "扫码后请手动输入页面显示的金额；付款备注建议填写你的注册邮箱，便于核对到账。"
};
