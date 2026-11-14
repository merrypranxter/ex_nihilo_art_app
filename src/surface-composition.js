// EX NIHILO — PHASE 04B: COMPOSITION FIELDS
// Pure deterministic topology for FUTURE mineral births. Nothing here draws
// ornament over old pigments or changes an already-occupied cell.
export const SURFACE_BOUNDARIES=Object.freeze({
  open:'OPEN CANVAS',rose:'ROSE WINDOW · RADIAL VAULTS',
  rivers:'BRAIDED RIVERS · WANDERING CHANNELS',
  lace:'INTERFERENCE LACE · CONNECTED PORES'
});
export const SURFACE_REGIONS=Object.freeze({
  single:'ONE GROWTH LAW',quilt:'INTERFERENCE BIOMES · THREE PHYSICS',
  vortex:'VORTEX TERRITORIES · THREE PHYSICS'
});
export const SURFACE_SEED_SYMMETRY=Object.freeze({
  none:'FREE NUCLEI',mirror:'BILATERAL SEEDS',
  quad:'FOUR-WAY SEEDS',sixfold:'SIXFOLD SEED ORBIT'
});
export const COMPOSITION_LAWS=Object.freeze(['spherulite','dendrite','strata']);
const TAU=Math.PI*2;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mod=(a,n)=>(a%n+n)%n;

// Periodicity is mathematical, not an image-mirror seam. Coordinates are
// pixel centers; every parameter is a whole-number-frequency toroidal field
// or a reflection-symmetric centered radial field.
export function compositionSample(u,v,{boundary='open',regions='single',voids=.55,wrap=false}={}){
  const x=wrap ? .5*Math.sin(TAU*u) : u-.5;
  const y=wrap ? .5*Math.sin(TAU*v) : v-.5;
  const r=Math.hypot(x,y)*2;
  const theta=Math.atan2(y,x);
  let gate=1;
  if(boundary==='rose'){
    const petals=Math.cos(theta*12)*Math.cos(r*6);
    const vault=Math.cos(Math.PI*r*9)*(.7+.3*Math.cos(theta*8));
    gate=clamp(.51+.28*petals+.25*vault);
  }else if(boundary==='rivers'){
    const meander=3*v+.38*Math.sin(TAU*2*u)+.16*Math.sin(TAU*5*u);
    const tributary=2*u-.23*Math.sin(TAU*3*v);
    gate=clamp(.52+.32*Math.sin(TAU*meander)+.18*Math.sin(TAU*tributary));
  }else if(boundary==='lace'){
    const a=Math.cos(TAU*(4*u+3*v)+.65*Math.sin(TAU*2*v));
    const b=Math.cos(TAU*(3*u-5*v)+.65*Math.sin(TAU*2*u));
    gate=clamp(.5+.29*a*b+.22*Math.sin(TAU*(2*u+v)));
  }
  let law=0;
  if(regions==='quilt'){
    const s=Math.sin(TAU*(3*u+2*v)+.8*Math.sin(TAU*v))+
      .52*Math.cos(TAU*(2*u-3*v));
    law=s>.37?0:s<-.37?1:2;
  }else if(regions==='vortex'){
    const s=Math.sin(theta*5+r*12)+.25*Math.cos(r*21);
    law=s>.28?0:s<-.28?1:2;
  }
  // Never mutate occupancy based on these values. They are read only for
  // unoccupied candidate sites when proposing/accepting future births.
  return {gate:Math.round(gate*255),law};
}
export function buildCompositionField(size,options={}){
  if(!Number.isInteger(size)||size<16||size>192)throw Error('Invalid composition lattice');
  const gates=new Uint8Array(size*size);
  const laws=new Uint8Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const k=x+y*size;
    const sample=compositionSample((x+.5)/size,(y+.5)/size,options);
    gates[k]=sample.gate;
    laws[k]=sample.law;
  }
  return {gates,laws,threshold:(options.voids??.55)<=0?-1:Math.round(clamp(options.voids??.55)*220)};
}
export function symmetricSeedPoints(u,v,mode='none'){
  if(!Number.isFinite(u)||!Number.isFinite(v)||u<0||u>=1||v<0||v>=1)return [];
  const points=[[u,v]];
  if(mode==='mirror')points.push([1-u,v]);
  else if(mode==='quad'){
    points.push([1-u,v],[u,1-v],[1-u,1-v]);
  }else if(mode==='sixfold'){
    points.length=0;
    const r=Math.hypot(u-.5,v-.5);
    const a=Math.atan2(v-.5,u-.5);
    // A toroidal orbit preserves all six seed sites even near a canvas edge.
    for(let j=0;j<6;j++)points.push([
      mod(.5+r*Math.cos(a+j*TAU/6),1),
      mod(.5+r*Math.sin(a+j*TAU/6),1)
    ]);
  }
  const unique=new Map();
  for(const [x,y] of points){
    const nx=mod(x,1),ny=mod(y,1);
    const key=Math.floor(nx*192)+':'+Math.floor(ny*192);
    if(!unique.has(key))unique.set(key,[nx,ny]);
  }
  return Array.from(unique.values());
}
