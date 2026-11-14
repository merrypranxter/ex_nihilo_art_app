# Phase 03I — Crystal Fracture Memory

**Status:** implemented as an actual accumulated material history in the existing 3D crystal cellular automaton, behind explicit controls. This is NOT a displacement shader, instant mesh split, or rendering preset.

## What changes

Crystal pressure tools now include **⚡ ACCUMULATE STRAIN**. Touching the artwork authors a real 3D strain source whose influence is sustained over multiple crystal generations. Existing **CLEAVE** marks also add *directional* strain when Fracture Memory is enabled.

Each occupied crystal voxel stores:

- `strain[i]` (float, bounded to 0–1.35): current mechanically transmitted stress
- `damage[i]` (byte): 0 intact, 1 visibly microcracked, 2 permanently fractured **void scar**

Unlike an immediate visual warp, the material has memory. Strain propagates across **face-connected occupied crystal neighbors**; it cannot tunnel diagonally through empty space. Stress decays when no longer driven, but a crack retains its history; a fractured void remains unfillable until the colony is explicitly cleared/reinitialized. Future growth responds because the 3D CA's candidate-birth rule excludes scarred voids. Existing crystals can fracture only during later CA updates, never when the finger is merely moving.

## Synchronous material transport

Each CA tick computes from the previous generation's stress values (no within-tick propagation cascade):

```
K(d,r) = exp(-|d|² / (2r²)) inside 3r
source = sum(strength * K) for STRAIN marks
       + sum(0.9 * strength * aligned_seam(d,r)) for CLEAVE marks

adjacentMean = sum(previous strain at face-connected crystal neighbors) / count
nextStrain = clamp(
    0.985 * priorStrain
  + transfer * (adjacentMean - priorStrain)
  + 0.165 * source,
  0, 1.35
)

microcrack if nextStrain >= 0.57 * breakThreshold
fracture candidate if mature and nextStrain >= breakThreshold
```

The conduction coefficient can be changed from 0 to 0.48; breaking threshold ranges from 0.60 to 1.20. Brush reach and pressure strength are shared with the previous Crystal Pressure Witch.

**Structural preservation:** fracture candidates are deterministic, ranked by accumulated strain (stable lattice index breaks ties). A single tick can fracture at most 12% of the colony; at least eight occupied crystal cells are preserved as a viable nucleus. This avoids the failure discovered during testing where stress destroyed all early growth and left no visual artwork. Cracks may appear on the protected remainder, but they cannot shatter while the colony is too small. The user may clear/reset the colony explicitly when they want to start over.

## Visual rendering

The existing instanced crystal mesh is retained. Cracked voxels receive subtle anisotropic scale adjustment and a restrained light tint, while a capped set of thin 3D scar lines indicates actual damaged positions. When a cell fractures, it disappears from the occupied lattice but its hairline scar and growth-excluding `damage=2` state remain. No photorealistic GPU fracture shaders, proprietary assets, new render passes, or fake prebuilt crystals are introduced; the overlay only visualizes persisted CA state.

A running status reports cracked cells and permanent fracture scars. The PRESS quick action now selects STRAIN; the old GROW, SHIELD and CLEAVE tools remain intact. Controls live in CRYSTALS → **FRACTURE MEMORY — MINERAL STIFFNESS**, with one explicit toggle to enable/disable the new physics.

## Backward compatibility and history

Existing v1/v2/v3 saves from before 03I lack `colony.strain`/`colony.damage`. Restore initializes both to zero and **disables new fracture physics** on those old worlds, so existing CLEAVE marks keep their previous mathematical behavior. The artist can opt in using the toggle. Old DNA whose colony settings lack `strainEnabled` also stays in historical mode.

New worlds default to Fracture Memory ON, while the crystal colony engine itself stays disabled until the artist starts/seed it.

New world checkpoints save the exact float strain field, the persistent crack/scar lattice, and all colony settings. An invalid field fails validation **before any live world state is overwritten**. The scratch buffer is not saved; it is recomputed from the persisted stress history on each generation. A canceled pressure gesture restores its prior semantic field state. Undo removes or alters future pressure instructions, **not crystal damage that has already happened**; for biological time-travel, LOAD WORLD from a checkpoint.

The exact source-authored 194 MATHEMAGICAL palettes plus the five EX NIHILO original palettes (199) remain available, and new crystal births use the currently selected/edited stop array. Existing deposited RGB pigments remain frozen.

## Testing performed

- [x] Contact-only strain conduction: direct face neighbors carry stress, diagonal and disconnected empty space do not
- [x] Actual crystal birth and chemistry preserved; STRAIN marks alone cannot fabricate an instantaneous crystal
- [x] Damage history advances from pristine → microcrack → real missing-crystal scar
- [x] Fracture scars prevent future CA births at broken sites
- [x] Sustained pressure fractures only a bounded fraction per generation and retains a living mineral nucleus
- [x] Exact saved-world restore and deterministic future replay with the new strain/damage fields
- [x] Older v3 checkpoint remains non-fatiguing until the new system is enabled manually
- [x] Invalid strain and damaged-cell maps cannot overwrite live artwork
- [x] Source parsing and DOM ID/HTML structure validation

**Outstanding:** actual `vite build`, WebGL2/Three.js visual QA, iPhone Safari multi-finger raycasting and frame-rate profiling; appearance must be judged in browser. No Netlify deployment, paid external API, or automatic background work.

## Next material direction

Experiment with age/ancestry-dependent toughness, bounded anisotropic tension along deposited fiber axes, optional crystalline healing (only with explicit artist action), and image-quality optical refinement **after** actual iPhone testing.
