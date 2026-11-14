import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {GrowthEngine,PALETTES} from '../src/engine.js';
import {CrystalColony} from '../src/colony.js';
import {pressureAt,validPressures,MAX_PRESSURES} from '../src/crystal-pressure.js';
import {CrystalPressureTransaction,FieldGestureTransaction} from '../src/gesture-witch.js';

const vec=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const center=[0,0,0];
const mark=(mode,strength=1.5)=>({
  id:100,mode,center,axis:[1,0,0],radius:.85,strength
});

test('all pressure laws are bounded, non-decorative and spatially localized',()=>{
  assert.deepEqual(pressureAt(vec(),[]),{birth:1,erosion:0,affected:false});
  assert.ok(pressureAt(vec(),[mark('grow')]).birth>1);
  assert.ok(pressureAt(vec(),[mark('shield')]).birth<1);
  const seam=pressureAt(vec(),[mark('cleave')]);
  const side=pressureAt(vec(.55,0,0),[mark('cleave')]);
  assert.ok(seam.birth<1&&seam.erosion>0);
  assert.ok(side.birth>1&&side.erosion<seam.erosion);
  assert.deepEqual(pressureAt(vec(8,0,0),[mark('cleave')]),
    {birth:1,erosion:0,affected:false});
  assert.ok(validPressures([mark('grow')]));
});

test('pressure truly changes synchronous CA birth statistics without prebuilt geometry',()=>{
  const field={sample:()=>1,consume:()=>{}};
  const born=(pressure)=>{
    const c=new CrystalColony(34,8);
    c.setSettings({enabled:true,growth:1,erosion:0});
    c.seedAt(vec(),field,PALETTES.acid,()=>.3);
    c.update(field,PALETTES.acid,()=>.25,null,pressure);
    return c.population;
  };
  const neutral=born(null);
  const enhanced=born([mark('grow',2)]);
  assert.equal(neutral,1);
  assert.ok(enhanced>neutral,'growth pressure must cause real lattice births');
  const withShield=(()=>{
    const c=new CrystalColony(34,8);
    c.setSettings({enabled:true,growth:1.7,erosion:0});
    c.seedAt(vec(),field,PALETTES.acid,()=>.3);
    c.update(field,PALETTES.acid,()=>.04,null,[mark('shield',2.4)]);
    return c.population;
  })();
  assert.equal(withShield,1);
});

test('cleave can erode mature crystal matter by later cellular updates, not during touch',()=>{
  const c=new CrystalColony(34,8);
  const food={sample:()=>1,consume:()=>{}};
  c.setSettings({enabled:true,growth:0,erosion:0});
  c.seedAt(vec(),food,PALETTES.acid,()=>.3);
  const idx=c.cells.findIndex(Boolean);
  c.cells[idx]=2;c.ages[idx]=12;
  const pos=c.worldPos(...c.decode(idx));
  const cleave={...mark('cleave',2.4),center:[pos.x,pos.y,pos.z]};
  assert.equal(c.population,1);
  c.update(food,PALETTES.acid,()=>.1,null,[cleave]);
  assert.equal(c.population,0);
  assert.equal(c.cells[idx],0);
});

test('mobile pressure gesture is an atomic undoable edit and pinch/twist is bounded',()=>{
  const w=new GrowthEngine(760);
  const before=w.snapshotField(),rng=w.rngState;
  let t=new CrystalPressureTransaction(w);
  t.begin('cleave',vec(.4,.1,0));
  t.move(vec(.9,.1,.5));
  t.beginLens({x:0,y:0},{x:100,y:0});
  t.lensPreview({x:0,y:0},{x:0,y:210});
  assert.ok(t.mark.radius>=.25&&t.mark.radius<=2.1);
  assert.ok(Math.abs(Math.hypot(...t.mark.axis)-1)<1e-10);
  t.cancel();
  assert.deepEqual(w.snapshotField(),before);
  assert.equal(w.rngState,rng);
  assert.equal(w.nodeUndo.length,0);
  t=new CrystalPressureTransaction(w);
  t.begin('grow',vec());
  t.move(vec(.3,0,.4));
  t.commit();
  assert.equal(w.nodeUndo.length,1);
  assert.equal(w.pressures.length,1);
  const next=w.snapshotField();
  w.undoNodes();
  assert.deepEqual(w.snapshotField(),before);
  w.redoNodes();
  assert.deepEqual(w.snapshotField(),next);
});

test('crystal pressure edits coexist with vortex and growth path undo',()=>{
  const w=new GrowthEngine(761);
  const p=new CrystalPressureTransaction(w);
  p.begin('shield',vec(.5,0,0));p.commit();
  const n=new FieldGestureTransaction(w);
  n.begin({type:'vortex',pos:vec()});n.commit();
  assert.equal(w.pressures.length,1);
  assert.equal(w.nodes.length,1);
  w.undoNodes();
  assert.equal(w.pressures.length,1);
  assert.equal(w.nodes.length,0);
  w.undoNodes();
  assert.equal(w.pressures.length,0);
  w.redoNodes();w.redoNodes();
  assert.equal(w.pressures.length,1);
  assert.equal(w.nodes.length,1);
});

test('pressure and all 199 palette options survive exact full-world replay',()=>{
  const w=new GrowthEngine(762);
  const p=new CrystalPressureTransaction(w);
  p.begin('grow',vec(.2,0,.2));p.commit();
  const q=new CrystalPressureTransaction(w);
  q.begin('cleave',vec(.5,0,.5));q.commit();
  assert.equal(Object.keys(PALETTES).length,199);
  w.colony.setSettings({enabled:true,growth:1.3});
  w.seedCrystal(vec());
  w.setConfig({palette:Object.keys(PALETTES).at(-1)});
  for(let i=0;i<160;i++)w.step(1/60);
  const save=w.getCheckpoint(),restored=new GrowthEngine(202);
  restored.restoreCheckpoint(save);
  assert.deepEqual(restored.getCheckpoint(),save);
  for(let i=0;i<60;i++){w.step(1/60);restored.step(1/60);}
  assert.deepEqual(restored.getCheckpoint(),w.getCheckpoint());
});

test('old saved world lacking pressure records remains valid, invalid field cannot erase live state',()=>{
  const w=new GrowthEngine(763);
  w.seedCrystal(vec());
  const old=w.getCheckpoint();
  delete old.pressures;delete old.dna.pressures;
  const restored=new GrowthEngine(2);
  restored.restoreCheckpoint(old);
  assert.deepEqual(restored.pressures,[]);
  const before=w.getCheckpoint();
  const invalid=JSON.parse(JSON.stringify(before));
  invalid.pressures=[{...mark('grow'),radius:999}];
  assert.throws(()=>w.restoreCheckpoint(invalid));
  assert.deepEqual(w.getCheckpoint(),before);
  const malformed=[...Array(MAX_PRESSURES+1)].map((_,i)=>({...mark('shield'),id:i}));
  assert.equal(validPressures(malformed),false);
});
