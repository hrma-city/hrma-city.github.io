/* ==========================================================================
 * SUPABASE-支付-人工核销.sql
 * --------------------------------------------------------------------------
 * 目的：大额订单（金额 > 500 元）走「人工确认」，不立即开通权益，
 *       防止「微信/支付宝转账后 2 小时内撤回」导致白嫖会员。
 *
 * 改动：
 *   1. confirm_payment() 增加金额阈值分流
 *        · 金额 > 500 → status = 'pending_review'（不开通权益）
 *        · 金额 ≤ 500 → 原逻辑（直接 paid + 开通）
 *   2. 新增 approve_payment(p_order)（仅管理员可调用）
 *        · 将 pending_review → paid，并开通会员权益
 *
 * 幂等：create or replace；可重复执行。
 * ========================================================================== */

-- 阈值常量：金额（元）超过此值走人工确认
-- 2026-09-10 数值口径：标准会员 299 / 企业版 1999，500 恰好分隔两档。

create or replace function public.confirm_payment(p_order uuid, p_plan text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_uid   uuid := auth.uid();
  REVIEW_THRESHOLD numeric := 500;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'msg', '未登录');
  end if;

  select * into v_order
  from public.orders
  where id = p_order and user_id = v_uid
  for update;

  if v_order is null then
    return jsonb_build_object('ok', false, 'msg', '订单不存在');
  end if;
  if v_order.status = 'paid' then
    return jsonb_build_object('ok', true, 'msg', '已支付');
  end if;

  -- 大额：进入人工确认，不立即开通权益（防转账撤回白嫖）
  if v_order.amount > REVIEW_THRESHOLD then
    update public.orders set status = 'pending_review', paid_at = null where id = p_order;
    return jsonb_build_object('ok', true, 'status', 'pending_review', 'msg', '已提交，等待人工确认');
  end if;

  update public.orders set status = 'paid', paid_at = now() where id = p_order;

  if v_order.kind = 'membership' and p_plan is not null then
    update public.profiles set plan = p_plan, plan_expire = now() + interval '1 year'
    where id = v_uid;
  end if;

  return jsonb_build_object('ok', true, 'msg', '支付成功');
end;
$$;

grant execute on function public.confirm_payment(uuid, text) to authenticated;

/* ---------------- 管理员人工核销 ---------------- */
create or replace function public.approve_payment(p_order uuid, p_plan text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  admin_emails text[] := array['rm-community@qq.com','3984557428@qq.com'];
  v_email text := auth.jwt() ->> 'email';
begin
  if v_email is null or not (v_email = any(admin_emails)) then
    return jsonb_build_object('ok', false, 'msg', '无权限');
  end if;

  select * into v_order from public.orders where id = p_order for update;

  if v_order is null then
    return jsonb_build_object('ok', false, 'msg', '订单不存在');
  end if;
  if v_order.status = 'paid' then
    return jsonb_build_object('ok', true, 'msg', '已是已支付');
  end if;
  if v_order.status <> 'pending_review' then
    return jsonb_build_object('ok', false, 'msg', '仅待确认订单可核销');
  end if;

  update public.orders set status = 'paid', paid_at = now() where id = p_order;

  -- 会员订单：开通权益（plan 取传入值，缺省用订单 ref_id）
  if v_order.kind = 'membership' then
    update public.profiles set plan = coalesce(p_plan, v_order.ref_id), plan_expire = now() + interval '1 year'
    where id = v_order.user_id;
  end if;

  return jsonb_build_object('ok', true, 'msg', '已核销并开通');
end;
$$;

grant execute on function public.approve_payment(uuid, text) to authenticated;
