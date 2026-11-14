import test from 'node:test';
import assert from 'node:assert/strict';
import {SurfaceGrowth,surfacePixels} from '../src/surface-growth.js';
import {surfaceOpticsPixels,opticalLight,dielectricInterference,
  SURFACE_OPTICS,SURFACE_OPTICS_LOOPS} from '../src/surface-optics.js';
import {GrowthEngine,PALETTES} from '../src/engine.js';

const palette=['#ff2dff','#00ffd0','#ffea18','#7745ff','#ff7740'];
const setup=(wrap=true)=>{
  const s=new SurfaceGrowth(987654,48);
  s.seedArrangement(18,'lattice',palette,{wrap});
  for(let i=0;i<17;i++)s.advance(palette,{
    morphology:'spherulite',wrap,growth:1.25,coverage:.96
  });
  return s;
};
const render=(s,mode='opal',options={})=>{
  const background='#120823';
  const base=surfacePixels(s,{background,wrap:true,contrast:.8});
  return surfaceOpticsPixels(s,base,{
    mode,background,wrap:true,strength:.85,thickness:340,
    roughness:.25,angle:42,...options
  });
};

test('five optics finishes plus original view with independent loop choices',()=>{
  assert.deepEqual(Object.keys(SURFACE_OPTICS),
    ['off','opal','prism','quartz','frost','ghost']);
  assert.deepEqual(SURFACE_OPTICS_LOOPS,[4,8,12]);
});
test('the original finish reproduces original pixels byte for byte',()=>{
  const surface=setup(),base=surfacePixels(surface,{background:'#120823',wrap:true,contrast:.8});
  const out=surfaceOpticsPixels(surface,base,{mode:'off'});
  assert.deepEqual(out,base);
  assert.notStrictEqual(out,base);
});
test('zero intensity is a no-op for all finishes',()=>{
  const s=setup(),base=surfacePixels(s,{background:'#120823',wrap:true,contrast:.8});
  for(const mode of Object.keys(SURFACE_OPTICS))
    assert.deepEqual(surfaceOpticsPixels(s,base,{mode,strength:0}),base);
});
test('all five materials produce different colored surfaces from the same actual growth',()=>{
  const s=setup(),original=render(s,'off');
  const pictures=Object.keys(SURFACE_OPTICS).filter(m=>m!=='off')
    .map(m=>render(s,m));
  for(const out of pictures)assert.notDeepEqual(out,original);
  for(let i=0;i<pictures.length;i++)
    for(let j=0;j<i;j++)assert.notDeepEqual(pictures[i],pictures[j]);
});
test('optics leave all empty space and the input RGBA unchanged',()=>{
  const s=setup(),original=render(s,'off');
  const before=new Uint8ClampedArray(original);
  for(const mode of Object.keys(SURFACE_OPTICS)){
    const out=surfaceOpticsPixels(s,original,{mode,strength:1,wrap:true});
    assert.deepEqual(original,before);
    assert.ok(out.every((v,i)=>i%4===3?v===255:true));
    for(let i=0;i<s.capacity;i++){
      if(s.owner[i]!==0)continue;
      for(let c=0;c<4;c++)assert.equal(out[i*4+c],original[i*4+c]);
    }
  }
});
test('spectral bands are bounded, optically dependent on thickness, and repeat by phase',()=>{
  const thin=dielectricInterference(240,.9,1.46);
  const thick=dielectricInterference(560,.9,1.46);
  assert.notDeepEqual(thin,thick);
  assert.equal(thin.length,3);
  assert.ok([...thin,...thick].every(v=>v>=0&&v<=1));
  const s=setup();
  const a=render(s,'opal',{phase:0}),b=render(s,'opal',{phase:2*Math.PI});
  assert.deepEqual(a,b);
  assert.notDeepEqual(render(s,'opal',{thickness:650}),a);
});
test('animated light responds to phase without changing mineral chemistry',()=>{
  const s=setup(),snapshot=s.snapshot();
  const a=render(s,'quartz',{phase:0});
  const b=render(s,'quartz',{phase:Math.PI/2});
  assert.notDeepEqual(a,b);
  assert.deepEqual(s.snapshot(),snapshot);
});
test('all finishes tolerate real edge sites with non-periodic and wrapped neighbors',()=>{
  for(const wrap of [false,true]){
    const s=setup(wrap);
    for(const mode of Object.keys(SURFACE_OPTICS)){
      const base=surfacePixels(s,{wrap,background:'#120823'});
      const out=surfaceOpticsPixels(s,base,{mode,wrap});
      assert.equal(out.length,s.capacity*4);
      assert.ok(out.every(v=>Number.isFinite(v)));
    }
  }
});
test('rendering has no effect on checkpoint ownership, age, live fronts or RNG',()=>{
  const s=setup(),checkpoint=s.snapshot();
  for(const mode of Object.keys(SURFACE_OPTICS))
    for(let tick=0;tick<3;tick++)render(s,mode,{phase:tick*Math.PI/3});
  assert.deepEqual(s.snapshot(),checkpoint);
  const restored=new SurfaceGrowth(4,48);
  restored.restore(checkpoint);
  assert.deepEqual(render(restored,'opal'),render(s,'opal'));
});
test('full world saves keep light preferences while old DNA restores no optics',()=>{
  const world=new GrowthEngine(74);
  world.setConfig({compositionDomain:'surface',surfaceOpticsMode:'ghost',
    surfaceOpticsStrength:.95,surfaceOpticsThickness:540,
    surfaceOpticsRoughness:.6,surfaceOpticsAngle:225,
    surfaceOpticsMotion:true,surfaceOpticsLoop:12});
  const dna=world.getDNA(),copy=new GrowthEngine(9);
  copy.loadDNA(dna);
  for(const key of ['surfaceOpticsMode','surfaceOpticsStrength','surfaceOpticsThickness',
    'surfaceOpticsRoughness','surfaceOpticsAngle','surfaceOpticsMotion','surfaceOpticsLoop'])
    assert.equal(copy.config[key],world.config[key]);
  const restored=new GrowthEngine(10);
  restored.restoreCheckpoint(world.getCheckpoint());
  assert.equal(restored.config.surfaceOpticsMode,'ghost');
  assert.equal(restored.config.surfaceOpticsLoop,12);
  const old=structuredClone(dna);
  for(const key of ['surfaceOpticsMode','surfaceOpticsStrength','surfaceOpticsThickness',
    'surfaceOpticsRoughness','surfaceOpticsAngle','surfaceOpticsMotion','surfaceOpticsLoop'])
    delete old.config[key];
  copy.loadDNA(old);
  assert.equal(copy.config.surfaceOpticsMode,'off');
  assert.equal(Object.keys(PALETTES).length,199);
});
test('Surface Art panel and preview/export pipeline use the optics module',async()=>{
  const {readFileSync}=await import('node:fs');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  for(const id of ['surface-optics-mode','surface-optics-strength',
    'surface-optics-thickness','surface-optics-roughness',
    'surface-optics-angle','surface-optics-loop',
    'surface-optics-motion','surface-optics-restart'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(main,/surfaceOpticsPixels\(engine\.surface,base/);
  assert.match(main,/function exportSurfacePNG\(\)/);
  assert.match(main,/drawSurface\(\);/);
});
