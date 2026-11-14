// Ex Nihilo 04E / Texture Taxidermist — true SUBCELL vector structures.
// 192² real crystal cells remain the simulation; this derives reproducible
// fine-scale stroke geometry from their retained genealogy AT OUTPUT SCALE.
// It never fabricates new simulation cells, changes pigments, or paints marks.
export const SURFACE_MICROSTRUCTURES=Object.freeze({
  off:'NONE · ORIGINAL ARTWORK',
  lamella:'MOTHER-OF-PEARL · SHINGLED LAMELLAE',
  cleavage:'CLEAVAGE GLASS · FRACTURE MICROVEINS',
  vesicle:'PRECIOUS OPAL · GLOBULAR PORES'
});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function hash32(x){
  let a=x>>>0;
  a=Math.imul(a^(a>>>16),0x7feb352d);
  a=Math.imul(a^(a>>>15),0x846ca68b);
  return (a^(a>>>16))>>>0;
}
const unit=x=>(hash32(x)&0xffff)/65535;
const TAU=Math.PI*2;
// One tiny, self-contained hash-domain detail specimen. All coordinates are
// normalized within an ACTUAL occupied cell (0..1), so empty cells stay empty.
export function forEachMineralMicrofeature(surface,{
  mode='off',density=.65,quality='export',wrap=false
}={},visit){
  const n=surface?.size;
  if(!Number.isInteger(n)||n<16||n>192||
    typeof visit!=='function')throw Error('Invalid microstructure source');
  if(mode==='off'||!Object.hasOwn(SURFACE_MICROSTRUCTURES,mode))return 0;
  const d=clamp(Number.isFinite(density)?density:.65,0,1);
  if(d<=0)return 0;
  // Preview computes a sparse but geometrically honest sample. Export
  // evaluates every actual occupied cell. No falsely claimed 2048² CA grid.
  const stride=quality==='preview'?Math.max(1,Math.ceil(surface.population/4200)):1;
  const owner=surface.owner,depth=surface.depth,seeds=surface.seeds;
  let count=0;
  const emit=(i,layer,x1,y1,x2,y2,weight=1)=>{
    count++;
    visit({cell:i,layer,x1:clamp(x1,.04,.96),y1:clamp(y1,.04,.96),
      x2:clamp(x2,.04,.96),y2:clamp(y2,.04,.96),weight});
  };
  for(let i=0;i<surface.capacity;i++){
    const family=owner[i];
    if(!family||i%stride!==0)continue;
    const seed=seeds[family-1];
    const step=depth[i];
    const j=hash32(i^Math.imul(family,0x9e3779b1));
    if(unit(j+5)>d)continue;
    const a=(seed?.angle??0)+.24*Math.sin(step*.19+(seed?.phase??0)*TAU);
    const vx=Math.cos(a),vy=Math.sin(a),nx=-vy,ny=vx;
    const cx=.34+.32*unit(j+11),cy=.34+.32*unit(j+19);
    if(mode==='lamella'){
      // Two mineral platelets laminated along family crystallographic
      // orientation. Birth-depth modulates individual sheet separation.
      const len=.19+.17*unit(j+23);
      for(let k=0;k<2;k++){
        const offset=(k-.5)*(.17+.05*Math.sin(step*.4));
        const qx=cx+nx*offset,qy=cy+ny*offset;
        emit(i,k===0?'shadow':'glint',
          qx-vx*len,qy-vy*len,
          qx+vx*len,qy+vy*len,.6+.4*unit(j+29+k));
      }
    }else if(mode==='cleavage'){
      // Real family boundaries and graph-depth changes concentrate
      // fractures. The local stress proxies come from mineral contact,
      // not free-standing pixel noise.
      const x=i%n,y=(i/n)|0;
      let stress=0;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        let xx=x+dx,yy=y+dy;
        if(wrap){xx=(xx+n)%n;yy=(yy+n)%n;}
        else if(xx<0||xx>=n||yy<0||yy>=n){stress++;continue;}
        const near=xx+yy*n;
        if(owner[near]!==family)stress+=1.3;
        else stress+=Math.min(1,Math.abs(depth[near]-step)*.25);
      }
      if(stress<.6&&unit(j+41)>.22)continue;
      const theta=a+(unit(j+47)-.5)*.85;
      const ux=Math.cos(theta),uy=Math.sin(theta);
      const len=.22+.16*unit(j+53);
      emit(i,'shadow',cx-ux*len,cy-uy*len,cx+ux*len,cy+uy*len,
        .6+.4*Math.min(1,stress/3));
      if(stress>1.3){
        const dir=theta+(.55+unit(j+59)*.4);
        const h=.11+.09*unit(j+61);
        emit(i,'glint',cx,cy,cx+h*Math.cos(dir),cy+h*Math.sin(dir),.8);
      }
    }else if(mode==='vesicle'){
      // Globular opal microdomains: 6-segment facet arcs, size/distribution
      // tied to the retained family phase and birth distance.
      const phase=seed?.phase??0;
      const radius=.13+.12*unit(j+31);
      const spread=phase*TAU+step*.10;
      for(let k=0;k<5;k++){
        const t0=spread+TAU*k/7,t1=spread+TAU*(k+1)/7;
        emit(i,k%3===0?'shadow':'glint',
          cx+radius*Math.cos(t0),cy+radius*Math.sin(t0),
          cx+radius*Math.cos(t1),cy+radius*Math.sin(t1),
          .45+.4*unit(j+37));
      }
    }
  }
  return count;
}
// Keep antialiasing and group strokes into two paths, instead of expensive
// per-cell draw calls (important for iPhone Safari 2048px still exports).
export function paintSurfaceMicrostructure(ctx,surface,{
  mode='off',density=.65,quality='export',wrap=false,
  left=0,top=0,size=2048,lightAngle=40
}={}){
  if(!ctx||typeof ctx.beginPath!=='function')throw Error('Canvas 2D required');
  if(mode==='off'||density<=0)return 0;
  const n=surface.size,step=size/n;
  const paths={shadow:[],glint:[]};
  const total=forEachMineralMicrofeature(surface,{mode,density,quality,wrap},feature=>{
    paths[feature.layer].push(feature);
  });
  if(!total)return 0;
  ctx.save();
  const a=lightAngle*Math.PI/180;
  const lum=.65+.35*Math.cos(a-.7);
  const styles={
    shadow:{stroke:'rgba(5,9,28,.25)',line:Math.max(.3,step*.052)},
    glint:{stroke:'rgba(241,252,255,'+(0.20+.20*lum).toFixed(3)+')',
      line:Math.max(.4,step*.066)}
  };
  ctx.lineCap='round';
  for(const layer of ['shadow','glint']){
    const list=paths[layer],style=styles[layer];
    if(!list.length)continue;
    ctx.strokeStyle=style.stroke;
    ctx.lineWidth=style.line;
    ctx.beginPath();
    for(const f of list){
      const col=f.cell%n,row=(f.cell/n)|0;
      const px=left+col*step,py=top+row*step;
      ctx.moveTo(px+f.x1*step,py+f.y1*step);
      ctx.lineTo(px+f.x2*step,py+f.y2*step);
    }
    ctx.stroke();
  }
  ctx.restore();
  return total;
}
