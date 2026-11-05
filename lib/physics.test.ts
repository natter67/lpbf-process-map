import { describe, expect, it } from "vitest";
import { assess, diffusivity, keyholeNumber, rosenthalMeltPool, ved, type ProcessParams, type ThermalProps } from "./physics";
import { MATERIALS } from "./materials";

const steel: ThermalProps = { rho: 7956, cp: 483, k: 13.8, tMelt: 1708 };
const base: ProcessParams = {
  power: 200,
  speed: 0.8,
  hatch: 100e-6,
  layer: 30e-6,
  absorptivity: 0.35,
  beamRadius: 50e-6,
  t0: 300,
};

describe("ved", () => {
  it("matches P/(v h t) in J/mm³", () => {
    // 200 W / (800 mm/s · 0.1 mm · 0.03 mm) = 83.33 J/mm³
    expect(ved(base) / 1e9).toBeCloseTo(83.333, 2);
  });
});

describe("rosenthalMeltPool", () => {
  it("is a hemisphere of radius Q/(2πkΔT) as v → 0", () => {
    const p = { ...base, speed: 1e-7 };
    const pool = rosenthalMeltPool(steel, p);
    const r = (p.absorptivity * p.power) / (2 * Math.PI * steel.k * (steel.tMelt - p.t0));
    expect(pool.width / (2 * r)).toBeCloseTo(1, 3);
    expect(pool.length / (2 * r)).toBeCloseTo(1, 3);
  });

  it("approaches the fast-source width √(8Q/(πe ρ c v ΔT)) at high speed", () => {
    const p = { ...base, speed: 5, power: 2000 };
    const pool = rosenthalMeltPool(steel, p);
    const q = p.absorptivity * p.power;
    const wFast = Math.sqrt((8 * q) / (Math.PI * Math.E * steel.rho * steel.cp * p.speed * (steel.tMelt - p.t0)));
    expect(Math.abs(pool.width / wFast - 1)).toBeLessThan(0.03);
  });

  it("places the widest point on the melt isotherm", () => {
    const pool = rosenthalMeltPool(steel, base);
    const alpha = diffusivity(steel);
    const q = base.absorptivity * base.power;
    // Tail end of the pool on the axis must sit at T_melt.
    const tTail = base.t0 + q / (2 * Math.PI * steel.k * pool.tail);
    expect(tTail).toBeCloseTo(steel.tMelt, 6);
    // Front end too.
    const tFront =
      base.t0 + (q / (2 * Math.PI * steel.k * pool.front)) * Math.exp((-base.speed * pool.front) / alpha);
    expect(tFront).toBeCloseTo(steel.tMelt, 3);
    expect(pool.depth).toBeCloseTo(pool.width / 2, 12);
  });

  it("shrinks with speed and grows with power", () => {
    const a = rosenthalMeltPool(steel, base);
    const b = rosenthalMeltPool(steel, { ...base, speed: 1.6 });
    const c = rosenthalMeltPool(steel, { ...base, power: 300 });
    expect(b.width).toBeLessThan(a.width);
    expect(c.width).toBeGreaterThan(a.width);
  });
});

describe("criteria", () => {
  it("flags lack of fusion at low power / high speed", () => {
    const r = assess(steel, { ...base, power: 60, speed: 2.5 });
    expect(r.lackOfFusion).toBe(true);
  });

  it("flags keyhole at high power / low speed", () => {
    const r = assess(steel, { ...base, power: 400, speed: 0.2 });
    expect(r.ke).toBeGreaterThan(6);
    expect(r.keyhole).toBe(true);
  });

  it("keyhole number scales as P/√v", () => {
    const k1 = keyholeNumber(steel, base);
    const k2 = keyholeNumber(steel, { ...base, power: 2 * base.power, speed: 4 * base.speed });
    expect(k2 / k1).toBeCloseTo(1, 10);
  });

  it("produces finite results for every material", () => {
    for (const m of Object.values(MATERIALS)) {
      const props = { rho: m.density.value, cp: m.specificHeat.value, k: m.conductivity.value, tMelt: m.liquidus.value };
      const r = assess(props, base);
      expect(Number.isFinite(r.pool.width)).toBe(true);
      expect(r.pool.width).toBeGreaterThan(0);
    }
  });
});

describe("rosenthalMeltPoolFast", () => {
  it("agrees with the exact solver across the operating range", async () => {
    const { rosenthalMeltPoolFast } = await import("./physics");
    for (const power of [30, 100, 250, 500]) {
      for (const speed of [0.1, 0.5, 1.5, 3]) {
        const p = { ...base, power, speed };
        const a = rosenthalMeltPool(steel, p);
        const b = rosenthalMeltPoolFast(steel, p);
        expect(Math.abs(b.width / a.width - 1)).toBeLessThan(2e-3);
        expect(Math.abs(b.length / a.length - 1)).toBeLessThan(2e-3);
      }
    }
  });
});
