# Phase 04A — The Canvas Becomes the Organism / SURFACE ART

## Why this pivot matters

EX NIHILO was becoming a sophisticated mineral **object** generator: age, nutrient chemistry, crystal fractures, parent IDs, inherited genetics and PBR optics all worked inside a bounded 34³ voxel sculpture. But the artist wanted the same mathematical depth to form an entire **composition, full-frame pattern, or texture**—not keep developing a small object in the middle of a black box.

This phase keeps the 3D OBJECT universe completely intact and adds a second, actually stateful 2D growth domain. **SURFACE is not a 2D projection of the 3D object, an image-filter preset, a GL screenshot, or tiling a prebuilt decorative motif.** It is its own competing-nucleus crystal cellular automaton with persistent birth colors and periodic boundaries. The camera and existing sculpture do not have to be deleted to explore surface material.

## Two independent domains

- **OBJECT:** all existing 3D growth, chemistry, fiber lineage, crystal bloodlines, touch sculpting, saves and optical controls as before.
- **SURFACE ART:** a 192×192 lattice of competing mineral cells that expands over time with original family-owned growth fronts. The 3D simulation **stops advancing** while SURFACE is active; switching back resumes it from the same state. SURFACE has its own deterministic RNG state, saveable frontier queue, seed nuclei, cell ages, topological distance-to-seed, territory IDs and **frozen birth RGB bytes**.

Use the prominent **GROWTH → 3D OBJECT / FULL-CANVAS PATTERN** switch or open **SURFACE ART**. Selecting SURFACE ART alone shows its panel; press SWITCH TO FULL-CANVAS GROWTH to enter. On the first switch, the app automatically plants initial nuclei according to the selected arrangement.

## Real math underneath the surface

`src/surface-growth.js` has no THREE.js or DOM imports and can be tested directly:

1. **Nucleation**: 1–96 independent founder crystals from the four arrangements: scattered, radial, hexagonally spaced and ribbon-line sources. Tap/drag the canvas to plant new independently colored mineral nuclei (until 96 total or the selected cells are occupied).
2. **Synchronous growth**: only living frontier cells from the previous generation can nominate neighbors. An immutable snapshot of occupancy is used for all neighbor counts and birth probabilities within a generation. No cell born during this generation can affect another candidate in the same generation.
3. **Territory competition**: each newborn inherits the founding family's permanent ID from its actual successful parent. When fronts meet, they form stable inter-family boundaries instead of quietly overlapping or swapping colors.
4. **Distance bands**: the offspring's cumulative graph distance from its actual nucleus determines mineral deposition phase. Each newborn freezes its color by interpolating the active palette stops at the moment of birth, with its family-specific phase. Changing the palette affects *future* births, not earlier strata.
5. **Three meaningfully different physical laws**:
   - **SPHERULITES**: fast radial competing fronts and dense multi-center rosettes.
   - **DENDRITES**: anisotropic branching, lower birth chance in crowded contacts, and a deterministic stable mineral-resistance field that leaves real unoccupied, vein-like negative space instead of eventually filling into a featureless rectangle.
   - **STRATA**: directional, spatially modulated mineral precipitation fronts and more frequent growth bands.
6. **Actual periodic topology**: When PERIODIC TILE EDGES is enabled, a cell on the left and right edges (and similarly top/bottom) is an *actual neighbor in the cellular automaton*. It is not a post-render mirror-copy trick. For clean new seamless experiments turn periodic edges on **before reseeding**.
7. **Finite simulation and mobile budgeting**: at most 1,600 births per generation, maximum 96 nuclei, 192×192 lattice, independent growth timing capped at six steps per animation frame, and stagnant fronts stop after eight generations without births. Changing growth law/boundary rules rebuilds the frontier from existing matter without resetting it.

## Making it visually artistic

The renderer is a separate Canvas2D path displayed edge-to-edge over the 3D stage. The underlying texture uses actual historical birth RGB plus retained cell age, distances, local slope-like depth relief, luminous currently exposed fronts and genuine competition boundaries. It also respects the chosen artwork background and the RELIEF / BAND CONTRAST slider.

The regular PNG button exports the current 2D artwork when SURFACE is selected; SURFACE ART also has **2048px ART PNG**. It scales the real 192px-cell material to a 2048×2048 PNG and adds fine vector-resolution contours drawn from genuine family borders at export resolution. **This does not mean the simulation itself is natively 2048×2048**; the higher-resolution export is resampled from 192² cell material with export-scale border detail. A future higher-density renderer or vector-field detail layer would be needed for microscopic detail.

The stage canvas uses a full-bleed *cover* crop on widescreen or portrait displays rather than stretching the square texture into distorted cells. PNG export always shows the complete square material. Tap coordinates invert this cover crop so planted nuclei appear where touched.

All **199 palettes** stay in the original palette catalog (194 exact artist MATHEMAGICAL vault records + five EX NIHILO originals). The new surface does not mutate any of those sources or repaint already-grown pigment.

## Controls

- Independent **3D OBJECT / FULL-CANVAS PATTERN** domain switch
- **Surface growth physics**: Spherulites, Dendrites, Geological Strata
- **Arrangement of future nuclei**: scattered, radial, hexagonal, ribbon
- **Independent nucleus count**: 2–84 for initial arrangement, max 96 including touch-created nuclei
- **Birth rate**: 15–150%
- **Coverage target**: 30–100% as an upper bound. Dendrites may terminate below this because negative space is an intentional material feature
- **Growth generations per frame**: visually expressed 1–6, implemented as proportionally faster bounded simulation clock (not literally one generation per display frame)
- **Crystalline relief / band contrast**: 0–150%, strictly renderer-only
- **Periodic tile edges** ON/OFF
- **NEW SURFACE SEED** confirmation resets the 2D surface alone, never the 3D organism
- **Tap/drag** to plant new mineral nuclei in the existing surface; no changes to 3D touch gestures
- **Pause / Resume** controls whichever domain is currently visible

## Persistence and safety

The ordinary DNA stores the surface's future growth settings and chosen domain. Whole-world checkpoints still use format `ex-nihilo/checkpoint-v3` and now include an optional `surface` subtree (format `ex-nihilo/surface-v1`) with exact 2D occupancy, founder IDs, immutable pigment bytes, distance bands, cell ages, seeded placement and independent RNG state, generation, active frontier order and stall count.

All surface snapshot fields are validated **before** replacing a currently living world. Corrupted arrays, invalid owner/family IDs, malformed seeds/frontier or partial history are rejected. Old checkpoints without surface data restore the original OBJECT domain, with an empty independent surface waiting to grow. On DNA load, only the laws change; existing living artwork is preserved.

The original nutrient chemistry, crystal generations, raycasting, family inspector, 3D camera, 3D export and old UI remain unchanged in OBJECT mode.

## Testing / limitations

- [x] Independent surface growth with three distinct occupancy histories and four nucleation patterns
- [x] Periodic left/right and top/bottom neighbor topology
- [x] Saved colors remain frozen when changing palette after birth
- [x] Genuine geometry-derived surface relief, boundary lines and alpha-safe RGBA pixels
- [x] Exact surface checkpoint restoration and deterministic continuation, including saved frontier order
- [x] Dendritic growth retains meaningful permanent negative space, vs dense radial completion
- [x] Low-birth fronts terminate; changing laws can revive extant matter
- [x] Full GrowthEngine save/restore with independent 2D state, old world fallback and corruption rejection
- [x] Original 199 palettes preserved
- [x] Source JS parsing and HTML ID/structure audits
- [ ] npm/Vite production build, real Canvas2D/iPhone Safari visual inspection and interactive gesture QA
- [ ] 2D live FPS, thermal/memory and 2048px PNG output measurement on an actual iPhone
- [ ] True high-res native simulation, richer light transport and GIF/MP4 export are future work, not implemented here

No Netlify deployments, GitHub Actions executions, extra dependencies, paid APIs, or runtime cloud calls.

## The next art-direction work

This is the **first living surface medium**, not the finished generative painting suite. Next, make composition deliberately beautiful and varied rather than relying on preset names: contact-front physics that produces crystalline boundaries, true negative-space shaping, hierarchical large-and-small-scale symmetry, layerable chemistry/caustics, and animated periodic materials with performance-calibrated export. Be careful not to fake the existing births with a decorative raster.
