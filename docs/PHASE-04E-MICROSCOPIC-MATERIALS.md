# EX NIHILO — Phase 04E / Microscopic Material Sorcery

## Purpose

Phase 04D made the 192×192 cellular mineral-growth surface causally touchable. Phase 04E separates **mineral material presentation** from that growth state. It adds a genuinely finer **output-resolution vector microstructure pass** and an opt-in, wavelength-sampled **dielectric film** shading model, without editing pigments, simulation history, Gesture Witch fields, genealogy, or the separate 3D Nerve Cathedral.

## 1. Texture Taxidermist — three mechanically distinct microstructures

The new module `src/surface-microstructure.js` reads occupied cell family IDs, founder phase/angle, growth-graph distance, mineral boundaries and retained topology:

- **Mother-of-pearl / LAMELLA**: paired layered platelet segments aligned along the family-specific crystallographic direction, with graph-depth-dependent pitch and slight curvature.
- **CLEAVAGE GLASS**: primary and secondary fracture lines concentrated where actual retained neighbor families and growth distances produce proxy stress, with different branching/angle rules.
- **PRECIOUS OPAL / VESICLE**: bounded globular microdomains (short polygon arcs), whose density, phase, orientation and size derive from the saved crystal family and depth.

No noise raster is overlaid across empty space. Geometry stays inside occupied cells and is deterministic at the same seed/surface checkpoint. Every microstructure has a distinct constructive rule, not just a change of palette or glow.

**Preview:** approximate sparse vector sampling of at most about 4200 occupied cells (then multiple strokes per cell), composited with the existing 192² optical base before Gesture Witch handles. This is a mobile-tier approximation, not pixel-exact to the high-res still.

**PNG:** after the original 192² image has been enlarged to **2048×2048**, an additional 2048px *vector stroke layer* is drawn at output pixel coordinates for all eligible occupied cells. Actual founder boundary lines still render above it. There are still only **192×192 actual growth cells**. Native subcell texture strokes are finer than nearest-neighbor upscaling, but they are *derived detail*, not a new physically simulated 2048² crystal field.

Both passes use `paintSurfaceMicrostructure`. Two grouped canvas paths (shadow and highlight) avoid one draw call per segment. Default `surfaceMicroMode='off'` means no change to pre-04E art. Micro density may be adjusted 0–100%; 0 is an exact no-op. The canvas editing overlay is excluded from PNG by design.

## 2. Iridescent Organist — physically based single-film Fresnel upgrade

Original Phase 04C OPAL mode remains untouched: a fast, illustrative RGB 3-band coating. The new **SPECTRAL OPAL** option is a separate and disabled-by-default choice (explicit artist selection).

The `src/surface-spectral.js` module implements the lossless **air / dielectric film / dielectric substrate** single-film formula with Snell angles and separate s and p amplitude coefficients. Reflected powers are

```
R = (r01^2 + r12^2 + 2*r01*r12*cos(phi))
    / (1 + (r01*r12)^2 + 2*r01*r12*cos(phi))
phi = 4*pi*n_film*filmThickness_nm*cos(theta_film)/wavelength_nm
```

Polarization blends s and p reflected powers (0=s, .5=unpolarized, 1=p). The engine samples **81 wavelengths, 380–780 nm at 5 nm intervals**, weighted by approximate analytic CIE 1931 matching curves (Wyman–Sloan–Shirley 2013, JCGT) and a **6504 K blackbody proxy** (not measured D65). Output is white-reference-balanced and converted to **linear sRGB**. LUT values remain linear; the per-pixel composite explicitly decodes base sRGB and re-encodes sRGB.

The film lookup is **48 thickness steps × 36 incidence angles**, cached for up to 3 physical parameter sets. The per-cell coating is read at an incidence angle derived from the existing retained mineral-distance normal field and the animated directional lamp, with thickness variation derived from actual family phase, growth distance and maturity. This is a **2D approximate normal/illumination field**; it does not claim 3D camera-parallax, real measured IOR, volume transmission, birefringence or a calibrated BRDF. The post-Fresnel reflected-light gain is a visibly labeled **artistic** boost, not measured conservation of energy.

Advanced controls: film index 1.05–2.10; substrate index 1.05–2.50; polarization 0–100%; reused 90–800 nm thickness. Changing these, or film thickness in SPECTRAL OPAL mode, uses a **slider release** rather than rebuilding the expensive full 81-band table on every pointer-motion event. Existing 4/8/12-second optical lamp loops remain periodic.

## 3. Preservation and UX

- Keeps the 199 palettes and editable color stops intact; the new texture passes shade rather than replace frozen birth pigment.
- Keeps original 3D object and material settings intact.
- Keeps all 04D Gesture Witch interventions and surface checkpoint undo/redo intact.
- Finishes and microstructure parameters live in their own groups inside SURFACE ART.
- Microstructure controls: OFF, LAMELLA, CLEAVAGE, VESICLE; density 0–100%.
- Construction DNA and complete checkpoints store these **appearance preferences**. Pre-04E DNA/checkpoints load OFF microstructure, original 1.46/1.62 index defaults and .5 polarization. Legacy rendering remains intact.
- No dependency additions, no remote runtime API, and no Netlify actions or deployments in this phase.

## 4. Independent tests and limits

- All touched JavaScript modules were successfully parsed in V8.
- Fresnel invariants: reflectance in [0,1], zero film behaves like air-to-substrate interface, identical film/substrate indices remove film-thickness/wavelength dependence, normal-incidence s and p coincide.
- Spectral LUT: finite linear RGB, caching, distinct results at different angles/film values.
- Microstructure: geometry stays inside occupied cells and is deterministic across saved/reloaded genealogy, varies structurally across distinct material modes, ignores color-only changes and leaves the complete simulation snapshot unchanged.
- Large surface smoke test: ~33k occupied real cells, illustrative ~46k pearl, ~10k cleavage, ~116k globular export microfeatures at 70% density. First cold spectral pass and LUT construction was CPU-intensive (~419 ms in the V8 tool sandbox); warm 192² optical recolor ~132 ms. These are **tool-runtime measurements**, not Safari timings.
- The entire Node test suite, Vite build, iPhone Safari UI rendering, animated timing under thermal load, and actual exported PNG inspection **have not yet been verified in a browser**. The high-resolution detail can increase large-still export latency and memory use. Real device QA is required before claiming smooth Safari production performance.

## 5. Next measured QA

On iPhone, compare original OPAL vs SPECTRAL OPAL at fixed seed, change light direction/index/thickness/polarization separately and compare actual PNGs. Toggle micro OFF/LAMELLA/CLEAVAGE/VESICLE with identical palette and seed. Validate that repeated 2048px stills are byte-deterministic with motion frozen. Check that microstructures never bleed into voids after an aggressive Gesture Witch KEEP EMPTY stroke. Test 1:1 and portrait artwork framing separately before claiming 9:16 export.

The next phase may build a GPU-backed high-resolution normal/shading pipeline and real GIF/MP4 capture, but none of those capabilities are claimed here.
