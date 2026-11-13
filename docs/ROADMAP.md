# EX NIHILO / Construction plan

## Architectural vows

1. **Nothing starts prebuilt.** Geometry is deposited by simulated agents or produced by stateful growth.
2. **Lived state and construction DNA are different things.** DNA describes a reproducible setup; simulation checkpoints record a particular history.
3. **Math first.** New visual families require genuinely distinct dynamics, not renamed presets or generic RGB distortion.
4. **Touch edits reality.** No accidental wipes when switching modes, palettes, or tabs.
5. **Off-line-first art.** Wolfram offers on-demand insight, never renders the next frame.
6. **WebGL2 mobile as reliable baseline.** Profile on iPhone Safari before adding heavy volumetric passes.
7. **Safe keys.** Wolfram AppID resides on the server; protect the on-demand function's quota.

## Phase 01 — Nerve Cathedral (first proof)

- [x] Three-dimensional curl-field and distinct vector topologies
- [x] Persistent instanced 3D fiber deposition
- [x] Local material density memory coupled into field forces
- [x] Touch attract / repel / reseed, Orbit and zoom, undo node edits
- [x] Controls, palettes, PNG, JSON DNA, deliberate resets
- [x] Optional guarded Wolfram field Jacobian eigenvalue analysis
- [ ] Real-world iPhone Safari performance characterization
- [x] Snapshot/restore of entire lived simulation state (local JSON checkpoint)
- [x] Fixed-step deterministic replay from checkpoint (logic regression)
- [ ] Real-world cross-device consistency/performance testing

## Phase 01B — Living Ecology

- [x] Three-dimensional nutrient concentration and six-neighbor diffusion
- [x] Nutrient-directed growth with consumption and replenishment
- [x] Touch-painted nutrient injection and optional visible nutrient cloud
- [x] Complete JSON world checkpoint and restored growth-state continuity
- [x] Headless logic regression checks (deployment/browser validation still outstanding)

## Phase 02 — Living Matter

- [x] 3D cellular automata with six-neighbor local birth rules, nutrient coupling, maturation and erosion.
- [x] Touch seeding, independent crystal controls and alternate cell geometries.
- [x] Checkpoint v2 stores both independent growth engines; v1 checkpoints remain readable.
- [ ] Test crystal/fiber renderer and controls on an actual mobile browser.
- [x] First genuine 3D Gray–Scott two-chemical finite-difference solver (CPU reference, reflecting boundaries, explicit fractional Euler).
- [x] Nutrient-controlled feed, B chemotaxis, fiber catalysis and crystal consumption.
- [ ] Additional reaction systems, GPU path, sparse/adaptive 3D grids and higher resolutions.
- [x] Capped marching-tetrahedra isosurface with adjustable stride and a material for real chemical boundaries.
- [ ] Smoother normal reconstruction, true transmission, optional GPU raymarching and other optical materials.
- [x] Chemical solver step budget (1–7 steps per beat), 28³ lattice, adjustable mesh stride and triangle cap.
- [ ] Actual mobile FPS/memory profiling and adaptive quality based on runtime load.

## Phase 03 — Cross-coupled Feedback

- [x] Chemical gradients steer growing agents; deposited fibers catalyze the chemical B field.
- [x] Crystal birth consumes chemical B; chemical B biases local crystal birth probability.
- [x] Solid crystal cell voxels redirect or slide growing tips along material boundaries, with contact branching.
- [x] Chemical gradients and live isosurface tracing change actual fiber trajectories.
- [x] Occupied crystal cells restrict six-face nutrient flux and chemical A/B diffusion.
- [x] Structural rule controls and physical-contact history persist in complete world saves.
- [ ] Chemically mediated attachment/release and explicit persistent cell-surface adhesion.
- Graph-based nutrient transport and state-dependent branching.
- [x] Nutrient barrier flux stays conservative when replenishment is off (symmetric face-permeability coupling).
- [ ] Global conservation/loss diagnostics and on-canvas scientific readouts.

## Phase 03B — Compositional Art Direction

- [x] Six distinct silhouette fields exert real forces on growing agents (no prebuilt sculptures).
- [x] FORM & FINISH controls preserve existing growth; settings persist through DNA and checkpoints.
- [x] Smooth scalar-gradient normals for evolving chemical isosurfaces.
- [x] Light-responsive crystal, chemical membrane, and fiber materials with adjustable finishes and luminous halos.
- [x] Camera framing based on actually deposited geometry.
- [ ] Real iPhone visual inspection and tuning, including default growth density, composition and quality-performance tradeoffs.
- [ ] More substantial morphology-based growth control, selective coloring by material age, and improved low-cost glow treatment.

## Phase 04 — Wolfram Oracle

- Exact prepared query templates specific to each engine.
- Numerical stability checks, local Jacobians, and select parameter relations.
- Verify Wolfram interpretations rather than blindly applying ambiguous results.
- Optional cache and quota usage indicator.

## Phase 05 — Evolution

- Mutation and crossbreeding of *compatible* laws/traits with validation.
- Protected intentions, individual node identities, checkpoints, and replayable seeds.
- Three-parent genealogy experiments, kept distinct from lived state.

## Phase 06 — Output

- Deliberate high-resolution 1:1, 9:16, 16:9 still export.
- GIF and high-bitrate MP4 with smooth repeat loops; verify iOS compatibility.
- Optional low-key animated backgrounds that never overpower the grown matter.

Checkpoint format v3 now includes the independent morphogen volume, with legacy v1 and v2 restore paths. Headless deterministic replay and source/DOM checks passed; production build and real browser testing remain outstanding.

No deployment or paid external API activity is automatic.
