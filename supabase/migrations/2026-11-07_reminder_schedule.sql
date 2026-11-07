-- Runs the payment-reminder job every day at 09:00 IST (03:30 UTC).
-- Run AFTER the server with /api/cron/payment-reminders is deployed and CRON_SECRET is set on it.
--
-- Before running, store the same secret in Supabase Vault (SQL editor), replacing the value:
--   SELECT vault.create_secret('<the CRON_SECRET value>', 'cron_secret');

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('taxvault-payment-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'taxvault-payment-reminders');

SELECT cron.schedule(
  'taxvault-payment-reminders',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://egtmuxewuremxgodpjxj.supabase.co/functions/v1/api/cron/payment-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
