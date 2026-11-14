// EX NIHILO / PHASE 04F — loop phase planner, no browser dependencies.
// Every rendered phase is sampled from integer frame count, not wall time.
import {LOOP_ASPECTS,LOOP_FRAMINGS,LOOP_BITRATES,cinematicDimensions} from './surface-cinematic.js';
export const LOOP_SECONDS=Object.freeze([2,3,5,10]);
export const LOOP_FPS=Object.freeze([12,18,24]);
export const LOOP_SIZES=Object.freeze([512,768,1024,1920]);
export const LOOP_MOTIONS=Object.freeze({
  orbit:'LIGHT ORBIT · MOVING REFLECTIONS',
  film:'FILM TIDE · OPTICAL COATING THICKNESS',
  hybrid:'LIVING MATERIAL · LIGHT + MICROSTRUCTURE'
});
export const LOOP_PLAYBACK=Object.freeze({
  cycle:'PERFECT CYCLE · PERIODIC',
  boomerang:'BOOMERANG · FORWARD AND BACK'
});
const TAU=Math.PI*2;
export function loopPlan({seconds=3,fps=12,size=512,
  playback='cycle',motion='hybrid',format='gif',
  aspect='1:1',framing='cover',focusX=.5,focusY=.5,zoom=1,
  bitrate='high'}={}){
  const int=(value,choices)=>Number.isInteger(value)&&choices.includes(value);
  if(!int(seconds,LOOP_SECONDS)||!int(fps,LOOP_FPS)||
     !int(size,LOOP_SIZES)||
     !Object.hasOwn(LOOP_PLAYBACK,playback)||
     !Object.hasOwn(LOOP_MOTIONS,motion)||
     !['gif','mp4'].includes(format)||
     !Object.hasOwn(LOOP_ASPECTS,aspect)||
     !Object.hasOwn(LOOP_FRAMINGS,framing)||
     !Object.hasOwn(LOOP_BITRATES,bitrate)||
     ![focusX,focusY,zoom].every(Number.isFinite)||
     focusX<0||focusX>1||focusY<0||focusY>1||
     zoom<1||zoom>2.5)
    throw Error('Invalid Loop Forge settings');
  const frames=seconds*fps;
  const {width,height}=cinematicDimensions(size,aspect);
  const pixelFrames=width*height*frames;
  // Prevent runaway iPhone GPU/CPU frame allocation before rendering starts.
  if(format==='gif'&&pixelFrames>50_000_000)
    throw Error('That GIF exceeds the mobile pixel-frame budget. Try 512px, 12fps, or a shorter loop.');
  if(format==='mp4'&&pixelFrames>200_000_000)
    throw Error('That MP4 is too large for reliable live phone recording. Lower dimensions, fps, or duration.');
  return Object.freeze({seconds,fps,size,playback,motion,format,frames,
    aspect,framing,focusX,focusY,zoom,bitrate,
    videoBitsPerSecond:LOOP_BITRATES[bitrate],width,height,pixelFrames});
}
export function framePhase(index,count,playback='cycle'){
  if(!Number.isInteger(index)||!Number.isInteger(count)||count<1||
     index<0||index>=count||!Object.hasOwn(LOOP_PLAYBACK,playback))
    throw Error('Invalid loop frame');
  const t=index/count;
  return playback==='boomerang'?
    .5*Math.PI*(1-Math.cos(TAU*t)):TAU*t;
}
export function phaseAtSeconds(time,seconds,playback='cycle'){
  if(!Number.isFinite(time)||!Number.isFinite(seconds)||seconds<=0||
     !Object.hasOwn(LOOP_PLAYBACK,playback))
    throw Error('Invalid loop clock');
  const t=((time%seconds)+seconds)%seconds/seconds;
  return playback==='boomerang'?
    .5*Math.PI*(1-Math.cos(TAU*t)):TAU*t;
}
export function gifFrameDelay(index,fps){
  if(!Number.isInteger(index)||index<0||!LOOP_FPS.includes(fps))
    throw Error('Invalid GIF frame timing');
  return Math.round((index+1)*100/fps)-Math.round(index*100/fps);
}
export function loopMaterialOptions(phase,motion='hybrid'){
  if(!Object.hasOwn(LOOP_MOTIONS,motion)||!Number.isFinite(phase))
    throw Error('Invalid loop motion');
  return {
    lightPhase:motion==='orbit'||motion==='hybrid'?phase:0,
    coatingPhase:phase,
    coatingWave:(motion==='film'||motion==='hybrid')?.42:0,
    texturePhase:motion==='hybrid'?phase:0,
    textureWave:motion==='hybrid'?.70:0
  };
}
export function supportedMp4Mime(MediaRecorderClass){
  if(!MediaRecorderClass||typeof MediaRecorderClass.isTypeSupported!=='function')
    return null;
  for(const mime of ['video/mp4;codecs="avc1.42E01E"','video/mp4;codecs=avc1.42E01E','video/mp4']){
    try{if(MediaRecorderClass.isTypeSupported(mime))return mime;}
    catch{/* unsupported MIME probing cannot break the GIF path */}
  }
  return null;
}
