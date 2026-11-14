"""A realistic synthetic Malaffi FHIR Bundle, used to simulate "sync my result"."""
from datetime import date


def malaffi_bundle(report_id: str, gene: str = "HBB", hgvs_c: str = "c.20A>T", hgvs_p: str | None = "p.Glu7Val",
                   significance: str = "LA6668-3", zygosity: str = "LA6706-1", issued: str | None = None,
                   panel_genes: int = 570) -> dict:
    issued = issued or date.today().isoformat()
    components = [
        {"code": {"coding": [{"system": "http://loinc.org", "code": "48018-6"}]},
         "valueCodeableConcept": {"coding": [{"system": "http://www.genenames.org/geneId", "code": f"HGNC:{gene}"}]}},
        {"code": {"coding": [{"system": "http://loinc.org", "code": "51958-7"}]}, "valueCodeableConcept": {"text": "NM_000518.5"}},
        {"code": {"coding": [{"system": "http://loinc.org", "code": "48004-6"}]}, "valueCodeableConcept": {"text": hgvs_c}},
        {"code": {"coding": [{"system": "http://loinc.org", "code": "53034-5"}]},
         "valueCodeableConcept": {"coding": [{"system": "http://loinc.org", "code": zygosity}]}},
        {"code": {"coding": [{"system": "http://loinc.org", "code": "53037-8"}]},
         "valueCodeableConcept": {"coding": [{"system": "http://loinc.org", "code": significance}]}},
    ]
    if hgvs_p:
        components.insert(3, {"code": {"coding": [{"system": "http://loinc.org", "code": "48005-3"}]}, "valueCodeableConcept": {"text": hgvs_p}})
    return {
        "resourceType": "Bundle", "type": "collection",
        "entry": [
            {"resource": {"resourceType": "Organization", "id": "lab1", "name": "Abu Dhabi Genomics Lab (simulated)",
                          "identifier": [{"system": "urn:dana:accreditation", "value": "CAP-0000000"}]}},
            {"resource": {"resourceType": "Observation", "id": "v1", "status": "final",
                          "code": {"coding": [{"system": "http://loinc.org", "code": "69548-6"}]}, "component": components}},
            {"resource": {"resourceType": "DiagnosticReport", "id": report_id, "status": "final", "issued": issued,
                          "code": {"coding": [{"system": "http://loinc.org", "code": "51969-4"}]},
                          "performer": [{"reference": "Organization/lab1"}], "result": [{"reference": "Observation/v1"}],
                          "conclusion": f"{panel_genes}-gene premarital carrier panel"}},
            {"resource": {"resourceType": "Provenance", "id": "prov1", "target": [{"reference": f"DiagnosticReport/{report_id}"}],
                          "signature": [{"sigFormat": "application/jose", "data": "c2ltdWxhdGVkLXNpZ25hdHVyZQ=="}]}},
        ],
    }


def synthetic_blood(sex: str, carrier_gene: str | None) -> dict:
    """Plausible premarital blood results for the simulated Malaffi record. A beta-thalassaemia
    (HBB) carrier shows the usual carrier pattern: raised HbA2 with small red cells; others are normal."""
    female = sex == "F"
    hbb = carrier_gene == "HBB"
    row = {
        "hb": (11.6 if female else 12.9) if hbb else (13.1 if female else 15.0),
        "mcv": 66.0 if hbb else 88.0,
        "mch": 21.5 if hbb else 29.5,
        "hba2": 5.1 if hbb else 2.6,
        "hbf": 0.8,
        "hb_variant": "none",
        "ferritin": 64.0 if female else 120.0,
        "hiv": "non_reactive", "hbsag": "non_reactive", "anti_hcv": "non_reactive", "syphilis": "non_reactive",
        "panel_genes": 570,
    }
    if female:
        row.update({"rubella_igg": 42.0, "rhd": "positive", "g6pd_pct": 96.0})
    return row


SIG = {"pathogenic": "LA6668-3", "likely_pathogenic": "LA26332-9", "vus": "LA26333-7"}
ZYG = {"heterozygous": "LA6706-1", "homozygous": "LA6705-3", "hemizygous": "LA6707-9"}


def scenario_bundle(report_id: str, variants: list, issued: str | None = None, panel_genes: int = 570) -> dict:
    """A Malaffi bundle with any number of variants (none = nothing found), one Observation each."""
    b = malaffi_bundle(report_id, issued=issued, panel_genes=panel_genes)
    lab, _obs, report, prov = b["entry"]
    obs_entries, refs = [], []
    for i, v in enumerate(variants, 1):
        o = malaffi_bundle(report_id, gene=v["gene"], hgvs_c=v["hgvs_c"], hgvs_p=v.get("hgvs_p"),
                           significance=SIG[v["significance"]], zygosity=ZYG[v["zygosity"]])["entry"][1]
        o["resource"]["id"] = f"v{i}"
        for comp in o["resource"]["component"]:
            if comp["code"]["coding"][0]["code"] == "51958-7":
                comp["valueCodeableConcept"]["text"] = v["transcript"]
        obs_entries.append(o)
        refs.append({"reference": f"Observation/v{i}"})
    report["resource"]["result"] = refs
    return {**b, "entry": [lab, *obs_entries, report, prov]}
