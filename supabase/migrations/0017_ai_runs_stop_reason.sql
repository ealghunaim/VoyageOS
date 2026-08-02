-- 0017: record why the model stopped generating  — 2026-08-02
--
-- ai_runs logged tokens and cost but never why a call ended. That gap hid a
-- real bug: packing_generate ran against the gateway's default max_tokens of
-- 3000 and the model was cut off mid-JSON on 6 of 8 calls, so half of all
-- packing lists silently fell back to the offline template after billing for
-- two Sonnet calls. The recorded failure was a JSON parse error, which reads
-- as the model's mistake rather than our ceiling being too low.
--
-- With stop_reason stored, truncation is a query rather than an inference:
--   select task, count(*) from ai_runs where stop_reason = 'max_tokens'
--   group by task;
--
-- Nullable with no default: existing rows genuinely do not know why they
-- stopped, and backfilling them with 'end_turn' would invent data. Null here
-- honestly means "recorded before we captured this".
--
-- IMPORTANT: run in the Supabase SQL editor BEFORE deploying the backend.
-- The gateway writes this column on every model call; deploying first makes
-- every AI request 500.
alter table public.ai_runs
  add column if not exists stop_reason text;

-- truncation audits scan by reason, and the table only ever grows
create index if not exists ai_runs_stop_reason_idx
  on public.ai_runs (stop_reason)
  where stop_reason is not null;
