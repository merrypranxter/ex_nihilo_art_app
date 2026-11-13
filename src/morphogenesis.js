// MORPHOGENESIS CHAMBER — finite-difference Gray–Scott chemistry in 3D.
//
// A + 2B -> 3B; B -> inert.  Two persistent chemical concentrations
// diffuse and react on a real volume, not a time-dependent appearance shader.
// Explicit Euler: A'=A+Du*lap(A)-AB²+F(1-A); B'=B+Dv*lap(B)+AB²-(F+k)B.
// 6-neighbor Laplacian with reflecting boundaries; Du <= 1/6 for dt=1.
// A/B are independent of nutrient-field chemistry, but feed rates can be
// supplied by that field. Fibers catalyze B, crystals locally consume B.

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const finite=n=>typeof n==='number'&&Number.isFinite(n);

export class MorphogenesisVolume {
  constructor(size=28,extent=8){
    this.size=size;
    this.extent=extent;
    this.count=size**3;
    this.u=new Float32Array(this.count);
    this.v=new Float32Array(this.count);
    this.nextU=new Float32Array(this.count);
    this.nextV=new Float32Array(this.count);
    this.neighbors=new Uint32Array(this.count*6);
    this.nutrientIndex=new Uint32Array(this.count);
    this.cachedNutrientSize=0;
    // Projection from the 28³ chemical lattice into the 34³ crystal world.
    this.solidIndex=new Uint32Array(this.count);
    this.cachedSolidSize=0;
    this.settings={
      enabled:false,feed:.0367,kill:.0649,diffA:.16,diffB:.08,
      iterations:5,iso:.21,chemotaxis:.7,fiberCatalysis:.35,crystalSink:.25
    };
    this.generation=0;
    this.changed=true;
    this.activeSites=0;
    this.buildNeighbors();
    this.reset();
  }
  index(x,y,z){return x+this.size*(y+this.size*z)}
  coords(pos){
    const n=this.size,s=this.extent;
    return [
      clamp(Math.floor((pos.x/s+.5)*n),0,n-1),
      clamp(Math.floor((pos.y/s+.5)*n),0,n-1),
      clamp(Math.floor((pos.z/s+.5)*n),0,n-1)
    ];
  }
  worldPos(x,y,z){
    const n=this.size,s=this.extent;
    return {x:((x+.5)/n-.5)*s,y:((y+.5)/n-.5)*s,z:((z+.5)/n-.5)*s};
  }
  buildNeighbors(){
    const n=this.size;
    for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const i=this.index(x,y,z),k=i*6;
      this.neighbors[k]=this.index(Math.max(0,x-1),y,z);
      this.neighbors[k+1]=this.index(Math.min(n-1,x+1),y,z);
      this.neighbors[k+2]=this.index(x,Math.max(0,y-1),z);
      this.neighbors[k+3]=this.index(x,Math.min(n-1,y+1),z);
      this.neighbors[k+4]=this.index(x,y,Math.max(0,z-1));
      this.neighbors[k+5]=this.index(x,y,Math.min(n-1,z+1));
    }
  }
  indexNutrients(nutrient){
    if(!nutrient ||this.cachedNutrientSize===nutrient.size)return;
    const n=this.size,s=nutrient.size;
    for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const nx=clamp(Math.floor((x+.5)/n*s),0,s-1);
      const ny=clamp(Math.floor((y+.5)/n*s),0,s-1);
      const nz=clamp(Math.floor((z+.5)/n*s),0,s-1);
      this.nutrientIndex[this.index(x,y,z)]=nx+s*(ny+s*nz);
    }
    this.cachedNutrientSize=nutrient.size;
  }
  indexSolids(solids){
    if(!solids || this.cachedSolidSize===solids.size)return;
    const n=this.size,s=solids.size;
    for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const cx=clamp(Math.floor((x+.5)/n*s),0,s-1);
      const cy=clamp(Math.floor((y+.5)/n*s),0,s-1);
      const cz=clamp(Math.floor((z+.5)/n*s),0,s-1);
      this.solidIndex[this.index(x,y,z)]=cx+s*(cy+s*cz);
    }
    this.cachedSolidSize=solids.size;
  }
  reset(){
    this.u.fill(1);this.v.fill(0);
    this.nextU.set(this.u);this.nextV.fill(0);
    this.generation=0;this.activeSites=0;this.changed=true;
  }
  setSettings(input={}){
    const prev=this.settings;
    const value=(key,min,max)=>finite(input[key])?clamp(input[key],min,max):prev[key];
    this.settings={
      enabled:input.enabled===undefined?prev.enabled:!!input.enabled,
      feed:value('feed',.004,.095),
      kill:value('kill',.018,.095),
      diffA:value('diffA',.04,.16),
      diffB:value('diffB',.015,.16),
      iterations:Math.round(value('iterations',1,7)),
      iso:value('iso',.04,.72),
      chemotaxis:value('chemotaxis',0,2),
      fiberCatalysis:value('fiberCatalysis',0,1),
      crystalSink:value('crystalSink',0,1)
    };
    this.changed=true;
  }
  seedAt(pos,radius=.53,strength=.88){
    const [cx,cy,cz]=this.coords(pos),n=this.size;
    const cellRadius=Math.max(1,radius*n/this.extent);
    const bound=Math.ceil(cellRadius*2.3);
    let changed=false;
    for(let z=Math.max(1,cz-bound);z<Math.min(n-1,cz+bound+1);z++)
      for(let y=Math.max(1,cy-bound);y<Math.min(n-1,cy+bound+1);y++)
        for(let x=Math.max(1,cx-bound);x<Math.min(n-1,cx+bound+1);x++){
          const d2=(x-cx)**2+(y-cy)**2+(z-cz)**2;
          const dose=clamp(strength*Math.exp(-d2/(cellRadius*cellRadius)),0,1);
          if(dose<.01)continue;
          const i=this.index(x,y,z);
          this.v[i]=clamp(this.v[i]+dose,0,1);
          this.u[i]=clamp(this.u[i]-.55*dose,0,1);
          changed=true;
        }
    this.changed ||= changed;
    return changed;
  }
  // Feed in a tiny amount of autocatalyst where a fiber has just deposited.
  catalyze(pos,strength){
    if(strength<=0)return;
    const [x,y,z]=this.coords(pos);
    const i=this.index(x,y,z);
    this.v[i]=clamp(this.v[i]+strength,0,1);
    this.u[i]=clamp(this.u[i]-.25*strength,0,1);
    this.changed=true;
  }
  consumeAt(pos,strength){
    if(strength<=0)return;
    const [x,y,z]=this.coords(pos);
    const i=this.index(x,y,z);
    this.v[i]=Math.max(0,this.v[i]-strength);
    this.changed=true;
  }
  sampleB(pos){
    const [x,y,z]=this.coords(pos);
    return this.v[this.index(x,y,z)];
  }
  gradientB(pos){
    const [x,y,z]=this.coords(pos),n=this.size,b=this.v;
    return {
      x:(b[this.index(Math.min(n-1,x+1),y,z)]-b[this.index(Math.max(0,x-1),y,z)])*.5,
      y:(b[this.index(x,Math.min(n-1,y+1),z)]-b[this.index(x,Math.max(0,y-1),z)])*.5,
      z:(b[this.index(x,y,Math.min(n-1,z+1))]-b[this.index(x,y,Math.max(0,z-1))])*.5
    };
  }
  tick(nutrient,solids=null,wallPermeability=1){
    if(!this.settings.enabled)return;
    this.indexNutrients(nutrient);
    const wall=solids?.population?solids.cells:null;
    if(wall)this.indexSolids(solids);
    // Fractional explicit Euler; material faces scale the diffusive flux
    // symmetrically. Reactions still occur at every chemical lattice site.
    const n=this.count,neighbors=this.neighbors,settings=this.settings,dt=.25;
    const food=nutrient?.values;
    const perm=clamp(wallPermeability,0,1);
    for(let iteration=0;iteration<settings.iterations;iteration++){
      const U=this.u,V=this.v,NU=this.nextU,NV=this.nextV;
      let count=0;
      for(let i=0;i<n;i++){
        const u=U[i],v=V[i],k=i*6;
        let lu=0,lv=0;
        if(!wall){
          lu=U[neighbors[k]]+U[neighbors[k+1]]+
            U[neighbors[k+2]]+U[neighbors[k+3]]+
            U[neighbors[k+4]]+U[neighbors[k+5]]-6*u;
          lv=V[neighbors[k]]+V[neighbors[k+1]]+
            V[neighbors[k+2]]+V[neighbors[k+3]]+
            V[neighbors[k+4]]+V[neighbors[k+5]]-6*v;
        }else{
          const blocked=wall[this.solidIndex[i]];
          for(let q=0;q<6;q++){
            const j=neighbors[k+q];
            const scale=blocked||wall[this.solidIndex[j]]?perm:1;
            lu+=scale*(U[j]-u);
            lv+=scale*(V[j]-v);
          }
        }
        const reaction=u*v*v;
        const nutrientFactor=food?(.68+.72*food[this.nutrientIndex[i]]):1;
        const f=settings.feed*nutrientFactor;
        const blocked=wall&&wall[this.solidIndex[i]];
        const sink=blocked?dt*.015*settings.crystalSink:0;
        NU[i]=clamp(u+dt*(settings.diffA*lu-reaction+f*(1-u)),0,1);
        NV[i]=clamp(v+dt*(settings.diffB*lv+reaction-(f+settings.kill)*v)-sink,0,1);
        if(NV[i]>settings.iso)count++;
      }
      this.u=NU;this.v=NV;this.nextU=U;this.nextV=V;
      this.activeSites=count;
      this.generation++;
    }
    this.changed=true;
  }
  snapshot(){
    return {settings:{...this.settings},generation:this.generation,
      u:Array.from(this.u),v:Array.from(this.v)};
  }
  validateSnapshot(data){
    const valid=(a)=>Array.isArray(a)&&a.length===this.count&&
      a.every(n=>finite(n)&&n>=0&&n<=1);
    if(!data||!data.settings||!Number.isInteger(data.generation)||
       data.generation<0||data.generation>1000000000||!valid(data.u)||!valid(data.v)){
      throw new Error('Damaged or incompatible morphogenesis volume.');
    }
    return true;
  }
  restore(snapshot){
    this.validateSnapshot(snapshot);
    this.setSettings(snapshot.settings);
    this.generation=snapshot.generation;
    this.u.set(snapshot.u);this.v.set(snapshot.v);
    this.nextU.set(this.u);this.nextV.set(this.v);
    this.activeSites=this.v.reduce((a,v)=>a+(v>this.settings.iso?1:0),0);
    this.changed=true;
  }
}
