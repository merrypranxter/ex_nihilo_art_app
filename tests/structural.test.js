import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {CrystalColony} from '../src/colony.js';
import {NutrientField} from '../src/ecology.js';
import {MorphogenesisVolume} from '../src/morphogenesis.js';
import {GrowthEngine} from '../src/engine.js';
import {isOccupied,resolveCrystalMovement,traceChemicalMembrane} from '../src/structural.js';

function singleCrystal(){
  const colony=new CrystalColony(10,10);
  const i=colony.index(5,5,5);
  colony.cells[i]=2;colony.population=1;
  return colony;
}

test('solid occupied voxels intercept growing fibers, while OFF has no effect',()=>{
  const stone=singleCrystal();
  const start={x:-1.1,y:.5,z:.5},end={x:.7,y:.5,z:.5};
  const slid=resolveCrystalMovement(stone,start,end,'slide');
  assert.equal(slid.contact,true);
  assert.equal(slid.normal.x,-1);
  assert.equal(isOccupied(stone,slid.position),false);
  assert.equal(resolveCrystalMovement(stone,start,end,'off').position,end);
  assert.equal(resolveCrystalMovement(new CrystalColony(10,10),start,end).contact,false);
});

test('membrane tracing changes actual movement direction only at a chemical interface',()=>{
  const chemical={
    settings:{enabled:true,iso:.21},
    sampleB:()=>.21,
    gradientB:()=>({x:1,y:0,z:0})
  };
  const original={x:1,y:1,z:0};
  const guided=traceChemicalMembrane(chemical,{x:0,y:0,z:0},original,1);
  assert.equal(guided.tracing,true);
  assert.ok(Math.abs(guided.motion.x)<1e-9);
  assert.ok(Math.abs(Math.hypot(guided.motion.x,guided.motion.y,guided.motion.z)-Math.SQRT2)<1e-9);
  chemical.sampleB=()=>0;
  assert.equal(traceChemicalMembrane(chemical,{x:0,y:0,z:0},original,1).tracing,false);
});

test('crystal walls slow nutrient transport and preserve the diffusion mass budget',()=>{
  const sealed=new NutrientField(8,8),open=new NutrientField(8,8);
  sealed.values.fill(0);
  sealed.values[sealed.index(2,4,4)]=1;
  open.values.set(sealed.values);
  const wall=new Uint8Array(8**3);
  for(let z=0;z<8;z++)for(let y=0;y<8;y++)wall[sealed.index(3,y,z)]=2;
  for(let i=0;i<15;i++){
    sealed.tick(.6,0,wall,0);
    open.tick(.6,0);
  }
  assert.equal(sealed.values[sealed.index(4,4,4)],0);
  assert.ok(open.values[open.index(4,4,4)]>.00001);
  const sum=a=>Array.from(a).reduce((x,y)=>x+y,0);
  assert.ok(Math.abs(sum(sealed.values)-1)<1e-5);
  assert.ok(Math.abs(sum(open.values)-1)<1e-5);
});

test('crystal walls change the spatial Gray–Scott operator, not just its renderer',()=>{
  const sealed=new MorphogenesisVolume(8,8),open=new MorphogenesisVolume(8,8);
  for(const m of [sealed,open]){
    m.setSettings({enabled:true,iterations:1,feed:.004,kill:.018,crystalSink:0});
    m.v[m.index(2,4,4)]=.6;
  }
  const cells=new Uint8Array(8**3);
  for(let z=0;z<8;z++)for(let y=0;y<8;y++)cells[3+8*(y+8*z)]=2;
  for(let i=0;i<30;i++){
    sealed.tick(undefined,{size:8,population:64,cells},0);
    open.tick();
  }
  assert.equal(sealed.v[sealed.index(4,4,4)],0);
  assert.ok(open.v[open.index(4,4,4)]>0);
});

test('structural controls and contact history survive complete checkpoints and deterministic replay',()=>{
  const world=new GrowthEngine(303);
  world.setConfig({contactMode:'deflect',contactBranching:.35,wallPermeability:0,membraneTrace:.8});
  world.colony.setSettings({enabled:true,growth:1.1});
  world.morphogenesis.setSettings({enabled:true});
  world.seedCrystal(new Vector3(0,0,0));
  world.seedChemical(new Vector3(.5,.5,.5));
  for(let i=0;i<240;i++)world.step(1/60);
  const state=world.getCheckpoint();
  const clone=new GrowthEngine(905);
  clone.restoreCheckpoint(state);
  assert.deepEqual(clone.getCheckpoint(),state);
  for(let i=0;i<35;i++){world.step(1/60);clone.step(1/60);}
  assert.deepEqual(clone.getCheckpoint(),world.getCheckpoint());
});

test('historical v3 checkpoint lacking structural settings still loads with defaults',()=>{
  const world=new GrowthEngine(304);
  for(let i=0;i<55;i++)world.step(1/60);
  const old=world.getCheckpoint();
  delete old.contactEvents;
  for(const key of ['contactMode','contactBranching','wallPermeability','membraneTrace'])delete old.dna.config[key];
  const fresh=new GrowthEngine(15);
  fresh.restoreCheckpoint(old);
  assert.equal(fresh.segmentCount,world.segmentCount);
  assert.equal(fresh.config.contactMode,'slide');
  assert.equal(fresh.config.wallPermeability,.08);
});
