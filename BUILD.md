# Building VoyageOS

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

## Pre-submission checklist

- [ ] `app.json` flipped to **prod** values (three fields above)
- [ ] Confirm `revenueCatIosKey`, `appKey`, `scheme` survived the flip
- [ ] `EXPO_PUBLIC_PURCHASE_HARNESS` **absent** from the `production` profile in
      `eas.json` — `api/tests/test_release_safety.py` asserts this
- [ ] `voyageos://reset-password` present in Supabase → Auth → URL
      Configuration → Redirect URLs, on **prod**
- [ ] Migrations applied to prod **before** deploying code that reads them
- [ ] Flip `app.json` back to dev afterwards

## Owed with the next build

**Rotate `appKey`.** The current value has been public in this repository since
`6c46631` and the repo is public. It was always extractable from a shipped
binary, so this is a hardening step rather than an incident — but it should not
stay indefinitely.

Rotate the new value into **`app.json` and Render's `APP_SHARED_SECRET`
simultaneously**. Old TestFlight builds will 401 against prod immediately
afterwards, which is acceptable **post-approval** and disruptive before it — so
do it with a build, not between one and its review.
