// CRYSTAL COLONY / Three-dimensional stochastic cellular automaton.
// Geometry doesn't exist before cells are born. Local neighbor counts and
// consumed nutrient concentration govern births, maturation and erosion.
// No Three.js import: can be tested separately from its renderer.

const lim=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const DIRS=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];

export class CrystalColony {
  constructor(size=34,extent=8){
    this.size=size;
    this.extent=extent;
    this.capacity=size**3;
    this.maxCells=4800;
    this.cells=new Uint8Array(this.capacity); // 0 void, 1 growing, 2 mineral
    this.ages=new Uint8Array(this.capacity);
    this.colors=new Uint8Array(this.capacity*3);
    this.population=0;
    this.generation=0;
    this.changed=true;
    this.settings={enabled:false,growth:.75,erosion:.08,crystallization:4};
  }
  index(x,y,z){return x+this.size*(y+this.size*z)}
  inside(x,y,z){
    return x>=1&&y>=1&&z>=1&&x<this.size-1&&y<this.size-1&&z<this.size-1;
  }
  decode(i){
    const n=this.size,z=Math.floor(i/(n*n)),rem=i-z*n*n;
    return [rem%n,Math.floor(rem/n),z];
  }
  worldPos(x,y,z){
    const n=this.size,k=this.extent;
    return {x:((x+.5)/n-.5)*k,y:((y+.5)/n-.5)*k,z:((z+.5)/n-.5)*k};
  }
  coords(pos){
    const n=this.size,k=this.extent;
    return [Math.floor((pos.x/k+.5)*n),Math.floor((pos.y/k+.5)*n),Math.floor((pos.z/k+.5)*n)];
  }
  setSettings(values){
    this.settings={
      enabled:values.enabled===undefined?this.settings.enabled:!!values.enabled,
      growth:lim(Number.isFinite(+values.growth)?+values.growth:this.settings.growth,0,2),
      erosion:lim(Number.isFinite(+values.erosion)?+values.erosion:this.settings.erosion,0,1),
      crystallization:Math.round(lim(Number.isFinite(+values.crystallization)?+values.crystallization:this.settings.crystallization,2,12))
    };
  }
  colorAt(i,food,palette,rng){
    // Birth freezes each cell's color; subsequent palette changes affect new cells only.
    const t=lim(food*.63+rng()*.4,0,.999);
    const j=Math.floor(t*palette.length)%palette.length;
    const k=(j+1)%palette.length;
    const mix=t*palette.length-Math.floor(t*palette.length);
    const h=hex=>parseInt(hex.replace('#',''),16);
    const a=h(palette[j]),b=h(palette[k]);
    for(let channel=0;channel<3;channel++){
      const shift=16-8*channel;
      const aa=(a>>shift)&255,bb=(b>>shift)&255;
      this.colors[i*3+channel]=Math.round(aa+(bb-aa)*mix);
    }
  }
  birth(i,nutrient,palette,rng){
    if(this.cells[i]!==0||this.population>=this.maxCells)return false;
    this.cells[i]=1;
    this.ages[i]=0;
    this.population++;
    const [x,y,z]=this.decode(i);
    const p=this.worldPos(x,y,z);
    const food=nutrient.sample(p);
    this.colorAt(i,food,palette,rng);
    nutrient.consume(p,.095);
    this.changed=true;
    return true;
  }
  seedAt(pos,nutrient,palette,rng){
    const [x,y,z]=this.coords(pos);
    if(!this.inside(x,y,z))return false;
    return this.birth(this.index(x,y,z),nutrient,palette,rng);
  }
  update(nutrient,palette,rng){
    if(!this.settings.enabled||this.population===0)return;
    const candidates=new Map();
    const mature=[];
    for(let i=0;i<this.cells.length;i++){
      if(!this.cells[i])continue;
      const [x,y,z]=this.decode(i);
      // Cells age independently; stable mineral walls persist after maturation.
      if(this.ages[i]<255)this.ages[i]++;
      if(this.cells[i]===1&&this.ages[i]>=this.settings.crystallization){this.cells[i]=2;this.changed=true;}
      else if(this.cells[i]===2&&this.settings.erosion>0)mature.push(i);
      for(const [dx,dy,dz] of DIRS){
        const nx=x+dx,ny=y+dy,nz=z+dz;
        if(!this.inside(nx,ny,nz))continue;
        const ni=this.index(nx,ny,nz);
        if(this.cells[ni]!==0)continue;
        candidates.set(ni,(candidates.get(ni)||0)+1);
      }
    }
    // Sparse-frontier update: only lattice cells touching growth can be born.
    // Newborns can't create further births in this generation (synchronous CA).
    const births=[];
    for(const [i,neighbors] of candidates){
      if(this.population+births.length>=this.maxCells)break;
      const [x,y,z]=this.decode(i);
      const p=this.worldPos(x,y,z);
      const food=nutrient.sample(p);
      if(food<.12 || neighbors>4)continue;
      // A local neighbor rule B1-3, chemically weighted. 4+ neighbors impede
      // new growth, creating holes instead of filling a rectangular volume.
      const contact=neighbors===1?.85:neighbors===2?1.1:neighbors===3?.55:0;
      const spatial=1+.24*Math.sin(x*.41+y*.19-z*.33+this.generation*.033);
      const probability=lim(.19*this.settings.growth*contact*food*spatial,0,.86);
      if(rng()<probability)births.push(i);
    }
    for(const i of births)this.birth(i,nutrient,palette,rng);
    // Erosion is a *different* local chemical rule and is intentionally slow.
    for(const i of mature){
      const [x,y,z]=this.decode(i);
      const food=nutrient.sample(this.worldPos(x,y,z));
      if(food<.21&&rng()<this.settings.erosion*.016){
        this.cells[i]=0;this.ages[i]=0;this.population--;this.changed=true;
      }
    }
    this.generation++;
    // Births, erosion and state maturation already set changed exactly when needed.
  }
  clear(){
    this.cells.fill(0);this.ages.fill(0);this.colors.fill(0);
    this.population=0;this.generation=0;this.changed=true;
  }
  snapshot(){
    return {
      settings:{...this.settings},
      generation:this.generation,population:this.population,
      cells:Array.from(this.cells),ages:Array.from(this.ages),colors:Array.from(this.colors)
    };
  }
  validateSnapshot(data){
    const valid=(a,length,max)=>Array.isArray(a)&&a.length===length&&
      a.every(n=>Number.isInteger(n)&&n>=0&&n<=max);
    if(!data||!data.settings||!Number.isInteger(data.generation)||data.generation<0||
       !Number.isInteger(data.population)||data.population<0||data.population>this.maxCells||
       !valid(data.cells,this.capacity,2)||
       !valid(data.ages,this.capacity,255)||
       !valid(data.colors,this.capacity*3,255)||
       data.cells.reduce((sum,n)=>sum+(n>0?1:0),0)!==data.population){
      throw new Error('Corrupted or incompatible cellular-colony checkpoint.');
    }
    return true;
  }
  restore(data){
    this.validateSnapshot(data);
    this.setSettings(data.settings);
    this.generation=data.generation;
    this.population=data.population;
    this.cells.set(data.cells);
    this.ages.set(data.ages);
    this.colors.set(data.colors);
    this.changed=true;
  }
}
