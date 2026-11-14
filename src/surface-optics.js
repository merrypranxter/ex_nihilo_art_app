// EX NIHILO 04C / MINERAL OPTICAL WITCHCRAFT
// CPU-bounded, deterministic view-space light transport approximations over
// actual surface genealogy. This module NEVER mutates growth, birth pigments,
// seeds, saved checkpoints, or frame clocks.
export const SURFACE_OPTICS=Object.freeze({
  off:'ORIGINAL MINERAL · NO OPTICS',
  opal:'OPAL FIRE · THIN FILM',
  prism:'PRISM GLASS · DISPERSION',
  quartz:'WET QUARTZ · SPECULAR FACETS',
  frost:'FROSTED AGATE · DIFFUSE GRAIN',
  ghost:'GHOST MINERAL · TRANSLUCENT VEIL'
});
export const SURFACE_OPTICS_LOOPS=Object.freeze([4,8,12]);
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const safe=(x,fallback)=>Number.isFinite(x)?x:fallback;
const rgb=(hex)=>{
  if(!/^#[0-9a-fA-F]{6}$/.test(hex))return [5,6,12];
  return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
};
const wrapIndex=(x,n)=>(x%n+n)%n;

// The lamp is a direction, not a screen-space rainbow color wheel.
// A single angle is combined with a repeatable loop phase (radians).
export function opticalLight(angle=40,phase=0){
  const a=clamp(safe(angle,40),0,360)*Math.PI/180+
    safe(phase,0);
  const elevation=.68;
  return [Math.cos(a)*elevation,Math.sin(a)*elevation,
    Math.sqrt(1-elevation*elevation)];
}

// Approximate phase response of a dielectric film for three visible bands.
// Color bands: red 630 nm, green 540 nm, blue 460 nm.
// 4π*n*d*cos(theta)/lambda models round-trip optical path difference.
// This is a three-band illustrative interference approximation, NOT a
// calibrated spectrum, ray tracer, or physically exact iridescence.
export function dielectricInterference(thicknessNm,cosIncident=1,index=1.46){
  const n=clamp(safe(index,1.46),1,2);
  const d=clamp(safe(thicknessNm,300),40,1400);
  const ci=clamp(safe(cosIncident,1),.08,1);
  return [630,540,460].map(lambda=>
    .5+.5*Math.cos(4*Math.PI*n*d*ci/lambda));
}

export function surfaceOpticsPixels(surface,baseRGBA,{
  mode='off',strength=.8,thickness=330,roughness=.3,
  angle=40,phase=0,background='#05060c',wrap=false
}={}){
  const n=surface?.size,capacity=n*n;
  if(!Number.isInteger(n)||n<16||n>192||
    !(baseRGBA instanceof Uint8ClampedArray)||
    baseRGBA.length!==capacity*4)throw Error('Invalid mineral optics input');
  // Keeping the original renderer exact is important for existing saved art.
  const out=new Uint8ClampedArray(baseRGBA);
  if(mode==='off'||!Object.hasOwn(SURFACE_OPTICS,mode)||!surface.population)return out;
  const power=clamp(safe(strength,.8),0,1.5);
  if(power===0)return out;
  const film=clamp(safe(thickness,330),90,800);
  const grain=clamp(safe(roughness,.3),0,1);
  const light=opticalLight(angle,phase);
  const back=rgb(background);
  const owner=surface.owner,depth=surface.depth,age=surface.age;
  const pigment=surface.birthColor,seeds=surface.seeds;
  const diagonal=wrap?0:1;
  for(let i=0;i<capacity;i++){
    const family=owner[i];if(!family)continue;
    const x=i%n,y=(i/n)|0;
    // Neighbors are from the retained growth lattice. Never invent lineage
    // across an empty cell or sample off the non-periodic artwork.
    const left=x>0?i-1:wrap?i+n-1:-1;
    const right=x+1<n?i+1:wrap?i-n+1:-1;
    const up=y>0?i-n:wrap?i+n*(n-1):-1;
    const down=y+1<n?i+n:wrap?i-n*(n-1):-1;
    const sides=[left,right,up,down];
    let exposed=0,contact=0;
    for(const j of sides){
      if(j<0||!owner[j])exposed++;
      else if(owner[j]!==family)contact++;
    }
    const same=j=>j>=0&&owner[j]===family?depth[j]:depth[i];
    const slopeX=clamp((same(right)-same(left))*.12,-1.8,1.8);
    const slopeY=clamp((same(down)-same(up))*.12,-1.8,1.8);
    // Boundary silhouettes add an actual local edge normal. Internal
    // crystallographic distance gradients orient the polished microfacet.
    const edgeX=((right<0||!owner[right])?1:0)-
      ((left<0||!owner[left])?1:0);
    const edgeY=((down<0||!owner[down])?1:0)-
      ((up<0||!owner[up])?1:0);
    let nx=-slopeX-.60*edgeX,ny=-slopeY-.60*edgeY,nz=1;
    const norm=Math.hypot(nx,ny,nz)||1;
    nx/=norm;ny/=norm;nz/=norm;
    const incidence=clamp(nx*light[0]+ny*light[1]+nz*light[2],0,1);
    const halfz=1+light[2];
    const halfnorm=Math.hypot(light[0],light[1],halfz)||1;
    const highlight=clamp((nx*light[0]+ny*light[1]+nz*halfz)/halfnorm,0,1);
    const spec=Math.pow(highlight,5+Math.round((1-grain)*28));
    const rim=clamp((exposed*.18+contact*.24),0,1);
    const maturity=clamp(age[i]/90,0,1);
    const seedPhase=seeds[family-1]?.phase??0;
    const original=i*4,p=i*3;
    const originalR=baseRGBA[original],originalG=baseRGBA[original+1],
      originalB=baseRGBA[original+2];
    let channels=[originalR,originalG,originalB];
    if(mode==='opal'){
      // Deposited layer thickness follows actual family phase, graph
      // distance and maturation; none depend on external pixel noise.
      const layers=film*(.76+.27*Math.sin(depth[i]*.24+seedPhase*TAU)
        +.10*maturity);
      const interference=dielectricInterference(layers,
        clamp(.26+.70*incidence,.08,1),1.46);
      const fresnel=.08+.29*Math.pow(1-incidence,3);
      const reflect=power*(.23+.47*rim+.20*(1-grain));
      for(let c=0;c<3;c++){
        const spectral=(interference[c]-.38)*190;
        channels[c]=channels[c]*(1-.12*power)+
          spectral*reflect+255*spec*power*(.15+.45*rim)+
          26*fresnel*power;
      }
    }else if(mode==='prism'){
      // Cheap lateral spectral refraction. Cauchy-like inverse-lambda²
      // dispersion makes blue bend more than red; the sampled site must
      // belong to this *same* living family to avoid color-family bleeding.
      const indices=[1.503,1.518,1.535];
      const shift=(1-grain)*power*3.2;
      const raw=[originalR,originalG,originalB];
      for(let c=0;c<3;c++){
        const delta=(indices[c]-1.518)*shift*12;
        let sx=x+Math.round(nx*delta),sy=y+Math.round(ny*delta);
        if(wrap){sx=wrapIndex(sx,n);sy=wrapIndex(sy,n);}
        if(sx>=0&&sx<n&&sy>=0&&sy<n){
          const q=sx+sy*n;
          if(owner[q]===family)raw[c]=baseRGBA[q*4+c];
        }
        channels[c]=raw[c]*(.91+.13*incidence)+
          (42*rim+85*spec)*power*(.30+c*.23);
      }
    }else if(mode==='quartz'){
      const faceted=.83+.22*incidence+.1*maturity;
      const shine=(.55*spec+.35*rim)*power*(1-grain*.65);
      for(let c=0;c<3;c++)
        channels[c]=channels[c]*(1+power*(faceted-1))+
          195*shine;
    }else if(mode==='frost'){
      // High surface roughness = wide matte scattering, microscopic
      // mineral distance banding and significantly reduced clear glints.
      const distanceBand=.5+.5*Math.cos(depth[i]*.73+seedPhase*TAU);
      const diff=.70+.29*incidence+.19*distanceBand+.08*maturity;
      for(let c=0;c<3;c++)
        channels[c]=channels[c]*(1+power*(diff-1))+
          (16+25*rim)*power+(32*spec*power*(1-grain));
    }else if(mode==='ghost'){
      // No transparent pixels: glass-like transmission is composited over
      // the chosen artwork background. Read-only tint from birth pigment.
      const transmit=clamp(power*(.26+.34*(1-maturity)+.12*(1-incidence)),0,.86);
      for(let c=0;c<3;c++)
        channels[c]=channels[c]*(1-transmit)+back[c]*transmit+
          (90*rim+75*spec)*power;
    }
    for(let c=0;c<3;c++)out[original+c]=clamp(Math.round(channels[c]),0,255);
    out[original+3]=255;
  }
  return out;
}
