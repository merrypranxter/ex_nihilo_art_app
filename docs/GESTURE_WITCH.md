# Phase 03F — Gesture Witch: touch the causes, not the camera

This is a bounded integration of the Gesture Witch interaction contract into EX NIHILO, not a replacement for Three.js or the living growth engines.

## What a finger does

1. Tap **🌀 SCULPT** in the top bar (or VORTEX SCULPT in the TOUCH tab).
2. Touch empty artwork to create a persistent 3D vortex eye. **Drag** its visible core to relocate the physical flow source. The renderer follows its stable node ID. Existing material stays where it is; *future* growth changes course.
3. Keep that finger down and place a second finger on the artwork. **Pinch** to change the vortex's influence radius; **twist** to change signed chirality. Moving both fingers together also relocates the core. Nothing claims to change mesh topology. A 24-sample 3D vector readout around the selected eye previews the **actual combined growth field** as it is edited, rather than pretending old fibers have deformed.
4. Lift either finger to commit the entire gesture as one field edit. The remaining finger cannot unexpectedly start painting after one finger lifts.
5. Tap ↶ UNDO FIELD EDIT / ↷ REDO FIELD EDIT (or Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z). These reverse **field documents**; they do **not** rewind living matter grown since a previous edit.
6. Escape, lost pointer capture, pointercancel, app blur, app backgrounding, and viewport resize roll back an unfinished field gesture. To undo an entire grown world's history, save and restore the full `.exnihilo` checkpoint.

In ATTRACT and REPEL modes, a pinch changes the selected node's source magnitude; the TOUCH tab offers an accessible equivalent slider. Existing source creation, dragging, seed, feed, chemical painting and Orbit mode remain available. All touch-driven modes except ORBIT suspend the solver during the active gesture; release resumes the prior running/paused state.

**The boundary of this milestone:** chemical/nutrient/crystal/seed gestures restore their immediately preceding state if canceled while actively editing. Their successful commits are not added to the field-node undo history. They still change the real simulation state, and a SAVE WORLD checkpoint is needed to preserve/recover their subsequent evolution. No gesture changes topological connectivity in this phase.

## Mathematical adapter

The screen-to-world mapping is a camera-ray intersection with a plane passing through the current orbit target, with coordinate radius bounded to 3.35 world units. The stored node origin is a 3D world-space point, not screen CSS coordinates.

For local vortex center `c`, support radius `r` and signed spin `s`:

```
d = c - x
K(d,r) = exp(-|d|² / (2 r²))
F_vortex(x) = 2.5 s K(d,r) (d_z, 0, -d_x)
r in [0.25,2.8] world units
s in [-2.5,2.5]
```

This term is added to the actual growth vector field before tip integration. Pinching multiplies `r` by the CSS-pixel distance ratio, capped to stable bounds. Twisting changes `s` by 1.65 times the signed angle change in radians, also clamped. In ATTRACT/REPEL modes, pinching changes the already-existing inverse-distance source magnitude rather than inventing an unrelated appearance effect.

The persistent document stores `{id,type,pos,strength,radius,spin}`. The transient gesture stores pointer IDs, initial contact geometry, original source state and RNG; transient touch data **never** pollutes the save file.

## QA performed vs outstanding

- [x] Pure math tests for radius and twist, directional force, cancellation and RNG rollback.
- [x] One drag = one Undo record; redo, divergent redo invalidation and old field-node save compatibility.
- [x] Exact deterministic save/restoration and continuing all-engine replay with a vortex.
- [x] Static JavaScript syntax, interface ID and event-listener presence checks.
- [x] Source guards for lostcapture, canceled touches, blur, resize, backgrounding and reduced motion.
- [ ] **Actual iPhone Safari touch tests:** drag, midpoint translation, pinch/twist, extra finger, finger-lift order, cancellation, zoom gesture conflict, page scroll outside artwork.
- [ ] Manual UI accessibility, 44px tap targets across iPhone models, landscape orientation and browser bar motion.
- [ ] Production Vite build and WebGL2 render/performance QA.
- [ ] Broader explicit gesture history: checkpoint-aware chemical and nutrient undo with bounded memory budget; protected edits; field paths and persistent force trails.
- [ ] True deformable mesh/graph handles or crystal stress fractures, only after designing safe reversible constraints.

No Netlify deploy or paid API call is part of this implementation.
