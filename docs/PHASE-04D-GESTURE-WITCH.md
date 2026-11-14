# EX NIHILO Phase 04D — Gesture Witch Takes the Surface

## Intent

Turn a previously touch-seeded 192² mineral automaton into an artist-owned **causal painting instrument**. Every gesture changes rules for future crystal births rather than overwriting retained pigment. The independent Three.js / 3D organism remains untouched. Original seed-planted Surface Art is still the default.

## What touch does — real mechanisms

- **PLANT CRYSTALS (existing default):** Tap or drag to place actual founder nuclei (obeying 04B symmetry/voids). Now each gesture is a checkpointed, undoable operation.
- **ATTRACT GROWTH:** Draw a persistent field-source stroke that *increases local acceptance probability* for future crystal births. The actual synchronous CA must produce changed occupancy; nothing is overpainted.
- **KEEP EMPTY:** Draw an impenetrable boundary-condition brush. Future front proposals and new manual nuclei cannot occupy cells within its threshold. Already-born minerals are not erased.
- **COMB GROWTH:** Draw a directional guiding field. The touch path tangent enters both contender-parent affinity and future birth acceptance; reversing the stroke direction changes causal evolution.
- **MOVE / PINCH MARKS:** Hit-test a retained mark by its path. One finger translates its whole path; two fingers pinch/rotate the authored path and change its falloff radius. The path and mark ID remain stable. This is an honest **field geometry** edit; it does NOT rewire the 2D lattice or claim a topological genus change.

Each stroke has stable `id`, `kind`, `radius`, `strength`, and bounded `points` in artwork UV coordinates. Max **20 strokes**, **64 points per stroke**. Field rasterization is cached and only rebuilt when marks change. An initial point is valid; dragging authors one polyline, not dozens of unrelated symbols.

The pinned artwork remains at top. SURFACE ART exposes an openable GESTURE WITCH group with tool mode, reach, strength, SHOW FIELDS, UNDO, REDO, DELETE SELECTED, and CLEAR FIELD MARKS (confirmation). Color-coded numbered paths and reach rings appear on the interactive canvas **only**; they are absent from PNG exports. Existing 04C material optics remain separate, and 199 palettes remain intact.

## Reversibility and interruptions

One pointerdown-to-pointerup sequence is one transaction. The 2D simulation is suspended **during the transaction** to avoid unreplayable births. A full surface checkpoint before the stroke includes exact RNG, founder genealogy, pigment, 2D occupancy, generations, frontier, and all gesture marks; finger-up commits one Undo entry. Pointer cancellation, lost capture, app blur, tab hiding, and Escape revert the entire draft to its pre-gesture state.

Two-finger transitions disable one-finger painting until both pointers lift; after a pinch, lifting one finger will not spontaneously plant new nuclei or continue a brush. iPhone Safari pointer IDs are tracked separately, with pointer capture where supported. Stage `touch-action:none` is confined to the artwork; the control panel retains normal scrolling. Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z work outside form fields.

**Undo/Redo restores a full earlier surface checkpoint, including simulated births that occurred since the gesture.** This is intentionally stronger than simply hiding a mark. Only six checkpoints are retained in memory to cap mobile overhead. Branching after Undo invalidates Redo.

**NEW SURFACE SEED** remains confirmation-gated, now records a single undoable mutation (including its pre-reset RNG). **CLEAR FIELD MARKS** only deletes marks and is also reversible. The full New Universe button, which replaces both 3D and 2D history, retains its original independent confirmation but is not claimed to be locally undoable.

Old surface-v1 checkpoints lacking `marks` and `nextMarkId` load with an empty gesture document. New snapshots validate mark IDs, coordinate bounds, radii, strength, path count and next ID before changing the current world. Brush preferences are stored in DNA. The 3D organism remains independent.

## Specialist skill assignments

### Gesture Witch — used for implementation

Actual hit-tested direct manipulation, pointer capture, retained causal semantics, bounded path authoring, pinch/twist, checkpoint undo and cancel. The existing `src/gesture-witch.js` handles 3D sculpt/pressure; this phase builds an independent adapter under `src/surface-gesture-field.js` for the new 2D CA rather than mutating or replacing the 3D kernel.

### Iridescent Organist — audited; deferred

04C `src/surface-optics.js` currently uses three fixed wavelengths and illustrative interference with direct sRGB pixel arithmetic. That is NOT the Organist's full Snell + s/p Fresnel + film/substrate complex-amplitude model, nor does the 2D view offer true per-fragment 3D view normals. Future optics work should add a **separately auditioned, OFF-by-default** physically better coating with explicit linear/sRGB boundaries and a mobile LUT, then compare against current OPAL. Changing it in this gesture phase would make debugging harder.

### Texture Taxidermist — audited; deferred

The material renderer shades derived distance/edge normals at **192 native simulation cells**, while PNG is enlarged to 2048. A tactile microgeometry tier should be genuinely analytic/detail-resolution (mineral pores, inclusions, microfractures, fiber roughness) and derive from real family/age/distance state, never randomized glow decals. Keep mobile-quality vs high-quality tiers and an unmodified baseline.

### Novelty Inquisitor — mechanism-level audit

04B's spherulites, dendrites and strata are distinct growth laws, but share the 8-neighbor cellular lattice and can converge visually; 04C's five materials are rendering changes, NOT five unrelated growth engines. 04D is a new form of authorship: local path constraints actually alter future CA occupancy and ancestry, vs global rate/color sliders.

**Falsifiable comparisons:** hold seed and palette constant; compare no-mark control against blocked/attracted/directional marks; reverse the COMB stroke direction; freeze time and compare birth arrays vs pigment arrays; undo should reproduce the exact prior material state. Pure-core tests cover these distinctions. A true visual novelty judgement needs multiple Safari-rendered specimens and monochrome ablations; it has **not** been visually measured.

## Files

- `src/surface-gesture-field.js`: pure mark schema, line-distance rasterization, source/sink/guidance arrays, transaction, checkpoint Undo/Redo, pinch/twist, selection/delete.
- `src/surface-growth.js`: integrates cached gesture effects into synchronous birth proposals, candidate competition, nucleation and active frontier, saves/restores marks with backward compatibility.
- `src/main.js`: Pointer Events, visual handles, controls, rollback lifecycle and rendering.
- `src/engine.js`, `index.html`, `src/styles.css`: validated brush preferences, reachable grouped UI and touch-sized controls.
- `tests/surface-gesture-field.test.js`: causal, deterministic and history tests.

## Verified vs not verified

Pure JavaScript smoke and regression scenarios verify that **barriers physically forbid births, attraction changes occupancy, reversed guide directions produce different growth histories, cancellation and undo restore prior checkpoints, invalid mark files reject safely**, and untouched birth pigments remain fixed. JavaScript syntax checks passed for edited modules.

The actual Node suite, Vite production build and iPhone Safari browser gesture behavior have not run in this tool environment. Pinch timing, Safari pointercancel/lostcapture order, canvas cover crop and sustained heat/performance must be manually tested on-device before claiming production reliability. Cached field building is bounded but could still be expensive at max radius/20×64 strokes; refine from measured performance.

**No Netlify deployment, Actions invocation, paid API, or new runtime package.**

## Next phase

04E should address genuine subcell detail, controlled high-resolution mineral microstructure, more physically correct angle-dependent coatings, and artifact export (GIF/MP4) without mistaking CPU presentation movement for structural growth. Keep the reversible Gesture Witch controls orthogonal to optics/materials.
