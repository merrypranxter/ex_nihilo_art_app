import test from 'node:test';
import assert from 'node:assert/strict';
import {GrowthEngine,PALETTES} from '../src/engine.js';
import {SurfaceGrowth,surfacePixels,SURFACE_SIZE,
  SURFACE_MORPHOLOGIES,SURFACE_NUCLEATION} from '../src/surface-growth.js';

const pigment=['#ff00ff','#00ffff','#fcea00','#ad4dff','#ff5520'];
const params=(morphology,wrap=true)=>({
  morphology,wrap,growth:.94,coverage:.98
});
const setup=(mode='spherulite',wrap=true,size=48)=>{
  const world=new SurfaceGrowth(12001,size);
  world.seedArrangement(15,'lattice',pigment);
  for(let i=0;i<14;i++)world.advance(pigment,params(mode,wrap));
  return world;
};

test('Surface is a separate 2D 192-square CA with three actual laws',()=>{
  assert.equal(SURFACE_SIZE,192);
  assert.equal(Object.keys(SURFACE_MORPHOLOGIES).length,3);
  assert.equal(Object.keys(SURFACE_NUCLEATION).length,4);
  const s=setup();
  assert.ok(s.population>15);
  assert.ok(new Set(s.owner).size>2);
  assert.ok(s.age.some(x=>x>0));
});

test('spherulites, dendrites and geological strata have distinct physical occupancy histories',()=>{
  const scenes=Object.keys(SURFACE_MORPHOLOGIES).map(mode=>
    Array.from(setup(mode).owner));
  assert.notDeepEqual(scenes[0],scenes[1]);
  assert.notDeepEqual(scenes[0],scenes[2]);
});

test('different nucleation grammars create different real root coordinates',()=>{
  const roots=Object.keys(SURFACE_NUCLEATION).map(grammar=>{
    const s=new SurfaceGrowth(553,64);
    s.seedArrangement(20,grammar,pigment);
    return s.seeds.map(v=>[v.x,v.y]);
  });
  for(let i=1;i<roots.length;i++)assert.notDeepEqual(roots[0],roots[i]);
});

test('periodic lattice connects opposite edges as actual CA neighbors',()=>{
  const s=new SurfaceGrowth(6,32);
  const left=15*32;
  const right=31+15*32;
  let wrapSeen=false,openSeen=false;
  s.neighbors(left,true,i=>{if(i===right)wrapSeen=true;});
  s.neighbors(left,false,i=>{if(i===right)openSeen=true;});
  assert.equal(wrapSeen,true);
  assert.equal(openSeen,false);
});

test('birth pigments and territories are frozen after palette changes',()=>{
  const s=setup();
  const before=Array.from(s.birthColor);
  const occupied=Array.from(s.owner);
  const other=['#000000','#ffffff'];
  for(let i=0;i<5;i++)s.advance(other,params('spherulite'));
  for(let i=0;i<s.capacity;i++){
    if(!occupied[i])continue;
    assert.deepEqual(Array.from(s.birthColor.slice(i*3,i*3+3)),
      before.slice(i*3,i*3+3));
    assert.equal(s.owner[i],occupied[i]);
  }
});

test('pure display can change contrast without touching physical colors or ancestry',()=>{
  const s=setup();
  const snapshot=s.snapshot();
  const a=surfacePixels(s,{contrast:0,wrap:true});
  const b=surfacePixels(s,{contrast:1.5,wrap:true});
  assert.equal(a.length,s.capacity*4);
  assert.ok(a.some((v,i)=>v!==b[i]));
  assert.ok(a.every((v,i)=>i%4===3?v===255:true));
  assert.deepEqual(s.snapshot(),snapshot);
});

test('snapshot persists exact frontier order and continues deterministically',()=>{
  for(const morphology of Object.keys(SURFACE_MORPHOLOGIES)){
    const a=setup(morphology);
    const saved=a.snapshot(),b=new SurfaceGrowth(9,48);
    b.restore(saved);
    assert.deepEqual(b.snapshot(),saved);
    for(let i=0;i<10;i++){
      a.advance(pigment,params(morphology));
      b.advance(pigment,params(morphology));
    }
    assert.deepEqual(b.snapshot(),a.snapshot());
  }
});

test('corrupt surface files are rejected before live matter is changed',()=>{
  const a=setup(),saved=a.snapshot();
  const bad=structuredClone(saved);
  bad.owner[20]=199;
  assert.throws(()=>a.restore(bad));
  assert.deepEqual(a.snapshot(),saved);
  const partial=structuredClone(saved);
  partial.frontier=[...saved.frontier, ...saved.frontier.slice(0,1)];
  assert.throws(()=>a.restore(partial));
  assert.deepEqual(a.snapshot(),saved);
});

test('full GrowthEngine checkpoint includes 2D history and restores identical future growth',()=>{
  const w=new GrowthEngine(5529);
  w.setConfig({compositionDomain:'surface',surfaceSeedCount:18,
    surfaceNucleation:'radial',surfaceMorphology:'strata',
    surfaceWrap:true,surfaceGrowth:1.2,surfaceCoverage:.98});
  w.surface.seedArrangement(18,'radial',w.currentPalette());
  for(let i=0;i<8;i++)
    w.surface.advance(w.currentPalette(),{
      morphology:w.config.surfaceMorphology,wrap:w.config.surfaceWrap,
      growth:w.config.surfaceGrowth,coverage:w.config.surfaceCoverage
    });
  const checkpoint=w.getCheckpoint(),copy=new GrowthEngine(60);
  copy.restoreCheckpoint(checkpoint);
  assert.deepEqual(copy.getCheckpoint(),checkpoint);
  for(let i=0;i<10;i++){
    w.surface.advance(w.currentPalette(),w.config);
    copy.surface.advance(copy.currentPalette(),{
      morphology:copy.config.surfaceMorphology,wrap:copy.config.surfaceWrap,
      growth:copy.config.surfaceGrowth,coverage:copy.config.surfaceCoverage
    });
  }
  assert.deepEqual(copy.getCheckpoint(),w.getCheckpoint());
  assert.equal(Object.keys(PALETTES).length,199);
});

test('old checkpoints load original object domain and an empty new surface',()=>{
  const previous=new GrowthEngine(5540).getCheckpoint();
  delete previous.surface;
  for(const prop of ['compositionDomain','surfaceMorphology','surfaceNucleation',
    'surfaceSeedCount','surfaceGrowth','surfaceCoverage','surfaceSpeed',
    'surfaceContrast','surfaceWrap'])delete previous.dna.config[prop];
  const copy=new GrowthEngine(100);
  copy.restoreCheckpoint(previous);
  assert.equal(copy.config.compositionDomain,'object');
  assert.equal(copy.surface.population,0);
  assert.equal(copy.config.surfaceWrap,false);
});

test('switching growth domains does not reset or mutate 3D organism state',()=>{
  const w=new GrowthEngine(5528);
  const before=w.getCheckpoint();
  w.setConfig({compositionDomain:'surface'});
  w.surface.seedArrangement(22,'lattice',w.currentPalette());
  for(let i=0;i<10;i++)w.surface.advance(w.currentPalette(),params('spherulite'));
  assert.deepEqual(w.colony.snapshot(),before.colony);
  assert.deepEqual(Array.from(w.nutrients.values),before.nutrients);
  assert.equal(w.rngState,before.rngState);
  assert.deepEqual(w.segmentCount,before.segmentCount);
});

test('DOM exposes separate surface canvas, independent reseed and PNG export',()=>{
  // We deliberately never create a second Three.js scene or automatically
  // route OBJ/3D touch edits onto the new 2D canvas.
  const {readFileSync}=await import('node:fs');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(html,/id="surface-canvas"/);
  assert.match(html,/data-tab="surface"/);
  assert.match(html,/id="surface-reseed"/);
  assert.match(source,/surfaceCanvas\.addEventListener\('pointerdown'/);
  assert.match(source,/surfacePixelsCanvas/);
  assert.match(source,/exportSurfacePNG\(\)/);
});
