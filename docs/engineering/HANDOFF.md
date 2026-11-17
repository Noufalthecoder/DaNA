# DaNA: developer handoff (workflow)

Where we stopped and how to carry on. Background reading: `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md` in this folder.

Last updated: 17 Nov 2026. Branch of record: `main`.

## 1. The product in one line

A premarital genetic screening companion for UAE couples: understand the result (Roots), decide together with a plan (Bonds), protect the family (Branches). Risk numbers come from a deterministic rules engine, never AI.

## 2. The user workflow (what the app does, in order)

1. **Landing page**: scroll story of the couple's journey, then "Login with UAE PASS".
2. **Set-up**: UAE PASS sign-in, home location, consent, a few details, Malaffi record fetch.
3. **Result**: plain-language explanation in English, Arabic or Urdu, then a 3-question understanding check.
4. **Connect**: partner shares their DaNA ID, the other sends a request, a notification appears, the partner accepts.
5. **Bonds**: combined risk, every option side by side, downloadable couple report.
6. **Counsellor**: the couple books the nearest clinic slot, the counsellor reviews the report, accepts the request and sets a care plan.
7. **Personal Tracker**: seven stages through planning, pregnancy and the newborn.
8. **Guide and languages**: the DaNA guide answers in English and Arabic voice; the whole app switches between English, Arabic and Urdu.
9. **DoH admin**: outcome metrics, account directory and suspension, counsellors and areas, audit log.

## 3. Where the code is

| Area | Folder |
|---|---|
| Couple app | `web/src/app/couple/` |
| Counsellor portal | `web/src/app/counsellor/` |
| DoH admin | `web/src/app/admin/` |
| Shared (login, data layer, store, rules, UI) | `web/src/app/shared/` |
| Onboarding | `web/src/app/onboarding/` |
| API (Malaffi import, rules, voice, places) | `api/app/` |
| Database (numbered SQL, run in order) | `supabase/` |
| Tests | `test/`, `api/tests/` |
| Demo video recorder | `demo/` |

## 4. How we work

1. Pull `main`, then make a branch for the task (`Karthi/<task>`).
2. Build the change in the folder that owns it. Access rules belong in the database (row-level security and functions), never only in hiding a button.
3. Add or update tests. Before pushing run `cd web && npm test && npx vite build` (and `cd api && pytest` if the API changed).
4. Database changes go in a new numbered file in `supabase/`, written so it is safe to re-run, and covered by `test/location_scope.test.mjs`.
5. One-line commit messages. Do not rewrite or force-push anyone else's history.
6. Merge to `main` only when the owner agrees.

Database traps: some numbers are used twice (`021`, `029`, `031`, `035`). Re-running `021` after `030` breaks booking, so run `037` after it. `036` replaces `in_admin_scope()` from 031, so run it again after re-running 030 or 031.

## 5. Where we stopped: next steps in order

1. **Merge `Karthi/demo-full` into `main`.** It contains `supabase/037_fix_consultation_booking.sql` (already applied to the live database but missing from `main`), the `SlotFinder.jsx` fix that shows booking errors instead of hiding them, the one-take demo recorder `demo/full.py`, and tests for migrations 035 to 037.
2. **Show the "Daily request limit reached" error in Connections.** Today Send does nothing visible once a sender passes 10 requests in 24 hours. Show the message the way `SlotFinder.jsx` does.
3. **Finish the care plan tracker.** Stages 4 to 7 still hold dummy data. Rule: stages 5 to 7 update only after the family planning pathway (stage 4) is updated. The unfinished work is in a local stash on `care-plan-tracker` ("stages 4-7 dummy data removal (paused)"); ask its owner to push it as a branch.
4. **Check the DaNA ID shown in the admin directory** against live data (it must equal `'DANA-' || upper(substr(person_id, 3, 6))`).
5. **Add trends to the metrics dashboard.** `admin_metrics()` returns totals only, so the charts have no history. Add week-by-week figures to that function if wanted.
6. **Language review.** Arabic and Urdu wording (`shared/i18n_dict.js`, `shared/explain.js`) and the clinical explanations are drafts awaiting native-speaker and genetics review.

## 6. After that (production path)

Real UAE PASS and Malaffi in place of the simulated adapters, ClinVar/ClinGen re-checks, Sahatna integration, a safety documentation pack, then the Azure migration in three phases (Part I of `docs/DaNA_PROJECT_BRIEF.md`).

## 7. Keep honest in any copy

Synthetic data only. UAE PASS and Malaffi are simulated. The guide is rule-based, not AI. DaNA supports and explains; it does not diagnose.
