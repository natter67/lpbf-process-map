import type { SourceKey } from "./sources";

/** A single sourced value. `note` explains conversions or the temperature basis. */
export interface Sourced<T = number> {
  value: T;
  unit: string;
  source: SourceKey;
  note?: string;
}

export interface Material {
  id: MaterialId;
  name: string;
  /** Density, kg/m³ */
  density: Sourced;
  /** Specific heat, J/(kg·K) */
  specificHeat: Sourced;
  /** Thermal conductivity, W/(m·K) */
  conductivity: Sourced;
  /** Solidus, K */
  solidus: Sourced;
  /** Liquidus, K — used as the melt-pool boundary isotherm and in Ke */
  liquidus: Sourced;
  /**
   * Effective laser absorptivity at ~1.07 µm. `null` means no sourced value
   * was found; the user must supply one and the UI flags it as unsourced.
   */
  absorptivity: (Sourced & { uncertainty?: number }) | null;
  caveat?: string;
}

export type MaterialId = "316L" | "17-4PH" | "Ti64" | "AlSi10Mg";

const C_TO_K = 273.15;
const LB_PER_IN3_TO_KG_PER_M3 = 27679.9047;

// Mills (2002) Type 316 fits, as published in the MOOSE docs; evaluated at 300 K.
const T_REF = 300;
const mills316 = {
  k: -7.301e-6 * T_REF ** 2 + 0.02716 * T_REF + 6.308,
  cp: 0.1816 * T_REF + 428.46,
  rho: -4.454e-5 * T_REF ** 2 - 0.4297 * T_REF + 8089.4,
};

export const MATERIALS: Record<MaterialId, Material> = {
  "316L": {
    id: "316L",
    name: "316L stainless steel",
    density: {
      value: mills316.rho,
      unit: "kg/m³",
      source: "mills2002_moose",
      note: "Mills Type 316 fit evaluated at 300 K",
    },
    specificHeat: {
      value: mills316.cp,
      unit: "J/(kg·K)",
      source: "mills2002_moose",
      note: "Mills Type 316 fit evaluated at 300 K",
    },
    conductivity: {
      value: mills316.k,
      unit: "W/(m·K)",
      source: "mills2002_moose",
      note: "Mills Type 316 fit evaluated at 300 K",
    },
    solidus: { value: 1675, unit: "K", source: "pichler2020", note: "± 15 K" },
    liquidus: { value: 1708, unit: "K", source: "pichler2020", note: "± 30 K" },
    absorptivity: null,
  },
  "17-4PH": {
    id: "17-4PH",
    name: "17-4PH stainless steel",
    density: {
      value: 0.282 * LB_PER_IN3_TO_KG_PER_M3,
      unit: "kg/m³",
      source: "upmet_174",
      note: "converted from 0.2820 lb/in³",
    },
    specificHeat: { value: 480, unit: "J/(kg·K)", source: "makeitfrom_174", note: "room temperature" },
    conductivity: { value: 17.9, unit: "W/(m·K)", source: "upmet_174", note: "at 149 °C" },
    solidus: { value: 1404 + C_TO_K, unit: "K", source: "upmet_174", note: "1404 °C (lower end of melting range)" },
    liquidus: { value: 1440 + C_TO_K, unit: "K", source: "upmet_174", note: "1440 °C (upper end of melting range)" },
    absorptivity: null,
  },
  Ti64: {
    id: "Ti64",
    name: "Ti-6Al-4V",
    density: { value: 4430, unit: "kg/m³", source: "aerospacemetals_ti64", note: "4.43 g/cm³" },
    specificHeat: { value: 560, unit: "J/(kg·K)", source: "makeitfrom_ti64", note: "room temperature" },
    conductivity: { value: 6.8, unit: "W/(m·K)", source: "makeitfrom_ti64", note: "room temperature" },
    solidus: { value: 1604 + C_TO_K, unit: "K", source: "aerospacemetals_ti64", note: "1604 °C" },
    liquidus: { value: 1660 + C_TO_K, unit: "K", source: "aerospacemetals_ti64", note: "1660 °C" },
    absorptivity: {
      value: 0.27,
      uncertainty: 0.03,
      unit: "–",
      source: "ti64_absorptivity",
      note: "in-situ LPBF, 1.07 µm",
    },
  },
  AlSi10Mg: {
    id: "AlSi10Mg",
    name: "AlSi10Mg",
    density: { value: 2600, unit: "kg/m³", source: "makeitfrom_alsi10mg", note: "2.6 g/cm³, cast alloy" },
    specificHeat: { value: 900, unit: "J/(kg·K)", source: "makeitfrom_alsi10mg", note: "cast alloy" },
    conductivity: { value: 140, unit: "W/(m·K)", source: "makeitfrom_alsi10mg", note: "cast alloy" },
    solidus: { value: 590 + C_TO_K, unit: "K", source: "makeitfrom_alsi10mg", note: "590 °C, cast alloy" },
    liquidus: { value: 600 + C_TO_K, unit: "K", source: "makeitfrom_alsi10mg", note: "600 °C, cast alloy" },
    absorptivity: null,
    caveat:
      "Properties are for the cast alloy (EN AC-43000 F). LPBF as-built AlSi10Mg has a finer microstructure and different conductivity; no single sourced as-built set was found.",
  },
};

export const MATERIAL_ORDER: MaterialId[] = ["316L", "17-4PH", "Ti64", "AlSi10Mg"];
