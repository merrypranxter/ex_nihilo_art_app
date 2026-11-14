// EX NIHILO / 04H — exact periodic, reversible camera choreography.
// Runs only on a PRESENTATION crop. Never changes deposited matter, RNG,
// birth pigments, optical wavelengths, gesture fields or a 3D view camera.
export const SURFACE_CAMERA_MOVES=Object.freeze({
  still:'FROZEN CAMERA · ORIGINAL FRAME',
  orbit:'ORBITAL DRIFT · LENS CIRCLES THE FIELD',
  figure8:'FIGURE EIGHT · LISSAJOUS SCAN',
  microscope:'MICROSCOPE DIVE · APPROACH AND RETREAT',
  pendulum:'PENDULUM SURVEY · SWEEPING PAN',
  target:'TARGET DIVE · VISIT A SELECTED DETAIL'
});
export const SURFACE_CAMERA_CYCLES=Object.freeze([1,2,3]);
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const f=x=>typeof x==='number'&&Number.isFinite(x);
// For a camera centered near an edge, movement naturally becomes smaller
// rather than abruptly clipping against a hard 0/1 coordinate boundary.
function boundedSwing(center,amplitude,wave){
  const reach=Math.min(center,1-center);
  return clamp(center+reach*amplitude*wave,0,1);
}
export function cameraPose(phase,{
  motion='still',focusX=.5,focusY=.5,zoom=1,
  travel=.6,dive=.55,phaseOffset=0,cycles=1,
  targetX=.5,targetY=.5
}={}){
  if(!f(phase)||!Object.hasOwn(SURFACE_CAMERA_MOVES,motion)||
     ![focusX,focusY,zoom,travel,dive,phaseOffset,targetX,targetY].every(f)||
     focusX<0||focusX>1||focusY<0||focusY>1||
     targetX<0||targetX>1||targetY<0||targetY>1||
     zoom<1||zoom>2.5||travel<0||travel>1||
     dive<0||dive>1||phaseOffset<0||phaseOffset>1||
     !SURFACE_CAMERA_CYCLES.includes(cycles))
    throw Error('Invalid camera choreography');
  if(motion==='still')return {focusX,focusY,zoom};
  const p=phase*cycles+TAU*phaseOffset;
  const sin=Math.sin(p),cos=Math.cos(p),sin2=Math.sin(2*p);
  const pulse=.5-.5*Math.cos(p);
  // Additive range-to-maximum avoids unphysical flat spots near zoom=2.5.
  const magnify=weight=>zoom+(2.5-zoom)*dive*weight;
  let x=focusX,y=focusY,z=zoom;
  if(motion==='orbit'){
    x=boundedSwing(focusX,travel,cos);
    y=boundedSwing(focusY,travel,sin);
    z=magnify(.18*ease01(sin2));
  }else if(motion==='figure8'){
    x=boundedSwing(focusX,travel,sin);
    y=boundedSwing(focusY,travel,Math.sin(2*p+.32));
    z=magnify(.32*ease01(Math.sin(p+.45)));
  }else if(motion==='microscope'){
    x=boundedSwing(focusX,travel*.22,sin);
    y=boundedSwing(focusY,travel*.22,1-cos);
    z=magnify(pulse);
  }else if(motion==='pendulum'){
    x=boundedSwing(focusX,travel,sin);
    y=boundedSwing(focusY,travel*.20,Math.cos(2*p));
    z=magnify(.40*ease01(-cos));
  }else if(motion==='target'){
    // Target dive uses the exact authored spot, never a guessed feature.
    const t=travel*pulse;
    x=focusX+(targetX-focusX)*t;
    y=focusY+(targetY-focusY)*t;
    z=magnify(pulse);
  }
  return {focusX:clamp(x,0,1),focusY:clamp(y,0,1),
    zoom:clamp(z,1,2.5)};
}
function ease01(x){return .5+.5*x;}
export function cameraPoseFromConfig(phase,config={}){
  return cameraPose(phase,{
    motion:config.surfaceCameraMotion??'still',
    focusX:config.surfaceLoopFocusX??.5,
    focusY:config.surfaceLoopFocusY??.5,
    zoom:config.surfaceLoopZoom??1,
    travel:config.surfaceCameraTravel??.6,
    dive:config.surfaceCameraDive??.55,
    phaseOffset:config.surfaceCameraOffset??0,
    cycles:config.surfaceCameraCycles??1,
    targetX:config.surfaceCameraTargetX??.5,
    targetY:config.surfaceCameraTargetY??.5
  });
}
// Pure normalized gesture math: 1-finger camera-space translation and
// 2-finger pinch magnification never modify the crystal's native UVs.
export function cameraGesturePose(initial,{
  dx=0,dy=0,scale=1
}={}){
  if(!initial||![initial.focusX,initial.focusY,initial.zoom,dx,dy,scale].every(f)||
    scale<=0)throw Error('Invalid camera touch gesture');
  return {
    focusX:clamp(initial.focusX-dx,0,1),
    focusY:clamp(initial.focusY-dy,0,1),
    zoom:clamp(initial.zoom*scale,1,2.5)
  };
}
