// Gesture Witch / atomic semantic field editing kernel.
// No DOM, browser globals, or renderer-specific geometry. This kernel edits
// persistent named force sources, not pixels, camera transforms or fake topology.

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const point=(p)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));

export function lensDelta(firstA,firstB,nextA,nextB){
  if(![firstA,firstB,nextA,nextB].every(point))throw Error('Invalid pinch coordinates.');
  const initial=distance(firstA,firstB);
  if(initial<8)return {scale:1,twist:0,valid:false};
  const current=distance(nextA,nextB);
  return {
    scale:clamp(current/initial,.25,4),
    twist:wrapAngle(angle(nextA,nextB)-angle(firstA,firstB)),
    valid:true
  };
}

export class FieldGestureTransaction{
  constructor(engine){this.engine=engine;this.before=null;this.beforeRng=0;this.node=null;this.lens=null;this.erasing=false;}
  get active(){return this.before!==null;}
  begin({type='vortex',pos=null,nodeId=null}={}){
    if(this.active)throw Error('A field gesture is already active.');
    const eng=this.engine;
    this.before=eng.snapshotField();
    this.beforeRng=eng.rngState;
    this.erasing=type==='erase';
    this.node=nodeId===null?null:eng.nodes.find(n=>n.id===nodeId);
    if(this.erasing){
      if(!this.node){this.clear();return false;}
      eng.nodes=eng.nodes.filter(n=>n.id!==this.node.id);
      return true;
    }
    if(!this.node){
      if(!pos||!['vortex','attract','repel'].includes(type)){
        this.clear();throw Error('Invalid field edit.');
      }
      this.node=eng.addNode(type,pos,{record:false});
    }
    return true;
  }
  move(pos){
    if(!this.active||!this.node||this.erasing)return;
    if(!pos||![pos.x,pos.y,pos.z].every(Number.isFinite))throw Error('Invalid world position.');
    this.node.pos.copy(pos);
  }
  beginLens(a,b){
    if(!this.active||!this.node||this.erasing)return false;
    if(!point(a)||!point(b)||distance(a,b)<8)return false;
    this.lens={
      a:{...a},b:{...b},
      radius:this.node.radius??1.1,
      spin:this.node.spin??1.2,
      strength:this.node.strength
    };
    return true;
  }
  lensPreview(a,b){
    if(!this.lens||!this.node)return false;
    const delta=lensDelta(this.lens.a,this.lens.b,a,b);
    if(!delta.valid)return false;
    if(this.node.type==='vortex'){
      this.node.radius=clamp(this.lens.radius*delta.scale,.25,2.8);
      this.node.spin=clamp(this.lens.spin+delta.twist*1.65,-2.5,2.5);
    }else{
      // Attraction/repulsion gets a genuine field-force magnitude change.
      this.node.strength=clamp(this.lens.strength*delta.scale,.25,12);
    }
    return true;
  }
  commit(){
    if(!this.active)return false;
    const eng=this.engine;
    const changed=JSON.stringify(this.before)!==JSON.stringify(eng.snapshotField());
    if(changed){
      eng.nodeUndo.push(this.before);
      if(eng.nodeUndo.length>25)eng.nodeUndo.shift();
      eng.nodeRedo=[];
    }else eng.rngState=this.beforeRng;
    this.clear();
    return changed;
  }
  cancel(){
    if(!this.active)return false;
    this.engine.restoreField(this.before);
    this.engine.rngState=this.beforeRng;
    this.clear();
    return true;
  }
  clear(){this.before=null;this.node=null;this.lens=null;this.erasing=false;}
}

/**
 * Draw a causal guide / warp path as one atomic semantic transaction.
 * Draft points do not become a committed undo record until pointer-up.
 * Cancellation restores field features and the pre-gesture RNG state.
 */
export class GrowthStrokeTransaction{
  constructor(engine){
    this.engine=engine;this.before=null;this.beforeRng=0;this.stroke=null;
  }
  get active(){return this.before!==null;}
  begin(kind,pos){
    if(this.active)throw Error('Stroke transaction already active.');
    const e=this.engine;
    this.before=e.snapshotField();
    this.beforeRng=e.rngState;
    try{this.stroke=e.addStroke(kind,pos,{record:false});}
    catch(error){this.before=null;throw error;}
    return true;
  }
  append(pos){
    if(!this.active)return false;
    return this.engine.appendStroke(this.stroke,pos);
  }
  commit(){
    if(!this.active)return false;
    const e=this.engine;
    if(this.stroke.points.length<2){
      this.cancel();return false;
    }
    e.nodeUndo.push(this.before);
    if(e.nodeUndo.length>25)e.nodeUndo.shift();
    e.nodeRedo=[];
    this.clear();
    return true;
  }
  cancel(){
    if(!this.active)return false;
    this.engine.restoreField(this.before);
    this.engine.rngState=this.beforeRng;
    this.clear();
    return true;
  }
  clear(){this.before=null;this.stroke=null;}
}

/**
 * Crystal pressure is a semantic, persistent material constraint. A touch
 * changes the future CA probabilities, never erases a colony during preview.
 * The transaction can edit an existing mark or create a new one.
 */
export class CrystalPressureTransaction{
  constructor(engine){
    this.engine=engine;this.before=null;this.beforeRng=0;
    this.mark=null;this.origin=null;this.lens=null;
  }
  get active(){return this.before!==null;}
  begin(mode,pos,{id=null}={}){
    if(this.active)throw Error('Crystal pressure gesture already active.');
    if(!pos||![pos.x,pos.y,pos.z].every(Number.isFinite))throw Error('Invalid crystal pressure position.');
    const e=this.engine;
    this.before=e.snapshotField();
    this.beforeRng=e.rngState;
    this.mark=id===null?null:e.pressures.find(p=>p.id===id);
    try{
      if(!this.mark)this.mark=e.addPressure(mode,pos,{record:false});
      this.origin=[...this.mark.center];
      return true;
    }catch(err){
      this.before=null;this.mark=null;this.origin=null;
      throw err;
    }
  }
  move(pos){
    if(!this.active||!pos||![pos.x,pos.y,pos.z].every(Number.isFinite))return false;
    const end=[pos.x,pos.y,pos.z];
    const start=this.origin;
    const dx=end[0]-start[0],dy=end[1]-start[1],dz=end[2]-start[2];
    const dist=Math.hypot(dx,dy,dz);
    if(dist>.15)this.mark.axis=[dx/dist,dy/dist,dz/dist];
    this.mark.center=end;
    return true;
  }
  beginLens(a,b){
    if(!this.active||!a||!b||Math.hypot(b.x-a.x,b.y-a.y)<8)return false;
    this.lens={
      a:{...a},b:{...b},
      radius:this.mark.radius,
      axis:[...this.mark.axis]
    };
    return true;
  }
  lensPreview(a,b){
    if(!this.lens)return false;
    const delta=lensDelta(this.lens.a,this.lens.b,a,b);
    if(!delta.valid)return false;
    this.mark.radius=Math.max(.25,Math.min(2.1,this.lens.radius*delta.scale));
    const [x,y,z]=this.lens.axis;
    // Rotate the directional cleavage plane about the world's up axis.
    const c=Math.cos(delta.twist),s=Math.sin(delta.twist);
    this.mark.axis=[c*x+s*z,y,-s*x+c*z];
    return true;
  }
  commit(){
    if(!this.active)return false;
    const e=this.engine;
    const changed=JSON.stringify(this.before)!==JSON.stringify(e.snapshotField());
    if(changed){
      e.nodeUndo.push(this.before);
      if(e.nodeUndo.length>25)e.nodeUndo.shift();
      e.nodeRedo=[];
    }else e.rngState=this.beforeRng;
    this.clear();
    return changed;
  }
  cancel(){
    if(!this.active)return false;
    this.engine.restoreField(this.before);
    this.engine.rngState=this.beforeRng;
    this.clear();
    return true;
  }
  clear(){this.before=null;this.mark=null;this.origin=null;this.lens=null;}
}
