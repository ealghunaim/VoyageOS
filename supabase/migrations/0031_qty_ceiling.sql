-- 0031: align dev's qty ceiling with prod's actual one
--
-- WHAT THIS TURNED OUT TO BE
--
-- Not a bug fix. A drift fix, pointing the opposite way to how it was first
-- written. Prod has always enforced `CHECK ((qty >= 1) AND (qty <= 99))` —
-- read from pg_constraint on 2026-08-19 — while 0001 describes 1..14 and dev,
-- built from the migration files, carried 1..14. So the migration FILES were
-- the outlier, and dev inherited their mistake; prod never carried 14 and was
-- never exposed.
--
-- See 0012's header for the precedent: trip_notes was created in the Supabase
-- dashboard and never given a migration, so a fresh database came up without
-- it. This is the same class — prod changed, the files did not follow — with
-- the visible symptom inverted, because here the file was stricter than the
-- database rather than absent from it.
--
-- WHY 99 IS THE RIGHT NUMBER ANYWAY
--
-- The quantity engine returns days_eff + 3 for MEDICATION and ignores whatever
-- qty the model proposed, so a 24-day trip deterministically produces 27. Prod
-- holds exactly this shape today: two rows of "Personal prescription
-- medications" at 31, one at 16. Under a 14 ceiling those inserts would have
-- failed, and because the generated list is inserted as ONE batch, a single
-- rejected row would have lost the entire list after the model call was paid
-- for. Reproduced on dev before this ran: a 24-day trip generated 34 items,
-- one of them "Blood pressure medication" at qty 27.
--
-- SAFE IN BOTH DIRECTIONS on any database. It only widens what is accepted, so
-- every existing row stays legal and code that clamps lower keeps working.
-- Applying it to prod is a no-op that makes the constraint match its own
-- definition file; nothing there depends on it.
alter table public.packing_list_items
  drop constraint if exists packing_list_items_qty_check;

alter table public.packing_list_items
  add constraint packing_list_items_qty_check
  check (qty between 1 and 99);
