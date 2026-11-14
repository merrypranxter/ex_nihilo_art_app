import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {GrowthEngine,PALETTES} from '../src/engine.js';
import {
  METAMORPHOSIS_STAGES,METAMORPHOSIS_PRESETS,
  mineralLifeStage,mineralStageMaterials,isMineralMetamorphosisActive
} from '../src/mineral-metamorphosis.js';

const voxel=(opts={})=>({
  occupied:true,mature:true,age:44,strain:0,damage:0,fractureFaces:0,...opts
});
const c={maturity:28,stress:.45};

test('age physically classifies live crystals, not elapsed animation time',()=>{
  assert.equal(mineralLifeStage(voxel({occupied:false}),c),null);
  assert.equal(mineralLifeStage(voxel({mature:false,age:80}),c),'young');
  assert.equal(mineralLifeStage(voxel({age:27}),c),'young');
  assert.equal(mineralLifeStage(voxel({age:28}),c),'mature');
  assert.equal(mineralLifeStage(voxel({age:255}),c),'mature');
  assert.equal(mineralLifeStage(voxel({age:100}),{maturity:96,stress:.45}),'mature');
  assert.equal(mineralLifeStage(voxel({age:60}),{maturity:96,stress:.45}),'young');
});
test('actual damage, carried stress and missing fracture-neighbor cells cause fault optics',()=>{
  assert.equal(mineralLifeStage(voxel({age:1,damage:1}),c),'fault');
  assert.equal(mineralLifeStage(voxel({age:3,strain:.45}),c),'fault');
  assert.equal(mineralLifeStage(voxel({age:255,fractureFaces:2}),c),'fault');
  assert.equal(mineralLifeStage(voxel({age:255,strain:.44}),c),'mature');
  assert.equal(mineralLifeStage(voxel({age:3,strain:.44}),c),'young');
});
test('presets use three genuinely distinct physical material configurations',()=>{
  assert.deepEqual(METAMORPHOSIS_STAGES,['young','mature','fault']);
  assert.equal(Object.keys(METAMORPHOSIS_PRESETS).length,4);
  assert.equal(mineralStageMaterials('off'),null);
  for(const mode of ['subtle','opaline','feral']){
    const cfg=mineralStageMaterials(mode);
    assert.deepEqual(Object.keys(cfg),METAMORPHOSIS_STAGES);
    const distinct=METAMORPHOSIS_STAGES.map(k=>
      JSON.stringify([cfg[k].roughness,cfg[k].metalness,cfg[k].iridescence,
      cfg[k].iridescenceThicknessRange]));
    assert.equal(new Set(distinct).size,3);
    for(const material of Object.values(cfg)){
      assert.ok(material.roughness>=0&&material.roughness<=1);
      assert.ok(material.metalness>=0&&material.metalness<=1);
      assert.ok(material.iridescence>=0&&material.iridescence<=1);
    }
  }
  assert.equal(mineralStageMaterials('constructor'),null);
  assert.equal(isMineralMetamorphosisActive({preset:'off'}),false);
  assert.equal(isMineralMetamorphosisActive({preset:'opaline'}),true);
});
test('stage classification can account for all occupied voxels exactly once',()=>{
  const cells=[
    voxel({age:0,mature:false}),voxel({age:50}),
    voxel({age:50,damage:1}),voxel({age:1,strain:.8}),
    voxel({age:60,fractureFaces:1}),voxel({age:27})
  ];
  const count={young:0,mature:0,fault:0};
  for(const cell of cells)count[mineralLifeStage(cell,c)]++;
  assert.deepEqual(count,{young:2,mature:1,fault:3});
});
test('optical lifecycle cannot change voxel occupancy, historical pigment, RNG or simulation',()=>{
  const a=new GrowthEngine(3012),b=new GrowthEngine(3012);
  a.setConfig({crystalEvolution:'feral',crystalMaturity:12,crystalStressOptics:.3});
  b.setConfig({crystalEvolution:'off',crystalMaturity:28,crystalStressOptics:.45});
  a.colony.setSettings({enabled:true});
  b.colony.setSettings({enabled:true});
  a.seedCrystal(new Vector3());b.seedCrystal(new Vector3());
  for(let i=0;i<150;i++){a.step(1/60);b.step(1/60);}
  assert.deepEqual(a.colony.snapshot(),b.colony.snapshot());
  assert.deepEqual(a.segmentColors,b.segmentColors);
  assert.equal(a.rngState,b.rngState);
  assert.equal(Object.keys(PALETTES).length,199);
});
test('maturity refresh runs at a bounded cadence only if evolution is ON',()=>{
  for(const mode of ['feral','off']){
    const w=new GrowthEngine(3013);
    w.setConfig({crystalEvolution:mode});
    w.colony.setSettings({enabled:true,growth:0,erosion:0,strainEnabled:false});
    w.seedCrystal(new Vector3());
    for(let i=0;w.colony.generation<3&&i<200;i++)w.step(1/60);
    w.colony.changed=false;
    for(let i=0;w.colony.generation<4&&i<200;i++)w.step(1/60);
    assert.equal(w.colony.changed,mode!=='off',mode+' display refresh');
  }
});
test('DNA and complete world checkpoints restore metamorphosis with deterministic continuation',()=>{
  const w=new GrowthEngine(3014);
  w.setConfig({crystalEvolution:'opaline',crystalMaturity:32,crystalStressOptics:.65,
    palette:Object.keys(PALETTES).at(-1)});
  w.colony.setSettings({enabled:true});w.seedCrystal(new Vector3());
  for(let i=0;i<140;i++)w.step(1/60);
  const state=w.getCheckpoint(),copy=new GrowthEngine(2);
  copy.restoreCheckpoint(state);
  assert.deepEqual(copy.getCheckpoint(),state);
  assert.equal(copy.config.crystalEvolution,'opaline');
  for(let i=0;i<65;i++){w.step(1/60);copy.step(1/60);}
  assert.deepEqual(copy.getCheckpoint(),w.getCheckpoint());
});
test('old world with no optical lifetime settings stays visually identical in OFF mode',()=>{
  const w=new GrowthEngine(3015);
  w.setConfig({crystalEvolution:'feral',crystalMaturity:8});
  const saved=w.getCheckpoint();
  for(const k of ['crystalEvolution','crystalMaturity','crystalStressOptics'])
    delete saved.dna.config[k];
  const copy=new GrowthEngine(10);
  copy.restoreCheckpoint(saved);
  assert.equal(copy.config.crystalEvolution,'off');
  assert.equal(copy.config.crystalMaturity,28);
  assert.equal(copy.config.crystalStressOptics,.45);
  copy.setConfig({crystalEvolution:'__proto__',crystalMaturity:999,crystalStressOptics:-1});
  assert.equal(copy.config.crystalEvolution,'off');
  assert.equal(copy.config.crystalMaturity,96);
  assert.equal(copy.config.crystalStressOptics,.1);
});
test('renderer preserves one draw-call classic fallback and pressure ray picking across visible age buckets',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(main,/crystals\.visible=!useAging/);
  assert.match(main,/mesh\.count=useAging\?crystalAgeCounts\[tier\]:0/);
  assert.match(main,/raycaster\.intersectObjects\(sculptable,false\)/);
  assert.match(main,/crystalAgeMeshes\[tier\]\.geometry=selectedShape/);
});
