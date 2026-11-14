// GESTURE WITCH / physical future-growth strokes
// A hand-drawn path is a persistent world-space semantic feature, not a
// baked image. It modifies the actual growth vector field and survives DNA.
export const MAX_STROKES=10;
export const MAX_STROKE_POINTS=48;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const length=(x,y,z)=>Math.hypot(x,y,z);

export function validStroke(s){
  return !!s&&Number.isInteger(s.id)&&s.id>=0&&s.id<1e9&&
    ['guide','push'].includes(s.kind)&&
    Number.isFinite(s.radius)&&s.radius>=.2&&s.radius<=1.8&&
    Number.isFinite(s.strength)&&s.strength>=.1&&s.strength<=3&&
    Array.isArray(s.points)&&s.points.length>=2&&
    s.points.length<=MAX_STROKE_POINTS&&s.points.every(p=>
      Array.isArray(p)&&p.length===3&&p.every(n=>Number.isFinite(n)&&Math.abs(n)<=4));
}
export function validStrokes(strokes){
  return Array.isArray(strokes)&&strokes.length<=MAX_STROKES&&
    strokes.every(validStroke)&&new Set(strokes.map(s=>s.id)).size===strokes.length;
}
export function appendStrokePoint(stroke,point,spacing=.115){
  if(!stroke?.points||stroke.points.length>=MAX_STROKE_POINTS)return false;
  const p=Array.isArray(point)?point:[point.x,point.y,point.z];
  if(!p.every(n=>Number.isFinite(n)&&Math.abs(n)<=4))return false;
  const prev=stroke.points.at(-1);
  if(prev&&length(p[0]-prev[0],p[1]-prev[1],p[2]-prev[2])<spacing)return false;
  stroke.points.push([...p]);
  return true;
}
export function strokeFieldAt(point,strokes){
  if(!strokes?.length)return {x:0,y:0,z:0};
  let fx=0,fy=0,fz=0;
  for(const s of strokes){
    const radius=s.radius,limit=radius*2.7;
    let best=limit*limit,dirX=0,dirY=0,dirZ=0,nearX=0,nearY=0,nearZ=0;
    const pts=s.points;
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1],b=pts[i];
      const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
      const l2=dx*dx+dy*dy+dz*dz;
      if(l2<1e-8)continue;
      const t=clamp(((point.x-a[0])*dx+(point.y-a[1])*dy+(point.z-a[2])*dz)/l2,0,1);
      const qx=a[0]+dx*t,qy=a[1]+dy*t,qz=a[2]+dz*t;
      const ex=qx-point.x,ey=qy-point.y,ez=qz-point.z;
      const d2=ex*ex+ey*ey+ez*ez;
      if(d2>=best)continue;
      best=d2;
      const inverse=1/Math.sqrt(l2);
      dirX=dx*inverse;dirY=dy*inverse;dirZ=dz*inverse;
      nearX=ex;nearY=ey;nearZ=ez;
    }
    if(best>=limit*limit)continue;
    const kernel=Math.exp(-best/(2*radius*radius))*s.strength;
    if(s.kind==='guide'){
      // A path is a guiding rail: lateral adhesion plus forward transport.
      const bend=2.2/(Math.sqrt(best)+.25);
      fx+=kernel*(dirX*.80+nearX*bend);
      fy+=kernel*(dirY*.80+nearY*bend);
      fz+=kernel*(dirZ*.80+nearZ*bend);
    }else{
      // Warp strokes advect the entire local growth field in the direction
      // of the artist's drag, rather than moving a screen-space image.
      fx+=kernel*dirX*2.4;
      fy+=kernel*dirY*2.4;
      fz+=kernel*dirZ*2.4;
    }
  }
  const norm=length(fx,fy,fz);
  const maxForce=8;
  if(norm>maxForce){const k=maxForce/norm;fx*=k;fy*=k;fz*=k;}
  return {x:fx,y:fy,z:fz};
}
