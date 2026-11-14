import test from 'node:test';
import assert from 'node:assert/strict';
import {GrowthEngine,PALETTES} from '../src/engine.js';
import {
  CRYSTAL_PROFILES,CRYSTAL_LENSES,
  crystalSurface,mineralCellDisplay,gemPigment,iHash
} from '../src/crystal-optics.js';

const n=7,idx=(x,y,z)=>x+n*(y+n*z);
const sampleCell=({colorIndex=0,relief=1,glint=1,damage=0,stress=0,surface})=>
  mineralCellDisplay({index:colorIndex,damage,strain:stress,
    surface:surface??{direction:[0,1,0],exposed:3,fractureFaces:0,
      fractureDirection:null}},{relief,glint});

test('seven real mineral geometry profiles and five material lenses are selectable',()=>{
  assert.deepEqual(Object.keys(CRYSTAL_PROFILES),
    ['octa','cube','sphere','quartz','prism','shard','jewel']);
  assert.deepEqual(Object.keys(CRYSTAL_LENSES),
    ['inherit','opal','prism','frost','alloy']);
  assert.ok(CRYSTAL_LENSES.prism.iridescence>CRYSTAL_LENSES.frost.iridescence);
});

test('actual occupied face topology sets crystallographic orientation',()=>{
  const cells=new Uint8Array(n**3),damage=new Uint8Array(n**3);
  const target=idx(3,3,3);
  cells[target]=2;
  for(const [x,y,z] of [
    [2,3,3],[3,2,3],[3,4,3],[3,3,2],[3,3,4]
  ])cells[idx(x,y,z)]=2;
  const first=crystalSurface(cells,damage,target,n);
  assert.equal(first.exposed,1);
  assert.deepEqual(first.direction,[1,0,0]);
  assert.equal(first.fractureFaces,0);
  const scar=idx(4,3,3);
  damage[scar]=2;
  const fractured=crystalSurface(cells,damage,target,n);
  assert.equal(fractured.fractureFaces,1);
  assert.deepEqual(fractured.fractureDirection,[1,0,0]);
  assert.equal(crystalSurface(cells,damage,idx(0,0,0),n).exposed,0);
});

test('fracture facets come only from exposed real mineral cell surfaces',()=>{
  const dense={direction:[0,1,0],exposed:0,fractureFaces:0,
    fractureDirection:null};
  const rim={direction:[0,1,0],exposed:1,fractureFaces:1,
    fractureDirection:[1,0,0]};
  assert.equal(sampleCell({surface:dense}).drawGem,false);
  assert.equal(sampleCell({surface:rim}).drawGem,true);
  assert.equal(sampleCell({surface:rim,glint:0}).drawGem,false);
  assert.equal(sampleCell({surface:rim}).fractureGlint,true);
  assert.deepEqual(sampleCell({surface:rim}).gemDirection,[1,0,0]);
});

test('relief changes actual anisotropic geometry ratios, not simulation history',()=>{
  const flat=sampleCell({relief:0,glint:0});
  const deep=sampleCell({relief:1,glint:0});
  assert.equal(flat.axial,1);
  assert.equal(flat.lateral,1);
  assert.ok(deep.axial>1.4);
  assert.ok(deep.lateral<.85);
  const cracked=sampleCell({damage:1,stress:1.2});
  assert.ok(cracked.lateral<deep.lateral);
  assert.ok(cracked.pigmentMix>flat.pigmentMix);
});

test('mineral facet pigment is derived from frozen source color, no palette mutation',()=>{
  const original=[.1,.4,.95],save=[...original];
  const opal=gemPigment(original,1,true);
  assert.deepEqual(original,save);
  assert.ok(opal.every(v=>v>=0&&v<=1));
  assert.ok(opal[0]>.1);
  assert.equal(iHash(165),iHash(165));
  assert.notEqual(iHash(165),iHash(166));
});

test('all 199 source palettes and original buried pigments survive optics edits',()=>{
  const world=new GrowthEngine(2551);
  for(let i=0;i<130;i++)world.step(1/60);
  const original=world.getCheckpoint();
  const collection=Object.keys(PALETTES);
  assert.equal(collection.length,199);
  world.setConfig({
    crystalShape:'jewel',crystalLens:'alloy',
    crystalRelief:1,crystalGlints:1,
    palette:collection.at(-1)
  });
  const altered=world.getCheckpoint();
  assert.deepEqual(altered.colony,original.colony);
  assert.deepEqual(altered.colors,original.colors);
  assert.deepEqual(altered.segments,original.segments);
  assert.equal(altered.dna.config.crystalShape,'jewel');
  assert.equal(altered.dna.config.crystalGlints,1);
});

test('checkpoint restores exact crystal optical state and replays unchanged growth',()=>{
  const world=new GrowthEngine(2552);
  world.setConfig({
    crystalShape:'quartz',crystalLens:'prism',
    crystalRelief:.63,crystalGlints:.78
  });
  world.colony.setSettings({enabled:true});
  world.seedCrystal({x:0,y:0,z:0});
  for(let i=0;i<170;i++)world.step(1/60);
  const checkpoint=world.getCheckpoint();
  const copy=new GrowthEngine(2);
  copy.restoreCheckpoint(checkpoint);
  assert.deepEqual(copy.getCheckpoint(),checkpoint);
  for(let i=0;i<60;i++){world.step(1/60);copy.step(1/60);}
  assert.deepEqual(copy.getCheckpoint(),world.getCheckpoint());
});

test('historic world lacking optical DNA returns to old octahedral presentation',()=>{
  const world=new GrowthEngine(2553);
  for(let i=0;i<80;i++)world.step(1/60);
  const checkpoint=world.getCheckpoint();
  for(const key of ['crystalShape','crystalLens','crystalRelief','crystalGlints'])
    delete checkpoint.dna.config[key];
  const copy=new GrowthEngine(7);
  copy.restoreCheckpoint(checkpoint);
  assert.deepEqual(
    [
      copy.config.crystalShape,copy.config.crystalLens,
      copy.config.crystalRelief,copy.config.crystalGlints
    ],['octa','inherit',0,0]);
});
