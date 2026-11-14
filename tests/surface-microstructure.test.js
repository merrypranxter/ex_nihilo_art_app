import test from 'node:test';
import assert from 'node:assert/strict';
import {SurfaceGrowth,surfacePixels} from '../src/surface-growth.js';
import {SurfaceGestureEditor} from '../src/surface-gesture-field.js';
import {GrowthEngine,PALETTES} from '../src/engine.js';
import {SURFACE_MICROSTRUCTURES,forEachMineralMicrofeature,
  paintSurfaceMicrostructure} from '../src/surface-microstructure.js';
import {surfaceOpticsPixels} from '../src/surface-optics.js';

const palette=['#ff00ff','#00ffaa','#ffe900','#673fff'];
const setup=(size=48)=>{
  const w=new SurfaceGrowth(4001,size);
  w.seedArrangement(15,'lattice',palette,{});
  for(let i=0;i<14;i++)w.advance(palette,{
    growth:1.2,coverage:.96,morphology:'spherulite',wrap:false
  });
  return w;
};
const strokes=(w,mode,density=.85,quality='export')=>{
  const out=[];
  const count=forEachMineralMicrofeature(w,{mode,density,quality},v=>out.push(v));
  assert.equal(count,out.length);
  return out;
};

test('three structurally distinct subcell materials and exact OFF pass',()=>{
  assert.deepEqual(Object.keys(SURFACE_MICROSTRUCTURES),
    ['off','lamella','cleavage','vesicle']);
  const w=setup();
  assert.equal(strokes(w,'off').length,0);
  assert.ok(strokes(w,'lamella').length>0);
  assert.ok(strokes(w,'cleavage').length>0);
  assert.ok(strokes(w,'vesicle').length>0);
});
test('all microstructures live inside real retained occupied CA cells',()=>{
  const w=setup();
  for(const mode of ['lamella','cleavage','vesicle'])
    for(const feature of strokes(w,mode)){
      assert.ok(w.owner[feature.cell]>0);
      for(const coord of ['x1','x2','y1','y2']){
        assert.ok(Number.isFinite(feature[coord]));
        assert.ok(feature[coord]>=.04&&feature[coord]<=.96);
      }
    }
});
test('one surface and parameter set produce exactly reproducible geometry',()=>{
  const w=setup(),a=strokes(w,'vesicle'),b=strokes(w,'vesicle');
  assert.deepEqual(a,b);
  const checkpoint=w.snapshot(),restored=new SurfaceGrowth(7,48);
  restored.restore(checkpoint);
  assert.deepEqual(strokes(restored,'vesicle'),a);
});
test('microstructures respond to different genealogy and family phases, not palette recolors',()=>{
  const a=setup(),b=setup();
  assert.deepEqual(strokes(a,'lamella'),strokes(b,'lamella'));
  b.seeds[0].angle+=.5;
  assert.notDeepEqual(strokes(a,'lamella'),strokes(b,'lamella'));
  const baseline=strokes(a,'lamella');
  a.birthColor.fill(220);
  assert.deepEqual(strokes(a,'lamella'),baseline);
});
test('mode differences are geometric, not three names for the same noise',()=>{
  const w=setup();
  const modes=['lamella','cleavage','vesicle'];
  const paths=modes.map(mode=>strokes(w,mode).map(v=>
    [v.cell,v.x1,v.y1,v.x2,v.y2]));
  for(let i=0;i<paths.length;i++)for(let j=0;j<i;j++)
    assert.notDeepEqual(paths[i],paths[j]);
});
test('preview uses bounded samples and export computes finer real-cell geometry',()=>{
  const w=setup(192);
  const preview=strokes(w,'lamella',.85,'preview');
  const full=strokes(w,'lamella',.85,'export');
  assert.ok(full.length>preview.length);
});
test('painting is a non-destructive vector pass with no secret simulation advance',()=>{
  const w=setup(),checkpoint=w.snapshot();
  let line=0,stroked=0;
  const ctx={
    save(){},restore(){},beginPath(){},moveTo(){line++;},
    lineTo(){},stroke(){stroked++;},set lineCap(v){},
    set strokeStyle(v){},set lineWidth(v){}
  };
  const n=paintSurfaceMicrostructure(ctx,w,{
    mode:'cleavage',density:.75,quality:'export',size:2048});
  assert.ok(n>100);
  assert.equal(line,n);
  assert.ok(stroked>=1&&stroked<=2);
  assert.deepEqual(w.snapshot(),checkpoint);
  assert.equal(paintSurfaceMicrostructure(ctx,w,{mode:'off'}),0);
});
test('full physical spectral coating does not mutate pigments or growth data',()=>{
  const w=setup(),before=w.snapshot();
  const base=surfacePixels(w,{background:'#05060c'});
  const off=surfaceOpticsPixels(w,base,{mode:'off'});
  assert.deepEqual(off,base);
  const spectral=surfaceOpticsPixels(w,base,{
    mode:'spectral',strength:.9,thickness:410,
    filmIndex:1.58,substrateIndex:1.78,polarization:.4
  });
  assert.notDeepEqual(spectral,base);
  assert.deepEqual(w.snapshot(),before);
  for(let i=0;i<w.capacity;i++){
    if(!w.owner[i])for(let c=0;c<4;c++)
      assert.equal(spectral[i*4+c],base[i*4+c]);
  }
});
test('Gesture Witch and optics remain orthogonal to independent microstructure modes',()=>{
  const w=setup(),ed=new SurfaceGestureEditor(w);
  assert.equal(ed.begin('guide',.2,.3,{palette,seedOptions:{wrap:false}}),true);
  ed.move(.7,.6);
  assert.equal(ed.commit(),true);
  const before=w.snapshot();
  strokes(w,'lamella');strokes(w,'cleavage');strokes(w,'vesicle');
  assert.deepEqual(w.snapshot(),before);
  assert.equal(ed.undo(),true);
  assert.equal(w.marks.length,0);
});
test('DNA and checkpoint preserve new material settings, older saves are OFF',()=>{
  const w=new GrowthEngine(701);
  w.setConfig({compositionDomain:'surface',
    surfaceMicroMode:'vesicle',surfaceMicroDensity:.45,
    surfaceOpticsMode:'spectral',surfaceFilmIndex:1.62,
    surfaceSubstrateIndex:1.83,surfacePolarization:.2});
  const copy=new GrowthEngine(1);copy.loadDNA(w.getDNA());
  for(const key of ['surfaceMicroMode','surfaceMicroDensity','surfaceOpticsMode',
    'surfaceFilmIndex','surfaceSubstrateIndex','surfacePolarization'])
    assert.equal(copy.config[key],w.config[key]);
  const world=new GrowthEngine(2);
  world.restoreCheckpoint(w.getCheckpoint());
  assert.equal(world.config.surfaceMicroMode,'vesicle');
  assert.equal(world.config.surfaceOpticsMode,'spectral');
  const legacy=structuredClone(w.getDNA());
  for(const key of ['surfaceMicroMode','surfaceMicroDensity','surfaceFilmIndex',
    'surfaceSubstrateIndex','surfacePolarization'])
    delete legacy.config[key];
  copy.loadDNA(legacy);
  assert.equal(copy.config.surfaceMicroMode,'off');
  assert.equal(copy.config.surfaceFilmIndex,1.46);
  assert.equal(Object.keys(PALETTES).length,199);
});
test('Surface Art has new UI and native-resolution vector export wiring',async()=>{
  const {readFileSync}=await import('node:fs');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  for(const id of ['surface-micro-mode','surface-micro-density','surface-film-index',
    'surface-substrate-index','surface-polarization'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(main,/paintSurfaceMicrostructure\(ctx,engine\.surface/);
  assert.match(main,/quality:'export'/);
  assert.match(main,/quality:'preview'/);
  assert.match(main,/surfaceOpticsPixels\(engine\.surface,base/);
});
