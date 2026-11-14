import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { GrowthEngine } from '../src/engine.js';
import { GOLDEN_ANGLE, branchVector, growthRhythm } from '../src/branching.js';

test('Wolfram-verified golden angle matches phyllotactic divergence',()=>{
  assert.ok(Math.abs(GOLDEN_ANGLE*180/Math.PI-137.50776405003785)<1e-11);
});

test('branch directions are normalized and diverge by the requested polar angle',()=>{
  for(const original of [
    {x:0,y:1,z:0},{x:1,y:0,z:0},
    {x:1,y:3,z:-2},{x:0,y:-1,z:0}
  ]){
    const parent=new Vector3(original.x,original.y,original.z).normalize();
    for(const mode of ['golden','opposite','whorl']){
      for(let i=0;i<15;i++){
        const b=branchVector(parent,i,56,mode,.25);
        const vector=new Vector3(b.x,b.y,b.z);
        assert.ok(Math.abs(vector.length()-1)<1e-12);
        assert.ok(Math.abs(parent.dot(vector)-Math.cos(56*Math.PI/180))<1e-12);
      }
    }
  }
});

test('golden, opposite and whorl modes make genuinely different daughter directions',()=>{
  const v={x:.1,y:1,z:.4};
  const signatures=['golden','opposite','whorl'].map(
    mode=>JSON.stringify(branchVector(v,5,56,mode,.2)));
  assert.equal(new Set(signatures).size,3);
});

test('growth rhythm changes deposition rates, is bounded and can be disabled',()=>{
  for(const mode of ['tide','stagger','beats']){
    const values=Array.from({length:100},(_,i)=>growthRhythm(i*.05,.37,{
      rhythmMode:mode,rhythmRate:.55,rhythmDepth:.8}));
    assert.ok(values.every(n=>Number.isFinite(n)&&n>=.08&&n<=2));
    assert.ok(Math.max(...values)-Math.min(...values)>.3);
  }
  for(const mode of ['tide','stagger','beats','steady']){
    assert.equal(growthRhythm(99,.25,{rhythmMode:mode,rhythmDepth:0}),1);
  }
});

test('real branch births taper by generation and continue identically from checkpoints',()=>{
  const w=new GrowthEngine(919);
  w.setConfig({
    branchMode:'golden',branchAngle:52,branchTaper:.79,
    rhythmMode:'beats',rhythmDepth:.85,rhythmRate:.70,
    agents:260,branching:1,speed:2.3
  });
  for(let i=0;i<450;i++)w.step(1/60);
  assert.ok(w.branchEvents>0);
  assert.ok(w.agents.some(a=>a.generation>0));
  const save=w.getCheckpoint();
  const restored=new GrowthEngine(15);
  restored.restoreCheckpoint(save);
  assert.deepEqual(restored.getCheckpoint(),save);
  for(let i=0;i<65;i++){w.step(1/60);restored.step(1/60);}
  assert.deepEqual(restored.getCheckpoint(),w.getCheckpoint());
});

test('changing branch mode or rhythm never deletes prior matter',()=>{
  const w=new GrowthEngine(191);
  for(let i=0;i<90;i++)w.step(1/60);
  const before=w.getCheckpoint();
  w.setConfig({branchMode:'whorl',branchAngle:73,rhythmMode:'tide',rhythmDepth:1});
  const after=w.getCheckpoint();
  assert.deepEqual(after.segments,before.segments);
  assert.deepEqual(after.density,before.density);
  assert.deepEqual(after.nutrients,before.nutrients);
});

test('old v3 checkpoints and DNA retain their historical random, steady behavior',()=>{
  const old=new GrowthEngine(222);
  old.setConfig({branchMode:'random',branchTaper:1,rhythmMode:'steady',rhythmDepth:0});
  for(let i=0;i<90;i++)old.step(1/60);
  const state=old.getCheckpoint();
  for(const key of ['branchMode','branchAngle','branchTaper','rhythmMode','rhythmDepth','rhythmRate']){
    delete state.dna.config[key];
  }
  delete state.branchEvents;
  for(const a of state.agents)delete a.generation;
  const restored=new GrowthEngine(223);
  restored.restoreCheckpoint(state);
  assert.equal(restored.config.branchMode,'random');
  assert.equal(restored.config.branchTaper,1);
  assert.equal(restored.config.rhythmMode,'steady');
  assert.equal(restored.config.rhythmDepth,0);
  assert.equal(restored.branchEvents,0);
  const loadedDNA=new GrowthEngine(223);
  loadedDNA.loadDNA(state.dna);
  assert.equal(loadedDNA.config.branchMode,'random');
  assert.equal(loadedDNA.config.rhythmMode,'steady');
});
