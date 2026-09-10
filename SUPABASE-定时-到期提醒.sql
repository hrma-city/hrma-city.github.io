-- ============================================================================
-- 定时任务：每天扫描会员到期并生成通知/排队邮件
-- 说明：pg_cron 使用 UTC 时间。'0 1 * * *' = 北京时间每天 09:00
-- ============================================================================

create extension if not exists pg_cron;

do $$
declare j record;
begin
  for j in select jobid from cron.job where jobname = 'rmc-expiry-reminder' loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;

select cron.schedule(
  'rmc-expiry-reminder',
  '0 1 * * *',
  $$select public.dispatch_expiry_reminders(7);$$
);
