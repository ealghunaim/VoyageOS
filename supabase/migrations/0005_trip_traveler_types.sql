-- 0005: trip traveler types (party composition)  — applied 2026-07-30
-- Multi-select party for a trip: any of solo/partner/adults/teens/elderly/kids.
-- Play rates each activity for exactly these cohorts. `with_kids` stays derived
-- (true when 'kids' is present) so existing gating keeps working.
-- Nullable + default '[]' so old inserts and null payloads are both fine.
--
-- IMPORTANT: run this in the Supabase SQL editor BEFORE deploying the backend
-- that sends this field (PostgREST rejects inserts with unknown columns).
alter table public.trips
  add column if not exists traveler_types jsonb default '[]'::jsonb;
