import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {formField,FORM_NAMES,FINISHES} from '../src/art-direction.js';
import {GrowthEngine} from '../src/engine.js';
import {extractIsosurface} from '../src/surface.js';
import {MorphogenesisVolume} from '../src/morphogenesis.js';

test('distinct artistic silhouettes are distinct mathematical vector fields',()=>{
  const p={x:1.1,y:.4,z:.8},t=3.7;
  const names=Object.keys(FORM_NAMES);
  const vectors=names.map(form=>formField(p,t,{form,formStrength:1,formTwist:.7}));
  assert.equal(names.length,6);
  assert.deepEqual(vectors[0],{x:0,y:0,z:0});
  assert.equal(new Set(vectors.map(v=>JSON.stringify(v))).size,names.length);
  assert.ok(vectors.every(v=>Object.values(v).every(Number.isFinite)));
});

test('silhouette influence at zero never changes the original physical field',()=>{
  const p={x:.5,y:.3,z:1.2};
  const forms=Object.keys(FORM_NAMES);
  for(const form of forms){
    assert.deepEqual(formField(p,4,{form,formStrength:0,formTwist:1}),{x:0,y:0,z:0});
  }
});

test('form families stay bounded and numerically finite in the simulation volume',()=>{
  for(const name of Object.keys(FORM_NAMES)){
    for(const p of [
      {x:0,y:0,z:0},{x:3,y:-3,z:2},{x:-3.6,y:1,z:.1}
    ]){
      const vector=formField(p,77,{form:name,formStrength:2,formTwist:2});
      assert.ok(Object.values(vector).every(n=>Number.isFinite(n)&&Math.abs(n)<10));
    }
  }
});

test('surface normals reflect smooth gradients from the real concentration volume',()=>{
  const field=new MorphogenesisVolume();
  field.seedAt(new Vector3(),.78);
  const mesh=extractIsosurface(field,.21,{stride:2,maxTriangles:3000});
  assert.ok(mesh.triangles>0);
  assert.equal(mesh.normals.length,mesh.positions.length);
  for(let i=0;i<mesh.normals.length;i+=3){
    const len=Math.hypot(mesh.normals[i],mesh.normals[i+1],mesh.normals[i+2]);
    assert.ok(Math.abs(len-1)<.002);
  }
});

test('artistic material and form DNA survive full-world checkpoint replay',()=>{
  const world=new GrowthEngine(2109);
  world.setConfig({form:'reliquary',formStrength:1.2,formTwist:.8,
    finish:'spectral',glow:.35});
  assert.ok(FINISHES[world.config.finish]);
  for(let i=0;i<100;i++)world.step(1/60);
  const state=world.getCheckpoint();
  const restored=new GrowthEngine(7);
  restored.restoreCheckpoint(state);
  assert.deepEqual(restored.getCheckpoint(),state);
  for(let i=0;i<30;i++){world.step(1/60);restored.step(1/60);}
  assert.deepEqual(restored.getCheckpoint(),world.getCheckpoint());
});

test('loading older checkpoints opts out of new silhouette forces',()=>{
  const world=new GrowthEngine(801);
  for(let i=0;i<60;i++)world.step(1/60);
  const state=world.getCheckpoint();
  delete state.dna.config.form;
  delete state.dna.config.formStrength;
  delete state.dna.config.formTwist;
  delete state.dna.config.finish;
  delete state.dna.config.glow;
  const restored=new GrowthEngine(9);
  restored.restoreCheckpoint(state);
  assert.equal(restored.config.form,'wild');
  assert.equal(restored.config.formStrength,0);
  assert.equal(restored.config.finish,'opal');
});
