-- 0027 · drop the leftover uniqueness on token
--
-- 0026 moved the primary key to (user_id, device_id) and kept a unique index
-- on token, reasoning that a token identifies exactly one device in Expo's
-- system so two rows sharing one must be a bug. That was wrong, and the drill
-- caught it: registering a token that has moved between installs fails with
--
--   duplicate key value violates unique constraint "device_tokens_token_key"
--
-- because registration upserts the new row before sweeping the old one away.
-- The old row still holds that token for the moment the insert happens.
--
-- The deeper problem is that it was a second, competing identity. The model
-- says a row is identified by (user_id, device_id); a global unique on token
-- says rows are identified by token. Two answers to "what makes a row unique"
-- is one too many, and this is the one that does not match how the table is
-- written to.
--
-- Dropping it also allows one token under two users, which is correct rather
-- than merely tolerable: two accounts signed in on one family phone should
-- both be reachable there. The pruning path deletes by token across all rows,
-- which is right for the same reason — when a device is gone it is gone for
-- everyone on it.
--
-- Reordering registration to sweep before upserting would also have fixed the
-- drill while keeping the index. Not taken: it preserves the competing
-- identity and only works while that exact ordering holds.
--
-- The name is looked up, not assumed, and both forms are handled — 0026
-- created an index rather than a table constraint, and Postgres reports index
-- violations as "unique constraint", so the message does not say which it is.
-- 0018 assumed a generated name, altered nothing, and reported success.
--
-- Additive in effect: it only removes a restriction, so no code needs to
-- change first and nothing that works today stops working.
--
-- attname is of type `name`, not `text`. Comparing array_agg(attname) against
-- array['token'] fails with "operator does not exist: name[] = text[]", so the
-- cast below is load-bearing rather than cosmetic.
--
-- Safe to re-run.

do $$
declare r record; found int := 0;
begin
  for r in
    select c.relname as index_name, con.conname as constraint_name
      from pg_index i
      join pg_class c on c.oid = i.indexrelid
      join pg_class t on t.oid = i.indrelid
      join pg_namespace n on n.oid = t.relnamespace
      left join pg_constraint con on con.conindid = i.indexrelid
     where n.nspname = 'public'
       and t.relname = 'device_tokens'
       and i.indisunique
       and not i.indisprimary
       and (select array_agg(a.attname::text order by a.attnum)
              from pg_attribute a
             where a.attrelid = t.oid and a.attnum = any (i.indkey)) = array['token']
  loop
    found := found + 1;
    if r.constraint_name is not null then
      raise notice 'dropping unique constraint on token: %', r.constraint_name;
      execute format('alter table public.device_tokens drop constraint %I',
                     r.constraint_name);
    else
      raise notice 'dropping unique index on token: %', r.index_name;
      execute format('drop index public.%I', r.index_name);
    end if;
  end loop;

  if found = 0 then
    raise notice 'no unique-on-token index or constraint found — already dropped';
  end if;
end $$;

-- Kept as a plain index. Uniqueness was wrong; the lookup was not — pruning
-- deletes by token on every dead-token report and wants this.
create index if not exists device_tokens_token_idx
  on public.device_tokens (token);

-- ── verification ─────────────────────────────────────────────────────────
--
-- Expect: unique_on_token = 0, plain_index_on_token = 1,
-- pk_columns = 'user_id,device_id'. The primary key must be untouched — this
-- migration removes a restriction and adds nothing to the identity.

select
  (select count(*) from pg_index i
     join pg_class c on c.oid = i.indrelid
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relname='device_tokens'
      and i.indisunique and not i.indisprimary
      and (select array_agg(a.attname::text order by a.attnum)
             from pg_attribute a
            where a.attrelid=c.oid and a.attnum = any(i.indkey)) = array['token'])
                                                                   as unique_on_token,
  (select count(*) from pg_indexes
    where schemaname='public' and tablename='device_tokens'
      and indexname='device_tokens_token_idx')                     as plain_index_on_token,
  (select string_agg(a.attname::text, ',' order by a.attnum)
     from pg_index i
     join pg_class c on c.oid = i.indrelid
     join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey)
    where c.relname='device_tokens' and i.indisprimary)            as pk_columns;
