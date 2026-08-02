-- 0016: traveler findings beyond restaurants  — 2026-08-02
-- food_tips already carries place-scoped, traveler-posted finds; this opens it
-- to the other guide sections so a traveler can post a viewpoint, an
-- experience or a transit trick, not only a restaurant.
--
-- Deliberately a column on the existing table rather than a new one: the
-- photo upload, RLS policies and place-scoping are all already correct here,
-- and every existing row is genuinely an 'eat' find, so the default backfills
-- them truthfully.
--
-- The `restaurant` column now holds the subject of the find whatever the
-- category is. Left unrenamed on purpose — renaming a live column to
-- `subject` would break the running backend the moment this is applied, and
-- the API already exposes it under a neutral name.
--
-- IMPORTANT: run in the Supabase SQL editor BEFORE deploying the backend.
alter table public.food_tips
  add column if not exists category text not null default 'eat'
    check (category in ('eat', 'play', 'visit', 'go'));

-- lookups are always (place, category), so index the pair
create index if not exists food_tips_place_category_idx
  on public.food_tips (lower(place_name), category);
