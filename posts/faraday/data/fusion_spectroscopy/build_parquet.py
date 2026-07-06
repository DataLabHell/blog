#!/usr/bin/env python3
"""
Build the data products (derived + raw), each in Parquet AND CSV, then
round-trip-validate the largest available Parquet file.

The checked-in blog artifact keeps all JSON, CSV, and Parquet products flat in
this directory, so this builder writes the same flat layout.

Data availability: the CODATA- and PubChem-backed products build out of the box.
The raw ASD line bundles (asd_*.json) are NOT redistributed under NIST Standard
Reference Data terms; regenerate them first via the ASD MCP calls in Appendix B.
When they are absent the ASD raw layer (and the ASD-derived figure tables) are
skipped with a warning, and the round-trip gate falls back to the CODATA product.
"""
import csv, json, warnings
from pathlib import Path
import pyarrow as pa
import pyarrow.parquet as pq

from analysis import (load_from_raw, dt_energy, doppler, isotope_shift,
                      diagnostic_lines, ASD_NOTE)

HERE = Path(__file__).parent
DERIVED = HERE
RAWP = HERE
DERIVED.mkdir(exist_ok=True)
RAWP.mkdir(exist_ok=True)


def write_csv(path, header, rows):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def write_parquet(path, header, rows):
    cols = list(zip(*rows)) if rows else [[] for _ in header]
    arrays = []
    for name, col in zip(header, cols):
        # infer: all-numeric -> double, else string
        try:
            arrays.append(pa.array([None if v == "" else float(v) for v in col], type=pa.float64()))
        except (ValueError, TypeError):
            arrays.append(pa.array([str(v) for v in col], type=pa.string()))
    pq.write_table(pa.table(arrays, names=header), path)


def product(name, folder, header, rows):
    write_csv(folder / f"{name}.csv", header, rows)
    write_parquet(folder / f"{name}.parquet", header, rows)
    return dict(name=name, rows=len(rows), cols=header)


def main():
    data = load_from_raw()
    cod = data["codata"]
    manifest = {"derived": [], "raw": []}

    # ---- Derived: Fig 1 - D-T energy ledger ----
    A = dt_energy(cod)
    fig1 = [
        ["deuteron (D)", "reactant_rest", f"{A['mD']:.5f}"],
        ["triton (T)", "reactant_rest", f"{A['mT']:.5f}"],
        ["alpha (4He)", "product_rest", f"{A['mA']:.5f}"],
        ["neutron (n)", "product_rest", f"{A['mN']:.5f}"],
        ["Q released", "released", f"{A['Q_MeV']:.5f}"],
        ["alpha KE", "kinetic", f"{A['KE_alpha_MeV']:.5f}"],
        ["neutron KE", "kinetic", f"{A['KE_n_MeV']:.5f}"],
    ]
    manifest["derived"].append(product("fig1_dt_energy_ledger", DERIVED,
                                       ["item", "type", "value_MeV"], fig1))

    # ---- Derived: Fig 2 - diagnostic line map (ASD-backed) ----
    have_asd = all(data[k] is not None for k in ("he2", "h1", "w1", "n2"))
    if have_asd:
        dl = diagnostic_lines(data)
        fig2 = [[r["species"], f"{r['wavelength_nm']:.4f}",
                 ("" if r["Aki_s1"] != r["Aki_s1"] else f"{r['Aki_s1']:.4e}"),
                 ("" if "intens" not in r or r["intens"] != r["intens"] else f"{r['intens']:.0f}"),
                 r["role"]] for r in dl]
        manifest["derived"].append(product("fig2_diagnostic_lines", DERIVED,
                                           ["species", "wavelength_nm", "Aki_s1", "intens", "role"], fig2))

    # ---- Derived: Fig 3 - Doppler FWHM vs T (ASD-backed) ----
    if data["he2"] is not None:
        B = doppler(cod, data["he2"])
        fig3 = [[f"{r['T_keV']}", f"{r['fwhm_nm']:.5f}", f"{r['sigma_nm']:.5f}"] for r in B["fwhm_table"]]
        manifest["derived"].append(product("fig3_doppler_fwhm_vs_T", DERIVED,
                                           ["T_keV", "fwhm_nm", "sigma_nm"], fig3))

    # ---- Raw: CODATA constants (verbatim) ----
    rc = [[r["name"], r["value"], r["uncertainty"], r["unit"]] for r in
          json.loads((HERE/"codata_constants.json").read_text())["records"]]
    manifest["raw"].append(product("raw_codata_constants", RAWP,
                                   ["name", "value", "uncertainty", "unit"], rc))

    # ---- Raw: ASD lines (verbatim, flattened tall table) ----
    # Not redistributed; build only when the bundles were regenerated (Appendix B).
    asd_files = ["asd_he_ii_400_700.json", "asd_h_i_655_657.json",
                 "asd_w_i_350_550.json", "asd_n_ii_400_410.json"]
    asd_rows = None
    if all((HERE / f).exists() for f in asd_files):
        asd_header = ["element", "obs_wl_air_nm", "ritz_wl_air_nm", "intens",
                      "Aki_s1", "Ei_cm1", "Ek_cm1", "conf_i", "term_i", "conf_k", "term_k"]
        asd_rows = []
        for fname in asd_files:
            bundle = json.loads((HERE/fname).read_text())
            el = bundle["element"]
            for l in bundle["lines"]:
                asd_rows.append([el, l.get("obs_wl_air_nm",""), l.get("ritz_wl_air_nm",""),
                                 l.get("intens",""), l.get("Aki_s1",""), l.get("Ei_cm1",""),
                                 l.get("Ek_cm1",""), l.get("conf_i",""), l.get("term_i",""),
                                 l.get("conf_k",""), l.get("term_k","")])
        manifest["raw"].append(product("raw_asd_lines", RAWP, asd_header, asd_rows))
    else:
        warnings.warn(f"skipping raw_asd_lines (ASD bundles absent); {ASD_NOTE}")

    # ---- Raw: PubChem materials (verbatim) ----
    pm = [[str(r["query"]), str(r["CID"]), r["MolecularFormula"], str(r["MolecularWeight"]),
           r["InChIKey"], r["IUPACName"]] for r in data["pub"]["records"]]
    manifest["raw"].append(product("raw_pubchem_materials", RAWP,
                                   ["query","CID","MolecularFormula","MolecularWeight","InChIKey","IUPACName"], pm))

    # ---- Round-trip validate the most-mixed product available ----
    if asd_rows is not None:
        rt = pq.read_table(RAWP / "raw_asd_lines.parquet")
        assert rt.num_rows == len(asd_rows), "row count mismatch on round-trip"
        # spot-check a known value: He II strongest line wavelength present
        wls = [str(x) for x in rt.column("ritz_wl_air_nm").to_pylist()]
        assert any(w.startswith("468.5804") for w in wls), "He II 468.5804 missing after round-trip"
        print(f"round-trip OK: raw_asd_lines.parquet has {rt.num_rows} rows, {rt.num_columns} cols")
    else:
        rt = pq.read_table(RAWP / "raw_codata_constants.parquet")
        assert rt.num_rows == len(rc), "row count mismatch on round-trip"
        print(f"round-trip OK (CODATA fallback): raw_codata_constants.parquet "
              f"has {rt.num_rows} rows, {rt.num_columns} cols")

    (HERE / "manifest.json").write_text(json.dumps(manifest, indent=2))
    total = sum(len(v) for v in manifest.values())
    layers = sum(1 for v in manifest.values() if v)
    print(f"wrote {total} products across {layers} layer(s) (Parquet + CSV each)")
    for layer in ("derived", "raw"):
        for p in manifest[layer]:
            print(f"  [{layer}] {p['name']}: {p['rows']} rows x {len(p['cols'])} cols")


if __name__ == "__main__":
    main()
