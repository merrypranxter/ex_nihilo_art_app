// EX NIHILO 04I — hand-drawn, source-UV camera choreography.
// This document is CAMERA metadata only. No crystal, pigment or gesture
// simulation data is mutated by a camera path or by its undo stack.
import {cinematicDimensions,cinematicFrameRect} from './surface-cinematic.js';
export const CAMERA_PATH_MODES=Object.freeze({
  circuit:'SMOOTH CIRCUIT · CLOSE THE STROKE',
  retrace:'RETRACE · OUT AND BACK'
});
export const CAMERA_PATH_TIMINGS=Object.freeze({
  even:'EVEN SPEED · ARC LENGTH',
  hand:'HAND RHYTHM · RECORDED GESTURE',
  linger:'LINGER · SLOW AT THE TURN'
});
export const MAX_CAMERA_PATH_POINTS=72;
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const point=p=>Array.isArray(p)&&p.length===3&&
  p.every(finite)&&p[0]>=0&&p[0]<=1&&p[1]>=0&&p[1]<=1&&
  p[2]>=0&&p[2]<=1;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function validCameraPath(path){
  return path===null||Boolean(path&&path.version===1&&
    Number.isInteger(path.id)&&path.id>=1&&path.id<=1000000&&
    Array.isArray(path.points)&&path.points.length>=2&&
    path.points.length<=MAX_CAMERA_PATH_POINTS&&
    path.points.every(point)&&
    path.points.every((p,i)=>i===0||p[2]>=path.points[i-1][2])&&
    path.points[0][2]===0&&
    path.points.at(-1)[2]===1&&
    path.points.some((p,i)=>i>0&&distance(p,path.points[0])>.005));
}
export function cloneCameraPath(path){
  return path?{version:1,id:path.id,points:path.points.map(p=>[...p])}:null;
}
export function reverseCameraPath(path){
  if(!validCameraPath(path)||!path)throw Error('Invalid camera path');
  return {version:1,id:path.id,
    points:path.points.slice().reverse().map(p=>[p[0],p[1],1-p[2]])};
}
function catmull(p0,p1,p2,p3,t,smooth){
  // Hermite form: when smooth=0, exact linear piece with zero tangent
  // discontinuities permitted. smooth=1 yields Catmull-Rom C1 joins.
  const m1=(p2-p0)*smooth*.5,m2=(p3-p1)*smooth*.5;
  const t2=t*t,t3=t2*t;
  return (2*t3-3*t2+1)*p1+(t3-2*t2+t)*m1+
    (-2*t3+3*t2)*p2+(t3-t2)*m2;
}
function splinePoint(path,position,{mode='circuit',smooth=.85}={}){
  const pts=path.points,n=pts.length,closed=mode==='circuit';
  const segments=closed?n:n-1;
  const q=clamp(position,0,1)*segments;
  const i=Math.min(segments-1,Math.floor(q)),t=q-i;
  const at=j=>{
    if(closed)return pts[((j%n)+n)%n];
    return pts[clamp(j,0,n-1)];
  };
  const a=at(i-1),b=at(i),c=at(i+1),d=at(i+2);
  return [
    clamp(catmull(a[0],b[0],c[0],d[0],t,smooth),0,1),
    clamp(catmull(a[1],b[1],c[1],d[1],t,smooth),0,1)
  ];
}
// Cache numeric arc-length tables by saved path object identity. The artist
// never accumulates state per frame; mathematical sampling is deterministic.
const tableCache=new WeakMap();
function pathTable(path,mode,smooth){
  const key=mode+':'+smooth;
  let tables=tableCache.get(path);
  if(!tables){tables=new Map();tableCache.set(path,tables);}
  if(tables.has(key))return tables.get(key);
  const segments=mode==='circuit'?path.points.length:path.points.length-1;
  const count=Math.max(64,segments*12),positions=new Float32Array(count+1),
    distances=new Float64Array(count+1);
  let previous=splinePoint(path,0,{mode,smooth}),length=0;
  for(let i=1;i<=count;i++){
    const u=i/count,point=splinePoint(path,u,{mode,smooth});
    length+=distance(previous,point);
    positions[i]=u;distances[i]=length;previous=point;
  }
  if(length>0)for(let i=0;i<=count;i++)distances[i]/=length;
  const table={positions,distances,length};
  tables.set(key,table);
  return table;
}
function arcToSpline(table,t){
  const d=table.distances;
  let lo=0,hi=d.length-1;
  while(hi-lo>1){
    const mid=(lo+hi)>>1;
    if(d[mid]<t)lo=mid;else hi=mid;
  }
  const denom=d[hi]-d[lo];
  const ratio=denom>1e-12?(t-d[lo])/denom:0;
  return table.positions[lo]+(table.positions[hi]-table.positions[lo])*ratio;
}
function handPosition(path,t,mode){
  // Every saved anchor contains normalized drawing time. The last return
  // segment gets explicit travel-time proportional to its geometric length.
  const pts=path.points,n=pts.length,legs=mode==='circuit'?n:n-1;
  const totalDraw=pts.slice(1).reduce((a,p,i)=>a+
    Math.max(.0001,p[2]-pts[i][2]),0);
  const closing=mode==='circuit'?distance(pts[n-1],pts[0]):0;
  const forward=pts.slice(1).reduce((a,p,i)=>a+distance(p,pts[i]),0);
  const homeFraction=mode==='circuit'?
    clamp(closing/Math.max(forward+closing,1e-7),.08,.38):0;
  const forwardFraction=1-homeFraction;
  if(mode==='circuit'&&t>=forwardFraction){
    return ((n-1)+(t-forwardFraction)/homeFraction)/legs;
  }
  const normalized=t/Math.max(forwardFraction,1e-8);
  for(let i=1;i<n;i++){
    const a=pts[i-1][2]/Math.max(totalDraw,1e-9),
      b=pts[i][2]/Math.max(totalDraw,1e-9);
    if(normalized<=b||i===n-1){
      return ((i-1)+clamp((normalized-a)/Math.max(b-a,1e-7),0,1))/legs;
    }
  }
  return 1;
}
export function sampleCameraPath(path,phase,{
  mode='circuit',timing='even',smooth=.85
}={}){
  if(!validCameraPath(path)||!path||!finite(phase)||
    !Object.hasOwn(CAMERA_PATH_MODES,mode)||
    !Object.hasOwn(CAMERA_PATH_TIMINGS,timing)||
    !finite(smooth)||smooth<0||smooth>1)
    throw Error('Invalid camera path evaluation');
  const t=((phase/TAU%1)+1)%1;
  // Retrace uses cosine easing at each end. Its derivative is zero at both
  // turning points and at the loop seam.
  let journey=mode==='retrace'?.5-.5*Math.cos(TAU*t):t;
  if(timing==='linger'&&mode==='circuit')
    journey=journey-Math.sin(TAU*journey)*.35/TAU;
  let u;
  if(timing==='hand'){
    u=handPosition(path,journey,mode);
  }else{
    const arc=pathTable(path,mode,smooth);
    u=arcToSpline(arc,journey);
  }
  return splinePoint(path,u,{mode,smooth});
}
// A source-space point is not the same thing as a normalized crop offset.
// Convert it into focusX/Y using the exact same source rect as the renderer.
export function cameraPathPose(path,phase,config={}){
  const source=sampleCameraPath(path,phase,{
    mode:config.surfaceCameraPathMode??'circuit',
    timing:config.surfaceCameraPathTiming??'even',
    smooth:config.surfaceCameraPathSmooth??.85
  });
  const zoomBase=clamp(Math.max(config.surfaceLoopZoom??1,
    config.surfaceCameraPathZoom??1.45),1,2.5);
  const pumping=clamp(config.surfaceCameraPathPulse??0,0,1);
  const zoom=clamp(zoomBase+(2.5-zoomBase)*pumping*
    (.5-.5*Math.cos(phase)),1,2.5);
  const dims=cinematicDimensions(1024,
    config.surfaceLoopAspect??'1:1');
  const rect=cinematicFrameRect(1,dims.width,dims.height,{
    framing:config.surfaceLoopFraming??'cover',
    focusX:.5,focusY:.5,zoom
  });
  const fractionX=1-rect.sw,fractionY=1-rect.sh;
  const focusX=fractionX<=1e-9?.5:
    clamp((source[0]-rect.sw*.5)/fractionX,0,1);
  const focusY=fractionY<=1e-9?.5:
    clamp((source[1]-rect.sh*.5)/fractionY,0,1);
  return {focusX,focusY,zoom,source};
}
// Single semantic document; every finger-up is one bounded Undo entry.
// In-progress gestures do not mutate saved config, mineral cells, or optics.
export class CameraPathEditor {
  constructor(path=null){
    if(!validCameraPath(path))throw Error('Invalid initial camera path');
    this.path=cloneCameraPath(path);this.undoStack=[];this.redoStack=[];
    this.draft=null;this.nextId=(path?.id??0)+1;
  }
  history(){return {undo:this.undoStack.length,redo:this.redoStack.length};}
  reset(path=null){
    if(!validCameraPath(path))throw Error('Invalid camera path');
    this.path=cloneCameraPath(path);this.draft=null;
    this.undoStack=[];this.redoStack=[];
    this.nextId=(path?.id??0)+1;
  }
  begin(x,y,time=0){
    if(this.draft||![x,y,time].every(finite)||
      x<0||x>1||y<0||y>1)return false;
    this.draft={id:this.nextId,points:[[x,y,0]],lastTime:time};
    return true;
  }
  append(x,y,time){
    const draft=this.draft;if(!draft||![x,y,time].every(finite)||
      x<0||x>1||y<0||y>1)return false;
    const pts=draft.points,last=pts.at(-1);
    const span=Math.max(0,time-draft.lastTime);
    if(distance([x,y],last)<.006)return false;
    if(pts.length>=MAX_CAMERA_PATH_POINTS){
      // Adaptive simplification: preserve the first and latest anchors and
      // every other interior anchor, so a long iPhone stroke can keep growing
      // without truncating its final destination or exceeding 72 anchors.
      const original=pts.slice();
      pts.length=0;
      for(let i=0;i<original.length;i++)
        if(i===0||i===original.length-1||i%2===0)pts.push(original[i]);
    }
    // Input time is milliseconds elapsed since pointerdown, and is never
    // persisted as real wall time. Normalize only when committing.
    draft.lastTime=Math.max(draft.lastTime,time);
    pts.push([x,y,draft.lastTime]);
    return span>=0;
  }
  commit(){
    const draft=this.draft;if(!draft)return false;
    this.draft=null;
    const pts=draft.points;
    if(pts.length<2||!pts.some(p=>distance(p,pts[0])>.005))
      return false;
    const end=pts.at(-1)[2];
    const raw=pts.map((p,i)=>[p[0],p[1],
      i===0?0:i===pts.length-1?1:
      end>0?clamp(p[2]/end,0,1):i/(pts.length-1)]);
    const next={version:1,id:this.nextId,points:raw};
    if(!validCameraPath(next))return false;
    this.pushHistory();
    this.path=next;this.nextId++;return true;
  }
  cancel(){if(!this.draft)return false;this.draft=null;return true;}
  pushHistory(){
    this.undoStack.push(cloneCameraPath(this.path));
    if(this.undoStack.length>6)this.undoStack.shift();
    this.redoStack=[];
  }
  clear(){
    if(this.draft||!this.path)return false;
    this.pushHistory();this.path=null;return true;
  }
  reverse(){
    if(this.draft||!this.path)return false;
    this.pushHistory();this.path=reverseCameraPath(this.path);
    return true;
  }
  undo(){
    if(this.draft||!this.undoStack.length)return false;
    this.redoStack.push(cloneCameraPath(this.path));
    this.path=this.undoStack.pop();return true;
  }
  redo(){
    if(this.draft||!this.redoStack.length)return false;
    this.undoStack.push(cloneCameraPath(this.path));
    this.path=this.redoStack.pop();return true;
  }
}
