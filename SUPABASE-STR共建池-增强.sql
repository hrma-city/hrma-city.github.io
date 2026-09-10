-- ============================================================
-- RMC · STR 共建池增强
-- 1) str_benchmark_flex：三级降级基准，让早期样本不足也有参照
-- 2) str_coverage：池子覆盖情况，引导大家补齐空白城市/档次
-- 隐私：任何层级样本 < 3 都不返回聚合值（k-匿名）
-- ============================================================

create or replace function public.str_benchmark_flex(
  p_city    text,
  p_segment text,
  p_month   date
) returns table (
  match_level  text,
  sample_count int,
  occ          numeric,
  adr          numeric,
  revpar       numeric
) language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_count int; v_occ numeric; v_adr numeric; v_revpar numeric;
begin
  -- 级别 1（精确）：同城 + 同档次 + 同月
  select count(*)::int, avg(s.occ), avg(s.adr), avg(s.revpar)
    into v_count, v_occ, v_adr, v_revpar
  from public.str_samples s
  where s.city = p_city
    and s.segment = p_segment
    and date_trunc('month', s.month) = date_trunc('month', p_month)
    and s.status <> 'rejected';

  if coalesce(v_count, 0) >= 3 then
    return query select 'exact'::text, v_count,
      round(v_occ, 1), round(v_adr, 2), round(v_revpar, 2);
    return;
  end if;

  -- 级别 2（放宽时间）：同城 + 同档次 + 近 12 个月
  select count(*)::int, avg(s.occ), avg(s.adr), avg(s.revpar)
    into v_count, v_occ, v_adr, v_revpar
  from public.str_samples s
  where s.city = p_city
    and s.segment = p_segment
    and s.month >= (date_trunc('month', p_month) - interval '11 months')
    and s.month <= date_trunc('month', p_month)
    and s.status <> 'rejected';

  if coalesce(v_count, 0) >= 3 then
    return query select 'city_segment_12m'::text, v_count,
      round(v_occ, 1), round(v_adr, 2), round(v_revpar, 2);
    return;
  end if;

  -- 级别 3（放宽档次）：同城 + 全部档次 + 近 12 个月
  select count(*)::int, avg(s.occ), avg(s.adr), avg(s.revpar)
    into v_count, v_occ, v_adr, v_revpar
  from public.str_samples s
  where s.city = p_city
    and s.month >= (date_trunc('month', p_month) - interval '11 months')
    and s.month <= date_trunc('month', p_month)
    and s.status <> 'rejected';

  if coalesce(v_count, 0) >= 3 then
    return query select 'city_all_12m'::text, v_count,
      round(v_occ, 1), round(v_adr, 2), round(v_revpar, 2);
    return;
  end if;

  -- 样本不足：只回样本数，不回聚合值
  return query select 'insufficient'::text, coalesce(v_count, 0),
    null::numeric, null::numeric, null::numeric;
end;
$$;

grant execute on function public.str_benchmark_flex(text, text, date) to anon, authenticated;

-- ------------------------------------------------------------
-- 池子覆盖：按「城市 × 档次」统计，用于引导补齐空白
-- 只返回聚合计数，不返回任何单店数据或提交人
-- ------------------------------------------------------------
create or replace function public.str_coverage()
returns table (
  city         text,
  segment      text,
  sample_count int,
  hotel_count  int,
  latest_month date
) language sql
  security definer
  set search_path = public
as $$
  select s.city, s.segment, count(*)::int, count(distinct s.user_id)::int, max(s.month)
  from public.str_samples s
  where s.status <> 'rejected'
  group by s.city, s.segment
  order by count(*) desc, s.city, s.segment;
$$;

grant execute on function public.str_coverage() to anon, authenticated;
