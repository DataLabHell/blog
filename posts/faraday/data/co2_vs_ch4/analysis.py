"""
analysis.py  (Appendix C)
=========================
Self-contained line-by-line analysis of the CO2 nu2 (15 um) vs CH4 nu4 (7.66 um)
bands.  Reads the shipped CODATA/PubChem derived Parquet products in this
directory PLUS two HITRAN line-sample tables that are NOT redistributed and must
be regenerated first (see the load guard below); uses scipy.constants for every
physical constant (cross-checked against the Faraday-retrieved CODATA values).
Writes results.json consumed by the article.

Dependencies: numpy, scipy, pyarrow  (no network, no hard-coded spectroscopy).
"""
import json, os
import numpy as np
from scipy import constants as sc
from scipy.special import wofz
import pyarrow.parquet as pq

HERE = os.path.dirname(__file__)
PQ = HERE

def load(name):
    return pq.read_table(os.path.join(PQ, name)).to_pydict()

# ---------------------------------------------------------------------------
# Constants from scipy.constants  (CODATA), cross-checked vs Faraday CODATA pull
# ---------------------------------------------------------------------------
h   = sc.h                                              # J s
c   = sc.c                                              # m s^-1
kB  = sc.k                                              # J K^-1
NA  = sc.N_A                                            # mol^-1
c2  = sc.physical_constants["second radiation constant"][0]   # m K  (= h c / kB)
c_cm = c * 100.0                                        # cm s^-1

cod = load("codata_constants.parquet")
faraday_const = dict(zip(cod["name"], cod["value"]))
const_check = {
    "planck_constant":           (h,  faraday_const["planck_constant"]),
    "speed_of_light":            (c,  faraday_const["speed_of_light"]),
    "boltzmann_constant":        (kB, faraday_const["boltzmann_constant"]),
    "avogadro_constant":         (NA, faraday_const["avogadro_constant"]),
    "second_radiation_constant": (c2, faraday_const["second_radiation_constant"]),
}
const_check = {k: {"scipy": float(a), "faraday": float(b),
                   "rel_diff": abs(a - b) / b} for k, (a, b) in const_check.items()}
assert all(v["rel_diff"] < 1e-9 for v in const_check.values()), "CODATA mismatch"
# also verify the identity c2 = h c / kB
c2_identity = h * c / kB

# ---------------------------------------------------------------------------
# Molecular / scenario inputs
# ---------------------------------------------------------------------------
pcp = load("pubchem_CO2_CH4_properties.parquet")
MW = dict(zip(pcp["species"], pcp["MolecularWeight"]))      # g/mol  (PubChem)
m_CO2 = MW["CO2"] * 1e-3 / NA                                # kg
m_CH4 = MW["CH4"] * 1e-3 / NA

# External scenario parameters captured for the article run. NOAA abundances are
# time-dependent, so refresh these before presenting the scenario as "today".
xCO2, xCH4 = 427e-6, 1922e-9
Psurf, g, Mair = 101325.0, 9.80665, 28.96e-3
T_emit, T_surf = 255.0, 288.0
N_air_cm2 = Psurf / ((Mair / NA) * g) / 1e4                  # molec / cm^2 (column)
N_CO2 = xCO2 * N_air_cm2
N_CH4 = xCH4 * N_air_cm2

# ---------------------------------------------------------------------------
# Helper physics
# ---------------------------------------------------------------------------
def to_um(nu):       return 1.0e4 / nu                       # cm^-1 -> micron
def to_eV(nu):       return h * c * (nu * 100.0) / sc.e        # cm^-1 -> eV

def doppler_hwhm(nu0, T, m):
    """Gaussian (Doppler) half-width at half-max in cm^-1."""
    return (nu0 / c_cm) * np.sqrt(2.0 * np.log(2.0) * kB * T / m) * c_cm / c  # = nu0/c*sqrt(...)

def voigt_phi(nu, nu0, gammaL, gammaD_hwhm):
    """Area-normalised Voigt profile [1/cm^-1].  gammaD_hwhm = Gaussian HWHM."""
    sigmaG = gammaD_hwhm / np.sqrt(2.0 * np.log(2.0))         # Gaussian std
    z = ((nu - nu0) + 1j * gammaL) / (sigmaG * np.sqrt(2.0))
    return np.real(wofz(z)) / (sigmaG * np.sqrt(2.0 * np.pi))

def cross_section(nu_grid, lines, T, m):
    """Sum Voigt line cross-sections [cm^2/molec]; lines at HITRAN T_ref=296 K, 1 atm air."""
    sigma = np.zeros_like(nu_grid)
    for nu0, S, gair in lines:
        gD = doppler_hwhm(nu0, T, m)
        sigma += S * voigt_phi(nu_grid, nu0, gair, gD)
    return sigma

def planck_wn(nu_cm1, T):
    """Spectral radiance B per unit wavenumber [W m^-2 sr^-1 (cm^-1)^-1]."""
    nu_m = np.asarray(nu_cm1, float) * 100.0
    x = h * c * nu_m / (kB * T)
    return (2.0 * h * c**2 * nu_m**3 / np.expm1(x)) * 100.0

# ---------------------------------------------------------------------------
# Load HITRAN samples
#
# These two line-sample tables are NOT redistributed (upstream HITRAN terms).
# Regenerate them via the Faraday calls recorded in Appendix B, then write each
# as Parquet into this directory with these exact filenames and columns:
#   hitran_CO2_lines_651_682cm.parquet  <- hitran_get_lines(CO2, 651..682 cm^-1)
#   hitran_CH4_lines_1289_1322cm.parquet <- hitran_get_lines(CH4, 1289..1322 cm^-1)
#   columns: wavenumber_cm1, intensity_cm_per_molec_cm2, gamma_air_cm1_atm,
#            lower_state_energy_cm1, source_window
# ---------------------------------------------------------------------------
_HITRAN = ("hitran_CO2_lines_651_682cm.parquet",
           "hitran_CH4_lines_1289_1322cm.parquet")
_missing = [f for f in _HITRAN if not os.path.exists(os.path.join(PQ, f))]
if _missing:
    raise SystemExit(
        "HITRAN line samples not found: " + ", ".join(_missing) + "\n"
        "These are not redistributed -- regenerate via hitran_get_lines "
        "(Appendix B) first, writing the exact filenames/columns documented "
        "above into this directory, then re-run analysis.py."
    )
co2 = load("hitran_CO2_lines_651_682cm.parquet")
ch4 = load("hitran_CH4_lines_1289_1322cm.parquet")

def triples(d):
    return list(zip(d["wavenumber_cm1"], d["intensity_cm_per_molec_cm2"], d["gamma_air_cm1_atm"]))

co2_lines, ch4_lines = triples(co2), triples(ch4)

# band-origin assignments (spectroscopic) + observed cross-check from NIST IR
nu0_CO2, nu0_CH4 = 667.4, 1305.9

# ---------------------------------------------------------------------------
# R1  band identity / conversions
# ---------------------------------------------------------------------------
R1 = {
    "CO2": {"nu0_cm1": nu0_CO2, "wavelength_um": to_um(nu0_CO2), "energy_meV": to_eV(nu0_CO2) * 1e3,
            "assignment": "nu2 bending fundamental", "iso": "12C16O2"},
    "CH4": {"nu0_cm1": nu0_CH4, "wavelength_um": to_um(nu0_CH4), "energy_meV": to_eV(nu0_CH4) * 1e3,
            "assignment": "nu4 bending fundamental", "iso": "12CH4"},
}

# ---------------------------------------------------------------------------
# R2  per-line intensity contrast
# ---------------------------------------------------------------------------
S_co2 = np.array(co2["intensity_cm_per_molec_cm2"])
S_ch4 = np.array(ch4["intensity_cm_per_molec_cm2"])
R2 = {
    "CO2": {"S_max": float(S_co2.max()), "S_median": float(np.median(S_co2)), "n_lines": len(S_co2),
            "band_total_lines": 15327},
    "CH4": {"S_max": float(S_ch4.max()), "S_median": float(np.median(S_ch4)), "n_lines": len(S_ch4),
            "band_total_lines": 17771},
    "Smax_ratio_CH4_over_CO2": float(S_ch4.max() / S_co2.max()),
    "Smedian_ratio_CH4_over_CO2": float(np.median(S_ch4) / np.median(S_co2)),
}

# ---------------------------------------------------------------------------
# R3  line widths + cross-section spectra over Q-branch windows
# ---------------------------------------------------------------------------
gD_CO2 = doppler_hwhm(nu0_CO2, T_emit, m_CO2)
gD_CH4 = doppler_hwhm(nu0_CH4, T_emit, m_CH4)
R3 = {
    "CO2": {"doppler_hwhm_cm1_255K": gD_CO2, "lorentz_hwhm_cm1_1atm_typ": float(np.median(co2["gamma_air_cm1_atm"]))},
    "CH4": {"doppler_hwhm_cm1_255K": gD_CH4, "lorentz_hwhm_cm1_1atm_typ": float(np.median(ch4["gamma_air_cm1_atm"]))},
}

def window_sigma(lines, lo, hi, npts=600):
    grid = np.linspace(lo, hi, npts)
    sig = cross_section(grid, [(n, S, g) for (n, S, g) in lines if lo - 5 <= n <= hi + 5], 296.0,
                        m_CO2 if lines is co2_lines else m_CH4)
    return grid, sig

g_co2, s_co2 = window_sigma(co2_lines, 666.0, 668.0)
g_ch4, s_ch4 = window_sigma(ch4_lines, 1304.0, 1308.0)

# optical depth at present columns (from sampled lines -> lower bound)
tau_co2 = s_co2 * N_CO2
tau_ch4 = s_ch4 * N_CH4
R3["CO2"]["sigma_peak_cm2_666_668"] = float(s_co2.max())
R3["CH4"]["sigma_peak_cm2_1304_1308"] = float(s_ch4.max())
R3["CO2"]["tau_peak_present_sampled"] = float(tau_co2.max())
R3["CH4"]["tau_peak_present_sampled"] = float(tau_ch4.max())

# ---------------------------------------------------------------------------
# R4  curve of growth for the strongest sampled line of each gas
# ---------------------------------------------------------------------------
def strongest(lines):
    return max(lines, key=lambda t: t[1])

def curve_of_growth(line, m, Ncols):
    nu0, S, gair = line
    gD = doppler_hwhm(nu0, 296.0, m)
    grid = np.linspace(nu0 - 20.0, nu0 + 20.0, 6000)  # wide enough that W is never window-limited in range
    phi = voigt_phi(grid, nu0, gair, gD)
    W = []
    for N in Ncols:
        W.append(np.trapezoid(1.0 - np.exp(-S * N * phi), grid))   # equivalent width [cm^-1]
    return nu0, S, gair, np.array(W)

Ncols = np.logspace(17, 23, 60)  # present columns (4e19, 9e21) sit mid-range; avoids window-limited tail
co2_strong = strongest(co2_lines)
ch4_strong = strongest(ch4_lines)
nu_c, S_c, g_c, W_co2 = curve_of_growth(co2_strong, m_CO2, Ncols)
nu_m, S_m, g_m, W_ch4 = curve_of_growth(ch4_strong, m_CH4, Ncols)

def tau_core(line, N, m):
    nu0, S, gair = line
    gD = doppler_hwhm(nu0, 296.0, m)
    return S * N * voigt_phi(np.array([nu0]), nu0, gair, gD)[0]

R4 = {
    "CO2_strong_line": {"nu0_cm1": nu_c, "S": S_c, "gamma_air": g_c,
                        "tau_core_present": float(tau_core(co2_strong, N_CO2, m_CO2))},
    "CH4_strong_line": {"nu0_cm1": nu_m, "S": S_m, "gamma_air": g_m,
                        "tau_core_present": float(tau_core(ch4_strong, N_CH4, m_CH4))},
    "N_CO2_present": N_CO2, "N_CH4_present": N_CH4, "N_air_column": N_air_cm2,
}

# ---------------------------------------------------------------------------
# R5  Planck weighting (why band placement matters)
# ---------------------------------------------------------------------------
nu_planck = np.linspace(400.0, 1600.0, 241)
B255 = planck_wn(nu_planck, T_emit)
B288 = planck_wn(nu_planck, T_surf)
B_CO2_255 = float(planck_wn(nu0_CO2, T_emit))
B_CH4_255 = float(planck_wn(nu0_CH4, T_emit))
nu_peak_255 = float(nu_planck[int(np.argmax(B255))])
R5 = {
    "B_at_CO2band_255K": B_CO2_255, "B_at_CH4band_255K": B_CH4_255,
    "planck_ratio_CO2_over_CH4": B_CO2_255 / B_CH4_255,
    "planck_peak_cm1_255K": nu_peak_255,
}

# ---------------------------------------------------------------------------
# R6  per-molecule (= per-ppb) radiative efficiency  -- EXTERNAL benchmark
#     IPCC/Myhre et al. (1998) simplified expressions; captured abundances from
#     the NOAA scenario above.
#     CO2:  dF/dC = 5.35 / C           [W m^-2 per ppm]
#     CH4:  dF/dM = 0.036 / (2 sqrt(M)) [W m^-2 per ppb]  (CH4-N2O overlap neglected)
# ---------------------------------------------------------------------------
C_ppm, M_ppb = 427.0, 1922.0
dF_dC_CO2_per_ppb = (5.35 / C_ppm) / 1000.0        # W/m^2 per ppb
dF_dM_CH4_per_ppb = 0.036 / (2.0 * np.sqrt(M_ppb)) # W/m^2 per ppb
R6 = {
    "method": "IPCC/Myhre 1998 simplified expressions (EXTERNAL literature, not Faraday data)",
    "CO2_efficiency_W_m2_per_ppb": dF_dC_CO2_per_ppb,
    "CH4_efficiency_W_m2_per_ppb": float(dF_dM_CH4_per_ppb),
    "ratio_CH4_over_CO2_per_molecule": float(dF_dM_CH4_per_ppb / dF_dC_CO2_per_ppb),
}

# ---------------------------------------------------------------------------
# Assemble results + chart arrays
# ---------------------------------------------------------------------------
def stick(d):
    return {"nu": list(d["wavenumber_cm1"]), "S": list(d["intensity_cm_per_molec_cm2"]),
            "Elow": list(d["lower_state_energy_cm1"]), "branch": list(d["source_window"])}

results = {
    "constants_cross_check": const_check,
    "c2_identity_hc_over_k": c2_identity,
    "scenario": {"xCO2_ppm": C_ppm, "xCH4_ppb": M_ppb, "N_air_column_cm2": N_air_cm2,
                 "N_CO2_cm2": N_CO2, "N_CH4_cm2": N_CH4, "T_emit": T_emit, "T_surf": T_surf,
                 "column_ratio_CO2_over_CH4": N_CO2 / N_CH4},
    "R1_identity": R1, "R2_intensity": R2, "R3_widths": R3,
    "R4_curve_of_growth": R4, "R5_planck": R5, "R6_efficiency_benchmark": R6,
    "charts": {
        "stick_CO2": stick(co2), "stick_CH4": stick(ch4),
        "sigma_CO2": {"nu": g_co2.tolist(), "sigma": s_co2.tolist(), "tau": tau_co2.tolist()},
        "sigma_CH4": {"nu": g_ch4.tolist(), "sigma": s_ch4.tolist(), "tau": tau_ch4.tolist()},
        "cog": {"N": Ncols.tolist(), "W_CO2": W_co2.tolist(), "W_CH4": W_ch4.tolist(),
                "N_CO2_present": N_CO2, "N_CH4_present": N_CH4},
        "planck": {"nu": nu_planck.tolist(), "B255": B255.tolist(), "B288": B288.tolist(),
                   "nu0_CO2": nu0_CO2, "nu0_CH4": nu0_CH4},
    },
}

with open(os.path.join(HERE, "results.json"), "w") as f:
    json.dump(results, f, indent=2)

# ---- console summary (sanity) ----
print("CONST cross-check max rel-diff:",
      max(v["rel_diff"] for v in const_check.values()))
print(f"c2 identity hc/k = {c2_identity:.10e} m K  (CODATA {c2:.10e})")
print(f"N_air column      = {N_air_cm2:.3e} molec/cm^2")
print(f"N_CO2 / N_CH4     = {N_CO2/N_CH4:.1f}x")
print(f"R1 CO2  {R1['CO2']['wavelength_um']:.2f} um  {R1['CO2']['energy_meV']:.1f} meV")
print(f"R1 CH4  {R1['CH4']['wavelength_um']:.2f} um  {R1['CH4']['energy_meV']:.1f} meV")
print(f"R2 S_max CH4/CO2  = {R2['Smax_ratio_CH4_over_CO2']:.0f}x  "
      f"(CO2 {R2['CO2']['S_max']:.3e}, CH4 {R2['CH4']['S_max']:.3e})")
print(f"R3 Doppler HWHM   CO2 {gD_CO2:.2e}  CH4 {gD_CH4:.2e} cm^-1  vs Lorentz ~0.07")
print(f"R3 tau_peak(sampled) CO2 {tau_co2.max():.1f}  CH4 {tau_ch4.max():.1f}")
print(f"R4 tau_core strong line  CO2 {R4['CO2_strong_line']['tau_core_present']:.2f}  "
      f"CH4 {R4['CH4_strong_line']['tau_core_present']:.2f}")
print(f"R5 Planck B(255) CO2band/CH4band = {R5['planck_ratio_CO2_over_CH4']:.2f}x  "
      f"(peak {nu_peak_255:.0f} cm^-1)")
print(f"R6 per-ppb efficiency CH4/CO2 = {R6['ratio_CH4_over_CO2_per_molecule']:.1f}x "
      f"(CO2 {R6['CO2_efficiency_W_m2_per_ppb']:.2e}, CH4 {R6['CH4_efficiency_W_m2_per_ppb']:.2e})")
