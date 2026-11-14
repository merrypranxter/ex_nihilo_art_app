import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CameraPathEditor,validCameraPath,cloneCameraPath,
  reverseCameraPath,sampleCameraPath,cameraPathPose,
  CAMERA_PATH_MODES,CAMERA_PATH_TIMINGS,MAX_CAMERA_PATH_POINTS
} from '../src/surface-camera-path.js';
import {cameraPoseFromConfig} from '../src/surface-camera-choreography.js';
import {cinematicDimensions,cinematicFrameRect} from '../src/surface-cinematic.js';
import {framePhase} from '../src/surface-loop-plan.js';
import {GrowthEngine,PALETTES} from '../src/engine.js';

const TAU=Math.PI*2;
const close=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<=eps,`${a} != ${b}`);
function authored(){
  const editor=new CameraPathEditor();
  assert.equal(editor.begin(.22,.3,0),true);
  for(const [x,y,t] of [
    [.34,.54,34],[.47,.66,68],[.67,.63,220],
    [.83,.43,241],[.71,.22,390],[.48,.16,580]])
    assert.equal(editor.append(x,y,t),true);
  assert.equal(editor.commit(),true);
  assert.ok(validCameraPath(editor.path));
  return editor;
}
test('camera path document is typed, source-normalized, bounded and separate from CA',()=>{
  const e=authored();
  assert.equal(e.path.version,1);
  assert.equal(e.path.id,1);
  assert.equal(e.path.points.length,7);
  assert.equal(e.path.points[0][2],0);
  assert.equal(e.path.points.at(-1)[2],1);
  assert.equal(MAX_CAMERA_PATH_POINTS,72);
  assert.ok(e.path.points.every(p=>p.every(Number.isFinite)));
});
test('malformed, malicious or oversized saved camera paths are rejected',()=>{
  assert.equal(validCameraPath(null),true);
  assert.equal(validCameraPath(undefined),false);
  const good=authored().path;
  const bad=[
    {...good,points:good.points.map(p=>[...p]).reverse()},
    {...good,id:-1},
    {...good,points:[[.4,.2,0],[Number.NaN,.3,1]]},
    {...good,points:[[.5,.2,0],[.5,.2,1]]},
    {...good,points:Array.from({length:73},(_,i)=>[.3+i/1000,.4,i/72])},
    {...good,points:good.points.map((p,i)=>i===2?[2,.3,p[2]]:p)},
    {...good,points:good.points.map((p,i)=>i===3?[p[0],p[1],-.2]:p)}
  ];
  assert.ok(bad.every(x=>!validCameraPath(x)));
});
test('draw/commit/reverse/clear remain individually undoable and redo-safe',()=>{
  const e=authored(),original=cloneCameraPath(e.path);
  assert.equal(e.reverse(),true);
  assert.equal(e.path.id,original.id);
  close(e.path.points[0][0],original.points.at(-1)[0]);
  assert.equal(e.undo(),true);
  assert.deepEqual(e.path,original);
  assert.equal(e.redo(),true);
  assert.equal(e.clear(),true);
  assert.equal(e.path,null);
  assert.equal(e.undo(),true);
  assert.ok(validCameraPath(e.path));
});
test('new drawing atomically replaces old path, cancel preserves identity',()=>{
  const e=authored(),original=cloneCameraPath(e.path);
  assert.equal(e.begin(.7,.7,0),true);
  e.append(.3,.4,200);
  assert.equal(e.cancel(),true);
  assert.deepEqual(e.path,original);
  assert.equal(e.begin(.7,.7,0),true);
  e.append(.3,.4,200);
  assert.equal(e.commit(),true);
  assert.notEqual(e.path.id,original.id);
  assert.equal(e.undo(),true);
  assert.deepEqual(e.path,original);
  assert.equal(e.begin(.8,.2,0),true);
  e.append(.2,.8,120);e.commit();
  assert.equal(e.history().redo,0);
});
test('short accidental taps never delete a finished path',()=>{
  const e=authored(),before=cloneCameraPath(e.path),history=e.history();
  e.begin(.3,.4,0);
  assert.equal(e.commit(),false);
  assert.deepEqual(e.path,before);
  assert.deepEqual(e.history(),history);
});
test('long gestural scribbles remain bounded while retaining their final destination',()=>{
  const e=new CameraPathEditor();e.begin(.1,.5,0);
  for(let i=1;i<=250;i++){
    const x=.1+.78*i/250;
    const y=.5+.2*Math.sin(i*.08);
    e.append(x,y,i*12);
  }
  assert.equal(e.commit(),true);
  assert.ok(e.path.points.length<=MAX_CAMERA_PATH_POINTS);
  close(e.path.points.at(-1)[0],.88,.006);
});
test('closed circuit is position-continuous across all timing and smoothing modes',()=>{
  const path=authored().path;
  for(const mode of Object.keys(CAMERA_PATH_MODES))
    for(const timing of Object.keys(CAMERA_PATH_TIMINGS))
      for(const smooth of [0,.25,.85,1]){
        const a=sampleCameraPath(path,0,{mode,timing,smooth});
        const b=sampleCameraPath(path,TAU,{mode,timing,smooth});
        close(a[0],b[0]);close(a[1],b[1]);
      }
});
test('retrace is exactly symmetric in time for all speed models',()=>{
  const path=authored().path;
  for(const timing of Object.keys(CAMERA_PATH_TIMINGS))
    for(let i=1;i<20;i++){
      const phase=i*TAU/20;
      const a=sampleCameraPath(path,phase,{mode:'retrace',timing});
      const b=sampleCameraPath(path,TAU-phase,{mode:'retrace',timing});
      close(a[0],b[0]);close(a[1],b[1]);
    }
});
test('arc-length and hand timing are meaningfully distinct at the same phase',()=>{
  const path=authored().path;
  const arc=sampleCameraPath(path,TAU*.50,{mode:'circuit',timing:'even'});
  const hand=sampleCameraPath(path,TAU*.50,{mode:'circuit',timing:'hand'});
  assert.ok(Math.hypot(arc[0]-hand[0],arc[1]-hand[1])>.01);
});
test('reversing the document changes travel direction without deleting the locus',()=>{
  const path=authored().path,reversed=reverseCameraPath(path);
  const roundtrip=reverseCameraPath(reversed);
  for(let i=0;i<path.points.length;i++)for(let k=0;k<3;k++)
    close(roundtrip.points[i][k],path.points[i][k],1e-13);
  assert.ok(validCameraPath(reversed));
  const a=sampleCameraPath(path,TAU*.22,{mode:'retrace'});
  const b=sampleCameraPath(reversed,TAU*.22,{mode:'retrace'});
  assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])>.03);
});
test('camera follows source-space mineral centers in portrait and widescreen',()=>{
  const path=authored().path;
  for(const aspect of ['1:1','9:16','16:9','3:4','4:3']){
    const config={surfaceLoopAspect:aspect,surfaceLoopFraming:'cover',
      surfaceLoopZoom:1.1,surfaceCameraPathZoom:2,
      surfaceCameraPathPulse:0,surfaceCameraPathMode:'retrace',
      surfaceCameraPathTiming:'even',surfaceCameraPathSmooth:.85};
    const phase=TAU*.37,pose=cameraPathPose(path,phase,config);
    const {width,height}=cinematicDimensions(1024,aspect);
    const rect=cinematicFrameRect(1,width,height,{framing:'cover',...pose});
    // An interior source point should appear at the exact output center
    // when there is sufficient pan range (zoom >=2).
    const centerX=rect.sx+rect.sw*.5,centerY=rect.sy+rect.sh*.5;
    close(centerX,pose.source[0],.04);close(centerY,pose.source[1],.04);
  }
});
test('camera lens stays finite, within crop bounds, and returns to start',()=>{
  const path=authored().path;
  const config={surfaceCameraPathMode:'circuit',
    surfaceCameraPathTiming:'hand',surfaceLoopAspect:'9:16',
    surfaceCameraPathZoom:1.75,surfaceCameraPathPulse:.8};
  for(let i=0;i<120;i++){
    const pose=cameraPathPose(path,framePhase(i,120,'cycle'),config);
    assert.ok([pose.focusX,pose.focusY,pose.zoom].every(Number.isFinite));
    assert.ok(pose.focusX>=0&&pose.focusX<=1);
    assert.ok(pose.focusY>=0&&pose.focusY<=1);
    assert.ok(pose.zoom>=1&&pose.zoom<=2.5);
  }
  const a=cameraPathPose(path,0,config),b=cameraPathPose(path,TAU,config);
  close(a.focusX,b.focusX);close(a.focusY,b.focusY);close(a.zoom,b.zoom);
});
test('shared live/export camera dispatcher resolves drawn document and has safe no-path behavior',()=>{
  const p=authored().path,config={
    surfaceCameraMotion:'drawn',surfaceCameraPath:p,
    surfaceLoopAspect:'9:16',surfaceLoopFraming:'cover',
    surfaceCameraPathZoom:1.45
  };
  const actual=cameraPoseFromConfig(TAU*.25,config);
  const expected=cameraPathPose(p,TAU*.25,config);
  assert.deepEqual(actual,expected);
  const missing=cameraPoseFromConfig(.3,{
    ...config,surfaceCameraPath:null,surfaceLoopFocusX:.2,
    surfaceLoopFocusY:.9,surfaceLoopZoom:1.7
  });
  assert.deepEqual(missing,{focusX:.2,focusY:.9,zoom:1.7});
});
test('path is DNA/checkpoint data, with old-world absent path defaulting to none',()=>{
  const world=new GrowthEngine(971);
  const path=authored().path;
  world.setConfig({surfaceCameraMotion:'drawn',
    surfaceCameraPath:path,surfaceCameraPathMode:'retrace',
    surfaceCameraPathTiming:'hand',surfaceCameraPathSmooth:.65,
    surfaceCameraPathZoom:1.9,surfaceCameraPathPulse:.4});
  const data=world.getDNA(),checkpoint=world.getCheckpoint();
  const copied=new GrowthEngine(1);copied.loadDNA(data);
  assert.deepEqual(copied.config.surfaceCameraPath,path);
  assert.equal(copied.config.surfaceCameraPathMode,'retrace');
  assert.equal(copied.config.surfaceCameraPathTiming,'hand');
  const recovered=new GrowthEngine(2);recovered.restoreCheckpoint(checkpoint);
  assert.deepEqual(recovered.config.surfaceCameraPath,path);
  assert.equal(Object.keys(PALETTES).length,199);
  const legacy=structuredClone(data);
  for(const key of Object.keys(legacy.config))
    if(key.startsWith('surfaceCameraPath'))delete legacy.config[key];
  const old=new GrowthEngine(3);old.loadDNA(legacy);
  assert.equal(old.config.surfaceCameraPath,null);
  assert.equal(old.config.surfaceCameraPathMode,'circuit');
});
test('invalid path config rejects before mutating the old world',()=>{
  const world=new GrowthEngine(716),path=authored().path;
  world.setConfig({surfaceCameraPath:path});
  const before=world.getCheckpoint();
  assert.throws(()=>world.setConfig({surfaceCameraPath:{
    version:1,id:2,points:[[0,0,0],[Infinity,.2,1]]
  }}));
  assert.deepEqual(world.getCheckpoint(),before);
});
test('path tools are direct touch, visually previewed, excluded from exports',async()=>{
  const {readFileSync}=await import('node:fs');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const renderer=readFileSync(new URL('../src/surface-loop-renderer.js',import.meta.url),'utf8');
  for(const id of ['surface-camera-path-draw','surface-camera-path-show',
    'surface-camera-path-mode','surface-camera-path-timing',
    'surface-camera-path-smooth','surface-camera-path-zoom',
    'surface-camera-path-pulse','surface-camera-path-undo',
    'surface-camera-path-redo','surface-camera-path-reverse',
    'surface-camera-path-clear','surface-camera-path-status'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(main,/cameraPathSourceAtPointer/);
  assert.match(main,/handleCameraPathPointerDown/);
  assert.match(main,/handleCameraPathPointerEnd/);
  assert.match(main,/drawAuthoredCameraPathOverlay/);
  assert.match(main,/if\(handleCameraPointerDown\(e\)\)return;/);
  assert.doesNotMatch(renderer,/drawAuthoredCameraPathOverlay/);
});
