"""
Cross-check two partners against the risk benchmarks. Deterministic: maths
decides, AI only explains. Thresholds come from the risk_benchmarks table, never
from this file. The result uses the same Tier 1-4 scale as compute_tier().
"""
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

RULES_VERSION = "benchmark-rules-v1"
PRIORITY = {1: "urgent", 2: "high", 3: "moderate", 4: "routine"}
BETA_GLOBIN_VARIANTS = {"HbS", "HbC", "HbD", "HbE"}
REQUIRED = ("hb", "mcv", "mch", "hba2", "hb_variant", "rhd")

Reactive = Literal["non_reactive", "reactive"]


class GeneFinding(BaseModel):
    model_config = ConfigDict(extra="forbid")
    gene: str = Field(min_length=2, max_length=20)
    significance: Literal["pathogenic", "likely_pathogenic", "vus"]
    inheritance: Literal["AR", "XL", "AD"]


class LabValues(BaseModel):
    """Blood results. Leave out anything not tested: it is reported, never assumed normal."""
    model_config = ConfigDict(extra="forbid")
    hb: float | None = Field(None, gt=0, le=30, description="Haemoglobin, g/dL")
    mcv: float | None = Field(None, gt=0, le=200, description="fL")
    mch: float | None = Field(None, gt=0, le=60, description="pg")
    hba2: float | None = Field(None, ge=0, le=100, description="%")
    hbf: float | None = Field(None, ge=0, le=100, description="%")
    hb_variant: Literal["none", "HbS", "HbC", "HbD", "HbE", "other"] | None = None
    ferritin: float | None = Field(None, ge=0, le=20000, description="ug/L")
    inflammation: bool = False
    g6pd_pct: float | None = Field(None, ge=0, le=300, description="% of normal activity")
    rubella_igg: float | None = Field(None, ge=0, le=1000, description="IU/mL")
    rhd: Literal["positive", "negative"] | None = None
    hiv: Reactive | None = None
    hbsag: Reactive | None = None
    anti_hcv: Reactive | None = None
    syphilis: Reactive | None = None
    panel_genes: int | None = Field(None, gt=0, description="Genes covered by the genetic panel")


class PartnerLabs(LabValues):
    """One partner's blood results plus their genetic findings."""
    genes: list[GeneFinding] = []


class LabEntry(LabValues):
    """A new lab_results row."""
    collected_on: date
    source: Literal["manual", "lab", "malaffi"] = "manual"
    lab_name: str | None = Field(None, max_length=200)
    report_ref: str | None = Field(None, max_length=200)

    @field_validator("collected_on")
    @classmethod
    def not_in_the_future(cls, value):
        if value > date.today():
            raise ValueError("collected_on cannot be in the future")
        return value


class EvaluateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    couple_id: str | None = None
    male: PartnerLabs
    female: PartnerLabs
    pregnant_weeks: int | None = Field(None, ge=1, le=42)
    consanguineous: bool | None = None


def labs_from_records(lab: dict | None, reports: list[dict]) -> PartnerLabs:
    """Build one partner's input from their latest lab_results row and their genetic_reports."""
    values = {k: lab[k] for k in LabValues.model_fields if lab and lab.get(k) is not None}
    variants = [v for r in reports for v in r.get("genetic_variants") or []]
    genes = [{"gene": v["gene_symbol"], "significance": v["clinical_significance"], "inheritance": v["inheritance_pattern"]}
             for v in variants if v["clinical_significance"] in ("pathogenic", "likely_pathogenic", "vus")]
    if "panel_genes" not in values and reports:
        values["panel_genes"] = max(r["genes_screened"] for r in reports)
    return PartnerLabs(**values, genes=genes)


def _check(parameter, value, threshold, status, note=None):
    return {"parameter": parameter, "value": value, "threshold": threshold, "status": status, "note": note}


def evaluate_person(labs: PartnerLabs, b: dict) -> dict:
    """Compare one partner with their own sex's benchmark row."""
    checks, findings, actions = [], [], []
    mch_low = labs.mch is not None and labs.mch < b["mch_min_pg"]
    missing = [f for f in REQUIRED if getattr(labs, f) is None]

    def low(name, value, minimum):
        if value is None:
            checks.append(_check(name, None, minimum, "not_provided"))
            return False
        below = value < minimum
        checks.append(_check(name, value, minimum, "flag" if below else "ok"))
        return below

    if low("hb", labs.hb, b["hb_min_g_dl"]):
        findings.append("anaemia")
    low("mcv", labs.mcv, b["mcv_min_fl"])
    low("mch", labs.mch, b["mch_min_pg"])

    # iron first: low iron changes how the red cell results read
    ferritin_min = b["ferritin_inflammation_min_ug_l"] if labs.inflammation else b["ferritin_min_ug_l"]
    iron_low = low("ferritin", labs.ferritin, ferritin_min)
    if iron_low:
        findings.append("iron_deficiency")

    if labs.hba2 is None:
        checks.append(_check("hba2", None, b["hba2_carrier_min_pct"], "not_provided"))
    elif labs.hba2 >= b["hba2_carrier_min_pct"] and mch_low:
        checks.append(_check("hba2", labs.hba2, b["hba2_carrier_min_pct"], "flag", "Raised HbA2 with low MCH"))
        findings.append("beta_thal_carrier")
    elif labs.hba2 > b["hba2_review_above_pct"]:
        checks.append(_check("hba2", labs.hba2, b["hba2_review_above_pct"], "review", "Raised HbA2 with normal MCH"))
        findings.append("beta_thal_possible")
    else:
        checks.append(_check("hba2", labs.hba2, b["hba2_carrier_min_pct"], "ok"))
        if mch_low and labs.ferritin is None:
            findings.append("microcytosis_unexplained")
            actions.append("Low MCH with normal HbA2: test ferritin before interpreting")
        elif mch_low and iron_low:
            actions.append("Treat low iron, then repeat the blood count and HbA2")
        elif mch_low:
            findings.append("alpha_thal_possible")

    if labs.hbf is not None:
        raised = labs.hbf >= b["hbf_review_min_pct"] and mch_low
        checks.append(_check("hbf", labs.hbf, b["hbf_review_min_pct"], "review" if raised else "ok"))
        if raised:
            findings.append("delta_beta_possible")

    if labs.hb_variant is None:
        checks.append(_check("hb_variant", None, "none", "not_provided"))
    elif labs.hb_variant == "none":
        checks.append(_check("hb_variant", "none", "none", "ok"))
    else:
        known = labs.hb_variant in BETA_GLOBIN_VARIANTS
        checks.append(_check("hb_variant", labs.hb_variant, "none", "flag" if known else "review"))
        findings.append(f"variant_{labs.hb_variant}")

    if labs.g6pd_pct is not None:
        mid = b.get("g6pd_intermediate_below_pct")
        if labs.g6pd_pct < b["g6pd_deficient_below_pct"]:
            checks.append(_check("g6pd", labs.g6pd_pct, b["g6pd_deficient_below_pct"], "flag"))
            findings.append("g6pd_deficient")
        elif mid is not None and labs.g6pd_pct < mid:
            checks.append(_check("g6pd", labs.g6pd_pct, mid, "review", "Intermediate activity"))
            findings.append("g6pd_intermediate")
        else:
            checks.append(_check("g6pd", labs.g6pd_pct, mid or b["g6pd_deficient_below_pct"], "ok"))

    immune_min = b.get("rubella_igg_immune_min_iu_ml")
    if immune_min is not None:
        if labs.rubella_igg is None:
            missing.append("rubella_igg")
        if low("rubella_igg", labs.rubella_igg, immune_min):
            actions.append("Not rubella-immune: offer vaccination before pregnancy, per local protocol")

    for marker in b["infection_markers"]:
        value = getattr(labs, marker, None)
        if value is None:
            missing.append(marker)
        checks.append(_check(marker, value, "non_reactive",
                             "not_provided" if value is None else "flag" if value == "reactive" else "ok"))
        if value == "reactive":
            actions.append(f"{marker} reactive: confirmatory testing and specialist referral")

    if labs.panel_genes is not None:
        short = labs.panel_genes < b["genetic_panel_min_genes"]
        checks.append(_check("panel_genes", labs.panel_genes, b["genetic_panel_min_genes"], "review" if short else "ok"))
        if short:
            findings.append("panel_too_small")

    return {"checks": checks, "findings": findings, "actions": actions, "missing": missing,
            "benchmark_version": b["version"]}


def _pathogenic(labs: PartnerLabs) -> list[GeneFinding]:
    return [g for g in labs.genes if g.significance in ("pathogenic", "likely_pathogenic")]


def _beta_traits(findings: list[str]) -> set[str]:
    traits = {f.removeprefix("variant_") for f in findings if f.removeprefix("variant_") in BETA_GLOBIN_VARIANTS}
    return traits | ({"beta_thal"} if "beta_thal_carrier" in findings else set())


def evaluate_couple(req: EvaluateRequest, bench: dict) -> dict:
    male = evaluate_person(req.male, bench["M"])
    female = evaluate_person(req.female, bench["F"])
    tier2, tier3, actions = [], [], []

    # the same gene in both partners, or an X-linked finding in the woman
    shared = {g.gene for g in _pathogenic(req.male) if g.inheritance == "AR"} & \
             {g.gene for g in _pathogenic(req.female) if g.inheritance == "AR"}
    tier2 += [f"shared_gene_{g}" for g in sorted(shared)]
    tier2 += [f"x_linked_{g.gene}" for g in _pathogenic(req.female) if g.inheritance == "XL"]

    # two beta-globin traits can combine, e.g. HbS with beta-thalassaemia, even though they differ
    mt, ft = _beta_traits(male["findings"]), _beta_traits(female["findings"])
    if mt and ft:
        tier2.append(f"beta_globin_pair_{'+'.join(sorted(mt))}_{'+'.join(sorted(ft))}")
        actions.append("Both partners carry a beta-globin trait: confirm by DNA testing and refer for counselling")

    if "alpha_thal_possible" in male["findings"] and "alpha_thal_possible" in female["findings"]:
        tier3.append("both_possible_alpha_thal")
        actions.append("Both may carry alpha-thalassaemia: consider DNA testing")

    for person in (male, female):
        tier3 += [f for f in person["findings"] if f not in ("anaemia", "iron_deficiency", "microcytosis_unexplained")]
    tier3 += [f"vus_{g.gene}" for g in req.male.genes + req.female.genes if g.significance == "vus"]
    tier3 += [f"carrier_{g.gene}" for g in _pathogenic(req.male) + _pathogenic(req.female)]

    if req.female.rhd == "negative" and req.male.rhd == "positive" and bench["F"]["rhd_negative_check"]:
        actions.append("RhD-negative woman, RhD-positive man: plan antenatal anti-D care")
    if req.consanguineous:
        actions.append("Related partners: counsellor reviews shared family history")

    missing = {"male": male["missing"], "female": female["missing"]}
    complete = not (missing["male"] or missing["female"]) and req.consanguineous is not None
    tier = 2 if tier2 else 3 if tier3 else 4
    if tier == 2 and req.pregnant_weeks:
        tier = 1
    if tier == 4 and not complete:
        tier = None   # missing results must never read as "all clear"

    return {
        "tier": tier, "priority": PRIORITY.get(tier), "complete": complete, "missing": missing,
        "couple_findings": tier2 + tier3, "actions": actions + male["actions"] + female["actions"],
        "male": male, "female": female,
        "benchmark_versions": {"M": bench["M"]["version"], "F": bench["F"]["version"]},
        "rules_version": RULES_VERSION,
    }
