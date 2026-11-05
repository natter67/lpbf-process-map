# LPBF process map

An interactive Next.js + TypeScript app that maps the laser powder bed fusion (LPBF) process window for
**316L, 17-4PH, Ti-6Al-4V and AlSi10Mg**.

- **Inputs:** laser power, scan speed, hatch spacing, layer thickness. Absorptivity, beam radius and substrate
  temperature are also inputs.
- **Outputs:** volumetric energy density, Rosenthal point-source melt-pool width, depth and length, and a P–v map
  shaded for:
  - **Lack of fusion:** `(h/W)² + (t/D)² > 1` (Tang, Pistorius & Beuth, *Addit. Manuf.* 2017)
  - **Keyhole:** keyhole number `Ke > 6`, with transition from 1.4 (Gan et al., *Nat. Commun.* 2021)
  - **Balling:** `L/W ≥ 2.3` (Johnson et al., *Acta Mater.* 2019)
- Every material property and criterion carries a numbered citation in the UI, with a note on how it was checked.
- An **Assumptions and limits** panel covers what Rosenthal ignores. A **Values I could not source** panel
  lists what was left out.

All physics lives in `lib/physics.ts`. Material data is in `lib/materials.ts` and the bibliography in `lib/sources.ts`.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # physics unit tests (analytic limits of the Rosenthal solution, criteria)
npm run build
```

## Deploy

Import the repository in Vercel. It auto-detects Next.js; no environment variables are needed. The page is fully
static and all computation runs in the browser.
