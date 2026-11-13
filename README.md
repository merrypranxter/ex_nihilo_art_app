# EX NIHILO — Mathematical Genesis Lab

**From nothing, mathematics grows matter.**

An interactive, mobile-first 3D mathematical art laboratory. Its first experiment, **Nerve Cathedral**, grows persistent luminous fibers from particle trajectories moving through actual vector fields. The artwork is *constructed over time*, not loaded as a prebuilt 3D model.

## First playable proof — Nerve Cathedral

- Growing and branching agents deposit persistent 3D fiber geometry.
- Curl-derived vector field with distinct flow topologies.
- A three-dimensional occupancy grid remembers deposited matter and feeds it back into future growth.
- Direct touch/cursor attractors, repulsors, and new growth seeds; touch-orbit mode.
- Pause, adjustable speed, palette and field changes without resetting growth.
- Save/load parameter DNA, PNG export, and an explicit confirmation before wiping the living state.
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

- `src/engine.js` — mutable simulation state, flow physics, 3D occupancy and growth.
- `src/main.js` — Three.js renderer, inputs, camera, views and exporting.
- `src/styles.css` — mobile-first control layout.
- `netlify/functions/wolfram.mjs` — credential-protected, allowlisted computational request.
- `docs/ROADMAP.md` — next real simulation and material milestones.

Current limitations: CPU-side growth updates and finite mesh capacity; no volumetric reaction–diffusion yet; undo handles field-node editing, **not** rewinding all simulation time; screenshots export the current canvas, not high-resolution cinematic video. We keep these boundaries explicit.

**Principle:** construction DNA (reproducible rules/seed) is different from lived simulation state (where this particular organism has grown).
