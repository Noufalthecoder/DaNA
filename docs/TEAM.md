# Working on DaNA as a team of 4

The app is split into four modules. **Each person owns one folder**, so you can all work at the same time without stepping on each other.

| # | Module | Owner | Folder | What you build |
|---|---|---|---|---|
| 1 | **Couple app** | _name_ | `web/src/app/couple/` | Home, Roots, Bonds, Branches, Counsellor booking, Privacy |
| 2 | **Counsellor portal** | _name_ | `web/src/app/counsellor/` | Case queue, case view, notes, plan approval, schedule |
| 3 | **DoH dashboard** | _name_ | `web/src/app/admin/` | Programme overview, content review, audit log |
| 4 | **Platform** | _name_ | `web/src/app/shared/` + landing page | Login, data, rules engine, store, shared UI, landing page |

## Demo logins

Click **Login with UAE PASS** on the landing page (or open `/#/login`) and pick an account. UAE PASS is simulated.

| Account | Role | Sees |
|---|---|---|
| Khalid Al Mansoori | Couple | His result, the couple's plan, Sila alerts, counsellor booking, consents |
| Fatima Al Hammadi | Couple | The same journey from her side |
| Dr. Mariam Al Hosani | Counsellor | Every couple, sorted by priority (pregnant + same gene first) |
| Programme team | DoH admin | Programme numbers, faith-card approvals, the audit log |

Relatives **don't log in**. A Sila alert sends them a private link: `/#/invite`.

Everything you do in the demo is saved in the browser and written to the **audit log**. Use **Reset demo data** in the sidebar to start again.

## How the pieces connect

```
web/src/
├── Root.jsx               routes: landing · /login · /app/* · /invite
├── App.jsx                landing page (Platform)
└── app/
    ├── routes.jsx         one menu per role + which page each link opens
    ├── shared/            Platform: data.js · genetics.js · store.js · ui.jsx · Login · Shell
    ├── couple/            Couple app
    ├── counsellor/        Counsellor portal
    └── admin/             DoH dashboard
```

- **Read data** from `shared/data.js`. Don't copy it into your module.
- **Risk numbers** only come from `shared/genetics.js` (the rules engine). Never hard-code them in a page.
- **Save state** with `set(patch, 'what happened')` from `shared/store.js`. The second argument writes to the audit log.
- **Use the shared pieces** in `shared/ui.jsx` (`Page`, `Card`, `Stat`, `Badge`, `Priority`, `Toggle`, `Steps`, `Avatar`) so every screen looks the same.

## Adding a page (5 minutes)

1. Create `MyPage.jsx` in **your** module folder. Start from an existing page.
2. In `app/routes.jsx`, add one line to your role's `items` (label, icon, path).
3. In the same file, add the path to `page()`.

## Rules for working together

- **Branch per person:** `couple/…`, `counsellor/…`, `admin/…`, `platform/…`. Open a pull request into `main`.
- **Only Platform edits `shared/`.** If you need something there, ask, or open a small separate PR.
- **`routes.jsx` is shared:** keep your edits to your own role's block to avoid merge conflicts.
- **Before you push:** `cd web && npm run build` must pass.
- **Keep it simple:** one idea per screen, plain words, no medical jargon. DaNA explains; it never diagnoses or tells anyone whom to marry.

## Suggested next tasks

| Module | Next up |
|---|---|
| Couple app | Arabic version of every page; "Ask DaNA" (questions answered from approved content) |
| Counsellor portal | Video-call placeholder; filter by condition; message the couple |
| DoH dashboard | Map of screening centres; carrier rates by condition; CSV export |
| Platform | Unit tests for `genetics.js`; real UAE PASS (OIDC) and Malaffi (FHIR) adapters behind the same functions |
