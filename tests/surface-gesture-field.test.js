import test from 'node:test';
import assert from 'node:assert/strict';
import {SurfaceGrowth,SURFACE_SIZE} from '../src/surface-growth.js';
import {GrowthEngine,PALETTES} from '../src/engine.js';
import {SurfaceGestureEditor,validSurfaceMarks,bakeSurfaceGestureField,
  nearestSurfaceMark,MAX_SURFACE_MARKS} from '../src/surface-gesture-field.js';

const colors=['#fa00ff','#00ffee','#ffe519','#8e42ff'];
const setup=(size=48,seed=731)=>{
  const s=new SurfaceGrowth(seed,size);
  s.seedArrangement(12,'lattice',colors,{wrap:false});
  return s;
};
const options={seedOptions:{wrap:false,boundary:'open',voids:0,regions:'single'}};
function performStroke(s,kind,coords,radius=.15,strength=1){
  const editor=new SurfaceGestureEditor(s);
  assert.equal(editor.begin(kind,...coords[0],{...options,radius,strength}),true);
  for(const p of coords.slice(1))editor.move(...p);
  assert.equal(editor.commit(),true);
  return editor;
}
function evolve(s,mode='spherulite',steps=15){
  for(let i=0;i<steps;i++)s.advance(colors,{
    morphology:mode,growth:.9,coverage:.98,wrap:false
  });
}
test('three field spells are distinct, bounded, and permit old-world defaults',()=>{
  const field=bakeSurfaceGestureField(48,[],false);
  assert.equal(field.blocked.length,48*48);
  assert.equal(field.attraction.length,48*48);
  assert.ok(field.blocked.every(v=>v===0));
  assert.ok(field.attraction.every(v=>v===0));
  assert.equal(MAX_SURFACE_MARKS,20);
  assert.equal(SURFACE_SIZE,192);
});
test('barriers forbid real future cell births, including manual nuclei',()=>{
  const s=new SurfaceGrowth(6,48);
  performStroke(s,'block',[[.48,.52],[.52,.52]],.16,1);
  assert.equal(s.seedSymmetricAt(.5,.52,colors,{wrap:false}),false);
  assert.equal(s.population,0);
  assert.equal(s.marks.length,1);
});
test('negative-space stroke changes actual occupancy, not material pixels',()=>{
  const a=setup(),b=setup(),snapshot=a.snapshot();
  performStroke(a,'block',[[.42,.42],[.60,.52]],.14,1);
  assert.deepEqual([...a.owner],[...b.owner]);
  evolve(a,'spherulite',20);
  evolve(b,'spherulite',20);
  assert.ok(a.population<b.population);
  assert.notDeepEqual([...a.owner],[...b.owner]);
  for(let i=0;i<a.capacity;i++)if(snapshot.owner[i]){
    assert.equal(a.owner[i],snapshot.owner[i]);
    assert.deepEqual([...a.birthColor.slice(i*3,i*3+3)],
      snapshot.birthColor.slice(i*3,i*3+3));
  }
});
test('attraction changes birth acceptance and spatial growth distribution',()=>{
  const a=setup(),b=setup();
  performStroke(a,'attract',[[.48,.5],[.68,.65]],.16,1);
  evolve(a,'dendrite',9);evolve(b,'dendrite',9);
  assert.notDeepEqual([...a.owner],[...b.owner]);
});
test('COMB stroke is a true direction-dependent growth law',()=>{
  const a=setup(),b=setup(),c=setup();
  performStroke(a,'guide',[[.15,.25],[.84,.34]],.18,1);
  performStroke(b,'guide',[[.84,.34],[.15,.25]],.18,1);
  evolve(a,'spherulite',14);
  evolve(b,'spherulite',14);
  evolve(c,'spherulite',14);
  assert.notDeepEqual([...a.owner],[...c.owner]);
  assert.notDeepEqual([...a.owner],[...b.owner]);
});
test('cancel rolls back mark identity, RNG, cell births, and history as one transaction',()=>{
  const s=setup(),editor=new SurfaceGestureEditor(s),before=s.snapshot();
  assert.equal(editor.begin('attract',.4,.4,{...options,radius:.1}),true);
  editor.move(.45,.5);
  assert.equal(editor.cancel(),true);
  assert.deepEqual(s.snapshot(),before);
  assert.deepEqual(editor.historyState(),{undo:0,redo:0});
});
test('two finger pinch and twist transform mark geometry, undo and redo restore entire history',()=>{
  const s=setup(),ed=performStroke(s,'guide',[[.4,.4],[.6,.4]],.1);
  const original=s.snapshot();
  assert.equal(ed.begin('edit',.5,.4,options),true);
  assert.equal(ed.beginLens([.48,.35],[.52,.45]),true);
  assert.equal(ed.lensMove([.48,.3],[.65,.52]),true);
  assert.equal(ed.commit(),true);
  const changed=s.snapshot();
  assert.notDeepEqual(changed.marks,original.marks);
  assert.equal(ed.undo(),true);
  assert.deepEqual(s.snapshot(),original);
  assert.equal(ed.redo(),true);
  assert.deepEqual(s.snapshot(),changed);
});
test('redo is invalidated by a divergent new touch and clear is reversible',()=>{
  const s=setup(),ed=new SurfaceGestureEditor(s);
  assert.equal(ed.begin('attract',.4,.4,options),true);
  assert.equal(ed.commit(),true);
  assert.equal(ed.undo(),true);
  assert.equal(ed.begin('block',.6,.6,options),true);
  assert.equal(ed.commit(),true);
  assert.equal(ed.historyState().redo,0);
  const previous=s.snapshot();
  assert.equal(ed.clear(),true);
  assert.equal(s.marks.length,0);
  assert.equal(ed.undo(),true);
  assert.deepEqual(s.snapshot(),previous);
});
test('restoring a surface mark checkpoint reproduces deterministic future growth',()=>{
  const a=setup(),ed=performStroke(a,'attract',[[.25,.35],[.75,.6]],.18);
  const checkpoint=a.snapshot(),b=new SurfaceGrowth(4,48);
  b.restore(checkpoint);
  assert.deepEqual(b.snapshot(),checkpoint);
  evolve(a,'dendrite',12);evolve(b,'dendrite',12);
  assert.deepEqual(a.snapshot(),b.snapshot());
  assert.equal(ed.active,false);
});
test('historical surface-v1 saves without marks restore unchanged',()=>{
  const s=setup(),historical=s.snapshot();
  delete historical.marks;
  delete historical.nextMarkId;
  const b=new SurfaceGrowth(1,48);
  b.restore(historical);
  assert.equal(b.marks.length,0);
  assert.equal(b.nextMarkId,1);
  assert.deepEqual([...b.owner],[...s.owner]);
});
test('malicious mark geometry and duplicate IDs reject before mutating saved matter',()=>{
  const s=setup(),before=s.snapshot();
  for(const invalid of [
    [{id:1,kind:'block',radius:4,strength:1,points:[[.5,.5]]}],
    [{id:1,kind:'guide',radius:.1,strength:1,points:[[-1,.5]]}],
    [{id:1,kind:'block',radius:.1,strength:1,points:[[.5,.5]]},
     {id:1,kind:'attract',radius:.1,strength:1,points:[[.2,.2]]}]
  ]){
    const bad=structuredClone(before);bad.marks=invalid;bad.nextMarkId=2;
    assert.equal(validSurfaceMarks(invalid),false);
    assert.throws(()=>s.restore(bad));
    assert.deepEqual(s.snapshot(),before);
  }
});
test('whole-world checkpoint persists surface marks without resetting 3D state',()=>{
  const w=new GrowthEngine(4561),original=w.colony.snapshot();
  w.setConfig({compositionDomain:'surface',surfaceTouchMode:'guide',
    surfaceTouchRadius:.14,surfaceTouchStrength:.7});
  performStroke(w.surface,'guide',[[.2,.3],[.8,.6]],.14,.7);
  const save=w.getCheckpoint(),copy=new GrowthEngine(3);
  copy.restoreCheckpoint(save);
  assert.deepEqual(copy.surface.snapshot(),w.surface.snapshot());
  assert.equal(copy.config.surfaceTouchMode,'guide');
  assert.equal(copy.config.surfaceTouchRadius,.14);
  assert.deepEqual(w.colony.snapshot(),original);
  assert.equal(Object.keys(PALETTES).length,199);
});
test('touch app exposes tangible modes, cancel, pinch, visible fields, undo and keyboard shortcuts',async()=>{
  const {readFileSync}=await import('node:fs');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  for(const id of ['surface-touch-mode','surface-touch-radius',
    'surface-touch-strength','surface-touch-undo','surface-touch-redo',
    'surface-touch-overlay','surface-touch-clear','surface-touch-status'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(js,/surfaceCanvas\.addEventListener\('pointercancel',cancelSurfaceTouch\)/);
  assert.match(js,/surfaceGestureEditor\.beginLens/);
  assert.match(js,/surfaceGestureEditor\.undo/);
  assert.match(js,/drawSurfaceGestureOverlay/);
  assert.match(js,/if\(!paused&&!surfaceGestureEditor\.active\)/);
});
test('nearest mark selection uses real retained path identity',()=>{
  const s=setup();performStroke(s,'guide',[[.15,.3],[.65,.45]],.08);
  const found=nearestSurfaceMark(s.marks,.45,.39);
  assert.equal(found?.id,s.marks[0].id);
  assert.equal(nearestSurfaceMark(s.marks,.98,.98),null);
});
