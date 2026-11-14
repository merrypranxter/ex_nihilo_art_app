// CRYSTAL PRESSURE WITCH
// Persistent artist-imposed local stress changes ACTUAL cellular crystal
// birth and erosion probabilities. No prebuilt crystals, pixel displacement,
// destructive cell carving during a gesture or runtime physics API needed.
export const MAX_PRESSURES=12;
export const PRESSURE_MODES=Object.freeze({
  grow:'GROWTH PRESS',shield:'SHIELD',cleave:'CLEAVE / TWO-SIDED GROWTH'
});
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const finite=Number.isFinite;
export function normalizePressureAxis(axis){
  const p=Array.isArray(axis)?axis:[axis.x,axis.y,axis.z];
  const norm=Math.hypot(p[0],p[1],p[2]);
  if(!finite(norm)||norm<1e-8)return [1,0,0];
  return p.map(x=>x/norm);
}
export function validPressures(pressures){
  return Array.isArray(pressures)&&pressures.length<=MAX_PRESSURES&&
    new Set(pressures.map(p=>p.id)).size===pressures.length&&
    pressures.every(p=>p&&Number.isInteger(p.id)&&p.id>=0&&p.id<1e9&&
      PRESSURE_MODES[p.mode]!==undefined&&
      Array.isArray(p.center)&&p.center.length===3&&
      p.center.every(n=>finite(n)&&Math.abs(n)<=3.6)&&
      Array.isArray(p.axis)&&p.axis.length===3&&
      p.axis.every(n=>finite(n)&&Math.abs(n)<=1)&&
      Math.abs(Math.hypot(...p.axis)-1)<1e-4&&
      finite(p.radius)&&p.radius>=.25&&p.radius<=2.1&&
      finite(p.strength)&&p.strength>=.1&&p.strength<=2.4);
}
/**
 * Evaluate a bounded birth multiplier + mature-cell erosion probability.
 * No pressure stamps => precisely the old CA law and old RNG draw sequence.
 * "cleave" is a directional stress fracture: a depleted central seam, with
 * stronger two shoulder fronts. Existing matter only dissolves through
 * ordinary CA erosion on future updates, never while the artist drags.
 */
export function pressureAt(point,pressures){
  if(!pressures?.length)return {birth:1,erosion:0,affected:false};
  let birth=1,erosion=0,affected=false;
  for(const p of pressures){
    const dx=point.x-p.center[0],dy=point.y-p.center[1],dz=point.z-p.center[2];
    const r=p.radius,dist2=dx*dx+dy*dy+dz*dz;
    if(dist2>9*r*r)continue;
    affected=true;
    const near=Math.exp(-dist2/(2*r*r));
    if(p.mode==='grow'){
      birth*=1+1.75*p.strength*near;
    }else if(p.mode==='shield'){
      birth*=Math.exp(-2.2*p.strength*near);
    }else {
      const along=Math.abs(dx*p.axis[0]+dy*p.axis[1]+dz*p.axis[2]);
      const across2=Math.max(0,dist2-along*along);
      const seam=Math.exp(-Math.pow(along/(.19*r),2))*Math.exp(-across2/(1.5*r*r));
      const shoulders=Math.exp(-Math.pow((along-.66*r)/(.32*r),2))*
        Math.exp(-across2/(2*r*r));
      birth*=Math.max(.02,1+p.strength*(2.15*shoulders-1.48*seam));
      erosion=1-(1-erosion)*(1-clamp(.34*p.strength*seam,0,.68));
    }
  }
  return {birth:clamp(birth,.015,5),erosion:clamp(erosion,0,.72),affected};
}
