import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { MorphogenesisVolume } from '../src/morphogenesis.js';
import { extractIsosurface } from '../src/surface.js';
import { GrowthEngine } from '../src/engine.js';

test('blank chemical universe has no prebuilt surface',()=>{
  const field=new MorphogenesisVolume();
  assert.equal(field.v.some(v=>v>0),false);
  assert.equal(extractIsosurface(field,.2).triangles,0);
});

test('inoculation creates an isosurface from concentration, not a model',()=>{
  const field=new MorphogenesisVolume();
  assert.ok(field.seedAt(new Vector3(),.75));
  const surface=extractIsosurface(field,.21,{stride:2});
  assert.ok(surface.triangles>0);
  assert.ok(surface.positions.every(Number.isFinite));
  assert.equal(surface.positions.length,surface.triangles*9);
  assert.equal(surface.colors.length,surface.positions.length);
});

test('bounded 3D Gray–Scott concentrations evolve without numerical blowups',()=>{
  const field=new MorphogenesisVolume();
  field.setSettings({enabled:true});
  field.seedAt(new Vector3(),.7);
  for(let i=0;i<100;i++)field.tick();
  assert.equal(field.generation,500);
  assert.ok(field.v.some(v=>v>.21));
  assert.ok(field.v.some(v=>v<.01));
  assert.ok([...field.u,...field.v].every(n=>Number.isFinite(n)&&n>=0&&n<=1));
  const surface=extractIsosurface(field,.21,{stride:2,maxTriangles:7000});
  assert.ok(surface.triangles>0&&surface.triangles<=7000);
});

test('equation parameters causally change the chemical evolution',()=>{
  const low=new MorphogenesisVolume(),high=new MorphogenesisVolume();
  low.setSettings({enabled:true,feed:.022,kill:.053});
  high.setSettings({enabled:true,feed:.041,kill:.066});
  low.seedAt(new Vector3(),.7);
  high.seedAt(new Vector3(),.7);
  for(let i=0;i<40;i++){low.tick();high.tick();}
  assert.notDeepEqual(Array.from(low.v),Array.from(high.v));
});

test('deposition catalyzes chemistry; crystals consume the same chemical species',()=>{
  const world=new GrowthEngine(887);
  world.morphogenesis.setSettings({enabled:true,fiberCatalysis:1,crystalSink:1});
  for(let i=0;i<150;i++)world.step(1/60);
  assert.ok(world.morphogenesis.v.some(v=>v>0),'Deposited fibers should modify chemical B');
  world.seedChemical(new Vector3());
  const before=world.morphogenesis.sampleB(new Vector3());
  world.seedCrystal(new Vector3());
  const after=world.morphogenesis.sampleB(new Vector3());
  assert.ok(after<before,'New crystal cell should consume B at its location');
});

test('v3 checkpoints restore morphology, crystals, nutrient history and replay',()=>{
  const world=new GrowthEngine(8872);
  world.morphogenesis.setSettings({enabled:true});
  world.colony.setSettings({enabled:true,growth:1.2});
  world.seedChemical(new Vector3(),.72);
  world.seedCrystal(new Vector3());
  for(let i=0;i<350;i++)world.step(1/60);
  const checkpoint=world.getCheckpoint();
  assert.equal(checkpoint.format,'ex-nihilo/checkpoint-v3');
  const cloned=new GrowthEngine(13);
  cloned.restoreCheckpoint(checkpoint);
  assert.deepEqual(cloned.getCheckpoint(),checkpoint);
  for(let i=0;i<50;i++){world.step(1/60);cloned.step(1/60);}
  assert.deepEqual(cloned.getCheckpoint(),world.getCheckpoint());
});

test('corrupt morphogenesis checkpoints cannot wipe existing artwork',()=>{
  const world=new GrowthEngine(111);
  const original=world.getCheckpoint();
  assert.throws(()=>world.restoreCheckpoint({...original,morphogenesis:{...original.morphogenesis,v:[]}}));
  assert.deepEqual(world.getCheckpoint(),original);
});

test('v2 saves remain loadable and do not activate chemical growth',()=>{
  const world=new GrowthEngine(223);
  for(let i=0;i<100;i++)world.step(1/60);
  const state=world.getCheckpoint();
  const old={...state,format:'ex-nihilo/checkpoint-v2'};
  delete old.morphogenesis;
  delete old.morphElapsed;
  delete old.dna.morphogenesis;
  const restored=new GrowthEngine(77);
  restored.morphogenesis.setSettings({enabled:true});
  restored.restoreCheckpoint(old);
  assert.equal(restored.segmentCount,world.segmentCount);
  assert.equal(restored.morphogenesis.settings.enabled,false);
  assert.equal(restored.morphogenesis.v.some(v=>v>0),false);
});
