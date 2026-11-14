import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {GrowthEngine,PALETTES} from '../src/engine.js';
import {CrystalColony} from '../src/colony.js';
import {
  founderGenes,inheritGenes,hereditaryBirthBias,inheritedFacet,
  HERITAGE_MODES
} from '../src/crystal-bloodlines.js';

const point=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const food={sample:()=>1,consume:()=>{}};
const palette=PALETTES.acid;

function createColony(mutation=0,ancestry=true){
  const c=new CrystalColony(16,8);
  c.setSettings({
    enabled:true,growth:2,erosion:0,strainEnabled:false,
    ancestryEnabled:ancestry,ancestryInfluence:.65,
    ancestryMutation:mutation
  });
  assert.ok(c.seedAt(point(),food,palette,()=>.2));
  return c;
}

test('real synchronous CA births retain immutable event identity, parent and founder',()=>{
  const colony=createColony();
  const root=colony.birthIds.findIndex(x=>x!==0);
  assert.equal(colony.birthIds[root],1);
  assert.equal(colony.families[root],1);
  assert.equal(colony.parentBirthIds[root],0);
  const rootGenes=Array.from(colony.genes.slice(root*3,root*3+3));
  colony.update(food,palette,()=>0);
  const child=colony.birthIds.findIndex((x,i)=>i!==root&&x!==0);
  assert.ok(child>=0);
  assert.equal(colony.parentBirthIds[child],1);
  assert.equal(colony.families[child],1);
  assert.deepEqual(Array.from(colony.genes.slice(child*3,child*3+3)),rootGenes);
});

test('mutations are bounded, reproducible, and never consume simulation RNG',()=>{
  const parent=founderGenes(1000,3);
  const clone=inheritGenes(parent,1001,24,0);
  assert.deepEqual(clone,parent);
  const mutated=inheritGenes(parent,1001,24,1);
  assert.deepEqual(mutated,inheritGenes(parent,1001,24,1));
  assert.ok(mutated.some((x,i)=>x!==parent[i]));
  assert.ok(mutated.every(x=>Number.isInteger(x)&&x>=0&&x<=255));
});

test('genes bias *real* 3D crystal growth probabilities only when enabled',()=>{
  const gene=[255,127,127];
  assert.ok(hereditaryBirthBias(gene,[1,0,0],1)>1);
  assert.ok(hereditaryBirthBias(gene,[-1,0,0],1)<1);
  assert.equal(hereditaryBirthBias(gene,[1,0,0],0),1);
  const a=new GrowthEngine(4091),b=new GrowthEngine(4091);
  a.setConfig({crystalHeritage:'mutant',crystalHeritageStrength:1});
  b.setConfig({crystalHeritage:'off',crystalHeritageStrength:0});
  a.colony.setSettings({enabled:true,ancestryEnabled:false});
  b.colony.setSettings({enabled:true,ancestryEnabled:false});
  a.seedCrystal(point());b.seedCrystal(point());
  for(let k=0;k<160;k++){a.step(1/60);b.step(1/60);}
  assert.equal(a.rngState,b.rngState);
  assert.deepEqual(a.colony.snapshot(),b.colony.snapshot(),
    'turning on display alone must not change physical cell birth');
});

test('hereditary anatomy is visible, stable, and OFF preserves original crystal geometry',()=>{
  const genes=[224,103,185],family=45;
  for(const mode of ['brocade','strata','mutant']){
    const look=inheritedFacet(genes,family,40,{mode,strength:1});
    assert.ok(look.axial>0&&look.lateral>0);
    assert.deepEqual(look,inheritedFacet(genes,family,120,{mode,strength:1}),
      'old inherited band positions must not flicker as age increments');
    assert.ok(look.shade>=0&&look.shade<=.35);
  }
  assert.equal(inheritedFacet(genes,family,40,{mode:'off'}).axial,1);
  assert.equal(inheritedFacet(genes,family,40,{mode:'off'}).band,false);
  assert.equal(Object.keys(HERITAGE_MODES).length,4);
});

test('birth event identity survives voxel reuse and prevents family reassignment',()=>{
  const c=createColony();
  const root=c.birthIds.findIndex(x=>x>0);
  c.update(food,palette,()=>0);
  const descendant=c.parentBirthIds.findIndex(id=>id===1);
  assert.ok(descendant>=0);
  const originalId=c.birthIds[root];
  // Simulate ordinary reversible erosion, not an irreversible fracture scar.
  c.cells[root]=0;c.ages[root]=0;c.population--;
  assert.ok(c.birth(root,food,palette,()=>.3));
  assert.notEqual(c.birthIds[root],originalId);
  assert.equal(c.parentBirthIds[descendant],originalId);
  assert.equal(c.families[descendant],1);
});

test('full world genetics survives exact reload and deterministic future growth',()=>{
  const w=new GrowthEngine(4092);
  w.setConfig({crystalHeritage:'strata',crystalHeritageStrength:.8,
    palette:Object.keys(PALETTES).at(-1)});
  w.colony.setSettings({enabled:true,growth:1.3,ancestryEnabled:true,
    ancestryInfluence:.75,ancestryMutation:.4});
  w.seedCrystal(point());
  for(let i=0;i<210;i++)w.step(1/60);
  const checkpoint=w.getCheckpoint(),copy=new GrowthEngine(55);
  copy.restoreCheckpoint(checkpoint);
  assert.deepEqual(copy.getCheckpoint(),checkpoint);
  for(let i=0;i<60;i++){w.step(1/60);copy.step(1/60);}
  assert.deepEqual(copy.getCheckpoint(),w.getCheckpoint());
  assert.equal(Object.keys(PALETTES).length,199);
});

test('pre-bloodline checkpoint leaves old births untracked and grows honest new families',()=>{
  const c=createColony();
  c.update(food,palette,()=>0);
  const old=c.snapshot();
  for(const key of ['birthIds','parentBirthIds','families','genes','nextBirthId'])
    delete old[key];
  delete old.settings.ancestryEnabled;
  delete old.settings.ancestryMutation;
  delete old.settings.ancestryInfluence;
  const historical=new CrystalColony(16,8);
  historical.restore(old);
  assert.equal(historical.settings.ancestryEnabled,false);
  assert.ok(historical.birthIds.every(id=>id===0));
  historical.setSettings({ancestryEnabled:true});
  historical.update(food,palette,()=>0);
  const mixed=historical.snapshot(),clone=new CrystalColony(16,8);
  clone.restore(mixed);
  assert.deepEqual(clone.snapshot(),mixed);
  assert.ok(mixed.birthIds.some(id=>id>0));
  assert.ok(mixed.cells.some((cell,i)=>cell>0&&mixed.birthIds[i]===0));
});

test('invalid or partial ancestry data is rejected without overwriting live matter',()=>{
  const c=createColony();
  c.update(food,palette,()=>0);
  const before=c.snapshot();
  const invalid=JSON.parse(JSON.stringify(before));
  invalid.nextBirthId=0;
  assert.throws(()=>c.restore(invalid));
  assert.deepEqual(c.snapshot(),before);
  const partial=JSON.parse(JSON.stringify(before));
  delete partial.genes;
  assert.throws(()=>c.restore(partial));
  assert.deepEqual(c.snapshot(),before);
  const corrupt=JSON.parse(JSON.stringify(before));
  const descendant=corrupt.parentBirthIds.findIndex(x=>x>0);
  corrupt.parentBirthIds[descendant]=corrupt.birthIds[descendant]+1;
  assert.throws(()=>c.restore(corrupt));
  assert.deepEqual(c.snapshot(),before);
});

test('historical DNA remains OFF and all 199 stored color palettes survive',()=>{
  const w=new GrowthEngine(4093);
  w.setConfig({crystalHeritage:'mutant',crystalHeritageStrength:1});
  const checkpoint=w.getCheckpoint();
  delete checkpoint.dna.config.crystalHeritage;
  delete checkpoint.dna.config.crystalHeritageStrength;
  delete checkpoint.dna.colony.ancestryEnabled;
  const restored=new GrowthEngine(12);
  restored.restoreCheckpoint(checkpoint);
  assert.equal(restored.config.crystalHeritage,'off');
  assert.equal(restored.config.crystalHeritageStrength,0);
  restored.setConfig({crystalHeritage:'constructor',crystalHeritageStrength:100});
  assert.equal(restored.config.crystalHeritage,'off');
  assert.equal(restored.config.crystalHeritageStrength,1);
  assert.equal(Object.keys(PALETTES).length,199);
});

test('directional inherited genes materially change the occupied cellular shape',()=>{
  const a=createColony(0,true),b=createColony(0,false);
  a.setSettings({ancestryInfluence:1});
  b.setSettings({ancestryInfluence:1});
  for(let i=0;i<8;i++){
    a.update(food,palette,()=>.3);
    b.update(food,palette,()=>.3);
  }
  assert.notDeepEqual(a.cells,b.cells,
    'gene-based 3D birth bias must alter real future crystal cells, not only render geometry');
  assert.ok(a.population>1&&b.population>1);
});

test('separate seeds establish distinct families while descendants keep their origin',()=>{
  const c=new CrystalColony(16,8);
  c.setSettings({enabled:true,growth:1,erosion:0,strainEnabled:false,
    ancestryEnabled:true,ancestryMutation:0});
  assert.ok(c.seedAt(point(-1.5,0,0),food,palette,()=>.1));
  assert.ok(c.seedAt(point(1.5,0,0),food,palette,()=>.1));
  const founders=Array.from(c.families).filter(x=>x!==0);
  assert.deepEqual(founders.sort((a,b)=>a-b),[1,2]);
  for(let i=0;i<2;i++)c.update(food,palette,()=>.1);
  assert.ok(Array.from(c.families).includes(1));
  assert.ok(Array.from(c.families).includes(2));
  assert.ok(c.parentBirthIds.some(x=>x>0));
  assert.ok(c.families.every(x=>x===0||x===1||x===2));
});

test('family bands stay diverse across descendants yet fixed through aging',()=>{
  const founder=founderGenes(2184,1);
  for(const mode of ['brocade','strata','mutant']){
    let bands=0;
    for(let index=0;index<128;index++){
      const a=inheritedFacet(founder,1,20,{mode,strength:.8,index});
      const b=inheritedFacet(founder,1,110,{mode,strength:.8,index});
      assert.deepEqual(a,b,'birth lineages must not blink when time advances');
      bands+=Number(a.band);
    }
    assert.ok(bands>0&&bands<128,
      mode+' should show varied, genetically coherent 3D mineral banding');
  }
});
