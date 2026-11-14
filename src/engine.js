import * as THREE from 'three';
import { NutrientField } from './ecology.js';
import { CrystalColony } from './colony.js';
import { MorphogenesisVolume } from './morphogenesis.js';
import { resolveCrystalMovement, traceChemicalMembrane } from './structural.js';
import { formField, FORM_NAMES, FINISHES } from './art-direction.js';
import { branchVector, growthRhythm, BRANCH_MODES, RHYTHM_MODES } from './branching.js';
import { lineageSteering } from './filigree.js';
import { FIBER_PROFILES } from './mineral-optics.js';
import { PALETTES, activeStops, isPaletteStops } from './palettes.js';
import { validStrokes, strokeFieldAt, appendStrokePoint, MAX_STROKES } from './field-strokes.js';
import { MAX_PRESSURES, PRESSURE_MODES, validPressures } from './crystal-pressure.js';
export { PALETTES } from './palettes.js';

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
      topology: 'cathedral', force: 1, frequency: 1.2, evolution: .4, palette: 'acid',
      nutrientDrive: 1.2, diffusion: .6, supply: .5,
      contactMode: 'slide', contactBranching: .32, wallPermeability: .08, membraneTrace: .55,
      form:'coral',formStrength:.85,formTwist:.6,finish:'opal',glow:.6,
      branchMode:'golden',branchAngle:56,branchTaper:.84,lineageColor:.65,
      rhythmMode:'beats',rhythmDepth:.62,rhythmRate:.55,
      branchOrdering:'family',branchPersistence:.78,filigreeContrast:.70,
      fiberProfile:'needle',mineralStrength:.65,mineralHalfLife:18,
      paletteStops:null,strokeRadius:.75,strokeStrength:1.15,
      pressureRadius:.85,pressureStrength:1.2
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
    this.contactEvents = 0;
    this.branchEvents = 0;
    this.segmentCount = 0;
    this.cursor = 0;
    this.agents = [];
    this.nodes = [];
    this.strokes=[];
    this.pressures=[];
    this.nodeUndo = [];
    this.nodeRedo = [];
    this.density = new Uint16Array(GRID * GRID * GRID);
    this.segments = new Float32Array(this.maxSegments * 6);
    this.segmentColors = new Uint8Array(this.maxSegments * 3);
    this.segmentRadii = new Float32Array(this.maxSegments);
    this.segmentGenerations = new Uint8Array(this.maxSegments);
    this.segmentBornAt = new Float32Array(this.maxSegments);
    this.nutrients = new NutrientField(GRID,WORLD);
    this.nutrientElapsed = 0;
    if(!this.colony)this.colony=new CrystalColony(GRID,WORLD);
    else this.colony.clear();
    this.colonyElapsed=0;
    if(!this.morphogenesis)this.morphogenesis=new MorphogenesisVolume();
    else this.morphogenesis.reset();
    this.morphElapsed=0;
    this.colony.onBirth=(p)=>{
      if(this.morphogenesis.settings.enabled){
        this.morphogenesis.consumeAt(p,.08*this.morphogenesis.settings.crystalSink);
      }
    };
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

  addAgent(position, direction = this.randomVector(), generation=0, heritage=null) {
    if (this.agents.length >= this.config.agents) return;
    const p=position.clone();
    const life=8+this.random()*22,identity=this.random();
    this.agents.push({
      p, prev:p.clone(),dir:direction.clone().normalize(),
      traveled:0,age:0,life,identity,
      generation:Math.min(12,Math.max(0,Math.floor(generation))),
      familyPhase:heritage?.familyPhase ?? identity*Math.PI*2,
      branchSerial:0
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
    candidate.nutrientDrive = clamp(safe(+candidate.nutrientDrive),0,2);
    candidate.diffusion = clamp(safe(+candidate.diffusion),0,1);
    candidate.supply = clamp(safe(+candidate.supply),0,1);
    candidate.contactBranching = clamp(safe(+candidate.contactBranching),0,1);
    candidate.wallPermeability = clamp(safe(+candidate.wallPermeability),0,1);
    candidate.membraneTrace = clamp(safe(+candidate.membraneTrace),0,1);
    candidate.formStrength=clamp(safe(+candidate.formStrength),0,2);
    candidate.formTwist=clamp(safe(+candidate.formTwist),0,2);
    candidate.glow=clamp(safe(+candidate.glow),0,1);
    candidate.branchAngle=clamp(safe(+candidate.branchAngle),0,85);
    candidate.branchTaper=clamp(safe(+candidate.branchTaper),.45,1);
    candidate.lineageColor=clamp(safe(+candidate.lineageColor),0,1);
    candidate.rhythmDepth=clamp(safe(+candidate.rhythmDepth),0,1);
    candidate.rhythmRate=clamp(safe(+candidate.rhythmRate),.05,2);
    candidate.branchPersistence=clamp(safe(+candidate.branchPersistence),0,1);
    candidate.filigreeContrast=clamp(safe(+candidate.filigreeContrast),0,1);
    candidate.mineralStrength=clamp(safe(+candidate.mineralStrength),0,1);
    candidate.mineralHalfLife=clamp(safe(+candidate.mineralHalfLife),3,120);
    candidate.strokeRadius=clamp(safe(+candidate.strokeRadius),.2,1.8);
    candidate.strokeStrength=clamp(safe(+candidate.strokeStrength),.1,3);
    candidate.pressureRadius=clamp(safe(+candidate.pressureRadius),.25,2.1);
    candidate.pressureStrength=clamp(safe(+candidate.pressureStrength),.1,2.4);
    if(!isPaletteStops(candidate.paletteStops))throw new Error('Invalid custom palette stops');
    candidate.paletteStops=candidate.paletteStops?.map(h=>h.toLowerCase())??null;
    if(!FIBER_PROFILES[candidate.fiberProfile])candidate.fiberProfile='legacy';
    if(!['global','family'].includes(candidate.branchOrdering))candidate.branchOrdering='global';
    if(!BRANCH_MODES[candidate.branchMode])candidate.branchMode='random';
    if(!RHYTHM_MODES[candidate.rhythmMode])candidate.rhythmMode='steady';
    if(!FINISHES[candidate.finish])candidate.finish='opal';
    if(!FORM_NAMES[candidate.form])candidate.form='wild';
    if(!['off','slide','deflect'].includes(candidate.contactMode)) candidate.contactMode='slide';
    if(!['cathedral','vortex','braid','serpentine','bloom'].includes(candidate.topology)) candidate.topology='cathedral';
    if(!PALETTES[candidate.palette]) candidate.palette='acid';
    this.config=candidate;
    if(this.agents.length>candidate.agents) this.agents.length=candidate.agents;
  }

  currentPalette(){return activeStops(this.config);}
  getDNA() {
    return {format:'ex-nihilo/dna-v1',experiment:'nerve-cathedral',seed:this.seed,
      config:{...this.config},colony:{...this.colony.settings},
      morphogenesis:{...this.morphogenesis.settings},
      strokes:this.snapshotStrokes(),pressures:this.snapshotPressures()};
  }

  loadDNA(dna) {
    if(dna?.format !== 'ex-nihilo/dna-v1' || dna?.experiment !== 'nerve-cathedral' || typeof dna.config !== 'object') {
      throw new Error('This is not Nerve Cathedral DNA.');
    }
    if(dna.strokes!==undefined&&!validStrokes(dna.strokes))throw new Error('Invalid saved growth paths');
    if(dna.pressures!==undefined&&!validPressures(dna.pressures))throw new Error('Invalid saved crystal pressure marks');
    // Historical DNA from before visual composition should remain unconstrained.
    const historicalForm=dna.config.form===undefined
      ?{...dna.config,form:'wild',formStrength:0,finish:'opal',glow:.6}
      :dna.config;
    const historicalBranches=historicalForm.branchMode===undefined
      ?{...historicalForm,branchMode:'random',branchTaper:1,branchAngle:56,
        rhythmMode:'steady',rhythmDepth:0,rhythmRate:.55,lineageColor:0}
      :historicalForm;
    const historicalAnatomy=historicalBranches.branchOrdering===undefined
      ?{...historicalBranches,branchOrdering:'global',branchPersistence:0,filigreeContrast:0}
      :historicalBranches;
    const historicalOptics=historicalAnatomy.fiberProfile===undefined
      ?{...historicalAnatomy,fiberProfile:'legacy',mineralStrength:0,mineralHalfLife:18}
      :historicalAnatomy;
    this.setConfig(historicalOptics);
    if(dna.strokes)this.restoreStrokes(dna.strokes);
    if(dna.pressures)this.restorePressures(dna.pressures);
    if(dna.colony)this.colony.setSettings(dna.colony);
    if(dna.morphogenesis)this.morphogenesis.setSettings(dna.morphogenesis);
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
    // A genuinely evolving, consumed scalar field steers growth up food gradients.
    const foodGradient=this.nutrients.gradient(pos);
    f.add(v(foodGradient.x,foodGradient.y,foodGradient.z).multiplyScalar(c.nutrientDrive*13));
    if(this.morphogenesis.settings.enabled){
      // Genuine chemical chemotaxis: active B gradients redirect the filaments.
      const g=this.morphogenesis.gradientB(pos);
      f.add(v(g.x,g.y,g.z).multiplyScalar(this.morphogenesis.settings.chemotaxis*5));
    }
    // Artistic silhouette is an advective force, never a prebuilt path/mesh.
    const grammar=formField(pos,this.time,c);
    f.add(v(grammar.x,grammar.y,grammar.z));
    // Finger-drawn world-space rails and deformations guide actual tip motion.
    const strokeForce=strokeFieldAt(pos,this.strokes);
    f.add(v(strokeForce.x,strokeForce.y,strokeForce.z));
    // Hand-authored field sources are persistent causes of future growth.
    for(const node of this.nodes){
      const delta=node.pos.clone().sub(pos);
      if(node.type==='vortex'){
        // A bounded 3D swirl around the world Y axis, spatially localized
        // by an artist-authored Gaussian kernel. The pinch edits support
        // radius, and the twist edits signed angular strength (chirality).
        const radius=clamp(node.radius??1.1,.25,2.8);
        const dist2=delta.lengthSq();
        const envelope=Math.exp(-dist2/(2*radius*radius));
        const spin=clamp(node.spin??1.2,-2.5,2.5);
        f.add(v(delta.z,0,-delta.x).multiplyScalar(spin*envelope*2.5));
      }else{
        // Preserve the historical inverse-distance attract/repel physics.
        const r2=delta.lengthSq()+.35;
        const amp=(node.type==='attract'?1:-1)*node.strength/(r2*Math.sqrt(r2));
        f.addScaledVector(delta,amp);
      }
    }
    return f.multiplyScalar(c.force);
  }

  pickColor(agent) {
    const colors=this.currentPalette();
    const oldHue=(.16*this.time+agent.identity*.6+agent.p.y*.04) % 1;
    const familyPart=this.config.branchOrdering==='family'
      ?(agent.familyPhase??agent.identity*Math.PI*2)/(Math.PI*2)*.18
      :agent.identity*.09;
    const ancestralHue=((agent.generation||0)*.1375+familyPart
      +this.time*.019) % 1;
    // Lineage coloring makes daughters recognizable as related structures.
    // Older checkpoints set lineageColor=0 and retain original colors.
    const ageHue=(1-this.config.lineageColor)*oldHue
      +this.config.lineageColor*ancestralHue;
    const scaled=Math.abs(ageHue)*colors.length, left=Math.floor(scaled)%colors.length;
    return new THREE.Color(colors[left]).lerp(new THREE.Color(colors[(left+1)%colors.length]),scaled-Math.floor(scaled));
  }

  deposit(a,b,agent){
    const slot=this.cursor;
    const j=slot*6;
    this.segments[j]=a.x;this.segments[j+1]=a.y;this.segments[j+2]=a.z;
    this.segments[j+3]=b.x;this.segments[j+4]=b.y;this.segments[j+5]=b.z;
    this.mark(b);
    this.nutrients.consume(b,.048);
    if(this.morphogenesis.settings.enabled && this.totalDeposits%5===0){
      this.morphogenesis.catalyze(b,.033*this.morphogenesis.settings.fiberCatalysis);
    }
    const color=this.pickColor(agent);
    const hierarchy=Math.max(.20,Math.pow(this.config.branchTaper,agent.generation||0));
    const radius=this.config.thickness*(.65+agent.identity*.75)*hierarchy;
    this.segmentColors[slot*3]=Math.round(clamp(color.r,0,1)*255);
    this.segmentColors[slot*3+1]=Math.round(clamp(color.g,0,1)*255);
    this.segmentColors[slot*3+2]=Math.round(clamp(color.b,0,1)*255);
    this.segmentRadii[slot]=radius;
    const generation=Math.min(12,agent.generation||0);
    this.segmentGenerations[slot]=generation;
    this.segmentBornAt[slot]=this.time;
    this.onDeposit(slot,a,b,color,radius,generation,this.segmentBornAt[slot]);
    this.cursor=(this.cursor+1)%this.maxSegments;
    this.segmentCount=Math.min(this.segmentCount+1,this.maxSegments);
    this.totalDeposits++;
  }

  spawnBranch(agent){
    if(this.agents.length>=this.config.agents)return false;
    const c=this.config;
    let direction;
    if(c.branchMode==='random'){
      // Historical algorithm retained for old checkpoint reproduction.
      direction=agent.dir.clone().addScaledVector(this.randomVector(),.7);
    }else{
      // New families use each parent's local branch count, rather than an
      // unrelated global birth counter. Old saved worlds retain global order.
      const serial=c.branchOrdering==='family'?(agent.branchSerial||0):this.branchEvents;
      const phase=c.branchOrdering==='family'
        ?(agent.familyPhase??agent.identity*Math.PI*2)
        :agent.identity*Math.PI*2;
      const out=branchVector(agent.dir,serial,c.branchAngle,c.branchMode,phase);
      direction=v(out.x,out.y,out.z);
    }
    this.addAgent(agent.p,direction,Math.min(12,(agent.generation||0)+1),
      c.branchOrdering==='family'
        ?{familyPhase:agent.familyPhase??agent.identity*Math.PI*2}
        :null);
    if(c.branchOrdering==='family')agent.branchSerial=(agent.branchSerial||0)+1;
    this.branchEvents++;
    return true;
  }

  step(dt) {
    dt=clamp(dt,0,.05);
    if(!dt)return;
    this.time+=dt;
    const c=this.config;
    this.nutrientElapsed+=dt;
    while(this.nutrientElapsed>=.1){
      this.nutrients.tick(c.diffusion,c.supply,
        this.colony.population?this.colony.cells:null,c.wallPermeability);
      this.nutrientElapsed-=.1;
    }
    if(this.morphogenesis.settings.enabled){
      this.morphElapsed+=dt;
      while(this.morphElapsed>=.2){
        this.morphogenesis.tick(this.nutrients,
          this.colony.population?this.colony:null,c.wallPermeability);
        this.morphElapsed-=.2;
      }
    }
    if(this.colony.settings.enabled){
      this.colonyElapsed+=dt;
      while(this.colonyElapsed>=.32){
        this.colony.update(this.nutrients,this.currentPalette(),()=>this.random(),
          this.morphogenesis,this.pressures);
        this.colonyElapsed-=.32;
      }
    }
    // Grow the colony gradually rather than building every agent at t=0.
    if(this.agents.length<c.agents && this.random() < .18) this.addAgent(this.randomPointOnFibers());
    for(let i=0;i<this.agents.length;i++){
      const a=this.agents[i];
      a.age+=dt;
      const field=this.fieldAt(a.p);
      if(field.lengthSq()<.001) field.copy(a.dir);
      field.normalize();
      // For a new daughter, preserve her actual divergence long enough to
      // grow a visible branch before she re-enters the environmental flow.
      const steering=lineageSteering(a.age,a.generation||0,c.branchPersistence);
      a.dir.lerp(field,steering).addScaledVector(this.randomVector(),.017).normalize();
      const food=this.nutrients.sample(a.p);
      const rhythm=growthRhythm(this.time,a.identity,c);
      const growthRate=dt*c.speed*.95*(.35+.85*food)*rhythm;
      const oldPosition=a.p.clone();
      const direct=a.dir.clone().multiplyScalar(growthRate);
      const guided=traceChemicalMembrane(this.morphogenesis,a.p,direct,c.membraneTrace);
      if(guided.tracing){
        a.dir.set(guided.motion.x,guided.motion.y,guided.motion.z).normalize();
      }
      const proposed=a.p.clone().add(v(guided.motion.x,guided.motion.y,guided.motion.z));
      const contact=resolveCrystalMovement(this.colony,a.p,proposed,c.contactMode);
      a.p.set(contact.position.x,contact.position.y,contact.position.z);
      a.traveled+=a.p.distanceTo(oldPosition);
      if(contact.contact){
        this.contactEvents++;
        // Surface contact changes later trajectories and can nucleate new tips.
        const normal=v(contact.normal.x,contact.normal.y,contact.normal.z);
        const into=a.dir.dot(normal);
        if(into<0){
          a.dir.addScaledVector(normal,-into*(c.contactMode==='deflect'?2:1));
          if(a.dir.lengthSq()<1e-8){
            a.dir.set(normal.z,normal.x,normal.y);
          }
          a.dir.normalize();
        }
        if(this.agents.length<c.agents && this.random()<.012*c.contactBranching*rhythm){
          this.spawnBranch(a);
        }
      }
      if(a.traveled >= .105){
        this.deposit(a.prev,a.p,a);
        a.prev.copy(a.p);
        a.traveled=0;
        if(this.random() < c.branching*.016*(.35+food)*rhythm && this.agents.length<c.agents){
          this.spawnBranch(a);
        }
      }
      if(a.p.length()>WORLD*.49 || a.age>a.life){
        const start=this.randomPointOnFibers();
        a.p.copy(start); a.prev.copy(start);
        a.dir.copy(this.randomVector());
        // Regeneration is a new root, not a continuation of the old lineage.
        a.traveled=0;a.age=0;a.generation=0;a.life=8+this.random()*22;
        a.branchSerial=0;
        a.familyPhase=a.identity*Math.PI*2;
      }
    }
  }

  snapshotStrokes(){return this.strokes.map(s=>({id:s.id,kind:s.kind,radius:s.radius,
    strength:s.strength,points:s.points.map(p=>[...p])}));}
  restoreStrokes(strokes){this.strokes=strokes.map(s=>({id:s.id,kind:s.kind,radius:s.radius,
    strength:s.strength,points:s.points.map(p=>[...p])}));}
  snapshotPressures(){return this.pressures.map(p=>({
    id:p.id,mode:p.mode,center:[...p.center],axis:[...p.axis],
    radius:p.radius,strength:p.strength
  }));}
  restorePressures(snapshot){this.pressures=snapshot.map(p=>({
    id:p.id,mode:p.mode,center:[...p.center],axis:[...p.axis],
    radius:p.radius,strength:p.strength
  }));}
  snapshotField(){return {
    nodes:this.snapshotNodes(),strokes:this.snapshotStrokes(),
    pressures:this.snapshotPressures()
  };}
  restoreField(doc){
    if(Array.isArray(doc)){this.restoreNodes(doc);return;}
    this.restoreNodes(doc.nodes);
    this.restoreStrokes(doc.strokes);
    this.restorePressures(doc.pressures??[]);
  }
  snapshotNodes() {
    return this.nodes.map(n=>({
      id:n.id,type:n.type,pos:[n.pos.x,n.pos.y,n.pos.z],
      strength:n.strength,radius:n.radius??1.1,spin:n.spin??1.2
    }));
  }
  restoreNodes(snapshot){
    this.nodes=snapshot.map(n=>({
      id:n.id,type:n.type,pos:v(...n.pos),
      strength:n.strength,radius:n.radius??1.1,spin:n.spin??1.2
    }));
  }
  recordNodeEdit(){
    this.nodeUndo.push(this.snapshotField());
    if(this.nodeUndo.length>25)this.nodeUndo.shift();
    this.nodeRedo=[];
  }
  addNode(type,pos,{record=true}={}){
    if(!['attract','repel','vortex'].includes(type))throw new Error('Invalid field source type.');
    if(record)this.recordNodeEdit();
    const node={
      id:Math.floor(this.random()*1e9),type,pos:pos.clone(),
      strength:3.5,radius:1.1,spin:1.2
    };
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
    this.nodeRedo.push(this.snapshotField());
    this.restoreField(this.nodeUndo.pop());
    return true;
  }
  redoNodes(){
    if(!this.nodeRedo.length)return false;
    this.nodeUndo.push(this.snapshotField());
    this.restoreField(this.nodeRedo.pop());
    return true;
  }

  addStroke(kind,pos,{record=true}={}){
    if(!['guide','push'].includes(kind))throw Error('Invalid stroke kind');
    if(this.strokes.length>=MAX_STROKES)throw Error('Maximum of '+MAX_STROKES+' growth paths reached; erase one first.');
    if(record)this.recordNodeEdit();
    const stroke={id:Math.floor(this.random()*1e9),kind,
      radius:this.config.strokeRadius,strength:this.config.strokeStrength,
      points:[pos.toArray()]};
    this.strokes.push(stroke);
    return stroke;
  }
  appendStroke(stroke,pos){return appendStrokePoint(stroke,pos);}
  nearestStroke(pos,maxDistance=.6){
    let best=null,dist=maxDistance;
    for(const item of this.strokes)for(const pt of item.points){
      const d=Math.hypot(pos.x-pt[0],pos.y-pt[1],pos.z-pt[2]);
      if(d<dist){dist=d;best=item;}
    }
    return best;
  }
  deleteStroke(id){
    const target=this.strokes.find(s=>s.id===id);
    if(!target)return false;
    this.recordNodeEdit();
    this.strokes=this.strokes.filter(s=>s.id!==id);
    return true;
  }
  addPressure(mode,pos,{record=true}={}){
    if(!PRESSURE_MODES[mode])throw Error('Invalid pressure mode.');
    if(this.pressures.length>=MAX_PRESSURES)
      throw Error('Maximum of '+MAX_PRESSURES+' crystal pressure marks reached.');
    if(record)this.recordNodeEdit();
    const stamp={
      id:Math.floor(this.random()*1e9),mode,center:pos.toArray(),
      axis:[1,0,0],radius:this.config.pressureRadius,
      strength:this.config.pressureStrength
    };
    this.pressures.push(stamp);
    return stamp;
  }
  nearestPressure(pos,distance=.58){
    let nearest=null,best=distance;
    for(const p of this.pressures){
      const d=Math.hypot(pos.x-p.center[0],pos.y-p.center[1],pos.z-p.center[2]);
      if(d<best){best=d;nearest=p;}
    }
    return nearest;
  }
  deletePressure(id){
    const found=this.pressures.find(p=>p.id===id);
    if(!found)return false;
    this.recordNodeEdit();
    this.pressures=this.pressures.filter(p=>p.id!==id);
    return true;
  }
  feedAt(pos){
    this.nutrients.inject(pos);
  }
  seedCrystal(pos){
    return this.colony.seedAt(pos,this.nutrients,this.currentPalette(),()=>this.random());
  }

  seedChemical(pos,radius=.53){
    return this.morphogenesis.seedAt(pos,radius);
  }
  clearChemical(){
    this.morphogenesis.reset();
    this.morphElapsed=0;
  }

  getCheckpoint(){
    const n=this.segmentCount;
    const agentRecord=a=>({
      p:a.p.toArray(),prev:a.prev.toArray(),dir:a.dir.toArray(),
      traveled:a.traveled,age:a.age,life:a.life,identity:a.identity,
      generation:a.generation||0,
      branchSerial:a.branchSerial||0,
      familyPhase:a.familyPhase??a.identity*Math.PI*2
    });
    return {
      format:'ex-nihilo/checkpoint-v3',
      dna:this.getDNA(),time:this.time,rngState:this.rngState>>>0,
      nutrientElapsed:this.nutrientElapsed,colonyElapsed:this.colonyElapsed,morphElapsed:this.morphElapsed,totalDeposits:this.totalDeposits,contactEvents:this.contactEvents,branchEvents:this.branchEvents,
      segmentCount:n,cursor:this.cursor,
      segments:Array.from(this.segments.subarray(0,n*6)),
      colors:Array.from(this.segmentColors.subarray(0,n*3)),
      radii:Array.from(this.segmentRadii.subarray(0,n)),
      segmentGenerations:Array.from(this.segmentGenerations.subarray(0,n)),
      segmentBornAt:Array.from(this.segmentBornAt.subarray(0,n)),
      density:Array.from(this.density),
      nutrients:Array.from(this.nutrients.values),
      colony:this.colony.snapshot(),
      morphogenesis:this.morphogenesis.snapshot(),
      nodes:this.snapshotNodes(),
      strokes:this.snapshotStrokes(),
      pressures:this.snapshotPressures(),
      agents:this.agents.map(agentRecord)
    };
  }

  restoreCheckpoint(data){
    const finite=x=>typeof x==='number'&&Number.isFinite(x);
    const validArray=(a,n,check=finite)=>Array.isArray(a)&&a.length===n&&a.every(check);
    const point=p=>validArray(p,3,n=>finite(n)&&Math.abs(n)<=100);
    const agent=a=>a&&point(a.p)&&point(a.prev)&&point(a.dir)&&
      ['traveled','age','life','identity'].every(k=>finite(a[k]))&&
      (a.generation===undefined||(Number.isInteger(a.generation)&&a.generation>=0&&a.generation<=12))&&
      (a.branchSerial===undefined||(Number.isInteger(a.branchSerial)&&a.branchSerial>=0&&a.branchSerial<=100000000))&&
      (a.familyPhase===undefined||(finite(a.familyPhase)&&a.familyPhase>=0&&a.familyPhase<=Math.PI*2));
    const node=n=>n&&Number.isInteger(n.id)&&
      ['attract','repel','vortex'].includes(n.type)&&point(n.pos)&&
      finite(n.strength)&&n.strength>=0&&n.strength<=12&&
      (n.radius===undefined||(finite(n.radius)&&n.radius>=.25&&n.radius<=2.8))&&
      (n.spin===undefined||(finite(n.spin)&&n.spin>=-2.5&&n.spin<=2.5));
    const isV2=data?.format==='ex-nihilo/checkpoint-v2';
    const isV3=data?.format==='ex-nihilo/checkpoint-v3';
    const hasColony=isV2||isV3;
    if((!hasColony&&data?.format!=='ex-nihilo/checkpoint-v1')||
      data?.dna?.format!=='ex-nihilo/dna-v1'||data?.dna?.experiment!=='nerve-cathedral'||
      !data.dna.config||!Number.isInteger(data.dna.seed)||
      !Number.isInteger(data.segmentCount)||data.segmentCount<0||data.segmentCount>this.maxSegments||
      !Number.isInteger(data.cursor)||data.cursor<0||data.cursor>=this.maxSegments||
      !finite(data.time)||data.time<0||!Number.isInteger(data.rngState)||
      !finite(data.nutrientElapsed)||data.nutrientElapsed<0||
      (hasColony&&(!finite(data.colonyElapsed)||data.colonyElapsed<0||data.colonyElapsed>.32))||
      (isV3&&(!finite(data.morphElapsed)||data.morphElapsed<0||data.morphElapsed>.2))||
      !Number.isInteger(data.totalDeposits)||data.totalDeposits<0||
      (data.contactEvents!==undefined&&(!Number.isInteger(data.contactEvents)||data.contactEvents<0))||
      (data.branchEvents!==undefined&&(!Number.isInteger(data.branchEvents)||data.branchEvents<0))||
      !validArray(data.segments,data.segmentCount*6,n=>finite(n)&&Math.abs(n)<=100)||
      !validArray(data.colors,data.segmentCount*3,n=>Number.isInteger(n)&&n>=0&&n<=255)||
      !validArray(data.radii,data.segmentCount,n=>finite(n)&&n>=0&&n<=1)||
      (data.segmentGenerations!==undefined&&!validArray(data.segmentGenerations,data.segmentCount,
        n=>Number.isInteger(n)&&n>=0&&n<=12))||
      (data.segmentBornAt!==undefined&&!validArray(data.segmentBornAt,data.segmentCount,
        n=>finite(n)&&n>=0&&n<=data.time+.001))||
      !validArray(data.density,GRID**3,n=>Number.isInteger(n)&&n>=0&&n<=MAX_DENSITY)||
      !validArray(data.nutrients,GRID**3,n=>finite(n)&&n>=0&&n<=1)||
      !Array.isArray(data.nodes)||data.nodes.length>15||!data.nodes.every(node)||
      (data.strokes!==undefined&&!validStrokes(data.strokes))||
      (data.dna.strokes!==undefined&&!validStrokes(data.dna.strokes))||
      (data.pressures!==undefined&&!validPressures(data.pressures))||
      (data.dna.pressures!==undefined&&!validPressures(data.dna.pressures))||
      (data.dna.config.paletteStops!==undefined&&!isPaletteStops(data.dna.config.paletteStops))||
      !Array.isArray(data.agents)||data.agents.length>360||!data.agents.every(agent)){
      throw new Error('Invalid, damaged, or unsupported Nerve Cathedral checkpoint.');
    }
    if(hasColony)this.colony.validateSnapshot(data.colony);
    if(isV3)this.morphogenesis.validateSnapshot(data.morphogenesis);
    // All checks happen before mutating the existing live artwork.
    // Older checkpoints predate sculptural vector laws. Use their original
    // unconstrained behavior instead of changing the historical physics.
    const legacyForm=data.dna.config.form===undefined
      ?{...data.dna.config,form:'wild',formStrength:0,glow:.6,finish:'opal'}:data.dna.config;
    const legacyGrowth=legacyForm.branchMode===undefined
      ?{...legacyForm,branchMode:'random',branchTaper:1,branchAngle:56,
        rhythmMode:'steady',rhythmDepth:0,rhythmRate:.55,lineageColor:0}
      :legacyForm;
    const legacyAnatomy=legacyGrowth.branchOrdering===undefined
      ?{...legacyGrowth,branchOrdering:'global',branchPersistence:0,filigreeContrast:0}
      :legacyGrowth;
    const legacyOptics=legacyAnatomy.fiberProfile===undefined
      ?{...legacyAnatomy,fiberProfile:'legacy',mineralStrength:0,mineralHalfLife:18}
      :legacyAnatomy;
    this.setConfig(legacyOptics);
    this.reset(data.dna.seed);
    this.time=data.time;
    this.rngState=data.rngState>>>0;
    this.nutrientElapsed=data.nutrientElapsed;
    this.colonyElapsed=hasColony?data.colonyElapsed:0;
    this.morphElapsed=isV3?data.morphElapsed:0;
    this.totalDeposits=data.totalDeposits;
    this.contactEvents=data.contactEvents??0;
    this.branchEvents=data.branchEvents??0;
    this.segmentCount=data.segmentCount;
    this.cursor=data.cursor;
    this.segments.set(data.segments);
    this.segmentColors.set(data.colors);
    this.segmentRadii.set(data.radii);
    if(data.segmentGenerations)this.segmentGenerations.set(data.segmentGenerations);
    if(data.segmentBornAt)this.segmentBornAt.set(data.segmentBornAt);
    else this.segmentBornAt.fill(data.time,0,data.segmentCount);
    this.density.set(data.density);
    this.nutrients.setValues(data.nutrients);
    if(hasColony)this.colony.restore(data.colony);
    else this.colony.setSettings({enabled:false});
    if(isV3)this.morphogenesis.restore(data.morphogenesis);
    else this.morphogenesis.setSettings({enabled:false});
    this.restoreNodes(data.nodes);
    this.restoreStrokes(data.strokes??[]);
    this.restorePressures(data.pressures??[]);
    this.agents=data.agents.map(a=>({
      p:v(...a.p),prev:v(...a.prev),dir:v(...a.dir),
      traveled:a.traveled,age:a.age,life:a.life,identity:a.identity,
      generation:a.generation??0,
      branchSerial:a.branchSerial??0,
      familyPhase:a.familyPhase??a.identity*Math.PI*2
    }));
    // Restore the *actual historical* colors and widths, not today's palette.
    const a=v(),b=v(),color=new THREE.Color();
    for(let i=0;i<this.segmentCount;i++){
      const k=i*6,j=i*3;
      a.set(this.segments[k],this.segments[k+1],this.segments[k+2]);
      b.set(this.segments[k+3],this.segments[k+4],this.segments[k+5]);
      color.setRGB(this.segmentColors[j]/255,this.segmentColors[j+1]/255,this.segmentColors[j+2]/255);
      this.onDeposit(i,a,b,color,this.segmentRadii[i],this.segmentGenerations[i],this.segmentBornAt[i]);
    }
    this.nodeUndo=[];
    this.nodeRedo=[];
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
