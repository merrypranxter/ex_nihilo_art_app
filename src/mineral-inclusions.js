// MINERAL INCLUSIONS / GHOST SKIN — deterministic, cell-attached view geometry.
// Everything derives from persisted age, strain, exposure and birth pigment.
// This changes no voxels, nutrient dynamics, checkpoint RNG or physics laws.
import { iHash } from './crystal-optics.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export const INTERIOR_STYLES=Object.freeze({
  off:Object.freeze({name:'NONE — NO EXTRA GPU LAYERS',roughness:.2,metalness:.12,iridescence:0,clearcoat:0,skinOpacity:0}),
  opal:Object.freeze({name:'WET OPAL GLAZE',roughness:.19,metalness:.06,iridescence:.96,clearcoat:1,skinOpacity:.26}),
  spectral:Object.freeze({name:'SPECTRAL OIL FILM',roughness:.10,metalness:.24,iridescence:1,clearcoat:.98,skinOpacity:.20}),
  smoke:Object.freeze({name:'SMOKED MINERAL GLASS',roughness:.32,metalness:.28,iridescence:.36,clearcoat:.90,skinOpacity:.30}),
  frost:Object.freeze({name:'FROSTED VEIN SKIN',roughness:.70,metalness:.04,iridescence:.12,clearcoat:.43,skinOpacity:.35})
});

/**
 * Deterministic source selection: selection is stable as the camera or user
 * palette changes. Hashing the original flat voxel index consumes NO world
 * RNG and never changes the colony's future growth.
 *
 * Old or cracked cells can expose more lamination. No empty cells, enclosed
 * interior lattice positions, or immature crystals can spawn false inclusions.
 */
export function mineralInclusionRecipe(cell,options={}){
  const style=Object.hasOwn(INTERIOR_STYLES,options.style) ? options.style : 'off';
  const density=clamp(Number(options.density)||0,0,1);
  const skin=clamp(Number(options.skin)||0,0,1);
  const surface=cell.surface;
  if(style==='off'||!cell.occupied||!cell.mature||!surface||surface.exposed<=0){
    return {shell:false,inclusion:false,skinScale:1,radialOffset:0,
      spectralLift:0,exposure:0,ageFraction:0};
  }
  const ageFraction=clamp((Number(cell.age)||0)/48,0,1);
  const stress=clamp(Number(cell.strain)||0,0,1.35);
  const exposure=clamp(surface.exposed/6,0,1);
  const fractured=surface.fractureFaces>0||cell.damage===1;
  const stable=iHash(cell.index^0x63a2bc7);
  const inclusionChance=density*clamp(
    .12+ageFraction*.55+exposure*.18+(fractured?.22:0),0,.99);
  const inclusion=(stable%65536)/65536<inclusionChance;
  const shellChance=clamp(
    skin*(.58+.18*ageFraction+.14*exposure+(fractured?.26:0)),0,1);
  const shellHash=iHash(cell.index^0x2970e4f);
  const shell=skin>0&&(shellHash%65536)/65536<shellChance;
  // Shell always sits around existing real geometry, not its empty neighbors.
  const skinScale=1+.065*skin+.042*ageFraction*skin;
  // Surface-facing inclusion is *inside the outer shell*, where a tiny
  // physically shaded nodule can be visible without expensive ray tracing.
  const radialOffset=.27+.045*ageFraction+.025*exposure;
  return {
    shell,inclusion,
    skinScale,radialOffset,
    spectralLift:clamp(.08+.12*ageFraction+.06*stress+(fractured?.06:0),0,.38),
    exposure,ageFraction
  };
}

export function historicInclusionPigment(rgb,recipe){
  const light=clamp(recipe.spectralLift??0,0,.45);
  return rgb.map(v=>clamp(v*(1-light)+light,0,1));
}

export function inclusionFaceRotation(index){
  // Stable roll about exposed-face normal; depends on actual voxel identity.
  return ((iHash(index^0xb60ae87)&65535)/65535)*Math.PI*2;
}
