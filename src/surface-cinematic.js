// EX NIHILO 04G — composition framing, no source geometry mutation.
// All lengths computed from an output LONG EDGE; 9:16 = 576x1024 at 1024.
export const LOOP_ASPECTS=Object.freeze({
  '1:1':[1,1], '9:16':[9,16], '16:9':[16,9],
  '3:4':[3,4], '4:3':[4,3]
});
export const LOOP_FRAMINGS=Object.freeze({
  cover:'FILL FRAME · ART-DIRECTED CROP',
  contain:'FIT WHOLE ART · BACKGROUND BARS'
});
export const LOOP_BITRATES=Object.freeze({
  balanced:5_000_000, high:12_000_000, maximum:20_000_000
});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function cinematicDimensions(longEdge=512,aspect='1:1'){
  if(!Number.isInteger(longEdge)||longEdge<16||longEdge>1920||
    !Object.hasOwn(LOOP_ASPECTS,aspect))throw Error('Invalid cinema dimensions');
  const [a,b]=LOOP_ASPECTS[aspect];
  const even=v=>Math.max(2,2*Math.round(v/2));
  const width=a>=b?longEdge:even(longEdge*a/b);
  const height=a>=b?even(longEdge*b/a):longEdge;
  return {width,height,aspect};
}
export function cinematicFrameRect(sourceSize,width,height,{
  framing='cover',focusX=.5,focusY=.5,zoom=1
}={}){
  if(!Number.isFinite(sourceSize)||sourceSize<=0||
    !Number.isInteger(width)||width<=0||
    !Number.isInteger(height)||height<=0||
    !Object.hasOwn(LOOP_FRAMINGS,framing)||
    ![focusX,focusY,zoom].every(Number.isFinite)||
    focusX<0||focusX>1||focusY<0||focusY>1||
    zoom<1||zoom>2.5)throw Error('Invalid cinematic framing');
  const aspect=width/height;
  // Cover crops the source to match the target without deformation.
  // Contain displays the original square surrounded by artwork background.
  const sw=(framing==='cover'?(aspect>=1?1:aspect):1)*sourceSize/zoom;
  const sh=(framing==='cover'?(aspect>=1?1/aspect:1):1)*sourceSize/zoom;
  const dw=framing==='cover'?width:Math.min(width,height);
  const dh=framing==='cover'?height:Math.min(width,height);
  return {
    sx:(sourceSize-sw)*focusX,sy:(sourceSize-sh)*focusY,
    sw,sh,
    dx:(width-dw)/2,dy:(height-dh)/2,dw,dh
  };
}
export function paintCinematicFrame(ctx,source,{
  width,height,framing='cover',focusX=.5,focusY=.5,zoom=1,
  background='#05060c'
}={}){
  if(!ctx||!source||!Number.isInteger(width)||!Number.isInteger(height))
    throw Error('Canvas frame is unavailable');
  const size=source.width;
  const rect=cinematicFrameRect(size,width,height,{
    framing,focusX,focusY,zoom
  });
  ctx.save();
  ctx.fillStyle=background;
  ctx.fillRect(0,0,width,height);
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(source,rect.sx,rect.sy,rect.sw,rect.sh,
    rect.dx,rect.dy,rect.dw,rect.dh);
  ctx.restore();
  return rect;
}
// Inverse of the exact composition transform: a tap on the rendered
// preview chooses a real spot in the original 192x192 mineral world.
// Letterbox bars are non-interactive; their apparent space is not material.
export function pickCinematicSource(u,v,sourceSize,width,height,{
  framing='cover',focusX=.5,focusY=.5,zoom=1
}={}){
  if(!Number.isFinite(u)||!Number.isFinite(v)||u<0||u>1||v<0||v>1)
    return null;
  const r=cinematicFrameRect(sourceSize,width,height,{
    framing,focusX,focusY,zoom
  });
  const px=u*width,py=v*height;
  if(px<r.dx||px>r.dx+r.dw||py<r.dy||py>r.dy+r.dh)
    return null;
  return {
    x:clamp((r.sx+(px-r.dx)/r.dw*r.sw)/sourceSize,0,1),
    y:clamp((r.sy+(py-r.dy)/r.dh*r.sh)/sourceSize,0,1)
  };
}
// Approximate app-overlay exclusion area. Preview only; it must never be
// embedded into a GIF, MP4, or PNG file. Social apps can change their UI.
export function cinematicSafeArea(width,height,aspect='9:16'){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)
    throw Error('Invalid safe-area dimensions');
  const portrait=aspect==='9:16'||aspect==='3:4';
  const marginX=portrait?.11:.06,top=portrait?.14:.06,bottom=portrait?.21:.09;
  return {x:width*marginX,y:height*top,
    width:width*(1-2*marginX),height:height*(1-top-bottom)};
}
export function drawCinematicGuides(ctx,{x,y,width,height,aspect='9:16'}={}){
  if(!ctx)return;
  const guide=cinematicSafeArea(width,height,aspect);
  ctx.save();ctx.strokeStyle='rgba(240,255,255,.86)';
  ctx.lineWidth=Math.max(1.5,width/450);
  ctx.setLineDash([8,6]);
  ctx.strokeRect(x+guide.x,y+guide.y,guide.width,guide.height);
  ctx.setLineDash([]);ctx.restore();
}
