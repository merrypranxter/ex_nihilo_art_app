# Phase 03L — GHOST MINERAL / Opal Skins and Age-Grown Inclusions

## What it is, and what it is not

A bounded, **optional 3D mineral-layering renderer** for EX NIHILO. It uses actual crystal-automaton cell age, occupied neighbors, accumulated strain, persisted microcracks, and frozen birth pigments. Artists gain layered opal-like surfaces and tiny mineral inclusions without replacing the original crystal structure or resetting the world.

It does **not** perform true volumetric ray-traced refraction, wavelength dispersion through transparent bulk material, or optical simulation of inclusions as physically buried 3D mineral grains. Those would require much more expensive ray traversal/transmission and real mobile GPU evaluation. This is physically placed **outer growth skin and near-surface nodule geometry**, rendered with existing Three.js MeshPhysicalMaterials, deliberately preserving performance on iPhone.

### Controls — CRYSTALS → GHOST MINERAL

- **Mineral interior treatment:** OFF (default) / Wet Opal Glaze / Spectral Oil Film / Smoked Mineral Glass / Frosted Vein Skin
- **Translucent outer growth skin:** 0–100%
- **Age-grown inclusions:** 0–100%
- Live status shows the number of actual selected skin and inclusion instances, and whether the display budget was capped

**OFF means no new draw calls** because the two instanced meshes are invisible with count=0. Layer controls remain adjustable for the next style selection, and no new shader passes are compiled until the effect is enabled.

### Actual mathematical attachments

The new pure, unit-testable module `src/mineral-inclusions.js` builds a deterministic per-cell display recipe:

- Empty and immature crystal positions, or occupied cells with no exterior faces, never generate extra geometry.
- Increasing cellular age up to 48 CA generations raises the probability of an inclusion. Stress history and fracture-adjacent faces also influence its probability.
- An outer shell's probability and mild scale depend on age, visible exterior face fraction, and actual fracture scars.
- The voxel index drives a deterministic hash for selection and local nodule rotation, consuming **zero** live simulation random numbers.
- Each nodule is positioned toward an actual exposed voxel surface and scaled with the existing crystal cell; optical shading operates on small, real 3D geometry, not a 2D shimmer.
- All tints derive from the cell's **unchanging historical birth RGB**, rather than the active palette applied to future cells. Neither palettes nor chemical concentrations are mutated by a visual switch.

The simulation only schedules an extra visual-buffer refresh on every **sixth crystal-automaton generation** when this mode is enabled; age can therefore become visible after growth births stop without forcing a full geometry upload on every animation frame. The previous standard `colony.changed` updates for births, erosion, and cracking continue unchanged.

### Mobile budgets / limitations

Existing crystal mesh, previous fracture facets and hairlines remain unchanged. New resources are exactly:

- up to **1,150 translucent cell skins** with the existing selected crystal geometry in one additional instanced mesh;
- up to **1,450 tiny 3D mineral nodules** in one additional instanced octahedral mesh.

Both live in the same world as crystal matter. The skins use restrained alpha and `depthWrite=false` so they avoid an enormous new volume ray-march or post-processing render target. Transparent `InstancedMesh` cells are sorted as a draw, **not individually depth-sorted**, so overlapping dense crystal colonies may still show transparency-order artifacts. This must be inspected in Safari before claiming the effect is visually excellent.

Style changes update roughness, metalness, clearcoat, iridescence and shell opacity. Shape changes switch both the original crystal mesh and shell geometry; LOAD WORLD / LOAD DNA restores the actual mesh and material, not just the labels. The Device Health panel from 03K reports the exact current shell and nodule instance counts.

### Persistence and backwards compatibility

Settings `crystalInterior`, `crystalSkin` and `crystalInclusions` are constrained to valid mode / [0,1] and saved in the normal construction DNA and whole-world checkpoint. The model stores **no additional simulation state**, since each visual nodule can always be recomputed deterministically from saved age, strain, fracture status and original palette color.

Older checkpoints and DNA without these three options restore OFF, 0, 0; the previous octahedra/geometry/prismatic finish and artist pigments remain exactly as they were. The original MATHEMAGICAL 194-palette vault plus the five original EX NIHILO palettes are unchanged (199 selections). No destructive layer effect is baked into the actual crystal cells.

### QA

- [x] Pure selection math tested for empty/immature/interior cells and OFF; original RGB remains unmodified
- [x] Statistical age and fracture selection behavior verified; indexed placement is deterministic without random-state access
- [x] Headless full-world exact checkpoint restore/continued simulation with layered rendering selected
- [x] Headless comparison of identical worlds with and without this new layer: identical crystal cells, pigments and RNG
- [x] Original old-world checkpoint defaults and full 199-choice palette catalog tested
- [x] Module source syntax and HTML control ID bindings checked
- [ ] Actual Vite/Three.js build (network/dependencies unavailable in this workspace)
- [ ] Physical iPhone Safari/WebGL2 visual inspection and per-device GPU measurements

No Netlify deployment, background work, paid API, external assets or new JavaScript packages are part of this round.

**Next:** once a Safari screenshot and Device Health report are available, calibrate skin opacity, edge occlusion and overdraw against real visual feedback, then consider optional true transmission for capable GPUs only.
