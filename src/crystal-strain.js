// CRYSTAL FRACTURE MEMORY — a genuine history-dependent lattice field.
// Stress is conducted only through face-connected occupied mineral cells.
// Cumulative strain produces visible cracks and ultimately permanent void
// scars; neither material nor fracture geometry is fabricated by the shader.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const CRACK_RATIO=.57;
export const MIN_BREAK=.60;
export const MAX_BREAK=1.20;
export const MIN_SURVIVING_NUCLEUS=8;
export const MAX_FRACTURE_FRACTION=.12;

export function strainSourceAt(pos,marks){
  if(!marks?.length)return 0;
  let force=0;
  for(const mark of marks){
    if(mark.mode!=='strain'&&mark.mode!=='cleave')continue;
    const dx=pos.x-mark.center[0],dy=pos.y-mark.center[1],dz=pos.z-mark.center[2];
    const r=mark.radius,d2=dx*dx+dy*dy+dz*dz;
    if(d2>9*r*r)continue;
    const near=Math.exp(-d2/(2*r*r));
    if(mark.mode==='strain')force+=mark.strength*near;
    else{
      // Existing CLEAVE also imprints stress along its oriented central seam.
      const along=Math.abs(dx*mark.axis[0]+dy*mark.axis[1]+dz*mark.axis[2]);
      const across2=Math.max(0,d2-along*along);
      const seam=Math.exp(-Math.pow(along/(.29*r),2))*
        Math.exp(-across2/(1.7*r*r));
      force+=.9*mark.strength*seam;
    }
  }
  return clamp(force,0,4);
}

/**
 * One synchronous CA strain tick, no random draws. The scratch buffer is
 * ephemeral; persisted fields are strain and damage. A damage value of
 * 0=pristine, 1=crack, 2=permanent fracture scar (void). The crack threshold
 * is a fraction of the configurable break point.
 *
 * The colony first commits its CA births, then runs this synchronous
 * stress update. Neighbor transport always reads the previous strain buffer.
 * No stress is transmitted through void or diagonal corners.
 */
export function tickCrystalStrain({
  cells,ages,strain,damage,next,size,extent,marks,
  transfer=.24,breakThreshold=.96
}){
  const hasSource=marks?.some(m=>m.mode==='strain'||m.mode==='cleave')??false;
  const conduct=clamp(transfer,0,.48);
  const breaking=clamp(breakThreshold,MIN_BREAK,MAX_BREAK);
  const crackPoint=breaking*CRACK_RATIO;
  let active=false,damaged=0,shattered=0,occupied=0;
  const breakCandidates=[];
  const strideY=size,strideZ=size*size,cellSize=extent/size;
  next.fill(0);
  for(let i=0;i<cells.length;i++){
    if(!cells[i])continue;
    occupied++;
    const x=i%size,y=Math.floor(i/size)%size,z=Math.floor(i/strideZ);
    let neighbors=0,neighborsStrain=0;
    // Conduct through occupied face-sharing neighbors, never through void.
    for(const j of [i-1,i+1,i-strideY,i+strideY,i-strideZ,i+strideZ]){
      if(j<0||j>=cells.length||!cells[j])continue;
      const dx=Math.abs(j%size-x);
      const dy=Math.abs(Math.floor(j/size)%size-y);
      const dz=Math.abs(Math.floor(j/strideZ)-z);
      if(dx+dy+dz!==1)continue;
      neighbors++;
      neighborsStrain+=strain[j];
    }
    const previous=strain[i];
    const shared=neighbors?neighborsStrain/neighbors:previous;
    const pos={x:(x+.5)*cellSize-extent/2,y:(y+.5)*cellSize-extent/2,
      z:(z+.5)*cellSize-extent/2};
    const source=hasSource?strainSourceAt(pos,marks):0;
    const value=clamp(previous*.985+conduct*(shared-previous)+.165*source,0,1.35);
    next[i]=value<.00003?0:value;
    if(next[i]>0)active=true;
  }
  for(let i=0;i<cells.length;i++){
    if(!cells[i]){strain[i]=0;continue;}
    strain[i]=next[i];
    if(strain[i]>=crackPoint&&damage[i]===0){damage[i]=1;damaged++;}
    // First collect overstressed mature cells, then break only a bounded
    // fraction per CA tick. This protects the seed nucleus so touch never
    // vaporizes the only structure before a viable colony can branch.
    if(strain[i]>=breaking&&cells[i]===2)breakCandidates.push(i);
  }
  const budget=Math.max(0,Math.min(
    Math.ceil(occupied*MAX_FRACTURE_FRACTION),
    occupied-MIN_SURVIVING_NUCLEUS));
  if(budget>0&&breakCandidates.length){
    breakCandidates.sort((a,b)=>strain[b]-strain[a]||a-b);
    for(let k=0;k<Math.min(budget,breakCandidates.length);k++){
      const i=breakCandidates[k];
      damage[i]=2;
      cells[i]=0;ages[i]=0;strain[i]=0;
      shattered++;
    }
  }
  return {active,damaged,shattered};
}
