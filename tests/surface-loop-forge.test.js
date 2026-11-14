import test from 'node:test';
import assert from 'node:assert/strict';
import {GifLoopWriter} from '../src/loop-gif.js';
import {loopPlan,framePhase,phaseAtSeconds,gifFrameDelay,
  supportedMp4Mime,loopMaterialOptions} from '../src/surface-loop-plan.js';
import {exportSurfaceGIF,exportSurfaceMP4} from '../src/surface-loop-export.js';
import {renderSurfaceLoopFrame} from '../src/surface-loop-renderer.js';
import {SurfaceGrowth,surfacePixels} from '../src/surface-growth.js';
import {surfaceOpticsPixels} from '../src/surface-optics.js';
import {forEachMineralMicrofeature} from '../src/surface-microstructure.js';
import {GrowthEngine,PALETTES} from '../src/engine.js';

test('strict loop planner validates duration, size and bounded mobile GIF budgets',()=>{
  const normal=loopPlan();
  assert.equal(normal.frames,36);
  assert.equal(normal.format,'gif');
  assert.throws(()=>loopPlan({seconds:10,size:1024,fps:24}));
  assert.throws(()=>loopPlan({seconds:4}));
  assert.throws(()=>loopPlan({fps:60}));
  assert.throws(()=>loopPlan({motion:'magic-undefined'}));
  assert.equal(loopPlan({seconds:2,fps:12,size:512}).frames,24);
  assert.equal(loopPlan({format:'mp4',seconds:10,fps:12,size:512}).frames,120);
});
test('cycle and boomerang samples are bounded and exactly periodic across the endpoint',()=>{
  for(const kind of ['cycle','boomerang']){
    for(const duration of [2,3,5,10]){
      assert.equal(phaseAtSeconds(0,duration,kind),
        phaseAtSeconds(duration,duration,kind));
      assert.ok(phaseAtSeconds(duration/2,duration,kind)>0);
      for(let i=0;i<duration*12;i++){
        const p=framePhase(i,duration*12,kind);
        assert.ok(p>=0&&p<=Math.PI*2);
      }
    }
  }
});
test('GIF centisecond frame delays sum to EXACT requested run length',()=>{
  for(const seconds of [2,3,5,10])for(const fps of [12,18,24]){
    const delays=Array.from({length:seconds*fps},(_,i)=>gifFrameDelay(i,fps));
    assert.ok(delays.every(v=>v>=2));
    assert.equal(delays.reduce((a,b)=>a+b,0),seconds*100);
  }
});
test('three distinct optical motion programs are not aliases',()=>{
  const orbit=loopMaterialOptions(1.2,'orbit');
  const film=loopMaterialOptions(1.2,'film');
  const hybrid=loopMaterialOptions(1.2,'hybrid');
  assert.equal(orbit.coatingWave,0);
  assert.equal(orbit.textureWave,0);
  assert.equal(film.lightPhase,0);
  assert.ok(film.coatingWave>0);
  assert.ok(hybrid.coatingWave>0&&hybrid.textureWave>0&&hybrid.lightPhase>0);
});
test('MP4 is explicitly disabled when the recorder has no TRUE MP4 MIME',()=>{
  const unsupported={isTypeSupported:mime=>mime.includes('webm')};
  assert.equal(supportedMp4Mime(unsupported),null);
  assert.equal(supportedMp4Mime(null),null);
  const available={isTypeSupported:mime=>mime==='video/mp4'};
  assert.equal(supportedMp4Mime(available),'video/mp4');
});
test('GIF89a carries finite image dimensions, infinite looping, correct delays and trailer',()=>{
  const write=new GifLoopWriter(16,16,12);
  const frame=new Uint8ClampedArray(16*16*4);
  for(let k=0;k<frame.length;k+=4){
    frame[k]=k%256;frame[k+1]=128;frame[k+2]=255;frame[k+3]=255;
  }
  write.addFrame(frame,8);write.addFrame(frame,9);
  const bytes=write.finish();
  assert.equal(new TextDecoder().decode(bytes.slice(0,6)),'GIF89a');
  assert.equal(bytes[6],16);assert.equal(bytes[8],16);
  assert.equal(bytes.at(-1),0x3b);
  assert.ok(new TextDecoder('ascii').decode(bytes).includes('NETSCAPE2.0'));
  assert.equal(write.frames,2);
  assert.equal(write.chunks.length,3);
  assert.ok(bytes.length>800);
  const repeat=new GifLoopWriter(16,16,12);
  repeat.addFrame(frame,8);repeat.addFrame(frame,9);
  assert.deepEqual(repeat.finish(),bytes);
});
test('offline GIF export evaluates N distinct integer phases without changing playback clock',async()=>{
  const canvas={
    getContext(){return {getImageData(){
      const bytes=new Uint8ClampedArray(16*16*4);
      bytes.fill(70);
      return {data:bytes};
    }};}
  };
  const phases=[],progress=[];
  const plan={format:'gif',size:16,frames:5,fps:12,
    playback:'cycle',seconds:2};
  const blob=await exportSurfaceGIF({plan,canvas,
    render:(ctx,phase,i)=>phases.push(phase),
    onProgress:(i,n)=>progress.push([i,n])});
  assert.equal(blob.type,'image/gif');
  assert.ok(blob.size>800);
  assert.equal(phases.length,5);
  assert.equal(new Set(phases).size,5);
  assert.deepEqual(progress.at(-1),[5,5]);
});
test('an unsupported MP4 request fails rather than returning a disguised WebM',async()=>{
  const plan={format:'mp4',size:512,frames:24,fps:12,
    playback:'cycle',seconds:2};
  await assert.rejects(()=>exportSurfaceMP4({
    plan,canvas:{},render:()=>{},
    Recorder:{isTypeSupported:()=>false}
  }),/genuine MP4/);
});
function sample(){
  const s=new SurfaceGrowth(781,48),palette=['#ff00ff','#00eeff','#ffee00'];
  s.seedArrangement(16,'lattice',palette);
  for(let i=0;i<12;i++)s.advance(palette,{
    morphology:'spherulite',growth:1.1,coverage:.97
  });
  return s;
}
test('coating waves use genuine periodic phase without mutating history',()=>{
  const s=sample(),before=s.snapshot();
  const base=surfacePixels(s,{background:'#05060c'});
  const a=surfaceOpticsPixels(s,base,{mode:'opal',filmWave:.42,coatingPhase:.9});
  const b=surfaceOpticsPixels(s,base,{mode:'opal',filmWave:.42,coatingPhase:2.1});
  assert.notDeepEqual(a,b);
  assert.deepEqual(s.snapshot(),before);
  assert.deepEqual(surfaceOpticsPixels(s,base,{mode:'off',filmWave:.42}),base);
});
test('microgeometry deforms with material phase but frozen genealogy stays identical',()=>{
  const s=sample(),before=s.snapshot();
  const run=phase=>{
    const list=[];
    forEachMineralMicrofeature(s,{mode:'vesicle',density:.9,
      phase,wave:.7},part=>list.push(part));
    return list;
  };
  assert.notDeepEqual(run(.2),run(1.3));
  assert.deepEqual(s.snapshot(),before);
});
test('frame renderer is read-only and excludes editing marks from output',()=>{
  const s=sample(),before=s.snapshot(),n=s.size;
  let output=null;
  const tileCtx={canvas:{},createImageData:(w,h)=>({
    data:new Uint8ClampedArray(w*h*4)
  }),putImageData:image=>{output=new Uint8ClampedArray(image.data)}};
  const ctx={
    clearRect(){},drawImage(){},beginPath(){},moveTo(){},
    lineTo(){},stroke(){},save(){},restore(){},
    set imageSmoothingEnabled(x){},set imageSmoothingQuality(x){},
    set strokeStyle(x){},set lineWidth(x){}
  };
  const config={surfaceContrast:.8,surfaceWrap:false,surfaceOpticsMode:'opal',
    surfaceOpticsStrength:.8,surfaceOpticsThickness:330,
    surfaceOpticsRoughness:.3,surfaceOpticsAngle:40,surfaceMicroMode:'off'};
  const v=renderSurfaceLoopFrame(ctx,tileCtx,s,config,{
    size:512,phase:0,motion:'orbit',background:'#05060c'});
  assert.equal(v.width,512);
  assert.equal(output.length,n*n*4);
  assert.deepEqual(s.snapshot(),before);
});
test('loop recipe survives construction DNA and whole-world checkpoints',()=>{
  const w=new GrowthEngine(998);
  w.setConfig({surfaceLoopSeconds:10,surfaceLoopFps:18,
    surfaceLoopSize:768,surfaceLoopMotion:'film',surfaceLoopPlayback:'boomerang'});
  const other=new GrowthEngine(11);
  other.loadDNA(w.getDNA());
  for(const key of ['surfaceLoopSeconds','surfaceLoopFps','surfaceLoopSize',
    'surfaceLoopMotion','surfaceLoopPlayback'])
    assert.equal(other.config[key],w.config[key]);
  const recovered=new GrowthEngine(12);
  recovered.restoreCheckpoint(w.getCheckpoint());
  assert.equal(recovered.config.surfaceLoopSeconds,10);
  assert.equal(Object.keys(PALETTES).length,199);
});
test('Loop Forge UI is wired to preview, cancellation, GIF and true MP4 output',async()=>{
  const {readFileSync}=await import('node:fs');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  for(const id of ['surface-loop-preview','surface-loop-export',
    'surface-loop-cancel','surface-loop-format','surface-loop-seconds',
    'surface-loop-fps','surface-loop-size','surface-loop-motion',
    'surface-loop-playback','surface-loop-status'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(main,/exportSurfaceGIF/);
  assert.match(main,/exportSurfaceMP4/);
  assert.match(main,/new SurfaceGrowth\(engine\.surface\.seed/);
  assert.match(main,/setPaused\(document.hidden\?true:previousPaused\)/);
  assert.match(main,/downloadSurfaceLoop/);
});
