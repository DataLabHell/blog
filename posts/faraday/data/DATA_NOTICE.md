# Data licensing notice

**The third-party-derived scientific data files in this directory are NOT
covered by the repository's Apache-2.0 license.** Apache-2.0 covers the
project's source code and project-authored metadata/scripts only. The scientific
datasets here are derived from third-party databases and remain © their
respective owners, subject to each provider's own terms of use. Data Lab Hell
GmbH makes no licensing grant over those provider-derived datasets and they may
not be sublicensed under Apache-2.0.

These small derived/illustrative samples are included solely to document and
reproduce the accompanying blog articles. To obtain the underlying data, query
the live sources yourself (e.g. via the Faraday MCP tools shown in each article's
"MCP call log" appendix).

`manifest.yml` maps every shipped data/metadata artifact in this directory to
its source, row count, artifact type, and redistribution status.

## What was intentionally **not** redistributed

Bulk verbatim reproductions of the upstream compilations are deliberately **not**
committed to this repository. Specifically removed: full HITRAN line-by-line
transition lists, full-resolution NIST WebBook IR spectra, and raw NIST Atomic
Spectra Database line/level dumps. Regenerate these on demand via the documented
Faraday MCP tool calls; do not re-add the raw dumps.

If older generation instructions in this directory request all raw upstream data
as downloadable Parquet files, this notice supersedes that instruction: raw
HITRAN line lists, full NIST WebBook spectra, and raw NIST ASD dumps must remain
regenerate-only unless explicit redistribution permission or a documented legal
basis is obtained.

## Per-source terms

| Source | Files | Terms |
|---|---|---|
| **NIST Chemistry WebBook** (Standard Reference Database 69) | See `manifest.yml` entries with `source: NIST Chemistry WebBook SRD 69`. | NIST **Standard Reference Data** is copyrighted by the U.S. Secretary of Commerce under the Standard Reference Data Act (15 U.S.C. 290e) and is **not** public domain. Small coefficient/summary subsets are retained for article illustration; reproduction of NIST SRD generally requires NIST permission. See <https://www.nist.gov/srd/public-law>. |
| **NIST Atomic Spectra Database** (SRD 78) | See `manifest.yml` entries with `source: NIST ASD SRD 78`. | NIST SRD 78, same SRD terms as above. See <https://www.nist.gov/pml/atomic-spectra-database> and <https://www.nist.gov/srd/public-law>. |
| **HITRAN** (HITRAN2024) | `hitran_band_summary.*` aggregate tables. | The HITRAN compilation carries no open-redistribution license in this repository; use is conditioned on citing the edition: I. E. Gordon et al., *The HITRAN2024 molecular spectroscopic database*, J. Quant. Spectrosc. Radiat. Transfer **353**, 109807 (2026). See <https://hitran.org/citepolicy/>. |
| **NIST CODATA 2022** | `codata_constants.*`, `raw_codata_constants.*`, and CODATA-derived figure tables listed in `manifest.yml`. | Internationally recommended values of the fundamental physical constants are scientific facts; attribution to NIST CODATA 2022 is requested. Verify critical values against <https://physics.nist.gov/cuu/Constants/>. |
| **PubChem (NIH/NLM)** | `pubchem_*`, `raw_pubchem_*`, `pubchem_materials.json`. | NCBI states that it places no restrictions on reuse or distribution of molecular data, but NCBI cannot grant rights held by submitters or other third parties. Do not assume protected fields are freely redistributable. CAS Registry Numbers have been omitted from bundled datasets. See <https://www.ncbi.nlm.nih.gov/home/about/policies/>. |
| **MassBank of North America (MoNA)** | No MoNA spectra are bundled here. Runtime tool output is CC-BY-attributed. | MoNA's public documentation states database content is CC BY 4.0 by default; credit MoNA, link the license, and indicate changes. See <https://mona.fiehnlab.ucdavis.edu/documentation/license>. |

"Retrieved via the Faraday MCP server" describes the *method* of access only; it
does not alter or grant any redistribution right under the upstream terms above.
