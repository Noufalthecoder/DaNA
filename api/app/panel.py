"""The interpretable gene panel and lab panel size, read from the database (025 panel_info).

Falls back to the built-in starting panel when the database is not migrated or not reachable,
so ingestion never silently accepts an unknown gene. Cached briefly; admin edits apply within a minute.
"""
import time

from .fhir import GENES as DEFAULT_GENES

DEFAULT_LAB_PANEL = 570
_cache: dict = {"at": 0.0, "value": None}
TTL = 60


def from_info(info: dict | None) -> tuple[dict, int]:
    """panel_info() JSON -> ({symbol: (condition, inheritance, ncbi_gene_id)} for ACTIVE genes, lab panel size)."""
    if not info or not info.get("genes"):
        return dict(DEFAULT_GENES), DEFAULT_LAB_PANEL
    genes = {g["symbol"]: (g["condition"], g["inheritance"], g.get("ncbi_gene_id") or "")
             for g in info["genes"] if g.get("active", True) and g.get("review_status") != "retired"}
    return genes, int(info.get("lab_panel_genes") or DEFAULT_LAB_PANEL)


def load(db) -> tuple[dict, int]:
    now = time.time()
    if _cache["value"] and now - _cache["at"] < TTL:
        return _cache["value"]
    try:
        value = from_info(db.rpc("panel_info"))
    except Exception:  # not migrated yet / offline: keep the safe built-in panel
        value = (dict(DEFAULT_GENES), DEFAULT_LAB_PANEL)
    _cache.update(at=now, value=value)
    return value


def clear_cache():
    _cache.update(at=0.0, value=None)
