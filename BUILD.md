# Building VoyageOS

## Ship v1.1 from the tag, not from main

**The v1.1 ship afternoon builds from `v1.1-rc`, not from `main`.** v1.2 work
proceeds on main from the moment v1.1 is tagged, so by the time the ship
afternoon happens main will contain unshipped v1.2 changes — including, by
design, a native module and a schema migration. Checking out the tag is what
makes the thing you submit the thing that was tested.

    git checkout v1.1-rc

Then follow the flip and checklist below, from the tag.

## app.json defaults to DEV, deliberately

A fresh clone points at `localhost:8000` and the dev Supabase project. That is
the safe default: a mistake costs you a build that talks to nothing, rather
than a build that talks to production users.

**Production builds REQUIRE flipping app.json to prod values first.** Nothing
enforces this — EAS uploads whatever is in your working directory — so it is a
step you have to take, not one you can rely on being taken for you.

Both value sets live in `~/.config/voyageos/app-extra-record.json` (mode 600,
outside the repo). Only three fields change between environments:

    apiUrl
    supabaseUrl
    supabaseAnonKey

**Change only those three.** `scheme`, `appKey`, `revenueCatIosKey` and `eas`
are environment-independent and must survive the flip. A flip that replaces the
whole `extra` block silently drops the RevenueCat key, and purchases then fail
with no error until someone taps Buy.

Verify by reading the file back, not by remembering:

    python3 -c "import json;e=json.load(open('app/app.json'))['expo']['extra'];print(e['apiUrl'],e['supabaseUrl'])"

## What is in app.json, and why it is committed

Every value in it ships inside the app binary and is extractable from an IPA.
None is a server secret; none grants data access on its own.

| field | what it is |
|---|---|
| `supabaseAnonKey` | publishable key. RLS decides what it can read. |
| `appKey` | `x-voyageos-key`, a coarse gate on the API. Real authorisation is the Supabase JWT on every route. |
| `revenueCatIosKey` | publishable Apple SDK key. Starts a purchase; cannot read or change a subscription. |
| `eas.projectId` | public project identifier. |

Server secrets — `SUPABASE_SERVICE_KEY`, `MASTER_KEK_*`, `REVENUECAT_WEBHOOK_SECRET`,
Resend's API key — live only in `.env` and the deploy environment, never here.

## Changing `scheme` requires a prebuild

`scheme` reaches the app through `Info.plist`, which is written by
**prebuild** — not by `expo run:ios`. `ios/` is generated once and reused, so
adding a scheme and rebuilding produces a build that **succeeds and installs
an app silently missing it**. Deep links then do nothing, with no error.

    npx expo prebuild --platform ios
    npx expo run:ios

Verify against the installed artifact rather than the build log:

    APP=$(xcrun simctl get_app_container <SIM_UDID> com.ealghunaim.voyageos)
    plutil -extract CFBundleURLTypes json -o - "$APP/Info.plist"

`voyageos` must appear alongside `com.ealghunaim.voyageos` and `exp+voyageos`.

## Pre-submission checklist

- [ ] `app.json` flipped to **prod** values (three fields above)
- [ ] Confirm `revenueCatIosKey`, `appKey`, `scheme` survived the flip
- [ ] `EXPO_PUBLIC_PURCHASE_HARNESS` **absent** from the `production` profile in
      `eas.json` — `api/tests/test_release_safety.py` asserts this
- [ ] `voyageos://reset-password` present in Supabase → Auth → URL
      Configuration → Redirect URLs, on **prod**
- [ ] Migrations applied to prod **before** deploying code that reads them
- [ ] Flip `app.json` back to dev afterwards

## Migrations applied to dev, still owed on prod

Run these on prod during the ship afternoon, before deploying from the tag.
Each is additive and safe to apply ahead of the code that uses it.

- **0030** `cascade_user_tables` — foreign keys so device_tokens, food_tips and
  flight_api_usage follow a deleted user out. `deletion.py` sweeps them
  explicitly either way, so this is the second belt, not the first.
- **0032** `trip_locked_at` — the trip lock's own column. Sets nothing.
- **0033** `notes_by_user` — index for the journal hub's cross-trip read.

Also owed, and NOT yet written: a migration dropping `NOT NULL` from
`notification_log.user_id`. Until it lands, half the account-deletion
pseudonymisation is inert — ai_runs is nulled, notification_log throws and is
caught. It fails safe (the row keeps its uuid, as before) but the policy is
only half in force.

## Owed with the next build

**Rotate `appKey`.** The current value has been public in this repository since
`6c46631` and the repo is public. It was always extractable from a shipped
binary, so this is a hardening step rather than an incident — but it should not
stay indefinitely.

Rotate the new value into **`app.json` and Render's `APP_SHARED_SECRET`
simultaneously**. Old TestFlight builds will 401 against prod immediately
afterwards, which is acceptable **post-approval** and disruptive before it — so
do it with a build, not between one and its review.
