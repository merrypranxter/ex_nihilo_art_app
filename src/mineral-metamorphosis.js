// MINERAL METAMORPHOSIS — the *actual* living colony's age, strain and
// fracture adjacency select one of three optically distinct physical minerals.
// Pure, deterministic, zero RNG. DOES NOT alter pigments or cell history.
// One shared geometry, three bounded InstancedMesh material buckets.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const METAMORPHOSIS_STAGES=Object.freeze(['young','mature','fault']);
export const METAMORPHOSIS_PRESETS=Object.freeze({
  off:'OFF — KEEP THE ORIGINAL SHADER',
  subtle:'QUIET GEOLOGICAL AGING',
  opaline:'OPALINE LIFE CYCLE',
  feral:'FERAL SPECTRAL MUTATION'
});
const BRUSH=Object.freeze({
  subtle:{
    young:{roughness:.21,metalness:.03,clearcoat:.75,iridescence:.16,thickness:[95,210]},
    mature:{roughness:.27,metalness:.10,clearcoat:.96,iridescence:.72,thickness:[145,390]},
    fault:{roughness:.29,metalness:.38,clearcoat:.82,iridescence:.84,thickness:[190,455]}
  },
  opaline:{
    young:{roughness:.12,metalness:.04,clearcoat:1,iridescence:.13,thickness:[80,220]},
    mature:{roughness:.19,metalness:.08,clearcoat:1,iridescence:.96,thickness:[135,430]},
    fault:{roughness:.135,metalness:.42,clearcoat:1,iridescence:1,thickness:[190,520]}
  },
  feral:{
    young:{roughness:.08,metalness:.02,clearcoat:1,iridescence:.34,thickness:[75,275]},
    mature:{roughness:.12,metalness:.29,clearcoat:1,iridescence:1,thickness:[110,490]},
    fault:{roughness:.07,metalness:.76,clearcoat:1,iridescence:1,thickness:[230,640]}
  }
});
export function mineralLifeStage(cell,config={}){
  if(!cell?.occupied)return null;
  const maturity=clamp(Number(config.maturity)||28,8,96);
  const stressBoundary=clamp(Number(config.stress)||.45,.1,1.2);
  const exposedFracture=(cell.fractureFaces||0)>0;
  // A crack is a documented irrecoverable transition in appearance.
  // A scar neighbor or meaningful persistent stress also exposes the
  // spectral-fault material (the voxel itself must still be occupied).
  if(cell.damage===1||exposedFracture||
     (Number(cell.strain)||0)>=stressBoundary)return 'fault';
  if(cell.mature&&(Number(cell.age)||0)>=maturity)return 'mature';
  return 'young';
}
// Material parameter sets are native MeshPhysicalMaterial uniforms and
// define genuinely distinct angle-dependent lighting. No fake RGB pulses,
// onBeforeCompile shader patch, video texture, or transmission raymarch.
export function mineralStageMaterials(preset,base=null){
  const profile=Object.hasOwn(BRUSH,preset)?BRUSH[preset]:null;
  if(!profile)return null;
  return Object.fromEntries(METAMORPHOSIS_STAGES.map(tier=>{
    const p=profile[tier];
    const inheritedBase=base||{};
    return [tier,{
      metalness:clamp(p.metalness,0,1),
      roughness:clamp(p.roughness,0,1),
      clearcoat:clamp(p.clearcoat,0,1),
      clearcoatRoughness:clamp(p.roughness*.54,.055,.5),
      iridescence:clamp(p.iridescence,0,1),
      iridescenceIOR:inheritedBase.iridescenceIOR??1.32,
      iridescenceThicknessRange:[...p.thickness]
    }];
  }));
}
export function isMineralMetamorphosisActive(config){
  return !!config&&config.preset!=='off'&&
    Object.hasOwn(METAMORPHOSIS_PRESETS,config.preset);
}
