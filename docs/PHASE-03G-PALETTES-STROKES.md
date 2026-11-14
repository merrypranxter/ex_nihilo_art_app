# Phase 03G — Hand-drawn living field paths + complete MATHEMAGICAL palette vault

## Source-accurate color vault

EX NIHILO now carries an **offline, local copy of all 194 source-verified MATHEMAGICAL palettes** from:

- `merrypranxter/hyperbolica/data/mathemagical-palettes.json`, Git blob `0e00754404faae4cb28f57d7349eea066d3ff167`.
- Source JSON schema: `mathemagical/palette-library/v1`.
- Local module: `src/palette-vault.js` (full source stop arrays, palette names, original IDs, source provenance).
- Catalog adapter: `src/palettes.js`.
- Plus five existing Nerve Cathedral palettes (199 total choices).

All 194 source palettes retain their **exact 2–12 original hex color stops**, with no invented substitutes, automatic stop truncation, or baked gradient reapproximation. Their original IDs are namespaced under `vault:` so the original five IDs remain stable for old DNA. This is the artist's own source repo data.

The LIGHT tab has a source/name search, a live set of native editable per-stop color inputs, one-stop randomization, Shuffle Stops, Random RGB, Random Palette, Restore Source. The source library itself remains immutable. Per-artwork edited hex values are stored in `config.paletteStops` with the full-length source ramp. These overrides affect **new deposits and live material sampling**. Existing fiber pigment bytes remain unchanged. Note that reaction-diffusion **surface rendering** may be recolored when the live palette is changed; that surface's chemical state stays intact.

Background color remains a separate explicit control; selecting a palette never changes it. No paid API or network palette fetch is needed at runtime.

## Hand-drawn real-force fields

There are two additional tools in TOUCH:

- **STITCH GROWTH PATH**: touch-draw a world-space polyline. Each nearby active fiber tip feels a Gaussian support force toward its nearest point on the path plus an advective force along the local stroke tangent. Persistent numerical fields determine where **future** fibers grow; no prebuilt geometry is dropped in.
- **WARP GROWTH FIELD**: sweep a world-space path. This emits a Gaussian-supported local vector field along the direction of the artist's finger sweep, altering subsequent tip trajectories in that vicinity.

The artist changes `strokeRadius` (0.2–1.8 world units) and `strokeStrength` (0.1–3.0). Each path is capped at 48 3D control points, with 10 paths maximum per artwork. The force is capped at magnitude 8; this keeps the CPU growth integrator bounded on iPhone. Each path has stable integer ID, kind, radius, strength and 3D control points, and is displayed as a mint (guide) or pink (warp) line overlay.

Stroke drawing is an atomic `GrowthStrokeTransaction`. It records the exact prior node+path document and RNG, commits as one Undo on finger lift, and rolls back on pointercancel/blur/Escape/second-finger interruption/resize. The existing Gesture Witch vortex/node edits share the same unified Undo/Redo stack; undoing a node does not erase unrelated paths. An ERASE NODE touch near a stroke can remove that single path, and CLEAR PATHS is confirmed and Undoable.

The interventions only change the current and future growth **equations**. They do not deform already deposited fibers. Truly moving existing solid geometry would require a separate, validated mesh/graph deformation editor.

## Persistence and compatibility

- DNA includes custom palette stops, stroke radius/strength and drawn stroke records.
- World v3 checkpoints include the complete path collection and palette settings plus existing chemistry, crystals, nutrients, RNG and fibers.
- A pre-03G v1/v2/v3 save lacking stroke fields remains valid, loading no paths and preserving its previous palette and math.
- Malformed stroke documents and invalid hex arrays reject without modifying the current world.
- Undo/Redo is for **source/constraint documents only**; it does not erase material grown while a source was active. Save/restore complete world checkpoints for biological time travel.
- Gesture plane is camera-relative 3D world coordinates. It does not infer hidden surface depth from a single touch. ORBIT is always separate.

## Testing completed

- Verified 194 original palette IDs/names/stops and 5 preserved starter ramps.
- Verified exact 3D force effect of strokes on live `fieldAt`, distinct guide vs warp behavior, capped complexity, cancel rollback, node+stroke unified Undo and Redo.
- Verified full state exact restore and identical subsequent simulation with strokes and custom palette colors.
- Verified malformed/stale inputs rejected without corrupting state; pre-03G world restores.
- Verified module syntax and matching HTML DOM IDs.

**Not tested:** production Vite build, iPhone Safari/real WebGL2 touch performance, visual appearance at final resolution, and native color input interaction on an actual device. No Netlify deploy.
