import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SURFACE_CAMERA_MOVES,SURFACE_CAMERA_CYCLES,
  cameraPose,cameraPoseFromConfig,cameraGesturePose
} from '../src/surface-camera-choreography.js';
import {cinematicFrameRect,pickCinematicSource,
  cinematicDimensions} from '../src/surface-cinematic.js';
import {framePhase,phaseAtSeconds,loopPlan} from '../src/surface-loop-plan.js';
import {GrowthEngine,PALETTES} from '../src/engine.js';

const TAU=Math.PI*2;
const approx=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<eps,`${a} vs ${b}`);
function samePose(a,b){
  approx(a.focusX,b.focusX);approx(a.focusY,b.focusY);
  approx(a.zoom,b.zoom);
}
test('six real camera modes plus 1/2/3 integer closed-orbit choices',()=>{
  assert.deepEqual(Object.keys(SURFACE_CAMERA_MOVES),
    ['still','orbit','figure8','microscope','pendulum','target']);
  assert.deepEqual(SURFACE_CAMERA_CYCLES,[1,2,3]);
});
test('FROZEN mode preserves precise prior 04G focus and zoom for any phase',()=>{
  const params={motion:'still',focusX:.23,focusY:.81,zoom:1.73};
  const expected={focusX:.23,focusY:.81,zoom:1.73};
  for(const phase of [0,.3,1,3,TAU,TAU*4])
    assert.deepEqual(cameraPose(phase,params),expected);
});
test('all five choreographies return to the exact initial lens, for every speed and offset',()=>{
  for(const motion of Object.keys(SURFACE_CAMERA_MOVES)){
    for(const cycles of SURFACE_CAMERA_CYCLES){
      for(const phaseOffset of [0,.13,.5,.99]){
        const config={motion,cycles,phaseOffset,
          focusX:.53,focusY:.46,zoom:1.07,
          travel:.75,dive:.67,targetX:.86,targetY:.21};
        samePose(cameraPose(0,config),cameraPose(TAU,config));
      }
    }
  }
});
test('lens translation and zoom stay within strictly bounded framing limits',()=>{
  for(const motion of Object.keys(SURFACE_CAMERA_MOVES))
    for(const phase of Array.from({length:90},(_,i)=>i*TAU/90)){
      const p=cameraPose(phase,{
        motion,focusX:.98,focusY:.08,zoom:2.32,
        travel:1,dive:1,targetX:0,targetY:1,cycles:3
      });
      assert.ok(p.focusX>=0&&p.focusX<=1);
      assert.ok(p.focusY>=0&&p.focusY<=1);
      assert.ok(p.zoom>=1&&p.zoom<=2.5);
    }
});
test('distinct camera motions produce genuinely different lens trajectories',()=>{
  const motionNames=['orbit','figure8','microscope','pendulum','target'];
  const frames=motionNames.map(motion=>[.2,.7,1.5,2.3].map(phase=>
    cameraPose(phase,{motion,focusX:.48,focusY:.5,zoom:1.1,
      targetX:.92,targetY:.15,travel:.7,dive:.8})));
  for(let i=0;i<frames.length;i++)
    for(let j=0;j<i;j++)assert.notDeepEqual(frames[i],frames[j]);
});
test('target dive visits the exact authored location at midpoint without changing material',()=>{
  const start={motion:'target',focusX:.18,focusY:.8,
    targetX:.87,targetY:.2,zoom:1,travel:1,dive:1};
  const a=cameraPose(0,start),b=cameraPose(Math.PI,start),
    c=cameraPose(TAU,start);
  approx(a.focusX,.18);approx(a.focusY,.8);approx(a.zoom,1);
  approx(b.focusX,.87);approx(b.focusY,.2);approx(b.zoom,2.5);
  samePose(a,c);
});
test('boomerang advances and reverses the same camera without a discontinuity',()=>{
  const opts={motion:'orbit',focusX:.5,focusY:.5,zoom:1.25,travel:.6};
  const steps=48,duration=3;
  const poses=Array.from({length:steps},(_,i)=>cameraPose(
    framePhase(i,steps,'boomerang'),opts));
  samePose(cameraPose(phaseAtSeconds(0,duration,'boomerang'),opts),
    cameraPose(phaseAtSeconds(duration,duration,'boomerang'),opts));
  assert.notDeepEqual(poses[0],poses[steps/2]);
});
test('phase scrub is frame-pure and uses the same material phase as export',()=>{
  const seconds=5,playback='cycle',options={motion:'figure8',cycles:2};
  const t=seconds*.62;
  const live=phaseAtSeconds(t,seconds,playback);
  approx(live,TAU*.62);
  samePose(cameraPose(live,options),
    cameraPose(framePhase(62,100,playback),options));
});
test('camera gesture translates and pinches only a crop, not growth arrays',()=>{
  const original={focusX:.5,focusY:.6,zoom:1.1};
  const dragged=cameraGesturePose(original,{dx:.15,dy:-.20,scale:1.8});
  approx(dragged.focusX,.35);approx(dragged.focusY,.8);
  approx(dragged.zoom,1.98);
  const edge=cameraGesturePose(original,{dx:5,dy:-5,scale:40});
  assert.deepEqual(edge,{focusX:0,focusY:1,zoom:2.5});
  assert.deepEqual(original,{focusX:.5,focusY:.6,zoom:1.1});
});
test('inverse crop picks actual source site in portrait and widescreen',()=>{
  for(const aspect of ['9:16','16:9','3:4','4:3','1:1']){
    const {width,height}=cinematicDimensions(1024,aspect);
    const lens={framing:'cover',focusX:.43,focusY:.62,zoom:1.45};
    const rect=cinematicFrameRect(1024,width,height,lens);
    const u=.31,v=.77;
    const source=pickCinematicSource(u,v,1024,width,height,lens);
    approx(source.x,(rect.sx+u*rect.sw)/1024);
    approx(source.y,(rect.sy+v*rect.sh)/1024);
  }
});
test('letterboxed bars reject target picking, not mistaken for mineral',()=>{
  const lens={framing:'contain',zoom:1};
  assert.equal(pickCinematicSource(.5,.03,1024,576,1024,lens),null);
  const center=pickCinematicSource(.5,.5,1024,576,1024,lens);
  approx(center.x,.5);approx(center.y,.5);
});
test('camera inverse mapping forbids malformed picks and invalid settings',()=>{
  assert.equal(pickCinematicSource(-.1,.5,1024,576,1024),null);
  assert.equal(pickCinematicSource(.5,2,1024,576,1024),null);
  assert.throws(()=>cameraPose(.4,{motion:'does-not-exist'}));
  assert.throws(()=>cameraPose(.4,{cycles:1.5}));
  assert.throws(()=>cameraPose(.4,{dive:4}));
  assert.throws(()=>cameraGesturePose({focusX:0,focusY:.5,zoom:1},{scale:0}));
});
test('camera presets are opt-in and saved with DNA + entire world checkpoint',()=>{
  const w=new GrowthEngine(773);
  assert.equal(w.config.surfaceCameraMotion,'still');
  w.setConfig({
    surfaceLoopAspect:'9:16',surfaceLoopFraming:'cover',
    surfaceCameraMotion:'target',surfaceCameraTravel:.85,
    surfaceCameraDive:.9,surfaceCameraOffset:.125,
    surfaceCameraCycles:2,surfaceCameraTargetX:.31,
    surfaceCameraTargetY:.77
  });
  const keys=['surfaceCameraMotion','surfaceCameraTravel','surfaceCameraDive',
    'surfaceCameraOffset','surfaceCameraCycles','surfaceCameraTargetX',
    'surfaceCameraTargetY'];
  const second=new GrowthEngine(12);second.loadDNA(w.getDNA());
  for(const key of keys)assert.equal(second.config[key],w.config[key]);
  const restored=new GrowthEngine(13);
  restored.restoreCheckpoint(w.getCheckpoint());
  for(const key of keys)assert.equal(restored.config[key],w.config[key]);
  const pose=cameraPoseFromConfig(.53,w.config);
  samePose(cameraPoseFromConfig(.53,restored.config),pose);
  assert.equal(Object.keys(PALETTES).length,199);
});
test('old DNA missing camera motion keys retains original static frame',()=>{
  const old=new GrowthEngine(55),data=structuredClone(old.getDNA());
  for(const name of Object.keys(old.config).filter(k=>k.startsWith('surfaceCamera')))
    delete data.config[name];
  const target=new GrowthEngine(98);target.loadDNA(data);
  assert.equal(target.config.surfaceCameraMotion,'still');
  const pose=cameraPoseFromConfig(3.32,target.config);
  approx(pose.focusX,target.config.surfaceLoopFocusX);
  approx(pose.focusY,target.config.surfaceLoopFocusY);
  approx(pose.zoom,target.config.surfaceLoopZoom);
});
test('04H controls use single preview-to-export camera pose and preserve growth gesture editing',async()=>{
  const {readFileSync}=await import('node:fs');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  for(const id of ['surface-camera-motion','surface-camera-travel',
    'surface-camera-dive','surface-camera-cycles','surface-camera-offset',
    'surface-camera-target-x','surface-camera-target-y',
    'surface-camera-scrub','surface-camera-grab','surface-camera-pick',
    'surface-camera-replay','surface-camera-reset'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(main,/const pose=cameraPoseFromConfig\(phase,engine\.config\)/);
  assert.match(main,/const pose=cameraPoseFromConfig\(phase,config\)/);
  assert.match(main,/pickCinematicSource\(/);
  assert.match(main,/cameraGesturePose\(/);
  assert.match(main,/surfaceLoopScrubbing/);
  assert.match(main,/surfaceGestureEditor\.begin/);
  assert.match(main,/handleCameraPointerDown\(e\)/);
});
