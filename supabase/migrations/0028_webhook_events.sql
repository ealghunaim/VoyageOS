-- 0028 · webhook event ledger + the ordering guard
--
-- Additive. Nothing existing is read or written differently until the webhook
-- code deploys, so this goes to prod BEFORE that code — the normal ordering,
-- not the inverted one 0022/0026 needed.
--
-- WHY A LEDGER
--
-- RevenueCat retries a failed delivery up to five times with increasing delay
-- (5, 10, 20, 40, 80 minutes) and states plainly that the same event may
-- arrive more than once. Every event here changes what a user is allowed to
-- do, so "apply twice" has to be harmless. Insert the id first: a primary key
-- conflict IS the duplicate check, decided by the database rather than by a
-- read-then-write that two instances can interleave.
--
-- The handler must then answer 200 to a duplicate. A non-2xx would make
-- RevenueCat retry the thing we already did, five times, with backoff.
--
-- WHY app_user_id IS NULLABLE AND UNTYPED BY FOREIGN KEY
--
-- It is deliberately NOT `references profiles(id)`. An event can name a user
-- we cannot resolve — an anonymous RevenueCat id from a purchase made before
-- login, a test-send from the dashboard, a deleted account. Those events must
-- still be RECORDED, because recording them is what makes them debuggable and
-- what stops the retry storm. A foreign key would reject the insert, return
-- 5xx, and guarantee the retries it was meant to prevent. It is text, not
-- uuid, for the same reason: $RCAnonymousID:… is not a uuid.
--
-- WHY subscriptions GAINS last_event_ms
--
-- The ordering guard. With 80-minute backoff a stale CANCELLATION can arrive
-- AFTER a fresh RENEWAL. Applying it would revoke a paying customer, silently,
-- with no failed request anywhere to notice. So every write records the
-- event's own timestamp and any event older than the last one applied is
-- ignored. Out-of-order delivery is not hypothetical here; it is the documented
-- consequence of the retry schedule.
--
-- Safe to re-run.

create table if not exists public.webhook_events (
  -- RevenueCat's event id. PK because that is the dedup.
  event_id           text primary key,
  event_type         text,
  -- As it arrived. See above for why this is loose.
  app_user_id        text,
  -- Whose subscription we actually resolved it to, if we could.
  resolved_user_id   uuid references public.profiles(id) on delete set null,
  event_timestamp_ms bigint,
  -- What we did: applied | duplicate | unmappable | ignored_stale | unhandled
  outcome            text,
  received_at        timestamptz not null default now()
);

create index if not exists webhook_events_received_idx
  on public.webhook_events (received_at desc);

-- Answers "did this user's purchase ever reach us", which is the first
-- question asked when someone reports paying and staying free.
create index if not exists webhook_events_resolved_idx
  on public.webhook_events (resolved_user_id, received_at desc);

do $$ begin
  if not exists (select 1 from pg_constraint
                  where conname = 'webhook_events_outcome_check') then
    alter table public.webhook_events
      add constraint webhook_events_outcome_check
      check (outcome in ('applied','duplicate','unmappable','ignored_stale','unhandled'));
  end if;
end $$;

-- Service role only. There is no policy at all, which with RLS enabled means
-- no anon or authenticated request can read or write it. That is intended:
-- this table is an audit trail of money events and nothing in the app needs
-- it. Note the difference from subscriptions, which has a SELECT policy so a
-- user can read their own tier — here even that is unnecessary.
alter table public.webhook_events enable row level security;

-- The ordering guard lives on the subscription row, not in the ledger, so the
-- comparison is a column read on the row being updated rather than a lookup.
alter table public.subscriptions
  add column if not exists last_event_ms bigint;

comment on column public.subscriptions.last_event_ms is
  'event_timestamp_ms of the most recent RevenueCat event applied to this row. '
  'Events older than this are ignored — retries can deliver out of order.';

-- ── verification ─────────────────────────────────────────────────────────
--
-- Expect: table_present=1, outcome_check=1, rls_enabled=t, policies=0,
-- last_event_ms=1, rows=0.
--
-- policies=0 is asserted rather than assumed. RLS enabled with an accidental
-- permissive policy would expose the audit trail; RLS *disabled* would expose
-- it to any anon key holder. Both are silent.

select
  (select count(*) from information_schema.tables
    where table_schema='public' and table_name='webhook_events')          as table_present,
  (select count(*) from pg_constraint
    where conname='webhook_events_outcome_check')                         as outcome_check,
  (select relrowsecurity from pg_class where relname='webhook_events')    as rls_enabled,
  (select count(*) from pg_policies
    where schemaname='public' and tablename='webhook_events')             as policies,
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='subscriptions'
      and column_name='last_event_ms')                                    as last_event_ms,
  (select count(*) from public.webhook_events)                            as rows;
