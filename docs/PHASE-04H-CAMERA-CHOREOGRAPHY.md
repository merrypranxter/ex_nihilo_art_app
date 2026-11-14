# EX NIHILO — Phase 04H / Camera Choreography

## Artistic goal

Phase 04G introduced accurate 1:1, 9:16, 16:9, 3:4 and 4:3 framing. Phase 04H turns that framing into an **artist-authored periodic camera trajectory** without moving any live mineral, growth-cell genealogy, pigment, optical material, Gesture Witch field, or the separate 3D organism.

The new pure module, `src/surface-camera-choreography.js`, computes a framing pose `{focusX, focusY, zoom}` for any sampled material phase. Both the interactive preview and the actual GIF/MP4 export use **the same function** and phase argument, so the camera and material illumination can be synchronized.

### Camera paths

| Mode | Distinct mechanism |
|---|---|
| FROZEN CAMERA | Byte-for-byte previous framing arguments for any phase (legacy default) |
| ORBITAL DRIFT | Continuous circle in the crop center with subtle phase-related zoom |
| FIGURE EIGHT | 1:2 Lissajous horizontal/vertical sweep, distinct cadence |
| MICROSCOPE DIVE | Periodic close-up and retreat with small location drift |
| PENDULUM SURVEY | Dominant horizontal scan with a soft vertical counter-motion |
| TARGET DIVE | Authored location interpolation plus an adjustable close-up; returns to home |

`cameraPose(phase, settings)` accepts only finite, bounded inputs. Pan remains within normalized 0–1 and zoom within 1.00–2.50. Orbit/figure-eight/survey use bounded amplitudes relative to the crop center to avoid hard edge clipping. Target Dive uses cosine easing from home to the chosen point and back.

Controls include camera preset, **travel distance**, **dive/zoom depth**, 1–3 integer motion cycles per GIF/movie period, phase offset (0–360°), and explicitly selected dive target X/Y. The camera choreography mode defaults to **FROZEN** for all old DNA/checkpoints, so existing 04G artwork remains visually unchanged until the artist selects a motion.

## Perfect mathematical closure

All paths are trigonometric functions of the exact integer `framePhase(i,frameCount,playback)`, already shared with optical animation. `cameraPose(0)` and `cameraPose(2π)` agree within floating-point rounding for *all* presets, integer cycle counts and phase offsets. No mutable camera integrator or random number draws are used.

Existing **boomerang playback** reverses the same pose trajectory with a smooth endpoint. GIF is sampled offline at exact phases; the previous 256-color palette / centisecond delay policy remains. MP4 still uses browser realtime `MediaRecorder`; its file header and bitrate diagnostics are as in 04G, and actual frame pacing cannot be guaranteed on Safari.

## Live scrubber and direct touch

The **SCRUB** slider reads an exact normalized phase of the entire synchronized mineral + camera loop and **freezes it** while selected; the paused preview stops redraw work until camera/optics settings or scrub position actually change. **RESUME FROM SCRUB** plays forward from the selected phase.

In preview only, artists may arm one of two distinct pointer tools:

- **GRAB CAMERA:** One finger drags the *composition* around the mineral. Two fingers pinch to magnify or zoom out. The base framing `surfaceLoopFocusX/Y` and `surfaceLoopZoom` are updated; the crystal world is unmodified. The pointer handler rebases when the second finger lands, and suppresses stray one-finger painting as one finger lifts.
- **PICK DIVE TARGET:** Tap a visible artwork location. The exact inverse of the cover/contain lens transform yields a normalized source point, sets the Target Dive X/Y, switches the preset to TARGET DIVE, and freezes for artist inspection. Background letterbox bars are excluded from targeting.

Pointer cancel/lost capture, app blur and Escape roll back an in-progress camera gesture. Normal Gesture Witch crystal/constraint painting remains available outside camera-preview touch mode; entering a camera-specific tool cannot create seeds, marks or birth events. A reticle marks the chosen target in preview only. Both reticle and social guides are deliberately excluded from all exported files.

A separate **CENTER CAMERA** restores the static base lens X/Y to 50% and zoom to 1.00× without destroying the selected motion, target or mineral history. Camera grab is a presentation edit, not part of the SurfaceGrowth checkpoint Undo stack.

## Preservation & architecture

- `src/surface-camera-choreography.js`: deterministic six-mode lens geometry and bounded touch deltas, with no DOM/Three.js dependency.
- `src/surface-cinematic.js`: `pickCinematicSource` reverses the same `cinematicFrameRect` crop math used in export.
- `src/main.js`: synchronized preview/export integration, scrub+replay, target reticle, touch camera and 3D independence.
- `src/engine.js`: save motion, travel, dive, phase offset, integer cycles and target coordinates in DNA/checkpoints; backward-compatible frozen defaults.
- `index.html` and `src/styles.css`: grouped touch-friendly camera controls beneath the existing output/crop settings.
- `tests/surface-camera-choreography.test.js`: 15 Node tests cover closure, distinct mechanisms, limits, source picking, boomerang, touch, legacy DNA and markup.

## Verification performed and limits

- Edited JS modules passed direct V8 syntax checks.
- Twelve standalone trajectory/geometry scenarios passed: 5 actual movement mechanisms + frozen baseline, seam continuity for multiple offsets/cycles, finite bounded framing, target location, boomerang, scrub phase equivalence, touch and letterbox rejection.
- HTML 04H control IDs are unique; `div` and `details` elements are balanced.
- The committed Node suite adds tests for DNA and actual UI wiring; **full `npm test`, Vite production build, and iPhone Safari touch/rendering QA were not run**, since the GitHub remote was not accessible from the local test container.
- This is a **2D composition camera** moving a crop over an actual 192² surface; it does not add a physical 3D depth camera or simulate new pixels. GIF mathematical loop is exact; MP4 timing still depends on browser encoder capability.
- No Netlify calls/deployments, no PR to trigger Deploy Preview, no paid services, no new dependencies. Each GitHub commit has the project's `[skip netlify]` safety marker; the intended integration is direct fast-forward to main.

## What to try first

Choose SURFACE ART → LOOP FORGE → CAMERA CHOREOGRAPHY → **MICROSCOPE DIVE**. Set a colorful opal/frosted or prismatic finish, 9:16 crop, 3s / 512px / 12fps GIF. Press Preview, drag Scrub, adjust Dive Depth and then export. For a personal close-up, choose TARGET DIVE, press PICK DIVE TARGET and tap a mineral feature; then RESUME FROM SCRUB.

Future phases might add keyframe tracks, persistent camera paths drawn as gestures, parallax texture probes and reliable offline video timestamps. Those are not claimed here.
