# VoyageOS — v0.5 starter

Scaffold generated from the Master Design Document (keep the PDF next to this repo).
Everything here implements the **solo addendum's v0.5 cut**: the trusted list.

## What's already real (tested)
- `api/packing/quantity_engine.py` — deterministic quantities (Part 2 §3). **The model never controls counts.**
- `api/notifications/governor.py` — fatigue governor (F3.3): budgets, arbitration, cooldowns, quiet hours, safety bypass.
- `api/timeline/rules.py` — the default rule set (Part 3 §2) as versioned data.
- `supabase/migrations/0001_v05_core.sql` — full v0.5 schema with RLS, including the moat table `item_events`.
- `content/bundles/business.json` — first trip-type bundle (Part 7 format).
- Run tests: `python -m pytest api/tests` (23 passing).

## Accounts you need to create (nobody can do these for you)
1. **Supabase** project → copy URL + service key into `.env` (see `api/core/config.py`).
2. **LLM provider** API key (any — the gateway is provider-agnostic; set model IDs in `.env`).
3. **Render** (or any host) — needed at deploy time, not day one.
4. Later (store release): Apple Developer + Google Play accounts; **RevenueCat**; weather API.

## Local dev
```
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload          # http://localhost:8000/health
supabase init && supabase start        # local Postgres
supabase db push                       # applies migrations/0001
```

## v0.5 build order (addendum §2 · ~10–12 focused weeks)
| Wk | Build | Doc ref |
|---|---|---|
| 1–2 | ✅ this scaffold · item catalog seed (~150) · trip CRUD endpoints | P2 §3, P9 §1 |
| 3–5 | Generation pipeline: context builder → gateway → validator → **quantity engine** → merge · packing endpoints | P2 §1, §4 |
| 5–6 | Expo app: wizard, packing screen, provenance sheet | P2 §2 |
| 6–7 | Timeline materializer + notification worker (APScheduler) + **governor** wired · push tokens | P3 §3–5 |
| 8 | Gear profiles + 3 bundles · generic bag weight | P2 §5–6, P7 |
| 9 | Debrief → `item_events` · history flags in generation | P2 §7 |
| 10 | Expiry-only vault + alerts · polish · **dogfood on a real trip** | P4 §3 |

## Non-negotiables carried from the doc
Law 2 (AI suggests, code verifies) · Law 5 (never invent regulations) · governor before any push ships ·
Class C never in prompts/logs/analytics · `item_events` written from the first release.
# VoyageOS
