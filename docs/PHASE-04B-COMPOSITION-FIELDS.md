# EX NIHILO / Phase 04B — Spatial Composition Is Physical

This follows PR #19, Surface Art. The independent 192² crystalline surface has gained deliberate growth composition **without replacing the original 3D world or painting over history**.

## Four new control families

- **GROWTH BOUNDARY:** OPEN (legacy), ROSE WINDOW (radial vaulted pores), BRAIDED RIVERS (meandering growth channels), INTERFERENCE LACE (interacting periodic fields). Boundaries define **which future cells mineral growth can occupy**. They are not alpha masks drawn over a finished picture. Existing deposits remain present after any change.
- **RESISTANT / EMPTY TERRITORY:** 0–95%. At 0, the gate is a strict no-op. Raising it progressively disallows more future sites for patterned voids. OPEN ignores this slider.
- **PHYSICS ACROSS THE CANVAS:** SINGLE LAW (exact legacy behavior), INTERFERENCE BIOMES or VORTEX TERRITORIES. The latter use mathematical regional fields to choose **spherulite, dendritic or strata laws per birth**. Their front affinities, deposition phases, branching suppression, and empty-space retention then vary by actual site. They are not three images composited with opacity.
- **SEED SYMMETRY:** FREE, BILATERAL, FOUR-WAY, SIXFOLD. New seeds (including touch/drag and reseed) create independent real symmetric founder sites. This is not mirrored raster output, and the subsequent stochastic growth need not be perfectly symmetric. Sixfold orbits wrap their positions to preserve the six independent founder sites near the edges.

The options are separate and composable: a Rose Window + Vortex Territories + Four-Way Seeds produces an extremely different biological history from Interference Lace + Interference Biomes + Free Nuclei. Existing deposits, colors, original founder lineages and the independent 3D sculpture are not deleted on changing controls.

## Implementation contract

`src/surface-composition.js` is DOM-free and deterministic. It evaluates the mathematical gating field and regional morphology on the 2D lattice and caches two one-byte arrays (permeability and law ID) for up to 192×192 cells. The field is regenerated only when its defining composition settings change, **not on every animation tick**. The existing synchronous `SurfaceGrowth.advance` uses these fields for actual empty-neighbor proposals, probability, and local physics selection. Changed boundary settings rebuild the existing active frontier from retained matter.

Snapshots remain **`ex-nihilo/surface-v1`**: no bulky cached gate arrays are stored, because they are reproducible from DNA settings. Checkpoints still retain frozen pigments, nuclei, ownership, frontier, RNG, clock, and 3D history. Historical DNA without composition options defaults to OPEN / SINGLE / FREE. 199 palettes are unchanged, future pigment uses current palette, and earlier pigment stays frozen.

Caution: the mathematical fields can be periodic and the simulation can wrap, but visual seamlessness at the last exported pixel row/column still requires a dedicated export-seam test. Do not claim fully perfect edge-matching pixel PNGs on the basis of periodic physics alone.

## Testing performed

- Pure JS V8 smoke: module parsing, independent region laws (all 3 present), actual symmetric quartet nuclei, deterministic initial state and post-restore continuation, existing pigments retained after switching masks. Passed.
- Added `tests/surface-composition.test.js` for Node's regular full test suite.
- Not yet verified on real iPhone Safari, production build or on a live touch screen.

## Next possible work

Art-directed mineral optical shaders should read **actual geometry, birth age, front contact, depth and permeability**: thin-film glints, spectral edges, frosted inclusions and luminous veins, without turning this physical growth engine into a postprocessing filter. On-device FPS + accurate exported edge seams also need checking.

**No Netlify deploys, GitHub Actions runs, paid APIs or new runtime dependencies in this phase.**
