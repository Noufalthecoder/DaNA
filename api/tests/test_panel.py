"""Gene panel is configurable: the parser follows the panel it is given, not a fixed list."""
from app.fhir import parse_bundle, GENES
from app.panel import from_info, DEFAULT_LAB_PANEL
from app.sample_bundle import scenario_bundle
from app import scenarios


def _bundle(gene="HBB", c="c.92+5G>C", zyg="heterozygous"):
    return scenario_bundle("R1", [{"gene": gene, "transcript": "NM_000518.5", "hgvs_c": c, "hgvs_p": None,
                                   "significance": "pathogenic", "zygosity": zyg}])


def test_default_panel_unchanged():
    assert parse_bundle(_bundle()).valid


def test_retired_gene_is_rejected():
    panel, _ = from_info({"genes": [{"symbol": "HBB", "condition": "Beta-thalassaemia", "inheritance": "AR", "active": False},
                                    {"symbol": "GJB2", "condition": "Hearing loss", "inheritance": "AR", "active": True}]})
    assert "HBB" not in panel
    p = parse_bundle(_bundle(), panel)
    assert not p.valid and "not on the interpretable panel" in p.errors[0]


def test_added_gene_is_accepted_with_db_condition():
    panel, size = from_info({"lab_panel_genes": 600, "genes": [
        {"symbol": "HBA1", "condition": "Alpha-thalassaemia", "inheritance": "AR", "ncbi_gene_id": "3039", "active": True}]})
    p = parse_bundle(_bundle("HBA1", "c.95+2_95+6del"), panel)
    assert p.valid, p.errors
    assert p.variants[0]["disease_association"] == "Alpha-thalassaemia"
    assert size == 600


def test_inheritance_comes_from_panel():
    panel, _ = from_info({"genes": [{"symbol": "HBB", "condition": "X", "inheritance": "XL", "active": True}]})
    assert parse_bundle(_bundle(zyg="hemizygous"), panel).valid           # XL in this panel: hemizygous allowed
    assert not parse_bundle(_bundle(zyg="hemizygous")).valid              # AR in the default panel: refused


def test_empty_or_missing_info_falls_back_safely():
    assert from_info(None) == (dict(GENES), DEFAULT_LAB_PANEL)
    assert from_info({"genes": []})[0] == dict(GENES)


def test_panel_size_flows_into_records():
    b = scenario_bundle("R1", [], panel_genes=612)
    dr = next(e["resource"] for e in b["entry"] if e["resource"]["resourceType"] == "DiagnosticReport")
    assert dr["conclusion"].startswith("612-gene")
    assert scenarios.blood("clear", "F", 612)["panel_genes"] == 612


def test_all_scenarios_still_valid_on_default_panel():
    for k in scenarios.KEYS:
        for sx in "FM":
            assert parse_bundle(scenario_bundle("R", scenarios.variants(k, sx))).valid, k
