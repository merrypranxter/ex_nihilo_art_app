// ART DIRECTION / constructive fields, not preset 3D objects.
// Each "form" is a continuously evaluated vector law. It influences where
// the living agents travel and which silhouettes emerge over simulation time.
// No geometry, paths, particles, or mesh templates are loaded here.

const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));

export const FORM_NAMES=Object.freeze({
  wild:"UNCONSTRAINED",
  coral:"ASYMMETRIC CORAL",
  crown:"RADIANT CROWN",
  reliquary:"HOLLOW RELIQUARY",
  spire:"TWISTED SPIRE",
  fan:"BILATERAL FAN"
});

export function formField(point,time,options={}){
  const form=FORM_NAMES[options.form]?options.form:'wild';
  const strength=clamp(Number.isFinite(options.formStrength)?options.formStrength:0,0,2);
  const twist=clamp(Number.isFinite(options.formTwist)?options.formTwist:.5,0,2);
  if(form==='wild'||strength===0)return {x:0,y:0,z:0};
  const x=point.x,y=point.y,z=point.z;
  const r=Math.hypot(x,z),rSafe=Math.max(r,.08);
  const phi=Math.atan2(z,x);
  const radial={x:x/rSafe,z:z/rSafe};
  const tangent={x:-z/rSafe,z:x/rSafe};
  const turn=time*.17*twist;
  let dx=0,dy=0,dz=0;

  if(form==='coral'){
    // Unequal spiraling advective branches with height-dependent flare.
    const asym=.5+.5*Math.sin(3*phi+.64*y+turn);
    const flare=(.50+.2*Math.sin(5*phi-.7*y+turn))*(1-r/4);
    dx=radial.x*(flare+asym*.30)+tangent.x*(.17+twist*.22);
    dz=radial.z*(flare+asym*.30)+tangent.z*(.17+twist*.22);
    dy=.39+.23*Math.sin(2.4*phi+turn)+.14*Math.cos(1.6*r-.8*y);
  }else if(form==='crown'){
    // Dendritic radial fans fan upward and away from an unoccupied center.
    const petal=Math.sin(8*phi+.4*y+turn);
    const flare=.60*(1-r/4)+.30*petal;
    dx=radial.x*flare+tangent.x*twist*.22;
    dz=radial.z*flare+tangent.z*twist*.22;
    dy=.42+.18*Math.cos(8*phi+.6*y+turn)-.09*y;
  }else if(form==='reliquary'){
    // Particles orbit around an attractor radius; the center remains hollow.
    // Material emerges by agents circulating around a scalar potential shell.
    const target=2.0+.22*Math.sin(6*phi+.3*y+turn);
    const inward=clamp((target-r)*.9,-1.25,1.25);
    dx=radial.x*inward+tangent.x*(.42+twist*.40);
    dz=radial.z*inward+tangent.z*(.42+twist*.40);
    dy=-.47*y+.30*Math.sin(5*phi+.2*r+turn);
  }else if(form==='spire'){
    // Confinement + cylindrical advection create a layered twisted column.
    const radiusTarget=.45+.25*Math.sin(y*1.35+turn);
    const confine=clamp((radiusTarget-r)*1.35,-1.8,1.8);
    dx=radial.x*confine+tangent.x*(.27+twist*.52);
    dz=radial.z*confine+tangent.z*(.27+twist*.52);
    dy=.80-.08*Math.max(0,y-2.5);
  }else if(form==='fan'){
    // Bilateral anisotropic growth: broad in x/y, compressed in z.
    const side=Math.tanh(x*1.7);
    dx=side*(.40+.22*Math.cos(3*y+turn))-.10*x;
    dy=.65+.22*Math.cos(Math.abs(x)*2.8+turn);
    dz=-z*(.65+.3*twist)+.11*Math.sin(2*x+turn);
  }
  const fade=clamp(1-Math.max(0,Math.hypot(x,y,z)-3.4)/1.5,.15,1);
  return {
    x:dx*strength*fade,
    y:dy*strength*fade,
    z:dz*strength*fade
  };
}

export const FINISHES=Object.freeze({
  opal:{name:'OPALESCENT MINERAL',roughness:.23,metalness:.12,clearcoat:.92,iridescence:.85},
  enamel:{name:'LIQUID ENAMEL',roughness:.12,metalness:.28,clearcoat:1,iridescence:.30},
  satin:{name:'SATIN CERAMIC',roughness:.60,metalness:.05,clearcoat:.22,iridescence:.08},
  spectral:{name:'SPECTRAL ALLOY',roughness:.22,metalness:.67,clearcoat:.75,iridescence:1}
});
