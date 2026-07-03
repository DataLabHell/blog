"""
build_parquet.py
================
Validate the shipped CO2/CH4 Parquet products and write a manifest.json.

The original generated-source modules used to create these files are not part
of the checked-in blog artifact. This script therefore treats the flat Parquet
files in this directory as the published data layer and records their shape,
columns, byte size, source, and note for reproducibility/audit purposes.
"""

from __future__ import annotations

import json
from pathlib import Path

import pyarrow.parquet as pq

HERE = Path(__file__).parent

# Only the openly redistributable derived tables ship beside the article.
# The raw HITRAN line lists and full NIST WebBook IR spectra are NOT
# redistributed (upstream terms forbid it); regenerate them from the
# hitran_get_lines / nist_get_spectrum calls in Appendix B before re-running
# analysis.py. They are deliberately absent from this manifest.
PRODUCTS = {
    "codata_constants.parquet": (
        "NIST CODATA 2022",
        "Fundamental constants via Faraday codata_get / codata_search",
    ),
    "pubchem_CO2_CH4_properties.parquet": (
        "PubChem",
        "Molecular identity/properties via Faraday PubChem tools "
        "(NCBI places no restrictions on molecular data but cannot grant "
        "third-party rights; CAS Registry Numbers omitted)",
    ),
    "nist_shomate_thermo.parquet": (
        "NIST Chemistry WebBook",
        "Gas-phase Shomate Cp/H/S coefficients via nist_get_thermo",
    ),
    "nist_phase_change_summary.parquet": (
        "NIST Chemistry WebBook",
        "Selected phase-change values via nist_get_phase_change",
    ),
}


def main() -> None:
    manifest = []
    for filename, (source, note) in PRODUCTS.items():
        path = HERE / filename
        if not path.exists():
            # Should not happen for the redistributable set, but skip rather
            # than abort so a partial bundle still yields a manifest.
            print(f"WARNING: missing {filename} -- skipped")
            continue
        table = pq.read_table(path)
        manifest.append({
            "source": source,
            "filename": filename,
            "rows": table.num_rows,
            "columns": table.column_names,
            "bytes": path.stat().st_size,
            "note": note,
        })
        print(
            f"validated {filename:42s} "
            f"rows={table.num_rows:4d} cols={table.num_columns}"
        )

    out = HERE / "manifest.json"
    out.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"wrote {out.name}: {len(manifest)} Parquet products")


if __name__ == "__main__":
    main()
