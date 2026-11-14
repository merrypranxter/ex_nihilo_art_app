import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {GrowthEngine} from '../src/engine.js';
import {lineageSteering,lineageLighting,lineageHaloScale} from '../src/filigree.js';
import {branchVector} from '../src/branching.js';

test('new daughter retains a meaningful initial direction, then returns to field influence',()=>{
  const early=lineageSteering(0,1,1);
  const later=lineageSteering(8,1,1);
  assert.ok(early<.02 && later>.089);
  assert.equal(lineageSteering(0,0,1),.09);
  assert.equal(lineageSteering(0,3,0),.09);
});

test('ancestry lighting is reversible, bounded and leaves stored pigment unchanged',()=>{
  const pigment=[.6,.3,.8],copy=[...pigment];
  const trunk=lineageLighting(pigment,0,.9);
  const daughter=lineageLighting(pigment,5,.9);
  assert.deepEqual(pigment,copy);
  assert.deepEqual(lineageLighting(pigment,5,0),pigment);
  assert.ok(trunk[0]>daughter[0]);
  assert.ok(daughter.every(n=>n>=0&&n<=1));
  assert.ok(lineageHaloScale(5,1)>lineageHaloScale(0,1));
});

test('parent-local daughter angles cycle within each parent, not across the whole colony',()=>{
  const world=new GrowthEngine(102);
  world.setConfig({agents:60,branchOrdering:'family',branchMode:'golden',branchAngle:55});
  const parent=world.agents[0];
  const anchor=parent.dir.clone();
  const firstPhase=parent.familyPhase;
  assert.equal(parent.branchSerial,0);
  assert.ok(world.spawnBranch(parent));
  assert.ok(world.spawnBranch(parent));
  const child1=world.agents.at(-2),child2=world.agents.at(-1);
  assert.equal(parent.branchSerial,2);
  assert.equal(child1.familyPhase,firstPhase);
  assert.equal(child2.familyPhase,firstPhase);
  assert.equal(child1.generation,1);
  assert.equal(child2.generation,1);
  const b0=branchVector(anchor,0,55,'golden',firstPhase);
  const b1=branchVector(anchor,1,55,'golden',firstPhase);
  assert.ok(child1.dir.distanceTo(new Vector3(b0.x,b0.y,b0.z))<1e-10);
  assert.ok(child2.dir.distanceTo(new Vector3(b1.x,b1.y,b1.z))<1e-10);
  const other=world.agents[1];
  assert.equal(other.branchSerial,0);
  world.spawnBranch(other);
  assert.equal(other.branchSerial,1);
});

test('new persistent segments remember real branch generation and restore it',()=>{
  const world=new GrowthEngine(130);
  world.setConfig({agents:60,branchOrdering:'family',branchMode:'whorl',branchPersistence:1,branching:1,speed:2});
  for(let i=0;i<360;i++)world.step(1/60);
  const checkpoint=world.getCheckpoint();
  assert.equal(checkpoint.segmentGenerations.length,checkpoint.segmentCount);
  assert.ok(checkpoint.segmentGenerations.some(n=>n>0),'descendant fibers must be deposited');
  assert.ok(checkpoint.agents.every(a=>Number.isInteger(a.branchSerial)&&Number.isFinite(a.familyPhase)));
  const copy=new GrowthEngine(75);
  copy.restoreCheckpoint(checkpoint);
  assert.deepEqual(copy.getCheckpoint(),checkpoint);
  for(let i=0;i<50;i++){world.step(1/60);copy.step(1/60);}
  assert.deepEqual(copy.getCheckpoint(),world.getCheckpoint());
});

test('historical checkpoint lacking genealogy fields retains its original math',()=>{
  const world=new GrowthEngine(131);
  world.setConfig({branchOrdering:'global',branchPersistence:0,filigreeContrast:0});
  for(let i=0;i<100;i++)world.step(1/60);
  const old=world.getCheckpoint();
  delete old.segmentGenerations;
  for(const key of ['branchOrdering','branchPersistence','filigreeContrast'])delete old.dna.config[key];
  for(const agent of old.agents){delete agent.branchSerial;delete agent.familyPhase;}
  const copy=new GrowthEngine(11);
  copy.restoreCheckpoint(old);
  assert.equal(copy.config.branchOrdering,'global');
  assert.equal(copy.config.branchPersistence,0);
  assert.equal(copy.config.filigreeContrast,0);
  assert.ok(Array.from(copy.segmentGenerations.subarray(0,copy.segmentCount)).every(x=>x===0));
  const migrated=copy.getCheckpoint();
  assert.equal(migrated.segmentCount,old.segmentCount);
  for(let i=0;i<25;i++)copy.step(1/60);
  assert.ok(copy.segmentCount>=old.segmentCount);
});

test('filigree slider never changes physical colors, chemical state or deposited geometry',()=>{
  const world=new GrowthEngine(145);
  for(let i=0;i<60;i++)world.step(1/60);
  const snap=world.getCheckpoint();
  world.setConfig({filigreeContrast:0});
  const after=world.getCheckpoint();
  for(const field of ['segments','colors','radii','segmentGenerations','density','nutrients']){
    assert.deepEqual(after[field],snap[field],field);
  }
});
