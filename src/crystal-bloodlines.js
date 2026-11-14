// CRYSTAL BLOODLINES — reproducible parent/descendant genetics for the 3D CA.
// Parent identities are monotonic birth-event IDs, NEVER reused voxel indices.
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
export const HERITAGE_MODES=Object.freeze({
  off:'OFF — ORIGINAL MINERAL',
  brocade:'INHERITED CRYSTAL BROCADE',
  strata:'GENEALOGICAL STRATA',
  mutant:'HEREDITARY ABNORMALITIES'
});
const hash32=value=>{
  let x=value>>>0;
  x=Math.imul(x^(x>>>16),0x7feb352d);
  x=Math.imul(x^(x>>>15),0x846ca68b);
  return (x^(x>>>16))>>>0;
};
export const hashBloodline=hash32;
export function founderGenes(voxelIndex,birthId){
  const seed=hash32((voxelIndex+1)^Math.imul(birthId,0x9e3779b1));
  return [hash32(seed^0x1570a7)&255,hash32(seed^0x96d433)&255,
    hash32(seed^0xc54ce9)&255];
}
export function inheritGenes(parentGenes,childIndex,generation,mutation=.18){
  if(!Array.isArray(parentGenes)&&!ArrayBuffer.isView(parentGenes))throw Error('Invalid parent genes');
  if(parentGenes.length!==3)throw Error('Invalid parent genes');
  const rate=clamp(Number(mutation)||0,0,1);
  return [0,1,2].map(channel=>{
    const initial=parentGenes[channel];
    const hash=hash32((childIndex+1)^Math.imul(generation+1,0x9e3779b1)^Math.imul(channel+1,0x85ebca6b));
    if(((hash&65535)/65536)>=rate)return initial;
    const direction=(hash&0x10000)?1:-1;
    const magnitude=1+Math.floor(((hash>>>17)&127)/127*(8+48*rate));
    return clamp(initial+direction*magnitude,0,255);
  });
}
// A family-oriented anisotropy in the ACTUAL candidate CA birth probability.
// The bias multiplies the historical law only when hereditary growth is ON.
export function hereditaryBirthBias(genes,step,strength=0){
  const power=clamp(Number(strength)||0,0,1);
  if(!power||!genes||!step)return 1;
  const vec=[(genes[0]-127.5)/127.5,(genes[1]-127.5)/127.5,
    (genes[2]-127.5)/127.5];
  const norm=Math.hypot(...vec)||1;
  const projection=(vec[0]*step[0]+vec[1]*step[1]+vec[2]*step[2])/norm;
  return clamp(1+projection*power*.42,.58,1.42);
}
export function inheritedFacet(genes,family,age,{mode='off',strength=.65,index=0}={}){
  if(mode==='off'||!Object.hasOwn(HERITAGE_MODES,mode)||!family)
    return {axial:1,lateral:1,band:false,position:0,rotation:0,shade:0};
  const intensity=clamp(Number(strength)||0,0,1);
  const [axis,phase,spectrum]=genes.map(x=>clamp(x,0,255));
  const grow=(axis/255-.5)*2;
  const k=mode==='mutant'?1.45:mode==='strata'?.82:1;
  const axial=clamp(1+grow*.35*intensity*k,.61,1.48);
  const lateral=clamp(1-grow*.21*intensity*k,.72,1.32);
  const familyPhase=hash32(family)>>>19;
  const bandPeriod=mode==='strata'?7:mode==='mutant'?11:9;
  // The mineral's inherited band position is fixed at birth; age does
  // not make it blink in and out as the renderer refreshes.
  const bandIndex=Math.floor((phase*.19+familyPhase)%bandPeriod);
  const probability=mode==='strata'?.68:mode==='mutant'?.43:.5;
  // Family genes govern layer density; descendants differ by a stable
  // voxel-ID sample, preventing a whole lineage from being all-ring/no-ring.
  // No flicker from advancing age and no changes to simulation RNG.
  const familyPreference=1-bandIndex/(bandPeriod-1);
  const bandChance=clamp(probability*(.47+.60*familyPreference),.12,.82);
  const cellHash=hash32((index+1)^Math.imul(family,0x6a09e667)^
    Math.imul(phase+1,0x85ebca6b));
  const band=(cellHash/4294967296)<bandChance;
  return {
    axial,lateral,band:band&&intensity>0,
    position:clamp((phase/255-.5)*.38,-.21,.21),
    rotation:(spectrum/255)*Math.PI*2,
    shade:clamp((spectrum/255*.25+.09)*intensity,0,.35)
  };
}
