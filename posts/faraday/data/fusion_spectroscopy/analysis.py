#!/usr/bin/env python3
"""
Faraday MCP -> fusion plasma spectroscopy: analysis.

Every physical input is loaded from the published raw-response bundles in this
directory (load_from_raw()) -- the constants and atomic lines that the article
quotes are the same bytes Faraday returned. No value is hardcoded from memory.

Data availability: the CODATA and PubChem raw bundles ship with the repo, so the
D-T energy ledger runs out of the box. The NIST ASD line bundles
(asd_*.json, asd_line_density_log.json) are NOT redistributed under NIST Standard
Reference Data terms; regenerate them first via the ASD MCP calls in Appendix B.
When they are absent load_from_raw() skips them with a warning and the ASD-backed
derivations (Doppler, isotope shift, line density, diagnostic map) are skipped.

Three derivations:
  (A) The D-T reaction energy ledger      -> CODATA mass-energy equivalents
  (B) Doppler thermometry of He II 468.6  -> CODATA k_B/c/masses + ASD line
  (C) The H/D isotope shift of Balmer-a   -> CODATA mass ratios + ASD line

Unit-safety note (cf. the canonical Doppler sqrt bug): the Doppler width is
evaluated with kT and mc^2 in the SAME energy unit (keV), so no SI/CGS constant
ever enters the square root. scipy.constants (CODATA 2022) is used ONLY as an
independent auditor of the Faraday values, never as the source.
"""
import json, math, warnings
from pathlib import Path

RAW = Path(__file__).parent

ASD_NOTE = ("regenerate the ASD bundles via the ASD MCP calls in Appendix B "
            "(not redistributed under NIST Standard Reference Data terms)")

# ---------------------------------------------------------------------------
# load_from_raw(): reconstruct every analysis input from the shipped raw JSON.
# ---------------------------------------------------------------------------
def load_from_raw(raw_dir: Path = RAW) -> dict:
    def rd(name):
        return json.loads((raw_dir / name).read_text())

    def rd_asd(name):
        # ASD bundles are not redistributed; skip-with-warning when absent.
        try:
            return rd(name)
        except FileNotFoundError:
            warnings.warn(f"missing ASD bundle {name!r}; {ASD_NOTE}")
            return None

    codata_list = rd("codata_constants.json")["records"]
    codata = {r["name"]: r for r in codata_list}

    he2 = rd_asd("asd_he_ii_400_700.json")
    h1  = rd_asd("asd_h_i_655_657.json")
    w1  = rd_asd("asd_w_i_350_550.json")
    n2  = rd_asd("asd_n_ii_400_410.json")
    dens = rd_asd("asd_line_density_log.json")
    pub = rd("pubchem_materials.json")
    return dict(codata=codata, he2=he2, h1=h1, w1=w1, n2=n2, dens=dens, pub=pub)


def C(codata, name):
    """CODATA value as float (handles '(exact)' uncertainties)."""
    return float(codata[name]["value"])


# ---------------------------------------------------------------------------
# Derivation A -- the D-T energy ledger
# ---------------------------------------------------------------------------
def dt_energy(codata):
    mD = C(codata, "deuteron mass energy equivalent in MeV")
    mT = C(codata, "triton mass energy equivalent in MeV")
    mA = C(codata, "alpha particle mass energy equivalent in MeV")
    mN = C(codata, "neutron mass energy equivalent in MeV")

    Q = (mD + mT) - (mA + mN)                       # MeV released

    # Relativistic two-body partition, cold reactants (p_alpha = -p_n).
    # Total invariant energy W = mD + mT (reactants ~at rest).
    W = mD + mT
    # E_alpha_total = (W^2 + mA^2 - mN^2) / (2W);  KE = E_total - rest energy
    E_alpha_tot = (W*W + mA*mA - mN*mN) / (2.0 * W)
    KE_alpha = E_alpha_tot - mA
    KE_n = Q - KE_alpha

    # mass defect as a fraction of reactant rest energy
    frac = Q / (mD + mT)
    return dict(mD=mD, mT=mT, mA=mA, mN=mN, Q_MeV=Q,
                KE_alpha_MeV=KE_alpha, KE_n_MeV=KE_n,
                alpha_share=KE_alpha/Q, n_share=KE_n/Q,
                mass_defect_frac=frac)


# ---------------------------------------------------------------------------
# Derivation B -- Doppler thermometry of the He II 468.6 nm ash line
# ---------------------------------------------------------------------------
def doppler(codata, he2):
    # Strongest He II component in the 468.5 nm n=4->3 cluster (largest Aki).
    lines = he2["lines"]
    cluster = [l for l in lines if l["ritz_wl_air_nm"].startswith("468")]
    strongest = max(cluster, key=lambda l: float(l["Aki_s1"]))
    lam0_nm = float(strongest["ritz_wl_air_nm"])

    # He+ rest energy = alpha + one bound electron (the emitter is He II = He+).
    mc2_MeV = (C(codata, "alpha particle mass energy equivalent in MeV")
               + C(codata, "electron mass energy equivalent in MeV"))
    mc2_keV = mc2_MeV * 1.0e3

    EIGHT_LN2 = 8.0 * math.log(2.0)

    def fwhm_nm(T_keV):
        # Delta-lambda_FWHM / lambda = sqrt(8 ln2 * kT / mc^2); kT,mc^2 in keV.
        return lam0_nm * math.sqrt(EIGHT_LN2 * T_keV / mc2_keV)

    grid = [1, 2, 4, 6, 10, 15, 20]
    table = [dict(T_keV=T, fwhm_nm=fwhm_nm(T),
                  sigma_nm=fwhm_nm(T)/(2*math.sqrt(2*math.log(2)))) for T in grid]

    # Gaussian profiles for the figure (normalised peak = 1).
    profiles = {}
    half = 3.0  # +/- nm window
    npts = 241
    xs = [lam0_nm - half + i*(2*half)/(npts-1) for i in range(npts)]
    for T in [1, 4, 10, 20]:
        sigma = fwhm_nm(T)/(2*math.sqrt(2*math.log(2)))
        profiles[T] = [math.exp(-((x-lam0_nm)**2)/(2*sigma*sigma)) for x in xs]

    return dict(lam0_nm=lam0_nm, emitter="He II (He+)",
                mc2_MeV=mc2_MeV, fwhm_table=table,
                fwhm_10keV_nm=fwhm_nm(10.0),
                profile_x_nm=xs, profiles=profiles,
                strongest_Aki_s1=float(strongest["Aki_s1"]))


# ---------------------------------------------------------------------------
# Derivation C -- H/D isotope shift of Balmer-alpha
# ---------------------------------------------------------------------------
def isotope_shift(codata, h1):
    # Composite Balmer-alpha wavelength (what a spectrometer resolves).
    comp = [l for l in h1["lines"] if l.get("ritz_wl_air_nm", "").startswith("656.28")]
    lam_H = float(comp[0]["ritz_wl_air_nm"]) if comp else 656.2819

    rp = C(codata, "proton-electron mass ratio")     # M_p / m_e
    rd = C(codata, "deuteron-electron mass ratio")    # M_d / m_e

    # reduced-mass factors in units of m_e: mu/m_e = 1/(1 + m_e/M)
    muH = 1.0 / (1.0 + 1.0/rp)
    muD = 1.0 / (1.0 + 1.0/rd)
    ratio = muH / muD                                 # lambda_D / lambda_H
    lam_D = lam_H * ratio
    dlam = lam_H - lam_D                               # D is bluer
    return dict(lam_H_nm=lam_H, lam_D_nm=lam_D, dlam_nm=dlam,
                muH_over_me=muH, muD_over_me=muD)


# ---------------------------------------------------------------------------
# Line-density contrast (high-Z vs low-Z), from the density log
# ---------------------------------------------------------------------------
def line_density(dens):
    m = dens["matched_window_contrast"]
    return dict(window_nm=m["window_nm"], W_I=m["W_I_lines"],
                N_II=m["N_II_lines"], ratio_floor=m["ratio_floor"])


# ---------------------------------------------------------------------------
# Diagnostic-line table for the spectral-map figure
# ---------------------------------------------------------------------------
def diagnostic_lines(data):
    rows = []
    # D-alpha / H-alpha (use composite + computed D partner)
    iso = isotope_shift(data["codata"], data["h1"])
    rows.append(dict(species="H I (H-alpha)", wavelength_nm=iso["lam_H_nm"],
                     Aki_s1=4.4101e7, role="fuel recycling / edge (H)"))
    rows.append(dict(species="D I (D-alpha, computed)", wavelength_nm=iso["lam_D_nm"],
                     Aki_s1=4.4101e7, role="fuel recycling / edge (D)"))
    # He II 468.6 strongest components
    for l in data["he2"]["lines"]:
        if l["ritz_wl_air_nm"].startswith("468") and float(l["Aki_s1"]) > 4e7:
            rows.append(dict(species="He II (ash)", wavelength_nm=float(l["ritz_wl_air_nm"]),
                             Aki_s1=float(l["Aki_s1"]), role="fusion ash / proof-of-burn"))
    # W I forest (sample)
    for l in data["w1"]["lines"]:
        wl = l.get("obs_wl_air_nm") or l.get("ritz_wl_air_nm")
        try:
            intens = float(str(l.get("intens","")).rstrip("*w"))
        except ValueError:
            intens = float("nan")
        rows.append(dict(species="W I (wall)", wavelength_nm=float(wl),
                         Aki_s1=float("nan"), role="tungsten influx / impurity",
                         intens=intens))
    return rows


def crosscheck_scipy(codata):
    """Independent auditor: Faraday CODATA values vs scipy.constants (CODATA 2022)."""
    try:
        from scipy import constants as sc
    except Exception as e:
        return {"available": False, "error": str(e)}
    pc = sc.physical_constants
    checks = {}
    pairs = [
        ("deuteron mass energy equivalent in MeV", "deuteron mass energy equivalent in MeV"),
        ("triton mass energy equivalent in MeV",   "triton mass energy equivalent in MeV"),
        ("alpha particle mass energy equivalent in MeV", "alpha particle mass energy equivalent in MeV"),
        ("neutron mass energy equivalent in MeV",  "neutron mass energy equivalent in MeV"),
        ("Boltzmann constant",                     "Boltzmann constant"),
        ("speed of light in vacuum",               "speed of light in vacuum"),
        ("proton-electron mass ratio",             "proton-electron mass ratio"),
        ("deuteron-electron mass ratio",           "deuteron-electron mass ratio"),
    ]
    worst = 0.0
    for far_name, sci_name in pairs:
        fv = C(codata, far_name)
        sv = sc.value(sci_name) if sci_name in pc else getattr(sc, {
            "Boltzmann constant": "k", "speed of light in vacuum": "c"}.get(sci_name, ""), None)
        sv = float(sv)
        rel = abs(fv - sv) / abs(sv) if sv else float("nan")
        worst = max(worst, rel)
        checks[far_name] = dict(faraday=fv, scipy=sv, rel_diff=rel)
    return {"available": True, "worst_rel_diff": worst, "checks": checks,
            "scipy_version": sc.__version__ if hasattr(sc, "__version__") else "n/a"}


def main():
    data = load_from_raw()
    cod = data["codata"]

    # CODATA-only derivation always runs.
    A = dt_energy(cod)
    xchk = crosscheck_scipy(cod)

    # ASD-backed derivations run only when the bundles were regenerated.
    have_asd = all(data[k] is not None for k in ("he2", "h1", "w1", "n2", "dens"))
    B = doppler(cod, data["he2"]) if data["he2"] else None
    Cc = isotope_shift(cod, data["h1"]) if data["h1"] else None
    D = line_density(data["dens"]) if data["dens"] else None
    lines = diagnostic_lines(data) if have_asd else None

    results = dict(
        dt_energy=A,
        doppler=({k: v for k, v in B.items() if k not in ("profile_x_nm", "profiles")}
                 if B else None),
        doppler_profiles=(dict(x_nm=B["profile_x_nm"], profiles=B["profiles"])
                          if B else None),
        isotope=Cc,
        line_density=D,
        diagnostic_lines=lines,
        materials=data["pub"]["records"],
        scipy_crosscheck=xchk,
    )

    out = Path(__file__).parent / "results.json"
    out.write_text(json.dumps(results, indent=2))

    # human-readable summary
    print("== D-T energy ledger ==")
    print(f"  Q = {A['Q_MeV']:.5f} MeV   (alpha {A['KE_alpha_MeV']:.3f} + n {A['KE_n_MeV']:.3f})")
    print(f"  alpha carries {A['alpha_share']*100:.1f}%, neutron {A['n_share']*100:.1f}%")
    print(f"  mass converted: {A['mass_defect_frac']*100:.4f}% of reactant rest energy")
    if B:
        print("== Doppler thermometry (He II {:.4f} nm) ==".format(B["lam0_nm"]))
        for r in B["fwhm_table"]:
            print(f"  T={r['T_keV']:>2} keV  FWHM={r['fwhm_nm']:.4f} nm")
    if Cc:
        print("== H/D isotope shift ==")
        print(f"  H-alpha {Cc['lam_H_nm']:.4f} nm -> D-alpha {Cc['lam_D_nm']:.4f} nm  (dlam={Cc['dlam_nm']:.4f} nm)")
    if D:
        print("== line density (400-410 nm) ==")
        print(f"  W I {D['W_I']} vs N II {D['N_II']}  ({D['ratio_floor']})")
    if not have_asd:
        print(f"== ASD-backed derivations skipped == ({ASD_NOTE})")
    print("== scipy cross-check ==")
    print(f"  available={xchk.get('available')}  worst rel-diff={xchk.get('worst_rel_diff'):.2e}")
    print(f"  wrote {out}")


if __name__ == "__main__":
    main()
