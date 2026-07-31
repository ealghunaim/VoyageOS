-- 0013: food_tips (traveler-contributed restaurant tips)  — documented 2026-07-31
-- Backfill only. Created in the Supabase dashboard and never given a migration,
-- so a fresh database came up without it and the Guide screen's Eat tab
-- (listFoodTips) failed. Shape read back from the live database.
-- Idempotent: no-ops against prod.
--
-- user_id deliberately has NO foreign key — that matches prod. Do not add one.
--
-- Unlike every other table here these rows are NOT trip-scoped: tips are keyed
-- by place_name and shown to every traveler heading to that place, which is why
-- the SELECT policy is `using (true)` while writes and deletes stay owner-only.
--
-- id, created_at, and photos carry defaults because api/tips/router.py inserts
-- only {user_id, place_name, country_code, restaurant, note, order_rec,
-- when_rec} — it never sends id, created_at, or photos.
create table if not exists public.food_tips (
  id           uuid        primary key default uuid_generate_v4(),
  user_id      uuid        not null,
  place_name   text        not null,
  country_code text,
  restaurant   text        not null,
  note         text        not null default '',
  order_rec    text        not null default '',
  when_rec     text        not null default '',
  created_at   timestamptz not null default now(),
  photos       jsonb       default '[]'::jsonb
);

-- Functional index on lower(place_name) — case-insensitive place lookup.
-- Not constraint-backed, so unlike the other tables' indexes it must be
-- declared explicitly; nothing creates it implicitly.
create index if not exists food_tips_place_idx on public.food_tips (lower(place_name));

alter table public.food_tips enable row level security;

drop policy if exists "tips are public to travelers" on public.food_tips;
create policy "tips are public to travelers" on public.food_tips for select
  using (true);

drop policy if exists "own tips write" on public.food_tips;
create policy "own tips write" on public.food_tips for insert
  with check (user_id = auth.uid());

drop policy if exists "own tips delete" on public.food_tips;
create policy "own tips delete" on public.food_tips for delete
  using (user_id = auth.uid());
