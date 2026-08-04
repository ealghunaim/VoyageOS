-- 0023 · claimable notification rows
--
-- The worker used to select pending rows and then send them. Render runs the
-- old and new instance together during a deploy and both carry the 60-second
-- tick, so both could read the same rows and both deliver. idem_key is unique
-- on the row, which prevents duplicate rows — not duplicate sends.
--
-- The fix is a claim: an update filtered on status='pending' that returns only
-- the rows it actually changed, so each row is won exactly once. That needs a
-- 'claimed' status and a claimed_at to reap abandoned claims with.
--
-- Additive: nothing is dropped, no existing row changes, and the running code
-- neither writes nor reads either of these until it deploys. Normal order —
-- this goes to prod BEFORE the code that uses it.
--
-- Safe to re-run.

alter table public.notification_schedule
  add column if not exists claimed_at timestamptz;

-- ── the status CHECK ─────────────────────────────────────────────────────
--
-- 0001 declared this constraint inline and unnamed, so Postgres generated the
-- name. Assuming what it generated is how 0018 quietly failed to widen
-- documents_type_check: the ALTER named a constraint that did not exist, and
-- nothing complained. So this looks the name up instead of guessing it, drops
-- whatever it finds guarding status, and adds a named one in its place.
--
-- The NOTICE lines are the point of the exercise — they say what was actually
-- found and dropped, rather than leaving you to trust that it matched.

do $$
declare
  c record;
  found int := 0;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'notification_schedule'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    raise notice 'dropping status constraint: %', c.conname;
    execute format('alter table public.notification_schedule drop constraint %I',
                   c.conname);
    found := found + 1;
  end loop;

  if found = 0 then
    raise notice 'no existing status constraint found — adding a fresh one';
  end if;
end $$;

alter table public.notification_schedule
  add constraint notification_schedule_status_check
  check (status in ('pending','claimed','sent','actioned','dismissed',
                    'suppressed','digested','failed','cancelled'));

-- Claims are looked up by status and age; the existing partial index covers
-- pending only, so reaping would otherwise scan.
create index if not exists notification_schedule_claimed_at_idx
  on public.notification_schedule (claimed_at)
  where status = 'claimed';

-- ── verification ─────────────────────────────────────────────────────────
--
-- Expect: claimed_at_column = 1, status_constraints = 1, claimed_allowed = t,
-- and stuck_claims = 0 (nothing should be mid-claim while you run this).

select
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='notification_schedule'
       and column_name='claimed_at')                        as claimed_at_column,
  (select count(*) from pg_constraint con
     join pg_class rel on rel.oid = con.conrelid
     join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname='public' and rel.relname='notification_schedule'
      and con.contype='c'
      and pg_get_constraintdef(con.oid) ilike '%status%')    as status_constraints,
  (select pg_get_constraintdef(con.oid) ilike '%claimed%'
     from pg_constraint con
     join pg_class rel on rel.oid = con.conrelid
     join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname='public' and rel.relname='notification_schedule'
      and con.contype='c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
    limit 1)                                                as claimed_allowed,
  (select count(*) from public.notification_schedule
     where status='claimed')                                as stuck_claims;
