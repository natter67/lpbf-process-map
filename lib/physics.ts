/**
 * LPBF process-window physics. All functions use SI units internally.
 *
 *  - Volumetric energy density   E = P / (v·h·t)                [bertoli2017]
 *  - Melt pool from Rosenthal moving point source on a semi-infinite body:
 *      T − T0 = (A·P) / (2π·k·R) · exp(−v(ξ + R) / (2α))          [rosenthal1946]
 *    with ξ the coordinate along the scan direction measured from the source
 *    (positive ahead of it) and R = √(ξ² + y² + z²).
 *  - Lack of fusion:   (h/W)² + (t/D)² > 1                         [tang2017]
 *  - Keyhole number:   Ke = A·P / ((T_l − T0)·π·ρ·cp·√(α·v·r0³))     [gan2021]
 *      conduction Ke < 1.4, transition 1.4–6, keyhole Ke > 6
 *  - Balling:          L/W ≥ 2.3                                   [johnson2019]
 */

export interface ThermalProps {
  /** kg/m³ */
  rho: number;
  /** J/(kg·K) */
  cp: number;
  /** W/(m·K) */
  k: number;
  /** Isotherm that bounds the melt pool, K */
  tMelt: number;
}

export interface ProcessParams {
  /** Laser power, W */
  power: number;
  /** Scan speed, m/s */
  speed: number;
  /** Hatch spacing, m */
  hatch: number;
  /** Layer thickness, m */
  layer: number;
  /** Absorptivity, 0–1 */
  absorptivity: number;
  /** 1/e² beam radius, m (used only by the keyhole number) */
  beamRadius: number;
  /** Substrate / preheat temperature, K */
  t0: number;
}

export interface MeltPool {
  /** Full width, m */
  width: number;
  /** Depth below the surface, m */
  depth: number;
  /** Total length (front + tail), m */
  length: number;
  front: number;
  tail: number;
}

export const CRITERIA = {
  lofLimit: 1, // Tang et al. 2017
  keConduction: 1.4, // Gan et al. 2021
  keKeyhole: 6.0, // Gan et al. 2021
  ballingLW: 2.3, // Johnson et al. 2019
} as const;

export const diffusivity = (m: ThermalProps) => m.k / (m.rho * m.cp);

/** Volumetric energy density, J/m³. */
export function ved(p: Pick<ProcessParams, "power" | "speed" | "hatch" | "layer">): number {
  return p.power / (p.speed * p.hatch * p.layer);
}

function bisect(f: (x: number) => number, lo: number, hi: number, iters = 60): number {
  let flo = f(lo);
  for (let i = 0; i < iters; i++) {
    const mid = 0.5 * (lo + hi);
    const fm = f(mid);
    if (fm === 0) return mid;
    if (Math.sign(fm) === Math.sign(flo)) {
      lo = mid;
      flo = fm;
    } else {
      hi = mid;
    }
  }
  return 0.5 * (lo + hi);
}

/**
 * Rosenthal melt-pool dimensions bounded by the `tMelt` isotherm.
 *
 * For a surface point source the isotherms depend only on R and ξ, so every
 * transverse cross-section is a semicircle: depth = width / 2 exactly. This is
 * a property of the model, not of real melt pools (see Assumptions panel).
 */
export function rosenthalMeltPool(m: ThermalProps, p: ProcessParams): MeltPool {
  const q = p.absorptivity * p.power;
  const dT = m.tMelt - p.t0;
  const alpha = diffusivity(m);
  const v = p.speed;
  if (q <= 0 || dT <= 0 || v <= 0) return { width: 0, depth: 0, length: 0, front: 0, tail: 0 };

  const c = q / (2 * Math.PI * m.k); // K·m

  // Behind the source on the axis ξ < 0, R = −ξ, so exp term = 1.
  const tail = c / dT;
  // Ahead of the source on the axis: c/ξ · exp(−vξ/α) = dT.
  const front = bisect((x) => (c / x) * Math.exp((-v * x) / alpha) - dT, tail * 1e-9, tail);

  // Radial half-extent at a given ξ: solve c/R · exp(−v(ξ+R)/(2α)) = dT for R ≥ |ξ|.
  const halfWidthAt = (xi: number): number => {
    const g = (r: number) => (c / r) * Math.exp((-v * (xi + r)) / (2 * alpha)) - dT;
    const rMin = Math.max(Math.abs(xi), tail * 1e-9);
    if (g(rMin) <= 0) return 0;
    const r = bisect(g, rMin, tail);
    return Math.sqrt(Math.max(r * r - xi * xi, 0));
  };

  // Coarse scan followed by golden-section refinement for the maximum.
  const N = 64;
  let best = -1;
  let bestW = 0;
  for (let i = 0; i <= N; i++) {
    const xi = -tail + ((front + tail) * i) / N;
    const w = halfWidthAt(xi);
    if (w > bestW) {
      bestW = w;
      best = xi;
    }
  }
  const step = (front + tail) / N;
  let a = Math.max(-tail, best - step);
  let b = Math.min(front, best + step);
  const gr = (Math.sqrt(5) - 1) / 2;
  let x1 = b - gr * (b - a);
  let x2 = a + gr * (b - a);
  let f1 = halfWidthAt(x1);
  let f2 = halfWidthAt(x2);
  for (let i = 0; i < 40; i++) {
    if (f1 < f2) {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = a + gr * (b - a);
      f2 = halfWidthAt(x2);
    } else {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = b - gr * (b - a);
      f1 = halfWidthAt(x1);
    }
  }
  const half = Math.max(bestW, f1, f2);
  return { width: 2 * half, depth: half, length: front + tail, front, tail };
}

/** Keyhole number of Gan et al. (2021). Dimensionless. */
export function keyholeNumber(m: ThermalProps, p: ProcessParams): number {
  const alpha = diffusivity(m);
  return (
    (p.absorptivity * p.power) /
    ((m.tMelt - p.t0) * Math.PI * m.rho * m.cp * Math.sqrt(alpha * p.speed * p.beamRadius ** 3))
  );
}

export interface Assessment {
  ved: number;
  pool: MeltPool;
  ke: number;
  /** Tang et al. LoF index (h/W)² + (t/D)²; > 1 → lack of fusion */
  lofIndex: number;
  lengthToWidth: number;
  lackOfFusion: boolean;
  keyhole: boolean;
  keyholeTransition: boolean;
  balling: boolean;
}

export function assess(m: ThermalProps, p: ProcessParams): Assessment {
  return assessWith(m, p, rosenthalMeltPool(m, p));
}

function assessWith(m: ThermalProps, p: ProcessParams, pool: MeltPool): Assessment {
  const ke = keyholeNumber(m, p);
  const lofIndex =
    pool.width > 0 && pool.depth > 0 ? (p.hatch / pool.width) ** 2 + (p.layer / pool.depth) ** 2 : Infinity;
  const lengthToWidth = pool.width > 0 ? pool.length / pool.width : 0;
  return {
    ved: ved(p),
    pool,
    ke,
    lofIndex,
    lengthToWidth,
    lackOfFusion: lofIndex > CRITERIA.lofLimit,
    keyhole: ke > CRITERIA.keKeyhole,
    keyholeTransition: ke > CRITERIA.keConduction && ke <= CRITERIA.keKeyhole,
    balling: pool.width > 0 && lengthToWidth >= CRITERIA.ballingLW,
  };
}

/* ------------------------------------------------------------------------ *
 * Fast evaluation for the map.
 *
 * Scaling ξ, R by l = 2α/v turns the Rosenthal isotherm into
 *     n / R' · exp(−(ξ' + R')) = 1,   n = Q·v / (4π·k·α·ΔT),
 * so every melt-pool dimension is l · f(n) with f material-independent.
 * f is tabulated once with the exact solver and interpolated in log–log.
 * ------------------------------------------------------------------------ */
const N_MIN = 1e-5;
const N_MAX = 1e6;
const N_PTS = 600;
let table: { logN: Float64Array; w: Float64Array; l: Float64Array; front: Float64Array } | null = null;

function buildTable() {
  const unit: ThermalProps = { rho: 1, cp: 1, k: 1, tMelt: 1 };
  const logN = new Float64Array(N_PTS);
  const w = new Float64Array(N_PTS);
  const l = new Float64Array(N_PTS);
  const front = new Float64Array(N_PTS);
  for (let i = 0; i < N_PTS; i++) {
    const ln = Math.log(N_MIN) + ((Math.log(N_MAX) - Math.log(N_MIN)) * i) / (N_PTS - 1);
    const n = Math.exp(ln);
    // α = 1, v = 2 → l = 1; Q = 2π·n gives c = n.
    const pool = rosenthalMeltPool(unit, {
      power: 2 * Math.PI * n,
      absorptivity: 1,
      speed: 2,
      t0: 0,
      hatch: 1,
      layer: 1,
      beamRadius: 1,
    });
    logN[i] = ln;
    w[i] = Math.log(pool.width);
    l[i] = Math.log(pool.length);
    front[i] = Math.log(pool.front);
  }
  table = { logN, w, l, front };
  return table;
}

/** Same result as {@link rosenthalMeltPool} (to ≲0.1 %), ~1000× faster. */
export function rosenthalMeltPoolFast(m: ThermalProps, p: ProcessParams): MeltPool {
  const q = p.absorptivity * p.power;
  const dT = m.tMelt - p.t0;
  const alpha = diffusivity(m);
  if (q <= 0 || dT <= 0 || p.speed <= 0) return { width: 0, depth: 0, length: 0, front: 0, tail: 0 };
  const n = (q * p.speed) / (4 * Math.PI * m.k * alpha * dT);
  if (n < N_MIN || n > N_MAX) return rosenthalMeltPool(m, p);
  const t = table ?? buildTable();
  const x = ((Math.log(n) - t.logN[0]) / (t.logN[N_PTS - 1] - t.logN[0])) * (N_PTS - 1);
  const i = Math.min(Math.floor(x), N_PTS - 2);
  const f = x - i;
  const lerp = (arr: Float64Array) => Math.exp(arr[i] * (1 - f) + arr[i + 1] * f);
  const scale = (2 * alpha) / p.speed;
  const width = lerp(t.w) * scale;
  const length = lerp(t.l) * scale;
  const front = lerp(t.front) * scale;
  return { width, depth: width / 2, length, front, tail: length - front };
}

export function assessFast(m: ThermalProps, p: ProcessParams): Assessment {
  return assessWith(m, p, rosenthalMeltPoolFast(m, p));
}
