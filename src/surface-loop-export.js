// EX NIHILO / PHASE 04F — exported animations from a frozen specimen.
// The caller is responsible for a cloned SurfaceGrowth snapshot and restoring
// normal play/pause state. No network/API/paid encoder is used.
import {GifLoopWriter} from './loop-gif.js';
import {framePhase,gifFrameDelay,supportedMp4Mime} from './surface-loop-plan.js';
export function abortIfNeeded(signal){
  if(signal?.aborted)throw new DOMException('Capture canceled','AbortError');
}
const yieldThread=()=>new Promise(resolve=>setTimeout(resolve,0));
export async function exportSurfaceGIF({plan,canvas,render,onProgress=()=>{},signal}){
  if(plan.format!=='gif')throw Error('GIF settings required');
  canvas.width=plan.size;canvas.height=plan.size;
  const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
  if(!ctx)throw Error('Canvas 2D unavailable');
  const encoder=new GifLoopWriter(plan.size,plan.size,plan.fps);
  for(let i=0;i<plan.frames;i++){
    abortIfNeeded(signal);
    render(ctx,framePhase(i,plan.frames,plan.playback),i);
    abortIfNeeded(signal);
    const pixels=ctx.getImageData(0,0,plan.size,plan.size);
    encoder.addFrame(pixels.data,gifFrameDelay(i,plan.fps));
    onProgress(i+1,plan.frames);
    if(i%2===1)await yieldThread();
  }
  abortIfNeeded(signal);
  return new Blob([encoder.finish()],{type:'image/gif'});
}
export async function exportSurfaceMP4({plan,canvas,render,onProgress=()=>{},
  signal,Recorder=globalThis.MediaRecorder}){
  if(plan.format!=='mp4')throw Error('MP4 settings required');
  const mime=supportedMp4Mime(Recorder);
  if(!mime||typeof canvas.captureStream!=='function')
    throw Error('This browser cannot record genuine MP4 from a canvas. Use GIF instead.');
  canvas.width=plan.size;canvas.height=plan.size;
  const context=canvas.getContext('2d',{alpha:false});
  if(!context)throw Error('Canvas 2D unavailable');
  // Manual frames where supported; otherwise realtime captureStream(fps)
  // is used. MP4 timestamps are produced by the browser, not an invented
  // container muxer. Long CPU-bound frames may cause dropped frames.
  let stream,recorder;
  try{
    stream=canvas.captureStream(0);
    let track=stream.getVideoTracks()[0];
    const request=typeof track?.requestFrame==='function';
    if(!request){
      for(const t of stream.getTracks())t.stop();
      stream=canvas.captureStream(plan.fps);
      track=stream.getVideoTracks()[0];
    }
    if(!track)throw Error('Canvas capture has no video track');
    recorder=new Recorder(stream,{mimeType:mime,
      videoBitsPerSecond:Math.min(12000000,Math.max(5000000,plan.size*plan.size*12))});
    if(!recorder.mimeType?.toLowerCase().includes('mp4'))
      throw Error('Recorder selected a format other than MP4');
    const chunks=[];
    const done=new Promise((resolve,reject)=>{
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
      recorder.onerror=e=>reject(new Error(e.error?.message||'MP4 recorder failed'));
      recorder.onstop=()=>resolve();
    });
    recorder.start();
    const origin=performance.now();
    for(let i=0;i<plan.frames;i++){
      abortIfNeeded(signal);
      const target=origin+i*1000/plan.fps;
      const wait=target-performance.now();
      if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));
      abortIfNeeded(signal);
      render(context,framePhase(i,plan.frames,plan.playback),i);
      if(request)track.requestFrame();
      onProgress(i+1,plan.frames);
      // Slow devices can miss realtime deadlines. The frame's mathematical
      // phase is deterministic, but recorded timestamps are not guaranteed.
    }
    const remaining=origin+plan.seconds*1000-performance.now();
    if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
    if(recorder.state!=='inactive')recorder.stop();
    await done;
    abortIfNeeded(signal);
    const blob=new Blob(chunks,{type:recorder.mimeType});
    if(!blob.size)throw Error('Browser produced an empty MP4 recording');
    return blob;
  }finally{
    if(recorder&&recorder.state!=='inactive'){
      try{recorder.stop();}catch{/* recorder may already be stopping */}
    }
    if(stream)for(const t of stream.getTracks())t.stop();
  }
}
