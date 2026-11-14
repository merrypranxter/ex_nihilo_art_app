# Phase 03N — CRYSTAL BLOODLINES / Hereditary Growth and Mineral Ancestry

## Why this isn't painted-on genealogy

Before this phase the 3D mineral colony stored whether cells existed, their age, frozen RGB, stress and fracture damage—but no reliable relationship between parent and child crystals. We now record **actual parentage at the instant a stochastic cellular automaton birth succeeds**.

Each occupied voxel gains a saved, monotonic **birth-event ID**, a **parent birth ID**, a **founder-family birth ID**, and three inheritable bytes. These are separate from voxel addresses. A voxel can erode and be born again without stealing its predecessor's identity. Children that survived a parent's fracture continue to remember the exact event ID and family in which they originated.

### Synchronous, truthful ancestry

At the start of each existing CA generation, already occupied parent cells nominate candidate empty neighbors in one of the **six face-connected directions**. The first occupied source to nominate a candidate supplies that child's parent, chosen deterministically from the previous living lattice (the same iteration order as the existing sparse frontier). If the candidate really passes the chemical/nutrient/pressure weighted birth probability, its committed birth receives:

- a unique, never-reused `birthId`
- the parent's historical birth-event ID in `parentBirthIds`
- the founder family's ID in `families`
- three gene channels inherited from the parent's saved genes, with artist-controlled bounded mutation

Direct hand-seeded crystals are true new founders. No newly born cell may become a parent until a later CA generation. A cell restored from an old checkpoint **without known parentage** remains untracked. Its next newborn can establish a new, honestly tracked founder, instead of the program inventing ancestors for old artwork.

IDs remain **birth events**, rather than mutable source indices; even if a parent cell dies and another cell is later born at its coordinate, an existing child keeps referencing the old birth event. This stores **direct parent and founder IDs**, not a complete forever-growing historical ancestry-tree database. Parents absent from the current live lattice may not have a browsable ancestor record. That deeper genealogy UI is intentionally deferred.

### Three inheritable traits, and real physical consequences

- **Axial growth tendency:** inherited byte 0 biases relative facet elongation and can modify actual cellular birth probability in the gene's preferred x/y/z orientation.
- **Stratum phase:** inherited byte 1 determines stable crystalline-band placement and inherited morphology.
- **Optical-axis roll / brightness:** inherited byte 2 orients the low-poly faceted ring and affects non-destructive accents derived from the crystal's original birth RGB.

A child's genes are cloned or deterministically mutated within [0,255] using a bounded, seeded integer hash of voxel, generation and gene channel. Mutation does **not** consume simulation RNG; it cannot secretly alter later chemistry by shifting the random sequence.

The original birth law is multiplied by a bounded factor from `hereditaryBirthBias(parentGenes, faceDirection, influence)` **only if heredity is explicitly enabled**. At zero influence or when mode is OFF, the original probability formula remains unchanged, yet new parent/child identities are still recorded for future art.

The same genes visibly modify 3D per-voxel geometry (distinct axial/lateral growth) and select **real, tiny faceted stratum rings** attached to exterior living mature crystals. The rings are aligned to actual cell-facet axes and the inherited optical roll. They are physically modeled surface growth bands, not actual ray-traced inclusions buried inside a refractive volume. The underlying birth pigment remains untouched. The renderer uses one optional InstancedMesh of at most 1,100 low-poly rings, zero extra draw calls when OFF.

**Bands do not blink from frame-to-frame age cycling.** Placement is derived from stable inherited genes and family IDs, with aging only determining when a crystal is mature enough to exhibit a stratum.

## Artist controls (CRYSTALS → CRYSTAL BLOODLINES)

- **Inherited crystal anatomy:** OFF / Inherited Crystal Brocade / Genealogical Strata / Hereditary Abnormalities.
- **Inherited shape and band intensity:** 0–100%.
- **Gene-guided crystal growth:** 0–100%. Changing this changes the future cellular birth rules, not past deposited material.
- **Mutation frequency for future children:** 0–100%. Existing gene bytes don't change retrospectively.
- Live census of tracked living crystals, founder families, living children, and visible bands.

Separate root seeds have independent founder family IDs, allowing distinct, neighboring families in the same 3D world. The current phase uses one nominated parent per child; two- or three-parent mineral fusion is a possible later addition, not something claimed here.

## Persistence and old-world compatibility

- `CrystalColony.snapshot()` includes the exact per-voxel `birthIds`, `parentBirthIds`, `families`, `genes` arrays and `nextBirthId`; the data is validated before world restoration.
- DNA and checkpoints retain artist hereditary visualization mode/strength, plus mutation frequency, physical directional influence and enabled flag in existing colony settings.
- Old saves without ancestry arrays restore an untracked historical lattice with hereditary growth disabled. New direct seeds and future newborns can establish real tracked families. Those worlds can then be saved in the new format even with mixed tracked/untracked living cells.
- Corrupt parent IDs (pointing to the future or one's own birth), missing partial ancestry arrays, invalid counter ranges and impossible family identity are rejected before any live material is overwritten.
- Existing strain, damage, fiber lineage, chemical fields, crystal optical stages, touch controls and all 199 original color palettes are preserved. Historical deposited RGB values are never recomputed from the active palette.

Genome arrays introduce a few hundred kilobytes of memory and extra checkpoint JSON; the artist should continue measuring actual iPhone Safari FPS, memory and save reliability before future genealogy visualizations become more complicated. The number of living crystals remains capped by the existing colony capacity.

## Checks performed (headless, not real Safari)

- [x] Original seeded parent followed by a later synchronous child: factual parent event ID and founder family propagation.
- [x] Zero mutation yields identical parent/child genes; full mutation remains deterministic and bounded.
- [x] Directional genetic growth bias changes the **occupied real CA topology** under a controlled test RNG.
- [x] Parent identity survives erosion and cell-coordinate reuse without rewriting existing descendants.
- [x] Two independently seeded founders retain distinct family IDs through their early descendants.
- [x] Exact lineage snapshot restore and deterministic subsequent physical growth.
- [x] Full GrowthEngine world checkpoint restore and exact continuing replay with heredity enabled, plus visual-only mode comparison with unchanged physics/RNG.
- [x] Historic old world without ancestry arrays loads and can be saved again with a mix of untracked old cells and newly tracked descendants.
- [x] Invalid genealogy refused before modifying a living world.
- [x] Source parsing, DOM references, palette vault and bounded rendering controls checked.

**Still outstanding:** npm/Vite production build; actual 3D visual browser screenshots, touch behavior and iPhone GPU/memory QA. No Netlify deployment, no paid APIs or external runtime data fetches.

## Potential next

Selected-family visualization with highlighted living descendants, parent-child branch tracing, and—if the mobile profile holds—genuinely inherited crystallographic growth orientation and family-level optical crystals that can exchange traits when growth fronts merge. Do not invent old parentage.
