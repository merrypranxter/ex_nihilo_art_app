# Phase 03O — Crystal Family Witch / Honest Living Genealogy

EX NIHILO now lets the artist **tap an actual 3D crystal and explore its living family** without editing the material, its genes, nutrient source, fractured history, or colors.

## What can be inspected

- **Family:** all currently living crystals with the same true founder-family birth-event ID
- **Descendant branch:** the selected crystal (if living) plus descendants reachable by surviving direct parent–child birth-event records
- **Direct parent and founder:** historical numeric event IDs, plus an actual location only when that original cell is still living
- **Extinct selected ancestor:** focus remains on its immutable event ID and saved family ID; the living family or still-traceable descendant branch can remain highlighted after it dies
- **Honest missing links:** no invented edges across missing, dead or untracked parents. Descendant chains can end at missing intermediary parents because Phase 03N saved each cell's immediate parent, *not* an eternal full genealogy history
- **Pre-03N legacy crystals:** explicitly displayed as *untracked historical crystals*, not assigned fictitious ancestors

Every selected cell is identified by its immutable **birth-event ID**, not a screen-space position, ordinal voxel index, or unstable Three.js draw slot.

## How to use

Open **CRYSTALS → FAMILY INSPECTOR** and tap **PICK A CRYSTAL**. Then tap a visible crystal in the pinned artwork. The same tool is available in **TOUCH → INSPECT CRYSTAL FAMILY**.

Choose **LIVING FAMILY** or **DESCENDANT BRANCH**. The status line reports the selected birth event, whether that individual still lives, founder family, original parent ID if known, count of living children, traceable descendants, and number of visible relatives. **CLEAR FOCUS** hides the markers without erasing anything.

A one-finger tap is required (maximum 14px movement). Drags, canceled pointers, second-finger interruptions and incomplete gestures cannot select a different crystal or invoke a destructive editing action. ORBIT remains a separate camera-only tool.

### Actual mathematical relationships, not inferred geometry

`src/crystal-family-inspector.js` creates a read-only lookup of **currently occupied voxels** keyed by saved `colony.birthIds`. Direct edges are created only if **both parent and child birth events are still alive** and the parent ID in the child's saved record matches exactly. The `family` mode uses saved founder IDs, while `descendants` traverses currently living child records from the original selected event—even if that event has already gone extinct.

The collection never calls `engine.step`, mutates `colony.cells`, modifies stored `colony.colors`, consumes simulation random numbers or claims a missing ancestor was present.

### GPU draw-slot mapping

The renderer assigns occupied cells to mutable instance slots while updating growth geometry. When MINERAL METAMORPHOSIS is enabled, the same cells are reorganized into three age/stress material meshes. A raycast `instanceId` therefore **cannot** be used as a birth ID or even as a voxel ID.

This phase records `crystalSlotToVoxel` and a separate `ageSlotToVoxel[stage]` map every time `syncCrystals()` rebuilds the corresponding instanced meshes. Picking resolves the hit object/instance through the correct mapping, then looks up the actual saved birth ID at that voxel. It raycasts only the currently visible *original crystal geometry*—not the selection beacons, fracture accent facets, ghost skins or decorations.

### Visible overlay with strict iPhone budgets

A single small Octahedron InstancedMesh uses up to **900** physically located family markers, with brightness lifted from the selected cells' frozen pigment (birth RGB remains unchanged). Families larger than 900 are sampled uniformly across their live voxel list, rather than only showing the first 900.

A single LineSegments geometry shows at most **600** direct surviving parent–child links, colored at each endpoint using the actual historical birth RGB. No lines connect to dead or missing ancestors, no straight line is invented between unrelated crystals, and no phantom family tree is rendered.

A single camera-facing Torus highlight identifies the **specifically selected living crystal** so it is distinguishable from its relatives. In an extinct-selected-parent case that halo disappears while remaining family members still show.

The family overlays are completely hidden, with zero selected instances and zero link draw range, when no family is selected. This is an optional local view and adds no new simulation state.

## Save and reset

The selected immutable `crystalFocusBirthId`, fallback `crystalFocusFamilyId` and `crystalFocusMode` are normal artist view options in saved DNA / whole-world checkpoints. An extinct parent can therefore still reveal its surviving family after loading. Invalid negative/out-of-range focus IDs and inherited JavaScript object-property mode names are sanitized.

Old DNA/world files missing the new fields load with no selection and family mode as default. Starting **NEW** and explicitly **ERASE CRYSTAL COLONY** both clear focus to prevent reused IDs in a fresh universe from accidentally selecting unrelated crystals.

This is *not* a forever-growing ancestor database; Phase 03N saved parent IDs and current living-cell identities, not an exhaustive historical archive of all dead ancestors.

## Testing done

- [x] Two separate seeded founder families remain separately selectable
- [x] Family view contains only matching saved founder IDs
- [x] Descendant branch is a subset of the family, tracing only true living direct parent links
- [x] A dead selected parent can still show living relatives; no false line to its empty voxel
- [x] Legacy untracked crystal is not assigned imaginary parents
- [x] Raycast stage mappings correctly convert both classic and Young/Mature/Fault instance slots to actual voxels
- [x] 900-beacon bound samples large families across their full voxel extent
- [x] Read-only queries do not alter any CA history or RNG
- [x] Whole-world checkpoint saves exact focus state and continues replay deterministically; unselected/selected worlds have identical organism state
- [x] Pre-inspector saves default to no selection and invalid focus IDs are sanitized
- [x] All **199** original palette selections retained (194 MATHEMAGICAL vault + 5 EX NIHILO originals)
- [x] Source syntax, unique DOM bindings and balanced HTML checked
- [ ] Real npm/Vite production build and actual Safari iPhone touch, WebGL2 material visibility, FPS, and memory benchmarks

No Netlify deployment, paid APIs, or automatic GPU simulation/physics changes.

## Next material direction

When device performance confirms the overlay is comfortable, investigate **two-parent mineral-front interaction**: actual cross-family contact boundaries and controlled trait exchange at *future births*, not a cosmetic blanket recolor or retroactive parent rewriting. Keep lineage identities stable and all existing checkpoint variants valid.
