// MINERAL VEINS / non-destructive temporal optics.
// A deposited segment has permanent pigment, ancestry and birth time.
// Light treatment is derived from that history; changing optics NEVER edits
// the physical sculpture, chemical fields or the saved base pigment.

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const LN2=Math.LN2;

export const FIBER_PROFILES=Object.freeze({
  needle:{name:'FACETED MINERAL NEEDLES',top:.25,bottom:1,facets:5,roughness:.19,metalness:.26,clearcoat:.94,iridescence:.76},
  vitreous:{name:'VITREOUS PRISM',top:.72,bottom:.95,facets:7,roughness:.12,metalness:.12,clearcoat:1,iridescence:.95},
  wire:{name:'FINE DRAWN WIRE',top:.83,bottom:.83,facets:8,roughness:.31,metalness:.60,clearcoat:.55,iridescence:.16},
  shard:{name:'TRIANGULAR SHARDS',top:.38,bottom:1,facets:3,roughness:.23,metalness:.19,clearcoat:.82,iridescence:.65},
  legacy:{name:'CLASSIC FIVE-SIDED FIBER',top:1,bottom:1,facets:5,roughness:.35,metalness:.20,clearcoat:0,iridescence:0}
});

export function mineralMaturity(ageSeconds,halfLifeSeconds=18,strength=.60){
  if(!Number.isFinite(ageSeconds)||ageSeconds<=0||strength<=0)return 0;
  const halfLife=clamp(Number.isFinite(halfLifeSeconds)?halfLifeSeconds:18,3,120);
  return clamp(strength,0,1)*(1-Math.exp(-LN2*ageSeconds/halfLife));
}

/**
 * Mineral maturation shifts old living pigment toward a restrained pale
 * mineralized glaze, while the newest deposits keep their original saturation.
 * Optical halo is reduced as the structure consolidates, so older material
 * forms a coherent backbone rather than an indiscriminate neon light show.
 *
 * Inputs/outputs are channel values in [0,1]; no historical RGB is modified.
 */
export function mineralOptics(rgb,ageSeconds,settings={}){
  const m=mineralMaturity(ageSeconds,
    settings.mineralHalfLife??18,settings.mineralStrength??0);
  const glaze=.22*m;
  const tone=rgb.map(c=>clamp(c*(1-glaze)+(.72*glaze),0,1));
  return {
    color:tone,
    halo:1-.62*m,
    maturity:m
  };
}
