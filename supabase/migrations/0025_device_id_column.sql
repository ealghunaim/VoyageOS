-- 0025 · device_tokens.device_id — the column, additive
--
-- First of two. This one only adds and backfills, so it is safe to run ahead
-- of any code and safe to leave in place if the second is never run. 0026
-- swaps the primary key, which is not additive and must follow the code that
-- writes this column.
--
-- WHY
--
-- device_tokens is keyed on the token. Expo issues a new token for every
-- install, so a new token has always been an extra row rather than a
-- replacement, and nothing removed the old ones. One phone accumulated a
-- stack of tokens across Expo Go and successive builds, and every reminder
-- was delivered once per token.
--
-- A token is not a device. device_id is a UUID the client generates once and
-- keeps in SecureStore, which survives app updates — the thing that was
-- actually churning. Keyed on (user_id, device_id), a new token replaces the
-- row for that device instead of adding to it.
--
-- BACKFILLED WITH THE TOKEN, NOT WIPED
--
-- Clearing the table would be tidier and would silence every existing device
-- until its owner next opened the app. Seeding device_id from the token keeps
-- today's behaviour exactly — one row per token, as now — and each device
-- collapses to a single row the first time it re-registers from a build that
-- sends a real device_id. The rows that never do are removed by the pruning
-- in notifications/push.py when Expo reports them dead.
--
-- Safe to re-run.

alter table public.device_tokens
  add column if not exists device_id text;

update public.device_tokens
   set device_id = token
 where device_id is null;

-- Only enforce not-null once nothing is null, so a re-run on a table that
-- somehow gained a null row fails loudly here rather than half-applying.
alter table public.device_tokens
  alter column device_id set not null;

-- ── verification ─────────────────────────────────────────────────────────
--
-- Expect: column=1, nulls=0, and rows == distinct_device_ids, because the
-- backfill seeds device_id from a column that is already the primary key.
-- pk_is_still_token=1 confirms 0026 has not run yet.

select
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='device_tokens'
       and column_name='device_id')                                as column_present,
  (select count(*) from public.device_tokens where device_id is null) as nulls,
  (select count(*) from public.device_tokens)                      as rows,
  (select count(distinct device_id) from public.device_tokens)     as distinct_device_ids,
  (select count(*) from pg_index i
     join pg_class c on c.oid = i.indrelid
     join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey)
    where c.relname='device_tokens' and i.indisprimary
      and a.attname='token')                                       as pk_is_still_token;
