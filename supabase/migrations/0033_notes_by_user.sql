-- 0033: read a person's journal across all their trips
--
-- 0029 indexed (trip_id, entry_date desc, created_at desc), which serves ONE
-- trip's journal — the only way it could be read until now. The hub reads the
-- other way round: everything this user wrote, newest day first, regardless of
-- trip. Without an index that leads on user_id, that is a scan of every note
-- in the table filtered afterwards.
--
-- trip_notes.user_id has no foreign key (0012, deliberately — rows are scoped
-- by RLS instead), so nothing else supplies this ordering as a side effect.
--
-- ADDITIVE. An index changes no rows and no behaviour; the only thing that
-- notices is the planner.
create index if not exists trip_notes_user_entry_date
  on public.trip_notes (user_id, entry_date desc, created_at desc);
