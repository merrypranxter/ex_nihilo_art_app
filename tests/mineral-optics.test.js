import test from 'node:test';
import assert from 'node:assert/strict';
import {GrowthEngine} from '../src/engine.js';
import {mineralMaturity,mineralOptics,FIBER_PROFILES} from '../src/mineral-optics.js';

test('distinct fiber cross sections require no prebuilt sculpture assets',()=>{
  assert.deepEqual(Object.keys(FIBER_PROFILES),
    ['needle','vitreous','wire','shard','legacy']);
  for(const profile of Object.values(FIBER_PROFILES)){
    assert.ok(profile.top>0&&profile.bottom>0&&profile.facets>=3);
  }
  assert.notDeepEqual([FIBER_PROFILES.needle.top,FIBER_PROFILES.needle.facets],
    [FIBER_PROFILES.vitreous.top,FIBER_PROFILES.vitreous.facets]);
});

test('mineral optical treatment starts fresh, cures with time and can be turned off',()=>{
  assert.equal(mineralMaturity(0,18,.65),0);
  assert.ok(Math.abs(mineralMaturity(18,18,.65)-.325)<1e-10);
  assert.ok(mineralMaturity(60,18,.65)>mineralMaturity(18,18,.65));
  const original=[.1,.6,.9],snapshot=[...original];
  const baby=mineralOptics(original,0,{mineralStrength:1});
  const aged=mineralOptics(original,50,{mineralStrength:1});
  assert.deepEqual(baby.color,original);
  assert.ok(aged.halo<baby.halo);
  assert.ok(aged.color.every(c=>c>=0&&c<=1));
  assert.deepEqual(original,snapshot);
  assert.deepEqual(mineralOptics(original,100,{mineralStrength:0}).color,original);
});

test('living segments store birth time, and checkpoint remains exactly replayable',()=>{
  const world=new GrowthEngine(118);
  world.setConfig({fiberProfile:'vitreous',mineralStrength:.85,mineralHalfLife:12});
  for(let i=0;i<220;i++)world.step(1/60);
  const state=world.getCheckpoint();
  assert.ok(state.segmentCount>0);
  assert.equal(state.segmentBornAt.length,state.segmentCount);
  assert.ok(state.segmentBornAt.every(t=>Number.isFinite(t)&&t>=0&&t<=state.time+.001));
  assert.ok(state.segmentBornAt.some(t=>t>0));
  const clone=new GrowthEngine(119);
  clone.restoreCheckpoint(state);
  assert.deepEqual(clone.getCheckpoint(),state);
  for(let i=0;i<60;i++){world.step(1/60);clone.step(1/60);}
  assert.deepEqual(clone.getCheckpoint(),world.getCheckpoint());
});

test('switching fiber geometry and mineralization does not touch any live material history',()=>{
  const world=new GrowthEngine(122);
  for(let i=0;i<130;i++)world.step(1/60);
  const previous=world.getCheckpoint();
  world.setConfig({fiberProfile:'shard',mineralStrength:1,mineralHalfLife:4});
  const current=world.getCheckpoint();
  for(const key of [
    'segments','colors','radii','segmentBornAt','segmentGenerations',
    'density','nutrients','colony','morphogenesis','agents'
  ])assert.deepEqual(current[key],previous[key],key);
});

test('old v3 world without optical birth history loads unmodified, with legacy optics',()=>{
  const world=new GrowthEngine(125);
  world.setConfig({fiberProfile:'legacy',mineralStrength:0});
  for(let i=0;i<160;i++)world.step(1/60);
  const checkpoint=world.getCheckpoint();
  delete checkpoint.segmentBornAt;
  for(const key of ['fiberProfile','mineralStrength','mineralHalfLife'])
    delete checkpoint.dna.config[key];
  const restored=new GrowthEngine(126);
  restored.restoreCheckpoint(checkpoint);
  assert.equal(restored.config.fiberProfile,'legacy');
  assert.equal(restored.config.mineralStrength,0);
  assert.ok(restored.segmentBornAt.subarray(0,restored.segmentCount).every(t=>t===Math.fround(checkpoint.time)));
  assert.equal(restored.segmentCount,world.segmentCount);
});
