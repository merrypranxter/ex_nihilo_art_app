import test from 'node:test';
import assert from 'node:assert/strict';
import {GrowthEngine,PALETTES} from '../src/engine.js';
import {MATHEMAGICAL_VAULT} from '../src/palette-vault.js';
import {PALETTE_CATALOG,PALETTE_NAMES,isPaletteStops,filteredPalettes} from '../src/palettes.js';

test('all 194 source-authored palettes plus five original EX NIHILO palettes remain exact',()=>{
  assert.equal(MATHEMAGICAL_VAULT.palettes.length,194);
  assert.equal(PALETTE_CATALOG.length,199);
  assert.equal(Object.keys(PALETTES).length,199);
  const ids=PALETTE_CATALOG.map(p=>p.id);
  assert.equal(new Set(ids).size,199);
  for(const p of MATHEMAGICAL_VAULT.palettes){
    assert.deepEqual(PALETTES['vault:'+p.id],p.colors);
    assert.equal(PALETTE_NAMES['vault:'+p.id],p.name);
    assert.ok(p.colors.length>=2&&p.colors.length<=12);
  }
});

test('palettes are searchable by source/name and accept individual swatch edits',()=>{
  const searched=filteredPalettes('otherspace ii');
  assert.ok(searched.length>=14);
  assert.ok(searched.every(p=>p.name.toLowerCase().includes('otherspace ii')));
  assert.ok(isPaletteStops(null));
  assert.ok(isPaletteStops(['#010101','#aabbcc']));
  assert.equal(isPaletteStops(['#fff','#aabbcc']),false);
  assert.equal(isPaletteStops(['#010101']),false);
  assert.equal(isPaletteStops(['#000000','#ffffff','huh']),false);
});

test('choosing or editing a vault palette never recolors old deposited material',()=>{
  const world=new GrowthEngine(370);
  for(let i=0;i<100;i++)world.step(1/60);
  const oldColors=Array.from(world.segmentColors.subarray(0,world.segmentCount*3));
  const id='vault:'+MATHEMAGICAL_VAULT.palettes[77].id;
  world.setConfig({palette:id,paletteStops:null});
  assert.equal(world.currentPalette().length,MATHEMAGICAL_VAULT.palettes[77].colors.length);
  const original=[...world.currentPalette()];
  const edited=[...original];
  edited[0]='#123abc';
  world.setConfig({paletteStops:edited});
  assert.equal(world.currentPalette()[0],'#123abc');
  assert.deepEqual(Array.from(world.segmentColors.subarray(0,world.segmentCount*3)),oldColors);
  assert.equal(PALETTES[id][0],original[0]);
  world.setConfig({paletteStops:null});
  assert.deepEqual(world.currentPalette(),original);
});

test('palette overrides and source IDs survive construction DNA and exact world replay',()=>{
  const world=new GrowthEngine(371);
  const id='vault:'+MATHEMAGICAL_VAULT.palettes.at(-1).id;
  world.setConfig({palette:id,paletteStops:['#0099ff','#ff6600','#33cc22']});
  for(let i=0;i<120;i++)world.step(1/60);
  const state=world.getCheckpoint();
  const other=new GrowthEngine(2);
  other.restoreCheckpoint(state);
  assert.deepEqual(other.getCheckpoint(),state);
  for(let i=0;i<35;i++){other.step(1/60);world.step(1/60);}
  assert.deepEqual(other.getCheckpoint(),world.getCheckpoint());
  const dna=world.getDNA();
  assert.equal(dna.config.palette,id);
  assert.deepEqual(dna.config.paletteStops,['#0099ff','#ff6600','#33cc22']);
});

test('bad saved color overrides reject before mutating live artwork',()=>{
  const world=new GrowthEngine(372);
  for(let i=0;i<30;i++)world.step(1/60);
  const baseline=world.getCheckpoint();
  const broken=JSON.parse(JSON.stringify(baseline));
  broken.dna.config.paletteStops=['#short','not-a-color'];
  assert.throws(()=>world.restoreCheckpoint(broken));
  assert.deepEqual(world.getCheckpoint(),baseline);
});
