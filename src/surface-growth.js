// EX NIHILO — SURFACE DOMAIN
// Independent 2D synchronous material growth, not a projected 3D organism,
// texture overlay, static noise, or one-time procedural illustration.
// Every painted pixel starts as a real birth in a seeded, competing CA.
// NO DOM / THREE imports: testable offline and safe to checkpoint.
import {buildCompositionField,compositionSample,symmetricSeedPoints,COMPOSITION_LAWS} from './surface-composition.js';
export const SURFACE_SIZE=192;
export const SURFACE_MORPHOLOGIES=Object.freeze({
  spherulite:'RADIAL SPHERULITES',dendrite:'DENDRITIC VEINS',
  strata:'GEOLOGICAL STRATA'
});
export const SURFACE_NUCLEATION=Object.freeze({
  scattered:'SCATTERED STARTING CRYSTALS',radial:'RADIAL NUCLEATION',
  lattice:'HEXAGONALLY SPACED NUCLEI',ribbons:'BANDED SEED LINES'
});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const MAX_SEEDS=96;
const offsets=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
const mod=(a,n)=>(a%n+n)%n;
const num=x=>typeof x==='number'&&Number.isFinite(x);
const validArray=(a,n,max)=>Array.isArray(a)&&a.length===n&&a.every(x=>Number.isInteger(x)&&x>=0&&x<=max);
const mix=(a,b,t)=>a+(b-a)*t;
const toRGB=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const hash32=x=>{
  let a=x>>>0;
  a=Math.imul(a^(a>>>16),0x7feb352d);
  a=Math.imul(a^(a>>>15),0x846ca68b);
  return (a^(a>>>16))>>>0;
};

export class SurfaceGrowth {
  constructor(seed=1,size=SURFACE_SIZE){
    if(!Number.isInteger(size)||size<16||size>192)throw Error('Invalid surface resolution');
    this.size=size;
    this.capacity=size*size;
    this.reset(seed);
  }
  reset(seed=this.seed){
    this.seed=(Number(seed)>>>0)||1;
    this.rngState=this.seed;
    this.owner=new Uint8Array(this.capacity);  // 0 empty, 1..96 family identity
    this.depth=new Uint16Array(this.capacity); // cumulative graph distance to nucleus
    this.age=new Uint8Array(this.capacity);
    this.birthColor=new Uint8Array(this.capacity*3);
    this.seeds=[]; this.frontier=new Set();
    this.generation=0;this.population=0;
    this.stallTicks=0;
    this.compositionKey=null;this.compositionField=null;
    this.changed=true;
  }
  random(){
    let x=this.rngState>>>0;
    x^=x<<13;x^=x>>>17;x^=x<<5;
    this.rngState=x>>>0;
    return this.rngState/4294967296;
  }
  neighbors(index,wrap,visit){
    const n=this.size,x=index%n,y=Math.floor(index/n);
    for(const [dx,dy] of offsets){
      let nx=x+dx,ny=y+dy;
      if(wrap){nx=mod(nx,n);ny=mod(ny,n);}
      else if(nx<0||nx>=n||ny<0||ny>=n)continue;
      visit(nx+ny*n,dx,dy);
    }
  }
  seedAt(u,v,palette){
    if(this.seeds.length>=MAX_SEEDS)return false;
    const n=this.size,x=clamp(Math.floor(u*n),0,n-1),
      y=clamp(Math.floor(v*n),0,n-1),i=x+y*n;
    if(this.owner[i])return false;
    const id=this.seeds.length+1;
    const phase=this.random();
    const angle=this.random()*Math.PI*2;
    this.seeds.push({id,x,y,phase,angle});
    this.owner[i]=id;this.depth[i]=0;this.age[i]=0;
    this.writeBirthColor(i,id,0,palette,'spherulite',0);
    this.frontier.add(i);
    this.stallTicks=0;
    this.population++;
    this.changed=true;
    return true;
  }
  // Seed orbits are REAL independent nuclei, not an image reflection.
  // Reject a partial group: a mirrored seed should never become half a pair.
  seedSymmetricAt(u,v,palette,options={},limit=MAX_SEEDS){
    const raw=symmetricSeedPoints(u,v,options.symmetry||'none');
    const unique=new Map();
    for(const [x,y] of raw){
      const ix=clamp(Math.floor(x*this.size),0,this.size-1);
      const iy=clamp(Math.floor(y*this.size),0,this.size-1);
      unique.set(ix+iy*this.size,[x,y]);
    }
    if(!unique.size||this.seeds.length+unique.size>Math.min(MAX_SEEDS,limit))return false;
    const threshold=Math.round(clamp(Number(options.voids??.55),0,1)*220);
    for(const [i,[x,y]] of unique){
      if(this.owner[i])return false;
      if(options.boundary&&options.boundary!=='open'&&
         compositionSample(x,y,options).gate<=threshold)return false;
    }
    for(const [x,y] of unique.values())this.seedAt(x,y,palette);
    return true;
  }
  compositionFor(options={}){
    const key=JSON.stringify([options.boundary||'open',
      options.regions||'single',options.voids??.55,!!options.wrap]);
    if(key!==this.compositionKey||!this.compositionField){
      this.compositionKey=key;
      this.compositionField=buildCompositionField(this.size,options);
    }
    return this.compositionField;
  }
  seedArrangement(count,arrangement,palette,options={}){
    if(this.population>0)return false;
    const nSeeds=clamp(Math.round(Number(count)||24),1,MAX_SEEDS);
    const layout=Object.hasOwn(SURFACE_NUCLEATION,arrangement)?arrangement:'scattered';
    const side=Math.ceil(Math.sqrt(nSeeds)),n=this.size;
    let placed=0;
    for(let j=0;j<nSeeds&&this.seeds.length<nSeeds;j++){
      let u,v;
      if(layout==='radial'){
        const a=j*2.399963229728653;
        const radius=.065+.42*Math.sqrt((j+.5)/nSeeds);
        u=.5+radius*Math.cos(a);v=.5+radius*Math.sin(a);
      }else if(layout==='lattice'){
        const col=j%side,row=Math.floor(j/side);
        u=(col+.5+.5*(row%2))/side;
        v=(row+.5)/(Math.ceil(nSeeds/side)+.15);
      }else if(layout==='ribbons'){
        u=(j+.5)/nSeeds;
        v=.50+.29*Math.sin(u*Math.PI*6)+.08*(this.random()-.5);
      }else{
        u=.025+.95*this.random();v=.025+.95*this.random();
      }
      // Occupied duplicate seeds retry with a stable nearby variation.
      for(let attempt=0;attempt<6;attempt++){
        const before=this.seeds.length;
        if(this.seedSymmetricAt(mod(u+attempt*.019,1),
          mod(v+attempt*.013,1),palette,options,nSeeds)){
          placed+=this.seeds.length-before;break;
        }
      }
    }
    return placed>0;
  }
  // Re-open active fronts if the user changes physics or boundary topology.
  // The existing deposits remain immutable.
  rebuildFrontier(wrap=false,options={}){
    const field=this.compositionFor({...options,wrap});
    const next=new Set();
    for(let i=0;i<this.capacity;i++){
      if(!this.owner[i])continue;
      let open=false;
      this.neighbors(i,wrap,ni=>{if(!this.owner[ni]&&field.gates[ni]>field.threshold)open=true;});
      if(open)next.add(i);
    }
    this.frontier=next;this.stallTicks=0;
  }
  writeBirthColor(i,family,depth,palette,morphology,contrast=0){
    const nucleus=this.seeds[family-1];
    const stops=palette.map(toRGB);
    const familyOffset=nucleus.phase;
    // Frozen chemical precipitation band based on actual topological
    // distance from the nearest parent, not absolute simulation time.
    const wavelength=morphology==='strata'?8:morphology==='dendrite'?13:10;
    const band=(depth%wavelength)/wavelength;
    const t=mod(familyOffset*.55 + band*.75 +
      ((hash32((i+1)^Math.imul(family,0x9e3779b1))&1023)/1023)*.055,1);
    const sample=t*stops.length;
    const a=Math.floor(sample)%stops.length,b=(a+1)%stops.length;
    const blend=sample-Math.floor(sample);
    const k=i*3;
    for(let channel=0;channel<3;channel++){
      const color=mix(stops[a][channel],stops[b][channel],blend);
      this.birthColor[k+channel]=Math.round(clamp(color,0,255));
    }
  }
  advance(palette,{morphology='spherulite',wrap=false,growth=.82,coverage=.96,
    boundary='open',voids=.55,regions='single'}={}){
    if(!this.frontier.size||this.population>=this.capacity*coverage)return false;
    const mode=Object.hasOwn(SURFACE_MORPHOLOGIES,morphology)?morphology:'spherulite';
    const field=this.compositionFor({boundary,voids,regions,wrap});
    const proposals=new Map();
    // Freeze the entire old cell lattice: later same-tick births must not
    // alter contender scores, contact count, or the probability of a peer.
    const prior=this.owner.slice();
    const n=this.size;
    const stillActive=new Set();
    for(const parent of this.frontier){
      if(!prior[parent])continue;
      let open=false;
      const owner=prior[parent],source=this.seeds[owner-1];
      this.neighbors(parent,wrap,(ni,dx,dy)=>{
        if(prior[ni]||field.gates[ni]<=field.threshold)return;
        open=true;
        const localMode=regions==='single'?mode:COMPOSITION_LAWS[field.laws[ni]];
        const existing=proposals.get(ni);
        const familyAngle=source.angle;
        const x=ni%n/n-.5,y=Math.floor(ni/n)/n-.5;
        const radial=Math.atan2(dy,dx);
        const alignment=.5+.5*Math.cos(radial-familyAngle);
        let affinity=1;
        if(localMode==='dendrite')affinity=.55+1.25*Math.pow(alignment,4);
        else if(localMode==='strata')affinity=.6+.5*Math.cos((x+y)*Math.PI*3+familyAngle);
        else affinity=1;
        // Competing active fronts choose a factual parent deterministically.
        const score=affinity + .12*((hash32(ni^Math.imul(owner,0x85ebca6b))&65535)/65535);
        if(!existing||score>existing.score)
          proposals.set(ni,{family:owner,depth:Math.min(65535,this.depth[parent]+1),score,mode:localMode});
      });
      if(open)stillActive.add(parent);
    }
    if(!proposals.size){this.frontier.clear();this.changed=true;return false;}
    const next=new Set(stillActive);
    let births=0;
    const limit=1600;
    // All candidates observe the PRIOR population; no newborn can become
    // a parent during this step. Thus material growth is synchronous.
    for(const [i,candidate] of proposals){
      if(this.population+births>=this.capacity*coverage||births>=limit)break;
      const localMode=candidate.mode;
      let neighbors=0,competitive=false;
      this.neighbors(i,wrap,ni=>{
        if(prior[ni]){
          neighbors++;
          if(prior[ni]!==candidate.family)competitive=true;
        }
      });
      const grain=(hash32((i+1)^Math.imul(this.generation+7,0x9e3779b1))&255)/255;
      let probability=clamp(growth,0,1.5)*.86;
      if(localMode==='dendrite'){
        probability*=neighbors>=4?.26:neighbors>=3?.48:.87;
        probability*=.45+candidate.score*.5;
      }else if(localMode==='strata'){
        probability*=.55+candidate.score*.35;
      }else{
        probability*=neighbors>=2?1.22:1.0;
      }
      if(localMode==='dendrite'){
        // A frozen mineral-growth substrate makes actual unoccupied channels
        // that survive after the fronts stop. Otherwise every morphology
        // eventually becomes the same filled rectangle with new colors.
        const x=i%n/n,y=Math.floor(i/n)/n;
        const resistance=Math.sin(x*26+2.1*Math.sin(y*15))*
          Math.cos(y*23-x*8.5);
        if(resistance<-.39||neighbors>=5)continue;
      }
      if(competitive)probability*=.96;
      // Field permeability is a physical resistance at the prospective cell.
      probability*=.65+.35*(field.gates[i]/255);
      probability*=.83+.30*grain;
      if(this.random()>=clamp(probability,0,.997))continue;
      this.owner[i]=candidate.family;
      this.depth[i]=candidate.depth;
      this.age[i]=0;
      this.writeBirthColor(i,candidate.family,candidate.depth,palette,localMode);
      next.add(i);births++;
    }
    // Parent sites cease being a frontier once all neighboring sites fill.
    // Rebuild the bounded local frontier *without* altering live material.
    const fresh=new Set();
    for(const i of next){
      let hasVacancy=false;
      this.neighbors(i,wrap,ni=>{if(!this.owner[ni]&&field.gates[ni]>field.threshold)hasVacancy=true;});
      if(hasVacancy)fresh.add(i);
    }
    this.stallTicks=births?0:this.stallTicks+1;
    if(this.stallTicks>=8)fresh.clear();
    this.frontier=fresh;
    this.population+=births;
    // Age is real retained mineral history, not the animation clock.
    for(let i=0;i<this.capacity;i++){
      if(this.owner[i]&&this.age[i]<255)this.age[i]++;
    }
    this.generation++;
    this.changed=true;
    return births>0;
  }
  snapshot(){
    return {format:'ex-nihilo/surface-v1',size:this.size,seed:this.seed,
      rngState:this.rngState,generation:this.generation,population:this.population,
      stallTicks:this.stallTicks,
      owner:Array.from(this.owner),depth:Array.from(this.depth),age:Array.from(this.age),
      birthColor:Array.from(this.birthColor),seeds:this.seeds.map(s=>({...s})),
      frontier:Array.from(this.frontier)};
  }
  validateSnapshot(s){
    const n=this.capacity;
    if(!s||s.format!=='ex-nihilo/surface-v1'||s.size!==this.size||
       !Number.isInteger(s.seed)||s.seed<1||s.seed>0xffffffff||
       !Number.isInteger(s.rngState)||s.rngState<0||s.rngState>0xffffffff||
       !Number.isSafeInteger(s.generation)||s.generation<0||s.generation>100000000||
       !Number.isInteger(s.population)||s.population<0||s.population>n||
       (s.stallTicks!==undefined&&
        (!Number.isInteger(s.stallTicks)||s.stallTicks<0||s.stallTicks>8))||
       !validArray(s.owner,n,MAX_SEEDS)||!validArray(s.depth,n,65535)||
       !validArray(s.age,n,255)||!validArray(s.birthColor,n*3,255)||
       !Array.isArray(s.seeds)||s.seeds.length>MAX_SEEDS||
       !s.seeds.every((seed,i)=>seed&&seed.id===i+1&&
         Number.isInteger(seed.x)&&seed.x>=0&&seed.x<this.size&&
         Number.isInteger(seed.y)&&seed.y>=0&&seed.y<this.size&&
         num(seed.phase)&&seed.phase>=0&&seed.phase<1&&
         num(seed.angle)&&seed.angle>=0&&seed.angle<Math.PI*2)||
       !Array.isArray(s.frontier)||s.frontier.length>n||
       !s.frontier.every(i=>Number.isInteger(i)&&i>=0&&i<n&&s.owner[i]>0))
      throw Error('Invalid or incompatible saved surface material.');
    if(s.owner.filter(Boolean).length!==s.population||
       new Set(s.frontier).size!==s.frontier.length||
       s.owner.some(id=>id>s.seeds.length))
      throw Error('Corrupted surface growth genealogy.');
  }
  restore(s){
    this.validateSnapshot(s);
    this.seed=s.seed;
    this.rngState=s.rngState;
    this.generation=s.generation;
    this.population=s.population;
    this.stallTicks=s.stallTicks??0;
    this.owner.set(s.owner);this.depth.set(s.depth);this.age.set(s.age);
    this.birthColor.set(s.birthColor);
    this.seeds=s.seeds.map(v=>({...v}));
    this.frontier=new Set(s.frontier);
    this.compositionKey=null;this.compositionField=null;
    this.changed=true;
  }
}

// All pixels derive from saved birth pigment, living territory boundaries,
// and actual crystal-graph distance. No repainting the simulation state.
export function surfacePixels(surface,{contrast=.7,background='#05060c',wrap=false}={}){
  const n=surface.size,rgba=new Uint8ClampedArray(n*n*4);
  const back=toRGB(background);
  for(let i=0;i<surface.capacity;i++){
    const k=i*4,p=i*3,owner=surface.owner[i];
    if(!owner){
      rgba[k]=back[0];rgba[k+1]=back[1];rgba[k+2]=back[2];rgba[k+3]=255;
      continue;
    }
    const x=i%n,y=(i/n)|0;
    let edge=false,foreign=false,missing=0;
    let gradX=0,gradY=0;
    const depth=surface.depth[i];
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
      let nx=x+dx,ny=y+dy;
      if(wrap){nx=mod(nx,n);ny=mod(ny,n);}
      else if(nx<0||nx>=n||ny<0||ny>=n){missing++;continue;}
      const j=nx+ny*n;
      if(!surface.owner[j]){missing++;edge=true;}
      else if(surface.owner[j]!==owner)foreign=true;
      const neighbor=surface.depth[j];
      if(dx)gradX+=(neighbor-depth)*dx;
      if(dy)gradY+=(neighbor-depth)*dy;
    }
    const relief=clamp((gradX-gradY)*.09,-.22,.22);
    const ageWeight=clamp(surface.age[i]/64,0,1);
    const shine=1+relief+(.10+.18*contrast)*Math.sin(depth*.44+
      (surface.seeds[owner-1]?.phase??0)*6.28);
    const edgeLight=foreign?.48*contrast:edge?.21*contrast:0;
    const shade=clamp(.55+ageWeight*.30+shine*.19+edgeLight,.15,1.52);
    for(let c=0;c<3;c++){
      const base=surface.birthColor[p+c];
      rgba[k+c]=Math.round(clamp(base*shade+edgeLight*30,0,255));
    }
    rgba[k+3]=255;
  }
  return rgba;
}
