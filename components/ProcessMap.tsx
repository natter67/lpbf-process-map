"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { assess, assessFast, CRITERIA, type ProcessParams, type ThermalProps } from "@/lib/physics";

export interface MapRange {
  pMin: number; // W
  pMax: number;
  vMin: number; // mm/s
  vMax: number;
}

export interface Layers {
  lof: boolean;
  keyhole: boolean;
  balling: boolean;
}

interface Props {
  layers: Layers;
  props: ThermalProps;
  params: ProcessParams;
  range: MapRange;
  onPick: (powerW: number, speedMmS: number) => void;
}

const CSS_W = 760;
const CSS_H = 500;
const M = { l: 62, r: 16, t: 14, b: 48 };
const NX = 152;
const NY = 100;

interface Palette {
  bg: string;
  text: string;
  muted: string;
  grid: string;
  lof: [number, number, number];
  keyhole: [number, number, number];
  balling: [number, number, number];
  ok: [number, number, number];
}

const LIGHT: Palette = {
  bg: "#ffffff",
  text: "#1c1d1f",
  muted: "#5d6168",
  grid: "#e6e5e0",
  lof: [59, 116, 217],
  keyhole: [214, 69, 61],
  balling: [217, 154, 30],
  ok: [63, 156, 107],
};
const DARK: Palette = {
  bg: "#1d1f22",
  text: "#e8e8e6",
  muted: "#a0a4ab",
  grid: "#2c2f33",
  lof: [92, 143, 232],
  keyhole: [229, 96, 90],
  balling: [227, 171, 58],
  ok: [79, 181, 130],
};

const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function usePalette(): Palette {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setDark(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return dark ? DARK : LIGHT;
}

function niceTicks(min: number, max: number, count = 6): number[] {
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let x = Math.ceil(min / step) * step; x <= max + 1e-9; x += step) out.push(Math.round(x * 1e6) / 1e6);
  return out;
}

export default function ProcessMap({ layers, props, params, range, onPick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const palette = usePalette();
  const [hover, setHover] = useState<string>("");

  const plotW = CSS_W - M.l - M.r;
  const plotH = CSS_H - M.t - M.b;
  const xOf = (v: number) => M.l + ((v - range.vMin) / (range.vMax - range.vMin)) * plotW;
  const yOf = (p: number) => M.t + (1 - (p - range.pMin) / (range.pMax - range.pMin)) * plotH;

  // Flags per cell: bit0 LoF, bit1 keyhole, bit2 balling.
  const grid = useMemo(() => {
    const flags = new Uint8Array(NX * NY);
    for (let j = 0; j < NY; j++) {
      const P = range.pMin + ((j + 0.5) / NY) * (range.pMax - range.pMin);
      for (let i = 0; i < NX; i++) {
        const v = (range.vMin + ((i + 0.5) / NX) * (range.vMax - range.vMin)) / 1000;
        const a = assessFast(props, { ...params, power: P, speed: v });
        flags[j * NX + i] = (a.lackOfFusion ? 1 : 0) | (a.keyhole ? 2 : 0) | (a.balling ? 4 : 0);
      }
    }
    return flags;
  }, [props, params.absorptivity, params.beamRadius, params.t0, params.hatch, params.layer, range]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CSS_W * dpr;
    canvas.height = CSS_H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, CSS_W, CSS_H);

    // Region fills. Keyhole takes precedence over lack of fusion because the
    // conduction depth used by the LoF test is meaningless in keyhole mode.
    // Balling is drawn as hatching on top so it never hides the other two.
    const cw = plotW / NX;
    const ch = plotH / NY;
    const mask = (layers.lof ? 1 : 0) | (layers.keyhole ? 2 : 0) | (layers.balling ? 4 : 0);
    const hatch = document.createElement("canvas");
    hatch.width = hatch.height = 8;
    const hc = hatch.getContext("2d")!;
    hc.strokeStyle = rgba(palette.balling, 0.95);
    hc.lineWidth = 1.4;
    hc.beginPath();
    hc.moveTo(0, 8);
    hc.lineTo(8, 0);
    hc.moveTo(-2, 2);
    hc.lineTo(2, -2);
    hc.moveTo(6, 10);
    hc.lineTo(10, 6);
    hc.stroke();
    const hatchPattern = ctx.createPattern(hatch, "repeat")!;
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const f = grid[j * NX + i] & mask;
        const x = M.l + i * cw;
        const y = M.t + plotH - (j + 1) * ch;
        ctx.fillStyle =
          f & 2 ? rgba(palette.keyhole, 0.42) : f & 1 ? rgba(palette.lof, 0.42) : f & 4 ? rgba(palette.balling, 0.12) : rgba(palette.ok, 0.28);
        ctx.fillRect(x, y, cw + 0.5, ch + 0.5);
        if (f & 4) {
          ctx.fillStyle = hatchPattern;
          ctx.fillRect(x, y, cw + 0.5, ch + 0.5);
        }
      }
    }

    // Region boundaries along cell edges.
    const edge = (bit: number, col: [number, number, number]) => {
      ctx.strokeStyle = rgba(col, 1);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let j = 0; j < NY; j++) {
        for (let i = 0; i < NX; i++) {
          const a = grid[j * NX + i] & bit;
          const x = M.l + i * cw;
          const y = M.t + plotH - (j + 1) * ch;
          if (i + 1 < NX && a !== (grid[j * NX + i + 1] & bit)) {
            ctx.moveTo(x + cw, y);
            ctx.lineTo(x + cw, y + ch);
          }
          if (j + 1 < NY && a !== (grid[(j + 1) * NX + i] & bit)) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + cw, y);
          }
        }
      }
      ctx.stroke();
    };
    if (layers.lof) edge(1, palette.lof);
    if (layers.keyhole) edge(2, palette.keyhole);
    if (layers.balling) edge(4, palette.balling);

    ctx.save();
    ctx.beginPath();
    ctx.rect(M.l, M.t, plotW, plotH);
    ctx.clip();

    // Ke = 1.4 (conduction → transition) boundary, analytic: P ∝ √v.
    if (layers.keyhole) {
      const ke1 = assess(props, { ...params, power: 1, speed: 1 }).ke; // Ke at P = 1 W, v = 1 m/s
      ctx.strokeStyle = rgba(palette.keyhole, 0.9);
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let s = 0; s <= 100; s++) {
        const v = range.vMin + ((range.vMax - range.vMin) * s) / 100;
        const P = (CRITERIA.keConduction / ke1) * Math.sqrt(v / 1000);
        if (s === 0) ctx.moveTo(xOf(v), yOf(P));
        else ctx.lineTo(xOf(v), yOf(P));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // VED isolines: P = E·v·h·t.
    ctx.strokeStyle = palette.muted;
    ctx.fillStyle = palette.muted;
    ctx.font = "11px system-ui, sans-serif";
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 3]);
    const ht = params.hatch * params.layer; // m²
    for (const E of [20, 40, 60, 80, 120, 200, 300]) {
      const Ejm3 = E * 1e9;
      const p0 = Ejm3 * (range.vMin / 1000) * ht;
      const p1 = Ejm3 * (range.vMax / 1000) * ht;
      ctx.beginPath();
      ctx.moveTo(xOf(range.vMin), yOf(p0));
      ctx.lineTo(xOf(range.vMax), yOf(p1));
      ctx.stroke();
      // Label at the edge where the line leaves the plot.
      const vAtTop = range.pMax / (Ejm3 * ht) * 1000;
      const [lx, ly] =
        vAtTop < range.vMax ? [xOf(vAtTop) + 3, M.t + 11] : [xOf(range.vMax) - 64, yOf(p1) - 4];
      if (lx > M.l && ly < M.t + plotH) ctx.fillText(`${E} J/mm³`, lx, ly);
    }
    ctx.setLineDash([]);

    // Operating point.
    const ox = xOf(params.speed * 1000);
    const oy = yOf(params.power);
    ctx.strokeStyle = palette.text;
    ctx.fillStyle = palette.bg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ox, oy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox - 10, oy);
    ctx.lineTo(ox + 10, oy);
    ctx.moveTo(ox, oy - 10);
    ctx.lineTo(ox, oy + 10);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Axes.
    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = 1;
    ctx.strokeRect(M.l, M.t, plotW, plotH);
    ctx.fillStyle = palette.text;
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (const v of niceTicks(range.vMin, range.vMax, 7)) {
      const x = xOf(v);
      ctx.beginPath();
      ctx.moveTo(x, M.t + plotH);
      ctx.lineTo(x, M.t + plotH + 5);
      ctx.stroke();
      ctx.fillText(String(v), x, M.t + plotH + 18);
    }
    ctx.fillText("Scan speed v (mm/s)", M.l + plotW / 2, CSS_H - 8);
    ctx.textAlign = "right";
    for (const p of niceTicks(range.pMin, range.pMax, 6)) {
      const y = yOf(p);
      ctx.beginPath();
      ctx.moveTo(M.l - 5, y);
      ctx.lineTo(M.l, y);
      ctx.stroke();
      ctx.fillText(String(p), M.l - 8, y + 4);
    }
    ctx.save();
    ctx.translate(16, M.t + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("Laser power P (W)", 0, 0);
    ctx.restore();
  }, [grid, layers, palette, params, props, range]); // eslint-disable-line react-hooks/exhaustive-deps

  const toData = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CSS_W;
    const y = ((e.clientY - rect.top) / rect.height) * CSS_H;
    if (x < M.l || x > M.l + plotW || y < M.t || y > M.t + plotH) return null;
    const v = range.vMin + ((x - M.l) / plotW) * (range.vMax - range.vMin);
    const P = range.pMin + (1 - (y - M.t) / plotH) * (range.pMax - range.pMin);
    return { v, P };
  };

  return (
    <div className="mapwrap">
      <canvas
        ref={canvasRef}
        style={{ aspectRatio: `${CSS_W} / ${CSS_H}` }}
        role="img"
        aria-label="Process map of laser power versus scan speed with lack-of-fusion, keyhole and balling regions"
        onPointerMove={(e) => {
          const d = toData(e);
          if (!d) return setHover("");
          const a = assessFast(props, { ...params, power: d.P, speed: d.v / 1000 });
          const tags = [
            layers.lof && a.lackOfFusion && "LoF",
            layers.keyhole && a.keyhole && "keyhole",
            layers.balling && a.balling && "balling",
          ].filter(Boolean);
          setHover(
            `P=${d.P.toFixed(0)} W  v=${d.v.toFixed(0)} mm/s  E=${(a.ved / 1e9).toFixed(1)} J/mm³  ` +
              `W=${(a.pool.width * 1e6).toFixed(0)} µm  L/W=${a.lengthToWidth.toFixed(1)}  Ke=${a.ke.toFixed(2)}  ${tags.length ? tags.join(", ") : "no criterion triggered"}`,
          );
          if (e.buttons === 1) onPick(d.P, d.v);
        }}
        onPointerDown={(e) => {
          const d = toData(e);
          if (d) onPick(d.P, d.v);
        }}
        onPointerLeave={() => setHover("")}
      />
      <div className="readout" aria-live="polite">
        {hover || "Hover the map to inspect a point; click or drag to move the operating point."}
      </div>
    </div>
  );
}
