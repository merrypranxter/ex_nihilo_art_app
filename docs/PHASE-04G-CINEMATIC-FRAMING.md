# EX NIHILO — Phase 04G / Cinematic Framing

## What this phase changes

The existing Phase 04F **LOOP FORGE** now composes the same read-only living 192×192 mineral surface into meaningful non-square GIF and browser-supported MP4 frames. The growth engine, 3D organism, 199 palettes, frozen birth pigment, 04D Gesture Witch and 04E optical materials remain intact.

### Framing is a camera-like edit, never image stretching

- **1:1** — the pre-04G square behavior
- **9:16** — vertical reels/TikTok/Shorts
- **16:9** — horizontal widescreen
- **3:4** — portrait
- **4:3** — landscape

`size` is now the **long output edge**, not necessarily the width. Example: `size=1024, aspect=9:16` creates **576 × 1024**; `size=1920, aspect=9:16` creates **1080 × 1920**. Output dimensions are rounded to even pixel counts to be more encoder-friendly.

**FILL FRAME** uses a centered/pannable/zoomable *source rect* matching the target aspect, then a single correctly proportional draw. It crops the original 1:1 mineral surface (horizontally for portrait, vertically for landscape). **FIT ALL ART** keeps the square full specimen with matching artwork background bars where necessary. Neither scales X and Y independently or distorts the physical mineral features.

- **Pan X/Y** each 0–100% of the allowed source crop displacement
- **Zoom** 1.00×–2.50×, bounded to the original source
- **Safe area:** dashed estimated social-app margin appears in the **live preview only**, never in GIF/MP4/still output. This is an illustrative overlay, not guaranteed to match future TikTok or Instagram UI.

Portrait preview uses a stage-fit view of the real intended output dimensions; no animation frame has to be recreated at output HD size during normal interactive preview.

## Bitrates & recording diagnostics

MP4 requested bitrate choices:

| Quality | Requested H.264/MP4 rate |
|---|---:|
| Balanced | 5 Mbps |
| High | 12 Mbps |
| Maximum | 20 Mbps |

These are `MediaRecorder` **hints**, not contractual delivered bitrates. Browsers/OSes may lower the actual rate, choose their own codec settings or refuse native MP4 entirely; the existing MP4 capability gate still disables the option when unsupported. Exported MP4 header is checked for the ISO BMFF `ftyp` signature before being offered as a .mp4. That verifies the file **family**, not every media sample or guaranteed playback compatibility.

During MP4 capture, the app measures **rendered frames**, **missed rendering deadlines**, **average and peak CPU frame-render durations**, recorder-reported videoBitsPerSecond where available, and wall-clock capture time. It displays missed render deadlines and average frame times after recording. These numbers **cannot reliably infer the number of frames dropped by the encoded stream**; Safari/CapCut/TikTok playback still needs a device test. A mathematically closed motion phase is not the same thing as a frame-perfect MP4 timeline.

## Memory and quality policy

Phase 04F's exact offline GIF phase/timing encoder remains intact. It now accepts rectangular width/height from the validated plan. A 50M *output pixel-frame* budget applies to GIF; maximum long edge **1024px** (because the existing encoder caps dimensions at 1024). MP4 is capped at 200M output pixel-frames, long edge up to 1920px; actual Safari performance may require smaller settings.

For a first iPhone run use **9:16, 512px long edge, 12fps, 2 or 3 seconds**, then increase to 768/1024 if it behaves well. For a full 1080×1920 MP4, select 1920px and a short clip at 12fps; capability and thermal budget determine whether the phone can manage it. The frame source is the same full-color 192×192 mineral simulation with output-resolution derived microstructure, NOT a simulated 1080×1920 cellular growth grid.

GIF is still 256-color RGB332, while PNG keeps full-color still output. The independent 2048px square PNG exporter is unchanged in this phase.

## Interoperability & persistence

All 04G aspect, framing, pan, zoom, requested bitrate, and preview-guide preferences are saved in DNA and checkpoints. Older saves default to **1:1, FILL, centered, 1×, High, guides on**. Gesture Witch editing automatically stops animated preview before manipulating the living material; actual export uses a snapshot clone and prevents new touches while recording.

The 3D object is untouched. No paid APIs, external GIF/MP4 conversion service, new dependencies, workflows, or Netlify deploy instructions were added. Development commits contain `[skip netlify]` and integration is by direct fast-forward, **without a GitHub PR** (which previously triggered billable Netlify Deploy Previews).

## Verification and known limits

- All modified core modules parse in standalone V8 checks.
- Nine pure framing/format tests passed: pixel-exact aspect dimensions, nondistorted crops, fit/letterboxing, valid pan/zoom, guide placement, format-aware pixel-frame caps, and bitrate mapping.
- New `tests/surface-cinematic.test.js` adds 11 regression tests, including DNA and DOM controls. An outdated Phase 04F pause-restoration test was updated to match the iOS background-safety behavior.
- **Not yet run:** complete Node `npm test` suite, Vite browser production build, iPhone Safari UI/gesture preview, real MP4 encoder behavior and 1080×1920/CapCut/TikTok visual playback. No claim of native 1920px growth simulation or guaranteed frame-perfect MP4 is made.

## Suggested next experiments

Future measured phases could include an export preview scrubber, author-controlled animation keyframes for camera pan/zoom, an *offline* accurate-PTS MP4 pipeline if browser capabilities and a credible muxer become available, and a better GIF palette with dithering. These are **not** part of 04G.
