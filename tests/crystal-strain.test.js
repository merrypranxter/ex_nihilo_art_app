import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {CrystalColony} from '../src/colony.js';
import {GrowthEngine,PALETTES} from '../src/engine.js';
import {tickCrystalStrain,strainSourceAt} from '../src/crystal-strain.js';
import {pressureAt} from '../src/crystal-pressure.js';
import {CrystalPressureTransaction} from '../src/gesture-witch.js';

const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const stress=(strength=2.4,radius=.45)=>({
  id:1,mode:'strain',center:[0,0,0],axis:[1,0,0],radius,strength
});
const food={sample:()=>1,consume:()=>{}};
const palette=PALETTES.acid;

test('stress source is genuinely local and does not fake instant CA birth',()=>{
  const mark=stress();
  assert.ok(strainSourceAt(V(),[mark])>2);
  assert.equal(strainSourceAt(V(5,0,0),[mark]),0);
  assert.equal(strainSourceAt(V(),[{...mark,mode:'grow'}]),0);
  assert.deepEqual(pressureAt(V(),[mark]),{birth:1,erosion:0,affected:true});
});

test('strain transfers through face-connected crystals, not diagonal air or disconnected lattice',()=>{
  const n=9,len=n**3,index=(x,y,z)=>x+n*(y+n*z);
  const cells=new Uint8Array(len),ages=new Uint8Array(len);
  const strain=new Float32Array(len),damage=new Uint8Array(len);
  const next=new Float32Array(len);
  const center=index(4,4,4),neighbor=index(5,4,4),diagonal=index(5,5,4);
  const remote=index(7,4,4);
  for(const i of [center,neighbor,diagonal,remote])cells[i]=2;
  strain[center]=.8;
  tickCrystalStrain({cells,ages,strain,damage,next,
    size:n,extent:9,marks:[],transfer:.24,breakThreshold:1.2});
  assert.ok(strain[neighbor]>0,'neighbor receives stress by physical contact');
  assert.equal(strain[diagonal],0,'no diagonal transport without occupied face');
  assert.equal(strain[remote],0,'no transport across void');
});

test('mineralization makes actual cracks and then permanent missing cells on future CA ticks',()=>{
  const c=new CrystalColony(34,8);
  c.setSettings({enabled:true,growth:0,erosion:0,strainEnabled:true,
    strainTransfer:.15,breakThreshold:.63});
  assert.ok(c.seedAt(V(),food,palette,()=>.15));
  const i=c.cells.findIndex(Boolean);
  const p=c.worldPos(...c.decode(i));
  // A viable crystal body: strain can fracture its interior without
  // annihilating an isolated seed before the organism gets to grow.
  const [cx,cy,cz]=c.decode(i);
  for(const [dx,dy,dz] of [
    [1,0,0],[-1,0,0],[0,1,0],[0,-1,0],
    [0,0,1],[0,0,-1],[1,1,0],[1,0,1],[0,1,1],
    [-1,-1,0],[0,-1,-1]
  ]){
    const pos=c.worldPos(cx+dx,cy+dy,cz+dz);
    assert.ok(c.seedAt(pos,food,palette,()=>.15));
  }
  const mark={...stress(2.4,.45),center:[p.x,p.y,p.z]};
  let cracked=false;
  for(let k=0;k<18;k++){
    c.update(food,palette,()=>.5,null,[mark]);
    if(c.damage[i]===1)cracked=true;
    if(c.damage[i]===2)break;
  }
  assert.ok(cracked,'cracks must emerge before shattering');
  const firstBroken=c.damage.findIndex(n=>n===2);
  assert.ok(firstBroken>=0,'part of the stressed crystal actually broke');
  assert.equal(c.cells[firstBroken],0);
  assert.ok(c.population>=8,'protected living crystal nucleus remains');
  const scarPos=c.worldPos(...c.decode(firstBroken));
  assert.equal(c.seedAt(scarPos,food,palette,()=>.15),false,
    'fracture scar must block automatic re-growth at the split');
});

test('fracture memory is optional, with older crystal states staying on historical CA law',()=>{
  const world=new GrowthEngine(1801);
  world.colony.setSettings({enabled:true,growth:0,erosion:0,strainEnabled:true});
  world.seedCrystal(V());
  const old=world.getCheckpoint();
  delete old.colony.strain;
  delete old.colony.damage;
  delete old.colony.settings.strainEnabled;
  delete old.colony.settings.strainTransfer;
  delete old.colony.settings.breakThreshold;
  delete old.dna.colony.strainEnabled;
  delete old.dna.colony.strainTransfer;
  delete old.dna.colony.breakThreshold;
  const copy=new GrowthEngine(5);
  copy.restoreCheckpoint(old);
  assert.equal(copy.colony.settings.strainEnabled,false);
  assert.ok(copy.colony.strain.every(x=>x===0));
  assert.ok(copy.colony.damage.every(x=>x===0));
  const mark=new CrystalPressureTransaction(copy);
  mark.begin('strain',V());mark.commit();
  for(let i=0;i<180;i++)copy.step(1/60);
  assert.equal(copy.colony.damage.some(x=>x>0),false,
    'old crystal worlds cannot silently acquire new damage');
  copy.colony.setSettings({strainEnabled:true});
  for(let i=0;i<180;i++)copy.step(1/60);
  assert.ok(copy.colony.damage.some(x=>x>0),
    'artist can explicitly opt the old world into new fracture physics');
});

test('fracture fields, scars and full 199-color vault survive exact continued simulation',()=>{
  const w=new GrowthEngine(1802);
  w.colony.setSettings({enabled:true,growth:1.1,erosion:0,
    strainEnabled:true,breakThreshold:.72});
  const s=new CrystalPressureTransaction(w);
  s.begin('strain',V());s.commit();
  w.seedCrystal(V());
  w.setConfig({palette:Object.keys(PALETTES).at(-1)});
  assert.equal(Object.keys(PALETTES).length,199);
  for(let i=0;i<360;i++)w.step(1/60);
  const snapshot=w.getCheckpoint(),copy=new GrowthEngine(7);
  copy.restoreCheckpoint(snapshot);
  assert.deepEqual(copy.getCheckpoint(),snapshot);
  assert.ok(w.colony.damage.some(x=>x>0));
  for(let i=0;i<75;i++){w.step(1/60);copy.step(1/60);}
  assert.deepEqual(copy.getCheckpoint(),w.getCheckpoint());
});

test('corrupt fracture history is rejected before damaging the current living world',()=>{
  const w=new GrowthEngine(1803);
  w.colony.setSettings({enabled:true,strainEnabled:true});
  w.seedCrystal(V());
  for(let i=0;i<20;i++)w.step(1/60);
  const before=w.getCheckpoint();
  const bogus=JSON.parse(JSON.stringify(before));
  bogus.colony.strain[0]=9.3;
  assert.throws(()=>w.restoreCheckpoint(bogus));
  assert.deepEqual(w.getCheckpoint(),before);
  const bogus2=JSON.parse(JSON.stringify(before));
  bogus2.colony.damage[0]=2;
  bogus2.colony.cells[0]=1;
  assert.throws(()=>w.restoreCheckpoint(bogus2));
  assert.deepEqual(w.getCheckpoint(),before);
});

test('turning the crystal colony off freezes existing cracks without erasing them',()=>{
  const c=new CrystalColony(34,8);
  c.setSettings({enabled:true,growth:0,erosion:0,strainEnabled:true,
    breakThreshold:1.2});
  c.seedAt(V(),food,palette,()=>.1);
  const cell=c.cells.findIndex(Boolean);
  const p=c.worldPos(...c.decode(cell));
  for(let i=0;i<5;i++)c.update(food,palette,()=>.5,null,[
    {...stress(1.5,.5),center:[p.x,p.y,p.z]}
  ]);
  const frozen=c.snapshot();
  c.setSettings({enabled:false});
  for(let i=0;i<20;i++)c.update(food,palette,()=>.5,null,[]);
  assert.deepEqual(c.strain,Float32Array.from(frozen.strain));
  assert.deepEqual(c.damage,Uint8Array.from(frozen.damage));
});
