-- 0029: trip_notes.entry_date — the day an entry is ABOUT
--
-- Until now a journal entry carried only created_at, the moment it was typed,
-- and the screen showed that. For anyone who writes in the evening about the
-- morning, or writes the whole trip up on the flight home, every entry lands
-- on one date and the log stops being a record of the trip.
--
-- created_at stays exactly as it is and keeps meaning "when this was written".
-- entry_date is the separate, editable question: which day is this about.
--
-- ADDITIVE AND SAFE IN BOTH DIRECTIONS. The default means code that does not
-- yet know about this column keeps inserting successfully, so this can be
-- applied to prod before the backend that writes it deploys.
alter table public.trip_notes
  add column if not exists entry_date date not null default current_date;

-- Existing rows are dated by when they were written, which is the best
-- available answer and usually the right one — the gap only opens for entries
-- written well after the fact, and nothing in the old data distinguishes those.
--
-- UTC, not a local zone: created_at is timestamptz and the writer's zone was
-- never recorded, so any other choice would be a guess wearing a suit. Entries
-- written near midnight may land a day off; that is visible and editable now,
-- which it was not before.
update public.trip_notes
   set entry_date = (created_at at time zone 'utc')::date
 where entry_date = current_date
   and created_at < current_date;

create index if not exists trip_notes_trip_entry_date
  on public.trip_notes (trip_id, entry_date desc, created_at desc);
