// EX NIHILO — PHYLLOTACTIC GROWTH & TEMPORAL RHYTHMS
// Independent of Three.js and Wolfram API calls. The golden-angle constant
// was cross-checked with Wolfram Language GoldenAngle (137.507764050°).
// These laws create directions for *new branches*, never prebuilt geometry.

export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
export const BRANCH_MODES = Object.freeze({
  random: 'ORGANIC SCATTER (LEGACY)',
  golden: 'GOLDEN-ANGLE PHYLLOTAXIS',
  opposite: 'ALTERNATING BILATERAL',
  whorl: 'SIXFOLD CRYSTALLINE WHORL'
});
export const RHYTHM_MODES = Object.freeze({
  steady: 'STEADY GROWTH',
  tide: 'COHERENT GROWTH TIDE',
  stagger: 'STAGGERED BRANCH WAVES',
  beats: 'QUASIPERIODIC BEATING'
});
const clamp = (n,min,max) => Math.min(max,Math.max(min,n));

export function branchVector(tangent,serial=0,tiltDegrees=56,mode='golden',phase=0) {
  const length=Math.hypot(tangent.x,tangent.y,tangent.z);
  const axis=length>1e-10
    ?[tangent.x/length,tangent.y/length,tangent.z/length]
    :[0,1,0];
  // Choose a stable orthonormal frame around the parent's tangent.
  // U = (T cross R) / |T cross R|; V = T cross U.
  const ref=Math.abs(axis[1])<.87?[0,1,0]:[1,0,0];
  const ux=axis[1]*ref[2]-axis[2]*ref[1];
  const uy=axis[2]*ref[0]-axis[0]*ref[2];
  const uz=axis[0]*ref[1]-axis[1]*ref[0];
  const ul=Math.hypot(ux,uy,uz);
  const u=[ux/ul,uy/ul,uz/ul];
  const v=[
    axis[1]*u[2]-axis[2]*u[1],
    axis[2]*u[0]-axis[0]*u[2],
    axis[0]*u[1]-axis[1]*u[0]
  ];
  const i=Math.max(0,Math.floor(Number.isFinite(serial)?serial:0));
  const offset=Number.isFinite(phase)?phase:0;
  const increment=mode==='opposite'?Math.PI:
    mode==='whorl'?Math.PI/3:GOLDEN_ANGLE;
  const azimuth=i*increment+offset;
  const tilt=clamp(Number.isFinite(tiltDegrees)?tiltDegrees:56,0,85)*Math.PI/180;
  const c=Math.cos(tilt),s=Math.sin(tilt);
  const a=Math.cos(azimuth),b=Math.sin(azimuth);
  const d=[
    axis[0]*c + (u[0]*a+v[0]*b)*s,
    axis[1]*c + (u[1]*a+v[1]*b)*s,
    axis[2]*c + (u[2]*a+v[2]*b)*s
  ];
  const dl=Math.hypot(...d)||1;
  return {x:d[0]/dl,y:d[1]/dl,z:d[2]/dl};
}

export function growthRhythm(time,identity=0,options={}) {
  const mode=RHYTHM_MODES[options.rhythmMode]?options.rhythmMode:'steady';
  const depth=clamp(Number.isFinite(options.rhythmDepth)?options.rhythmDepth:0,0,1);
  if(mode==='steady'||depth<=0)return 1;
  const rate=clamp(Number.isFinite(options.rhythmRate)?options.rhythmRate:.55,.05,2);
  const phase=2*Math.PI*rate*Math.max(0,time);
  const perTip=2*Math.PI*(Number.isFinite(identity)?identity:0);
  let wave;
  if(mode==='tide') wave=Math.sin(phase);
  else if(mode==='stagger') wave=Math.sin(phase+perTip);
  else {
    // Incommensurate frequencies: a quasi-periodic growth rate that resists
    // simple repetition (rather than merely making the sculpture spin).
    const phi=(1+Math.sqrt(5))/2;
    wave=.56*Math.sin(phase)+.44*Math.sin(phase*phi+perTip);
  }
  return clamp(1+depth*wave,.08,2);
}
