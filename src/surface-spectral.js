// Ex Nihilo 04E — Iridescent Organist / lossless single-film Fresnel coating.
// This is a CPU-only, deterministic ANGLE-FIELD model for the 2D mineral
// surface. It does not claim real camera parallax, volume transmission,
// birefringence, or calibrated daylight colorimetry.
export const SPECTRAL_WAVELENGTHS=Object.freeze(
  Array.from({length:81},(_,i)=>380+5*i));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const finite=(v,fallback)=>Number.isFinite(v)?v:fallback;
const sq=x=>x*x;
function gaussian(wavelength,center,left,right){
  const d=(wavelength-center)/(wavelength<center?left:right);
  return Math.exp(-.5*d*d);
}
// Wyman, Sloan and Shirley (JCGT 2013), analytic fits to CIE 1931 CMFs.
function matching(w){
  return [
    1.056*gaussian(w,599.8,37.9,31.0)+
      .362*gaussian(w,442,16,26.7)-.065*gaussian(w,501.1,20.4,26.2),
    .821*gaussian(w,568.8,46.9,40.5)+
      .286*gaussian(w,530.9,16.3,31.1),
    1.217*gaussian(w,437,11.8,36)+
      .681*gaussian(w,459,26,13.8)
  ];
}
// Daylight-like 6504 K Planckian proxy, explicitly NOT measured D65.
const weighted=SPECTRAL_WAVELENGTHS.map(w=>{
  const radiance=Math.pow(560/w,5)*
    (Math.expm1(1.4387769e7/(560*6504))/
      Math.expm1(1.4387769e7/(w*6504)));
  return matching(w).map(v=>v*radiance);
});
const white=weighted.reduce((a,v)=>{
  for(let c=0;c<3;c++)a[c]+=v[c];
  return a;
},[0,0,0]);
export function filmReflectance(wavelengthNm,cosAir,thicknessNm,{
  filmIndex=1.46,substrateIndex=1.62,polarization=.5
}={}){
  const wavelength=clamp(finite(wavelengthNm,550),380,780);
  const n0=1,n1=clamp(finite(filmIndex,1.46),1.05,2.1),
    n2=clamp(finite(substrateIndex,1.62),1.05,2.5);
  const co=clamp(finite(cosAir,1),.02,1);
  const sin0=Math.sqrt(Math.max(0,1-co*co));
  const cos1=Math.sqrt(Math.max(0,1-sq(n0*sin0/n1)));
  const cos2=Math.sqrt(Math.max(0,1-sq(n0*sin0/n2)));
  const rs01=(n0*co-n1*cos1)/(n0*co+n1*cos1);
  const rp01=(n1*co-n0*cos1)/(n1*co+n0*cos1);
  const rs12=(n1*cos1-n2*cos2)/(n1*cos1+n2*cos2);
  const rp12=(n2*cos1-n1*cos2)/(n2*cos1+n1*cos2);
  const phase=4*Math.PI*n1*clamp(finite(thicknessNm,350),0,1600)*cos1/wavelength;
  const c=Math.cos(phase);
  const energy=(a,b)=>{
    const q=2*a*b*c,numerator=a*a+b*b+q,denominator=1+sq(a*b)+q;
    return clamp(numerator/Math.max(1e-10,denominator),0,1);
  };
  const pol=clamp(finite(polarization,.5),0,1);
  return energy(rs01,rs12)*(1-pol)+energy(rp01,rp12)*pol;
}
// Integrate 81 physically meaningful band reflectances into D65-reference
// linear sRGB. This approximates daylight via 6504 K blackbody+white balance.
export function spectralFilmLinearRGB(cosAir,thicknessNm,options={}){
  const xyz=[0,0,0];
  for(let i=0;i<SPECTRAL_WAVELENGTHS.length;i++){
    const r=filmReflectance(SPECTRAL_WAVELENGTHS[i],cosAir,thicknessNm,options);
    for(let c=0;c<3;c++)xyz[c]+=r*weighted[i][c];
  }
  const X=xyz[0]*(.95047/white[0]),Y=xyz[1]/white[1],
    Z=xyz[2]*(1.08883/white[2]);
  return [
    clamp(3.2406*X-1.5372*Y-.4986*Z,0,1),
    clamp(-.9689*X+1.8758*Y+.0415*Z,0,1),
    clamp(.0557*X-.2040*Y+1.0570*Z,0,1)
  ];
}
export function srgbToLinear(c){
  const n=clamp(c/255,0,1);
  return n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4);
}
export function linearToSrgb8(c){
  const n=clamp(c,0,1);
  return Math.round(255*(n<=.0031308?12.92*n:1.055*Math.pow(n,1/2.4)-.055));
}
// LUT is in LINEAR RGB, NOT sRGB. Row 0 is near normal incidence;
// row HEIGHT-1 is grazing illumination. X is true film thickness.
const cache=new Map();
export function getSpectralFilmLUT({thickness=330,filmIndex=1.46,
  substrateIndex=1.62,polarization=.5}={}){
  const d=clamp(finite(thickness,330),90,800),
    n1=clamp(finite(filmIndex,1.46),1.05,2.1),
    n2=clamp(finite(substrateIndex,1.62),1.05,2.5),
    pol=clamp(finite(polarization,.5),0,1);
  const key=[d,n1,n2,pol].join(':');
  if(cache.has(key))return cache.get(key);
  const width=48,height=36;
  const data=new Float32Array(width*height*3);
  for(let y=0;y<height;y++){
    const theta=(y/(height-1))*88.0*Math.PI/180;
    for(let x=0;x<width;x++){
      const film=d*(.55+.9*x/(width-1));
      const rgb=spectralFilmLinearRGB(Math.cos(theta),film,{
        filmIndex:n1,substrateIndex:n2,polarization:pol});
      data.set(rgb,(x+y*width)*3);
    }
  }
  const table={width,height,data,thickness:d,key};
  if(cache.size>=3)cache.delete(cache.keys().next().value);
  cache.set(key,table);
  return table;
}
export function sampleSpectralLUT(table,cosAir,thicknessNm,out=[0,0,0]){
  const xx=clamp((thicknessNm/table.thickness-.55)/.9,0,1)*
    (table.width-1);
  const yy=clamp(Math.acos(clamp(cosAir,Math.cos(88*Math.PI/180),1))/
    (88*Math.PI/180),0,1)*(table.height-1);
  const x0=Math.floor(xx),x1=Math.min(x0+1,table.width-1),
    y0=Math.floor(yy),y1=Math.min(y0+1,table.height-1),
    tx=xx-x0,ty=yy-y0;
  for(let c=0;c<3;c++){
    const d=table.data,w=table.width;
    const a=d[(x0+y0*w)*3+c]*(1-tx)+d[(x1+y0*w)*3+c]*tx;
    const b=d[(x0+y1*w)*3+c]*(1-tx)+d[(x1+y1*w)*3+c]*tx;
    out[c]=a*(1-ty)+b*ty;
  }
  return out;
}
