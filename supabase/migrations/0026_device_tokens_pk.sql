-- 0026 · device_tokens keyed on the device, not the token
--
-- Second of two, and NOT additive. Run 0025 first, then deploy the code that
-- upserts on (user_id, device_id), THEN this.
--
-- CODE FIRST, LIKE 0022
--
-- The running server upserts with on_conflict="token". The moment the primary
-- key moves to (user_id, device_id) that conflict target no longer matches a
-- unique constraint, and every device registration fails until the deploy
-- lands. The usual migrate-then-deploy order is wrong here for the same
-- reason it was wrong when dropping documents.key_version: the running code
-- names something this migration takes away.
--
-- The unique index on token created below turned out to be wrong and is
-- removed by 0027: registration upserts the new row before sweeping the old
-- one, so a token moving between installs collides with itself. It also set
-- up a second identity competing with (user_id, device_id). Left here rather
-- than edited out, because this file describes what was actually applied.
--
-- Safe to re-run.

do $$
declare pk text;
begin
  -- Ordering is enforced here rather than left to whoever runs it. Without
  -- this the failure is a raw "column device_id does not exist" from inside
  -- the ADD PRIMARY KEY, which says nothing about what to do. The DO block is
  -- atomic, so a drop that has already happened rolls back with it — but that
  -- is luck, not design, and on prod the window between dropping the old key
  -- and failing is a window where nothing can register.
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'device_tokens'
       and column_name = 'device_id'
  ) then
    raise exception 'device_tokens.device_id does not exist — run 0025 first, '
                    'then deploy the code that writes it, then re-run this.';
  end if;

  select conname into pk
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
   where n.nspname = 'public' and rel.relname = 'device_tokens' and c.contype = 'p';

  if pk is null then
    raise notice 'device_tokens has no primary key — adding one';
  elsif pk = 'device_tokens_device_pkey' then
    raise notice 'already keyed on (user_id, device_id) — nothing to do';
    return;
  else
    -- Looked up rather than assumed. 0018 guessed a generated constraint name,
    -- altered nothing, and reported success.
    raise notice 'dropping primary key: %', pk;
    execute format('alter table public.device_tokens drop constraint %I', pk);
  end if;

  alter table public.device_tokens
    add constraint device_tokens_device_pkey primary key (user_id, device_id);
end $$;

create unique index if not exists device_tokens_token_key
  on public.device_tokens (token);

-- ── verification ─────────────────────────────────────────────────────────
--
-- Expect: pk_columns = 'user_id,device_id', token_unique = 1, and
-- rows == distinct_user_device, i.e. no user holds two rows for one device.

select
  (select string_agg(a.attname, ',' order by a.attnum)
     from pg_index i
     join pg_class c on c.oid = i.indrelid
     join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey)
    where c.relname='device_tokens' and i.indisprimary)            as pk_columns,
  (select count(*) from pg_indexes
    where schemaname='public' and tablename='device_tokens'
      and indexname='device_tokens_token_key')                     as token_unique,
  (select count(*) from public.device_tokens)                      as rows,
  (select count(*) from (select distinct user_id, device_id
                           from public.device_tokens) d)           as distinct_user_device;
