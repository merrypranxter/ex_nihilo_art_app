# Phase 03M — Mineral Metamorphosis / Optics Earned Through Geological Time

## Artistic contract

A crystal should earn its appearance from its life, not from a generic cycling rainbow. In EX NIHILO, the lattice already records each occupied cell's **integer age, young/mature state, accumulated strain, microcrack damage, permanent neighboring fracture scars and immutable birth pigment**. Phase 03M assigns these real attributes to one of three distinct PBR mineral phases:

| Material phase | Source rule | Native 3D optics |
| --- | --- | --- |
| **Young Glass** | A living voxel that has not yet reached selected optical maturity | Relatively smooth, clear-coated, restrained iridescence |
| **Mature Opal** | A mineralized cell older than the selected age threshold | More pearlescence and different thin-film thickness range, roughness, and metalness |
| **Fault Mineral** | A surviving cell that is cracked, neighbors a real missing fracture voxel, or exceeds the strain threshold | Strongest directional iridescence; a visibly different specular roughness/metallic response |

The global crystal palette **never cycles**. The stored birth pigment belongs to the crystal, remains its original RGB, and passes as its instanced PBR material color. The phase changes which physically shaded material is illuminated by Three.js lights, not the underlying color, voxel, chemistry or topology.

## Controls — CRYSTALS → MINERAL METAMORPHOSIS

- **Geological optical lifecycle** — OFF / Quiet Geological Aging / Opaline Life Cycle / Feral Spectral Mutation.
- **Age of optical maturity** — 8 to 96 crystal-automaton generations.
- **Stress required for fault optics** — 0.10 to 1.20 accumulated strain. Stored microcracks and true scar neighbors always take precedence, even below the slider threshold.
- A live stage census: Young Glass, Mature Opal, Faulted Mineral.

The existing global crystal optical finish, geometry, fracture-jewel density, prismatic face relief and Phase 03L Ghost Mineral skins/inclusions remain available. **When metamorphosis is enabled, its per-stage materials replace the core mineral's selected global finish**, while facet gems and optional Ghost Mineral layers still use their own existing finishes. Turning metamorphosis OFF restores the global core finish.

## Implementation

Pure `src/mineral-metamorphosis.js` classifies a currently occupied voxel from saved physical data and provides native `THREE.MeshPhysicalMaterial` coefficients (metalness, roughness, clearcoat, iridescence, iridescence thickness range). Three separate InstancedMesh render groups share **exactly the same selectable geometry** as the original core crystal mesh. Each occupied voxel appears in **one** group, not all three. This gives a true per-material shading difference without `onBeforeCompile`, custom GLSL, RGB flashing, transmission raymarch, a postprocess stack, or duplicating crystal biology.

When OFF, the **original single crystal InstancedMesh renders** and the new group meshes have count=0 and are invisible. When ON, the original mesh is hidden and the three buckets render only when populated, bounded by the existing max 4,800 occupied cells. These are up to three core draw calls rather than the original one (maximum +2 core calls), not four simultaneous full colony draws. The group arrays add a little GPU buffer capacity but share geometries.

The existing Crystal Pressure Witch raycast now selects **the currently visible stage mesh** rather than an invisible original mesh. Choosing a new crystal silhouette and restoring a saved world update every core group geometry, so touch/edit/save do not diverge from the display.

Aging affects visuals without forcing expensive 60fps uploads: one extra `colony.changed` display refresh at **every fourth crystal CA generation** while the lifecycle is enabled. With the default 0.32-second crystal generation period, this is at most about once every 1.28 seconds if no other growth event is already refreshing. OFF schedules no additional optical updates. The genuine original mineralization at generation four is a distinct biology event, not a new renderer update.

## Persistence, palettes, compatibility

The three controls are in existing DNA `config`: `crystalEvolution`, `crystalMaturity`, `crystalStressOptics`. They are bounded and stored in normal whole-world checkpoints. No per-voxel optical stage needs saving; it is deterministically reconstructed from saved age, stress and fracture data.

Older DNA and checkpoints lacking these fields restore **OFF**, age threshold 28, strain threshold 0.45, retaining previous optical appearance exactly. The original 194-entry artist-owned MATHEMAGICAL palette vault plus five EX NIHILO starters remain unmodified (**199 total palettes**). Changing palette or optical mode affects only future crystal birth pigment / existing lighting as appropriate; the cell's stored pigment never changes.

## Headless checks and still-needed device QA

- [x] Actual occupied lattice cell categories; old, young, immature, cracked, strained, and scar-adjacent cells evaluated correctly
- [x] Three distinct PBR coefficient sets for each of three artistic intensity modes, with hard-clamped material values
- [x] OFF always uses the unchanged original material and introduces no extra core draw calls
- [x] Exact save + continued deterministic replay and no original pigment/RNG/CA differences between OFF and ON
- [x] Older saved worlds remain OFF with original appearance; unsafe/inherited object property mode names rejected
- [x] Original 199 palette IDs and color stop arrays unchanged
- [x] All control IDs and source JS syntax audited

**Not yet performed:** production Vite build, actual iPhone Safari WebGL2 rendering, material/lighting visual calibration, and FPS/draw-call measurement. Realistic physical glass transmission and volume spectral ray-tracing are **not** included. This uses native physically based shading with approximated iridescence in a lightweight instanced renderer.

No Netlify deployment, token expenditure, or background job.
