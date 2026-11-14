// EX NIHILO PHASE 04F — deterministic offscreen material-frame renderer.
// This is an alternate render pipeline for exports, NOT a replacement for
// the interactive 3D scene, CA updates, Gesture Witch or the existing PNG.
import {surfacePixels} from './surface-growth.js';
import {surfaceOpticsPixels} from './surface-optics.js';
import {paintSurfaceMicrostructure} from './surface-microstructure.js';
import {loopMaterialOptions} from './surface-loop-plan.js';
export function renderSurfaceLoopFrame(ctx,tileCtx,surface,config,{
  size=512,phase=0,motion='hybrid',background='#05060c',
  quality='export'
}={}){
  if(!ctx||!tileCtx||!surface||!config||!Number.isInteger(size)||
    size<16||size>2048||!Number.isFinite(phase))throw Error('Invalid loop renderer arguments');
  const n=surface.size;
  const material=loopMaterialOptions(phase,motion);
  const base=surfacePixels(surface,{
    contrast:config.surfaceContrast,background,
    wrap:config.surfaceWrap
  });
  const pixels=config.surfaceOpticsMode==='off'?base:
    surfaceOpticsPixels(surface,base,{
      mode:config.surfaceOpticsMode,
      strength:config.surfaceOpticsStrength,
      thickness:config.surfaceOpticsThickness,
      roughness:config.surfaceOpticsRoughness,
      angle:config.surfaceOpticsAngle,phase:material.lightPhase,
      filmWave:material.coatingWave,
      coatingPhase:material.coatingPhase,
      background,wrap:config.surfaceWrap,
      filmIndex:config.surfaceFilmIndex,
      substrateIndex:config.surfaceSubstrateIndex,
      polarization:config.surfacePolarization
    });
  const image=tileCtx.createImageData(n,n);
  image.data.set(pixels);
  tileCtx.putImageData(image,0,0);
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.clearRect(0,0,size,size);
  ctx.drawImage(tileCtx.canvas,0,0,size,size);
  if(config.surfaceMicroMode!=='off'&&config.surfaceMicroDensity>0){
    paintSurfaceMicrostructure(ctx,surface,{
      mode:config.surfaceMicroMode,density:config.surfaceMicroDensity,
      quality:size<=768?'preview':quality,
      wrap:config.surfaceWrap,left:0,top:0,size,
      lightAngle:config.surfaceOpticsAngle+
        material.lightPhase*180/Math.PI,
      phase:material.texturePhase,wave:material.textureWave
    });
  }
  // Retained grain boundaries are the real family interfaces.
  // Do not draw Gesture Witch handles into exported artwork.
  const w=size/n,owner=surface.owner,wrap=config.surfaceWrap;
  ctx.beginPath();
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const family=owner[x+n*y];if(!family)continue;
    const nextX=x+1<n?x+1:wrap?0:-1;
    const nextY=y+1<n?y+1:wrap?0:-1;
    if(nextX>=0&&owner[nextX+n*y]&&owner[nextX+n*y]!==family){
      ctx.moveTo((x+1)*w,y*w);ctx.lineTo((x+1)*w,(y+1)*w);
    }
    if(nextY>=0&&owner[x+nextY*n]&&owner[x+nextY*n]!==family){
      ctx.moveTo(x*w,(y+1)*w);ctx.lineTo((x+1)*w,(y+1)*w);
    }
  }
  ctx.strokeStyle='rgba(239,245,255,.34)';
  ctx.lineWidth=Math.max(.65,size/2048*1.5);
  ctx.stroke();
  return {width:size,height:size,material,pixels};
}
