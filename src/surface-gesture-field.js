// PHASE 04D / GESTURE WITCH: causal spatial interventions for SURFACE ART.
// Typed, persistent marks are not raster decals. The cached field changes
// acceptance / competition of future 2D mineral births. No THREE / DOM.
export const SURFACE_TOUCH_MODES=Object.freeze({
  seed:'PLANT CRYSTALS',attract:'ATTRACT GROWTH',
  block:'KEEP EMPTY',guide:'COMB GROWTH',edit:'MOVE / PINCH MARKS'
});
export const MAX_SURFACE_MARKS=20;
export const MAX_SURFACE_MARK_POINTS=64;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const point=p=>Array.isArray(p)&&p.length===2&&p.every(n=>finite(n)&&n>=0&&n<=1);
const delta=(a,b,wrap)=>wrap?((a-b+.5+2)%1)-.5:a-b;
const validMark=m=>m&&Number.isInteger(m.id)&&m.id>=1&&m.id<=1000000&&
  ['attract','block','guide'].includes(m.kind)&&
  finite(m.radius)&&m.radius>=.02&&m.radius<=.25&&
  finite(m.strength)&&m.strength>=0&&m.strength<=1&&
  Array.isArray(m.points)&&m.points.length>=1&&m.points.length<=MAX_SURFACE_MARK_POINTS&&
  m.points.every(point);
export function validSurfaceMarks(list){
  return Array.isArray(list)&&list.length<=MAX_SURFACE_MARKS&&
    list.every(validMark)&&new Set(list.map(m=>m.id)).size===list.length;
}
export function cloneSurfaceMarks(marks){
  return marks.map(m=>({id:m.id,kind:m.kind,radius:m.radius,strength:m.strength,
    points:m.points.map(p=>[...p])}));
}
export function newSurfaceMark(id,kind,u,v,radius=.08,strength=.9){
  if(!point([u,v])||!['attract','block','guide'].includes(kind))throw Error('Invalid gesture mark');
  return {id,kind,radius:clamp(radius,.02,.25),strength:clamp(strength,0,1),
    points:[[u,v]]};
}
// A bounded cache; scanning only the local segment bounding box is much
// cheaper than testing every stroke against every cell on every tick.
export function bakeSurfaceGestureField(size,marks,wrap=false){
  if(!Number.isInteger(size)||size<16||size>192||!validSurfaceMarks(marks))
    throw Error('Invalid surface gesture field');
  const capacity=size*size,blocked=new Uint8Array(capacity),
    attraction=new Float32Array(capacity),
    guideX=new Float32Array(capacity),guideY=new Float32Array(capacity);
  for(const mark of marks){
    const radius=mark.radius,spread=radius*1.65;
    const segments=mark.points.length===1?
      [[mark.points[0],mark.points[0]]]:
      mark.points.slice(1).map((p,i)=>[mark.points[i],p]);
    for(const [a,b] of segments){
      let dx=delta(b[0],a[0],wrap),dy=delta(b[1],a[1],wrap);
      const len=Math.hypot(dx,dy);
      const ux=len>1e-7?dx/len:1,uy=len>1e-7?dy/len:0;
      // Wrap a path via the shortest toroidal segment, then stamp translated
      // images around the edges. No conditional UV seam inside growth.
      const shiftRange=wrap?[-1,0,1]:[0];
      for(const sx of shiftRange)for(const sy of shiftRange){
        const ax=a[0]+sx,ay=a[1]+sy,bx=ax+dx,by=ay+dy;
        const x0=Math.max(0,Math.floor((Math.min(ax,bx)-spread)*size)),
          x1=Math.min(size-1,Math.ceil((Math.max(ax,bx)+spread)*size));
        const y0=Math.max(0,Math.floor((Math.min(ay,by)-spread)*size)),
          y1=Math.min(size-1,Math.ceil((Math.max(ay,by)+spread)*size));
        if(x0>x1||y0>y1)continue;
        for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
          const px=(x+.5)/size,py=(y+.5)/size;
          const t=len>1e-7?clamp(((px-ax)*dx+(py-ay)*dy)/(len*len),0,1):0;
          const ex=px-(ax+t*dx),ey=py-(ay+t*dy);
          const d2=ex*ex+ey*ey;
          if(d2>spread*spread)continue;
          const weight=mark.strength*Math.exp(-4*d2/(radius*radius));
          const i=x+y*size;
          if(mark.kind==='block'){
            if(weight>.46)blocked[i]=1;
          }else if(mark.kind==='attract'){
            attraction[i]=Math.min(2,attraction[i]+weight);
          }else{
            // Tangent is a directional growth constraint, never an image warp.
            guideX[i]=clamp(guideX[i]+ux*weight,-2,2);
            guideY[i]=clamp(guideY[i]+uy*weight,-2,2);
          }
        }
      }
    }
  }
  return {blocked,attraction,guideX,guideY};
}
function nearestPointDist(a,pts){
  let best=Infinity;
  for(let i=0;i<pts.length;i++){
    const p=pts[i],q=pts[Math.min(i+1,pts.length-1)];
    const dx=q[0]-p[0],dy=q[1]-p[1],len2=dx*dx+dy*dy;
    const t=len2>1e-9?clamp(((a[0]-p[0])*dx+(a[1]-p[1])*dy)/len2,0,1):0;
    best=Math.min(best,Math.hypot(a[0]-p[0]-dx*t,a[1]-p[1]-dy*t));
  }
  return best;
}
export function nearestSurfaceMark(marks,u,v,reach=.055){
  let found=null,best=reach;
  for(const m of marks){
    const d=nearestPointDist([u,v],m.points);
    if(d<best){best=d;found=m;}
  }
  return found;
}
// Each completed operation captures one compatible CA checkpoint, so Undo
// restores growth consequences too, not just UI sliders or overlays.
export class SurfaceGestureEditor{
  constructor(surface){this.surface=surface;this.undoStack=[];this.redoStack=[];this.tx=null;}
  get active(){return this.tx!==null;}
  historyState(){return {undo:this.undoStack.length,redo:this.redoStack.length};}
  changed(){
    this.surface.touchMarks();
  }
  begin(kind,u,v,{radius=.08,strength=.9,hitRadius=.055,palette=null,seedOptions={}}={}){
    if(this.tx||!point([u,v]))return false;
    const before=this.surface.snapshot();
    const tx={kind,before,start:[u,v],last:[u,v],markId:null,
      initialPoints:null,lens:null,seedOptions,palette,changed:false,hadMulti:false};
    this.tx=tx;
    if(kind==='seed'){
      tx.changed=!!this.surface.seedSymmetricAt(u,v,palette,seedOptions);
    }else if(kind==='edit'){
      const mark=nearestSurfaceMark(this.surface.marks,u,v,hitRadius);
      if(!mark){this.tx=null;return false;}
      tx.markId=mark.id;tx.initialPoints=mark.points.map(p=>[...p]);
    }else if(['attract','block','guide'].includes(kind)){
      if(this.surface.marks.length>=MAX_SURFACE_MARKS||
         this.surface.nextMarkId>1000000){this.tx=null;return false;}
      const id=this.surface.nextMarkId++;
      const mark=newSurfaceMark(id,kind,u,v,radius,strength);
      this.surface.marks.push(mark);
      tx.markId=id;tx.changed=true;this.changed();
    }else{this.tx=null;return false;}
    return true;
  }
  mark(){
    return this.tx&&this.surface.marks.find(m=>m.id===this.tx.markId);
  }
  move(u,v){
    const tx=this.tx;if(!tx||tx.lens||tx.hadMulti||!point([u,v]))return false;
    const from=tx.last;
    if(Math.hypot(u-from[0],v-from[1])<(tx.kind==='seed'?.025:.006))return false;
    tx.last=[u,v];
    if(tx.kind==='seed'){
      if(this.surface.seedSymmetricAt(u,v,tx.palette,tx.seedOptions)){
        tx.changed=true;return true;
      }
      return false;
    }
    const mark=this.mark();if(!mark)return false;
    if(tx.kind==='edit'){
      const dx=u-tx.start[0],dy=v-tx.start[1];
      mark.points=tx.initialPoints.map(p=>[
        clamp(p[0]+dx,0,1),clamp(p[1]+dy,0,1)]);
    }else{
      if(mark.points.length>=MAX_SURFACE_MARK_POINTS)return false;
      mark.points.push([u,v]);
    }
    tx.changed=true;this.changed();return true;
  }
  beginLens(a,b){
    const tx=this.tx,mark=this.mark();
    if(!tx||!mark||!point(a)||!point(b))return false;
    const dist=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(dist<.018)return false;
    tx.hadMulti=true;
    tx.lens={a:[...a],b:[...b],radius:mark.radius,
      points:mark.points.map(p=>[...p]),center:[
        (a[0]+b[0])/2,(a[1]+b[1])/2]};
    return true;
  }
  lensMove(a,b){
    const tx=this.tx,lens=tx?.lens,mark=this.mark();
    if(!lens||!mark||!point(a)||!point(b))return false;
    const d0=Math.hypot(lens.b[0]-lens.a[0],lens.b[1]-lens.a[1]);
    const d1=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(d0<.018)return false;
    const scale=clamp(d1/d0,.25,4);
    const theta=Math.atan2(b[1]-a[1],b[0]-a[0])-
      Math.atan2(lens.b[1]-lens.a[1],lens.b[0]-lens.a[0]);
    const cs=Math.cos(theta),sn=Math.sin(theta),
      center=[(a[0]+b[0])/2,(a[1]+b[1])/2];
    mark.radius=clamp(lens.radius*scale,.02,.25);
    mark.points=lens.points.map(p=>{
      const x=p[0]-lens.center[0],y=p[1]-lens.center[1];
      return [clamp(center[0]+cs*x-sn*y,0,1),
        clamp(center[1]+sn*x+cs*y,0,1)];
    });
    tx.changed=true;this.changed();return true;
  }
  commit(){
    const tx=this.tx;if(!tx)return false;
    this.tx=null;
    if(!tx.changed){return false;}
    this.undoStack.push(tx.before);
    if(this.undoStack.length>6)this.undoStack.shift();
    this.redoStack=[];
    this.changed();
    this.surface.rebuildFrontier(tx.seedOptions?.wrap??false,tx.seedOptions||{});
    return true;
  }
  cancel(){
    if(!this.tx)return false;
    const previous=this.tx.before;this.tx=null;
    this.surface.restore(previous);return true;
  }
  undo(wrap=false,options={}){
    if(this.tx||!this.undoStack.length)return false;
    const current=this.surface.snapshot();
    const before=this.undoStack.pop();this.redoStack.push(current);
    this.surface.restore(before);return true;
  }
  redo(){
    if(this.tx||!this.redoStack.length)return false;
    const current=this.surface.snapshot();
    const next=this.redoStack.pop();this.undoStack.push(current);
    this.surface.restore(next);return true;
  }
  atomicMutation(operation){
    if(this.tx||typeof operation!=='function')return false;
    const before=this.surface.snapshot();
    try{operation();}catch(error){
      this.surface.restore(before);throw error;
    }
    this.undoStack.push(before);
    if(this.undoStack.length>6)this.undoStack.shift();
    this.redoStack=[];
    return true;
  }
  clear(){
    if(this.tx||!this.surface.marks.length)return false;
    this.undoStack.push(this.surface.snapshot());
    if(this.undoStack.length>6)this.undoStack.shift();
    this.redoStack=[];
    this.surface.marks=[];this.changed();
    return true;
  }
  resetHistory(){this.tx=null;this.undoStack=[];this.redoStack=[];}
}
