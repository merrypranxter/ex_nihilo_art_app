import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {GrowthEngine} from '../src/engine.js';
import {FieldGestureTransaction,lensDelta} from '../src/gesture-witch.js';

const vec=(x=0,y=0,z=0)=>new Vector3(x,y,z);

test('one-finger vortex drag is a single committed field edit with Undo/Redo',()=>{
  const engine=new GrowthEngine(771);
  const original=engine.snapshotNodes();
  const session=new FieldGestureTransaction(engine);
  assert.equal(session.begin({type:'vortex',pos:vec(.5,0,.2)}),true);
  session.move(vec(1.1,.3,.1));
  session.move(vec(1.4,.4,.2));
  assert.equal(session.commit(),true);
  assert.equal(engine.nodeUndo.length,1);
  const created=engine.snapshotNodes();
  assert.equal(created.length,1);
  assert.deepEqual(created[0].pos,[1.4,.4,.2]);
  engine.undoNodes();
  assert.deepEqual(engine.snapshotNodes(),original);
  engine.redoNodes();
  assert.deepEqual(engine.snapshotNodes(),created);
});

test('pointer cancellation restores the node document and random identity state',()=>{
  const engine=new GrowthEngine(772);
  const before=engine.snapshotNodes(),rng=engine.rngState;
  const session=new FieldGestureTransaction(engine);
  session.begin({type:'vortex',pos:vec()});
  session.move(vec(1,0,0));
  assert.equal(session.cancel(),true);
  assert.deepEqual(engine.snapshotNodes(),before);
  assert.equal(engine.rngState,rng);
  assert.equal(engine.nodeUndo.length,0);
});

test('two-finger pinch and twist alter persistent field radius and chirality',()=>{
  const engine=new GrowthEngine(773);
  const session=new FieldGestureTransaction(engine);
  session.begin({type:'vortex',pos:vec()});
  const p={x:100,y:100},q={x:200,y:100};
  assert.ok(session.beginLens(p,q));
  assert.ok(session.lensPreview(p,{x:100,y:300}));
  const node=session.node;
  assert.ok(node.radius>1.9);
  assert.ok(node.spin>1.2);
  const radius=node.radius,spin=node.spin;
  assert.ok(session.commit());
  assert.equal(engine.nodes[0].radius,radius);
  assert.equal(engine.nodes[0].spin,spin);
  assert.ok(lensDelta(p,q,p,{x:100,y:300}).valid);
  assert.equal(lensDelta(p,{x:105,y:100},p,{x:200,y:100}).valid,false);
});

test('dragging a selected source retains identity and cancels cleanly',()=>{
  const engine=new GrowthEngine(774);
  const node=engine.addNode('vortex',vec(.1,.2,.3));
  const first=engine.snapshotNodes(),rng=engine.rngState;
  const session=new FieldGestureTransaction(engine);
  session.begin({nodeId:node.id});
  session.move(vec(2,1,0));
  session.beginLens({x:50,y:50},{x:100,y:50});
  session.lensPreview({x:50,y:50},{x:20,y:50});
  assert.equal(session.cancel(),true);
  assert.deepEqual(engine.snapshotNodes(),first);
  assert.equal(engine.rngState,rng);
});

test('a new gesture invalidates redo after divergent history',()=>{
  const engine=new GrowthEngine(775);
  let session=new FieldGestureTransaction(engine);
  session.begin({type:'vortex',pos:vec()});session.commit();
  engine.undoNodes();
  assert.equal(engine.nodeRedo.length,1);
  session=new FieldGestureTransaction(engine);
  session.begin({type:'repel',pos:vec(.2,0,0)});session.commit();
  assert.equal(engine.nodeRedo.length,0);
});

test('vortex edits change the live mathematical vector field, not a visual transform',()=>{
  const engine=new GrowthEngine(776);
  const near=vec(.7,0,.2);
  const original=engine.fieldAt(near).clone();
  const node=engine.addNode('vortex',vec());
  const positive=engine.fieldAt(near).clone();
  node.spin=-1.2;
  const reversed=engine.fieldAt(near).clone();
  assert.ok(positive.distanceTo(original)>.1);
  assert.ok(reversed.distanceTo(positive)>.1);
  node.radius=.25;
  const compact=engine.fieldAt(near).clone();
  assert.ok(compact.distanceTo(original)<reversed.distanceTo(original));
});

test('vortex field edits and their IDs survive complete world checkpoint and exact replay',()=>{
  const engine=new GrowthEngine(777);
  const session=new FieldGestureTransaction(engine);
  session.begin({type:'vortex',pos:vec(.7,.1,-.3)});
  session.beginLens({x:5,y:5},{x:110,y:5});
  session.lensPreview({x:5,y:5},{x:5,y:130});
  session.commit();
  for(let i=0;i<90;i++)engine.step(1/60);
  const save=engine.getCheckpoint();
  const restored=new GrowthEngine(778);
  restored.restoreCheckpoint(save);
  assert.deepEqual(restored.getCheckpoint(),save);
  for(let i=0;i<40;i++){engine.step(1/60);restored.step(1/60);}
  assert.deepEqual(restored.getCheckpoint(),engine.getCheckpoint());
});

test('old world attract/repel nodes without lens settings load and use legacy field math',()=>{
  const engine=new GrowthEngine(779);
  engine.addNode('attract',vec(.2,.1,.2));
  const state=engine.getCheckpoint();
  for(const n of state.nodes){delete n.radius;delete n.spin;}
  const restored=new GrowthEngine(780);
  restored.restoreCheckpoint(state);
  assert.equal(restored.nodes.length,1);
  assert.equal(restored.nodes[0].radius,1.1);
  assert.equal(restored.nodes[0].spin,1.2);
  assert.deepEqual(restored.fieldAt(vec(.2,.3,.6)).toArray(),
    engine.fieldAt(vec(.2,.3,.6)).toArray());
});
