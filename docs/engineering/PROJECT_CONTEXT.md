# DaNA — Engineering Project Context

## 1. Platform Identity & Healthcare Mission

**DaNA** (*Know Your Roots. Protect Your Future* · *اعرف جذورك… واحمِ مستقبلك*) is a healthcare-oriented premarital genetic screening, clinical counselling, and family-health awareness platform designed for the United Arab Emirates.

* **Strategic Context:** Built for the **Future Health Digital Innovation Challenge 2026** (Fertility Theme, Statement 3: *Understanding and Reducing Inherited Disease Risk*).
* **Clinical Backdrop:** Abu Dhabi mandates premarital genetic screening covering 570 genes since October 2024. Pilot cohorts show that ~1 in 10 couples carry at least one shared or high-risk recessive/X-linked variant.
* **National Policy Alignment:** Balances the prevention of inherited severe genetic disorders with the UAE National Family Growth Agenda 2031 and Year of Family 2026. DaNA reframes clinical outcomes from prohibitive ("incompatible") to empowered ("**Compatible, with a plan**").

---

## 2. The Three Product Pillars

| Pillar | Name | Clinical & Family Purpose | Primary Workflow |
| :--- | :--- | :--- | :--- |
| **🌱 1** | **ROOTS** · الجذور | Individual genetic understanding & family history | Individual screening report, deterministic carrier explanation, residual risk interpretation, personal health recommendations. |
| **🤝 2** | **BONDS** · الروابط | Premarital & married partner genetic assessment | Two-way partner connection, mutual granular consent, deterministic Mendelian risk evaluation, reproductive options (PGT-M/IVF, prenatal testing), human counsellor booking. |
| **🌳 3** | **BRANCHES** · الفروع | Family awareness & cascade screening | Private pearl family tree, voluntary cascade screening, anonymous privacy-preserving **Sila alerts** (*صلة الرحم*) notifying at-risk relatives without disclosing medical records or diagnoses. |

---

## 3. Actual Repository Technology Stack & Status

> [!IMPORTANT]
> **Ground Truth Verification (as of November 2026):**
> Do not assume undocumented services or technologies. The repository currently consists of:

* **Frontend Engine:** React 18.3.1 with Vite 6.0.7 build toolchain (`web/`).
* **Motion & Interactivity:** Framer Motion 11.15.0, Lenis 1.1.20 smooth scroll, Three.js 3D landing assets.
* **Styling & Design System:** Custom CSS design system with CSS custom properties (`web/src/app/app.css` & `web/src/styles.css`). Neutral stone palette (`#F6F7F5`), UAE Green (`#00843D`), UAE Red (`#CE1126`), amber warnings (`#B26A00`).
* **Client-Side Routing:** Hash router (`web/src/app/shared/router.js` & `Root.jsx`) supporting `/#/`, `/#/login`, `/#/app/*`, `/#/invite`.
* **State Management:** Reactive external store (`useSyncExternalStore`) in `web/src/app/shared/store.js` persisted to browser `localStorage` (`dana-demo-v1`) with append-only audit trail.
* **Database & Schema:**
  - Production PostgreSQL schema designed and maintained in `database/schema.sql`.
  - Client prototype powered by synthetic clinical dataset (`web/src/app/shared/data.js`) adhering to the principle: *"Swap, don't rebuild. UAE PASS, Malaffi and SMS sit behind adapters: mocked now, real in a pilot."*
* **Genetics Engine:** Deterministic rule-based assessment engine in `web/src/app/shared/genetics.js` calculating condition risks (AR, XL) and clinical triage priority (`urgent`, `high`, `low`, `routine`).
* **Connections & Privacy Engine:** Implemented in `web/src/app/shared/connectionsService.js` with full test coverage in `test/connectionsService.test.mjs`.

---

## 4. Four-Developer Module Division & File Ownership

The repository follows the modular ownership structure defined in `docs/TEAM.md`:

```
web/src/
├── Root.jsx               (Platform router: landing · /login · /app/* · /invite)
├── App.jsx                (Landing page - Platform)
└── app/
    ├── routes.jsx         (Shared navigation router - Role-scoped edits)
    ├── shared/            (Platform / Member 1: data, store, connectionsService, ui kit, Shell, Login)
    ├── couple/            (Couple App / Member 2: Home, Roots, Bonds, Branches, Connections, Privacy)
    ├── counsellor/        (Counsellor Portal / Member 4: Queue, CaseView, Schedule)
    └── admin/             (DoH Dashboard / Member 3: Overview, Content, Audit)
```

### Team Working Rules:
1. **Branch-per-feature:** `connection/...`, `couple/...`, `counsellor/...`, `admin/...`.
2. **Platform owns `shared/`:** Common adapters, store, and connection engines reside here.
3. **Surgical edits to `routes.jsx`:** Teammates edit strictly their role's block to prevent git merge conflicts.
4. **Build verification before push:** `cd web && npm run build` and `npm test` must pass cleanly.

