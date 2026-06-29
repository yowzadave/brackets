-- Throttle the `update-results` cron from every 5 minutes to every 30 minutes.
--
-- Why: at */5 the function fired 288×/day and made one tennis-API request per
-- eligible bracket per run (~576 req/day with two brackets), which exhausts the
-- RapidAPI BASIC daily quota early each day. Every call after that returns 429
-- and no winners get written. The function already self-limits API calls to each
-- tournament's active hours, so a 30-minute cadence is plenty fresh for results
-- and keeps daily usage well under the quota.
--
-- This re-uses the Vault-based, guarded pattern from
-- 20260629000100_schedule_update_results.sql so it stays portable and is a safe
-- no-op locally / before the secrets exist. It rewrites the existing job in
-- place (same jobname), so applying it just changes the schedule.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  v_url text;
  v_key text;
begin
  -- Vault may not be installed locally; tolerate its absence.
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key';
  exception when undefined_table or invalid_schema_name then
    raise notice 'update-results cron: Vault not available, skipping scheduling';
    return;
  end;

  if v_url is null or v_key is null then
    raise notice 'update-results cron: project_url / service_role_key secrets not set, skipping scheduling';
    return;
  end if;

  -- Replace any existing job so re-running this migration is idempotent.
  if exists (select 1 from cron.job where jobname = 'update-results-every-5-min') then
    perform cron.unschedule('update-results-every-5-min');
  end if;
  if exists (select 1 from cron.job where jobname = 'update-results-every-30-min') then
    perform cron.unschedule('update-results-every-30-min');
  end if;

  perform cron.schedule(
    'update-results-every-30-min',
    '*/30 * * * *',
    format(
      $cron$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || %L
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
      );
      $cron$,
      v_url || '/functions/v1/update-results',
      v_key
    )
  );

  raise notice 'update-results cron scheduled (every 30 minutes)';
end $$;
