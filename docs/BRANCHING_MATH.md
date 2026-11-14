# Phase 03C — Wolfram-verified branching mathematics

## Golden-angle daughter growth

EX NIHILO's branch-divergence option uses the exact golden angle

\[
\theta_g = \pi(3-\sqrt{5}) = \frac{2\pi}{\varphi^2}
\]

which is **137.50776405003785°**. Verified in the connected Wolfram Language evaluator on November 13, 2026:

```wolfram
N[{GoldenAngle, Pi (3 - Sqrt[5]), 2 Pi/GoldenRatio^2,
   360 GoldenAngle/(2 Pi)}, 12]
```

Wolfram reference: [GoldenAngle](https://reference.wolfram.com/language/ref/GoldenAngle).

For every actual new daughter branch, the implementation builds an orthonormal basis around its parent tip tangent **T**. For branch serial `n`, daughter tilt `a`, and local phase `p`, the daughter direction is:

\[
\mathbf d = \cos(a)\mathbf T+
\sin(a) \left[
\cos(n\theta_g+p)\mathbf U+
\sin(n\theta_g+p)\mathbf V
\right]
\]

This is already a unit vector because T, U, and V are orthonormal. The **daughter divergence** slider controls the polar angle `a`; the branch arrangement determines its *azimuthal separation*. This distinction matters: golden angle **does not** mean every daughter makes a 137.5° turn away from its parent.

Alternative genuine branch laws:
- Alternating bilateral: azimuth advances by 180°.
- Sixfold whorl: azimuth advances by 60°.
- Organic scatter: the original randomized daughter direction.

For new worlds, the default is golden-angle branching with a 56° polar tilt. This is a growth law, not a positioned sunflower object.

## Temporal growth rhythms

The `tide`, `stagger`, and `beats` modes alter the **distance a tip moves, how quickly it deposits fiber segments, and the timing of new branch births**. In `beats` mode:

\[
r(t,i)=\mathrm{clamp}\left(1+d[0.56\sin(2\pi f t)+
0.44\sin(2\pi\varphi f t+2\pi i)], 0.08,2\right)
\]

where `d` is the depth and `i` is a persistent per-agent identity phase. The two incommensurate frequencies resist short artificial loops; changing the rhythm genuinely changes future structure.

## Hierarchical branch material

Daughter generation `g` modifies fiber radius through

\[
r_g=r_0 \max(0.20,q^g)
\]

where `q` is the taper factor. The **lineage color cohesion** control blends the original palette-time colors toward colors derived from branch generation; previously deposited fibers keep their historical colors.

## Safeguards

- Does not require the user's Wolfram developer AppID or make runtime Wolfram calls.
- All code runs locally in JavaScript, including when offline.
- The new `branchEvents` counter and per-agent generations are stored in full-world checkpoints.
- Historical v1/v2/v3 worlds lacking these controls restore their original random, untapered, steady-motion settings; newly loaded worlds are not silently converted into golden-angle sculptures.
- Controls affect only future growth; changes never erase accumulated geometry.
- Exact simulation and checkpoint replay tested headlessly; full Vite build, browser view, and iPhone Safari performance checks remain outstanding.

## Further investigation

Use Wolfram for precise finite-difference stability bounds, bifurcation analysis, numerical eigenvalues, and pattern-frequency sensitivity. Keep expensive computational verification on demand, not in the render loop.
