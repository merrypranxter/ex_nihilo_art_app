import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {GrowthEngine,PALETTES} from '../src/engine.js';
import {crystalSurface} from '../src/crystal-optics.js';
import {
  INTERIOR_STYLES,mineralInclusionRecipe,
  historicInclusionPigment,inclusionFaceRotation
} from '../src/mineral-inclusions.js';

const exposed={direction:[0,1,0],exposed:4,fractureFaces:0,fractureDirection:null};
const fracture={...exposed,fractureFaces:2,fractureDirection:[1,0,0]};
const sample=(index,age=30,extra={})=>({
  index,age,mature:true,occupied:true,strain:0,damage:0,surface:exposed,...extra
});
const options={style:'opal',skin:.65,density:.7};

test('off means strictly no extra mineral layers at every age or damage level',()=>{
  for(let i=0;i<100;i++){
    const off=mineralInclusionRecipe(sample(i,200,{surface:fracture,strain:1.35}),
      {style:'off',skin:1,density:1});
    assert.equal(off.shell,false);
    assert.equal(off.inclusion,false);
    assert.equal(off.skinScale,1);
  }
});

test('no invented inclusions in empty, young or fully enclosed crystal cells',()=>{
  for(const cell of [
    sample(1,255,{occupied:false}),sample(1,255,{mature:false}),
    sample(1,255,{surface:{...exposed,exposed:0}}),
    sample(1,255,{surface:null})
  ]){
    const response=mineralInclusionRecipe(cell,options);
    assert.equal(response.shell,false);
    assert.equal(response.inclusion,false);
  }
});

test('mineral identity and birth age deterministically select shell/inclusion geometry',()=>{
  const original=sample(187,43,{surface:fracture,strain:.62});
  const a=mineralInclusionRecipe(original,options);
  for(let i=0;i<50;i++)
    assert.deepEqual(mineralInclusionRecipe(original,options),a);
  assert.equal(inclusionFaceRotation(187),inclusionFaceRotation(187));
  assert.ok(inclusionFaceRotation(187)>=0&&inclusionFaceRotation(187)<=Math.PI*2);
  assert.ok(a.skinScale>1);
  assert.ok(a.radialOffset>.27);
});

test('older minerals gain more actual inclusions than newly matured ones',()=>{
  let young=0,old=0;
  for(let i=0;i<3000;i++){
    const early=mineralInclusionRecipe(sample(i,5),options);
    const mature=mineralInclusionRecipe(sample(i,255),options);
    young+=Number(early.inclusion);
    old+=Number(mature.inclusion);
  }
  assert.ok(old>young*1.4);
});

test('fracture and stress contribute to inclusion density without changing the lattice',()=>{
  let pristine=0,broken=0;
  for(let i=0;i<3000;i++){
    pristine+=Number(mineralInclusionRecipe(sample(i,30),options).inclusion);
    broken+=Number(mineralInclusionRecipe(sample(i,30,{
      damage:1,strain:1.2,surface:fracture
    }),options).inclusion);
  }
  assert.ok(broken>pristine);
  const cells=new Uint8Array(5**3),damage=new Uint8Array(cells.length);
  const index=2+5*(2+5*2);
  cells[index]=2;
  const face=crystalSurface(cells,damage,index,5);
  assert.equal(face.exposed,6);
  const origin=Array.from(cells);
  mineralInclusionRecipe(sample(index,80,{surface:face}),options);
  assert.deepEqual(Array.from(cells),origin);
});

test('glaze accents preserve original birth pigment, never mutate current palette',()=>{
  const rgb=[.045,.72,.96],before=[...rgb];
  const a=historicInclusionPigment(rgb,{spectralLift:.2});
  assert.deepEqual(rgb,before);
  assert.ok(a.every(x=>x>=0&&x<=1));
  assert.ok(a[0]>rgb[0]);
  assert.equal(Object.keys(PALETTES).length,199);
  assert.equal(Object.keys(INTERIOR_STYLES).length,5);
});

test('optional optics are clamped and do not mutate physics or RNG',()=>{
  const one=new GrowthEngine(1407),two=new GrowthEngine(1407);
  one.setConfig({crystalInterior:'opal',crystalSkin:.85,crystalInclusions:.95});
  two.setConfig({crystalInterior:'off',crystalSkin:0,crystalInclusions:0});
  one.colony.setSettings({enabled:true});
  two.colony.setSettings({enabled:true});
  one.seedCrystal(new Vector3());two.seedCrystal(new Vector3());
  for(let i=0;i<100;i++){one.step(1/60);two.step(1/60);}
  assert.equal(one.rngState,two.rngState);
  assert.deepEqual(one.colony.snapshot(),two.colony.snapshot());
  assert.deepEqual(one.segmentColors,two.segmentColors);
  one.setConfig({crystalSkin:12,crystalInclusions:-5,crystalInterior:'unknown'});
  assert.equal(one.config.crystalSkin,1);
  assert.equal(one.config.crystalInclusions,0);
  assert.equal(one.config.crystalInterior,'off');
});

test('whole world saves and deterministic continuation retain inclusion DNA',()=>{
  const one=new GrowthEngine(1408);
  one.setConfig({
    crystalInterior:'spectral',crystalSkin:.40,crystalInclusions:.75,
    palette:Object.keys(PALETTES).at(-1)
  });
  one.colony.setSettings({enabled:true});
  one.seedCrystal(new Vector3());
  for(let i=0;i<140;i++)one.step(1/60);
  const saved=one.getCheckpoint();
  const copy=new GrowthEngine(77);
  copy.restoreCheckpoint(saved);
  assert.deepEqual(copy.getCheckpoint(),saved);
  assert.equal(copy.config.crystalInterior,'spectral');
  for(let i=0;i<40;i++){one.step(1/60);copy.step(1/60);}
  assert.deepEqual(copy.getCheckpoint(),one.getCheckpoint());
});

test('older saved DNA without inclusion keys remains GPU-cheap and historically intact',()=>{
  const one=new GrowthEngine(1409);
  one.setConfig({crystalInterior:'smoke',crystalSkin:1,crystalInclusions:1});
  const saved=one.getCheckpoint();
  for(const k of ['crystalInterior','crystalSkin','crystalInclusions'])
    delete saved.dna.config[k];
  const old=new GrowthEngine(42);
  old.restoreCheckpoint(saved);
  assert.equal(old.config.crystalInterior,'off');
  assert.equal(old.config.crystalSkin,0);
  assert.equal(old.config.crystalInclusions,0);
});

test('mature mineral skins refresh at a low fixed cadence without new crystal births',()=>{
  const world=new GrowthEngine(1410);
  world.setConfig({crystalInterior:'opal',crystalSkin:.7,crystalInclusions:.8});
  world.colony.setSettings({enabled:true,growth:0,erosion:0,strainEnabled:false});
  world.seedCrystal(new Vector3());
  while(world.colony.generation<5)world.step(1/60);
  assert.equal(world.colony.population,1);
  world.colony.changed=false;
  while(world.colony.generation<6)world.step(1/60);
  assert.equal(world.colony.changed,true,'a six-generation display refresh should mature old skins');
  const other=new GrowthEngine(1410);
  other.setConfig({crystalInterior:'off',crystalSkin:0,crystalInclusions:0});
  other.colony.setSettings({enabled:true,growth:0,erosion:0,strainEnabled:false});
  other.seedCrystal(new Vector3());
  while(other.colony.generation<5)other.step(1/60);
  other.colony.changed=false;
  while(other.colony.generation<6)other.step(1/60);
  assert.equal(other.colony.changed,false,'OFF mode does not schedule extra work');
});
