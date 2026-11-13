import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { GrowthEngine } from '../src/engine.js';
import { CrystalColony } from '../src/colony.js';

test('crystal world begins empty and single-seed birth does not fabricate a sculpture',()=>{
  const world=new GrowthEngine(23);
  assert.equal(world.colony.population,0);
  assert.ok(world.seedCrystal(new Vector3(0,0,0)));
  assert.equal(world.colony.population,1);
});

test('3D local cellular automaton grows from neighbors using shared nutrient chemistry',()=>{
  const world=new GrowthEngine(197);
  world.colony.setSettings({enabled:true,growth:1.8,erosion:0});
  world.seedCrystal(new Vector3());
  for(let i=0;i<850;i++)world.step(1/60);
  assert.ok(world.colony.population>4,'Local births must generate additional cells');
  assert.ok(world.colony.generation>0);
  assert.ok(world.colony.population<=world.colony.maxCells);
  assert.ok(world.colony.cells.some(n=>n===2),'Growing cells must mineralize');
});

test('complete v3 world save restores both engines, replay, chemistry and cell colors',()=>{
  const world=new GrowthEngine(2468);
  world.colony.setSettings({enabled:true,growth:1.7});
  world.seedCrystal(new Vector3());
  for(let i=0;i<780;i++)world.step(1/60);
  const state=world.getCheckpoint();
  assert.equal(state.format,'ex-nihilo/checkpoint-v3');
  const restored=new GrowthEngine(400);
  restored.restoreCheckpoint(state);
  assert.deepEqual(restored.getCheckpoint(),state);
  for(let i=0;i<40;i++){
    world.step(1/60);
    restored.step(1/60);
  }
  assert.deepEqual(restored.getCheckpoint(),world.getCheckpoint());
});

test('invalid crystal checkpoint never erases the existing organism',()=>{
  const world=new GrowthEngine(121);
  world.seedCrystal(new Vector3());
  const state=world.getCheckpoint();
  assert.throws(()=>world.restoreCheckpoint({...state,colony:{...state.colony,cells:[]}}));
  assert.deepEqual(world.getCheckpoint(),state);
});

test('old v1 nutrient/fiber checkpoints can be loaded with crystals disabled',()=>{
  const world=new GrowthEngine(982);
  for(let i=0;i<180;i++)world.step(1/60);
  const state=world.getCheckpoint();
  const legacy={...state,format:'ex-nihilo/checkpoint-v1'};
  delete legacy.colony;
  delete legacy.colonyElapsed;
  delete legacy.dna.colony;
  const restored=new GrowthEngine(10);
  restored.restoreCheckpoint(legacy);
  assert.equal(restored.segmentCount,world.segmentCount);
  assert.equal(restored.colony.population,0);
  assert.equal(restored.colony.settings.enabled,false);
});

test('cells can be cleared without resetting existing fibers or nutrients',()=>{
  const world=new GrowthEngine(983);
  for(let i=0;i<130;i++)world.step(1/60);
  world.seedCrystal(new Vector3());
  const before=world.getCheckpoint();
  world.colony.clear();
  assert.equal(world.colony.population,0);
  assert.equal(world.segmentCount,before.segmentCount);
  assert.deepEqual(Array.from(world.nutrients.values),before.nutrients);
});
