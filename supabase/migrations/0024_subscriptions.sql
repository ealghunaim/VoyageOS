-- 0024 · subscriptions
--
-- Tier and the one-time premium demo trip. Additive: nothing existing is
-- touched, and the running code neither reads nor writes this table until it
-- deploys, so this goes to prod BEFORE the code that uses it.
--
-- NO ROW MEANS FREE. Nothing is created at signup; the row appears the first
-- time a trip is created. tier_for() resolves an absent row to 'free', so the
-- table only ever holds users who have paid or spent their demo.
--
-- WHY TWO COLUMNS FOR ONE DEMO TRIP
--
-- "Premium if this is your first trip" cannot work: it reads current state,
-- deletes are hard, so deleting the demo returns the count to zero and the
-- next trip is premium again — farmable indefinitely.
--
--   premium_trip_id    which trip has it. Cleared by the FK when that trip is
--                      deleted, so it never points at a row that is gone.
--   premium_trip_used  whether it was ever spent. NOTHING resets this, which
--                      is the whole point: after a delete the pointer is null
--                      but the flag stays true, so no second demo is granted.
--
-- The consequence is deliberate and needs to be said in the UI: deleting the
-- demo trip burns it. Account deletion does reset it, since the row cascades
-- with profiles — closing that needs receipt-level identity, which belongs to
-- RevenueCat in phase 1b rather than to a workaround here.

create table if not exists public.subscriptions (
  user_id                uuid primary key references public.profiles(id) on delete cascade,
  tier                   text not null default 'free',
  status                 text not null default 'active',
  -- Nullable until RevenueCat is wired in 1b; a hand-set tier has no customer.
  revenuecat_customer_id text,
  renews_at              timestamptz,
  premium_trip_id        uuid references public.trips(id) on delete set null,
  premium_trip_used      boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Named, not inline. An unnamed inline check is what 0018 tried to widen by
-- guessing the generated name, altering nothing and reporting success; 0023
-- had to look the name up from pg_constraint to undo it. Adding a tier later
-- should be a two-line migration, not an investigation.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_tier_check') then
    alter table public.subscriptions
      add constraint subscriptions_tier_check
      check (tier in ('free','explorer','traveler','voyager'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_status_check') then
    alter table public.subscriptions
      add constraint subscriptions_status_check
      check (status in ('active','grace','lapsed','cancelled'));
  end if;
end $$;

-- Read-only to the owner. There is deliberately NO insert or update policy:
-- a user who could write this row could grant themselves any tier. Every
-- write goes through the service role — the API now, the RevenueCat webhook
-- in 1b — which bypasses RLS.
alter table public.subscriptions enable row level security;
drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select using (user_id = auth.uid());

-- ── verification ─────────────────────────────────────────────────────────
--
-- Expect: table=1, tier_check=1, status_check=1, rls=t, policies=1, rows=0.
-- policies=1 matters as much as rls=t — RLS enabled with no SELECT policy
-- would hide the row from its owner, and RLS enabled with a write policy
-- would let them set their own tier.

select
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='subscriptions')            as table_present,
  (select count(*) from pg_constraint where conname='subscriptions_tier_check')   as tier_check,
  (select count(*) from pg_constraint where conname='subscriptions_status_check') as status_check,
  (select relrowsecurity from pg_class where relname='subscriptions')       as rls_enabled,
  (select count(*) from pg_policies
     where schemaname='public' and tablename='subscriptions')              as policies,
  (select count(*) from public.subscriptions)                              as rows;
