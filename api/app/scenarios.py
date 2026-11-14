"""Simulated Malaffi records: 10 different, clinically plausible premarital results.

Same list as web/src/app/shared/scenarios.js (keep them in step). Each account gets one
automatically (stable per person), or the demo picks one by key, so results can be compared.
Blood values follow the usual patterns: beta-thalassaemia carriers have small red cells and
raised HbA2; sickle trait has normal red cells and HbS; low iron gives small red cells with
normal HbA2; G6PD activity is low in affected men and intermediate in carrier women.
Synthetic data only.
"""
import hashlib

TX = {"HBB": "NM_000518.5", "GJB2": "NM_004004.6", "SMN1": "NM_000344.4", "CFTR": "NM_000492.4", "G6PD": "NM_001360016.2"}
NORMAL = {"F": dict(hb=13.2, mcv=88.0, mch=29.6, hba2=2.6, hbf=0.6, ferritin=58.0, g6pd_pct=97.0, rubella_igg=46.0, rhd="positive"),
          "M": dict(hb=15.1, mcv=89.0, mch=30.1, hba2=2.7, hbf=0.5, ferritin=124.0, g6pd_pct=101.0)}


def _v(gene, c, p=None, sig="pathogenic", zyg="heterozygous"):
    return {"gene": gene, "transcript": TX[gene], "hgvs_c": c, "hgvs_p": p, "significance": sig, "zygosity": zyg}


# key: label, variants(sex) -> list, blood(sex) -> overrides
SCENARIOS = {
    "clear": ("No carrier findings", lambda s: [], lambda s: {}),
    "beta_thal": ("Beta-thalassaemia carrier (IVS1-5)",
                  lambda s: [_v("HBB", "c.92+5G>C")],
                  lambda s: dict(hb=11.4 if s == "F" else 12.7, mcv=63.5, mch=20.2, hba2=5.4, hbf=1.3)),
    "sickle": ("Sickle cell trait (HbS)",
               lambda s: [_v("HBB", "c.20A>T", "p.Glu7Val")],
               lambda s: dict(hba2=3.1, hb_variant="HbS")),
    "hearing": ("Hearing loss carrier (GJB2)", lambda s: [_v("GJB2", "c.35delG", "p.Gly12fs")], lambda s: {}),
    "cf": ("Cystic fibrosis carrier (F508del)", lambda s: [_v("CFTR", "c.1521_1523del", "p.Phe508del")], lambda s: {}),
    "sma": ("SMA carrier (one SMN1 copy)", lambda s: [_v("SMN1", "c.1_882del")], lambda s: {}),
    "g6pd": ("G6PD Mediterranean",
             lambda s: [_v("G6PD", "c.563C>T", "p.Ser188Phe", zyg="heterozygous" if s == "F" else "hemizygous")],
             lambda s: dict(g6pd_pct=54.0 if s == "F" else 7.0)),
    "vus": ("Uncertain finding (CFTR VUS)", lambda s: [_v("CFTR", "c.2991G>C", "p.Leu997Phe", sig="vus")], lambda s: {}),
    "double": ("Two findings: beta-thal + hearing loss",
               lambda s: [_v("HBB", "c.92+5G>C"), _v("GJB2", "c.35delG", "p.Gly12fs")],
               lambda s: dict(hb=11.2 if s == "F" else 12.5, mcv=64.0, mch=20.5, hba2=5.2, hbf=1.1)),
    "blood_attention": ("No carrier findings, blood needs attention",
                        lambda s: [],
                        lambda s: dict(hb=10.6 if s == "F" else 12.4, mcv=74.0, mch=23.8, hba2=2.2, ferritin=7.0,
                                       **({"rubella_igg": 4.0, "rhd": "negative"} if s == "F" else {}))),
}
KEYS = list(SCENARIOS)


def pick(person_id: str, key: str | None = None) -> str:
    """The chosen scenario, or a stable one per person (different accounts get different records)."""
    if key in SCENARIOS:
        return key
    return KEYS[int(hashlib.sha256(person_id.encode()).hexdigest(), 16) % len(KEYS)]


def variants(key: str, sex: str) -> list:
    return SCENARIOS[key][1](sex)


def blood(key: str, sex: str, panel_genes: int = 570) -> dict:
    row = {**NORMAL["F" if sex == "F" else "M"], "hb_variant": "none",
           "hiv": "non_reactive", "hbsag": "non_reactive", "anti_hcv": "non_reactive", "syphilis": "non_reactive",
           "panel_genes": panel_genes, **SCENARIOS[key][2](sex)}
    return row
