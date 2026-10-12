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

/* ★ 鉴权模式开关（重要）
   'cloud' = 云端模式：走 Supabase 真实服务端校验，可给外部人开账号。
   'local' = 本地模式：账号存在各自浏览器，不联网。适合只有您自己访问。
                       一旦切回 'local'，云端注册/审核/登录三端会被整条旁路。

   ⚠️ 2026-10-13 改回 'local' 的原因：云端 Supabase 免费项目已闲置暂停（探活 HTTP 000），
   整道门悬空。当前需求是「仅站长可见」，不需要给外人开账号，故切本地模式，
   彻底摆脱对外部服务的依赖。站长邮箱 3984557428@qq.com 登录即自动放行，
   其他人即便在 signin 页点注册，也只会被卡在「待审核」、永远进不来。
   纯静态站点固有限制：懂技术的人仍可用 curl/查看源码扒到 HTML，
   要做到文件级真加密须迁腾讯云服务器（带访问网关），此处只挡普通访客。 */
window.HRMA_AUTH_MODE = 'local';

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

/* 收款信息（结算页展示用）。
   --------------------------------------------------------------------------
   当前模式：**邮箱联系**（保护隐私，网页上不展示任何个人/收款账号）。
   流程：用户下单 → 页面给出联系邮箱 → 发邮件索取付款方式 → 您邮件告知 →
        对方付款 → 您核销后手动开通权益。
   备注：微信/支付宝「转账」方式收款方无上限，不受静态收款码那条「单日 500 元」限制，
        适合 ¥299 / ¥1999 这种客单价。
   如需将来改回扫码，把下面 wechatQR / alipayQR 填上图片地址即可（但请留意 500 元限制）。
   -------------------------------------------------------------------------- */
window.HRMA_PAY = {
  payee: "RMC收益管理社区",

  // 页面上唯一对外展示的联系方式
  contact: "rm-community@qq.com",

  // 收款码图片地址：留空则不展示二维码
  wechatQR: "",
  alipayQR: "",

  // 银行账号说明：留空则不展示（保护隐私，默认不展示）
  bank: "",

  note: "为保护隐私，本站不在网页展示任何收款账号。请通过上述邮箱联系我们获取付款方式，邮件中请附上您的订单号。"
};
