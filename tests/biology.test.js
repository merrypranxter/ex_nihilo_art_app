import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { NutrientField } from '../src/ecology.js';
import { GrowthEngine } from '../src/engine.js';

test('3D nutrient volume remains finite and bounded during diffusion',()=>{
  const n=new NutrientField();
  for(let i=0;i<50;i++)n.tick(1,1);
  assert.ok(Array.from(n.values).every(v=>Number.isFinite(v)&&v>=0&&v<=1));
});

test('feeding and consumption alter living chemistry',()=>{
  const n=new NutrientField();
  const p={x:0,y:0,z:0};
  const before=n.sample(p);
  n.inject(p,2,1);
  assert.ok(n.sample(p)>before);
  const fed=n.sample(p);
  n.consume(p,.1);
  assert.ok(n.sample(p)<fed);
});

test('nutrient gradient responds to local injection',()=>{
  const n=new NutrientField();
  n.values.fill(0);
  const p={x:-.5,y:0,z:0};
  n.inject({x:.5,y:0,z:0},2,1);
  assert.ok(n.gradient(p).x>0);
});

test('world checkpoint restores geometry, colors, chemistry, nodes, agents and RNG',()=>{
  const world=new GrowthEngine(501);
  world.setConfig({speed:2,agents:90,nutrientDrive:1.5});
  for(let i=0;i<300;i++)world.step(1/60);
  world.feedAt(new Vector3(1,.7,0));
  world.addNode('repel',new Vector3(.5,0,0));
  const saved=world.getCheckpoint();
  assert.ok(saved.segmentCount>0);
  const restored=new GrowthEngine(11);
  restored.restoreCheckpoint(saved);
  assert.deepEqual(restored.getCheckpoint(),saved);
  for(let i=0;i<30;i++){
    world.step(1/60);
    restored.step(1/60);
  }
  assert.deepEqual(restored.getCheckpoint(),world.getCheckpoint());
});

test('damaged checkpoint cannot overwrite a living world',()=>{
  const world=new GrowthEngine(13);
  for(let i=0;i<90;i++)world.step(1/60);
  const previous=world.getCheckpoint();
  assert.throws(()=>world.restoreCheckpoint({...previous,nutrients:[]}),/Invalid/);
  assert.deepEqual(world.getCheckpoint(),previous);
});

test('local Jacobian stays numeric and finite',()=>{
  const world=new GrowthEngine(101);
  const matrix=world.localJacobian(new Vector3(.1,.2,.3));
  assert.equal(matrix.length,3);
  assert.ok(matrix.every(row=>row.length===3&&row.every(Number.isFinite)));
});
