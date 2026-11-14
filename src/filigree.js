// FILIGREE ANATOMY
// Sculptural readability is expressed through persistent biological history:
// parent-local daughter arrangement, a temporary tangent memory, and reversible
// render emphasis driven by the ACTUAL segment ancestry.
// All functions are deterministic and independent of Three.js.

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

/**
 * A new daughter initially follows its birth direction rather than being
 * immediately dragged back onto the parent field. The effect decays with age;
 * late-time field flow is unchanged. 0 retains the original 0.09 blend.
 */
export function lineageSteering(age,generation,persistence,original=.09){
  if(generation<=0||persistence<=0)return original;
  const p=clamp(persistence,0,1);
  const birthMemory=Math.exp(-Math.max(0,age)/1.35);
  return original*(1-.90*p*birthMemory);
}

/**
 * A reversible optical hierarchy: bright trunks, restrained fine branches.
 * Stored simulation colors are NEVER edited by changing this value.
 * RGB inputs/outputs use linear channel values in [0,1].
 */
export function lineageLighting(rgb,generation,relief=0){
  const r=clamp(relief,0,1),g=Math.max(0,Math.min(12,generation|0));
  if(r===0)return [...rgb];
  const ancestry=1-Math.exp(-g*.58);
  const darken=1-.52*r*ancestry;
  const lift=.16*r*Math.exp(-g*.85);
  return rgb.map(v=>clamp(v*darken+lift*(1-v),0,1));
}

export function lineageHaloScale(generation,relief=0){
  const r=clamp(relief,0,1);
  const fine=1-Math.exp(-Math.max(0,generation)*.50);
  return 1+r*(.55*fine-.35*(1-fine));
}
