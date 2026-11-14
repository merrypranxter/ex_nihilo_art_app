import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GrowthEngine, PALETTES } from './engine.js';
import { extractIsosurface } from './surface.js';
import { FINISHES } from './art-direction.js';
import { lineageLighting, lineageHaloScale } from './filigree.js';
import { FIBER_PROFILES, mineralOptics } from './mineral-optics.js';
import { FieldGestureTransaction } from './gesture-witch.js';
import './styles.css';

const $ = id => document.getElementById(id);
const canvas = $('world');
const scene = new THREE.Scene();
const BACKGROUNDS = {void:'#05060c',ink:'#070f22',plum:'#1a0b24',milk:'#d6d0df'};
scene.background = new THREE.Color(BACKGROUNDS.void);
const camera = new THREE.PerspectiveCamera(44,1,.05,90);
camera.position.set(6.5,4.7,10.5);
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
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
    palette:PALETTES[engine.config.palette]
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
  sphere:new THREE.IcosahedronGeometry(crystalCellSize*.62,1)
};
const crystalMaterial=new THREE.MeshPhysicalMaterial({
  color:'#ffffff',metalness:.12,roughness:.23,clearcoat:.92,
  clearcoatRoughness:.12,iridescence:.85,iridescenceIOR:1.32,
  iridescenceThicknessRange:[110,420]
});
const crystals=new THREE.InstancedMesh(crystalShapes.octa,crystalMaterial,engine.colony.maxCells);
crystals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
crystals.frustumCulled=false;
crystals.count=0;
scene.add(crystals);
const crystalTransform=new THREE.Matrix4();
const crystalPosition=new THREE.Vector3();
const crystalRotation=new THREE.Quaternion();
const crystalScale=new THREE.Vector3(1,1,1);
const crystalColor=new THREE.Color();
const crystalWhite=new THREE.Color('#ffffff');
function syncCrystals(){
  if(!engine.colony.changed)return;
  let visible=0;
  const colony=engine.colony;
  for(let i=0;i<colony.capacity;i++){
    if(!colony.cells[i])continue;
    const [x,y,z]=colony.decode(i);
    const point=colony.worldPos(x,y,z);
    crystalPosition.set(point.x,point.y,point.z);
    const mature=colony.cells[i]===2;
    const scale=mature?1:Math.max(.36,Math.min(1,(colony.ages[i]+1)/colony.settings.crystallization));
    crystalScale.setScalar(scale);
    crystalTransform.compose(crystalPosition,crystalRotation,crystalScale);
    crystals.setMatrixAt(visible,crystalTransform);
    const k=i*3;
    crystalColor.setRGB(colony.colors[k]/255,colony.colors[k+1]/255,colony.colors[k+2]/255);
    if(!mature)crystalColor.lerp(crystalWhite,.17);
    crystals.setColorAt(visible,crystalColor);
    visible++;
    if(visible>=colony.maxCells)break;
  }
  crystals.count=visible;
  crystals.instanceMatrix.needsUpdate=true;
  if(crystals.instanceColor)crystals.instanceColor.needsUpdate=true;
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

let tool='attract',paused=false,gestureSuspended=false;
const fingers=new Map();
const fieldEdit=new FieldGestureTransaction(engine);
let sliderEdit=null,gestureMode='idle',primaryPointer=null,lensAnchor=null;
let transientSnapshot=null;
const hints={
  sculpt:'DRAG A VORTEX EYE · PINCH RADIUS · TWIST CHIRALITY',
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
  gestureSuspended=fingers.size>0;
  refreshGestureView();
}
function cancelGesture(){
  if(gestureMode==='idle'&&!fieldEdit.active&&!sliderEdit)return;
  if(sliderEdit)cancelSliderEdit();
  finishGesture(true);
  gestureMode=fingers.size?'blocked':'idle';
}
function setTool(next){
  if(fingers.size||fieldEdit.active||sliderEdit)cancelGesture();
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
    primaryPointer=e.pointerId;
    const pos=positionFromEvent(e);
    if(['sculpt','attract','repel','erase'].includes(tool)){
      gestureMode=beginFieldPointer(pos)?'single':'blocked';
    }else{
      transientSnapshot=snapshotTransient(tool);
      gestureMode='transient';
      applyTransient(pos,true);
    }
  }else if(fingers.size===2){
    if(!fieldEdit.active){
      // A second finger cannot silently paint an extra chemical source.
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
  if(gestureMode==='single'&&e.pointerId===primaryPointer&&fieldEdit.active){
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
$('undo').addEventListener('click',()=>{
  if(fingers.size)cancelGesture();
  cancelSliderEdit();
  engine.undoNodes();
  refreshGestureView();
});
$('redo').addEventListener('click',()=>{
  if(fingers.size)cancelGesture();
  cancelSliderEdit();
  engine.redoNodes();
  refreshGestureView();
});
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
    cancelSliderEdit();
    return;
  }
  if(e.target instanceof HTMLElement&&
    e.target.matches('input,textarea,select,[contenteditable]'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){
    e.preventDefault();
    cancelGesture();
    if(e.shiftKey)engine.redoNodes();
    else engine.undoNodes();
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
}
function readCrystalControls(){
  engine.colony.setSettings({
    growth:Number($('colony-growth').value)/100,
    erosion:Number($('colony-erosion').value)/100,
    crystallization:Number($('colony-crystallization').value)
  });
  updateCrystalControls();
  updateMorphControls();
}
['colony-growth','colony-erosion','colony-crystallization'].forEach(id=>
  $(id).addEventListener('input',readCrystalControls));
$('colony-toggle').addEventListener('click',()=>{
  const enabled=!engine.colony.settings.enabled;
  engine.colony.setSettings({enabled});
  if(enabled&&engine.colony.population===0)engine.seedCrystal(new THREE.Vector3());
  updateCrystalControls();
  syncCrystals();
});
$('crystal-seed').addEventListener('click',()=>setTool('crystal'));
$('crystal-clear').addEventListener('click',()=>{
  if(!engine.colony.population)return;
  if(!window.confirm('Erase the crystal colony only? Your fiber structures and nutrient world will remain.'))return;
  engine.colony.clear();
  syncCrystals();
});
$('colony-geometry').addEventListener('change',()=>{
  crystals.geometry=crystalShapes[$('colony-geometry').value];
});

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
  $('palette').value=engine.config.palette;
  $('topology').value=engine.config.topology;
  updateCrystalControls();
  updateMorphControls();
  updateStructuralControls();
  updateArtistControls();
  updateBranchControls();
  applyArtistFinish();
  requestFiligreeRefresh();
}
for(const key of Object.keys(ranges))$(key).addEventListener('input',readControls);
$('palette').addEventListener('change',readControls);
$('topology').addEventListener('change',readControls);
$('palette-roll').addEventListener('click',()=>{
  const names=Object.keys(PALETTES);
  const other=names.filter(name=>name!==engine.config.palette);
  $('palette').value=other[Math.floor(Math.random()*other.length)];
  readControls();
});
$('background').addEventListener('change',()=>{scene.background.set(BACKGROUNDS[$('background').value]);});
$('camera-reset').addEventListener('click',()=>{
  camera.position.set(6.5,4.7,10.5);orbit.target.set(0,0,0);orbit.update();
});
function setPaused(next){
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
  syncNodes();syncCrystals();refreshMorphSurface(performance.now(),true);setPaused(false);
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
  const palette=PALETTES[engine.config.palette];
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
  if(fingers.size||sliderEdit)cancelGesture();
  fit();
}
new ResizeObserver(handleStageResize).observe(canvas);
window.addEventListener('resize',handleStageResize);
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
function frame(now){
  requestAnimationFrame(frame);
  let elapsed=Math.min((now-last)/1000,.1);last=now;
  if(!paused&&!gestureSuspended&&!sliderEdit){
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
  renderer.render(scene,camera);
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
