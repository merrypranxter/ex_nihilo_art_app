# EX NIHILO — Phase 04I / Drawn Camera Journey

## Camera becomes an authored document

Phase 04H supplied canned periodic camera choreography. **Phase 04I turns the artist's own drawn stroke into a reusable camera movement** over the existing 2D mineral canvas. Nothing in the growth automaton, 3D organism, palettes, surface genealogy, birth pigment or 04D Gesture Witch field editing is changed.

### Finger workflow

1. Choose **SURFACE ART → LOOP FORGE → CHOREOGRAPHY → DRAW YOUR OWN CAMERA PATH**.
2. Tap **DRAW PATH ON ART**. If the loop preview is not open, it opens and pauses at the current preview phase. This explicitly switches the canvas from crystal painting to camera path drawing.
3. Draw over visible minerals. The app reverses the current 1:1 / 9:16 / 16:9 / 3:4 / 4:3 crop transform to store points in **actual source mineral UV**, not display pixels. Background letterbox bars are rejected as non-artwork.
4. Finger-up commits one path, with stable ID, at most 72 bounded source-point anchors, normalized draw-time information, and a single Undo checkpoint. Subsequent drawn paths replace the former path reversibly.
5. Choose **Circuit** or **Retrace**, and choose **Even Speed**, **Hand Rhythm**, or **Linger**. Add Smoothing, Microscope Zoom (defaults 1.45× so portrait crops can actually pan in both axes), and optional periodic Zoom Pulse. Press Preview / Resume from Scrub to see the route and export through the existing GIF/MP4 engines.

Buttons: **DRAW**, **SHOW/HIDE PATH**, **REVERSE DIRECTION**, **UNDO**, **REDO**, and **CLEAR PATH** (explicit confirmation). A named path is visible as a magenta/acid-yellow stroke with start and end markers in preview only. GIF/MP4 never renders the route overlay.

### Actual mathematics

The document schema is:

```json
{
  "version": 1,
  "id": 1,
  "points": [
    [0.2, 0.3, 0],
    [0.4, 0.6, 0.2],
    [0.7, 0.45, 0.7],
    [0.2, 0.3, 1]
  ]
}
```

Coordinates are source-normalized `[u,v,time]` with finite values in [0,1] and nondecreasing normalized drawing time. The actual stored path need **not** manually return to the beginning.

- **Circuit:** Periodic Catmull–Rom/Hermite interpolation with a computed last-to-first segment. The path position and tangent are continuous at the loop seam when smoothing is enabled.
- **Retrace:** Forward and backwards traversal with cosine ease giving zero speed at the turn and at the start/end seam. No sudden jump.
- **Even speed:** Numerical arc-length lookup of the smoothed path, using a bounded cached table to reduce speed changes from uneven point spacing.
- **Hand rhythm:** Uses recorded relative drawing timings to preserve faster and slower hand movements. An automatic return segment in Circuit receives time proportional to its distance. Position remains closed, though abrupt authored speed differences can remain visible.
- **Linger:** Periodic slowing near the origin with a continuous progress function.
- **Zoom pulse:** A separate periodic magnification factor, with exact return to the baseline zoom at the seam.

All curves are sampled from the **same integer phase function** as material optical motion. A finite, deterministic path is evaluated separately in live preview and offscreen GIF/MP4 export. This is lens/crop motion; it is not an animated 3D camera or new mineral growth.

### Source-space lens geometry

The `src/surface-camera-path.js` module maps a desired source-space target to normalized `focusX/focusY` using exactly the source width/height returned by `cinematicFrameRect`, not by treating source coordinates as already being crop offsets. Near edges, the lens is clamped to the source frame rather than sampling imaginary crystal pixels. A given zoom and framing may restrict which path centers are achievable; raise zoom to travel farther, especially along the portrait long axis.

### Reversibility and safety

`CameraPathEditor` stores one retained path plus a six-entry Undo/Redo stack. A live draft never calls `engine.setConfig` or mutates existing saved paths. `pointercancel`, lost pointer capture, application blur, hidden tab and Escape roll back the draft. A second finger cancels a single-finger drawing rather than making an accidental Gesture Witch stroke. Pointer capture is scoped to the 2D surface stage; controls and page scrolling remain normal. Adaptive thinning keeps 72 or fewer anchors even during long strokes.

The document saves in `surfaceCameraPath` under the standard construction DNA and world checkpoints. Path mode, timing, smoothness, zoom and pulse settings save alongside. Historical DNA/checkpoints default to a null path and old **FROZEN** camera mode; old material engines stay intact. A confirmed **NEW UNIVERSE** clears old camera paths that might reference minerals erased by that reset, but an ordinary camera edit never touches the crystal simulation.

### Tests and limitations

- `tests/surface-camera-path.test.js`: schema bounds, path replacement/undo/redo, canceled touch, reverse, long-stroke simplification, circuit/retrace closure, timing differences, camera crop accuracy across aspect ratios, DNA/checkpoint preservation and DOM wiring.
- `tests/surface-camera-choreography.test.js` now expects the seventh additive camera mode.
- Pure V8 syntax and path-core checks were used; the full Node test suite and Vite production build have **not run in the GitHub-only tool environment**. An actual iPhone Safari test is still required for pointer-capture ordering, zoom gestures, encoder timing, export download and CPU/thermal performance.
- Existing GIF mathematical loop closure remains guaranteed at the source-phase level; Safari's real-time MP4 encoder can still drop frames or change timing.
- GIF stays RGB332 256-color; resolution and aspect limits from previous phases remain.
- No Netlify deploy was requested; direct GitHub merge with `[skip netlify]` avoids opening PR Deploy Previews.

## Next beyond this phase

A future version could add movable individual path anchors, a timeline of deliberately positioned zoom/keyframe events, independent camera roll/rotation and offline accurate-PTS MP4 encoding. Those are **not** implemented in Phase 04I.
