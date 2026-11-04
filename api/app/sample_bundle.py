"""A realistic synthetic Malaffi FHIR Bundle, used to simulate "sync my result"."""
from datetime import date


def malaffi_bundle(report_id: str, gene: str = "HBB", hgvs_c: str = "c.20A>T", hgvs_p: str | None = "p.Glu7Val",
                   significance: str = "LA6668-3", zygosity: str = "LA6706-1", issued: str | None = None) -> dict:
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
                          "conclusion": "570-gene premarital carrier panel"}},
            {"resource": {"resourceType": "Provenance", "id": "prov1", "target": [{"reference": f"DiagnosticReport/{report_id}"}],
                          "signature": [{"sigFormat": "application/jose", "data": "c2ltdWxhdGVkLXNpZ25hdHVyZQ=="}]}},
        ],
    }
