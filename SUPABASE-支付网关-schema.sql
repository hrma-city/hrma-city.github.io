/* ============================================================================
 * RMC 收益管理社区 · 真实支付网关 · 数据库扩展
 * ----------------------------------------------------------------------------
 * 一次性在 Supabase SQL Editor 粘贴运行（幂等，可重复执行）。
 *
 * 本文件只动「数据库侧」，不触碰前端与 Edge Function：
 *   1. orders 表扩展 gateway / payment_ref 两列（记录用了哪个网关、网关交易号）
 *   2. 新建 payments 交易流水表（每次下单尝试都记一笔，便于对账与排查）
 *   3. complete_payment()：由支付回调（Edge Function）调用，安全地把订单置为 paid
 *      —— 若是会员订单，自动按 orders.ref_id 把 profiles.plan 升级
 *
 * 配套文件（本仓库内）：
 *   supabase/functions/payment-create/index.ts   —— 创建支付（分发微信/支付宝/Stripe）
 *   supabase/functions/payment-webhook/index.ts  —— 支付回调（验签 + 调 complete_payment）
 *
 * 管理员邮箱与本社区一致：rm-community@qq.com / 3984557428@qq.com
 * ========================================================================== */

/* ---------------- 1. orders 扩展 ---------------- */
alter table public.orders add column if not exists gateway     text;   -- stripe | wechat | alipay | manual
alter table public.orders add column if not exists payment_ref text;   -- 网关交易号 / session id

/* ---------------- 2. payments 交易流水 ---------------- */
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  gateway      text not null,                 -- stripe | wechat | alipay
  amount       numeric not null default 0,
  currency     text not null default 'CNY',
  status       text not null default 'created', -- created | paid | failed | refunded
  gateway_txn  text,                          -- 网关侧交易号（用于回调反查订单）
  payload      jsonb,                         -- 网关返回的原始报文（排查用）
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_payments_order   on public.payments (order_id);
create index if not exists idx_payments_txn     on public.payments (gateway, gateway_txn);

/* ---------------- 3. RLS ---------------- */
alter table public.payments enable row level security;

drop policy if exists payments_owner_read on public.payments;
create policy payments_owner_read on public.payments
  for select to authenticated
  using ( order_id in (select id from public.orders where user_id = auth.uid()) );

drop policy if exists payments_admin on public.payments;
create policy payments_admin on public.payments
  for all to authenticated
  using ( (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']) )
  with check ( (select auth.jwt() ->> 'email') = any(array['rm-community@qq.com','3984557428@qq.com']) );

grant select on public.payments to authenticated;

/* ---------------- 4. complete_payment：回调调用，安全置已付 ----------------
 * 由 payment-webhook Edge Function 以 service_role 调用（绕过 RLS）。
 * 入参只给订单号/网关/交易号；会员档位自动取 orders.ref_id（创建订单时写入的 plan）。
 * 回调是「只增不改回」：已 paid 的订单再次回调仍是成功，绝不会退回。
 */
create or replace function public.complete_payment(
  p_order   uuid,
  p_gateway text,
  p_ref     text,
  p_plan    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_plan  text;
begin
  select * into v_order from public.orders where id = p_order for update;
  if v_order is null then
    return jsonb_build_object('ok', false, 'msg', '订单不存在');
  end if;
  if v_order.status = 'paid' then
    return jsonb_build_object('ok', true, 'msg', '已支付');
  end if;

  -- 标记订单已付 + 记网关与交易号
  update public.orders
     set status = 'paid',
         paid_at = now(),
         gateway = coalesce(p_gateway, gateway),
         payment_ref = coalesce(p_ref, payment_ref)
   where id = p_order;

  -- 同步流水状态
  update public.payments
     set status = 'paid', updated_at = now(), gateway_txn = coalesce(p_ref, gateway_txn)
   where order_id = p_order and status <> 'paid';

  -- 会员订单：自动升 plan（ref_id 即 plan 名：standard / enterprise）
  if v_order.kind = 'membership' then
    v_plan := coalesce(p_plan, v_order.ref_id);
    if v_plan is not null then
      update public.profiles
         set plan = v_plan, plan_expire = now() + interval '1 year'
       where id = v_order.user_id;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'msg', '支付成功');
end;
$$;

grant execute on function public.complete_payment(uuid, text, text, text) to authenticated, anon;

/* ---------------- 5. 授权说明 ----------------
 * 注意：原 confirm_payment()（手动「我已支付」占位）保留不动，
 *       作为无网关时的兜底（银行转账 / 人工确认）。真实网关上线后，
 *       结算页默认走 Edge Function，手动入口收进「其他方式」。
 */
