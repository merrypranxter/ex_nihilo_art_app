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

## Phase 03C — Phyllotactic branch choreography

- [x] Golden-angle divergence verified numerically using Wolfram Language (137.507764°) and implemented as daughter orientation, not a prebuilt object.
- [x] Three structured branch arrangement modes plus original organic-scatter physics.
- [x] Daughter angle, hereditary taper, coherent/staggered/quasiperiodic growth-speed rhythms.
- [x] Chromatic family coherence based on ancestry, with existing material colors preserved.
- [x] Branch serial and agent generation persisted through checkpoints; old DNA and worlds retain their prior physics.
- [x] Headless exact replay, bounded rates, numerical-angle and non-destructive control tests.
- [ ] Production Vite build and iPhone Safari runtime verification.
- [ ] More detailed growth-density and optical presentation tuning based on actual previews.

## Phase 03D — Filigree Anatomy

- [x] Replace unrelated global branch sequence with per-parent daughter spacing in new worlds, preserving historical order for existing saves.
- [x] Maintain a decaying birth-direction memory so daughter geometry has time to develop independently from its parent.
- [x] Inherit chromatic family phase along the genealogy tree; daughter-level pigment remains deposited in the saved world.
- [x] Persist generation per deposited fiber segment, family phase, and parent-local branch count in checkpoints.
- [x] Add a reversible visual-relief control to distinguish structural trunks and finer descendants without modifying underlying material state.
- [x] Headless replay checks and legacy checkpoint restore checks.
- [ ] Browser-based artistic assessment, render FPS/heap measurement and production Vite build; no hosting credits used.

## Phase 03E — Mineral Veins / Structure-first optics

- [x] Swappable actual instanced 3D filament cross-sections: mineral needle, vitreous prism, fine wire, triangular shards, and historical five-sided tube.
- [x] Birth time recorded per deposited segment; full-world checkpoints retain the history.
- [x] Subtle non-destructive age-dependent mineralization of displayed pigment and emission, while historical colors and material states remain unchanged.
- [x] Timed optics refreshed in capped groups of 2,200 segments per frame, without introducing a heavyweight postprocessing stack.
- [x] Per-material physically based shading, retaining iridescence, clearcoat and artist-selectable optical finishes.
- [x] Restore of older checkpoints without mineral history using historical non-aging and original-fiber defaults.
- [x] Headless exact checkpoint/replay verification, syntax and DOM wiring validation.
- [ ] Real WebGL2 Safari and browser quality/performance inspection, visual calibration and production Vite build.

## Phase 03F — Gesture Witch / Direct Manipulation

- [x] Persistent vortex eyes as actual sources of local rotational force in the 3D growth vector field.
- [x] One-finger drag core, two-finger radius/rotation/center edit, and tool fallback to the existing attractor and repulsor modes.
- [x] Semantic transactions: a whole field gesture commits once; canceled touches restore field sources and random state.
- [x] Disambiguated SCULPT versus camera ORBIT, visible vortex radius/handle markers and accessible manual sliders.
- [x] Source IDs, radius and signed chirality persist through checkpoints; legacy field nodes load without changing their old dynamics.
- [x] Cancellation hooks for pointercancel, lost capture, app blur, resize and backgrounding, with simulator temporarily suspended.
- [x] Headless exact replay and source syntax/DOM wiring checks.
- [ ] Real iPhone pointer/pinch/gesture and WebGL2 performance tests.
- [ ] Bounded persistent stroke fields, reversible crystal stress/chemical scars and full checkpoint-aware undo beyond field-node documents.
- [ ] True topological surgery only if explicit connectivity constraints become supported.

## Phase 03G — Gesture-stitching and all MATHEMAGICAL colors

- [x] Full exact 194-entry MATHEMAGICAL sRGB palette library plus original EX NIHILO five (199 total), preserving original names, source and 2–12 stops.
- [x] Search palette names/sources; edit each color, shuffle order, randomize stops, random RGB and restore source colors. Keep background separate.
- [x] Drawing a 3D growth GUIDE path changes actual local future fiber steering; a WARP path paints local directional flow.
- [x] Capped 10 paths × 48 points, persistent field-source identities, visible editable field overlays.
- [x] Atomic path undo/redo, cancellation rollback, mixed history with existing Gesture Witch vortex sources, and erase/clear path operations.
- [x] Save drawn constraints and custom colors in construction DNA and complete living-world checkpoints.
- [x] Old v1/v2/v3 save compatibility, corrupt-save rejection and deterministic physics replay tested headlessly.
- [ ] Physical iPhone Safari touch/color-picker inspection; performance, accessibility and Vite build QA.
- [ ] Real persistent fluid deformation and interactive pressure coupling to crystal colony; not a fake image warp.
- [ ] Add palette import/export custom saves and optional per-stop warm/cool shuffle if desired.

## Phase 03H — Crystal Pressure Witch

- [x] Artist-authored growth pressure, protected shield regions and directional cleavage in the real nutrient-coupled 3D crystal CA.
- [x] Near-parent birth probability modulation, centerline mature-cell erosion and two-sided front bias without spawning prebuilt geometry.
- [x] Named marks with actual crystal-surface ray picking, 3D drag, two-finger radius and axis rotation; manual controls for radius and strength.
- [x] Mobile pressure modes in CRYSTALS and TOUCH, clear dormant-state guidance, visible reach and directional axis, prominent quick-press action.
- [x] Unified atomic Undo/Redo with previous field sources, cancellation rollback and strict world/DNA serialization with older save compatibility.
- [x] Preserve 199 original source-defined palettes and use edited stops in crystal updates.
- [x] 18 headless physics/transaction/checkpoint checks, syntax and DOM checks.
- [ ] Production Vite build, actual iPhone Safari multitouch QA and FPS profiling.
- [ ] Non-destructive accumulated strain and persistent fracture graph, optional future pressure-depth controls.

## Phase 03I — Fracture Memory / Living Mineral Fatigue

- [x] Real 3D cellular strain field with synchronous face-connected diffusion, local stress sources, slow decay and persistent microcrack damage.
- [x] Dedicated STRAIN gesture, active CLEAVE stress coupling, real later-tick crystal fractures and permanent void scars preventing accidental regrowth.
- [x] Rate-limit catastrophic fracture and preserve a minimum viable eight-cell growth nucleus.
- [x] Visualize stored lattice crack positions and missing-cell scars, maintaining existing material/color systems.
- [x] Group pressure conduction, break threshold and explicit fracture toggle in CRYSTALS; keep TOUCH/quick action accessible.
- [x] Complete lived-world checkpoint of strain, damage and settings; retain v1/v2/v3 pre-fatigue historical behavior unless explicitly opted in.
- [x] Headless physics, contact-only transport, save/replay, corrupt-save rejection and viable-colony checks.
- [ ] Actual Vite production build and real iPhone Safari touch, shader quality, and FPS/memory characterization.
- [ ] Investigate anisotropic cracks based on fiber lineage, reversible artist-directed healing, and more elaborate but GPU-safe optical fracture rendering.

## Phase 03J — Prismatic Mineral Optics / Topology-aware crystal anatomy

- [x] Seven actual 3D cell geometries: octahedron, cube, rounded nodule, hexagonal quartz termination, pentagonal prism, tetrahedral shard and dodecahedral gem.
- [x] Five physically shaded mineral material profiles: inherit, opal, chromatic prism, frost and spectral alloy.
- [x] Crystal face-normal orientation and anisotropic gem length based on actual six-face occupied-cell topology and stored crack status.
- [x] Budgeted physical tetrahedral gemstone facets attached to living exposed crystal faces, giving priority to true fracture-scar neighbors.
- [x] Preserve original pigment bytes, fracture history, current CA physics, all 194 artist MATHEMAGICAL vault palettes and five originals (199).
- [x] Save optical choices in DNA/checkpoints, restore actual loaded geometry, retain original presentation for older checkpoints.
- [x] Offline headless surface math, exact save/replay and parser/DOM validation.
- [ ] Build and inspect actual WebGL2 visuals, material calibration, physical iPhone frame rate and native Safari interaction.
- [ ] Consider trapped inclusions, facet-scale interference and material-age optical response only after visual QA.

## Phase 03K — iPhone Stage Reliability / Real Device Diagnostics

- [x] Remove obsolete 62px fixed header on narrow portrait phones to prevent the five top-bar controls overlapping the canvas.
- [x] Short landscape layout: compact one-line header, left artwork, right scrollable control deck, no old 580px/250px minimum heights.
- [x] Honor iPhone notch/home-indicator safe-area insets and reduced-height Safari visual viewports.
- [x] Pre-module JavaScript exception diagnostics so blank-canvas import crashes can display and copy a real error without resetting state.
- [x] WebGL context-loss, restore and renderer error reporting; keep the world paused and preservable.
- [x] Opt-in actual FPS, draw calls, GPU geometry/texture counts and live-world size with copyable report.
- [x] Simulated failure and token-redaction tests, DOM ID/JS syntax and responsive CSS override source checks.
- [ ] Actual npm/Vite production build and real WebGL2 screenshots.
- [ ] iPhone Safari portrait/landscape multi-touch QA and FPS report capture.
- [ ] Optimize visuals based on measurements, then pursue more ambitious crystal optical depth.

## Phase 03L — Ghost Mineral / Causal Age-Grown Optical Layers

- [x] Optional layered physical crystal skins and tiny 3D inclusion nodules derived only from persistent voxel age, exposure, fracture and stored pigments.
- [x] Four opal/spectral/smoke/frost looks plus OFF, with independent controllable translucent skin and inclusion density.
- [x] Two separate instanced GPU draw budgets (1,150 skin shells and 1,450 inclusion nodules), both off/zero draws by default.
- [x] Deterministic placement using voxel-ID hashing; never consume living simulation RNG or alter chemistry, growth, deformation, or fracture.
- [x] Age maturity refresh every six CA generations only while optics enabled and colony populated.
- [x] Complete DNA/checkpoint settings plus old-world restoration to OFF; all 199 MATHEMAGICAL and starter palette entries unchanged.
- [x] Headless numerical and exact continuing simulation regression checks, source syntax and interface ID checks.
- [ ] Real Vite production build and actual iPhone Safari PBR/transparency appearance / FPS QA.
- [ ] Calibrate transmittance/overdraw against screenshots before attempting true refractive optics.

## Phase 03M — Mineral Metamorphosis / Optics Earned Through Age

- [x] Three causal PBR crystal material stages: Young Glass, Mature Opal and Faulted Mineral based on real cell age, CA maturity, stored stress, microcracks and neighboring permanent fracture scars.
- [x] Quiet Geological Aging, Opaline Life Cycle and Feral Spectral Mutation presets, plus OFF, independent crystal age threshold and fault sensitivity.
- [x] Physical Three.js roughness, metalness, clearcoat, iridescence and thin-film thickness change by life stage; no RGB cycle or image filter.
- [x] At most three *shared-geometry* core InstancedMesh draws when enabled; original single mesh untouched when OFF, no duplicated mineral geometry or physics.
- [x] Stage-aware touch surface picking for Crystal Pressure Witch, dynamic shape control, saved-world full geometry and material restoration.
- [x] Throttled optical maturation refresh every four CA generations only when enabled, no new solver RNG use.
- [x] Preserve all 194 source-verified MATHEMAGICAL palettes plus five original EX NIHILO palettes (199); original per-cell birth colors remain intact.
- [x] Headless stage classification, material parameters, old-save defaults and exact continuing physics/save replay.
- [ ] Production Vite build and physical iPhone Safari WebGL2 optical-quality/FPS examination.
- [ ] Refine eye-catching crystal lighting according to real screenshots and FPS diagnostics, avoiding unsupported heavy GPU optics.

## Phase 03N — Crystal Bloodlines / Real Ancestry and Inherited Material Traits

- [x] Actual synchronous crystal birth parent identity (immutable birth-event ID), founder-family identity and three stored 8-bit inherited mineral genes.
- [x] Deterministic mutation preserving base simulation RNG and separate family roots from hand-seeded crystals.
- [x] Optional bounded gene/3D direction factor in future CA birth probabilities; genuinely affects crystal growth topology instead of just appearance.
- [x] Reversible inherited facet elongation and a single capped 1,100-instance mesh of small physically shaded genealogical mineral-stratum rings.
- [x] Modes OFF / Crystal Brocade / Genealogical Strata / Hereditary Abnormalities and artist controls for morphology intensity, real growth influence and future mutation.
- [x] Complete DNA/world save of birth-event identity, parent, family and genes with strict validation; preserve legacy untracked crystals without fictional ancestors.
- [x] 199 original MATHEMAGICAL + EX NIHILO palettes, frozen birth color, 3D crystal-growth/fracture and prior iPhone touch controls preserved.
- [x] Headless parentage, mutation, CA topology effect, cell reuse, separate founder lines, exact continuing replay and mixed-era save testing.
- [ ] Actual Vite production build, iPhone Safari WebGL2 lineage band rendering / FPS QA.
- [ ] Family-selection/highlight and lineage tracing; consider multilateral mineral genealogy only after mobile validation.

## Phase 03O — Crystal Family Witch / Touch-Inspectable Living Genealogy

- [x] Tap an actual living mineral cell and resolve mutable Three.js instance slots (including all Young/Mature/Fault meshes) to its immutable real birth ID.
- [x] Show living founder family, descendant-only branches, direct parent/selected event, and truthful extinct/unknown links without inventing dead ancestors.
- [x] Non-destructive capped 900-instance birth-pigment beacons, 600 actual living-parent 3D connections, and selected camera-facing halo.
- [x] One-finger short tap only; drag, interrupted two-finger gestures, cancellation and orbit are kept separate from family inspection.
- [x] Save selected birth ID, founder family and focus mode in DNA/world checkpoints; pre-03O worlds start unselected.
- [x] NEW and ERASE CRYSTALS clear a stale family selection so recycled birth IDs cannot misidentify descendants.
- [x] Original 194 MATHEMAGICAL source palettes + 5 EX NIHILO, saved pigments and crystal growth/fracture/chemical math preserved.
- [x] Headless two-founder selection, extinct-parent genealogy, classic/staged mapping, save/replay, invalid-ID and UI/DOM source checks.
- [ ] Real iPhone Safari WebGL2 touch/visual and FPS profiling; official npm production build remains unverified.
- [ ] After real-device feedback, explore controlled cross-family mineral inheritance at future contact births.

## Phase 04A — SURFACE ART / Growing Full-Canvas Compositions

- [x] Independent 192×192 *living 2D* material CA alongside the existing 34³ 3D OBJECT domain, not a flat render filter.
- [x] Spherulitic dense radial domains, anisotropic dendritic mineral veins with persistent negative space, and oriented precipitate strata; genuine parent-owned growth fronts and competitive territory boundaries.
- [x] Independent nuclei from scatter/radial/hex/ribbon arrangements, with touch-plantable centers, confirmed reseed and seed/rate/coverage/speed controls.
- [x] Real periodic left/right and top/bottom neighbor connectivity for seamless repeating texture physics; adjustable historical color-band relief/contrast.
- [x] Full-screen Canvas2D stage with aspect-preserving cover crop, light-catching surface pixel relief and thin 3D-family-history-derived 2D contact seams.
- [x] 2048×2048 PNG upscale with export-resolution real family-boundary line work; native simulation remains 192² (not falsely marketed as native 2048²).
- [x] 3D world pauses rather than resets when entering 2D surface. Original 199 palettes and immutable previously deposited colors preserved.
- [x] DNA laws and full-world checkpoint persist 2D surface RNG, seeds, active frontier, immutable pigment, territory, graph distance and cellular age.
- [x] Legacy saved worlds default OBJECT; corrupt surface history rejected before mutating the artist's world.
- [x] Headless surface growth, periodic topology, exact continued replay and DOM/source audit.
- [ ] Real iPhone Safari rendering, tap/drag, orientation and 2048px PNG inspection + FPS benchmark.
- [ ] Higher-density geometry, mature pattern composition, advanced caustic/structural shader layers and proper GIF/MP4 loop export.

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
