# EX NIHILO — Phase 04F / The Loop Forge

## What this phase actually exports

A new collapsible **LOOP FORGE** panel inside SURFACE ART can preview and export a **GIF89a** locally, or an **actual MP4** only if the current browser reports a compatible `MediaRecorder` MP4 encoding MIME type **and** canvas.captureStream is present. A WebM recording is **never renamed** MP4.

The exporter freezes a clone of the real 192×192 cellular mineral surface, remembers the existing DNA/material/light configuration and background, and draws each frame into a separate canvas. The living surface and the independent 3D organism are never advanced by exporting. Normal pause state is restored after the capture, except the app remains paused if it was backgrounded or the screen locked. Gesture Witch field marks remain recorded in the material DNA/history, but editing overlays do not appear in animation frames.

### Export controls

- Loop: **2, 3, 5, or 10 seconds**
- FPS: **12, 18, or 24** frames per second
- Output: **512, 768, or 1024 px square**; dynamic GIF budget rejects requests over 50 million pixel-frames; extreme 1024/24fps/10sec MP4 is also rejected
- Mode: **LIGHT ORBIT**, **FILM TIDE**, or **LIVING MATERIAL**
- Motion path: **PERFECT PERIODIC CYCLE** or **BOOMERANG** (forward then back, with a smooth turnaround)
- Preview / Stop, Export GIF/MP4, Cancel Export, and progress status

The GIF path samples exactly `i / frameCount` and a mathematical return-to-start phase. A separate, pure periodic function also powers live preview. The GIF frame times are assigned as differences of rounded absolute centisecond times, so a requested N-second loop sums to exactly N×100 centiseconds at 12/18/24fps. The encoder writes a deterministic 256-color RGB332 global palette and GIF89a LZW-compressed full frames with Netscape infinite repeat. This preserves source-motion period and explicit GIF file timing; GIF's 256-color limit introduces expected gradient quantization. The raw source simulation remains full-palette for PNG and MP4.

**Validation:** A standalone 24-frame GIF created with the encoder's equivalent LZW implementation was opened and decoded through Pillow. Its first attempt exposed a threshold bit-width error, which was corrected and retested. The production encoder now uses equivalent corrected LZW code and a memory-safe sequence of per-frame Uint8Array chunks rather than retaining every compressed byte as a JavaScript array number.

### Motion is real, bounded and deterministic

- **LIGHT ORBIT:** shifts the incident light direction over retained normals.
- **FILM TIDE:** changes actual phase-dependent coating thickness over depth, age, and founder phase, affecting the existing three-band OPAL and 81-band SPECTRAL OPAL optical calculations. It does not create new crystal births and has little effect on quartz/ghost when coating is absent.
- **LIVING MATERIAL:** combines the light orbit + cyclic coating tide + local crystallographic orientation and globule-radius variations in microstructure geometry. Microstructures derive from real owner/age/depth/founder fields, not unrelated image noise.

All newly introduced phase controls are zero by default in the old material functions, preserving earlier rendering exactly when Loop Forge is not in use. The unchanged original 2048px PNG still exists. No new paid APIs or runtime packages.

### MP4 is feature-detected, not guaranteed

The MP4 path uses `MediaRecorder` with `video/mp4` MIME and H.264 candidate strings where supported. If unsupported, the UI disables MP4 and directs the user to GIF instead. It uses `captureStream(0)` + `requestFrame()` where supported or `captureStream(fps)` as fallback. Encoded media timestamps are provided by the browser in realtime, not by a custom MP4 muxer. On CPU-limited iPhone Safari, dropped frames, delayed render intervals, inaccurate duration and playback hiccups are possible.

**Never claim that MP4 is frame-perfect solely because a periodic material phase was sampled.** The GIF path is deterministic/offline; MP4 needs real device testing. Video codec output/support can differ across Safari versions.

### Performance and safety

- GIF budget is capped before allocation; encoder stores compressed typed frame chunks, not raw RGBA histories
- Animation frames are rendered individually and released; each GIF frame yields periodically to the browser event loop
- Progress is visible; capture may be canceled by the user or when iOS backgrounds the app
- The original editable surface and 3D organism remain independent
- Settings save into DNA/checkpoints: duration, FPS, size, motion choice and playback choice; **export format** is an ephemeral user workflow choice
- GIFs are square (1:1) in this phase. Portrait 9:16 and 16:9 movie framing are NOT implemented here.
- Existing artwork animation on the main stage is a preview quality tier; final GIF/MP4 frames are offscreen
- Netlify: every 04F development commit carries `[skip netlify]`. Do **not** open PRs for this workflow unless automatic deploy previews are disabled in the project's Netlify settings.

### Verification

- Pure source V8 syntax validation passed for all edited/imported modules.
- Pure-core checks passed: loop endpoints, boomerang, FPS exact centisecond totals, safety budgets, MP4 MIME gating, material motion distinction and immutable-world optical phase response.
- GIF89a local sample was decoded successfully in Pillow using the corrected LZW implementation.
- Added `tests/surface-loop-forge.test.js` (Node tests) for pure functions, exported format, source-state invariants, DNA and UI wiring.
- **Not verified**: complete `npm test` suite, Vite build, real Safari export/download behavior, MP4 audio/video timestamps, H.264 playback in TikTok/CapCut, thermal/device responsiveness, looping perceptual seam from real recorded MP4.

## Follow-up

Future Phase 04G: offline deterministic MP4 muxing if a verified, dependency-bounded H.264/AAC/WebCodecs pipeline is acceptable; portrait 9:16 framing and high bitrate controls; high-res video frame diagnostics; better GIF palette optimization/ordered dithering and crop-safe texture tiling. None of these future capabilities should be conflated with this phase.
