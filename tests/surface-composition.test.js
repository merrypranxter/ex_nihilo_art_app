import test from 'node:test';
import assert from 'node:assert/strict';
import {SurfaceGrowth} from '../src/surface-growth.js';
import {GrowthEngine,PALETTES} from '../src/engine.js';
import {compositionSample,buildCompositionField,symmetricSeedPoints,
  SURFACE_BOUNDARIES,SURFACE_REGIONS,SURFACE_SEED_SYMMETRY} from '../src/surface-composition.js';

const pigment=['#ff00ff','#00ffff','#ffff22','#763aff'];
const settings={boundary:'rose',voids:.55,regions:'quilt',wrap:true,symmetry:'quad'};
const run=(options=settings)=>{
  const s=new SurfaceGrowth(880012,48);
  s.seedArrangement(20,'lattice',pigment,options);
  for(let i=0;i<12;i++)s.advance(pigment,{
    morphology:'spherulite',coverage:.99,growth:1.04,...options
  });
  return s;
};

test('composition has independent meaningful boundary, region and seed vocabularies',()=>{
  assert.equal(Object.keys(SURFACE_BOUNDARIES).length,4);
  assert.equal(Object.keys(SURFACE_REGIONS).length,3);
  assert.equal(Object.keys(SURFACE_SEED_SYMMETRY).length,4);
});
test('zero resistance leaves every physical site permitted regardless of mask choice',()=>{
  for(const boundary of Object.keys(SURFACE_BOUNDARIES)){
    const f=buildCompositionField(64,{boundary,voids:0,wrap:true});
    assert.equal(f.threshold,-1);
    assert.ok(f.gates.every(g=>g>f.threshold));
  }
});
test('distinct mathematical masks contain persistent voids, rather than a flat screen filter',()=>{
  const masks=['rose','rivers','lace'].map(boundary=>
    buildCompositionField(64,{boundary,voids:.65,wrap:true}));
  for(const field of masks){
    let blocked=0,available=0;
    for(const gate of field.gates)
      if(gate<=field.threshold)blocked++;else available++;
    assert.ok(blocked>100&&available>100);
  }
  assert.notDeepEqual(Array.from(masks[0].gates),Array.from(masks[1].gates));
  assert.notDeepEqual(Array.from(masks[1].gates),Array.from(masks[2].gates));
});
test('torus masks match at coordinate seam, with equal periodic laws',()=>{
  for(const boundary of Object.keys(SURFACE_BOUNDARIES))
    for(const regions of Object.keys(SURFACE_REGIONS)){
      const opts={boundary,regions,wrap:true};
      for(const v of [.13,.27,.64,.81]){
        assert.deepEqual(compositionSample(0,v,opts),
          compositionSample(1,v,opts));
        assert.deepEqual(compositionSample(v,0,opts),
          compositionSample(v,1,opts));
      }
    }
});
test('regional biological laws distribute all three physical morphologies',()=>{
  for(const regions of ['quilt','vortex']){
    const f=buildCompositionField(64,{regions,wrap:true});
    assert.deepEqual([...new Set(f.laws)].sort(),[0,1,2]);
  }
  const a=run({...settings,boundary:'open',voids:0,regions:'single',symmetry:'none'});
  const b=run({...settings,boundary:'open',voids:0,regions:'quilt',symmetry:'none'});
  assert.notDeepEqual(a.owner,b.owner);
});
test('nuclei symmetry plants real pairs/quartets and respects population limits',()=>{
  const points=symmetricSeedPoints(.3,.4,'quad');
  assert.equal(points.length,4);
  const s=new SurfaceGrowth(42,48);
  assert.equal(s.seedSymmetricAt(.3,.4,pigment,{symmetry:'quad'}),true);
  assert.equal(s.seeds.length,4);
  assert.equal(s.population,4);
  assert.equal(s.seedSymmetricAt(.3,.4,pigment,{symmetry:'quad'}),false);
  assert.equal(s.population,4);
  assert.ok(s.symmetric === undefined);
  const six=new SurfaceGrowth(43,48);
  assert.equal(six.seedSymmetricAt(.4,.4,pigment,{symmetry:'sixfold'}),true);
  assert.equal(six.seeds.length,6);
});
test('future physics can change without repainting or erasing existing birth history',()=>{
  const w=run(),before=w.snapshot(),pixels=new Uint8Array(w.birthColor);
  const roots=new Uint8Array(w.owner);
  w.rebuildFrontier(true,{boundary:'lace',voids:.7,regions:'vortex'});
  for(let i=0;i<6;i++)w.advance(['#ffffff','#000000'],{
    boundary:'lace',voids:.7,regions:'vortex',wrap:true,
    morphology:'strata',growth:1.2,coverage:1
  });
  for(let i=0;i<w.capacity;i++)if(roots[i]){
    assert.equal(w.owner[i],roots[i]);
    for(let c=0;c<3;c++)
      assert.equal(w.birthColor[i*3+c],pixels[i*3+c]);
  }
  assert.equal(before.seeds.length,w.seeds.length);
});
test('masked composition keeps exact deterministic snapshot replay',()=>{
  const a=run(),b=run();
  assert.deepEqual(a.snapshot(),b.snapshot());
  const restored=new SurfaceGrowth(3,48);
  restored.restore(a.snapshot());
  for(let i=0;i<6;i++){
    for(const world of [a,restored])world.advance(pigment,{
      morphology:'spherulite',growth:1.04,coverage:.99,...settings
    });
  }
  assert.deepEqual(a.snapshot(),restored.snapshot());
});
test('composition controls persist in DNA without altering the 199 palette vault',()=>{
  const w=new GrowthEngine(777);
  w.setConfig({compositionDomain:'surface',surfaceBoundary:'rivers',
    surfaceVoids:.65,surfaceRegions:'vortex',surfaceSeedSymmetry:'mirror'});
  const dna=w.getDNA(),copy=new GrowthEngine(1);
  copy.loadDNA(dna);
  for(const key of ['surfaceBoundary','surfaceVoids','surfaceRegions','surfaceSeedSymmetry'])
    assert.equal(copy.config[key],w.config[key]);
  const checkpoint=w.getCheckpoint(),other=new GrowthEngine(1);
  other.restoreCheckpoint(checkpoint);
  assert.equal(other.config.surfaceBoundary,'rivers');
  assert.equal(other.config.surfaceRegions,'vortex');
  assert.equal(Object.keys(PALETTES).length,199);
});
test('surface panel exposes all real composition controls',async()=>{
  const {readFileSync}=await import('node:fs');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  for(const id of ['surface-boundary','surface-voids','surface-regions','surface-symmetry'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(main,/seedSymmetricAt/);
  assert.match(main,/surfaceCompositionOptions\(\)/);
});
