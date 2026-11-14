import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GrowthEngine, PALETTES } from './engine.js';
import { extractIsosurface } from './surface.js';
import { FINISHES } from './art-direction.js';
import { lineageLighting, lineageHaloScale } from './filigree.js';
import { FIBER_PROFILES, mineralOptics } from './mineral-optics.js';
import { CRYSTAL_LENSES, crystalSurface, mineralCellDisplay, gemPigment } from './crystal-optics.js';
import {
  INTERIOR_STYLES,mineralInclusionRecipe,
  historicInclusionPigment,inclusionFaceRotation
} from './mineral-inclusions.js';
import {
  METAMORPHOSIS_STAGES,mineralLifeStage,
  mineralStageMaterials,isMineralMetamorphosisActive
} from './mineral-metamorphosis.js';
import { inheritedFacet } from './crystal-bloodlines.js';
import { FieldGestureTransaction, GrowthStrokeTransaction, CrystalPressureTransaction } from './gesture-witch.js';
import { PALETTE_CATALOG, PALETTE_NAMES, filteredPalettes } from './palettes.js';
import './styles.css';

const $ = id => document.getElementById(id);
const canvas = $('world');
const scene = new THREE.Scene();
const BACKGROUNDS = {void:'#05060c',ink:'#070f22',plum:'#1a0b24',milk:'#d6d0df'};
scene.background = new THREE.Color(BACKGROUNDS.void);
const camera = new THREE.PerspectiveCamera(44,1,.05,90);
camera.position.set(6.5,4.7,10.5);
let renderer;
try{
  renderer=new THREE.WebGLRenderer({
    canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,
    powerPreference:'high-performance'
  });
}catch(error){
  window.__genesisDiagnostics?.report('WebGL2 startup failed: '+
    (error?.message||String(error)));
  throw error;
}
let graphicsLost=false;
canvas.addEventListener('webglcontextlost',event=>{
  event.preventDefault();
  graphicsLost=true;
  setPaused(true);
  window.__genesisDiagnostics?.report(
    'WebGL graphics context lost (often memory pressure). Your world is not erased. '+
    'When graphics return, dismiss this warning and tap RESUME.');
});
canvas.addEventListener('webglcontextrestored',()=>{
  graphicsLost=false;
  engine.colony.changed=true;
  geometryDirty=true;
  requestFiligreeRefresh();
  window.__genesisDiagnostics?.report(
    'WebGL graphics context restored. Inspect the canvas, then dismiss this message and tap RESUME.');
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.75));
const orbit = new OrbitControls(camera,canvas);
orbit.enableDamping = true;
orbit.dampingFactor=.08;
orbit.enablePan = false;
orbit.minDistance = 3;
orbit.maxDistance = 24;
orbit.target.set(0,0,0);
orbit.enabled=false;
orbit.update();

const engine = new GrowthEngine();

// Morphogenesis is a geometric isosurface of the live Gray–Scott B field.
// CPU mesh extraction is capped and throttled, with adjustable stride.
const morphMaterial=new THREE.MeshPhysicalMaterial({
  vertexColors:true,metalness:.12,roughness:.23,clearcoat:.92,clearcoatRoughness:.12,
  iridescence:.85,iridescenceIOR:1.32,iridescenceThicknessRange:[110,420],
  side:THREE.DoubleSide,transparent:false
});
const morphMesh=new THREE.Mesh(new THREE.BufferGeometry(),morphMaterial);
morphMesh.frustumCulled=false;
scene.add(morphMesh);
const morphologyAmbient=new THREE.AmbientLight('#b5a2ff',1.3);
const morphologyKey=new THREE.DirectionalLight('#ffffff',2);
morphologyKey.position.set(3,5,6);
const morphologyFill=new THREE.DirectionalLight('#65ffd6',1.1);
morphologyFill.position.set(-5,-2,-3);
scene.add(morphologyAmbient,morphologyKey,morphologyFill);
let showMorph=true,lastMorphMesh=-Infinity,morphTriangles=0,morphClipped=false;
function refreshMorphSurface(now,force=false){
  const field=engine.morphogenesis;
  if(!force&&(!field.changed||now-lastMorphMesh<650))return;
  lastMorphMesh=now;
  const raw=extractIsosurface(field,field.settings.iso,{
    stride:Number($('morph-mesh').value)||2,maxTriangles:14000,
    palette:engine.currentPalette()
  });
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(raw.positions,3));
  geo.setAttribute('color',new THREE.BufferAttribute(raw.colors,3));
  if(raw.normals?.length===raw.positions.length){
    geo.setAttribute('normal',new THREE.BufferAttribute(raw.normals,3));
  }else if(raw.triangles)geo.computeVertexNormals();
  const old=morphMesh.geometry;
  morphMesh.geometry=geo;
  old.dispose();
  morphTriangles=raw.triangles;
  morphClipped=raw.clipped;
  morphMesh.visible=showMorph&&morphTriangles>0;
  field.changed=false;
}

// Scientific preview of the actual nutrient scalar field, sampled at lattice
// points. This layer is optional and does not contribute to the sculpture.
const foodCapacity=6000;
const foodPositions=new Float32Array(foodCapacity*3);
const foodColors=new Float32Array(foodCapacity*3);
const foodGeometry=new THREE.BufferGeometry();
foodGeometry.setAttribute('position',new THREE.BufferAttribute(foodPositions,3).setUsage(THREE.DynamicDrawUsage));
foodGeometry.setAttribute('color',new THREE.BufferAttribute(foodColors,3).setUsage(THREE.DynamicDrawUsage));
foodGeometry.setDrawRange(0,0);
const foodCloud=new THREE.Points(foodGeometry,new THREE.PointsMaterial({
  size:.065,sizeAttenuation:true,vertexColors:true,
  transparent:true,opacity:.28,depthWrite:false,blending:THREE.AdditiveBlending
}));
foodCloud.visible=false;
foodCloud.frustumCulled=false;
scene.add(foodCloud);
let showFood=false,lastFoodRefresh=0;
function updateFoodCloud(){
  if(!showFood)return;
  const volume=engine.nutrients,n=volume.size;
  let count=0;
  for(let z=0;z<n;z+=2)for(let y=0;y<n;y+=2)for(let x=0;x<n;x+=2){
    const strength=volume.values[volume.index(x,y,z)];
    if(strength<.19||count>=foodCapacity)continue;
    const k=count*3;
    foodPositions[k]=((x+.5)/n-.5)*volume.extent;
    foodPositions[k+1]=((y+.5)/n-.5)*volume.extent;
    foodPositions[k+2]=((z+.5)/n-.5)*volume.extent;
    foodColors[k]=strength*.23;
    foodColors[k+1]=.3+strength*.9;
    foodColors[k+2]=.65+strength*.4;
    count++;
  }
  foodGeometry.setDrawRange(0,count);
  foodGeometry.attributes.position.needsUpdate=true;
  foodGeometry.attributes.color.needsUpdate=true;
}
// Cellular colony has its own geometry and history. Both engines share
// nutrients, but neither is merely a visual filter over the other.
const crystalCellSize=8/34;
const crystalShapes={
  octa:new THREE.OctahedronGeometry(crystalCellSize*.66,0),
  cube:new THREE.BoxGeometry(crystalCellSize*.66,crystalCellSize*.66,crystalCellSize*.66),
  sphere:new THREE.IcosahedronGeometry(crystalCellSize*.62,1),
  // A true six-faced prismatic spine with two crystal-terminating points.
  // Points lie on the Y axis so lattice gradients can orient the whole gem.
  quartz:new THREE.LatheGeometry([
    new THREE.Vector2(0,-crystalCellSize*.85),
    new THREE.Vector2(crystalCellSize*.39,-crystalCellSize*.47),
    new THREE.Vector2(crystalCellSize*.39,crystalCellSize*.30),
    new THREE.Vector2(0,crystalCellSize*.88)
  ],6),
  prism:new THREE.CylinderGeometry(
    crystalCellSize*.26,crystalCellSize*.44,crystalCellSize*1.54,5,1),
  shard:new THREE.TetrahedronGeometry(crystalCellSize*.84,0),
  jewel:new THREE.DodecahedronGeometry(crystalCellSize*.58,0)
};
const crystalMaterial=new THREE.MeshPhysicalMaterial({
  color:'#ffffff',metalness:.12,roughness:.23,clearcoat:.92,
  clearcoatRoughness:.12,iridescence:.85,iridescenceIOR:1.32,
  iridescenceThicknessRange:[110,420]
});
const crystals=new THREE.InstancedMesh(crystalShapes[engine.config.crystalShape],
  crystalMaterial,engine.colony.maxCells);
crystals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
crystals.frustumCulled=false;
crystals.count=0;
scene.add(crystals);
// Metamorphosis uses the SAME base geometry and historical cell RGB, but
// three distinct native physically-lit materials instead of a color cycle.
// The classic single draw stays intact and is the ONLY core draw when OFF.
const crystalAgeMeshes=Object.fromEntries(METAMORPHOSIS_STAGES.map(stage=>{
  const material=crystalMaterial.clone();
  const mesh=new THREE.InstancedMesh(crystals.geometry,material,engine.colony.maxCells);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled=false;
  mesh.count=0;
  mesh.visible=false;
  scene.add(mesh);
  return [stage,mesh];
}));
const crystalAgeCounts={young:0,mature:0,fault:0};
function syncCrystalAgeMaterials(){
  const enabled=isMineralMetamorphosisActive({
    preset:engine.config.crystalEvolution
  });
  crystals.visible=!enabled;
  const props=enabled?mineralStageMaterials(engine.config.crystalEvolution):null;
  for(const stage of METAMORPHOSIS_STAGES){
    const mesh=crystalAgeMeshes[stage];
    mesh.visible=enabled&&mesh.count>0;
    if(!props)continue;
    const p=props[stage],mat=mesh.material;
    mat.roughness=p.roughness;
    mat.metalness=p.metalness;
    mat.clearcoat=p.clearcoat;
    mat.clearcoatRoughness=p.clearcoatRoughness;
    mat.iridescence=p.iridescence;
    mat.iridescenceIOR=p.iridescenceIOR;
    mat.iridescenceThicknessRange=[...p.iridescenceThicknessRange];
    mat.needsUpdate=true;
  }
}
// Extra facet pieces are located ONLY on existing, exposed mineral surfaces,
 // prioritizing actual stress/fracture boundaries. One capped draw call.
const maxFacetGems=1200;
const facetGeometry=new THREE.TetrahedronGeometry(crystalCellSize*.38,0);
const facetMaterial=new THREE.MeshPhysicalMaterial({
  color:'#ffffff',metalness:.33,roughness:.16,clearcoat:1,
  clearcoatRoughness:.08,iridescence:1,iridescenceIOR:1.34,
  iridescenceThicknessRange:[80,450],side:THREE.DoubleSide
});
const facetGems=new THREE.InstancedMesh(facetGeometry,facetMaterial,maxFacetGems);
facetGems.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
facetGems.frustumCulled=false;
facetGems.count=0;
scene.add(facetGems);
// A second mineral envelope around selected ORIGINAL, occupied voxel cells.
// No screen-space transmission/refraction pass: two optional instanced draws.
const maxMineralSkins=1150,maxMineralSeeds=1450;
const mineralSkinMaterial=new THREE.MeshPhysicalMaterial({
  color:'#ffffff',roughness:.20,metalness:.10,
  iridescence:.95,iridescenceIOR:1.32,iridescenceThicknessRange:[90,370],
  clearcoat:1,clearcoatRoughness:.10,
  transparent:true,opacity:.24,depthWrite:false,side:THREE.FrontSide
});
const mineralSkins=new THREE.InstancedMesh(
  crystalShapes[engine.config.crystalShape],mineralSkinMaterial,maxMineralSkins);
mineralSkins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
mineralSkins.frustumCulled=false;
mineralSkins.renderOrder=4;
mineralSkins.count=0;
mineralSkins.visible=false;
scene.add(mineralSkins);
// Actual tinted mineral seed granules are tiny geometry in the skin layer,
// not a fake screen-space shimmer. Seed positions are tied to voxel IDs.
const mineralSeedGeometry=new THREE.OctahedronGeometry(crystalCellSize*.10,0);
const mineralSeedMaterial=new THREE.MeshPhysicalMaterial({
  color:'#ffffff',roughness:.19,metalness:.16,clearcoat:1,
  iridescence:.88,iridescenceThicknessRange:[110,370]
});
const mineralSeeds=new THREE.InstancedMesh(
  mineralSeedGeometry,mineralSeedMaterial,maxMineralSeeds);
mineralSeeds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
mineralSeeds.frustumCulled=false;
mineralSeeds.count=0;
mineralSeeds.visible=false;
scene.add(mineralSeeds);
// A single, capped, real 3D band mesh to express inherited mineral layers.
// Historical birth pigment is never rewritten by the decorative banding.
const MAX_BLOODLINE_BANDS=1100;
const bloodlineBandGeometry=new THREE.TorusGeometry(
  crystalCellSize*.26,crystalCellSize*.014,3,8);
const bloodlineBandMaterial=new THREE.MeshPhysicalMaterial({
  color:'#ffffff',roughness:.18,metalness:.30,clearcoat:1,
  iridescence:.94,iridescenceThicknessRange:[100,440],
  transparent:true,opacity:.74,depthWrite:false,
  side:THREE.DoubleSide
});
const bloodlineBands=new THREE.InstancedMesh(
  bloodlineBandGeometry,bloodlineBandMaterial,MAX_BLOODLINE_BANDS);
bloodlineBands.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
bloodlineBands.frustumCulled=false;
bloodlineBands.count=0;
bloodlineBands.visible=false;
bloodlineBands.renderOrder=3;
scene.add(bloodlineBands);
const bandFlatAxis=new THREE.Vector3(0,0,1);
const bandAlongAxis=new THREE.Quaternion()
  .setFromUnitVectors(bandFlatAxis,new THREE.Vector3(0,1,0));
const bandRotation=new THREE.Quaternion();
const bandPosition=new THREE.Vector3();
const bandAxis=new THREE.Vector3();
const bandTint=new THREE.Color();
const bandTransform=new THREE.Matrix4();
const bandScale=new THREE.Vector3();
const inclusionRoll=new THREE.Quaternion();
const mineralOrigin=new THREE.Vector3();
const mineralTint=new THREE.Color();
const crystalTransform=new THREE.Matrix4();
const crystalPosition=new THREE.Vector3();
const crystalRotation=new THREE.Quaternion();
const crystalScale=new THREE.Vector3(1,1,1);
const crystalUp=new THREE.Vector3(0,1,0);
const crystalOutward=new THREE.Vector3();
const crystalColor=new THREE.Color();
const crystalWhite=new THREE.Color('#ffffff');
const crystalCrackedTint=new THREE.Color('#ddd8ef');
// A real cell only shows a crack after stored lattice damage exceeds the
// material threshold. Missing cells leave persistent hairline scar marks.
const maxScarLines=8000;
const scarCoords=new Float32Array(maxScarLines*6);
const scarColors=new Float32Array(maxScarLines*6);
const scarGeometry=new THREE.BufferGeometry();
const scarPosition=new THREE.BufferAttribute(scarCoords,3).setUsage(THREE.DynamicDrawUsage);
const scarPigment=new THREE.BufferAttribute(scarColors,3).setUsage(THREE.DynamicDrawUsage);
scarGeometry.setAttribute('position',scarPosition);
scarGeometry.setAttribute('color',scarPigment);
scarGeometry.setDrawRange(0,0);
const scarLines=new THREE.LineSegments(scarGeometry,new THREE.LineBasicMaterial({
  vertexColors:true,transparent:true,opacity:.68,depthTest:false,depthWrite:false
}));
scarLines.frustumCulled=false;
scarLines.renderOrder=4;
scene.add(scarLines);
function syncCrystals(){
  if(!engine.colony.changed)return;
  let visible=0,facetCount=0,skinCount=0,seedCount=0,bandCount=0,
      scarLinesDrawn=0,cracked=0,shattered=0;
  const heritageOn=engine.config.crystalHeritage!=='off'&&
    engine.config.crystalHeritageStrength>0;
  const familiesSeen=new Set();
  let ancestryTracked=0,descendants=0;
  const useAging=isMineralMetamorphosisActive({
    preset:engine.config.crystalEvolution
  });
  for(const tier of METAMORPHOSIS_STAGES)crystalAgeCounts[tier]=0;
  const inclusionStyle=engine.config.crystalInterior;
  const useInclusions=inclusionStyle!=='off'&&
    (engine.config.crystalSkin>0||engine.config.crystalInclusions>0);
  const colony=engine.colony;
  for(let i=0;i<colony.capacity;i++){
    const damage=colony.damage[i];
    if(damage){
      if(damage===1)cracked++;else shattered++;
      if(scarLinesDrawn<maxScarLines){
        const [sx,sy,sz]=colony.decode(i);
        const p=colony.worldPos(sx,sy,sz);
        const spread=crystalCellSize*(damage===2?.43:.31);
        const direction=i%3;
        const dx=direction===0?spread:spread*.28;
        const dy=direction===1?spread:spread*.24;
        const dz=direction===2?spread:spread*.35;
        const k=scarLinesDrawn++*6;
        scarCoords.set([p.x-dx,p.y-dy,p.z-dz,
                        p.x+dx,p.y+dy,p.z+dz],k);
        // Pigment remains frozen at crystal birth, including after death.
        // Fractures carry that precise user-selected palette history.
        const j=i*3;
        const pigment=[
          .20+colony.colors[j]/255*.86,
          .20+colony.colors[j+1]/255*.86,
          .20+colony.colors[j+2]/255*.86
        ];
        scarColors.set([...pigment,...pigment],k);
      }
    }
    if(!colony.cells[i])continue;
    const [x,y,z]=colony.decode(i);
    const point=colony.worldPos(x,y,z);
    crystalPosition.set(point.x,point.y,point.z);
    const mature=colony.cells[i]===2;
    const scale=mature?1:Math.max(.36,Math.min(1,(colony.ages[i]+1)/colony.settings.crystallization));
    const stress=colony.strain[i];
    const surface=crystalSurface(colony.cells,colony.damage,i,colony.size);
    const display=mineralCellDisplay({
      index:i,strain:stress,damage,surface
    },{
      relief:engine.config.crystalRelief,glint:engine.config.crystalGlints
    });
    const family=colony.families[i];
    if(family){
      familiesSeen.add(family);
      ancestryTracked++;
      if(colony.parentBirthIds[i])descendants++;
    }
    const heritage=inheritedFacet([
      colony.genes[i*3],colony.genes[i*3+1],colony.genes[i*3+2]
    ],family,colony.ages[i],{
      mode:engine.config.crystalHeritage,
      strength:engine.config.crystalHeritageStrength
    });
    if(engine.config.crystalRelief>0){
      crystalOutward.set(...surface.direction);
      crystalRotation.setFromUnitVectors(crystalUp,crystalOutward);
    }else crystalRotation.identity();
    // The local Y axis is the mineral's crystallographic growth axis.
    // Actual mesh anisotropy, not a pixel filter or image transformation.
    const classicView=engine.config.crystalShape==='octa'&&
      engine.config.crystalLens==='inherit'&&
      engine.config.crystalRelief===0&&engine.config.crystalGlints===0;
    if(classicView&&damage===1){
      // Legacy visual restoration uses its original cracked-cell ratios.
      crystalScale.set(scale*.88,scale*.75,scale*.84);
    }else{
      crystalScale.set(
        scale*display.lateral,
        scale*display.axial*(damage===1?.86:1),
        scale*display.lateral
      );
    }
    // Genes affect real instanced mineral proportions, not a 2D overlay.
    crystalScale.set(
      crystalScale.x*heritage.lateral,
      crystalScale.y*heritage.axial,
      crystalScale.z*heritage.lateral
    );
    crystalTransform.compose(crystalPosition,crystalRotation,crystalScale);
    crystals.setMatrixAt(visible,crystalTransform);
    const k=i*3;
    crystalColor.setRGB(colony.colors[k]/255,colony.colors[k+1]/255,colony.colors[k+2]/255);
    if(!mature)crystalColor.lerp(crystalWhite,.17);
    if(damage===1)crystalColor.lerp(crystalCrackedTint,.26);
    else if(stress>.15)crystalColor.lerp(crystalCrackedTint,
      Math.min(.16,stress*.12));
    crystalColor.lerp(crystalWhite,display.pigmentMix);
    crystals.setColorAt(visible,crystalColor);
    if(heritageOn&&mature&&surface.exposed>0&&
       heritage.band&&bandCount<MAX_BLOODLINE_BANDS){
      // One mineral layer per selected living exterior voxel, a physical
      // growth ring aligned with its actual crystal/family facet axis.
      bandAxis.copy(crystalUp).applyQuaternion(crystalRotation);
      bandPosition.copy(crystalPosition).addScaledVector(
        bandAxis,heritage.position*crystalCellSize*scale);
      bandRotation.copy(crystalRotation).multiply(bandAlongAxis);
      bandScale.setScalar(scale*Math.max(.55,heritage.lateral));
      bandTransform.compose(bandPosition,bandRotation,bandScale);
      bloodlineBands.setMatrixAt(bandCount,bandTransform);
      const q=i*3;
      bandTint.setRGB(
        Math.min(1,colony.colors[q]/255*(1-heritage.shade)+heritage.shade),
        Math.min(1,colony.colors[q+1]/255*(1-heritage.shade)+heritage.shade),
        Math.min(1,colony.colors[q+2]/255*(1-heritage.shade)+heritage.shade));
      bloodlineBands.setColorAt(bandCount,bandTint);
      bandCount++;
    }
    if(useAging){
      const tier=mineralLifeStage({
        occupied:true,mature,age:colony.ages[i],
        damage,strain:stress,fractureFaces:surface.fractureFaces
      },{
        maturity:engine.config.crystalMaturity,
        stress:engine.config.crystalStressOptics
      });
      const index=crystalAgeCounts[tier]++;
      const mesh=crystalAgeMeshes[tier];
      mesh.setMatrixAt(index,crystalTransform);
      mesh.setColorAt(index,crystalColor);
    }
    // Layered, age-grown mineral structure is anchored to REAL surviving
    // exterior crystal cells. Render-only IDs/geometry never change the CA.
    if(useInclusions&&mature&&surface.exposed>0){
      const recipe=mineralInclusionRecipe({
        occupied:true,mature:true,index:i,age:colony.ages[i],
        strain:stress,damage,surface
      },{
        style:inclusionStyle,skin:engine.config.crystalSkin,
        density:engine.config.crystalInclusions
      });
      if(recipe.shell&&skinCount<maxMineralSkins){
        crystalScale.multiplyScalar(recipe.skinScale);
        crystalTransform.compose(crystalPosition,crystalRotation,crystalScale);
        mineralSkins.setMatrixAt(skinCount,crystalTransform);
        crystalScale.multiplyScalar(1/recipe.skinScale);
        // Frozen at birth, regardless of the currently selected palette.
        const bornColor=historicInclusionPigment([
          colony.colors[k]/255,colony.colors[k+1]/255,colony.colors[k+2]/255
        ],recipe);
        mineralTint.setRGB(...bornColor);
        mineralSkins.setColorAt(skinCount,mineralTint);
        skinCount++;
      }
      if(recipe.inclusion&&seedCount<maxMineralSeeds){
        crystalOutward.set(...surface.direction).normalize();
        const length=crystalCellSize*recipe.radialOffset*scale;
        mineralOrigin.copy(crystalPosition).addScaledVector(crystalOutward,length);
        crystalRotation.setFromUnitVectors(crystalUp,crystalOutward);
        inclusionRoll.setFromAxisAngle(crystalUp,inclusionFaceRotation(i));
        crystalRotation.multiply(inclusionRoll);
        const mineralSize=scale*(.40+.20*recipe.ageFraction);
        crystalScale.set(mineralSize*.65,mineralSize*1.22,mineralSize*.65);
        crystalTransform.compose(mineralOrigin,crystalRotation,crystalScale);
        mineralSeeds.setMatrixAt(seedCount,crystalTransform);
        const seedPigment=historicInclusionPigment([
          colony.colors[k]/255,colony.colors[k+1]/255,colony.colors[k+2]/255
        ],recipe);
        mineralTint.setRGB(...seedPigment);
        mineralSeeds.setColorAt(seedCount,mineralTint);
        seedCount++;
      }
    }
    // A distinct physically shaded facet is anchored to the actual
    // survivor's exterior; fracture chips face a genuine absent neighbor.
    // Reserve a share of the small accent budget for fracture boundaries,
    // instead of allowing early ordinary cells to consume every instance.
    if(display.drawGem&&facetCount<maxFacetGems&&
      (display.fractureGlint||facetCount<Math.floor(maxFacetGems*.66))){
      const isFracture=display.fractureGlint;
      const direction=display.gemDirection;
      crystalOutward.set(...direction).normalize();
      crystalRotation.setFromUnitVectors(crystalUp,crystalOutward);
      const offset=crystalCellSize*(isFracture?.32:.36);
      const gemSize=(isFracture?.69:.44)*Math.max(.25,scale)*
        (.45+.55*engine.config.crystalGlints);
      const gemPos=crystalPosition.clone().addScaledVector(crystalOutward,offset);
      crystalScale.set(gemSize*.70,gemSize*1.55,gemSize*.70);
      crystalTransform.compose(gemPos,crystalRotation,crystalScale);
      facetGems.setMatrixAt(facetCount,crystalTransform);
      const j=i*3;
      const channels=gemPigment([
        colony.colors[j]/255,colony.colors[j+1]/255,colony.colors[j+2]/255
      ],stress,isFracture);
      crystalColor.setRGB(...channels);
      facetGems.setColorAt(facetCount,crystalColor);
      facetCount++;
    }
    visible++;
    if(visible>=colony.maxCells)break;
  }
  scarGeometry.setDrawRange(0,scarLinesDrawn*2);
  scarPosition.needsUpdate=true;
  scarPigment.needsUpdate=true;
  $('strain-stats').textContent=cracked.toLocaleString()+
    ' CRACKED CELLS · '+shattered.toLocaleString()+' FRACTURE SCARS'+
    (scarLinesDrawn>=maxScarLines?' · SCAR DISPLAY CAPPED':'');
  bloodlineBands.count=heritageOn?bandCount:0;
  bloodlineBands.visible=heritageOn&&bandCount>0;
  if(heritageOn){
    bloodlineBands.instanceMatrix.needsUpdate=true;
    if(bloodlineBands.instanceColor)bloodlineBands.instanceColor.needsUpdate=true;
  }
  $('heritage-stats').textContent=ancestryTracked.toLocaleString()+
    ' TRACKED CRYSTALS · '+familiesSeen.size.toLocaleString()+
    ' FOUNDER FAMILIES · '+descendants.toLocaleString()+
    ' LIVING DESCENDANTS · '+bandCount.toLocaleString()+' MINERAL BANDS';
  mineralSkins.count=skinCount;
  mineralSkins.visible=skinCount>0;
  mineralSkins.instanceMatrix.needsUpdate=true;
  if(mineralSkins.instanceColor)mineralSkins.instanceColor.needsUpdate=true;
  mineralSeeds.count=seedCount;
  mineralSeeds.visible=seedCount>0;
  mineralSeeds.instanceMatrix.needsUpdate=true;
  if(mineralSeeds.instanceColor)mineralSeeds.instanceColor.needsUpdate=true;
  $('inclusions-stats').textContent=skinCount.toLocaleString()+
    ' OUTER SKINS · '+seedCount.toLocaleString()+' AGE-GROWN INCLUSIONS'+
    (skinCount===maxMineralSkins||seedCount===maxMineralSeeds?
      ' · MOBILE DISPLAY BUDGET CAPPED':'');
  facetGems.count=facetCount;
  facetGems.instanceMatrix.needsUpdate=true;
  if(facetGems.instanceColor)facetGems.instanceColor.needsUpdate=true;
  crystals.count=visible;
  crystals.instanceMatrix.needsUpdate=true;
  if(crystals.instanceColor)crystals.instanceColor.needsUpdate=true;
  crystals.visible=!useAging;
  for(const tier of METAMORPHOSIS_STAGES){
    const mesh=crystalAgeMeshes[tier];
    mesh.count=useAging?crystalAgeCounts[tier]:0;
    mesh.visible=useAging&&mesh.count>0;
    if(useAging){
      mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    }
  }
  $('crystal-evolution-stats').textContent=useAging?
    crystalAgeCounts.young.toLocaleString()+' YOUNG GLASS · '+
    crystalAgeCounts.mature.toLocaleString()+' MATURE OPAL · '+
    crystalAgeCounts.fault.toLocaleString()+' FAULTED MINERAL':
    'OPTICAL LIFE CYCLE OFF · ORIGINAL CRYSTALS';
  colony.changed=false;
}

// All profiles share one instanced draw; changing the cross-section changes
// the actual light-catching geometry without rebuilding any grown segment.
const fiberGeometryProfiles=Object.fromEntries(Object.entries(FIBER_PROFILES).map(
  ([key,profile])=>[key,new THREE.CylinderGeometry(
    profile.top,profile.bottom,1,profile.facets,1,true)]
));
const fiberGeometry=fiberGeometryProfiles.needle;
const fiberMaterial=new THREE.MeshPhysicalMaterial({
  color:'#ffffff',side:THREE.DoubleSide,metalness:.20,roughness:.27,
  clearcoat:.85,clearcoatRoughness:.15,iridescence:.70,iridescenceIOR:1.32,
  iridescenceThicknessRange:[100,400],
  emissive:'#12071d',emissiveIntensity:.18
});
const fibers = new THREE.InstancedMesh(fiberGeometry,fiberMaterial,engine.maxSegments);
fibers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
fibers.frustumCulled = false;
fibers.count=0;
scene.add(fibers);

const haloPositions = new Float32Array(engine.maxSegments*6);
const haloColors = new Float32Array(engine.maxSegments*6);
const haloGeometry = new THREE.BufferGeometry();
const haloPositionAttribute = new THREE.BufferAttribute(haloPositions,3).setUsage(THREE.DynamicDrawUsage);
const haloColorAttribute = new THREE.BufferAttribute(haloColors,3).setUsage(THREE.DynamicDrawUsage);
haloGeometry.setAttribute('position',haloPositionAttribute);
haloGeometry.setAttribute('color',haloColorAttribute);
haloGeometry.setDrawRange(0,0);
const halos = new THREE.LineSegments(haloGeometry,new THREE.LineBasicMaterial({
  vertexColors:true,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,
  depthWrite:false,toneMapped:false
}));
halos.frustumCulled=false;
scene.add(halos);

const maxTips=360;
const tipPositions=new Float32Array(maxTips*3);
const tipColors=new Float32Array(maxTips*3);
const tipGeometry=new THREE.BufferGeometry();
tipGeometry.setAttribute('position',new THREE.BufferAttribute(tipPositions,3).setUsage(THREE.DynamicDrawUsage));
tipGeometry.setAttribute('color',new THREE.BufferAttribute(tipColors,3).setUsage(THREE.DynamicDrawUsage));
tipGeometry.setDrawRange(0,0);
const tipShader = new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{pointScale:{value:window.devicePixelRatio > 1?13:9}},
  vertexShader:[
    'attribute vec3 color;',
    'varying vec3 vColor;',
    'uniform float pointScale;',
    'void main(){',
    'vColor=color;',
    'vec4 viewPos=modelViewMatrix*vec4(position,1.);',
    'gl_Position=projectionMatrix*viewPos;',
    'gl_PointSize=clamp(pointScale*12.0/-viewPos.z,3.0,38.0);',
    '}'
  ].join('\n'),
  fragmentShader:[
    'varying vec3 vColor;',
    'void main(){',
    'float d=length(gl_PointCoord-vec2(.5));',
    'float core=pow(max(0.,1.-d*2.),2.5);',
    'if(core<.018)discard;',
    'gl_FragColor=vec4(vColor*(.9+core),core*.78);',
    '}'
  ].join('\n')
});
scene.add(new THREE.Points(tipGeometry,tipShader));

const yAxis=new THREE.Vector3(0,1,0);
const delta=new THREE.Vector3();
const mid=new THREE.Vector3();
const quaternion=new THREE.Quaternion();
const transform=new THREE.Matrix4();
const scale=new THREE.Vector3();
let geometryDirty=false;
const strandTint=new THREE.Color();
function toneAndHalo(color,generation=0,bornAt=engine.time){
  const lineage=lineageLighting([color.r,color.g,color.b],
    generation,engine.config.filigreeContrast);
  const mineral=mineralOptics(lineage,Math.max(0,engine.time-bornAt),engine.config);
  strandTint.setRGB(...mineral.color);
  return mineral.halo;
}
// Refresh visible optics progressively, instead of 60,000 setColorAt calls in
// one frame on iPhone. The segment's stored RGB and birth time remain intact.
let filigreeRefreshPending=false,filigreeCursor=0,lastMineralRefresh=0;
function requestFiligreeRefresh(){
  filigreeRefreshPending=true;
  filigreeCursor=0;
}
function updateFiligreeDisplay(){
  if(!filigreeRefreshPending)return;
  const end=Math.min(engine.segmentCount,filigreeCursor+2200);
  const rgb=engine.segmentColors,gens=engine.segmentGenerations;
  const born=engine.segmentBornAt;
  for(let i=filigreeCursor;i<end;i++){
    const j=i*3,k=i*6,generation=gens[i];
    const input=strandTint.setRGB(rgb[j]/255,rgb[j+1]/255,rgb[j+2]/255);
    const opacity=toneAndHalo(input,generation,born[i]);
    fibers.setColorAt(i,strandTint);
    const bloom=1.65*opacity*lineageHaloScale(generation,engine.config.filigreeContrast);
    haloColors.set([strandTint.r*bloom,strandTint.g*bloom,strandTint.b*bloom,
      strandTint.r*bloom,strandTint.g*bloom,strandTint.b*bloom],k);
  }
  filigreeCursor=end;
  if(fibers.instanceColor)fibers.instanceColor.needsUpdate=true;
  haloColorAttribute.needsUpdate=true;
  if(filigreeCursor>=engine.segmentCount)filigreeRefreshPending=false;
}
engine.onReset=()=>{
  fibers.count=0;
  haloGeometry.setDrawRange(0,0);
  geometryDirty=true;
};
engine.onDeposit=(slot,a,b,color,radius,generation=0,bornAt=engine.time)=>{
  delta.subVectors(b,a);
  const length=delta.length();
  if(length<.00001)return;
  mid.copy(a).add(b).multiplyScalar(.5);
  quaternion.setFromUnitVectors(yAxis,delta.multiplyScalar(1/length));
  scale.set(radius,length,radius);
  transform.compose(mid,quaternion,scale);
  fibers.setMatrixAt(slot,transform);
  const opacity=toneAndHalo(color,generation,bornAt);
  fibers.setColorAt(slot,strandTint);
  const k=slot*6;
  haloPositions.set([a.x,a.y,a.z,b.x,b.y,b.z],k);
  const bloom=1.65*opacity*lineageHaloScale(generation,engine.config.filigreeContrast);
  haloColors.set([strandTint.r*bloom,strandTint.g*bloom,strandTint.b*bloom,
                  strandTint.r*bloom,strandTint.g*bloom,strandTint.b*bloom],k);
  fibers.count=engine.segmentCount===engine.maxSegments?engine.maxSegments:Math.max(fibers.count,slot+1);
  haloGeometry.setDrawRange(0,Math.max(haloGeometry.drawRange.count,(slot+1)*2));
  geometryDirty=true;
};
const nodeSphere=new THREE.IcosahedronGeometry(.12,1);
const nodeMaterials={
  attract:new THREE.MeshBasicMaterial({color:'#80ffe4'}),
  repel:new THREE.MeshBasicMaterial({color:'#ff7a69'}),
  vortex:new THREE.MeshBasicMaterial({color:'#f96dec'})
};
const vortexRingGeometry=new THREE.RingGeometry(.97,1.03,56);
const vortexRingMaterial=new THREE.MeshBasicMaterial({
  color:'#f96dec',transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false
});
let selectedNodeId=null;
function selectedNode(){return engine.nodes.find(n=>n.id===selectedNodeId)||null;}
function showNodeSelection(){
  const node=selectedNode(),vortex=node?.type==='vortex';
  $('gesture-selection').textContent=node
    ?node.type.toUpperCase()+' #'+node.id+' · DRAG TO MOVE'+(vortex?' · PINCH/TWIST TO SCULPT':'')
    :'NO FIELD SOURCE SELECTED — TAP TO CREATE ONE';
  $('gesture-radius').disabled=!vortex;
  $('gesture-spin').disabled=!vortex;
  $('gesture-strength').disabled=!node||vortex;
  if(node){
    $('gesture-strength').value=String(node.strength);
    $('gesture-strength-value').textContent=node.strength.toFixed(2);
  }
  if(vortex){
    $('gesture-radius').value=String(node.radius);
    $('gesture-radius-value').textContent=node.radius.toFixed(2);
    $('gesture-spin').value=String(node.spin);
    $('gesture-spin-value').textContent=node.spin.toFixed(2);
  }
}
const nodeViews=new Map();
// Visible stress-mark instruments reveal WHERE cellular probability laws
// change, not fabricated crystal geometry. One small ring per named mark.
const pressureViews=new Map();
const pressureRingGeometry=new THREE.RingGeometry(.92,1.02,44);
const pressureCoreGeometry=new THREE.SphereGeometry(.095,10,8);
const pressurePalette={
  grow:new THREE.MeshBasicMaterial({color:'#81ffba',transparent:true,opacity:.77,side:THREE.DoubleSide,depthWrite:false}),
  shield:new THREE.MeshBasicMaterial({color:'#ffd66f',transparent:true,opacity:.79,side:THREE.DoubleSide,depthWrite:false}),
  cleave:new THREE.MeshBasicMaterial({color:'#fc69dc',transparent:true,opacity:.83,side:THREE.DoubleSide,depthWrite:false}),
  strain:new THREE.MeshBasicMaterial({color:'#54e9ff',transparent:true,opacity:.87,side:THREE.DoubleSide,depthWrite:false})
};
const pressureLineMaterials={
  cleave:new THREE.LineBasicMaterial({color:'#ffa4ef',transparent:true,opacity:.81,depthWrite:false})
};
let selectedPressureId=null,pressureSliderEdit=null,pressureAnchor=null;
function selectedPressure(){return engine.pressures.find(p=>p.id===selectedPressureId)||null;}
function updatePressureControls(){
  const mark=selectedPressure();
  const radius=mark?.radius??engine.config.pressureRadius;
  const strength=mark?.strength??engine.config.pressureStrength;
  const dormant=!engine.colony.settings.enabled||engine.colony.population===0||
    (mark?.mode==='strain'&&!engine.colony.settings.strainEnabled);
  $('pressure-selection').textContent=(mark
    ?mark.mode.toUpperCase()+' #'+mark.id+' · DRAG TO MOVE · PINCH REACH · TWIST AXIS'
    :'NO PRESSURE MARK SELECTED — CONTROLS SET NEXT STAMP')+
    (dormant?' · START CRYSTALS / ENABLE FRACTURE MEMORY TO ACTIVATE':'');
  if(!pressureSliderEdit){
    $('pressure-radius').value=String(radius);
    $('pressure-strength').value=String(strength);
  }
  $('pressure-radius-value').textContent=radius.toFixed(2);
  $('pressure-strength-value').textContent=strength.toFixed(2);
  $('pressure-stats').textContent=engine.pressures.length+' / 12 PRESSURE MARKS';
}
function syncPressures(){
  const seen=new Set();
  for(const mark of engine.pressures){
    seen.add(mark.id);
    let item=pressureViews.get(mark.id);
    if(!item){
      const group=new THREE.Group();
      const ring=new THREE.Mesh(pressureRingGeometry,pressurePalette[mark.mode]);
      const core=new THREE.Mesh(pressureCoreGeometry,pressurePalette[mark.mode]);
      group.add(ring,core);
      const lineGeometry=new THREE.BufferGeometry();
      const positions=new Float32Array(6);
      lineGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
      const axisLine=new THREE.Line(lineGeometry,pressureLineMaterials.cleave);
      axisLine.visible=false;group.add(axisLine);
      scene.add(group);
      item={group,ring,core,axisLine,positions};
      pressureViews.set(mark.id,item);
    }
    item.group.position.set(...mark.center);
    item.ring.material=pressurePalette[mark.mode];
    item.core.material=pressurePalette[mark.mode];
    item.ring.scale.setScalar(mark.radius);
    item.core.scale.setScalar(mark.id===selectedPressureId?1.55:1);
    item.ring.quaternion.copy(camera.quaternion);
    item.axisLine.visible=mark.mode==='cleave';
    if(item.axisLine.visible){
      const k=mark.radius*.85,a=mark.axis;
      item.positions.set([-a[0]*k,-a[1]*k,-a[2]*k,a[0]*k,a[1]*k,a[2]*k]);
      item.axisLine.geometry.attributes.position.needsUpdate=true;
    }
  }
  for(const [id,item] of pressureViews){
    if(!seen.has(id)){
      scene.remove(item.group);
      item.axisLine.geometry.dispose();
      pressureViews.delete(id);
    }
  }
  if(selectedPressureId!==null&&!seen.has(selectedPressureId))selectedPressureId=null;
  updatePressureControls();
}
// The interactive threads are a faithful editor overlay of persistent 3D
// stroke sources. The simulation samples these same strokes independently.
const strokeBuffer=new Float32Array(10*47*6);
const strokeColorBuffer=new Float32Array(10*47*6);
const strokeGeometry=new THREE.BufferGeometry();
strokeGeometry.setAttribute('position',new THREE.BufferAttribute(
  strokeBuffer,3).setUsage(THREE.DynamicDrawUsage));
strokeGeometry.setAttribute('color',new THREE.BufferAttribute(
  strokeColorBuffer,3).setUsage(THREE.DynamicDrawUsage));
const strokeOverlay=new THREE.LineSegments(strokeGeometry,
  new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.78,depthWrite:false}));
strokeOverlay.frustumCulled=false;
scene.add(strokeOverlay);
function syncStrokes(){
  let count=0;
  for(const stroke of engine.strokes){
    const color=stroke.kind==='guide'?[.18,1,.81]:[1,.25,.77];
    for(let j=1;j<stroke.points.length;j++){
      const a=stroke.points[j-1],b=stroke.points[j],k=count*6;
      strokeBuffer.set([...a,...b],k);
      strokeColorBuffer.set([...color,...color],k);
      count++;
    }
  }
  strokeGeometry.setDrawRange(0,count*2);
  strokeGeometry.attributes.position.needsUpdate=true;
  strokeGeometry.attributes.color.needsUpdate=true;
  $('stroke-stats').textContent=engine.strokes.length+' / 10 GROWTH PATHS';
}
// A touch-responsive preview samples the SAME vector field that drives real
// fiber tips. It is an instrument readout, not a substitute for simulation.
const previewCount=24;
const previewCoordinates=new Float32Array(previewCount*6);
const previewGeometry=new THREE.BufferGeometry();
previewGeometry.setAttribute('position',new THREE.BufferAttribute(
  previewCoordinates,3).setUsage(THREE.DynamicDrawUsage));
const previewVectors=new THREE.LineSegments(previewGeometry,
  new THREE.LineBasicMaterial({color:'#bffff1',transparent:true,opacity:.65,depthWrite:false}));
previewVectors.frustumCulled=false;
previewVectors.visible=false;
scene.add(previewVectors);
const sampleLocation=new THREE.Vector3();
function updateFieldPreview(){
  const node=selectedNode();
  if(!node||node.type!=='vortex'){previewVectors.visible=false;return;}
  const r=Math.max(.25,node.radius*.72);
  for(let i=0;i<previewCount;i++){
    const a=i*2*Math.PI/previewCount;
    sampleLocation.set(
      node.pos.x+Math.cos(a)*r,
      node.pos.y,
      node.pos.z+Math.sin(a)*r
    );
    const flow=engine.fieldAt(sampleLocation).normalize().multiplyScalar(.20);
    const k=i*6;
    previewCoordinates.set([
      sampleLocation.x,sampleLocation.y,sampleLocation.z,
      sampleLocation.x+flow.x,sampleLocation.y+flow.y,sampleLocation.z+flow.z
    ],k);
  }
  previewGeometry.attributes.position.needsUpdate=true;
  previewVectors.visible=true;
}
function syncNodes(){
  const existing=new Set();
  engine.nodes.forEach(node=>{
    existing.add(node.id);
    let mesh=nodeViews.get(node.id);
    if(!mesh){
      mesh=new THREE.Mesh(nodeSphere,nodeMaterials[node.type]);
      mesh.userData.id=node.id;
      if(node.type==='vortex'){
        const ring=new THREE.Mesh(vortexRingGeometry,vortexRingMaterial);
        ring.userData.reachRing=true;
        mesh.add(ring);
      }
      scene.add(mesh);nodeViews.set(node.id,mesh);
    }
    mesh.material=nodeMaterials[node.type];
    mesh.position.copy(node.pos);
    const ring=mesh.children.find(child=>child.userData.reachRing);
    const selectionScale=node.id===selectedNodeId?1.35:1;
    if(ring){
      // The selected handle grows, but its radius ring remains true to
      // the physical support distance in world units.
      ring.scale.setScalar((node.radius??1.1)/selectionScale);
      ring.quaternion.copy(camera.quaternion);
    }
    mesh.scale.setScalar(selectionScale);
  });
  for(const [id,mesh] of nodeViews){
    if(!existing.has(id)){scene.remove(mesh);nodeViews.delete(id);}
  }
  if(selectedNodeId!==null&&!existing.has(selectedNodeId))selectedNodeId=null;
  showNodeSelection();
  updateFieldPreview();
}
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
const pointerPlane=new THREE.Plane();
const point=new THREE.Vector3();
function positionFromEvent(e){
  const rect=canvas.getBoundingClientRect();
  pointer.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
  raycaster.setFromCamera(pointer,camera);
  const normal=camera.getWorldDirection(new THREE.Vector3());
  pointerPlane.setFromNormalAndCoplanarPoint(normal,orbit.target);
  if(!raycaster.ray.intersectPlane(pointerPlane,point))return new THREE.Vector3();
  return point.clone().clampLength(0,3.35);
}
// Prefer the actual crystal surface for first contact. Once picked, edit
// against its camera-parallel depth plane so a drag doesn't jump in Z.
function pressureStartFromEvent(e){
  const rect=canvas.getBoundingClientRect();
  pointer.set(((e.clientX-rect.left)/rect.width)*2-1,
    -((e.clientY-rect.top)/rect.height)*2+1);
  raycaster.setFromCamera(pointer,camera);
  const sculptable=isMineralMetamorphosisActive({
    preset:engine.config.crystalEvolution
  })?METAMORPHOSIS_STAGES.map(t=>crystalAgeMeshes[t]):[crystals];
  const hit=engine.colony.population>0?
    raycaster.intersectObjects(sculptable,false)[0]:null;
  return hit?hit.point.clone().clampLength(0,3.35):positionFromEvent(e);
}
function pressureProjectFromClient(x,y){
  const rect=canvas.getBoundingClientRect();
  pointer.set(((x-rect.left)/rect.width)*2-1,
    -((y-rect.top)/rect.height)*2+1);
  raycaster.setFromCamera(pointer,camera);
  const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(
    camera.getWorldDirection(new THREE.Vector3()),
    pressureAnchor||orbit.target);
  const hit=raycaster.ray.intersectPlane(plane,new THREE.Vector3());
  return (hit||new THREE.Vector3()).clampLength(0,3.35);
}
let tool='attract',paused=false,gestureSuspended=false;
const fingers=new Map();
const fieldEdit=new FieldGestureTransaction(engine);
const strokeEdit=new GrowthStrokeTransaction(engine);
const pressureEdit=new CrystalPressureTransaction(engine);
let pendingEraseStrokeId=null;
let sliderEdit=null,gestureMode='idle',primaryPointer=null,lensAnchor=null;
let transientSnapshot=null;
const hints={
  sculpt:'DRAG A VORTEX EYE · PINCH RADIUS · TWIST CHIRALITY',
  stitch:'DRAW A PATH YOUR GROWING FIBERS WILL FOLLOW',
  warp:'DRAG TO PAINT A PERSISTENT LOCAL GROWTH FORCE',
  'pressure-grow':'TOUCH THE COLONY TO ENCOURAGE NEW CRYSTAL BIRTHS',
  'pressure-shield':'TOUCH TO PROTECT A REGION FROM NEW CRYSTAL BIRTHS',
  'pressure-cleave':'DRAG A SPLIT AXIS · PRESS INTO THE CRYSTAL FRONT',
  'pressure-strain':'DRAG A STRESS SOURCE · CRACKS BUILD UP IN LIVING CRYSTALS',
  attract:'DRAG TO CREATE OR MOVE AN ATTRACTOR',
  repel:'DRAG TO CREATE OR MOVE A REPULSOR',
  seed:'TOUCH TO GERMINATE MORE STRANDS',
  chemical:'DRAG TO INOCULATE THE 3D CHEMICAL FIELD',
  crystal:'TOUCH TO SEED THREE-DIMENSIONAL CELLS',
  feed:'DRAG TO INJECT NUTRIENTS INTO 3D SPACE',
  orbit:'DRAG TO ORBIT · PINCH TO ZOOM THE CAMERA',
  erase:'TAP A FIELD NODE TO ERASE IT'
};
function updateSculptButton(){
  $('pressure-quick').setAttribute('aria-pressed',String(tool.startsWith('pressure-')));
  $('pressure-quick').classList.toggle('active',tool.startsWith('pressure-'));
  $('sculpt-quick').setAttribute('aria-pressed',String(tool==='sculpt'));
  $('sculpt-quick').classList.toggle('active',tool==='sculpt');
}
function refreshGestureView(){
  syncNodes();
  showNodeSelection();
}
function cancelSliderEdit(){
  if(!sliderEdit)return;
  sliderEdit.cancel();
  sliderEdit=null;
  refreshGestureView();
}
function finishGesture(cancel=false){
  if(fieldEdit.active){
    if(cancel)fieldEdit.cancel();
    else fieldEdit.commit();
  }
  if(strokeEdit.active){
    if(cancel)strokeEdit.cancel();
    else strokeEdit.commit();
  }
  if(pressureEdit.active){
    if(cancel)pressureEdit.cancel();
    else pressureEdit.commit();
  }
  syncPressures();
  if(gestureMode==='erase-stroke'&&!cancel&&pendingEraseStrokeId!==null)
    engine.deleteStroke(pendingEraseStrokeId);
  pendingEraseStrokeId=null;
  syncStrokes();
  if(cancel&&transientSnapshot){
    const snap=transientSnapshot;
    if(snap.tool==='feed'){
      engine.nutrients.values.set(snap.food);
      if(showFood)updateFoodCloud();
    }else if(snap.tool==='chemical'){
      engine.morphogenesis.u.set(snap.u);
      engine.morphogenesis.v.set(snap.v);
      engine.morphogenesis.changed=true;
      refreshMorphSurface(performance.now(),true);
    }else if(snap.tool==='crystal'){
      engine.colony.restore(snap.colony);
      engine.nutrients.values.set(snap.food);
      engine.morphogenesis.v.set(snap.chemicalB);
      engine.morphogenesis.changed=true;
      engine.rngState=snap.rng;
      syncCrystals();
      refreshMorphSurface(performance.now(),true);
    }else if(snap.tool==='seed'){
      engine.agents=snap.agents;
      engine.rngState=snap.rng;
    }
  }
  transientSnapshot=null;
  primaryPointer=null;
  lensAnchor=null;
  pressureAnchor=null;
  gestureSuspended=fingers.size>0;
  refreshGestureView();
}
function cancelPressureSliderEdit(){
  if(!pressureSliderEdit)return;
  pressureSliderEdit.cancel();
  pressureSliderEdit=null;
  syncPressures();
}
function cancelGesture(){
  if(gestureMode==='idle'&&!fieldEdit.active&&!strokeEdit.active&&
    !pressureEdit.active&&!sliderEdit&&!pressureSliderEdit)return;
  cancelPressureSliderEdit();
  if(sliderEdit)cancelSliderEdit();
  finishGesture(true);
  gestureMode=fingers.size?'blocked':'idle';
}
function setTool(next){
  if(fingers.size||fieldEdit.active||strokeEdit.active||pressureEdit.active||
    sliderEdit||pressureSliderEdit)cancelGesture();
  tool=next;
  orbit.enabled=tool==='orbit';
  $('hint').textContent=hints[tool];
  for(const btn of document.querySelectorAll('[data-tool]'))
    btn.classList.toggle('active',btn.dataset.tool===tool);
  updateSculptButton();
}
document.querySelectorAll('[data-tool]').forEach(btn=>
  btn.addEventListener('click',()=>setTool(btn.dataset.tool)));
$('sculpt-quick').addEventListener('click',()=>setTool('sculpt'));
$('pressure-quick').addEventListener('click',()=>setTool('pressure-strain'));
$('food-tool').addEventListener('click',()=>setTool('feed'));
$('food-view').addEventListener('click',()=>{
  showFood=!showFood;
  foodCloud.visible=showFood;
  $('food-view').classList.toggle('active',showFood);
  $('food-view').setAttribute('aria-pressed',String(showFood));
  $('food-view').textContent=showFood?'◈ HIDE NUTRIENT VOLUME':'◇ SHOW NUTRIENT VOLUME';
  if(showFood)updateFoodCloud();
});
function snapshotTransient(tool){
  if(tool==='feed')return {tool,food:new Float32Array(engine.nutrients.values)};
  if(tool==='chemical')return {
    tool,u:new Float32Array(engine.morphogenesis.u),
    v:new Float32Array(engine.morphogenesis.v)
  };
  if(tool==='crystal')return {
    tool,colony:engine.colony.snapshot(),
    food:new Float32Array(engine.nutrients.values),
    chemicalB:new Float32Array(engine.morphogenesis.v),
    rng:engine.rngState
  };
  if(tool==='seed')return {
    tool,rng:engine.rngState,
    agents:engine.agents.map(a=>({...a,p:a.p.clone(),prev:a.prev.clone(),dir:a.dir.clone()}))
  };
  return null;
}
function applyTransient(pos,isFirst){
  if(tool==='feed'){
    engine.feedAt(pos);
    if(showFood)updateFoodCloud();
  }else if(tool==='chemical'){
    engine.seedChemical(pos,isFirst?.42:.30);
  }else if(tool==='crystal'&&isFirst){
    engine.seedCrystal(pos);
    syncCrystals();
  }else if(tool==='seed'&&isFirst){
    const count=18;
    if(engine.agents.length>engine.config.agents-count)
      engine.agents.splice(0,Math.min(count,engine.agents.length));
    engine.seedAt(pos,count);
  }
}
function screenPoint(e){return {x:e.clientX,y:e.clientY};}
function worldFromClient(x,y){return positionFromEvent({clientX:x,clientY:y});}
function beginFieldPointer(pos){
  const selecting=tool==='erase'||tool==='sculpt'||tool==='attract'||tool==='repel';
  if(!selecting)return false;
  const found=engine.nearestNode(pos,tool==='erase'?1.1:.55);
  const nearest=found&&(tool==='erase'||found.type===(tool==='sculpt'?'vortex':tool))?found:null;
  const began=fieldEdit.begin({
    type:tool==='sculpt'?'vortex':tool,
    pos,
    nodeId:nearest?.id??null
  });
  if(began){
    selectedNodeId=fieldEdit.node?.id??null;
    refreshGestureView();
  }
  return began;
}
canvas.addEventListener('pointerdown',e=>{
  if(tool==='orbit'||(e.pointerType==='mouse'&&e.button!==0))return;
  if(fingers.size>=2 || gestureMode==='blocked')return;
  e.preventDefault();
  try{canvas.setPointerCapture(e.pointerId);}catch{}
  fingers.set(e.pointerId,screenPoint(e));
  gestureSuspended=true;
  if(fingers.size===1){
    cancelSliderEdit();
    cancelPressureSliderEdit();
    primaryPointer=e.pointerId;
    const pressureTool=tool.startsWith('pressure-');
    const pos=pressureTool?pressureStartFromEvent(e):positionFromEvent(e);
    if(pressureTool){
      const mode=tool.slice('pressure-'.length);
      const nearby=engine.nearestPressure(pos,.62);
      try{
        pressureEdit.begin(mode,pos,{id:nearby?.mode===mode?nearby.id:null});
        selectedPressureId=pressureEdit.mark.id;
        pressureAnchor=new THREE.Vector3(...pressureEdit.mark.center);
        gestureMode='pressure';
        syncPressures();
      }catch(err){
        gestureMode='blocked';
        $('pressure-selection').textContent=err.message;
      }
    }else if(tool==='stitch'||tool==='warp'){
      try{
        strokeEdit.begin(tool==='stitch'?'guide':'push',pos);
        gestureMode='stroke';
        syncStrokes();
      }catch(err){
        gestureMode='blocked';
        $('stroke-stats').textContent=err.message;
      }
    }else if(tool==='erase'&&!engine.nearestNode(pos,1.1)){
      const path=engine.nearestStroke(pos,.6);
      pendingEraseStrokeId=path?.id??null;
      gestureMode=path?'erase-stroke':'blocked';
    }else if(['sculpt','attract','repel','erase'].includes(tool)){
      gestureMode=beginFieldPointer(pos)?'single':'blocked';
    }else{
      transientSnapshot=snapshotTransient(tool);
      gestureMode='transient';
      applyTransient(pos,true);
    }
  }else if(fingers.size===2){
    if(pressureEdit.active){
      const [a,b]=[...fingers.values()];
      if(pressureEdit.beginLens(a,b)){
        const midpoint=pressureProjectFromClient((a.x+b.x)*.5,(a.y+b.y)*.5);
        lensAnchor={center:midpoint,origin:new THREE.Vector3(...pressureEdit.mark.center)};
        gestureMode='pressure-lens';
      }else gestureMode='blocked';
      return;
    }
    if(!fieldEdit.active){
      // A second finger cancels path painting; it never creates a
      // mysterious second field feature or commits an interrupted brush.
      finishGesture(true);
      gestureMode='blocked';
      return;
    }
    const [a,b]=[...fingers.values()];
    if(fieldEdit.beginLens(a,b)){
      const mid=worldFromClient((a.x+b.x)*.5,(a.y+b.y)*.5);
      lensAnchor={center:mid,origin:fieldEdit.node.pos.clone()};
      gestureMode='lens';
    }else gestureMode='blocked';
  }
});
canvas.addEventListener('pointermove',e=>{
  if(!fingers.has(e.pointerId)||tool==='orbit')return;
  e.preventDefault();
  fingers.set(e.pointerId,screenPoint(e));
  if(gestureMode==='pressure'&&e.pointerId===primaryPointer&&pressureEdit.active){
    pressureEdit.move(pressureProjectFromClient(e.clientX,e.clientY));
    syncPressures();
  }else if(gestureMode==='pressure-lens'&&pressureEdit.active&&fingers.size===2){
    const [a,b]=[...fingers.values()];
    pressureEdit.lensPreview(a,b);
    if(lensAnchor){
      const midpoint=pressureProjectFromClient((a.x+b.x)*.5,(a.y+b.y)*.5);
      const at=lensAnchor.origin.clone().add(midpoint.sub(lensAnchor.center));
      pressureEdit.translate(at.clampLength(0,3.35));
    }
    syncPressures();
  }else if(gestureMode==='stroke'&&e.pointerId===primaryPointer&&strokeEdit.active){
    strokeEdit.append(positionFromEvent(e));
    syncStrokes();
  }else if(gestureMode==='single'&&e.pointerId===primaryPointer&&fieldEdit.active){
    fieldEdit.move(positionFromEvent(e));
    refreshGestureView();
  }else if(gestureMode==='transient'&&e.pointerId===primaryPointer){
    if(tool==='feed'||tool==='chemical')applyTransient(positionFromEvent(e),false);
  }else if(gestureMode==='lens'&&fieldEdit.active&&fingers.size===2){
    const [a,b]=[...fingers.values()];
    fieldEdit.lensPreview(a,b);
    if(lensAnchor){
      const center=worldFromClient((a.x+b.x)*.5,(a.y+b.y)*.5);
      const destination=lensAnchor.origin.clone().add(center.sub(lensAnchor.center));
      destination.clampLength(0,3.35);
      fieldEdit.move(destination);
    }
    refreshGestureView();
  }
});
function onPointerEnd(e,canceled=false){
  if(!fingers.has(e.pointerId))return;
  if(canceled)finishGesture(true);
  else if(gestureMode!=='blocked')finishGesture(false);
  fingers.delete(e.pointerId);
  gestureMode=fingers.size?'blocked':'idle';
  gestureSuspended=fingers.size>0;
  if(!fingers.size){primaryPointer=null;lensAnchor=null;}
}
canvas.addEventListener('pointerup',e=>onPointerEnd(e,false));
canvas.addEventListener('pointercancel',e=>onPointerEnd(e,true));
canvas.addEventListener('lostpointercapture',e=>{
  if(fingers.has(e.pointerId))onPointerEnd(e,true);
});
window.addEventListener('blur',()=>{
  cancelGesture();
  fingers.clear();
  gestureMode='idle';
  gestureSuspended=false;
});
for(const [id,key] of [
  ['gesture-radius','radius'],['gesture-spin','spin'],['gesture-strength','strength']
]){
  const input=$(id);
  input.addEventListener('input',()=>{
    const node=selectedNode();
    if(!node||(key==='strength'?node.type==='vortex':node.type!=='vortex'))return;
    if(!sliderEdit){
      sliderEdit=new FieldGestureTransaction(engine);
      sliderEdit.begin({nodeId:node.id});
    }
    const edit=sliderEdit.node;
    edit[key]=Number(input.value);
    showNodeSelection();
    syncNodes();
  });
  input.addEventListener('change',()=>{
    if(!sliderEdit)return;
    sliderEdit.commit();
    sliderEdit=null;
    refreshGestureView();
  });
  input.addEventListener('pointercancel',cancelSliderEdit);
}
// Brush sliders alter the selected stamp (one undoable edit) or the defaults
// for the next touch. No native iPhone slider is recreated while dragging.
for(const [id,key,configKey] of [
  ['pressure-radius','radius','pressureRadius'],
  ['pressure-strength','strength','pressureStrength']
]){
  $(id).addEventListener('input',()=>{
    const node=selectedPressure();
    const value=Number($(id).value);
    if(node){
      if(!pressureSliderEdit){
        pressureSliderEdit=new CrystalPressureTransaction(engine);
        pressureSliderEdit.begin(node.mode,new THREE.Vector3(...node.center),{id:node.id});
      }
      pressureSliderEdit.mark[key]=value;
    }else engine.setConfig({[configKey]:value});
    syncPressures();
  });
  $(id).addEventListener('change',()=>{
    if(pressureSliderEdit){
      pressureSliderEdit.commit();
      pressureSliderEdit=null;
    }
    syncPressures();
  });
  $(id).addEventListener('pointercancel',cancelPressureSliderEdit);
}
$('clear-pressures').addEventListener('click',()=>{
  if(!engine.pressures.length)return;
  if(!window.confirm('Clear the crystal pressure marks? Existing grown crystals remain. This edit is undoable.'))return;
  cancelGesture();
  engine.recordNodeEdit();
  engine.pressures=[];
  selectedPressureId=null;
  syncPressures();
});
$('undo').addEventListener('click',()=>{
  if(fingers.size)cancelGesture();
  cancelSliderEdit();cancelPressureSliderEdit();
  engine.undoNodes();
  syncStrokes();syncPressures();
  refreshGestureView();
});
$('redo').addEventListener('click',()=>{
  if(fingers.size)cancelGesture();
  cancelSliderEdit();cancelPressureSliderEdit();
  engine.redoNodes();
  syncStrokes();syncPressures();
  refreshGestureView();
});
$('clear-strokes').addEventListener('click',()=>{
  if(!engine.strokes.length)return;
  if(!window.confirm('Clear every drawn guide/warp path? This is undoable and will not erase deposited fibers.'))return;
  cancelGesture();
  engine.recordNodeEdit();
  engine.strokes=[];
  syncStrokes();
});
function updateStrokeControls(){
  $('stroke-radius').value=String(engine.config.strokeRadius);
  $('stroke-radius-value').textContent=engine.config.strokeRadius.toFixed(2);
  $('stroke-strength').value=String(engine.config.strokeStrength);
  $('stroke-strength-value').textContent=engine.config.strokeStrength.toFixed(2);
}
for(const [id,key] of [['stroke-radius','strokeRadius'],['stroke-strength','strokeStrength']]){
  $(id).addEventListener('input',()=>{
    engine.setConfig({[key]:Number($(id).value)});
    updateStrokeControls();
  });
}
$('clear-nodes').addEventListener('click',()=>{
  if(fingers.size)cancelGesture();
  cancelSliderEdit();
  engine.clearNodes();
  selectedNodeId=null;
  refreshGestureView();
});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(fingers.size)cancelGesture();
    cancelSliderEdit();cancelPressureSliderEdit();
    return;
  }
  if(e.target instanceof HTMLElement&&
    e.target.matches('input,textarea,select,[contenteditable]'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){
    e.preventDefault();
    cancelGesture();
    cancelPressureSliderEdit();
    if(e.shiftKey)engine.redoNodes();
    else engine.undoNodes();
    syncStrokes();syncPressures();
    refreshGestureView();
  }else if(!e.ctrlKey&&!e.metaKey&&!e.altKey){
    if(e.key.toLowerCase()==='s')setTool('sculpt');
    if(e.key.toLowerCase()==='o')setTool('orbit');
  }
});
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  for(const tab of document.querySelectorAll('.tab')){
    tab.classList.toggle('active',tab===btn);
    tab.setAttribute('aria-selected',String(tab===btn));
  }
  for(const panel of document.querySelectorAll('.panel')){
    const selected=panel.dataset.panel===btn.dataset.tab;
    panel.hidden=!selected;
    panel.classList.toggle('active',selected);
  }
}));
function updateCrystalControls(){
  const c=engine.colony.settings;
  $('colony-growth').value=Math.round(c.growth*100);
  $('colony-growth-value').textContent=Math.round(c.growth*100)+'%';
  $('colony-erosion').value=Math.round(c.erosion*100);
  $('colony-erosion-value').textContent=Math.round(c.erosion*100)+'%';
  $('colony-crystallization').value=c.crystallization;
  $('colony-crystallization-value').textContent=c.crystallization+' steps';
  $('colony-toggle').textContent=c.enabled?'Ⅱ PAUSE CRYSTAL GROWTH':'◇ START CRYSTAL COLONY';
  $('colony-toggle').setAttribute('aria-pressed',String(c.enabled));
  $('strain-transfer').value=Math.round(c.strainTransfer*100);
  $('strain-transfer-value').textContent=Math.round(c.strainTransfer*100)+'%';
  $('strain-break').value=Math.round(c.breakThreshold*100);
  $('strain-break-value').textContent=Math.round(c.breakThreshold*100)+'%';
  $('strain-enable').textContent=c.strainEnabled?'⚡ FRACTURE MEMORY ON':'◇ FRACTURE MEMORY OFF';
  $('strain-enable').setAttribute('aria-pressed',String(c.strainEnabled));
  const visual=engine.config;
  $('colony-geometry').value=visual.crystalShape;
  $('crystal-lens').value=visual.crystalLens;
  $('crystal-relief').value=Math.round(visual.crystalRelief*100);
  $('crystal-relief-value').textContent=Math.round(visual.crystalRelief*100)+'%';
  $('crystal-glints').value=Math.round(visual.crystalGlints*100);
  $('crystal-glints-value').textContent=Math.round(visual.crystalGlints*100)+'%';
  $('crystal-interior').value=visual.crystalInterior;
  $('crystal-skin').value=Math.round(visual.crystalSkin*100);
  $('crystal-skin-value').textContent=Math.round(visual.crystalSkin*100)+'%';
  $('crystal-inclusions').value=Math.round(visual.crystalInclusions*100);
  $('crystal-inclusions-value').textContent=Math.round(visual.crystalInclusions*100)+'%';
  $('crystal-evolution').value=visual.crystalEvolution;
  $('crystal-maturity').value=visual.crystalMaturity;
  $('crystal-maturity-value').textContent=visual.crystalMaturity+' generations';
  $('crystal-stress-optics').value=Math.round(visual.crystalStressOptics*100);
  $('crystal-stress-optics-value').textContent=Math.round(visual.crystalStressOptics*100)+'%';
  $('crystal-heritage').value=visual.crystalHeritage;
  $('heritage-strength').value=Math.round(visual.crystalHeritageStrength*100);
  $('heritage-strength-value').textContent=
    Math.round(visual.crystalHeritageStrength*100)+'%';
  $('heritage-growth').value=Math.round(c.ancestryInfluence*100);
  $('heritage-growth-value').textContent=Math.round(c.ancestryInfluence*100)+'%';
  $('heritage-mutation').value=Math.round(c.ancestryMutation*100);
  $('heritage-mutation-value').textContent=Math.round(c.ancestryMutation*100)+'%';
  updatePressureControls();
}
function readCrystalControls(){
  engine.colony.setSettings({
    growth:Number($('colony-growth').value)/100,
    erosion:Number($('colony-erosion').value)/100,
    crystallization:Number($('colony-crystallization').value),
    strainTransfer:Number($('strain-transfer').value)/100,
    breakThreshold:Number($('strain-break').value)/100
  });
  updateCrystalControls();
  updateMorphControls();
}
['colony-growth','colony-erosion','colony-crystallization',
  'strain-transfer','strain-break'].forEach(id=>
  $(id).addEventListener('input',readCrystalControls));
$('strain-enable').addEventListener('click',()=>{
  engine.colony.setSettings({strainEnabled:!engine.colony.settings.strainEnabled});
  updateCrystalControls();
});
$('colony-toggle').addEventListener('click',()=>{
  const enabled=!engine.colony.settings.enabled;
  engine.colony.setSettings({enabled});
  if(enabled&&engine.colony.population===0)engine.seedCrystal(new THREE.Vector3());
  updateCrystalControls();
  syncCrystals();
});
$('crystal-seed').addEventListener('click',()=>setTool('crystal'));
$('crystal-clear').addEventListener('click',()=>{
  if(!engine.colony.population&&!engine.colony.damage.some(n=>n))return;
  if(!window.confirm('Erase the crystal colony only? Your fiber structures and nutrient world will remain.'))return;
  engine.colony.clear();
  syncCrystals();
});
function readCrystalOptics(){
  const previousLens=engine.config.crystalLens;
  const previousInterior=engine.config.crystalInterior;
  const previousEvolution=engine.config.crystalEvolution;
  engine.setConfig({
    crystalShape:$('colony-geometry').value,
    crystalLens:$('crystal-lens').value,
    crystalRelief:Number($('crystal-relief').value)/100,
    crystalGlints:Number($('crystal-glints').value)/100,
    crystalInterior:$('crystal-interior').value,
    crystalSkin:Number($('crystal-skin').value)/100,
    crystalInclusions:Number($('crystal-inclusions').value)/100,
    crystalEvolution:$('crystal-evolution').value,
    crystalMaturity:Number($('crystal-maturity').value),
    crystalStressOptics:Number($('crystal-stress-optics').value)/100
  });
  const shape=crystalShapes[engine.config.crystalShape]||crystalShapes.octa;
  if(crystals.geometry!==shape)crystals.geometry=shape;
  if(mineralSkins.geometry!==shape)mineralSkins.geometry=shape;
  for(const tier of METAMORPHOSIS_STAGES){
    if(crystalAgeMeshes[tier].geometry!==shape)
      crystalAgeMeshes[tier].geometry=shape;
  }
  // Coalesce repeated iPhone slider events into a single normal animation-
  // frame rebuild. This touches ONLY view buffers, never the living state.
  engine.colony.changed=true;
  // A shader/material refresh is needed for lens choices only, not each
  // relief or glint density adjustment.
  if(previousLens!==engine.config.crystalLens||
    previousInterior!==engine.config.crystalInterior||
    previousEvolution!==engine.config.crystalEvolution)applyArtistFinish();
  updateCrystalControls();
}
['colony-geometry','crystal-lens','crystal-relief','crystal-glints',
  'crystal-interior','crystal-skin','crystal-inclusions',
  'crystal-evolution','crystal-maturity','crystal-stress-optics'].forEach(
  id=>$(id).addEventListener(
    ['colony-geometry','crystal-lens','crystal-interior',
     'crystal-evolution'].includes(id)?
      'change':'input',readCrystalOptics));
function readCrystalHeritage(){
  const mode=$('crystal-heritage').value;
  engine.setConfig({
    crystalHeritage:mode,
    crystalHeritageStrength:Number($('heritage-strength').value)/100
  });
  engine.colony.setSettings({
    ancestryEnabled:mode!=='off',
    ancestryInfluence:Number($('heritage-growth').value)/100,
    ancestryMutation:Number($('heritage-mutation').value)/100
  });
  // Normal render-frame refresh; no CPU CA reset or color rewrite.
  engine.colony.changed=true;
  updateCrystalControls();
}
['crystal-heritage','heritage-strength','heritage-growth',
  'heritage-mutation'].forEach(id=>$(id).addEventListener(
    id==='crystal-heritage'?'change':'input',readCrystalHeritage));

const morphologyControls={
  feed:{id:'morph-feed',format:n=>n.toFixed(4),read:n=>n},
  kill:{id:'morph-kill',format:n=>n.toFixed(4),read:n=>n},
  diffA:{id:'morph-diffA',format:n=>n.toFixed(3),read:n=>n},
  diffB:{id:'morph-diffB',format:n=>n.toFixed(3),read:n=>n},
  iterations:{id:'morph-iterations',format:n=>String(n),read:n=>n},
  iso:{id:'morph-iso',format:n=>n.toFixed(2),read:n=>n},
  chemotaxis:{id:'morph-chemotaxis',format:n=>Math.round(n)+'%',read:n=>n/100},
  fiberCatalysis:{id:'morph-fiberCatalysis',format:n=>Math.round(n)+'%',read:n=>n/100},
  crystalSink:{id:'morph-crystalSink',format:n=>Math.round(n)+'%',read:n=>n/100}
};
function updateMorphControls(){
  const c=engine.morphogenesis.settings;
  for(const [key,opt] of Object.entries(morphologyControls)){
    const number=['chemotaxis','fiberCatalysis','crystalSink'].includes(key)?c[key]*100:c[key];
    $(opt.id).value=String(number);
    $(opt.id+'-value').textContent=opt.format(number);
  }
  $('morph-toggle').textContent=c.enabled?'Ⅱ PAUSE CHEMISTRY':'✳ START / RESUME CHEMISTRY';
  $('morph-toggle').setAttribute('aria-pressed',String(c.enabled));
}
function readMorphControls(){
  const settings={};
  for(const [key,opt] of Object.entries(morphologyControls)){
    const number=Number($(opt.id).value);
    settings[key]=opt.read(number);
    $(opt.id+'-value').textContent=opt.format(number);
  }
  engine.morphogenesis.setSettings(settings);
  updateMorphControls();
}
Object.values(morphologyControls).forEach(opt=>$(opt.id).addEventListener('input',readMorphControls));
const chemistryProfiles={reef:[.0367,.0649],labyrinth:[.029,.057],spots:[.038,.062]};
$('morph-profile').addEventListener('change',()=>{
  const [feed,kill]=chemistryProfiles[$('morph-profile').value];
  engine.morphogenesis.setSettings({feed,kill});
  updateMorphControls();
});
$('morph-toggle').addEventListener('click',()=>{
  const field=engine.morphogenesis;
  const enabled=!field.settings.enabled;
  if(enabled && !field.v.some(v=>v>.06))engine.seedChemical(new THREE.Vector3(),.72);
  field.setSettings({enabled});
  updateMorphControls();
  refreshMorphSurface(performance.now(),true);
});
$('morph-paint').addEventListener('click',()=>setTool('chemical'));
$('morph-show').addEventListener('click',()=>{
  showMorph=!showMorph;
  morphMesh.visible=showMorph&&morphTriangles>0;
  $('morph-show').textContent=showMorph?'◉ HIDE SURFACE':'◇ SHOW SURFACE';
  $('morph-show').setAttribute('aria-pressed',String(showMorph));
});
$('morph-mesh').addEventListener('change',()=>refreshMorphSurface(performance.now(),true));
$('morph-clear').addEventListener('click',()=>{
  if(!window.confirm('Clear ONLY the chemical concentrations? Fibers and crystals remain intact.'))return;
  engine.clearChemical();
  refreshMorphSurface(performance.now(),true);
});

function updateStructuralControls(){
  const c=engine.config;
  $('structure-mode').value=c.contactMode;
  $('structure-branching').value=Math.round(c.contactBranching*100);
  $('structure-branching-value').textContent=Math.round(c.contactBranching*100)+'%';
  $('structure-permeability').value=Math.round(c.wallPermeability*100);
  $('structure-permeability-value').textContent=Math.round(c.wallPermeability*100)+'%';
  $('structure-membrane').value=Math.round(c.membraneTrace*100);
  $('structure-membrane-value').textContent=Math.round(c.membraneTrace*100)+'%';
}
function readStructuralControls(){
  engine.setConfig({
    contactMode:$('structure-mode').value,
    contactBranching:Number($('structure-branching').value)/100,
    wallPermeability:Number($('structure-permeability').value)/100,
    membraneTrace:Number($('structure-membrane').value)/100
  });
  updateStructuralControls();
}
['structure-mode','structure-branching','structure-permeability','structure-membrane']
  .forEach(id=>$(id).addEventListener('input',readStructuralControls));

function applyArtistFinish(){
  const finish=FINISHES[engine.config.finish]||FINISHES.opal;
  for(const material of [morphMaterial,crystalMaterial]){
    material.metalness=finish.metalness;
    material.roughness=finish.roughness;
    material.clearcoat=finish.clearcoat;
    material.clearcoatRoughness=Math.max(.06,finish.roughness*.65);
    material.iridescence=finish.iridescence;
    material.needsUpdate=true;
  }
  const lens=CRYSTAL_LENSES[engine.config.crystalLens]||CRYSTAL_LENSES.inherit;
  if(lens.roughness!==null){
    crystalMaterial.roughness=lens.roughness;
    crystalMaterial.metalness=lens.metalness;
    crystalMaterial.clearcoat=lens.clearcoat;
    crystalMaterial.iridescence=lens.iridescence;
    crystalMaterial.clearcoatRoughness=Math.max(.06,lens.roughness*.56);
  }
  // The single capped facet-jewel mesh shares the chosen mineral finish.
  facetMaterial.roughness=Math.max(.06,crystalMaterial.roughness*.70);
  facetMaterial.metalness=Math.max(.18,crystalMaterial.metalness);
  facetMaterial.clearcoat=Math.max(.40,crystalMaterial.clearcoat);
  facetMaterial.iridescence=Math.max(.30,crystalMaterial.iridescence);
  crystalMaterial.needsUpdate=true;
  facetMaterial.needsUpdate=true;
  syncCrystalAgeMaterials();
  const style=INTERIOR_STYLES[engine.config.crystalInterior]||
    INTERIOR_STYLES.off;
  mineralSkinMaterial.roughness=style.roughness;
  mineralSkinMaterial.metalness=style.metalness;
  mineralSkinMaterial.iridescence=style.iridescence;
  mineralSkinMaterial.clearcoat=style.clearcoat;
  mineralSkinMaterial.clearcoatRoughness=Math.max(.06,style.roughness*.54);
  mineralSkinMaterial.opacity=style.skinOpacity*
    (.40+.60*engine.config.crystalSkin);
  mineralSeedMaterial.roughness=Math.max(.07,style.roughness*.62);
  mineralSeedMaterial.metalness=Math.min(.72,.16+style.metalness*.4);
  mineralSeedMaterial.iridescence=Math.max(.10,style.iridescence);
  mineralSeedMaterial.clearcoat=style.clearcoat;
  mineralSkinMaterial.needsUpdate=true;
  mineralSeedMaterial.needsUpdate=true;
  const profile=FIBER_PROFILES[engine.config.fiberProfile]||FIBER_PROFILES.legacy;
  const geometry=fiberGeometryProfiles[engine.config.fiberProfile]||fiberGeometryProfiles.legacy;
  if(fibers.geometry!==geometry)fibers.geometry=geometry;
  fiberMaterial.metalness=Math.min(.73,finish.metalness*.54+profile.metalness*.46);
  fiberMaterial.roughness=Math.max(.08,Math.min(.75,finish.roughness*.56+profile.roughness*.44));
  fiberMaterial.clearcoat=Math.min(1,finish.clearcoat*.55+profile.clearcoat*.45);
  fiberMaterial.clearcoatRoughness=Math.max(.06,fiberMaterial.roughness*.63);
  fiberMaterial.iridescence=finish.iridescence*.52+profile.iridescence*.48;
  fiberMaterial.needsUpdate=true;
  halos.material.opacity=.07+.75*engine.config.glow;
  tipShader.uniforms.pointScale.value=(window.devicePixelRatio>1?8:6)+10*engine.config.glow;
}
function updateArtistControls(){
  const c=engine.config;
  $('form').value=c.form;
  $('formStrength').value=Math.round(c.formStrength*100);
  $('formStrength-value').textContent=Math.round(c.formStrength*100)+'%';
  $('formTwist').value=Math.round(c.formTwist*100);
  $('formTwist-value').textContent=Math.round(c.formTwist*100)+'%';
  $('lineageColor').value=Math.round(c.lineageColor*100);
  $('lineageColor-value').textContent=Math.round(c.lineageColor*100)+'%';
  $('filigreeContrast').value=Math.round(c.filigreeContrast*100);
  $('filigreeContrast-value').textContent=Math.round(c.filigreeContrast*100)+'%';
  $('finish').value=c.finish;
  $('glow').value=Math.round(c.glow*100);
  $('glow-value').textContent=Math.round(c.glow*100)+'%';
  $('fiberProfile').value=c.fiberProfile;
  $('mineralStrength').value=Math.round(c.mineralStrength*100);
  $('mineralStrength-value').textContent=Math.round(c.mineralStrength*100)+'%';
  $('mineralHalfLife').value=Math.round(c.mineralHalfLife);
  $('mineralHalfLife-value').textContent=Math.round(c.mineralHalfLife)+' s';
}
function readArtistControls(){
  const previousRelief=engine.config.filigreeContrast;
  const previousStrength=engine.config.mineralStrength;
  const previousHalfLife=engine.config.mineralHalfLife;
  engine.setConfig({
    form:$('form').value,formStrength:Number($('formStrength').value)/100,
    formTwist:Number($('formTwist').value)/100,
    lineageColor:Number($('lineageColor').value)/100,
    filigreeContrast:Number($('filigreeContrast').value)/100,finish:$('finish').value,
    glow:Number($('glow').value)/100,
    fiberProfile:$('fiberProfile').value,
    mineralStrength:Number($('mineralStrength').value)/100,
    mineralHalfLife:Number($('mineralHalfLife').value)
  });
  updateArtistControls();
  updateBranchControls();
  applyArtistFinish();
  if(previousRelief!==engine.config.filigreeContrast||
    previousStrength!==engine.config.mineralStrength||
    previousHalfLife!==engine.config.mineralHalfLife)requestFiligreeRefresh();
}
['form','formStrength','formTwist','lineageColor','filigreeContrast','finish','glow',
 'fiberProfile','mineralStrength','mineralHalfLife'].forEach(
  id=>$(id).addEventListener('input',readArtistControls)
);

// Explicit camera framing is a view operation, never a simulation reset.
function frameArtwork(){
  const bounds=new THREE.Box3();
  const point=new THREE.Vector3();
  for(let i=0;i<engine.segmentCount;i++){
    const k=i*6;
    for(let endpoint=0;endpoint<2;endpoint++){
      const j=k+endpoint*3;
      point.set(engine.segments[j],engine.segments[j+1],engine.segments[j+2]);
      bounds.expandByPoint(point);
    }
  }
  const colony=engine.colony;
  for(let i=0;i<colony.capacity;i++){
    if(!colony.cells[i])continue;
    const [x,y,z]=colony.decode(i);
    const pos=colony.worldPos(x,y,z);
    bounds.expandByPoint(point.set(pos.x,pos.y,pos.z));
  }
  if(morphTriangles>0 && morphMesh.geometry.attributes.position){
    bounds.union(new THREE.Box3().setFromBufferAttribute(morphMesh.geometry.attributes.position));
  }
  // Frame persistent crystal-pressure handles as well as grown matter.
  for(const mark of engine.pressures){
    const c=new THREE.Vector3(...mark.center);
    bounds.expandByPoint(c.clone().addScalar(mark.radius));
    bounds.expandByPoint(c.addScalar(-mark.radius));
  }
  if(bounds.isEmpty()){
    orbit.target.set(0,0,0);
    camera.position.set(6.5,4.7,10.5);
    orbit.update();
    return;
  }
  const center=bounds.getCenter(new THREE.Vector3());
  const radius=Math.max(.7,bounds.getSize(new THREE.Vector3()).length()*.5);
  const fovRadians=THREE.MathUtils.degToRad(camera.fov);
  const distance=Math.max(3,radius/Math.sin(fovRadians*.5)*1.22);
  const direction=camera.position.clone().sub(orbit.target).normalize();
  orbit.target.copy(center);
  camera.position.copy(center).addScaledVector(direction,Math.min(orbit.maxDistance,distance));
  orbit.update();
}
$('frame-art').addEventListener('click',frameArtwork);
$('compose-frame').addEventListener('click',frameArtwork);

function updateBranchControls(){
  const c=engine.config;
  $('branchMode').value=c.branchMode;
  $('branchOrdering').value=c.branchOrdering;
  $('branchPersistence').value=String(Math.round(c.branchPersistence*100));
  $('branchPersistence-value').textContent=Math.round(c.branchPersistence*100)+'%';
  $('branchAngle').value=String(Math.round(c.branchAngle));
  $('branchAngle-value').textContent=Math.round(c.branchAngle)+'°';
  $('branchTaper').value=String(Math.round(c.branchTaper*100));
  $('branchTaper-value').textContent=Math.round(c.branchTaper*100)+'%';
  $('rhythmMode').value=c.rhythmMode;
  $('rhythmDepth').value=String(Math.round(c.rhythmDepth*100));
  $('rhythmDepth-value').textContent=Math.round(c.rhythmDepth*100)+'%';
  $('rhythmRate').value=String(c.rhythmRate);
  $('rhythmRate-value').textContent=c.rhythmRate.toFixed(2)+' Hz';
}
function readBranchControls(){
  engine.setConfig({
    branchMode:$('branchMode').value,
    branchOrdering:$('branchOrdering').value,
    branchPersistence:Number($('branchPersistence').value)/100,
    branchAngle:Number($('branchAngle').value),
    branchTaper:Number($('branchTaper').value)/100,
    rhythmMode:$('rhythmMode').value,
    rhythmDepth:Number($('rhythmDepth').value)/100,
    rhythmRate:Number($('rhythmRate').value)
  });
  updateBranchControls();
}
['branchMode','branchOrdering','branchPersistence','branchAngle','branchTaper','rhythmMode','rhythmDepth','rhythmRate']
  .forEach(id=>$(id).addEventListener('input',readBranchControls));

// Searchable, source-credited MATHEMAGICAL palette catalog. Every stop is
// kept as the exact hex source color; edits live only in this artwork's DNA.
function renderPaletteOptions(query=''){
  const selected=engine.config.palette;
  const results=filteredPalettes(query);
  const entries=results.some(p=>p.id===selected)
    ?results:[PALETTE_CATALOG.find(p=>p.id===selected),...results].filter(Boolean);
  const fragment=document.createDocumentFragment();
  for(const p of entries){
    const option=document.createElement('option');
    option.value=p.id;
    option.textContent=p.name+' · '+p.source;
    fragment.appendChild(option);
  }
  $('palette').replaceChildren(fragment);
  $('palette').value=selected;
  $('palette-count').textContent=results.length+' / '+PALETTE_CATALOG.length+
    ' PALETTES MATCH · '+(PALETTE_NAMES[selected]||selected)+
    ' · '+engine.currentPalette().length+' ORIGINAL COLOR POSITIONS';
}
function randomHex(){
  return '#'+Math.floor(Math.random()*16777216).toString(16).padStart(6,'0');
}
function applyPaletteStops(stops){
  engine.setConfig({paletteStops:[...stops]});
  renderPaletteStops();
}
function renderPaletteStops(){
  const container=$('palette-stops'),colors=engine.currentPalette();
  const fragment=document.createDocumentFragment();
  for(let index=0;index<colors.length;index++){
    const box=document.createElement('div');
    box.className='palette-swatch';
    const color=document.createElement('input');
    color.type='color';color.value=colors[index];
    color.title='Edit color stop '+(index+1);
    color.setAttribute('aria-label','Edit color stop '+(index+1));
    color.addEventListener('input',()=>{
      const next=[...engine.currentPalette()];
      next[index]=color.value;
      engine.setConfig({paletteStops:next});
      // Do not destroy/recreate the native iPhone color picker while open.
    });
    color.addEventListener('change',renderPaletteStops);
    const shuffle=document.createElement('button');
    shuffle.type='button';shuffle.textContent='⚄ '+(index+1);
    shuffle.title='Randomize only color stop '+(index+1);
    shuffle.setAttribute('aria-label',shuffle.title);
    shuffle.addEventListener('click',()=>{
      const next=[...engine.currentPalette()];
      next[index]=randomHex();
      applyPaletteStops(next);
    });
    box.append(color,shuffle);fragment.append(box);
  }
  container.replaceChildren(fragment);
  $('palette-count').textContent=PALETTE_CATALOG.length+
    ' PALETTES · '+(PALETTE_NAMES[engine.config.palette]||engine.config.palette)+
    ' · '+colors.length+' EDITABLE COLOR STOPS';
}
function choosePalette(id){
  if(!PALETTES[id])return;
  engine.setConfig({palette:id,paletteStops:null});
  $('palette-search').value='';
  renderPaletteOptions();
  renderPaletteStops();
}
$('palette-search').addEventListener('input',()=>{
  renderPaletteOptions($('palette-search').value);
});
$('palette-shuffle').addEventListener('click',()=>{
  const stops=[...engine.currentPalette()];
  for(let i=stops.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [stops[i],stops[j]]=[stops[j],stops[i]];
  }
  applyPaletteStops(stops);
});
$('palette-rgb').addEventListener('click',()=>{
  applyPaletteStops(engine.currentPalette().map(()=>randomHex()));
});
$('palette-restore').addEventListener('click',()=>{
  engine.setConfig({paletteStops:null});
  renderPaletteStops();
});

const ranges={
  speed:{format:n=>n.toFixed(1)+'×',read:n=>n},
  agents:{format:n=>String(n),read:n=>n},
  branching:{format:n=>Math.round(n)+'%',read:n=>n/100},
  feedback:{format:n=>Math.round(n)+'%',read:n=>n/100},
  thickness:{format:n=>(n/100).toFixed(3),read:n=>n/100},
  force:{format:n=>n.toFixed(1)+'×',read:n=>n},
  frequency:{format:n=>n.toFixed(1),read:n=>n},
  evolution:{format:n=>n.toFixed(1),read:n=>n},
  nutrientDrive:{format:n=>n.toFixed(1)+'×',read:n=>n},
  diffusion:{format:n=>Math.round(n)+'%',read:n=>n/100},
  supply:{format:n=>Math.round(n)+'%',read:n=>n/100}
};
function readControls(){
  const config={};
  for(const [key,opt] of Object.entries(ranges)){
    const n=Number($(key).value);
    config[key]=opt.read(n);
    $(key+'-value').textContent=opt.format(n);
  }
  config.palette=$('palette').value;
  config.topology=$('topology').value;
  engine.setConfig(config);
}
function updateControlsFromDNA(){
  for(const [key,opt] of Object.entries(ranges)){
    const number=['branching','feedback','thickness','diffusion','supply'].includes(key)?engine.config[key]*100:engine.config[key];
    $(key).value=String(number);
    $(key+'-value').textContent=opt.format(number);
  }
  $('palette-search').value='';
  renderPaletteOptions();
  renderPaletteStops();
  $('topology').value=engine.config.topology;
  updateCrystalControls();
  // Restore the actual mesh on LOAD WORLD / LOAD DNA, not just the dropdown.
  const selectedShape=crystalShapes[engine.config.crystalShape]||crystalShapes.octa;
  if(crystals.geometry!==selectedShape)crystals.geometry=selectedShape;
  if(mineralSkins.geometry!==selectedShape)mineralSkins.geometry=selectedShape;
  for(const tier of METAMORPHOSIS_STAGES){
    crystalAgeMeshes[tier].geometry=selectedShape;
  }
  engine.colony.changed=true;
  syncCrystals();
  updateMorphControls();
  updateStructuralControls();
  updateArtistControls();
  updateBranchControls();
  updateStrokeControls();
  syncStrokes();syncPressures();
  applyArtistFinish();
  requestFiligreeRefresh();
}
for(const key of Object.keys(ranges))$(key).addEventListener('input',readControls);
$('palette').addEventListener('change',()=>{
  choosePalette($('palette').value);
  readControls();
});
$('topology').addEventListener('change',readControls);
$('palette-roll').addEventListener('click',()=>{
  const other=PALETTE_CATALOG.filter(p=>p.id!==engine.config.palette);
  choosePalette(other[Math.floor(Math.random()*other.length)].id);
  readControls();
});
$('background').addEventListener('change',()=>{scene.background.set(BACKGROUNDS[$('background').value]);});
$('camera-reset').addEventListener('click',()=>{
  camera.position.set(6.5,4.7,10.5);orbit.target.set(0,0,0);orbit.update();
});
function setPaused(next){
  if(graphicsLost&&!next)return;
  paused=next;
  $('pause').textContent=paused?'▶ RESUME':'Ⅱ PAUSE';
  $('pause').setAttribute('aria-pressed',String(paused));
  $('live').textContent=paused?'FROZEN IN TIME':'LIVE GROWTH';
}
$('pause').addEventListener('click',()=>setPaused(!paused));
$('new').addEventListener('click',()=>{
  if(!window.confirm('Erase this living organism and start a NEW universe? This cannot be undone.'))return;
  engine.reset((Date.now()^Math.floor(Math.random()*0xffffffff))>>>0);
  if(engine.colony.settings.enabled)engine.seedCrystal(new THREE.Vector3());
  if(engine.morphogenesis.settings.enabled)engine.seedChemical(new THREE.Vector3(),.72);
  syncNodes();syncStrokes();syncPressures();syncCrystals();refreshMorphSurface(performance.now(),true);setPaused(false);
});
$('dna-save').addEventListener('click',async()=>{
  const text=JSON.stringify(engine.getDNA(),null,2);
  try{await navigator.clipboard.writeText(text);$('dna-save').textContent='COPIED ✓';}
  catch{window.prompt('Copy your construction DNA:',text);}
  window.setTimeout(()=>{$('dna-save').textContent='COPY DNA';},1300);
});
$('dna-load').addEventListener('click',()=>{
  const input=window.prompt('Paste Nerve Cathedral DNA. Existing growth will NOT be erased.');
  if(!input)return;
  try{engine.loadDNA(JSON.parse(input));updateControlsFromDNA();}
  catch(err){window.alert('DNA could not be read: '+err.message);}
});
$('checkpoint-save').addEventListener('click',()=>{
  const button=$('checkpoint-save');
  button.disabled=true;
  try{
    const snapshot=engine.getCheckpoint();
    const blob=new Blob([JSON.stringify(snapshot)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download='ex-nihilo-world-'+new Date().toISOString().replaceAll(':','-')+'.exnihilo';
    link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),2000);
    button.textContent='WORLD SAVED ✓';
    window.setTimeout(()=>{button.textContent='↓ SAVE WORLD';},1700);
  }catch(error){window.alert('World save failed: '+error.message);}
  finally{button.disabled=false;}
});
$('checkpoint-load').addEventListener('click',()=>$('checkpoint-file').click());
$('checkpoint-file').addEventListener('change',async(e)=>{
  const file=e.target.files?.[0];
  e.target.value='';
  if(!file)return;
  if(file.size>32*1024*1024){window.alert('Checkpoint exceeds the 32 MB safety limit.');return;}
  try{
    const text=await file.text();
    const snapshot=JSON.parse(text);
    if(!window.confirm('LOAD WORLD will replace the current living organism with the saved one. Save the current world first if you want to keep it. Continue?'))return;
    // Invalid data is rejected *before* resetting the current creature.
    engine.restoreCheckpoint(snapshot);
    updateControlsFromDNA();
    syncNodes();
    setPaused(true);
    if(showFood)updateFoodCloud();
    window.alert('Living world restored, PAUSED. Press RESUME to keep growing.');
  }catch(error){window.alert('Could not load world: '+error.message);}
});
$('png').addEventListener('click',()=>{
  renderer.render(scene,camera);
  const link=document.createElement('a');
  link.download='ex-nihilo-nerve-cathedral-'+Date.now()+'.png';
  link.href=renderer.domElement.toDataURL('image/png');
  link.click();
});

$('analyze').addEventListener('click',async()=>{
  const output=$('wolfram-result');
  const accessToken=$('wolfram-token').value.trim();
  if(!accessToken){
    output.textContent='Enter your separate EX NIHILO access token (NOT your Wolfram AppID). Configure this as WOLFRAM_ACCESS_TOKEN on the server first.';
    return;
  }
  const target=$('analysis-point').value;
  const at=target==='tip'&&engine.agents[0]?engine.agents[0].p.clone()
    :target==='node'&&engine.nodes.length?engine.nodes[engine.nodes.length-1].pos.clone()
    :new THREE.Vector3();
  const matrix=engine.localJacobian(at);
  output.textContent='Local field Jacobian:\n'+matrix.map(row=>'[ '+row.join(', ')+' ]').join('\n')+'\n\nAsking Wolfram...';
  $('analyze').disabled=true;
  try{
    const res=await fetch('/.netlify/functions/wolfram',{
      method:'POST',headers:{'Content-Type':'application/json','X-EX-NIHILO-ACCESS':accessToken},
      body:JSON.stringify({matrix})
    });
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Request failed');
    output.textContent='JACOBIAN (numerical approximation)\n'+matrix.map(row=>'[ '+row.join(', ')+' ]').join('\n')
      +'\n\nWOLFRAM INTERPRETATION\n'+data.interpretation
      +'\n\nRESULTS\n'+data.results.map(item=>item.title+': '+item.text).join('\n\n')
      +'\n\nThe Wolfram calculation is advisory: no simulation law was automatically changed.';
  }catch(err){output.textContent='Wolfram unavailable: '+err.message+'\n\nThe organism continues growing independently.';}
  finally{$('analyze').disabled=false;}
});
function updateTips(){
  const palette=engine.currentPalette();
  const n=Math.min(engine.agents.length,maxTips);
  for(let i=0;i<n;i++){
    const a=engine.agents[i];
    const color=new THREE.Color(palette[Math.floor(a.identity*palette.length)%palette.length]);
    tipPositions.set([a.p.x,a.p.y,a.p.z],i*3);
    tipColors.set([color.r,color.g,color.b],i*3);
  }
  tipGeometry.setDrawRange(0,n);
  tipGeometry.attributes.position.needsUpdate=true;
  tipGeometry.attributes.color.needsUpdate=true;
}
function fit(){
  const rect=canvas.getBoundingClientRect();
  const w=Math.max(1,rect.width),h=Math.max(1,rect.height);
  camera.aspect=w/h;camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
}
function handleStageResize(){
  // Active inverse-projected world coordinates become invalid on resize.
  // Cancel the draft instead of abruptly teleporting a source.
  if(fingers.size||sliderEdit||pressureSliderEdit)cancelGesture();
  fit();
}
new ResizeObserver(handleStageResize).observe(canvas);
window.addEventListener('resize',handleStageResize);
renderPaletteOptions();
renderPaletteStops();
updateStrokeControls();syncStrokes();syncPressures();
fit();readControls();updateCrystalControls();updateMorphControls();updateStructuralControls();updateArtistControls();updateBranchControls();applyArtistFinish();
if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)setPaused(true);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    cancelGesture();
    fingers.clear();
    gestureMode='idle';
    gestureSuspended=false;
    setPaused(true);
  }
});
let last=performance.now(),accumulator=0,lastStatus=0;
const performanceMeter={
  enabled:false,lastSample:last,frames:0,
  latest:'Performance monitor is off.'
};
$('performance-toggle').addEventListener('click',()=>{
  performanceMeter.enabled=!performanceMeter.enabled;
  performanceMeter.frames=0;
  performanceMeter.lastSample=performance.now();
  $('performance-toggle').setAttribute('aria-pressed',String(performanceMeter.enabled));
  $('performance-toggle').textContent=performanceMeter.enabled?
    'HIDE PERFORMANCE':'SHOW PERFORMANCE';
  $('performance-copy').disabled=true;
  $('performance-copy').textContent='COPY REPORT';
  $('performance-report').textContent=performanceMeter.enabled?
    'Sampling real device frames…':'Performance monitor is off. Artwork remains fully interactive.';
});
$('performance-copy').addEventListener('click',async()=>{
  try{
    await navigator.clipboard.writeText(performanceMeter.latest);
    $('performance-copy').textContent='COPIED ✓';
  }catch{
    $('performance-copy').textContent='SELECT REPORT TO COPY';
    $('performance-report').setAttribute('tabindex','0');
    $('performance-report').focus();
  }
});
function samplePerformance(now){
  if(!performanceMeter.enabled)return;
  performanceMeter.frames++;
  const duration=now-performanceMeter.lastSample;
  if(duration<1250)return;
  const fps=performanceMeter.frames*1000/Math.max(1,duration);
  performanceMeter.lastSample=now;
  performanceMeter.frames=0;
  const info=renderer.info;
  const box=renderer.domElement;
  performanceMeter.latest=[
    'EX NIHILO · LOCAL DEVICE PERFORMANCE',
    'FPS: '+fps.toFixed(1)+' (last '+(duration/1000).toFixed(2)+' s)',
    'Canvas: '+box.width+' × '+box.height+' px',
    'Pixel ratio: '+renderer.getPixelRatio().toFixed(2),
    'Draw calls: '+info.render.calls,
    'Triangles: '+info.render.triangles.toLocaleString(),
    'GPU geometries: '+info.memory.geometries,
    'GPU textures: '+info.memory.textures,
    'Fibers: '+engine.segmentCount.toLocaleString(),
    'Crystal cells: '+engine.colony.population.toLocaleString(),
    'Visible facets: '+facetGems.count.toLocaleString(),
    'Hereditary bands: '+bloodlineBands.count.toLocaleString(),
    'Crystal families: '+new Set(Array.from(engine.colony.families)
      .filter((f,i)=>f&&engine.colony.cells[i])).size.toLocaleString(),
    'Young glass: '+crystalAgeCounts.young.toLocaleString(),
    'Mature opal: '+crystalAgeCounts.mature.toLocaleString(),
    'Faulted mineral: '+crystalAgeCounts.fault.toLocaleString(),
    'Mineral skins: '+mineralSkins.count.toLocaleString(),
    'Trapped inclusions: '+mineralSeeds.count.toLocaleString(),
    'Fracture scars: '+engine.colony.damage.reduce((n,v)=>n+(v===2),0),
    'World state: '+(paused?'PAUSED':'GROWING'),
    'Version: 03K · iPhone Stage Reliability'
  ].join('\n');
  $('performance-report').textContent=performanceMeter.latest;
  $('performance-copy').disabled=false;
}
function frame(now){
  requestAnimationFrame(frame);
  if(graphicsLost)return;
  let elapsed=Math.min((now-last)/1000,.1);last=now;
  if(!paused&&!gestureSuspended&&!sliderEdit&&!pressureSliderEdit){
    accumulator+=elapsed;
    const fixed=1/60;
    let steps=0;
    while(accumulator>=fixed&&steps<5){engine.step(fixed);accumulator-=fixed;steps++;}
    if(steps===5)accumulator=0;
  }else accumulator=0;
  // Evolving age optics are updated every few simulated seconds and processed
  // in capped chunks so camera interaction stays responsive.
  if(engine.config.mineralStrength>0 && engine.segmentCount>0 &&
    engine.time-lastMineralRefresh>=4){
    requestFiligreeRefresh();
    lastMineralRefresh=engine.time;
  }
  updateFiligreeDisplay();
  if(geometryDirty){
    fibers.instanceMatrix.needsUpdate=true;
    if(fibers.instanceColor)fibers.instanceColor.needsUpdate=true;
    haloPositionAttribute.needsUpdate=true;
    haloColorAttribute.needsUpdate=true;
    geometryDirty=false;
  }
  updateTips();
  syncCrystals();
  refreshMorphSurface(now);
  if(showFood&&now-lastFoodRefresh>700){updateFoodCloud();lastFoodRefresh=now;}
  orbit.update();
  // Handles always face the current camera; the field itself never rotates
  // when a ring follows the viewpoint.
  for(const node of nodeViews.values()){
    const ring=node.children.find(child=>child.userData.reachRing);
    if(ring)ring.quaternion.copy(camera.quaternion);
  }
  for(const item of pressureViews.values()){
    item.ring.quaternion.copy(camera.quaternion);
  }
  try{
    renderer.render(scene,camera);
    samplePerformance(now);
  }catch(error){
    graphicsLost=true;
    setPaused(true);
    window.__genesisDiagnostics?.report('WebGL render error: '+
      (error?.message||String(error)));
    return;
  }
  if(now-lastStatus>600){
    $('stats').textContent=engine.segmentCount.toLocaleString()+' STRANDS / '+engine.agents.length+' TIPS / '+engine.colony.population.toLocaleString()+' CELLS';
    $('crystal-stats').textContent=engine.colony.population.toLocaleString()+' CRYSTALS · '+engine.colony.generation+' GENERATIONS · '+engine.contactEvents.toLocaleString()+' FIBER CONTACTS';
    $('branch-stats').textContent=engine.branchEvents.toLocaleString()+' BRANCH BIRTHS';
    $('morph-stats').textContent=engine.morphogenesis.generation.toLocaleString()+' CHEMICAL STEPS · '+morphTriangles.toLocaleString()+' SURFACE TRIANGLES'
      +(morphClipped?' · MESH BUDGET CAPPED':'');
    lastStatus=now;
  }
}
requestAnimationFrame(frame);
