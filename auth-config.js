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

/* 收款信息（结算页“支付指引”展示用）。
   占位状态：二维码留空，先展示「转账/联系」占位文案；
   接入真实网关（微信支付/支付宝/Stripe）后，把二维码图片地址与收款人/账号填这里即可。 */
window.HRMA_PAY = {
  payee: "RMC收益管理社区",
  contact: "rm-community@qq.com",
  wechatQR: "",   // 微信收款码图片地址（填后展示）
  alipayQR: "",   // 支付宝收款码图片地址（填后展示）
  bank: "",       // 对公/个人转账账号说明，如「支付宝：rm-community@qq.com」
  note: "当前为演示收款占位：下单后请按页面指引完成转账/联系，后台确认后开通权益。真实支付网关接入后此处自动切换为扫码直付。"
};
