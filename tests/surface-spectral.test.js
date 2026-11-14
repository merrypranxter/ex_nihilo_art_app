import test from 'node:test';
import assert from 'node:assert/strict';
import {filmReflectance,spectralFilmLinearRGB,getSpectralFilmLUT,
  sampleSpectralLUT,srgbToLinear,linearToSrgb8,
  SPECTRAL_WAVELENGTHS} from '../src/surface-spectral.js';

test('81 wavelengths cover 380–780nm, with physically bounded reflected powers',()=>{
  assert.equal(SPECTRAL_WAVELENGTHS.length,81);
  assert.equal(SPECTRAL_WAVELENGTHS[0],380);
  assert.equal(SPECTRAL_WAVELENGTHS.at(-1),780);
  for(let wavelength=380;wavelength<=780;wavelength+=5){
    for(const cosAir of [.05,.2,.65,1])for(const d of [0,150,330,800]){
      const reflectance=filmReflectance(wavelength,cosAir,d);
      assert.ok(Number.isFinite(reflectance));
      assert.ok(reflectance>=0&&reflectance<=1);
    }
  }
});
test('film equal to substrate eliminates second interface and thickness dependence',()=>{
  const options={filmIndex:1.6,substrateIndex:1.6,polarization:.5};
  const a=filmReflectance(430,.6,110,options);
  const b=filmReflectance(760,.6,700,options);
  assert.ok(Math.abs(a-b)<1e-11);
});
test('a zero thickness film reduces to substrate Fresnel irrespective of film index',()=>{
  const a=filmReflectance(540,.7,0,{filmIndex:1.2,substrateIndex:1.7});
  const b=filmReflectance(540,.7,0,{filmIndex:1.8,substrateIndex:1.7});
  assert.ok(Math.abs(a-b)<1e-11);
});
test('normal incidence s and p reflect equal power',()=>{
  for(const w of [380,470,570,780]){
    const s=filmReflectance(w,1,380,{polarization:0});
    const p=filmReflectance(w,1,380,{polarization:1});
    assert.ok(Math.abs(s-p)<1e-11);
  }
});
test('thickness changes spectral response for a genuine film interface',()=>{
  const a=spectralFilmLinearRGB(.65,200);
  const b=spectralFilmLinearRGB(.65,660);
  assert.ok(a.some((v,i)=>Math.abs(v-b[i])>.002));
  assert.ok([...a,...b].every(v=>Number.isFinite(v)&&v>=0&&v<=1));
});
test('LUT is reused, linearly encoded, stable, and sensitive to polarization',()=>{
  const a=getSpectralFilmLUT({thickness:350,filmIndex:1.46,substrateIndex:1.62,polarization:0});
  const b=getSpectralFilmLUT({thickness:350,filmIndex:1.46,substrateIndex:1.62,polarization:0});
  const p=getSpectralFilmLUT({thickness:350,filmIndex:1.46,substrateIndex:1.62,polarization:1});
  assert.strictEqual(a,b);
  const rgb=sampleSpectralLUT(a,.5,340);
  const polarized=sampleSpectralLUT(p,.5,340);
  assert.ok(rgb.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
  assert.ok(rgb.some((v,i)=>Math.abs(v-polarized[i])>.001));
});
test('linear/sRGB conversions round-trip encoded channel intensities',()=>{
  for(const byte of [0,1,18,48,128,200,255])
    assert.ok(Math.abs(linearToSrgb8(srgbToLinear(byte))-byte)<=1);
});
