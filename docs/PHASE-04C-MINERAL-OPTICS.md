# Phase 04C — Mineral Optical Witchcraft

## Goal

Art-directed, materially grounded optical rendering of the independent **SURFACE ART** growth domain. This is a **view layer** over real retained 192×192 crystalline history: it does not alter births, front ownership, 3D geometry, save arrays, or the 199-palette vault.

Phase 04B governs **where material forms**. Phase 04C governs **what that retained material does to illustrative incident light**.

## Materials (select in SURFACE ART → MINERAL OPTICAL LAB)

1. **ORIGINAL MINERAL:** byte-exact 04B renderer, with no optics pass. Older saved DNA/checkpoints missing 04C fields load this setting intentionally.
2. **OPAL FIRE:** illustrative dielectric thin-film interference for three sample wavelengths (red 630nm, green 540nm, blue 460nm), with film thickness modulated by actual birth distance, retained age, and crystal family nucleus phase. Uses incident-light direction, specular glints and genuine cell exposure/contact. This is *not* a fully resolved spectral solution.
3. **PRISM GLASS:** approximate wavelength-dependent refraction via a Cauchy-like relative index difference; bilinearly offsets each original RGB channel in a local slope-derived direction. Refracted samples cannot cross a family border: original pigment remains the fallback. Includes facet illumination and contact-face glints.
4. **WET QUARTZ:** polished normals from true topological growth-distance gradients and exposed contours, with microfacet specular highlights and family boundaries.
5. **FROSTED AGATE:** wide diffuse scattering and crystal-distance band structure, with less specular brightness; keeps the original birth pigmentation.
6. **GHOST MINERAL:** visually transparent/translucent compositing **over the selected opaque artwork background**. This is a composited visual effect, not actual volume scattering or transparent PNG alpha.

## Controls

- Finish (off/opal/prism/quartz/frost/ghost)
- Optical intensity: 0–150%; zero is byte-identical to original image
- Film thickness: 90–800 nm (principally OPAL)
- Microfacet roughness: 0–100%
- Light azimuth: 0–360°
- Light loop: **4, 8, or 12 seconds**. Optical phase is periodic by construction. Motion drives the lamp direction, not the mineral growth model.
- **ANIMATE LIGHT / FREEZE LIGHT** and **RESTART LIGHT LOOP**: light may animate while growth is PAUSED; FREEZE LIGHT retains its current phase so PNG captures that appearance.

The finishing controls are grouped inside one collapsible light lab, with 3D OBJECT controls completely unaffected.

## Architecture and performance limits

- Pure module `src/surface-optics.js` has no DOM, WebGL, or THREE dependency.
- `surfaceOpticsPixels(surface, baseRGBA, options)` returns a new opaque `Uint8ClampedArray`; it never writes its input or any `SurfaceGrowth` fields.
- It only shades genuinely occupied surface cells; unoccupied background pixels remain exactly unchanged.
- Shape-specific illumination derives from saved owner IDs, depth, crystallographic nuclei, and age; wrap-aware cell adjacency is used for lighting and refraction.
- The underlying base image uses the existing `surfacePixels`; using OFF skips the new shader entirely.
- Preview refresh occurs on real growth, settings changes, or a capped ~12Hz optical-motion redraw. Optics motion is independent of the PAUSE growth switch.
- No new dependencies and no runtime external services or Netlify calls. The 3D scene is not touched when Surface Art is active.

## PNG and persistence

Existing 2048px PNG export now receives the same optical surface displayed in the canvas, *plus the original export-resolution real lineage-boundary strokes*. These still originate from only **192×192 actual simulation cells**; the 2048px export is resampled and is not native 2048px microscopic material. The completed 2D PNG is opaque.

Finish, intensity, thickness, roughness, static light direction, loop duration and motion enabled are saved in construction DNA and whole-world checkpoints. The **instantaneous loop phase is ephemeral presentation state**, reset on loading/restarting, and is not checkpointed. PNG captures the currently displayed optical phase. Do not claim time-exact replay of a saved video from a checkpoint.

## Tests and remaining QA

- Pure JS V8 smoke confirmed the six modes differ (except deliberate OFF), correct alpha, exact periodic light phase, immutability of material snapshot, and sampled waveband response.
- Added `tests/surface-optics.test.js`: no-op preservation, distinct materials, zero-intensity bypass, empty-space preservation, spectral and loop behavior, deterministic restoration, older DNA fallback, and DOM wiring.
- **Not yet verified:** complete local `npm test` or Vite production build, actual Safari frame rate/thermal budget, iPhone pointer QA, gradient banding, exact export seam appearance, browser download behavior.
- GIF/MP4 capture and truly native high-resolution optical fields are future phases.

## Research next

Phase 04D could add a native-resolution material shading layer (the field remains 192² but a shader samples analytic distance fields at output resolution), selective 16:9/9:16 composition framing, and a deterministic browser-local GIF/MP4 capture pipeline with explicit performance safeguards.
