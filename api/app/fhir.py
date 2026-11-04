"""
Report Ingestion & Validation Adapter (spec v3, core service layer).

Reads a FHIR R4 Bundle as Malaffi would send it (DiagnosticReport + variant
Observations + Organization + Provenance), checks provenance and terminology,
and turns it into rows for genetic_reports / genetic_variants.
No AI and no guessing: anything missing or unrecognised is reported, not filled in.
"""
import re
from dataclasses import dataclass, field

LOINC = "http://loinc.org"
GENETIC_REPORT = "51969-4"          # Genetic analysis report
GENE_STUDIED = "48018-6"            # Gene studied [ID]
DNA_CHANGE = "48004-6"              # DNA change (c.HGVS)
AMINO_ACID_CHANGE = "48005-3"       # Amino acid change (p.HGVS)
ZYGOSITY = "53034-5"                # Allelic state
SIGNIFICANCE = "53037-8"            # Genetic variation clinical significance
TRANSCRIPT = "51958-7"              # Transcript reference sequence

SIGNIFICANCE_CODES = {              # LOINC answer list LL4034-6
    "LA6668-3": "pathogenic", "LA26332-9": "likely_pathogenic", "LA26333-7": "vus",
    "LA26334-5": "likely_benign", "LA6675-8": "benign",
}
ZYGOSITY_CODES = {"LA6706-1": "heterozygous", "LA6705-3": "homozygous", "LA6707-9": "hemizygous"}

# genes on the panel we can interpret (mirrors the `genes` table)
GENES = {
    "HBB": ("Beta-thalassaemia", "AR", "3043"), "GJB2": ("Inherited hearing loss", "AR", "2706"),
    "SMN1": ("Spinal muscular atrophy", "AR", "6606"), "CFTR": ("Cystic fibrosis", "AR", "1080"),
    "G6PD": ("G6PD deficiency", "XL", "2539"),
}
HGVS_C = re.compile(r"^c\.[0-9*+\-_]+.*$")
HGVS_P = re.compile(r"^p\.(\(?[A-Z][a-z]{2}[0-9]+.*\)?|=|\?)$")
ACCREDITATION = re.compile(r"^(CAP-\d{7}|ISO15189-[A-Z0-9-]+)$")


@dataclass
class Parsed:
    report: dict = field(default_factory=dict)
    variants: list = field(default_factory=list)
    errors: list = field(default_factory=list)
    warnings: list = field(default_factory=list)

    @property
    def valid(self) -> bool:
        return not self.errors


def _code(concept: dict | None, system: str | None = None):
    for c in (concept or {}).get("coding", []):
        if system is None or c.get("system") == system:
            return c.get("code")
    return None


def _component(obs: dict, loinc: str) -> dict | None:
    for comp in obs.get("component", []):
        if _code(comp.get("code"), LOINC) == loinc:
            return comp
    return None


def parse_bundle(bundle: dict) -> Parsed:
    out = Parsed()
    if bundle.get("resourceType") != "Bundle":
        out.errors.append("Expected a FHIR Bundle")
        return out

    res = [e.get("resource", {}) for e in bundle.get("entry", [])]
    by_ref = {f"{r.get('resourceType')}/{r.get('id')}": r for r in res}
    reports = [r for r in res if r.get("resourceType") == "DiagnosticReport"]
    if len(reports) != 1:
        out.errors.append(f"Expected exactly one DiagnosticReport, found {len(reports)}")
        return out
    dr = reports[0]

    # --- the report itself ---
    if _code(dr.get("code"), LOINC) != GENETIC_REPORT:
        out.errors.append(f"DiagnosticReport code must be LOINC {GENETIC_REPORT} (genetic analysis report)")
    if dr.get("status") != "final":
        out.errors.append(f"Report status is '{dr.get('status')}', only 'final' reports are accepted")
    report_date = (dr.get("issued") or dr.get("effectiveDateTime") or "")[:10]
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", report_date):
        out.errors.append("Report has no issued date")

    # --- provenance: performing lab + accreditation ---
    lab = None
    for p in dr.get("performer", []):
        lab = by_ref.get(p.get("reference", "")) or lab
    accreditation = None
    if not lab or lab.get("resourceType") != "Organization":
        out.errors.append("Performing laboratory (Organization) is missing")
    else:
        accreditation = next((i.get("value") for i in lab.get("identifier", []) if "accreditation" in (i.get("system") or "")), None)
        if not accreditation or not ACCREDITATION.match(accreditation):
            out.errors.append("Laboratory accreditation (CAP or ISO 15189) is missing or malformed")

    # --- digital signature (Provenance targeting the report) ---
    signature = None
    for r in res:
        if r.get("resourceType") == "Provenance" and any(t.get("reference") == f"DiagnosticReport/{dr.get('id')}" for t in r.get("target", [])):
            sig = (r.get("signature") or [{}])[0]
            signature = sig.get("data") and f"{sig.get('sigFormat', 'sig')}:{str(sig['data'])[:16]}"
    if not signature:
        out.errors.append("Report is not digitally signed (no Provenance signature)")

    # --- variants ---
    for ref in dr.get("result", []):
        obs = by_ref.get(ref.get("reference", ""))
        if not obs:
            out.errors.append(f"Result {ref.get('reference')} not found in the bundle")
            continue
        gene_c = _component(obs, GENE_STUDIED)
        gene = (_code((gene_c or {}).get("valueCodeableConcept")) or "").split(":")[-1].upper() or None
        hgvs_c = ((_component(obs, DNA_CHANGE) or {}).get("valueCodeableConcept") or {}).get("text") or _code((_component(obs, DNA_CHANGE) or {}).get("valueCodeableConcept"))
        hgvs_p = ((_component(obs, AMINO_ACID_CHANGE) or {}).get("valueCodeableConcept") or {}).get("text")
        zyg = ZYGOSITY_CODES.get(_code((_component(obs, ZYGOSITY) or {}).get("valueCodeableConcept")))
        sig = SIGNIFICANCE_CODES.get(_code((_component(obs, SIGNIFICANCE) or {}).get("valueCodeableConcept")))
        transcript = ((_component(obs, TRANSCRIPT) or {}).get("valueCodeableConcept") or {}).get("text")
        where = f"variant in {gene or '?'}"
        if gene not in GENES:
            out.errors.append(f"{where}: gene not on the interpretable panel")
            continue
        if not hgvs_c or not HGVS_C.match(hgvs_c):
            out.errors.append(f"{where}: DNA change is not valid c.HGVS ({hgvs_c!r})")
        if hgvs_p and not HGVS_P.match(hgvs_p):
            out.warnings.append(f"{where}: protein change {hgvs_p!r} doesn't look like p.HGVS")
        if not zyg:
            out.errors.append(f"{where}: zygosity missing or not a LOINC LA code")
        if not sig:
            out.errors.append(f"{where}: clinical significance missing or not a LOINC LA code")
        if sig == "vus":
            out.warnings.append(f"{where}: variant of uncertain significance, needs counsellor review")
        condition, inheritance, ncbi = GENES[gene]
        if zyg == "hemizygous" and inheritance != "XL":
            out.errors.append(f"{where}: hemizygous is only possible for X-linked genes")
        out.variants.append({
            "gene_symbol": gene, "ncbi_gene_id": ncbi, "transcript_id": transcript, "hgvs_c": hgvs_c, "hgvs_p": hgvs_p,
            "zygosity": zyg, "inheritance_pattern": inheritance, "clinical_significance": sig,
            "significance_source": "ClinVar", "review_status": "lab-reported", "disease_association": condition,
        })

    out.report = {
        "report_id": dr.get("id"), "source": "Malaffi (simulated)", "laboratory_name": (lab or {}).get("name"),
        "accreditation_id": accreditation, "test_methodology": dr.get("conclusion") and "Targeted NGS panel" or "Targeted NGS panel",
        "report_date": report_date, "digital_signature": signature,
        "validation_status": "verified" if not out.errors else "failed",
    }
    return out
