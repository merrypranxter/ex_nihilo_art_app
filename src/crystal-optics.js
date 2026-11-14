// CRYSTAL OPTICS — deterministic, topology-aware DISPLAY transformations.
// These laws inspect the actual cell/strain/scar graph. No world history,
// pigment, RNG or lattice mechanics change when the visual controls move.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));

export const CRYSTAL_PROFILES=Object.freeze({
  octa:'ORIGINAL OCTAHEDRA',
  cube:'MINERAL CUBES',
  sphere:'ROUNDED NODULES',
  quartz:'HEXAGONAL QUARTZ TERMINATIONS',
  prism:'FIVE-SIDED GROWTH PRISMS',
  shard:'ASYMMETRIC CRYSTAL SHARDS',
  jewel:'DODECAHEDRAL MINERAL GEMS'
});

export const CRYSTAL_LENSES=Object.freeze({
  inherit:{name:'SHARED ARTWORK FINISH',roughness:null,metalness:null,iridescence:null,clearcoat:null},
  opal:{name:'MILKY OPAL',roughness:.24,metalness:.06,iridescence:.96,clearcoat:.95},
  prism:{name:'CHROMATIC PRISM',roughness:.105,metalness:.16,iridescence:1,clearcoat:1},
  frost:{name:'FROSTED MINERAL',roughness:.70,metalness:.08,iridescence:.10,clearcoat:.26},
  alloy:{name:'IRIDESCENT ALLOY',roughness:.18,metalness:.65,iridescence:.82,clearcoat:.80}
});

// Six face directions are the only directions the cubic CA can transmit
// stress or make contact. Use exactly these directions to find real surfaces.
export const FACE_STEPS=Object.freeze([
  [-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,-1],[0,0,1]
]);
const index=(x,y,z,n)=>x+n*(y+n*z);
const inside=(x,y,z,n)=>x>=0&&y>=0&&z>=0&&x<n&&y<n&&z<n;

export function crystalSurface(cells,damage,i,size){
  const x=i%size,y=Math.floor(i/size)%size,z=Math.floor(i/(size*size));
  let nx=0,ny=0,nz=0,exposed=0,broken=0;
  let fractureDirection=null;
  for(const [dx,dy,dz] of FACE_STEPS){
    const px=x+dx,py=y+dy,pz=z+dz;
    const adjacent=inside(px,py,pz,size)?index(px,py,pz,size):-1;
    const occupied=adjacent>=0&&cells[adjacent]>0;
    if(occupied)continue;
    exposed++;
    nx+=dx;ny+=dy;nz+=dz;
    if(adjacent>=0&&damage[adjacent]===2){
      broken++;
      if(!fractureDirection)fractureDirection=[dx,dy,dz];
    }
  }
  const len=Math.hypot(nx,ny,nz);
  // Interior voxels have no actual exposed face, so the stable fallback is
  // the original up axis; we do not claim to discover a physical facet there.
  const direction=len>1e-6?[nx/len,ny/len,nz/len]:[0,1,0];
  return {direction,exposed,fractureFaces:broken,fractureDirection};
}

export function mineralCellDisplay(cell,options={}){
  const stress=clamp(cell.strain||0,0,1.35);
  const cracked=cell.damage===1;
  const depth=clamp(options.relief||0,0,1);
  const bright=clamp(options.glint||0,0,1);
  const surface=cell.surface;
  const exposure=surface.exposed/6;
  const axial=1+depth*(.43+.22*exposure);
  const lateral=1-depth*(.24+.05*(cracked?1:0));
  const stressedCompression=cracked?.88:1;
  // Pure, history-aware optional color enhancement. Renderer owns Color3
  // conversion; returning a channel mix avoids destructive RGB modifications.
  const pearlescence=bright*(.08+.18*exposure)+stress*.045;
  const pale=clamp(pearlescence+(cracked?.10:0),0,.42);
  const fractureGlint=surface.fractureFaces>0;
  return {
    axial,
    lateral:lateral*stressedCompression,
    pigmentMix:pale,
    drawGem:bright>0&&surface.exposed>0&&
      (fractureGlint||((iHash(cell.index)%1024)/1024)<bright*(.09+.28*exposure)),
    fractureGlint,
    gemDirection:surface.fractureDirection||surface.direction
  };
}

// Different material accents use the stored crystal birth pigment, never
// current palette settings, so changing the color vault does not repaint old.
export function gemPigment(rgb,stress=0,fractured=false){
  const dose=fractured?.32:.17;
  const shine=clamp(dose+clamp(stress,0,1.35)*.055,0,.44);
  return rgb.map(c=>clamp(c*(1-shine)+shine,0,1));
}
export function iHash(i){
  let x=(i+1)>>>0;
  x=Math.imul(x^x>>>16,0x7feb352d);
  x=Math.imul(x^x>>>15,0x846ca68b);
  return (x^x>>>16)>>>0;
}
