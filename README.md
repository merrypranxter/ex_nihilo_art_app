# EX NIHILO — Mathematical Genesis Lab

**From nothing, mathematics grows matter.**

An interactive, mobile-first 3D mathematical art laboratory. Its first experiment, **Nerve Cathedral**, grows persistent luminous fibers from particle trajectories moving through actual vector fields. A second engine, **Crystal Colony**, grows a genuinely three-dimensional cellular automaton with local birth, maturation and erosion rules. The artwork is *constructed over time*, not loaded as a prebuilt 3D model.

## First playable proof — Nerve Cathedral

- Growing and branching agents deposit persistent 3D fiber geometry.
- Curl-derived vector field with distinct flow topologies.
- A three-dimensional occupancy grid remembers deposited matter and feeds it back into future growth.
- Direct touch/cursor attractors, repulsors, and new growth seeds; touch-orbit mode.
- Pause, adjustable speed, palette and field changes without resetting growth.
- Save/load parameter DNA **and complete living-world checkpoints**, PNG export, and an explicit confirmation before wiping the living state.
- Three-dimensional nutrient diffusion, localized chemical injections, consumption by growing fiber tips, and nutrient-guided growth.
- Separate **Crystal Colony** cellular automaton: six-neighbor frontier growth, mineralization, configurable erosion, touch-placed cell seeds, independent pause, and three cell glyph geometries. The fiber and cellular engines share nutrient chemistry.
- Optional visible nutrient volume for investigating where growth is headed.
- Optional server-side Wolfram|Alpha local Jacobian/eigenvalue analysis; no API key in the browser.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints. Production build: `npm run build` (output: `dist/`).

## Deploy when you choose

Compatible with Netlify (config in `netlify.toml`). No automatic deployment or paid service is triggered by this repository. The art runs without Wolfram.

### Optional Wolfram developer AppID

The browser **never** receives your Wolfram AppID.

1. Add `WOLFRAM_APP_ID` as a Netlify environment variable.
2. Set `WOLFRAM_ACCESS_TOKEN` to a **different, long random secret** to protect your API quota.
3. In the Wolfram tab, enter that access token only (not your Wolfram AppID) to unlock on-demand requests. The token is kept in memory for this tab and is not committed or stored as part of your art DNA.
4. Use a Netlify deployment for the serverless function. The Vite dev server alone does not serve Netlify Functions; use `netlify dev` if testing that feature locally.

Wolfram is consulted only when you press **Analyze field**. It receives a numerical 3×3 local field Jacobian, and returns computational analysis. It does *not* drive animation.

## Architecture

- `src/engine.js` — mutable simulation state, flow physics, 3D occupancy, growth and full-world serialization.
- `src/ecology.js` — real three-dimensional nutrient concentration field, finite-difference diffusion, consumption and replenishment.
- `src/colony.js` — synchronous 3D cellular automaton with nutrient-weighted births, mineralization and erosion; no prebuilt object.
- `tests/biology.test.js`, `tests/colony.test.js` — chemistry, cellular dynamics and checkpoint regression tests (`npm test`).
- `src/main.js` — Three.js renderer, inputs, camera, views and exporting.
- `src/styles.css` — mobile-first control layout.
- `netlify/functions/wolfram.mjs` — credential-protected, allowlisted computational request.
- `docs/ROADMAP.md` — next real simulation and material milestones.

Current limitations: CPU-side growth updates and finite mesh capacity; the crystal colony is a discrete local-rule cellular automaton, **not yet** a volumetric reaction–diffusion simulator; undo handles field-node editing, **not** rewinding all simulation time; saving/loading a world uses a JSON file; screenshots export the current canvas, not high-resolution cinematic video. We keep these boundaries explicit.

**Principle:** construction DNA (reproducible rules/seed) is different from lived simulation state (where this particular organism has grown).
\n## What not to assume\n\nNo live browser/device benchmark or production Vite build has been run yet. These commits include source-level validation and a headless mathematical-state replay check, but need a normal `npm install && npm test && npm run build` followed by a real iPhone Safari smoke test before release.\n