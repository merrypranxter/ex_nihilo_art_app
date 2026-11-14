# Phase 03H — Crystal Pressure Witch

## What direct manipulation changes

A crystal-pressure mark is an artist-controlled **persistent material constraint** on the existing 3D cellular automaton (34³ voxels; at most 4,800 living cells). It is not a displacement shader, image-warped mesh, generated prefab, or an instant erase command.

Use the CRYSTALS or TOUCH panel to choose:
- **GROWTH PRESS:** increase real CA birth probabilities near the 3D press center.
- **SHIELD GROWTH:** suppress CA births near the press center, leaving previously crystallized matter untouched.
- **CLEAVE / SPLIT:** orient a stress seam from finger drag or two-finger twist; suppress births and permit *subsequent* mature-cell erosion along the seam while increasing birth probability on two shoulders. The result emerges over multiple future CA generations.

Touch an existing crystal: pointer raycasting picks its real rendered surface. In empty space: use the standard camera-parallel world plane. Once a press begins, movement stays on a camera-parallel plane at its original 3D depth. First finger drags a center and establishes cleavage-axis direction, a second finger pinches the local world-space support radius or twists the axis. Release commits one named mark. Cancel/interrupt restores the old mark and RNG.

**This does not read physical force from an iPhone screen.** Touch position and gestures control an explicit strength slider, brush radius and cleavage direction. Apple's multitouch does not provide a reliably comparable force measurement across iPhone models. The word PRESS describes the material operation, not hardware force sensitivity.

## Mathematical law and limits

```
d = world_position - mark.center
K(d,r) = exp(-|d|² / (2 r²)) for |d| <= 3r
GROW:    birth_multiplier *= (1 + 1.75 * strength * K)
SHIELD:  birth_multiplier *= exp(-2.2 * strength * K)
CLEAVE:  a = abs(dot(d,axis)), b² = max(0,|d|² - a²)
         seam = exp(-(a/(0.19r))²) * exp(-b²/(1.5r²))
         sides = exp(-((a-0.66r)/(0.32r))²) * exp(-b²/(2r²))
         birth_multiplier *= max(.02, 1 + strength * (2.15*sides - 1.48*seam))
         erosion_chance = 1 - (1 - previous_chance) *
                               (1 - min(.68,.34*strength*seam))
```

Rates are limited: birth multiplier [0.015,5], stress erosion [0,0.72], radius [0.25,2.1], strength [0.1,2.4]. At most 12 pressure marks, each with a unique identity, unit 3D axis, 3D center and mode. The CA only samples stress for *neighbor-supported birth candidates* and mature crystal cells; no mark creates material out of a disconnected void. This helps bound iPhone compute cost. Erosion continues through the CA clock and does not happen during a finger drag.

The original unmarked CA rules and random number sequence are unchanged. This phase also corrects the colony updater to use `engine.currentPalette()` so new crystal births use the chosen original MATHEMAGICAL palette **or live per-stop color overrides**, not a stale unedited swatch array.

## Editing and persistence

- A pressure gesture is an atomic `CrystalPressureTransaction`. It stores the exact original field document (nodes, guide/warp strokes, pressure marks) and RNG. One finger lift = one Undo; Escape, blur, pointercancel, lost capture, app background or interrupted editing rolls back.
- Pressure marks share the existing unified Undo/Redo history with vortex sources and field strokes. Undo affects field instructions, **not crystal matter already grown in the past**.
- Confirmed CLEAR PRESSURE MARKS is Undoable and does not erase existing crystal material.
- DNA and world checkpoints include `pressures`. Older checkpoints lacking it restore an empty pressure list without changing historical growth.
- Pressure radius, strength, modes, center and axis have strict validation **before** a saved-world restore can mutate live state.
- Existing 194 MATHEMAGICAL palette entries plus the five original EX NIHILO palettes are preserved (199 total).

## QA status

**Completed using headless logic:** three distinct pressure modes, controlled real CA birth/erosion effects, balanced two-front cleavage, pinch/twist stability, cancel rollback, unified undo/redo, full historical save restoration, exact continued growth, source syntax and HTML DOM integrity.

**Not yet tested:** production `vite build`, real iPhone Safari multitouch/raycast responsiveness, visual quality, and actual GPU/CPU profiling on the user's device. No Netlify deployment or paid API was called.

## Potential next phase

Offer low-cost optional localized crystal strain accumulation (persistent 3D stress with relaxation), touch-drawn fracture networks, pressure masks that modulate actual mineral face optics by age, and sparse-cell performance profiling. Keep stable cell identities, mathematical causality and Undo separate from time-travel checkpoints.
