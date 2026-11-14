# Phase 03J — Prism Facet Optics / Mineral Surface Anatomy

This is a **geometry- and material-layer upgrade** to the stateful crystal cellular automaton. The colony's occupied cells, irreversible fracture scars, nutrient use and pigment-history bytes remain authoritative. No shader fabricates a crystal where the CA has no cell.

## Seven selectable 3D mineral shapes

All seven share a **single** instanced crystal mesh (up to 4,800 occupied crystals), so switching models changes GPU geometry without duplicating growth biology or restarting the organism.

- **Original Octahedron** — 8 triangular faces (legacy).
- **Mineral Cube** — 6 planes (legacy).
- **Rounded Nodule** — low-subdivision icosphere (legacy).
- **Hexagonal Quartz Termination** — true six-fold revolution mesh, a prismatic barrel between tapered points.
- **Pentagonal Growth Prism** — five-sided tapered cylinder and physically separated cap planes.
- **Asymmetric Shard** — four triangular tetrahedral faces.
- **Dodecahedral Gem** — twelve pentagonal crystal faces.

For occupied 3D crystal cell `i`, `crystalSurface` samples the **six real voxel neighbors**. Only neighbors whose crystal cell is empty count as exposed. Their face normals are summed to obtain a deterministic outward growth direction. With relief enabled, the actual 3D instanced geometry rotates toward this surface normal; its growth-axis length and lateral width vary based on the exposed-face count and crack status. Fully enclosed cells keep their original Y orientation.

This is not physics-state mutation. It is a non-destructive representation of the existing real lattice and may be changed after a crystal grows.

## Actual fracture-edge prism facets

A second small InstancedMesh (maximum **1,200** instances) adds prismatic tetrahedral surface detail at real, exposed mineral faces, prioritizing living cells touching **permanent broken-cell scars**. Every facet attaches to a surviving occupied crystal cell, not to empty world space. It points toward the actual absent neighbor if the face borders a scar. It uses the cell's **immutable saved birth RGB**, gently lifted toward a high-value glint. Face glint density is hashed from the stable voxel index, not frame time or random generator state, so rendering a saved world never changes the simulation or shimmer placement.

Ordinary exterior accents are limited to approximately 66% of the mesh budget to reserve capacity for real fracture-boundary facets. Existing 3D scar hairlines still indicate the material history; no two unrelated effects are pretending to make the same crack.

Optical controls are in one CRYSTALS subsection:
- **Physical cell silhouette:** seven shapes.
- **Crystal optical character:** Shared Artwork, Milky Opal, Chromatic Prism, Frosted Mineral, Iridescent Alloy.
- **Crystallographic face relief:** 0–100%.
- **Fracture-edge prism jewels:** 0–100%.

Lens finishes set MeshPhysicalMaterial roughness, clearcoat, metalness and iridescence. **They do not yet enable expensive true volumetric glass transmission, dispersion ray tracing, or interior refraction.** This phase instead chooses an iPhone-conscious physically shaded iridescence and meaningful native geometry.

## Save, palette, and historical protection

All four optical controls are saved inside existing construction DNA `config`. World checkpoints capture them inside DNA while retaining original colony snapshots (cells, colors, ages, strain, damage, etc.). Loading saved DNA/World now updates the real 3D crystal mesh and material parameters, not only the dropdown text.

Older v1/v2/v3 DNA/checkpoints without crystal optical settings load the original octahedral appearance with Shared Artwork Finish, zero new relief and zero fracture-gem density. Historical cracked octahedra use their original anisotropic scale ratios. The artist can opt into any new look afterward.

The 194 original MATHEMAGICAL vault palettes plus five EX NIHILO originals (199 choices) remain unmodified. Changing palettes controls **future new crystal births**. Existing crystal RGB and fracture-scar colors stay frozen; the extra edge facets are colored from the surviving crystal's historical RGB rather than the currently selected palette.

## Performance principles

- 4,800 maximum existing crystal instances, 1,200 maximum optional prism-facet instances, and existing capped 8,000 fracture line marks.
- At most one new draw call for physical facet geometry; no large multipass rendering stack.
- Face-neighbor scanning only on real `colony.changed` refreshes and explicit optical edits.
- Stable deterministic per-cell hashing prevents visual jitter and consumes zero simulation RNG.
- No added persisted per-cell GPU-specific arrays, hidden procedural skins or paid assets.
- A native real-device frame-rate benchmark remains necessary.

## Validation performed

- [x] All 7 geometry profiles and 5 lenses have distinct definitions.
- [x] Six-face neighbor topology determines exposed direction and true fracture-side orientation.
- [x] Empty cells can never generate false material accents; unexposed interior cells never have edge facets.
- [x] Relief is a reversible 3D instance transform; optical lens and glint choices preserve physics arrays.
- [x] Stored palette channels remain immutable and remain the source of fracture gem pigmentation.
- [x] Exact whole-world save/replay, historical crystal defaults and all 199 palettes passed headless checks.
- [x] Source parsing and all HTML IDs/control references checked.
- [ ] Production Vite build, actual iPhone Safari camera/raycast/pinch QA and browser WebGL2 color/FPS verification.

No Netlify deployment and no external runtime API calls.

## Next direction

Calibrate against screenshots from a real iPhone, then pursue more believable mineral layering: subtle facet-by-facet spectral glints, deterministic trapped inclusions and thin-film optical effects. Keep genuine time-evolving material laws in the colony, not faked animation on screen.
