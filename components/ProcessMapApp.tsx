"use client";

import { useMemo, useState } from "react";
import { MATERIALS, MATERIAL_ORDER, type Material, type MaterialId, type Sourced } from "@/lib/materials";
import { assess, CRITERIA, diffusivity, type ProcessParams, type ThermalProps } from "@/lib/physics";
import { SOURCES } from "@/lib/sources";
import { Cite, SOURCE_KEYS } from "./Cite";
import ProcessMap, { type Layers, type MapRange } from "./ProcessMap";

interface SliderProps {
  label: React.ReactNode;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function Slider({ label, unit, value, min, max, step, onChange }: SliderProps) {
  return (
    <label className="field">
      <span className="row">
        <span>{label}</span>
        <span>
          <input
            type="number"
            value={Number(value.toFixed(6))}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) onChange(v);
            }}
          />{" "}
          <span className="hint">{unit}</span>
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

const fmt = (x: number, digits = 3) =>
  !Number.isFinite(x) ? "—" : Math.abs(x) >= 1000 ? x.toFixed(0) : x.toPrecision(digits);

function PropRow({ name, sym, s, digits = 4 }: { name: string; sym: string; s: Sourced; digits?: number }) {
  return (
    <tr>
      <td>
        {name} <code>{sym}</code>
      </td>
      <td className="num">
        {fmt(s.value, digits)} {s.unit}
      </td>
      <td>
        {s.note && <span className="hint">{s.note} </span>}
        <Cite k={s.source} />
      </td>
    </tr>
  );
}

const thermalOf = (m: Material): ThermalProps => ({
  rho: m.density.value,
  cp: m.specificHeat.value,
  k: m.conductivity.value,
  tMelt: m.liquidus.value,
});

export default function ProcessMapApp() {
  const [materialId, setMaterialId] = useState<MaterialId>("Ti64");
  const material = MATERIALS[materialId];

  const [power, setPower] = useState(200); // W
  const [speed, setSpeed] = useState(1000); // mm/s
  const [hatch, setHatch] = useState(100); // µm
  const [layer, setLayer] = useState(30); // µm
  const [beamRadius, setBeamRadius] = useState(50); // µm
  const [t0, setT0] = useState(298); // K
  const [userAbs, setUserAbs] = useState<Partial<Record<MaterialId, number>>>({});
  const [layers, setLayers] = useState<Layers>({ lof: true, keyhole: true, balling: true });
  const [range, setRange] = useState<MapRange>({ pMin: 25, pMax: 500, vMin: 100, vMax: 3000 });

  const sourcedAbs = material.absorptivity?.value;
  const absorptivity = userAbs[materialId] ?? sourcedAbs ?? null;
  const absIsSourced = userAbs[materialId] === undefined && sourcedAbs !== undefined;

  const props = useMemo(() => thermalOf(material), [material]);
  const params: ProcessParams | null =
    absorptivity === null
      ? null
      : {
          power,
          speed: speed / 1000,
          hatch: hatch * 1e-6,
          layer: layer * 1e-6,
          absorptivity,
          beamRadius: beamRadius * 1e-6,
          t0,
        };
  const result = params ? assess(props, params) : null;

  const stableParams = useMemo(
    () => params,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [power, speed, hatch, layer, absorptivity, beamRadius, t0],
  );

  const chip = (on: boolean, label: string, color: string, cite: React.ReactNode) => (
    <span className={`chip${on ? " on" : ""}`} style={on ? { background: color } : undefined}>
      {label}: {on ? "yes" : "no"} {cite}
    </span>
  );

  return (
    <main>
      <header>
        <h1>LPBF process map</h1>
        <p>
          Laser powder bed fusion process window from a Rosenthal moving-point-source melt-pool estimate
          <Cite k="rosenthal1946" /> and published defect criteria. Every material property and threshold below is
          numbered against the reference list at the bottom of the page, with a note on how it was checked.
        </p>
      </header>

      <div className="layout">
        <div className="stack">
          <section className="panel">
            <h2>Inputs</h2>
            <label className="field">
              <span className="row">Material</span>
              <select value={materialId} onChange={(e) => setMaterialId(e.target.value as MaterialId)}>
                {MATERIAL_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {MATERIALS[id].name}
                  </option>
                ))}
              </select>
            </label>
            <Slider label="Laser power P" unit="W" value={power} min={10} max={1000} step={1} onChange={setPower} />
            <Slider label="Scan speed v" unit="mm/s" value={speed} min={50} max={4000} step={10} onChange={setSpeed} />
            <Slider label="Hatch spacing h" unit="µm" value={hatch} min={20} max={250} step={1} onChange={setHatch} />
            <Slider label="Layer thickness t" unit="µm" value={layer} min={10} max={120} step={1} onChange={setLayer} />

            <h3>Model parameters</h3>
            <label className="field">
              <span className="row">
                <span>Absorptivity A</span>
                <span>
                  <input
                    type="number"
                    min={0.01}
                    max={1}
                    step={0.01}
                    placeholder="enter"
                    value={absorptivity ?? ""}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setUserAbs((u) => {
                        const next = { ...u };
                        if (Number.isFinite(v) && v > 0 && v <= 1) next[materialId] = v;
                        else delete next[materialId];
                        return next;
                      });
                    }}
                  />{" "}
                  <span className="hint">–</span>
                </span>
              </span>
            </label>
            {absIsSourced && material.absorptivity ? (
              <p className="hint">
                Sourced: {material.absorptivity.value} ± {material.absorptivity.uncertainty} (
                {material.absorptivity.note})<Cite k={material.absorptivity.source} />
              </p>
            ) : material.absorptivity === null ? (
              <p className="warn">
                No sourced absorptivity found for {material.name}. Enter your own value; results then depend on an
                unsourced input.
              </p>
            ) : (
              <p className="warn">
                Overriding sourced value ({material.absorptivity?.value}).{" "}
                <button
                  type="button"
                  onClick={() =>
                    setUserAbs((u) => {
                      const n = { ...u };
                      delete n[materialId];
                      return n;
                    })
                  }
                >
                  Reset
                </button>
              </p>
            )}
            <Slider
              label={
                <>
                  Beam radius r₀
                </>
              }
              unit="µm"
              value={beamRadius}
              min={10}
              max={150}
              step={1}
              onChange={setBeamRadius}
            />
            <Slider label="Substrate temperature T₀" unit="K" value={t0} min={273} max={800} step={1} onChange={setT0} />
            <p className="hint">
              r₀ is used only in Ke and should follow the spot-radius definition of Gan et al.<Cite k="gan2021" />.
              Beam radius, T₀ and absorptivity are machine/operator inputs, not material properties; the defaults for
              r₀ and T₀ are placeholders, not sourced values.
            </p>
          </section>

          <section className="panel">
            <h2>Material properties: {material.name}</h2>
            <div className="tablewrap">
              <table>
                <tbody>
                  <PropRow name="Density" sym="ρ" s={material.density} />
                  <PropRow name="Specific heat" sym="cp" s={material.specificHeat} />
                  <PropRow name="Conductivity" sym="k" s={material.conductivity} />
                  <PropRow name="Solidus" sym="Tₛ" s={material.solidus} />
                  <PropRow name="Liquidus" sym="Tₗ" s={material.liquidus} />
                  <tr>
                    <td>
                      Diffusivity <code>α = k/ρcp</code>
                    </td>
                    <td className="num">{(diffusivity(props) * 1e6).toPrecision(3)} mm²/s</td>
                    <td className="hint">derived</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {material.caveat && <p className="warn">{material.caveat}</p>}
            <p className="hint">
              All properties are single room-temperature (or near-ambient) values for dense wrought/cast metal; the
              melt-pool boundary is taken as the liquidus isotherm.
            </p>
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <h2>Process map at h = {hatch} µm, t = {layer} µm</h2>
            {params && stableParams ? (
              <ProcessMap
                layers={layers}
                props={props}
                params={stableParams}
                range={range}
                onPick={(P, v) => {
                  setPower(Math.round(P));
                  setSpeed(Math.round(v / 10) * 10);
                }}
              />
            ) : (
              <p className="warn">Enter an absorptivity to draw the map for {material.name}.</p>
            )}
            <div className="legend">
              <span>
                <span className="sw" style={{ background: "var(--ok)", opacity: 0.6 }} />
                No enabled criterion triggered
              </span>
              <label>
                <input type="checkbox" checked={layers.lof} onChange={(e) => setLayers({ ...layers, lof: e.target.checked })} />{" "}
                <span className="sw" style={{ background: "var(--lof)" }} />
                Lack of fusion<Cite k="tang2017" />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={layers.keyhole}
                  onChange={(e) => setLayers({ ...layers, keyhole: e.target.checked })}
                />{" "}
                <span className="sw" style={{ background: "var(--keyhole)" }} />
                Keyhole, Ke &gt; {CRITERIA.keKeyhole} (dashed: Ke = {CRITERIA.keConduction})
                <Cite k="gan2021" />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={layers.balling}
                  onChange={(e) => setLayers({ ...layers, balling: e.target.checked })}
                />{" "}
                <span className="sw hatch" />
                Balling, L/W ≥ {CRITERIA.ballingLW}
                <Cite k="johnson2019" />
              </label>
              <span>
                <span className="sw" style={{ borderTop: "1.5px dotted var(--muted)", height: 0 }} />
                VED isolines<Cite k="bertoli2017" />
              </span>
            </div>
            <p className="hint">
              Keyhole fill takes precedence over lack of fusion. Rosenthal pools are long and thin: L/W climbs steeply
              with speed (it has no upper bound in the fast-source limit), so the balling hatching covers most of the
              map. That says more about the model than about real balling. Untick it to see the other boundaries.
            </p>
            <div className="ranges">
              <span className="hint">Axes:</span>
              {(
                [
                  ["pMin", "P min"],
                  ["pMax", "P max"],
                  ["vMin", "v min"],
                  ["vMax", "v max"],
                ] as const
              ).map(([key, lab]) => (
                <label key={key}>
                  {lab}{" "}
                  <input
                    type="number"
                    value={range[key]}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isFinite(v) || v <= 0) return;
                      const next = { ...range, [key]: v };
                      if (next.pMax > next.pMin && next.vMax > next.vMin) setRange(next);
                    }}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Operating point</h2>
            {result && params ? (
              <>
                <div className="metrics">
                  <div className="metric">
                    <div className="k">
                      Energy density E = P/(v·h·t)
                      <Cite k="bertoli2017" />
                    </div>
                    <div className="v">{(result.ved / 1e9).toFixed(1)} J/mm³</div>
                  </div>
                  <div className="metric">
                    <div className="k">
                      Melt-pool width W<Cite k="rosenthal1946" />
                    </div>
                    <div className="v">{(result.pool.width * 1e6).toFixed(1)} µm</div>
                  </div>
                  <div className="metric">
                    <div className="k">
                      Depth D = W/2<Cite k="rosenthal1946" />
                    </div>
                    <div className="v">{(result.pool.depth * 1e6).toFixed(1)} µm</div>
                  </div>
                  <div className="metric">
                    <div className="k">
                      Length L<Cite k="rosenthal1946" />
                    </div>
                    <div className="v">{(result.pool.length * 1e6).toFixed(0)} µm</div>
                  </div>
                  <div className="metric">
                    <div className="k">
                      LoF index (h/W)² + (t/D)²
                      <Cite k="tang2017" />
                    </div>
                    <div className="v">{fmt(result.lofIndex)}</div>
                  </div>
                  <div className="metric">
                    <div className="k">
                      Keyhole number Ke
                      <Cite k="gan2021" />
                    </div>
                    <div className="v">{fmt(result.ke)}</div>
                  </div>
                  <div className="metric">
                    <div className="k">
                      L/W
                      <Cite k="johnson2019" />
                    </div>
                    <div className="v">{fmt(result.lengthToWidth)}</div>
                  </div>
                </div>
                <div className="verdicts">
                  {chip(result.lackOfFusion, "Lack of fusion", "var(--lof)", <Cite k="tang2017" />)}
                  {chip(result.keyhole, "Keyhole", "var(--keyhole)", <Cite k="gan2021" />)}
                  {chip(result.balling, "Balling", "var(--balling)", <Cite k="johnson2019" />)}
                  <span className="chip">
                    Melting mode:{" "}
                    {result.ke > CRITERIA.keKeyhole
                      ? "keyhole"
                      : result.ke > CRITERIA.keConduction
                        ? "transition"
                        : "conduction"}
                    <Cite k="gan2021" />
                  </span>
                </div>
                {!absIsSourced && (
                  <p className="warn" style={{ marginTop: 12 }}>
                    These numbers use a user-supplied absorptivity ({absorptivity}), not a sourced value.
                  </p>
                )}
                {result.keyhole && (
                  <p className="warn" style={{ marginTop: 12 }}>
                    In keyhole mode the real pool is much deeper than the conduction (Rosenthal) depth, so the
                    lack-of-fusion and balling predictions here are not meaningful.
                  </p>
                )}
              </>
            ) : (
              <p className="warn">Enter an absorptivity to evaluate this operating point.</p>
            )}
          </section>

          <section className="panel">
            <h2>Criteria used</h2>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Defect</th>
                    <th>Criterion</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Lack of fusion</td>
                    <td>
                      <code>(h/W)² + (t/D)² &gt; 1</code> — adjacent tracks and layers fail to overlap
                    </td>
                    <td>
                      Tang et al. 2017<Cite k="tang2017" />
                    </td>
                  </tr>
                  <tr>
                    <td>Keyhole</td>
                    <td>
                      <code>Ke = A·P / ((Tₗ − T₀)·π·ρ·cp·√(α·v·r₀³)) &gt; 6</code>; transition for 1.4 &lt; Ke ≤ 6
                    </td>
                    <td>
                      Gan et al. 2021<Cite k="gan2021" />
                    </td>
                  </tr>
                  <tr>
                    <td>Balling</td>
                    <td>
                      <code>L/W ≥ 2.3</code> (Plateau–Rayleigh-type instability of an elongated pool)
                    </td>
                    <td>
                      Johnson et al. 2019<Cite k="johnson2019" />
                    </td>
                  </tr>
                  <tr>
                    <td>Melt pool</td>
                    <td>
                      <code>T − T₀ = A·P/(2πkR) · exp(−v(ξ+R)/2α)</code>, boundary at T = Tₗ
                    </td>
                    <td>
                      Rosenthal 1946<Cite k="rosenthal1946" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="hint">
              Width/depth-ratio keyhole criteria (e.g. W/D ≤ 1.5 in printability-map papers) are deliberately not used:
              for a Rosenthal point source W/D is identically 2, so such a criterion could never trigger.
            </p>
          </section>

          <section className="panel assumptions">
            <h2>Assumptions and limits</h2>
            <p>
              The Rosenthal solution<Cite k="rosenthal1946" /> is a quasi-steady, linear heat-conduction result. It
              ignores:
            </p>
            <ul>
              <li>
                <strong>Beam size.</strong> The source is a point, so temperature is infinite at the beam centre and the
                pool is wrong when it is not much larger than the beam. Beam radius enters only through Ke.
              </li>
              <li>
                <strong>Pool shape.</strong> Every cross-section is a semicircle, so D = W/2 always. Shallow conduction
                pools and deep keyhole pools are both outside what it can represent.
              </li>
              <li>
                <strong>Fluid flow.</strong> No Marangoni convection, which widens and flattens real pools, and no recoil
                pressure, which drills keyholes. In keyhole mode the true depth can be several times the Rosenthal depth.
              </li>
              <li>
                <strong>Latent heat.</strong> Melting and vaporisation enthalpy are not included, and nothing is lost to
                evaporation, radiation or convection at the surface.
              </li>
              <li>
                <strong>Temperature-dependent properties.</strong> k, ρ and cp are constants (here near room
                temperature). For steels and Ti-6Al-4V, conductivity and diffusivity rise with temperature, so this tends to
                over-predict pool size and, through α in Ke, to push the keyhole boundary to lower power. Liquid
                properties are never used.
              </li>
              <li>
                <strong>Powder.</strong> The body is dense, semi-infinite and homogeneous. Powder has much lower effective
                conductivity and packing density, and the effective powder layer after consolidation is thicker than the
                nominal layer thickness t.
              </li>
              <li>
                <strong>Thermal history.</strong> Single track, steady state, no heat build-up from previous tracks or
                layers, no part geometry, edges or scan turnarounds. Preheat is represented only by T₀.
              </li>
              <li>
                <strong>Absorptivity.</strong> Constant. In reality it rises sharply once a vapour depression forms
                (multiple reflections), and oxide can change it substantially<Cite k="ti64_absorptivity" />.
              </li>
            </ul>
            <p>Limits of the criteria themselves:</p>
            <ul>
              <li>
                Tang et al.<Cite k="tang2017" /> assume idealised, identical, regularly stacked pools and give no margin
                for pool-to-pool variability, which later work shows matters for fatigue-relevant porosity.
              </li>
              <li>
                Ke thresholds<Cite k="gan2021" /> were fitted to synchrotron X-ray data for Ti-6Al-4V, Al6061 and SS316
                at specific spot sizes (44–70 µm). Using them for 17-4PH and AlSi10Mg, or far outside that spot range, is an
                extrapolation.
              </li>
              <li>
                The L/W ≥ 2.3 balling threshold<Cite k="johnson2019" /> is empirical. Other papers propose π or 2π, and
                some argue no fixed L/W threshold predicts balling reliably.
              </li>
              <li>
                Volumetric energy density is shown for orientation only: points with equal E can behave very differently
                <Cite k="bertoli2017" />.
              </li>
              <li>
                The map has not been calibrated against any machine. Treat boundaries as qualitative trends, and calibrate
                against single-track and density-cube experiments before relying on them.
              </li>
            </ul>
          </section>

          <section className="panel">
            <h2>Values I could not source (left out)</h2>
            <ul>
              <li>
                Laser absorptivity for 316L, 17-4PH and AlSi10Mg. Published calorimetry exists, but I could not confirm a
                specific value per alloy, so the user must enter one.
              </li>
              <li>
                As-built LPBF AlSi10Mg properties as one consistent set. Cast EN AC-43000 values are used and flagged.
              </li>
              <li>Temperature-dependent property data for 17-4PH, Ti-6Al-4V and AlSi10Mg.</li>
              <li>
                The exact equation for the King et al. (2014) normalised-enthalpy keyhole threshold could not be checked
                against the original paper, so it was replaced by the Gan et al. keyhole number.
              </li>
            </ul>
          </section>

          <section className="panel">
            <h2>References</h2>
            <ol className="refs">
              {SOURCE_KEYS.map((k) => {
                const s = SOURCES[k];
                return (
                  <li key={k} id={`ref-${k}`}>
                    {s.citation}{" "}
                    {"url" in s && s.url && (
                      <a href={s.url} target="_blank" rel="noreferrer">
                        link
                      </a>
                    )}
                    <span className="ver">How checked: {s.verification}</span>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>
    </main>
  );
}
