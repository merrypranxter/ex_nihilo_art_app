// Three-dimensional finite-difference nutrient field.
// Diffusion is a local six-neighbor update (stable with coefficient <= 1/6).
// Growth tips consume material; user touches can inject food into this state.
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));

export class NutrientField {
  constructor(size=34,extent=8){
    this.size=size;
    this.extent=extent;
    this.count=size*size*size;
    this.values=new Float32Array(this.count);
    this.scratch=new Float32Array(this.count);
    this.reset();
  }

  index(x,y,z){
    const n=this.size;
    return clamp(x,0,n-1)+n*(clamp(y,0,n-1)+n*clamp(z,0,n-1));
  }

  coords(point){
    const n=this.size;
    return [
      clamp(Math.floor((point.x/this.extent+.5)*n),0,n-1),
      clamp(Math.floor((point.y/this.extent+.5)*n),0,n-1),
      clamp(Math.floor((point.z/this.extent+.5)*n),0,n-1)
    ];
  }

  source(x,y,z){
    // Three nutrient springs, off-axis and unequal: a growth landscape, not a shape.
    const gaussian=(cx,cy,cz,w,spread)=>{
      const r2=(x-cx)**2+(y-cy)**2+(z-cz)**2;
      return w*Math.exp(-r2/spread);
    };
    return clamp(.105
      +gaussian(-1.45,1.25,.7,.72,3.2)
      +gaussian(1.65,-.55,-1.0,.78,2.4)
      +gaussian(.15,-1.85,1.65,.58,2.8),0,1);
  }

  reset(){
    const n=this.size;
    for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const xx=((x+.5)/n-.5)*this.extent;
      const yy=((y+.5)/n-.5)*this.extent;
      const zz=((z+.5)/n-.5)*this.extent;
      this.values[this.index(x,y,z)]=this.source(xx,yy,zz);
    }
    this.scratch.set(this.values);
  }

  sample(point){
    const [x,y,z]=this.coords(point);
    return this.values[this.index(x,y,z)];
  }

  gradient(point){
    const [x,y,z]=this.coords(point),a=this.values;
    return {
      x:(a[this.index(x+1,y,z)]-a[this.index(x-1,y,z)])*.5,
      y:(a[this.index(x,y+1,z)]-a[this.index(x,y-1,z)])*.5,
      z:(a[this.index(x,y,z+1)]-a[this.index(x,y,z-1)])*.5
    };
  }

  consume(point,amount=.048){
    const [x,y,z]=this.coords(point);
    const i=this.index(x,y,z);
    this.values[i]=Math.max(0,this.values[i]-amount);
  }

  inject(point,radius=3.8,strength=.84){
    const [cx,cy,cz]=this.coords(point),r=Math.ceil(radius);
    for(let z=Math.max(0,cz-r);z<=Math.min(this.size-1,cz+r);z++)
      for(let y=Math.max(0,cy-r);y<=Math.min(this.size-1,cy+r);y++)
        for(let x=Math.max(0,cx-r);x<=Math.min(this.size-1,cx+r);x++){
          const d2=(x-cx)**2+(y-cy)**2+(z-cz)**2;
          const contribution=strength*Math.exp(-d2/(radius*radius*.58));
          const i=this.index(x,y,z);
          this.values[i]=clamp(this.values[i]+contribution,0,1);
        }
  }

  tick(diffusion=.6,supply=.5){
    const n=this.size,old=this.values,next=this.scratch;
    // Three-dimensional explicit diffusion stability: alpha < 1/6.
    const alpha=Math.min(.145,Math.max(0,diffusion)*.11);
    const restore=Math.min(.04,Math.max(0,supply)*.013);
    const extent=this.extent;
    for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const i=this.index(x,y,z),here=old[i];
      const neighbors=
        old[this.index(x-1,y,z)]+old[this.index(x+1,y,z)]
        +old[this.index(x,y-1,z)]+old[this.index(x,y+1,z)]
        +old[this.index(x,y,z-1)]+old[this.index(x,y,z+1)];
      const xx=((x+.5)/n-.5)*extent;
      const yy=((y+.5)/n-.5)*extent;
      const zz=((z+.5)/n-.5)*extent;
      const target=this.source(xx,yy,zz);
      next[i]=clamp(here+alpha*(neighbors-6*here)+restore*(target-here),0,1);
    }
    this.values=next;
    this.scratch=old;
  }

  setValues(values){
    if(!Array.isArray(values)||values.length!==this.count||
      !values.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1)){
      throw new Error('Invalid saved nutrient volume.');
    }
    this.values.set(values);
    this.scratch.set(values);
  }

  getStatistics(){
    let total=0,min=1,max=0;
    for(let i=0;i<this.values.length;i++){
      const n=this.values[i];
      total+=n;min=Math.min(min,n);max=Math.max(max,n);
    }
    return {mean:total/this.values.length,min,max};
  }
}
