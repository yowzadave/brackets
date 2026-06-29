-- Schedule the `update-results` edge function to run every 5 minutes. The
-- function self-filters (eligibility + per-bracket active hours), so running it
-- unconditionally is cheap and a no-op when nothing needs syncing.
--
-- This uses pg_cron to invoke the function over HTTP via pg_net. Because the
-- function URL and the service-role key are environment-specific secrets, they
-- are read from Supabase Vault rather than hard-coded here. Before this does
-- anything, add two Vault secrets (Dashboard → Project Settings → Vault, or
-- `select vault.create_secret(...)`):
--
--   project_url        e.g. https://<project-ref>.supabase.co
--   service_role_key   the project's service_role key
--
-- The block is guarded so it is a safe no-op locally (where pg_cron/pg_net or
-- the Vault secrets may be absent) and on first deploy before the secrets exist.
-- Re-run the migration (or the cron.schedule call) after adding the secrets.

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

  perform cron.schedule(
    'update-results-every-5-min',
    '*/5 * * * *',
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

  raise notice 'update-results cron scheduled (every 5 minutes)';
end $$;
