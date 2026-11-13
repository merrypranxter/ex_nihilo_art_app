// Marching tetrahedra isosurface extracted from actual 3D chemical B.
// A triangle is generated only where the evolving concentration crosses
// the threshold. There is no predefined torus/shell/model in this code.
// Stride can be raised to 2–3 on mobile to bound CPU/mesh cost.
const TETS=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
const CORNERS=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],
               [0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const finite=n=>typeof n==='number'&&Number.isFinite(n);

export function extractIsosurface(volume,threshold=.21,opts={}){
  const step=Math.max(1,Math.min(4,Math.round(opts.stride||2)));
  const maxTriangles=Math.max(100,Math.min(30000,opts.maxTriangles||14000));
  const n=volume.size,extent=volume.extent,V=volume.v;
  const colorList=Array.isArray(opts.palette)&&opts.palette.length?
    opts.palette:['#30ffe8','#fc4bdb','#ad6dfc','#f6fc9b'];
  const rgb=colorList.map(h=>{
    const v=parseInt(h.replace('#',''),16);
    return [((v>>16)&255)/255,((v>>8)&255)/255,(v&255)/255];
  });
  const positions=[],colors=[],normals=[];
  let triangles=0,clipped=false;
  const p=new Array(8),val=new Array(8),grad=new Array(8);
  const sample=(x,y,z)=>V[
    Math.max(0,Math.min(n-1,x))+
    n*(Math.max(0,Math.min(n-1,y))+n*Math.max(0,Math.min(n-1,z)))
  ];
  const surfacePoint=(a,b)=>{
    const va=val[a],vb=val[b],den=vb-va;
    const t=Math.abs(den)>1e-9?Math.max(0,Math.min(1,(threshold-va)/den)):.5;
    const pos=[
      p[a][0]+(p[b][0]-p[a][0])*t,
      p[a][1]+(p[b][1]-p[a][1])*t,
      p[a][2]+(p[b][2]-p[a][2])*t
    ];
    const g=[
      grad[a][0]*(1-t)+grad[b][0]*t,
      grad[a][1]*(1-t)+grad[b][1]*t,
      grad[a][2]*(1-t)+grad[b][2]*t
    ];
    const length=Math.hypot(...g);
    return {pos,normal:length>1e-8?g.map(c=>c/length):[0,1,0]};
  };
  const pushTriangle=(a,b,c)=>{
    if(triangles>=maxTriangles){clipped=true;return false;}
    for(const vertex of [a,b,c]){
      const pos=vertex.pos;
      positions.push(pos[0],pos[1],pos[2]);
      normals.push(...vertex.normal);
      // Surface chemistry is the shape; the spatial palette is only appearance.
      const phase=(.13*pos[0]+.19*pos[1]-.11*pos[2]+3);
      const mix=phase-Math.floor(phase);
      const f=mix*rgb.length,lo=Math.floor(f)%rgb.length,hi=(lo+1)%rgb.length,t=f-Math.floor(f);
      colors.push(
        rgb[lo][0]*(1-t)+rgb[hi][0]*t,
        rgb[lo][1]*(1-t)+rgb[hi][1]*t,
        rgb[lo][2]*(1-t)+rgb[hi][2]*t
      );
    }
    triangles++;
    return true;
  };
  // Excludes the very outermost cell, avoiding clipped artificial box faces.
  outer:for(let z=1;z<n-1-step;z+=step)
  for(let y=1;y<n-1-step;y+=step)
  for(let x=1;x<n-1-step;x+=step){
    let low=Infinity,high=-Infinity;
    for(let c=0;c<8;c++){
      const dx=CORNERS[c][0]*step,dy=CORNERS[c][1]*step,dz=CORNERS[c][2]*step;
      const xx=x+dx,yy=y+dy,zz=z+dz;
      const v=V[xx+n*(yy+n*zz)];
      val[c]=v;
      low=Math.min(low,v);high=Math.max(high,v);
      const factor=extent/n;
      p[c]=[(xx+.5)*factor-extent/2,(yy+.5)*factor-extent/2,(zz+.5)*factor-extent/2];
      // Interpolate the actual scalar-field gradient instead of assigning
      // each unshared triangle an arbitrary flat geometric normal.
      grad[c]=[
        sample(xx-1,yy,zz)-sample(xx+1,yy,zz),
        sample(xx,yy-1,zz)-sample(xx,yy+1,zz),
        sample(xx,yy,zz-1)-sample(xx,yy,zz+1)
      ];
    }
    if(low>=threshold||high<threshold)continue;
    for(const tet of TETS){
      const inside=[],outside=[];
      for(const i of tet)(val[i]>=threshold?inside:outside).push(i);
      if(inside.length===0||inside.length===4)continue;
      if(inside.length===1){
        const a=inside[0];
        if(!pushTriangle(surfacePoint(a,outside[0]),surfacePoint(a,outside[1]),surfacePoint(a,outside[2])))break outer;
      }else if(inside.length===3){
        const b=outside[0];
        if(!pushTriangle(surfacePoint(b,inside[0]),surfacePoint(b,inside[2]),surfacePoint(b,inside[1])))break outer;
      }else{
        const a=surfacePoint(inside[0],outside[0]);
        const b=surfacePoint(inside[0],outside[1]);
        const c=surfacePoint(inside[1],outside[0]);
        const d=surfacePoint(inside[1],outside[1]);
        if(!pushTriangle(a,b,c))break outer;
        if(!pushTriangle(b,d,c))break outer;
      }
    }
  }
  if(positions.some(x=>!finite(x))||normals.some(x=>!finite(x)))
    throw new Error('Nonfinite chemical isosurface.');
  return {
    positions:new Float32Array(positions),
    colors:new Float32Array(colors),
    normals:new Float32Array(normals),
    triangles,clipped,stride:step
  };
}
