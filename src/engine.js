import * as THREE from 'three';

export const PALETTES = {
  acid: ['#00ffc8', '#ff37c7', '#a45cff', '#ffeb83'],
  molten: ['#ffeb45', '#ff532b', '#ef38a7', '#45d9ff'],
  biolume: ['#50ffee', '#51adff', '#7b4dff', '#ebffa8'],
  candy: ['#ff499b', '#48e3ff', '#e8ff58', '#b46aff'],
  ivory: ['#f6e9ff', '#b8d5eb', '#ffb8df', '#e6fbf0']
};

const WORLD = 8;
const GRID = 34;
const MAX_DENSITY = 120;
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const safe = n => Number.isFinite(n) ? n : 0;
const v = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);

export class GrowthEngine {
  constructor(seed = 1271991) {
    this.maxSegments = 60000;
    this.config = {
      speed: 1, agents: 180, branching: .45, feedback: .55, thickness: .04,
      topology: 'cathedral', force: 1, frequency: 1.2, evolution: .4, palette: 'acid'
    };
    this.onDeposit = () => {};
    this.onReset = () => {};
    this.nodeUndo = [];
    this.nodeRedo = [];
    this.reset(seed);
  }

  reset(seed = this.seed) {
    this.seed = (Number(seed) >>> 0) || 1;
    this.rngState = this.seed;
    this.time = 0;
    this.totalDeposits = 0;
    this.segmentCount = 0;
    this.cursor = 0;
    this.agents = [];
    this.nodes = [];
    this.nodeUndo = [];
    this.nodeRedo = [];
    this.density = new Uint16Array(GRID * GRID * GRID);
    this.segments = new Float32Array(this.maxSegments * 6);
    this.onReset();
    this.seedAt(v(0,0,0),Math.min(16,this.config.agents));
  }

  random() {
    let t = (this.rngState += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  randomVector() {
    const z = this.random() * 2 - 1, angle = this.random() * Math.PI * 2;
    const r = Math.sqrt(1 - z*z);
    return v(Math.cos(angle)*r,Math.sin(angle)*r,z);
  }

  randomPointOnFibers() {
    if (this.segmentCount < 50 || this.random() < .08) return this.randomVector().multiplyScalar(.20);
    const slot = Math.floor(this.random() * this.segmentCount);
    const k = slot * 6;
    return v(this.segments[k+3],this.segments[k+4],this.segments[k+5]);
  }

  addAgent(position, direction = this.randomVector()) {
    if (this.agents.length >= this.config.agents) return;
    const p = position.clone();
    this.agents.push({
      p, prev: p.clone(), dir: direction.clone().normalize(),
      traveled: 0, age: 0, life: 8 + this.random() * 22,
      identity: this.random()
    });
  }

  seedAt(pos, n=12) {
    for(let i=0;i<n;i++) this.addAgent(pos.clone().addScaledVector(this.randomVector(),this.random()*.08));
  }

  setConfig(next) {
    const candidate = {...this.config,...next};
    candidate.speed = clamp(safe(+candidate.speed),.1,3);
    candidate.agents = Math.round(clamp(safe(+candidate.agents),30,360));
    candidate.branching = clamp(safe(+candidate.branching),0,1);
    candidate.feedback = clamp(safe(+candidate.feedback),0,1);
    candidate.thickness = clamp(safe(+candidate.thickness),.01,.12);
    candidate.force = clamp(safe(+candidate.force),0,3);
    candidate.frequency = clamp(safe(+candidate.frequency),.3,3.5);
    candidate.evolution = clamp(safe(+candidate.evolution),0,2);
    if(!['cathedral','vortex','braid','serpentine','bloom'].includes(candidate.topology)) candidate.topology='cathedral';
    if(!PALETTES[candidate.palette]) candidate.palette='acid';
    this.config=candidate;
    if(this.agents.length>candidate.agents) this.agents.length=candidate.agents;
  }

  getDNA() {
    return {format:'ex-nihilo/dna-v1', experiment:'nerve-cathedral', seed:this.seed, config:{...this.config}};
  }

  loadDNA(dna) {
    if(dna?.format !== 'ex-nihilo/dna-v1' || dna?.experiment !== 'nerve-cathedral' || typeof dna.config !== 'object') {
      throw new Error('This is not Nerve Cathedral DNA.');
    }
    this.setConfig(dna.config);
    // DNA changes the laws going forward. It cannot erase this organism's lived state.
  }

  gridCoordinates(pos) {
    return [
      clamp(Math.floor((pos.x/WORLD*.5+.5)*GRID),0,GRID-1),
      clamp(Math.floor((pos.y/WORLD*.5+.5)*GRID),0,GRID-1),
      clamp(Math.floor((pos.z/WORLD*.5+.5)*GRID),0,GRID-1)
    ];
  }

  cell(x,y,z) {
    x=clamp(x,0,GRID-1); y=clamp(y,0,GRID-1); z=clamp(z,0,GRID-1);
    return x + GRID*(y + GRID*z);
  }

  mark(pos) {
    const [x,y,z] = this.gridCoordinates(pos);
    const i=this.cell(x,y,z);
    this.density[i]=Math.min(MAX_DENSITY,this.density[i]+1);
  }

  densityGradient(pos) {
    const [x,y,z]=this.gridCoordinates(pos);
    const d=this.density;
    return v(
      d[this.cell(x+1,y,z)]-d[this.cell(x-1,y,z)],
      d[this.cell(x,y+1,z)]-d[this.cell(x,y-1,z)],
      d[this.cell(x,y,z+1)]-d[this.cell(x,y,z-1)]
    ).multiplyScalar(1/MAX_DENSITY);
  }

  fieldAt(pos) {
    const {x,y,z}=pos;
    const c=this.config, a=1.31*c.frequency, b=.83*c.frequency;
    const t=this.time*c.evolution*.16;
    // Curl(A), where A = (sin(a*y+b*z+t), sin(a*z+b*x+t), sin(a*x+b*y+t)).
    // This component is divergence-free by construction, not just visual noise.
    const cy=Math.cos(a*x+b*y+t);
    const cz=Math.cos(a*y+b*z+t);
    const cx=Math.cos(a*z+b*x+t);
    const f=v(b*cy-a*cx,b*cz-a*cy,b*cx-a*cz).multiplyScalar(.55);

    if(c.topology==='vortex'){
      f.add(v(-z*.5+.12*Math.sin(2*y+t),.7+Math.sin(x*z)*.12,x*.5));
    }else if(c.topology==='braid'){
      const strands=[-1.7,1.7];
      for(let i=0;i<2;i++){
        const dx=x-strands[i],dz=z, falloff=1/(1+.25*(dx*dx+dz*dz));
        const sign=i===0?1:-1;
        f.add(v(-dz*sign*falloff*1.25,.47*falloff,dx*sign*falloff*1.25));
      }
    }else if(c.topology==='serpentine'){
      f.add(v(Math.sin(y*1.7+t)*1.2,.7,Math.cos(y*1.2-t*.6)*.8));
    }else if(c.topology==='bloom'){
      const phi=Math.atan2(z,x), r=Math.hypot(x,z)+.0001;
      const petal=Math.sin(7*phi+t);
      f.add(v(x/r*(.5+.7*petal)-z*.18,Math.cos(r*1.2-t)*.6+.2,z/r*(.5+.7*petal)+x*.18));
    }else{
      f.add(v(-z*.21+.13*Math.sin(y*.9),.34+.18*Math.cos(x*.7),x*.21));
    }

    // Physical memory: old deposits repel growing tips via a density gradient.
    const feedback=this.densityGradient(pos);
    f.addScaledVector(feedback,-c.feedback*12);
    // Field nodes are actual forces, persisted and independently editable.
    for(const node of this.nodes){
      const delta=node.pos.clone().sub(pos);
      const r2=delta.lengthSq()+.35;
      const amp=(node.type==='attract'?1:-1)*node.strength/(r2*Math.sqrt(r2));
      f.addScaledVector(delta,amp);
    }
    return f.multiplyScalar(c.force);
  }

  pickColor(agent) {
    const colors=PALETTES[this.config.palette];
    const ageHue=(.16*this.time+agent.identity*.6+agent.p.y*.04) % 1;
    const scaled=Math.abs(ageHue)*colors.length, left=Math.floor(scaled)%colors.length;
    return new THREE.Color(colors[left]).lerp(new THREE.Color(colors[(left+1)%colors.length]),scaled-Math.floor(scaled));
  }

  deposit(a,b,agent){
    const slot=this.cursor;
    const j=slot*6;
    this.segments[j]=a.x;this.segments[j+1]=a.y;this.segments[j+2]=a.z;
    this.segments[j+3]=b.x;this.segments[j+4]=b.y;this.segments[j+5]=b.z;
    this.mark(b);
    const color=this.pickColor(agent);
    this.onDeposit(slot,a,b,color,this.config.thickness*(.65+agent.identity*.75));
    this.cursor=(this.cursor+1)%this.maxSegments;
    this.segmentCount=Math.min(this.segmentCount+1,this.maxSegments);
    this.totalDeposits++;
  }

  step(dt) {
    dt=clamp(dt,0,.05);
    if(!dt)return;
    this.time+=dt;
    const c=this.config;
    // Grow the colony gradually rather than building every agent at t=0.
    if(this.agents.length<c.agents && this.random() < .18) this.addAgent(this.randomPointOnFibers());
    for(let i=0;i<this.agents.length;i++){
      const a=this.agents[i];
      a.age+=dt;
      const field=this.fieldAt(a.p);
      if(field.lengthSq()<.001) field.copy(a.dir);
      field.normalize();
      a.dir.lerp(field,.09).addScaledVector(this.randomVector(),.017).normalize();
      a.p.addScaledVector(a.dir,dt*c.speed*.95);
      a.traveled+=dt*c.speed*.95;
      if(a.traveled >= .105){
        this.deposit(a.prev,a.p,a);
        a.prev.copy(a.p);
        a.traveled=0;
        if(this.random() < c.branching*.016 && this.agents.length<c.agents){
          this.addAgent(a.p,a.dir.clone().addScaledVector(this.randomVector(),.7));
        }
      }
      if(a.p.length()>WORLD*.49 || a.age>a.life){
        const start=this.randomPointOnFibers();
        a.p.copy(start); a.prev.copy(start);
        a.dir.copy(this.randomVector());
        a.traveled=0;a.age=0;a.life=8+this.random()*22;
      }
    }
  }

  snapshotNodes() {
    return this.nodes.map(n=>({id:n.id,type:n.type,pos:[n.pos.x,n.pos.y,n.pos.z],strength:n.strength}));
  }
  restoreNodes(snapshot){
    this.nodes=snapshot.map(n=>({id:n.id,type:n.type,pos:v(...n.pos),strength:n.strength}));
  }
  recordNodeEdit(){
    this.nodeUndo.push(this.snapshotNodes());
    if(this.nodeUndo.length>25)this.nodeUndo.shift();
    this.nodeRedo=[];
  }
  addNode(type,pos){
    this.recordNodeEdit();
    const node={id:Math.floor(this.random()*1e9),type,pos:pos.clone(),strength:3.5};
    this.nodes.push(node);
    if(this.nodes.length>15)this.nodes.shift();
    return node;
  }
  nearestNode(pos,maxDistance=1.1){
    let nearest=null,dist=maxDistance;
    for(const node of this.nodes){
      const d=node.pos.distanceTo(pos);
      if(d<dist){nearest=node;dist=d;}
    }
    return nearest;
  }
  deleteNode(pos){
    const node=this.nearestNode(pos,1.4);
    if(!node)return false;
    this.recordNodeEdit();
    this.nodes=this.nodes.filter(n=>n!==node);
    return true;
  }
  clearNodes(){
    if(!this.nodes.length)return;
    this.recordNodeEdit();
    this.nodes=[];
  }
  undoNodes(){
    if(!this.nodeUndo.length)return false;
    this.nodeRedo.push(this.snapshotNodes());
    this.restoreNodes(this.nodeUndo.pop());
    return true;
  }
  redoNodes(){
    if(!this.nodeRedo.length)return false;
    this.nodeUndo.push(this.snapshotNodes());
    this.restoreNodes(this.nodeRedo.pop());
    return true;
  }

  localJacobian(at){
    const h=.035, columns=[];
    for(const axis of ['x','y','z']){
      const plus=at.clone(), minus=at.clone();
      plus[axis]+=h; minus[axis]-=h;
      const d=this.fieldAt(plus).sub(this.fieldAt(minus)).divideScalar(2*h);
      columns.push([d.x,d.y,d.z]);
    }
    return [
      [columns[0][0],columns[1][0],columns[2][0]],
      [columns[0][1],columns[1][1],columns[2][1]],
      [columns[0][2],columns[1][2],columns[2][2]]
    ].map(row=>row.map(n=>+n.toFixed(5)));
  }
}
