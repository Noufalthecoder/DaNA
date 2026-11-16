# DaNA · دانة — Complete Project Brief

> **Know your roots. Protect your future.** · اعرف جذورك… واحمِ مستقبلك
> One test. A whole family protected.

**Team:** Impact Minds (India) · **Presenter:** Muhammad Naufal
**Event:** Future Health Digital Innovation Challenge 2026, Abu Dhabi
**Theme:** Fertility · **Problem statement 3:** Understanding and Reducing Inherited Disease Risk
**Live app:** https://dana-gamma-seven.vercel.app · **API docs:** https://dana-api-589n.onrender.com/docs
**Code:** https://github.com/Noufalthecoder/DaNA

> How to read this file: **Part A–H describe what is built and running today.** **Part I describes the planned production architecture on Microsoft Azure** (not yet deployed). Keep this distinction on the slides.

---

## Part A — The challenge (as given)

### Problem statement
**How might we help individuals, families and health systems identify, understand and reduce inherited disease risks associated with consanguinity, through innovative, culturally appropriate and privacy-preserving technologies?**

### Context (from the challenge)
Abu Dhabi has invested in population genomics and premarital genetic screening, a strong foundation for earlier prevention of inherited disease. But screening is only useful when people **understand** what a carrier result or couple-level risk means, can **obtain qualified counselling**, and can **make informed decisions that fit their values**. Genetic information is complex, probabilistic and shared across families; misunderstood results can cause anxiety, stigma, family tension or false certainty. Consanguineous marriage is a long-standing social and cultural practice, so a technology response must **support informed choice, not judgement or coercion**. The unmet need: private, culturally and linguistically appropriate communication that links premarital and preconception screening to counselling and care, while protecting genetic data and never exposing one family member's information to another without permission.

### Objective
Help individuals, families and health services understand inherited disease risk earlier and act on it, respecting cultural values and keeping personal and genetic information private.

### The solution should (6 requirements)
1. **Risk explanation** — explain carrier status, couple-level compatibility and potential child risk in plain, non-stigmatising language, including uncertainty and the difference between risk and diagnosis.
2. **Informed, values-sensitive choices** — support access to premarital or preconception screening, genetic counselling and clinically appropriate reproductive options, without directing or coercing personal or family decisions.
3. **Qualified human counselling** — raise complex, high-impact or ambiguous findings to accredited genetics professionals, with a clear boundary between education, decision support and clinical advice.
4. **Privacy-preserving family workflows** — explicit consent, role-based access, data minimisation and auditable sharing; individuals control whether and how information is shared with a partner or family member.
5. **Safe linkage to services** — a traceable path from screening results to counselling, confirmatory assessment and, where appropriate, specialised reproductive-genomics services.
6. **Measurable comprehension and access** — show improved understanding, counselling uptake, time to referral, privacy protection and equitable performance across languages and literacy levels, without treating cancelled marriages or any single choice as the success measure.

---

## Part B — The problem in numbers

| Fact | Meaning |
|---|---|
| **570 genes** | screened in Abu Dhabi's mandatory premarital programme (since October 2024) |
| **~1 in 10** | couples in the pilot carried at least one disease-causing variant |
| **63 of 79** | at-risk couples in Dubai's programme still married — their right, but often without a plan |
| **Relatives** | siblings and cousins of carriers usually never find out until their own engagement |

**The policy tension:** the UAE wants **fewer genetic diseases** *and* **more marriages and births** (Year of Family 2026, National Family Growth Agenda 2031). Screening that frightens couples works against the second goal. **DaNA serves both.**

**The real gap is not the test — it is what happens after the result:** fear, confusion, no clear next step, and families left out.

---

## Part C — The solution: DaNA

**DaNA** turns a premarital genetic test result into **understanding**, a **shared plan** for healthy children, and **private protection for the whole family**.

**The name:** *Dana* (دانة) is the Gulf's most precious pearl. Inside **D-a-N-A** is **DNA** — the most precious thing a family passes on.

### Three journeys
| Journey | Promise | What happens |
|---|---|---|
| 🌱 **Roots** · الجذور | Understand what you carry | Your result explained calmly, in plain words, in Arabic, English and Urdu |
| 🤝 **Bonds** · الروابط | Compatible, with a plan | The couple sees every option side by side and decides together. DaNA never says "marry" or "don't marry" |
| 🌳 **Branches** · الفروع | Protect your family | Private, anonymous *Sila* invitations for relatives to screen before they marry |

*Sila* comes from **صلة الرحم** — the value of caring for your kin.

### What makes DaNA different
| | Typical approach | DaNA |
|---|---|---|
| Framing | "You are incompatible" | **"Compatible, with a plan"** |
| Time | Result day only | A **companion for years**, through pregnancy and newborn |
| Reach | One couple | **The whole family** |
| Language | One language | **English, Arabic, Urdu**, text and voice |
| Numbers | Opaque or AI-generated | **Deterministic rules engine**, never AI |
| Faith | Ignored | **Optional, scholar-reviewed** guidance; no religious rulings by software |
| Success | Fewer marriages | **Understanding, access and equity** |

---

## Part D — How DaNA answers each requirement (built and running)

| # | Requirement | What DaNA does | Screen |
|---|---|---|---|
| 1 | Risk explanation | Calm explanation per result type ("You are healthy. A carrier is not a patient"); child chances as figures (3 in 4 healthy each pregnancy); uncertain findings (VUS) get **no number** until a specialist reviews; "A chance is not a diagnosis" on every result | My result, Bonds |
| 2 | Values-sensitive choices | Three accepted paths side by side (IVF with embryo testing PGT-M, testing in pregnancy, going ahead fully informed) — "No right answer, no deadline"; optional faith cards | Bonds, Privacy |
| 3 | Human counselling | Same-gene, X-linked, pregnant and uncertain results **auto-flagged to an accredited counsellor**; on-screen boundary: "DaNA explains. Medical advice comes only from your counsellor"; booking + counsellor calendar | Home, Counsellor, Schedule |
| 4 | Privacy & family workflows | Consent per data group; partner link only via exact **DaNA ID** (no name search, no directory); "Who saw my data"; withdraw consent with optional deletion; anonymous relative alerts; database row-level security | Set-up, Connections, Privacy, Roots |
| 5 | Safe linkage to services | **Care path**: result → counselling → confirmatory test → specialist referral, each with status and date; 7-stage **Personal Tracker** to pregnancy, birth and newborn screening | Home, Personal Tracker, Case view |
| 6 | Measurable comprehension & access | 30-second understanding check after each result; DoH **Outcome metrics**: understanding, most-misunderstood statements, counselling uptake, time to counsellor, **language gap**; groups < 5 hidden; marriages never a success metric | Quiz, Outcome metrics |

---

## Part E — The complete user journey (live today)

1. **Sign in with UAE PASS** (simulated) → verified identity auto-filled.
2. **Set-up before entering the app** (nobody enters until done): consent per data group (identity, Malaffi results, contact) → marital status, pregnancy, family history → **Malaffi import** (simulated FHIR record: 570-gene carrier test + premarital blood tests).
3. **My result** — one screen, plain words, common worries answered (Am I sick? Did I do something wrong? Can we still marry?), 3-question understanding check.
4. **Connect** — Fatima shares her private DaNA ID → Khalid sends a request → **Fatima's bell lights up** → she accepts. Only then are results compared, with both consents. Disconnect and block work on both sides.
5. **Bonds** — couple result, chance for each pregnancy, three options side by side, downloadable couple report.
6. **Counsellor** — complex result auto-escalated ("A genetic counsellor will contact you"); couple books a slot near them or online; counsellor accepts in their calendar, completes the session, records referrals.
7. **Care path + Personal Tracker** — screening → assessment → counselling → planning → pregnancy → birth → newborn, every step traceable.
8. **Roots & Family Tree** — who may also carry it; one tap sends anonymous invitations (no names, no condition; phone number deleted after sending).
9. **DaNA guide (chatbot)** — floating Emirati counsellor avatar; answers from the person's own result; tap, type or speak; every answer in **English, Arabic, Urdu**, with **Listen** (natural Arabic/Urdu voice). Explains, never advises.
10. **Whole app in 3 languages** — one tap, full right-to-left Arabic and Urdu (Nastaliq script).
11. **Privacy centre** — consents, who saw my data, withdraw consent.
12. **Counsellor portal** — case queue by priority tier (pregnant + same gene first), case view with care-path controls, notes, referrals, calendar.
13. **DoH admin** — outcome metrics, counsellors & areas (verify/pause), security console, content review, append-only audit log, gene-panel benchmarks with version history.

**Roles:** Couple (each partner) · Genetic counsellor · DoH admin · DoH viewer · Relative (no account — private invite link).

---

## Part F — Current architecture (built)

| Layer | Technology | Role |
|---|---|---|
| Web app | React 18, Vite 6, Framer Motion, Lenis — hosted on Vercel | Landing page, couple app, counsellor portal, DoH admin; EN/AR/UR, full RTL |
| Database | Supabase (PostgreSQL) with **row-level security** and security-definer functions | All access rules enforced inside the database |
| API | FastAPI (Python) on Render | Malaffi FHIR import & parsing, rules engine, gene-panel benchmarks, voice |
| Rules engine | Deterministic, versioned (`rules-v0.2`) | Triage tier 1–4 and every risk number — no AI |
| Voice | Browser speech (English) + Gemini TTS (Arabic, Urdu) via the API | Key server-side only, signed-in users, rate-limited, cached |
| Quality | 129 automated API tests | FHIR parsing, rules, benchmarks, panel, privacy |

**Design principles:** (1) Maths decides, AI explains. (2) Humans approve clinical plans and content. (3) Consent before data. (4) Data stays in the UAE. (5) Swap, don't rebuild — UAE PASS, Malaffi, SMS behind adapters.

**Security enforced today:** row-level security on every table · checked functions for linking, consent, care path and counsellor verification · nobody can change their own role · partner search by exact DaNA ID only, rate-limited, masked names · append-only audit log, every staff view shown to the person · anonymous metrics (k ≥ 5) · no secrets in the browser.

---

## Part G — Safety, privacy and compliance

| Requirement | How DaNA meets it |
|---|---|
| Federal Law No. 2 of 2019 (ICT in health) | UAE data residency; Malaffi remains the system of record |
| Federal Decree-Law No. 49 of 2023 (human genome) | Explicit consent before any genetic data is read |
| UAE PDPL | Data minimisation; relatives' numbers used once then deleted |
| ADHICS (Abu Dhabi) | Encryption, role-based access, row-level security, append-only audit |
| DoH Responsible AI Standard | Rules engine for numbers, human oversight, AI labelled, no AI advice |
| Medical-device readiness | ISO 14971 risk file and IEC 62304 practices; classification before pilot |

> DaNA supports and explains; **it does not diagnose.** The prototype uses **synthetic data only**; UAE PASS, Malaffi and Sahatna are **simulated**. Not affiliated with any government entity.

---

## Part H — Measuring impact (DoH Outcome metrics, live)

| Measure | How |
|---|---|
| Understanding | First-try score on the 3-question check, by result type |
| What confuses people | Statements answered wrong most often → wording improved |
| Access to counselling | Need counselling → booked → within 7 days; median days to booking |
| Equity across languages | Understanding and uptake for EN / AR / UR, gap flagged (> 10 points = review) |
| Privacy protection | Consents given/withdrawn, staff views logged, blocks |

**Success = people understand, reach a counsellor quickly, and get equal help in every language. A marriage going ahead or not is never the measure.**

---

## Part I — Production plan on Microsoft Azure (proposed, not yet deployed)

**Goal:** move DaNA to a sovereign, enterprise-grade Microsoft Azure stack hosted **in the UAE** (Azure **UAE North** — Dubai, and **UAE Central** — Abu Dhabi, for paired-region resilience), ready for DoH integration and national scale.

### Azure service map
| Need | Azure service | How DaNA uses it |
|---|---|---|
| Hosting (web) | **Azure Static Web Apps** / **Azure Front Door** + WAF | Global edge, DDoS and web-application firewall in front of the app |
| Hosting (API) | **Azure Container Apps** or **Azure App Service** | FastAPI services, autoscaling, blue-green releases |
| Database | **Azure Database for PostgreSQL – Flexible Server** | Same schema and row-level security; zone-redundant HA, encryption with customer-managed keys |
| Health records | **Azure Health Data Services (FHIR service)** | Standards-based bridge to **Malaffi** (HL7 FHIR R4) for genetic and blood results |
| Identity | **Microsoft Entra External ID** federated with **UAE PASS** (OIDC) | Citizen sign-in; staff sign-in with **Entra ID**, MFA, Conditional Access, Privileged Identity Management |
| API gateway | **Azure API Management** | Rate limits, keys, audit of every API call, versioning for partners |
| Secrets | **Azure Key Vault** + **Managed Identities** | No secrets in code; keys rotated automatically |
| Voice | **Azure AI Speech** (neural voices `ar-AE`, `ur-PK`, `en-GB`; speech-to-text) | Natural Emirati-Arabic and Urdu voice replies and voice questions, replacing the current Gemini voice |
| Translation | **Azure AI Translator** (custom glossary) | Draft translations of new content into Arabic/Urdu, then human clinical review |
| Grounded explanations | **Azure OpenAI Service** (GPT-4-class, private networking) + **Azure AI Search** (RAG over approved content) | Answers grounded only in DoH-approved content; **never generates risk numbers** (the rules engine does) |
| AI safety | **Azure AI Content Safety** + Prompt Shields + groundedness detection | Blocks medical advice, religious rulings and unsafe output before it reaches users |
| Responsible AI | **Azure Machine Learning** Responsible AI dashboard, model cards | Fairness checks across languages, evaluation logs for DoH review |
| Relative alerts (Sila) | **Azure Communication Services** (SMS, WhatsApp) | Anonymous invitations; number used once and deleted |
| Scheduled checks | **Azure Functions** (timer) | Weekly **ClinVar / ClinGen** re-check → reclassified variants flagged for expert review |
| Genomic data protection | **Azure Confidential Computing** (confidential VMs/containers) | Couple matching computed inside hardware-encrypted enclaves |
| Data governance | **Microsoft Purview** | Classify genetic data, lineage, retention and consent policies |
| Threat protection | **Microsoft Defender for Cloud** + **Microsoft Sentinel** (SIEM) | Posture management, threat detection, incident response, ADHICS evidence |
| Observability | **Azure Monitor** + **Application Insights** | Performance, errors, uptime alerts |
| Programme analytics | **Microsoft Fabric** + **Power BI** (de-identified) | DoH dashboards on understanding, uptake, time to referral, equity — aggregated, k ≥ 5 |
| Counsellor sessions | **Microsoft Teams** (virtual visits) / Azure Communication Services video | Secure video counselling with booking links |
| DevOps | **GitHub Actions** + **Azure DevOps** pipelines, IaC with **Bicep/Terraform** | Repeatable, audited deployments |
| Backup & DR | **Azure Backup**, geo-redundant storage (UAE North ↔ UAE Central) | Recovery objectives agreed with DoH |

### Target architecture (text for a diagram)
```
Citizens (web / Sahatna app)        Counsellors & DoH staff
        │ UAE PASS (Entra External ID)        │ Entra ID + MFA
        ▼                                     ▼
   Azure Front Door + WAF  ──►  Azure Static Web Apps (DaNA web)
        │
        ▼
   Azure API Management  ──►  Azure Container Apps (FastAPI: rules engine, FHIR, voice)
        │                         │            │              │
        │                         ▼            ▼              ▼
        │          PostgreSQL Flexible   Azure Health    Azure AI Speech /
        │          (RLS, CMK)            Data Services   Translator / OpenAI
        │                                (FHIR ↔ Malaffi) + Content Safety
        ▼
  Key Vault · Purview · Defender for Cloud · Sentinel · Monitor
        │
        ▼
  Microsoft Fabric + Power BI (de-identified DoH metrics)
```

### Migration path (no rebuild)
1. **Phase 1 — Lift:** PostgreSQL schema and RLS move unchanged to Azure Database for PostgreSQL; FastAPI to Container Apps; web to Static Web Apps.
2. **Phase 2 — Integrate:** UAE PASS via Entra External ID; Malaffi via Azure Health Data Services FHIR; Azure AI Speech replaces Gemini voice.
3. **Phase 3 — Govern & scale:** Purview, Defender, Sentinel; Fabric/Power BI for DoH; Confidential Computing for genomic matching; Azure OpenAI with Content Safety for grounded Q&A.

---

## Part J — Impact & value

- **For couples:** clarity instead of fear; a plan instead of a verdict; help in their own language.
- **For families:** relatives screen *before* marriage, privately.
- **For counsellors:** prioritised queue, complete context, less time explaining basics.
- **For DoH:** measurable understanding, uptake and equity; national-scale, audit-ready, UAE-hosted.
- **For national goals:** fewer genetic diseases **and** more confident families (Year of Family 2026, Family Growth Agenda 2031).

## Part K — Roadmap

**Built:** landing page · set-up gate · plain-language results + quiz · partner linking with notifications · couple result & options · counsellor escalation, booking, calendar, care path, referrals · 7-stage tracker · DaNA guide with voice · full EN/AR/UR app · privacy centre · DoH metrics, counsellor management, audit · rules engine + 129 tests.

**Next:** Azure migration (Part I) · real UAE PASS & Malaffi · ClinVar/ClinGen re-checks · native-speaker clinical review of Arabic/Urdu · usability testing with couples and counsellors · Sahatna module integration · safety documentation pack.

---

## Part L — Suggested slide deck (12 slides)

1. **Title** — DaNA · دانة — "One test. A whole family protected." Team Impact Minds, India.
2. **The challenge** — Problem statement 3, the "How might we…" question.
3. **The problem** — 570 genes · 1 in 10 · 63 of 79 · relatives left out. "The gap is after the result."
4. **Meet DaNA** — the pearl / DNA name; Roots · Bonds · Branches.
5. **The journey** — sign in → set-up → result → connect → Bonds → counsellor → tracker → family.
6. **Requirements 1–2** — plain explanation, child chances, three options, "no right answer, no deadline".
7. **Requirement 3 & 5** — auto-escalation to counsellors; traceable care path to specialist services.
8. **Requirement 4** — privacy by design: consent, DaNA ID, who saw my data, anonymous family alerts.
9. **Requirement 6** — outcome metrics: understanding, uptake, time to counsellor, language gap.
10. **Three languages + voice** — English, العربية, اردو; DaNA guide with Listen.
11. **Built today → Azure tomorrow** — current stack + Azure UAE North/Central architecture.
12. **Impact & close** — "Understand. Choose. Together." Team Impact Minds. Shukran.

## Part M — Design guide (for slides and images)

- **Fonts:** Outfit (headings, bold) · Inter (body) · Tajawal (Arabic) · Noto Nastaliq Urdu (Urdu)
- **Colours:** DaNA green `#00843D` (primary) · UAE red `#CE1126` (small accents) · deep green-black `#0F1A14` · off-white `#F6F7F5` · mint `#E8F3EC`
- **Style:** calm, warm, modern; lots of white space; rounded cards; Emirati couple illustrations (man in kandura and ghutra, woman in abaya and shayla); family-tree and pearl motifs; no scary medical imagery, no DNA-helix clichés in red.

### Image prompts (for ChatGPT / DALL·E)
1. *Hero:* "Flat modern illustration of a young Emirati couple (man in white kandura and ghutra, woman in black abaya and shayla) standing under a stylised green family tree whose leaves are pearls, soft off-white background, DaNA green #00843D accents, calm and hopeful, no text."
2. *Problem:* "Minimal infographic style, a single test tube transforming into a branching family tree with many small figures, half the branches in soft grey (unaware) and half lit in green (protected), clean white background."
3. *Journey:* "Horizontal journey map with 7 rounded milestone icons — screening, couple result, counsellor, planning, pregnancy, birth, newborn — connected by a green path, Emirati couple walking along it, flat vector style."
4. *Privacy:* "A pearl inside an open oyster shell shaped like a shield with a lock, soft green glow, minimal, premium, symbolising protected genetic data."
5. *Counsellor:* "Warm illustration of an Emirati female genetic counsellor in a calm clinic, speaking with a couple via tablet video call, green and white palette, friendly."
6. *Languages:* "Three speech bubbles reading 'English', 'العربية' and 'اردو' around a smartphone showing a chat with a counsellor avatar, flat vector, DaNA green."
7. *Azure architecture:* "Clean cloud architecture diagram style, UAE map outline with two data-centre pins (Dubai, Abu Dhabi), connected secure layers labelled Identity, Health Data (FHIR), AI Speech, Database, Security, Analytics, Microsoft Azure blue with DaNA green accents."
8. *Closing:* "Golden-hour silhouette of an Emirati family (parents and child) under a large tree, pearls glowing in the branches, text space at top, hopeful."

---

*DaNA · دانة — Understand. Choose. Together.*
