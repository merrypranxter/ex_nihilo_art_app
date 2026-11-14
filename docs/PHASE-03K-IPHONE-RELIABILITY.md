# Phase 03K — iPhone Stage Reliability / Observable Rendering

This phase intentionally **does not add another physics effect**. EX NIHILO now has real crystal-growth, fracture memory and seven PBR mineral shapes, but needs a reliable phone viewport and visible failure diagnosis before adding additional GPU effects.

## Concrete defects found and fixed

### Portrait: five-button masthead clipping

The old `@media(max-width:520px)` CSS forced a 62px masthead, originally designed for one line of buttons. Phase 03H added a **two-row masthead** with five actions (PRESS, SCULPT, FRAME, PAUSE, NEW), but did not clear the fixed height. On a 375px phone the combined brand, button row, padding and gap could extend below the header and overlap the canvas.

Fix: at portrait viewport widths <=600px, the masthead now uses natural content height; the five controls are a five-column touch-target grid (44px min heights); the main app uses the *remaining* dynamic visual height. Stage and scrollable console are resized independently.

### Landscape: wrong desktop-style minimum height

The existing app had `main { min-height:580px }` and a responsive rule at <=900px forcing a 250px minimum top artwork region. On an iPhone landscape around 874×402, this left very little vertical space for the controls.

Fix: coarse-pointer short landscape (height <=560px) uses a compact one-line masthead, **two-column layout** (large stage left, scrollable settings right), no 580px or 250px forced minimum, and viewport-height flex sizing. Safe-area insets prevent the camera notch and home indicator from covering important controls. No fixed element height is inferred from an obsolete header.

### Silent blank canvas

Without a pre-module error hook, exceptions during JavaScript import or WebGL context creation could prevent the app from initializing, leaving the artwork black or white without any diagnostic text.

Fix:
- A tiny inline browser bootstrap executes *before* `/src/main.js` and is deliberately independent of Three.js/Vite. It catches app script-load failure, top-level errors and unhandled rejections.
- A bounded and readable in-canvas diagnostic message uses only `textContent`, has an explicit Copy and Dismiss action, and never resets the user's living world.
- Copied messages redact common API credential and authorization strings, including query parameters and Bearer values.
- The main renderer now reports WebGL2 startup exceptions, actual `webglcontextlost` events, restoration attempts and renderer-frame exceptions. A lost context pauses the solver. If the browser recovers graphics, the user decides when to resume.
- Errors are deduplicated but can reappear after dismissal if they occur again.

### No actual mobile graphics metrics

The GROWTH tab now contains **DEVICE HEALTH — PERFORMANCE & RENDERING**. It is off by default and can sample the user's real device once explicitly enabled. It reports recent frame rate, physical canvas pixel size, selected DPR, GPU draw calls and triangles, geometry/texture counts, plus the current living fiber/crystal/facet/scar counts. The report is available to copy **after the first real sample**. It is computed locally; nothing is automatically uploaded or sent to a service.

Metrics are a *diagnostic instrument*, not a performance guarantee. The actual iPhone report is needed before adding another expensive optical renderer. On iOS, FPS also depends on low-power mode, thermal pressure, background activity and browser limits.

## 5-minute actual iPhone Safari smoke test (not yet executed)

1. Open EX NIHILO from a fresh load in **portrait**. Make sure PRESS / SCULPT / FRAME / PAUSE / NEW are all reachable and none cover the canvas. Scroll the controls to their last setting.
2. Rotate the phone to **landscape**. Confirm the artwork stays on the left, controls remain scrollable on the right, and the safe area is respected. Rotate back.
3. Under CRYSTALS, turn on the colony and try QUARTZ / SHARDS / GEMS. Adjust Prism lens, face relief and fracture-edge jewels. Confirm the organism remains visible.
4. Under LIGHT, search an obscure MATHEMAGICAL palette, change an individual stop in the native iOS color picker, and confirm the picker doesn't close mid-edit. Every original palette remains selectable.
5. Use SCULPT, STITCH, WARP and PRESS with one/two fingers, then undo. Test Escape/cancellation if using a keyboard; ensure the ORBIT tool rotates the camera separately.
6. Save World, load it, and confirm crystal structure, cell scar history, palette selection and optical shape restore. The NEW button must request confirmation.
7. On **GROWTH → DEVICE HEALTH**, select SHOW PERFORMANCE while the organism is growing. After a few samples, copy the report. If the artwork blanks or errors, copy the visible diagnostic message and share it with the app developer instead of repeatedly resetting.

## Testing performed this phase

- [x] Static verification of all DOM ids and their `$('...')` references.
- [x] Source syntax inspection of the app module and diagnostics bootstrap.
- [x] Executed the *pre-module diagnostics bootstrap* against simulated script-load, JS exception, redaction, copy and dismissal events.
- [x] Verified old fixed-header and short-landscape CSS are both overridden.
- [x] Verified the performance report is opt-in and cannot be copied as a real sample before recording frame measurements.
- [x] Verified no physics, palette vault or world schema changes were introduced.
- [ ] Real Vite production bundle (`npm install && npm run build`).
- [ ] Real Chromium/WebGL2 screenshot and iPhone Safari screenshots.
- [ ] Actual iPhone 375px portrait and ~874px landscape tactile QA / FPS capture.

**Limitations:** the local code-execution environment has no access to GitHub's hostname or installed Vite/Three dependencies. The linked GitHub integration can write and read the repository, but it cannot run the Vite/Three app in a live browser here. Static checks and a simulated pre-module failure test are valuable, but **not a substitute for a real on-device render**. No Netlify deployment or GitHub Actions job was initiated.

## Next phase, based on evidence

Choose the next fix after seeing either an actual Safari screenshot or a copied Device Health report. If the app is over budget, simplify optics, reduce resolution/facet density, or virtualize hidden layers before adding expensive dispersion. If the rendering is stable, prioritize art-direction quality and better crystal depth.
