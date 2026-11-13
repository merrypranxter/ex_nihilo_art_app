// PHASE 03 / STRUCTURAL FEEDBACK
// The crystal colony is a 3D set of occupied voxels: rays meet those voxels
// in world space. A collided growth tip can either reflect or slide along the
// *actual* local boundary. The chemistry's B isosurface supplies a second,
// continuously changing boundary for contour tracing. No mesh is prebuilt.

const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const v=(x=0,y=0,z=0)=>({x,y,z});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const norm=a=>Math.sqrt(dot(a,a));
const plus=(a,b)=>v(a.x+b.x,a.y+b.y,a.z+b.z);
const scaled=(a,t)=>v(a.x*t,a.y*t,a.z*t);
const subtract=(a,b)=>v(a.x-b.x,a.y-b.y,a.z-b.z);

export function isOccupied(colony,position){
  if(!colony?.population)return false;
  const [x,y,z]=colony.coords(position);
  return colony.inside(x,y,z)&&colony.cells[colony.index(x,y,z)]!==0;
}

// Intersection of a growth segment with a solid, axis-aligned cell.
// We treat every occupied CA voxel as an obstacle; visible crystals can have
// rounded shapes while their collision envelope remains conservative.
function intersectBox(start,move,center,half){
  const low=v(center.x-half,center.y-half,center.z-half);
  const high=v(center.x+half,center.y+half,center.z+half);
  let enter=0,leave=1,normal=null;
  const inside=['x','y','z'].every(a=>start[a]>=low[a]&&start[a]<=high[a]);
  if(inside){
    let depth=Infinity;
    for(const a of ['x','y','z']){
      const lo=start[a]-low[a],hi=high[a]-start[a];
      const candidate=Math.min(lo,hi);
      if(candidate<depth){
        depth=candidate;
        normal=v();
        normal[a]=lo<hi?-1:1;
      }
    }
    return {t:0,normal,inside:true,half,center};
  }
  for(const a of ['x','y','z']){
    const d=move[a];
    if(Math.abs(d)<1e-12){
      if(start[a]<low[a]||start[a]>high[a])return null;
      continue;
    }
    const ta=(low[a]-start[a])/d,tb=(high[a]-start[a])/d;
    const near=Math.min(ta,tb),far=Math.max(ta,tb);
    if(near>enter){
      enter=near;
      normal=v();normal[a]=d>0?-1:1;
    }
    leave=Math.min(leave,far);
    if(enter>leave)return null;
  }
  return normal&&enter<=1&&leave>=0?{t:enter,normal,inside:false,half,center}:null;
}

export function resolveCrystalMovement(colony,start,end,mode='slide'){
  if(mode==='off'||!colony?.population)return {position:end,contact:false,normal:null};
  const move=subtract(end,start);
  if(norm(move)<1e-10)return {position:end,contact:false,normal:null};
  const [ax,ay,az]=colony.coords(start),[bx,by,bz]=colony.coords(end);
  // Use the whole occupied voxel (not just the smaller visual crystal glyph).
  const width=colony.extent/colony.size,half=width*.5;
  let hit=null;
  for(let z=Math.max(1,Math.min(az,bz)-2);z<=Math.min(colony.size-2,Math.max(az,bz)+2);z++)
    for(let y=Math.max(1,Math.min(ay,by)-2);y<=Math.min(colony.size-2,Math.max(ay,by)+2);y++)
      for(let x=Math.max(1,Math.min(ax,bx)-2);x<=Math.min(colony.size-2,Math.max(ax,bx)+2);x++){
        const i=colony.index(x,y,z);
        if(colony.cells[i]===0)continue;
        const test=intersectBox(start,move,colony.worldPos(x,y,z),half);
        if(test&&(hit===null||test.t<hit.t))hit=test;
      }
  if(!hit)return {position:end,contact:false,normal:null};
  const n=hit.normal,skin=width*.045;
  const first=hit.inside
    ?plus(hit.center,scaled(n,hit.half+skin))
    :plus(plus(start,scaled(move,hit.t)),scaled(n,skin));
  const remaining=scaled(move,hit.inside?1:(1-hit.t));
  const inward=dot(remaining,n);
  const next=mode==='deflect'
    ? subtract(remaining,scaled(n,2*Math.min(0,inward)))
    : subtract(remaining,scaled(n,Math.min(0,inward)));
  const position=plus(first,next);
  return {position,contact:true,normal:n,hitPosition:first};
}

export function traceChemicalMembrane(chemical,position,motion,amount=0){
  if(!chemical?.settings.enabled||amount<=0){
    return {motion,tracing:false};
  }
  const b=chemical.sampleB(position),iso=chemical.settings.iso;
  // Only near the *actual* moving chemical isosurface, not throughout volume.
  const band=.075;
  const closeness=Math.max(0,1-Math.abs(b-iso)/band);
  if(closeness<=0)return {motion,tracing:false};
  const g=chemical.gradientB(position),gSize=norm(g);
  if(gSize<1e-5)return {motion,tracing:false};
  const n=scaled(g,1/gSize);
  const tangent=subtract(motion,scaled(n,dot(motion,n)));
  const t=clamp(amount*closeness,0,1);
  const combined=plus(scaled(motion,1-t),scaled(tangent,t));
  const size=norm(combined),original=norm(motion);
  if(size<1e-8 || original<1e-8)return {motion,tracing:false};
  return {motion:scaled(combined,original/size),tracing:true};
}
