-- 0029 — Scale: index + rate-limit cleanup (WP-F5)

-- (1) purchases.package_id is a foreign key joined by every entitlement check
-- (getActivePackages and the exam_papers / questions RLS policies) but had no
-- index — only (user_id, expires_at) existed. Add it.
create index if not exists purchases_package_id_idx on purchases (package_id);

-- (2) rate_limits grows forever — increment_rate_limit only resets the window,
-- it never deletes rows. Add a cleanup function and (where pg_cron is enabled)
-- schedule it hourly. If pg_cron is NOT enabled on this project, the function
-- still exists — enable the extension and run the schedule below, or invoke
-- `select public.cleanup_rate_limits();` from any scheduled job.
create or replace function public.cleanup_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from rate_limits where window_start < now() - interval '1 day';
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'cleanup-rate-limits') then
      perform cron.unschedule('cleanup-rate-limits');
    end if;
    perform cron.schedule(
      'cleanup-rate-limits',
      '0 * * * *',
      'select public.cleanup_rate_limits()'
    );
  end if;
end $$;
