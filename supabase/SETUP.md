# Setting up the DaNA database (Supabase)

About 15 minutes. You need a free account at [supabase.com](https://supabase.com).

## 1. Create the project

1. **New project**. Name: `dana`.
2. **Database password:** generate one and save it in your password manager. Never put it in the code.
3. **Region:** pick the closest one available (for example Mumbai or Frankfurt). The prototype uses synthetic data only; a real pilot moves to Azure PostgreSQL in a UAE region.
4. Wait about 2 minutes for it to start.

## 2. Create the 4 demo logins

**Authentication → Users → Add user → Create new user.** Tick **Auto Confirm User** for each one.

| Email | Password |
|---|---|
| `khalid@dana.demo` | choose one, share it with the team privately |
| `fatima@dana.demo` | same |
| `mariam@dana.demo` | same |
| `doh@dana.demo` | same |

The emails must match exactly: the seed file links them to their roles.

## 3. Create the tables

**SQL Editor → New query.** Paste all of [`schema.sql`](schema.sql) → **Run**. It should say *Success. No rows returned*.

Run it **once**. Running it a second time fails on the privacy rules, which already exist.

## 4. Load the demo data

**New query** again. Paste all of [`seed.sql`](seed.sql) → **Run**.

The last line prints the 4 accounts. If you see fewer than 4, one of the emails in step 2 is misspelled: fix it and run `seed.sql` again (it's safe to re-run).

## 5. Copy the two keys the app needs

**Project Settings → API.** Copy:

- **Project URL**, like `https://abcdxyz.supabase.co`
- **anon public** key, a long string starting with `eyJ`

These two are safe to use in the browser. The privacy rules protect the data.

**Never share or commit the `service_role` key.** It bypasses every privacy rule.

## What the privacy rules guarantee (tested)

| Login | Can | Can't |
|---|---|---|
| Khalid | See his result; see Fatima's **only while she consents**; choose his couple's plan; send Sila alerts as himself | See other couples; set another couple's plan; send alerts as Fatima; read clinical notes |
| Dr. Mariam | See all couples and results shared with a counsellor; approve plans; write notes | See DoH totals |
| DoH | See programme totals and the audit log | See any individual person or result |
| Everyone | Add to the audit log as themselves | Edit or delete the audit log, or write an entry as someone else |

## 6. Connect the app

1. Copy `web/.env.example` to `web/.env.local` and paste your **Project URL** and **anon public** key. `.env.local` is git-ignored, so each teammate makes their own.
2. Restart `npm run dev`. Google, email sign-in and **Create an account** become active.

## 7. Allow new users to sign up

**SQL Editor → New query**, paste [`002_signup.sql`](002_signup.sql) → **Run**. New users always start as a couple member with nothing linked; nobody can make themselves a counsellor or admin.

**Authentication → URL Configuration:**
- **Site URL:** `http://localhost:5173`
- **Redirect URLs:** add `http://localhost:5173/**` (and your public URL later)

**Email confirmation:** Authentication → Sign In / Providers → Email. Leave **Confirm email** on for real use; turn it off while testing so sign-up logs in straight away.

## 7b. Upgrade the database (run in this order, each in a New query)

| File | What it adds |
|---|---|
| [`003_sample_journey.sql`](003_sample_journey.sql) | New Google/email users get their own sample couple and land in the full app |
| [`004_spec_v3.sql`](004_spec_v3.sql) | The full v3 schema: validated genetic reports and variants (HGVS, ClinVar, VUS), medical records (FHIR), partner consents with expiry, family tree, clinical cases with Tier 1-4 triage, counsellors, availability, assignments, referrals, Sila invitations (hashed token, 14-day expiry), note approval, and DoH analytics that hide groups under 5 |

| [`005_booking.sql`](005_booking.sql) | Booking from real counsellor availability: slots get taken and freed, appointments link to the case and counsellor, counsellors mark sessions done, emergency slots reserved for Tier 1 |
| [`006_account_email.sql`](006_account_email.sql) | Shows each user's email in `accounts` (Table Editor), kept in step with the login automatically |
| [`015_risk_benchmarks.sql`](015_risk_benchmarks.sql) | Default risk benchmarks (one male row, one female row) with a snapshot of every change, screening blood results, and a permanent record of each couple's cross-check against the exact benchmark version used. Only the admin can edit benchmarks |

All are safe to re-run. `004` ends by printing `cases_computed` (one per couple).

## 8. Turn on Google sign-in

1. [Google Cloud Console](https://console.cloud.google.com/) → create a project → **APIs & Services → OAuth consent screen**: External, app name *DaNA*, your email.
2. **Credentials → Create credentials → OAuth client ID → Web application.**
   - **Authorized redirect URI:** copy the *Callback URL* shown in Supabase under Authentication → Sign In / Providers → Google (looks like `https://<project>.supabase.co/auth/v1/callback`).
3. Copy the **Client ID** and **Client secret** into Supabase → Google provider → **Enable** → Save.

The client secret stays in Supabase only. Never put it in the code.
