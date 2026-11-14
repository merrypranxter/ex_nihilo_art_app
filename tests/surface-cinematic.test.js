import test from 'node:test';
import assert from 'node:assert/strict';
import {LOOP_ASPECTS,LOOP_FRAMINGS,LOOP_BITRATES,
  cinematicDimensions,cinematicFrameRect,
  cinematicSafeArea,paintCinematicFrame,drawCinematicGuides}
  from '../src/surface-cinematic.js';
import {loopPlan} from '../src/surface-loop-plan.js';
import {GrowthEngine,PALETTES} from '../src/engine.js';

test('true aspect ratio output with even H.264-safe dimensions',()=>{
  assert.deepEqual(cinematicDimensions(1024,'1:1'),
    {width:1024,height:1024,aspect:'1:1'});
  assert.deepEqual(cinematicDimensions(1024,'9:16'),
    {width:576,height:1024,aspect:'9:16'});
  assert.deepEqual(cinematicDimensions(1024,'16:9'),
    {width:1024,height:576,aspect:'16:9'});
  assert.deepEqual(cinematicDimensions(1024,'3:4'),
    {width:768,height:1024,aspect:'3:4'});
  assert.deepEqual(cinematicDimensions(1024,'4:3'),
    {width:1024,height:768,aspect:'4:3'});
  assert.deepEqual(cinematicDimensions(1920,'9:16'),
    {width:1080,height:1920,aspect:'9:16'});
});
test('cover crop never stretches its source pixels',()=>{
  for(const aspect of Object.keys(LOOP_ASPECTS)){
    const {width,height}=cinematicDimensions(1024,aspect);
    const rect=cinematicFrameRect(1024,width,height,{framing:'cover'});
    assert.ok(Math.abs(rect.sw/rect.sh-width/height)<1e-10);
    assert.ok(Math.abs(rect.dw/rect.dh-width/height)<1e-10);
    assert.ok(rect.sw<=1024&&rect.sh<=1024);
    assert.ok(rect.sx>=0&&rect.sy>=0);
  }
});
test('portrait crops horizontally while widescreen crops vertically',()=>{
  const portrait=cinematicFrameRect(1024,576,1024);
  const landscape=cinematicFrameRect(1024,1024,576);
  assert.equal(portrait.sh,1024);
  assert.equal(portrait.sw,576);
  assert.equal(landscape.sw,1024);
  assert.equal(landscape.sh,576);
});
test('fit framing displays the complete square with background bars',()=>{
  const p=cinematicFrameRect(1024,576,1024,{framing:'contain'});
  assert.equal(p.sx,0);assert.equal(p.sy,0);
  assert.equal(p.sw,1024);assert.equal(p.sh,1024);
  assert.equal(p.dw,576);assert.equal(p.dh,576);
  assert.equal(p.dy,224);
});
test('pan and zoom are meaningful, bounded and responsive',()=>{
  const left=cinematicFrameRect(1024,576,1024,{
    framing:'cover',focusX:0,zoom:1.5});
  const right=cinematicFrameRect(1024,576,1024,{
    framing:'cover',focusX:1,zoom:1.5});
  assert.ok(right.sx>left.sx);
  assert.ok(left.sw<576);
  assert.throws(()=>cinematicFrameRect(1024,576,1024,{zoom:9}));
  assert.throws(()=>cinematicFrameRect(1024,576,1024,{focusY:-1}));
});
test('render correctly fills background and applies a SINGLE cropped draw',()=>{
  const operations=[];
  const context={
    save(){operations.push('save')},restore(){operations.push('restore')},
    fillRect(...args){operations.push(['fill',...args])},
    drawImage(...args){operations.push(['image',...args])},
    set fillStyle(value){operations.push(['color',value])},
    set imageSmoothingEnabled(v){},set imageSmoothingQuality(v){}
  };
  const src={width:1024,height:1024};
  const rect=paintCinematicFrame(context,src,{
    width:576,height:1024,framing:'cover',focusX:.2,zoom:1.5});
  const command=operations.find(op=>Array.isArray(op)&&op[0]==='image');
  assert.equal(command[1],src);
  assert.equal(command[4],rect.sw);
  assert.equal(command[5],rect.sh);
  assert.equal(command[8],576);
  assert.equal(command[9],1024);
  assert.deepEqual(operations.find(op=>Array.isArray(op)&&op[0]==='fill'),
    ['fill',0,0,576,1024]);
});
test('social overlay has real portrait margins and never changes exported drawing',()=>{
  const portrait=cinematicSafeArea(576,1024,'9:16');
  assert.ok(portrait.y>100&&portrait.height<800);
  assert.ok(portrait.width<576);
  const log=[];
  const ctx={save(){},restore(){},strokeRect(...args){log.push(args)},
    setLineDash(){},set strokeStyle(v){},set lineWidth(v){}};
  drawCinematicGuides(ctx,{x:10,y:20,width:576,height:1024,aspect:'9:16'});
  assert.equal(log.length,1);
  assert.ok(log[0][0]>10&&log[0][1]>20);
});
test('format-aware pixel-frame budgets reject dangerous jobs before allocation',()=>{
  const portrait=loopPlan({aspect:'9:16',size:1024,seconds:3,fps:12});
  assert.equal(portrait.width,576);
  assert.equal(portrait.height,1024);
  assert.equal(portrait.pixelFrames,576*1024*36);
  assert.throws(()=>loopPlan({format:'gif',size:1920,aspect:'9:16'}),/1024px/);
  assert.throws(()=>loopPlan({format:'gif',size:1024,aspect:'9:16',
    seconds:10,fps:24}),/budget/);
  assert.throws(()=>loopPlan({format:'mp4',size:1920,aspect:'9:16',
    seconds:10,fps:24}),/too large/);
  const hd=loopPlan({format:'mp4',size:1920,aspect:'9:16',
    seconds:3,fps:12});
  assert.equal(hd.height,1920);
  assert.equal(hd.width,1080);
});
test('video bitrate is requested, not substituted by a media-container lie',()=>{
  assert.equal(LOOP_BITRATES.maximum,20_000_000);
  for(const bitrate of Object.keys(LOOP_BITRATES)){
    const recipe=loopPlan({format:'mp4',bitrate,aspect:'16:9'});
    assert.equal(recipe.videoBitsPerSecond,LOOP_BITRATES[bitrate]);
  }
});
test('legacy 1:1 recipe, source files and save preferences are maintained',()=>{
  const w=new GrowthEngine(3999);
  assert.equal(w.config.surfaceLoopAspect,'1:1');
  assert.equal(w.config.surfaceLoopZoom,1);
  w.setConfig({surfaceLoopAspect:'9:16',surfaceLoopFraming:'contain',
    surfaceLoopFocusX:.2,surfaceLoopFocusY:.8,surfaceLoopZoom:2,
    surfaceLoopBitrate:'maximum',surfaceLoopGuides:false});
  const copied=new GrowthEngine(4000);
  copied.loadDNA(w.getDNA());
  for(const key of ['surfaceLoopAspect','surfaceLoopFraming',
    'surfaceLoopFocusX','surfaceLoopFocusY','surfaceLoopZoom',
    'surfaceLoopBitrate','surfaceLoopGuides'])
    assert.equal(copied.config[key],w.config[key]);
  const restored=new GrowthEngine(4001);
  restored.restoreCheckpoint(w.getCheckpoint());
  assert.equal(restored.config.surfaceLoopAspect,'9:16');
  assert.equal(Object.keys(PALETTES).length,199);
});
test('iPhone UI selects aspect, zoom, safe guides and true MP4 diagnostics',async()=>{
  const {readFileSync}=await import('node:fs');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const exporter=readFileSync(new URL('../src/surface-loop-export.js',import.meta.url),'utf8');
  for(const id of ['surface-loop-aspect','surface-loop-framing',
    'surface-loop-focus-x','surface-loop-focus-y','surface-loop-zoom',
    'surface-loop-bitrate','surface-loop-guides'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(main,/paintCinematicFrame\(/);
  assert.match(main,/drawCinematicGuides\(/);
  assert.match(exporter,/plan\.width\?\?plan\.size/);
  assert.match(exporter,/videoBitsPerSecond:plan\.videoBitsPerSecond/);
  assert.match(exporter,/ftyp/);
  assert.match(exporter,/lateFrames/);
});
