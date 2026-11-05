/**
 * Bibliography. Every number the app uses for a material property or a defect
 * criterion points at one of these entries by key.
 *
 * `verification` records honestly how the value was checked while building
 * this app. Several primary papers are paywalled; where the number was
 * confirmed only through a secondary source, that is stated here and shown in
 * the UI so users can decide how much to trust it.
 */
export interface Source {
  key: string;
  citation: string;
  url?: string;
  verification: string;
}

export const SOURCES = {
  rosenthal1946: {
    key: "rosenthal1946",
    citation:
      "D. Rosenthal, “The theory of moving sources of heat and its application to metal treatments,” Transactions of the ASME 68 (1946) 849–866.",
    verification:
      "Standard closed-form solution for a moving point source on a semi-infinite body; reproduced in most welding/AM heat-transfer texts.",
  },
  tang2017: {
    key: "tang2017",
    citation:
      "M. Tang, P.C. Pistorius, J.L. Beuth, “Prediction of lack-of-fusion porosity for powder bed fusion,” Additive Manufacturing 14 (2017) 39–48.",
    url: "https://doi.org/10.1016/j.addma.2016.12.001",
    verification:
      "Primary text not accessed. Criterion form (h/W)² + (t/D)² ≤ 1 confirmed from multiple later papers that restate it (e.g. NASA NTRS 20250007052 preprint; PMC9968066).",
  },
  gan2021: {
    key: "gan2021",
    citation:
      "Z. Gan et al., “Universal scaling laws of keyhole stability and porosity in 3D printing of metals,” Nature Communications 12 (2021) 2379.",
    url: "https://www.nature.com/articles/s41467-021-22704-0",
    verification:
      "Open access. Keyhole number Ke and regime boundaries (conduction Ke < ~1.4, transition ~1.4–6, keyhole Ke > ~6) taken from the published version; fitted on Ti-6Al-4V, Al6061 and SS316 X-ray data.",
  },
  johnson2019: {
    key: "johnson2019",
    citation:
      "L. Johnson et al., “Assessing printability maps in additive manufacturing of metal alloys,” Acta Materialia 176 (2019) 199–210.",
    verification:
      "Primary text not accessed. Balling threshold L/W ≥ 2.3 confirmed as attributed to Johnson et al. (and Zhang et al.) in Sheikh et al., npj Comput. Mater. (2024), https://www.nature.com/articles/s41524-024-01436-x.",
  },
  bertoli2017: {
    key: "bertoli2017",
    citation:
      "U.S. Bertoli, A.J. Wolfer, M.J. Matthews, J.-P.R. Delplanque, J.M. Schoenung, “On the limitations of volumetric energy density as a design parameter for selective laser melting,” Materials & Design 113 (2017) 331–340.",
    verification:
      "Used for the VED definition E = P/(v·h·t) and its known limitations; the definition itself is standard.",
  },
  mills2002_moose: {
    key: "mills2002_moose",
    citation:
      "K.C. Mills, Recommended Values of Thermophysical Properties for Selected Commercial Alloys, Woodhead/NPL (2002) — Type 316 curve fits as implemented in the MOOSE framework (INL), ThermalSS316Properties: k = −7.301×10⁻⁶T² + 0.02716T + 6.308; cp = 0.1816T + 428.46; ρ = −4.454×10⁻⁵T² − 0.4297T + 8089.4 (T in K, valid 25–1300 °C).",
    url: "https://mooseframework.inl.gov/source/solidproperties/ThermalSS316Properties.html",
    verification:
      "Mills book not accessed; fits read from the MOOSE documentation, which cites Mills. App evaluates them at 300 K.",
  },
  pichler2020: {
    key: "pichler2020",
    citation:
      "P. Pichler, B.J. Simonds, J.W. Sowards, G. Pottlacher, “Measurements of thermophysical properties of solid and liquid NIST SRM 316L stainless steel,” Journal of Materials Science 55 (2020).",
    url: "https://doi.org/10.1007/s10853-019-04261-6",
    verification:
      "Solidus 1675 ± 15 K and liquidus 1708 ± 30 K as reported for this SRM and restated by later NIST work citing this paper; primary table not directly read.",
  },
  upmet_174: {
    key: "upmet_174",
    citation:
      "Universal Precision Metals (Upmet), 17-4 PH stainless steel datasheet: melting range 1404–1440 °C; density 0.2820 lb/in³; thermal conductivity 17.9 W/m·K at 149 °C.",
    url: "https://www.upmet.com/sites/default/files/datasheets/17-4-ph.pdf",
    verification: "Values confirmed via search-indexed text of the datasheet (wrought material, not LPBF).",
  },
  makeitfrom_174: {
    key: "makeitfrom_174",
    citation:
      "MakeItFrom.com, “UNS S17400 (17-4 PH, Alloy 630) Stainless Steel”: specific heat 480 J/kg·K.",
    url: "https://makeitfrom.com/material-properties/UNS-S17400-17-4-PH-Alloy-630-Stainless-Steel",
    verification: "Aggregator database (room temperature, wrought). Other datasheets give 439–480 J/kg·K.",
  },
  aerospacemetals_ti64: {
    key: "aerospacemetals_ti64",
    citation:
      "Aerospace Metals, “Titanium Ti 6Al-4V Grade 5, Annealed” datasheet: solidus 1604 °C; liquidus 1660 °C; density 4.43 g/cm³.",
    url: "https://www.aerospacemetals.com/wp-content/uploads/2023/07/Titanium-Ti-6Al-4V-Grade-5-Annealed.pdf",
    verification: "Values confirmed via search-indexed datasheet text (wrought, annealed).",
  },
  makeitfrom_ti64: {
    key: "makeitfrom_ti64",
    citation:
      "MakeItFrom.com, “Grade 5 (Ti-6Al-4V, 3.7165, R56400) Titanium”: thermal conductivity 6.8 W/m·K; specific heat 560 J/kg·K.",
    url: "https://www.makeitfrom.com/material-properties/Grade-5-Ti-6Al-4V-3.7165-R56400-Titanium",
    verification:
      "Aggregator database (room temperature). Its solidus/liquidus appear swapped, so those are taken from the Aerospace Metals datasheet instead.",
  },
  ti64_absorptivity: {
    key: "ti64_absorptivity",
    citation:
      "“Determining the laser absorptivity of Ti-6Al-4V during laser powder bed fusion by calibrated melt pool simulation,” Optics & Laser Technology (2023): in-situ absorptivity 0.27 ± 0.03 at 1.07 µm.",
    url: "https://www.sciencedirect.com/science/article/abs/pii/S0030399223001408",
    verification:
      "Value confirmed from the indexed abstract; full text not accessed. Authors note surface oxide can raise absorptivity by ≥50%.",
  },
  makeitfrom_alsi10mg: {
    key: "makeitfrom_alsi10mg",
    citation:
      "MakeItFrom.com, “EN AC-43000 (AlSi10Mg(a)) F Cast Aluminum”: solidus 590 °C; liquidus 600 °C; density 2.6 g/cm³; thermal conductivity 140 W/m·K; specific heat 900 J/kg·K.",
    url: "https://www.makeitfrom.com/material-properties/EN-AC-43000-F-Cast-Aluminum",
    verification:
      "Aggregator database for the CAST alloy. LPBF as-built AlSi10Mg differs (other sources: melting range ~550–600 °C, k 100–180 W/m·K depending on build and heat treatment).",
  },
} as const satisfies Record<string, Source>;

export type SourceKey = keyof typeof SOURCES;
