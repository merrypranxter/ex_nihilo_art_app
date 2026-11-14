import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {GrowthEngine} from '../src/engine.js';
import {FieldGestureTransaction,GrowthStrokeTransaction} from '../src/gesture-witch.js';
import {strokeFieldAt,validStrokes,MAX_STROKES,MAX_STROKE_POINTS} from '../src/field-strokes.js';

const vec=(x=0,y=0,z=0)=>new Vector3(x,y,z);
function draw(engine,kind='guide'){
  const s=new GrowthStrokeTransaction(engine);
  s.begin(kind,vec(-1,0,0));
  s.append(vec(-.5,0,0));
  s.append(vec(.5,0,0));
  s.append(vec(1,0,0));
  assert.ok(s.commit());
}

test('touch-drawn strokes persist causal guide and warp forces in three-dimensional space',()=>{
  const x=vec(0,.2,0);
  const no=strokeFieldAt(x,[]);
  assert.deepEqual(no,{x:0,y:0,z:0});
  const g={id:1,kind:'guide',radius:.75,strength:1.1,points:[[-1,0,0],[1,0,0]]};
  const p={...g,kind:'push'};
  const guided=strokeFieldAt(x,[g]);
  const warped=strokeFieldAt(x,[p]);
  assert.ok(guided.x>0&&guided.y<0);
  assert.ok(warped.x>0&&warped.y===0);
  assert.ok(Math.hypot(...Object.values(strokeFieldAt(vec(100,100,100),[g])))<1e-8);
  assert.ok(validStrokes([g,p].map((s,i)=>({...s,id:i}))));
});

test('one drag is one undoable stroke transaction and combines with node undo history',()=>{
  const world=new GrowthEngine(401);
  const before=world.snapshotField();
  draw(world);
  assert.equal(world.nodeUndo.length,1);
  assert.equal(world.strokes.length,1);
  const after=world.snapshotField();
  const nodeSession=new FieldGestureTransaction(world);
  nodeSession.begin({type:'vortex',pos:vec()});
  nodeSession.move(vec(.3,.2,0));
  nodeSession.commit();
  assert.equal(world.nodeUndo.length,2);
  world.undoNodes();
  assert.deepEqual(world.snapshotNodes(),before.nodes);
  assert.deepEqual(world.snapshotStrokes(),after.strokes);
  world.undoNodes();
  assert.deepEqual(world.snapshotField(),before);
  world.redoNodes();
  world.redoNodes();
  assert.equal(world.strokes.length,1);
  assert.equal(world.nodes.length,1);
});

test('gesture cancellation, tap without path and second-pointer interruption roll back draft and RNG',()=>{
  const world=new GrowthEngine(402);
  const before=world.snapshotField(),rng=world.rngState;
  const session=new GrowthStrokeTransaction(world);
  session.begin('guide',vec());
  session.append(vec(.7,.1,0));
  assert.ok(session.cancel());
  assert.deepEqual(world.snapshotField(),before);
  assert.equal(world.rngState,rng);
  assert.equal(world.nodeUndo.length,0);
  const tap=new GrowthStrokeTransaction(world);
  tap.begin('push',vec());
  assert.equal(tap.commit(),false);
  assert.deepEqual(world.snapshotField(),before);
  assert.equal(world.rngState,rng);
});

test('stroke complexity is bounded and malformed saved fields cannot destroy a world',()=>{
  const world=new GrowthEngine(403);
  const invalid={id:3,kind:'guide',radius:.75,strength:1,points:[[0,0,0]]};
  assert.equal(validStrokes([invalid]),false);
  for(let i=0;i<MAX_STROKES;i++){
    const t=new GrowthStrokeTransaction(world);
    t.begin('guide',vec(-.5,i*.01,0));
    for(let j=1;j<MAX_STROKE_POINTS+30;j++)
      t.append(vec(-.5+j*.19,i*.01,0));
    assert.ok(t.stroke.points.length<=MAX_STROKE_POINTS);
    assert.ok(t.commit());
  }
  const full=world.getCheckpoint();
  assert.throws(()=>new GrowthStrokeTransaction(world).begin('guide',vec()));
  assert.deepEqual(world.getCheckpoint(),full);
  const broken=JSON.parse(JSON.stringify(full));
  broken.strokes[0].points[0]=[Number.NaN,0,0]; // JSON turns NaN to null
  assert.throws(()=>world.restoreCheckpoint(broken));
  assert.deepEqual(world.getCheckpoint(),full);
});

test('a saved world with guide+warp paths retains exact physics after restoration',()=>{
  const world=new GrowthEngine(404);
  draw(world,'guide');
  const stroke=new GrowthStrokeTransaction(world);
  stroke.begin('push',vec(0,-1,0));
  stroke.append(vec(0,0,0));stroke.append(vec(0,1,0));
  stroke.commit();
  for(let i=0;i<120;i++)world.step(1/60);
  const saved=world.getCheckpoint();
  const copy=new GrowthEngine(405);
  copy.restoreCheckpoint(saved);
  assert.deepEqual(copy.getCheckpoint(),saved);
  for(let i=0;i<40;i++){world.step(1/60);copy.step(1/60);}
  assert.deepEqual(copy.getCheckpoint(),world.getCheckpoint());
});

test('an older v3 checkpoint with no stroke history is accepted unchanged',()=>{
  const world=new GrowthEngine(406);
  for(let i=0;i<30;i++)world.step(1/60);
  const old=world.getCheckpoint();
  delete old.strokes;
  delete old.dna.strokes;
  const copy=new GrowthEngine(11);
  copy.restoreCheckpoint(old);
  assert.deepEqual(copy.strokes,[]);
});
