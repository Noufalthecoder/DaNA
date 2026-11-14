# Benchmarks and gene panel

Phase 1 of the benchmarking plan: every value DaNA checks against is configurable, versioned and tied to a source.

## Where things live

| What | Database | Who can change | History |
|---|---|---|---|
| Blood thresholds (Hb, MCV, MCH, HbA2, HbF, ferritin, G6PD, rubella, RhD, infections) | `risk_benchmarks` (one row per sex), source per value in `sources` | Programme admin, reason required | `risk_benchmark_snapshots` (015) |
| Lab panel size (default 570 genes) | `risk_benchmarks.genetic_panel_min_genes` | Programme admin | same |
| Genes DaNA interprets | `genes`: condition, inheritance, HGNC ID, NCBI Gene ID, transcript, source, link, review status, active | Programme admin, reason required | `gene_panel_snapshots` (025) |

Edit in the app: **Settings → Benchmarks** (admin edits; counsellors read only). API: `GET /panel`, `PATCH /panel/{symbol}`, `GET /panel/{symbol}/snapshots`.

## Rules

- Nothing is deleted. A gene is **retired** (`active = false`); old reports still resolve.
- Every change bumps the version, stores a full snapshot and writes the audit log.
- Two editors cannot overwrite each other: each edit names the version it started from.
- A gene starts as **Needs expert review** and is marked **Verified** only after a genetics professional checks its source.
- If the panel cannot be read, the API uses the built-in starting panel. It never accepts an unknown gene.
- Results in a gene not on the active panel are rejected at ingestion with a clear error.

## Starting gene panel (all "Needs expert review")

| Gene | Condition | Inheritance | Source |
|---|---|---|---|
| HBB | Beta-thalassaemia | AR | GeneReviews NBK1426 |
| GJB2 | Inherited hearing loss (DFNB1) | AR | GeneReviews NBK1272 |
| SMN1 | Spinal muscular atrophy | AR | GeneReviews NBK1352 |
| CFTR | Cystic fibrosis | AR | GeneReviews NBK1250 |
| G6PD | G6PD deficiency | XL | OMIM 305900 |

Each threshold also has a source record (`benchmark_sources`, 026): citation, link, review status (Needs expert review · Confirm for UAE · Verified) and note. The admin edits it on the Benchmarks page; every edit is versioned and audited.

## Phase 2 (not built yet)

- Read variant classifications from ClinVar and gene-disease validity from ClinGen.
- A scheduled check that flags changes for expert review. Nothing is applied automatically.
- Keep using versions and assessment snapshots so every past result stays traceable.
