-- 0032: trips.locked_at — a closed-out trip is a record, not a workspace
--
-- Its own column, deliberately NOT another value in trips.status.
--
-- status already answers "did the traveller debrief" (it becomes 'completed'
-- there and nowhere else). Whether a trip accepts edits is a different
-- question with a different lifecycle: a trip can be closed out without a
-- debrief, and — since 9d079a8 — debriefed and then reopened without the
-- debrief being undone. One column cannot hold two facts that come apart.
--
-- status also allows 'archived', which is unused and looks exactly like a lock
-- state. Adopting it would have been cheaper and wrong for the same reason.
--
-- A TIMESTAMP RATHER THAN A BOOLEAN. Null is "open" and any value is "closed",
-- so it is a boolean when read as one — but it also records WHEN, which the UI
-- shows ("Closed out 14 Aug") and which survives unlock-and-relock as the most
-- recent close-out. A boolean would need a second column to say the same thing.
--
-- NOT SET BY THIS MIGRATION. Every existing trip stays open, including trips
-- long finished. Retroactively locking somebody's history would refuse edits
-- they never asked to be refused, and the lock is meant to be a deliberate act
-- by the owner — automatic locking was considered and rejected outright:
-- a trip ends Sunday, the traveller ticks off what they packed on Tuesday, and
-- debriefs on Wednesday. Locking on the end date breaks that sequence for the
-- diligent traveller specifically.
--
-- ADDITIVE AND SAFE IN BOTH DIRECTIONS. Nullable with no default, so code that
-- does not know about it is unaffected, and a database that has the column
-- behaves identically until something writes to it.
alter table public.trips
  add column if not exists locked_at timestamptz;

-- Finished-but-open trips are what the Home tab and the lock UI both scan for.
create index if not exists trips_owner_locked
  on public.trips (owner_id, locked_at);
