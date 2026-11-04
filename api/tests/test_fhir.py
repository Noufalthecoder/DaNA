"""Tests for the Malaffi FHIR validation adapter. Run: python -m pytest (from api/)."""
import copy

from app.fhir import parse_bundle
from app.sample_bundle import malaffi_bundle


def _entry(bundle, rtype):
    return next(e["resource"] for e in bundle["entry"] if e["resource"]["resourceType"] == rtype)


def test_valid_report_is_verified():
    p = parse_bundle(malaffi_bundle("R1"))
    assert p.valid, p.errors
    assert p.report["validation_status"] == "verified"
    assert p.report["accreditation_id"] == "CAP-0000000"
    v = p.variants[0]
    assert (v["gene_symbol"], v["hgvs_c"], v["zygosity"], v["clinical_significance"], v["inheritance_pattern"]) == \
           ("HBB", "c.20A>T", "heterozygous", "pathogenic", "AR")


def test_vus_is_accepted_with_a_warning():
    p = parse_bundle(malaffi_bundle("R2", gene="SMN1", hgvs_c="c.275G>C", hgvs_p="p.Trp92Ser", significance="LA26333-7"))
    assert p.valid
    assert p.variants[0]["clinical_significance"] == "vus"
    assert any("uncertain significance" in w for w in p.warnings)


def test_missing_accreditation_fails():
    b = malaffi_bundle("R3")
    _entry(b, "Organization")["identifier"] = []
    p = parse_bundle(b)
    assert not p.valid and any("accreditation" in e for e in p.errors)


def test_unsigned_report_fails():
    b = malaffi_bundle("R4")
    b["entry"] = [e for e in b["entry"] if e["resource"]["resourceType"] != "Provenance"]
    assert any("signed" in e for e in parse_bundle(b).errors)


def test_preliminary_report_fails():
    b = malaffi_bundle("R5")
    _entry(b, "DiagnosticReport")["status"] = "preliminary"
    assert any("final" in e for e in parse_bundle(b).errors)


def test_bad_hgvs_fails():
    p = parse_bundle(malaffi_bundle("R6", hgvs_c="20A>T"))
    assert any("c.HGVS" in e for e in p.errors)


def test_unknown_gene_fails():
    p = parse_bundle(malaffi_bundle("R7", gene="BRCA1"))
    assert any("not on the interpretable panel" in e for e in p.errors)


def test_hemizygous_only_for_x_linked():
    assert any("X-linked" in e for e in parse_bundle(malaffi_bundle("R8", zygosity="LA6707-9")).errors)
    assert parse_bundle(malaffi_bundle("R9", gene="G6PD", hgvs_c="c.563C>T", hgvs_p="p.Ser188Phe", zygosity="LA6707-9")).valid


def test_not_a_bundle():
    assert not parse_bundle({"resourceType": "Patient"}).valid


def test_input_is_not_modified():
    b = malaffi_bundle("R10")
    before = copy.deepcopy(b)
    parse_bundle(b)
    assert b == before
