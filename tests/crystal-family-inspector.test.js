import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {CrystalColony} from '../src/colony.js';
import {GrowthEngine,PALETTES} from '../src/engine.js';
import {
  inspectCrystalFamily,crystalVoxelForHit,sampleFamilyMembers,FAMILY_FOCUS_MODES
} from '../src/crystal-family-inspector.js';

const nutrient={sample:()=>1,consume:()=>{}};
const colors=PALETTES.acid;
const point=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const setup=()=>{
  const colony=new CrystalColony(18,8);
  colony.setSettings({enabled:true,growth:1.6,erosion:0,
    strainEnabled:false,ancestryEnabled:true,ancestryMutation:0});
  assert.equal(colony.seedAt(point(-1.5),nutrient,colors,()=>.2),true);
  assert.equal(colony.seedAt(point(1.5),nutrient,colors,()=>.2),true);
  for(let i=0;i<6;i++)colony.update(nutrient,colors,()=>.18);
  return colony;
};

test('one living selected parent maps to immutable birth ID and real founder',()=>{
  const colony=setup();
  const picked=colony.birthIds.findIndex(id=>id===1);
  const focus=inspectCrystalFamily(colony,1,1);
  assert.equal(focus.selectedAlive,true);
  assert.equal(focus.selectedIndex,picked);
  assert.equal(focus.familyId,1);
  assert.equal(focus.parentId,0);
  assert.equal(focus.founderIndex,picked);
  assert.ok(focus.members.length>1);
  assert.ok(focus.links.length>0);
});

test('two seeded families never receive fictional cross-family parent links',()=>{
  const colony=setup();
  const first=inspectCrystalFamily(colony,1,1,'family');
  const second=inspectCrystalFamily(colony,2,2,'family');
  assert.ok(first.members.length>1&&second.members.length>1);
  for(const focus of [first,second]){
    assert.ok(focus.members.every(i=>colony.families[i]===focus.familyId));
    assert.ok(focus.links.every(link=>
      colony.birthIds[link.parentIndex]===link.parentId&&
      colony.parentBirthIds[link.childIndex]===link.parentId&&
      colony.families[link.childIndex]===colony.families[link.parentIndex]));
  }
  assert.equal(new Set([...first.members,...second.members]).size,
    colony.population);
});

test('descendant-only branch is a subset of the selected founder family',()=>{
  const colony=setup();
  const family=inspectCrystalFamily(colony,1,1,'family');
  const sub=inspectCrystalFamily(colony,1,1,'descendants');
  assert.ok(sub.members.length>0);
  assert.ok(sub.members.every(i=>family.members.includes(i)));
  assert.equal(sub.directChildren,
    colony.parentBirthIds.filter(id=>id===1).length);
  assert.deepEqual(Object.keys(FAMILY_FOCUS_MODES),['family','descendants']);
});

test('dead selected parent keeps a factual survivor family without fake connecting edges',()=>{
  const colony=setup();
  const parent=colony.birthIds.findIndex(id=>id===1);
  assert.ok(parent>=0);
  const initial=inspectCrystalFamily(colony,1,1,'descendants');
  assert.ok(initial.directChildren>0);
  colony.cells[parent]=0;colony.population--;
  const family=inspectCrystalFamily(colony,1,1,'family');
  const branch=inspectCrystalFamily(colony,1,1,'descendants');
  assert.equal(family.selectedAlive,false);
  assert.equal(family.familyId,1);
  assert.ok(family.members.length>0);
  assert.ok(branch.members.length>0);
  assert.ok(branch.links.every(link=>link.parentId!==1));
  assert.ok(branch.interruptedLinks>=1);
});

test('old untracked historical crystals never acquire made-up ancestry',()=>{
  const old=setup().snapshot();
  for(const key of ['birthIds','parentBirthIds','families','genes','nextBirthId'])
    delete old[key];
  const colony=new CrystalColony(18,8);
  colony.restore(old);
  assert.ok(colony.birthIds.every(id=>id===0));
  const focus=inspectCrystalFamily(colony,1,0,'family');
  assert.equal(focus.tracked,false);
  assert.deepEqual(focus.members,[]);
  assert.deepEqual(focus.links,[]);
});

test('family selection is read-only and never changes simulation RNG',()=>{
  const colony=setup();
  const before=colony.snapshot();
  const first=inspectCrystalFamily(colony,1,1,'family');
  const second=inspectCrystalFamily(colony,1,1,'family');
  assert.deepEqual(second,first);
  assert.deepEqual(colony.snapshot(),before);
});

test('raycast resolves mutable instance slots to actual voxels in every optical mode',()=>{
  const original={count:3},young={count:3},mature={count:1},fault={count:1};
  const baseMap=Int32Array.from([12,18,26]);
  const staged={
    young:Int32Array.from([91,87,16]),
    mature:Int32Array.from([4]),
    fault:Int32Array.from([102])
  };
  const meshes={young,mature,fault};
  assert.equal(crystalVoxelForHit({object:original,instanceId:2},
    original,baseMap,meshes,staged),26);
  assert.equal(crystalVoxelForHit({object:young,instanceId:1},
    original,baseMap,meshes,staged),87);
  assert.equal(crystalVoxelForHit({object:fault,instanceId:0},
    original,baseMap,meshes,staged),102);
  assert.equal(crystalVoxelForHit({object:mature,instanceId:1},
    original,baseMap,meshes,staged),-1);
  assert.equal(crystalVoxelForHit({object:{count:3},instanceId:0},
    original,baseMap,meshes,staged),-1);
});

test('mobile beacon selection fairly samples whole family with no duplicates',()=>{
  const many=Array.from({length:4800},(_,i)=>i);
  const sampled=sampleFamilyMembers(many,900);
  assert.equal(sampled.length,900);
  assert.equal(new Set(sampled).size,900);
  assert.ok(sampled[0]>0&&sampled.at(-1)<4800);
  assert.deepEqual(sampleFamilyMembers([1,2,3],900),[1,2,3]);
  assert.deepEqual(sampleFamilyMembers(many,0),[]);
});

test('saved-world inspector focus persists but only reads living ancestry',()=>{
  const world=new GrowthEngine(6081);
  world.colony.setSettings({enabled:true,ancestryEnabled:true,growth:1.1});
  world.seedCrystal(point());
  for(let k=0;k<140;k++)world.step(1/60);
  world.setConfig({crystalFocusBirthId:1,crystalFocusFamilyId:1,
    crystalFocusMode:'descendants'});
  const original=world.getCheckpoint(),loaded=new GrowthEngine(4);
  loaded.restoreCheckpoint(original);
  assert.deepEqual(loaded.getCheckpoint(),original);
  assert.equal(loaded.config.crystalFocusBirthId,1);
  const focus=inspectCrystalFamily(loaded.colony,
    loaded.config.crystalFocusBirthId,
    loaded.config.crystalFocusFamilyId,
    loaded.config.crystalFocusMode);
  assert.equal(focus.tracked,true);
  for(let k=0;k<35;k++){world.step(1/60);loaded.step(1/60);}
  assert.deepEqual(loaded.getCheckpoint(),world.getCheckpoint());
  assert.equal(Object.keys(PALETTES).length,199);
});

test('legacy DNA starts unselected and unsafe focus IDs are sanitized',()=>{
  const world=new GrowthEngine(6082);
  world.setConfig({crystalFocusBirthId:12,crystalFocusFamilyId:1,
    crystalFocusMode:'descendants'});
  const historical=world.getCheckpoint();
  delete historical.dna.config.crystalFocusBirthId;
  delete historical.dna.config.crystalFocusFamilyId;
  delete historical.dna.config.crystalFocusMode;
  const restored=new GrowthEngine(21);
  restored.restoreCheckpoint(historical);
  assert.equal(restored.config.crystalFocusBirthId,0);
  assert.equal(restored.config.crystalFocusFamilyId,0);
  assert.equal(restored.config.crystalFocusMode,'family');
  restored.setConfig({crystalFocusBirthId:-2,crystalFocusFamilyId:99,
    crystalFocusMode:'constructor'});
  assert.equal(restored.config.crystalFocusBirthId,0);
  assert.equal(restored.config.crystalFocusFamilyId,0);
  assert.equal(restored.config.crystalFocusMode,'family');
});

test('touch family tool is tap-only and never paints or starts pressure transactions',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(main,/gestureMode='inspect-family'/);
  assert.match(main,/Math\.hypot\(e\.clientX-familyTapOrigin\.x/);
  assert.match(main,/if\(familyTap\)inspectFamilyFromEvent\(e\)/);
  assert.match(main,/raycaster\.intersectObjects\(targets,false\)/);
  assert.match(main,/crystalVoxelForHit\(hit,crystals,crystalSlotToVoxel/);
  assert.match(main,/crystalFocusBirthId:0,crystalFocusFamilyId:0/);
  assert.match(html,/data-tool="family"/);
  assert.match(html,/id="family-mode-descendants"/);
});
