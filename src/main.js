import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GrowthEngine, PALETTES } from './engine.js';
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
const crystalMaterial=new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false});
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
    if(!mature)crystalColor.lerp(new THREE.Color('#ffffff'),.17);
    crystals.setColorAt(visible,crystalColor);
    visible++;
    if(visible>=colony.maxCells)break;
  }
  crystals.count=visible;
  crystals.instanceMatrix.needsUpdate=true;
  if(crystals.instanceColor)crystals.instanceColor.needsUpdate=true;
  colony.changed=false;
}

const fiberGeometry = new THREE.CylinderGeometry(1,1,1,5,1,true);
const fiberMaterial = new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide,toneMapped:false});
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
engine.onReset=()=>{
  fibers.count=0;
  haloGeometry.setDrawRange(0,0);
  geometryDirty=true;
};
engine.onDeposit=(slot,a,b,color,radius)=>{
  delta.subVectors(b,a);
  const length=delta.length();
  if(length<.00001)return;
  mid.copy(a).add(b).multiplyScalar(.5);
  quaternion.setFromUnitVectors(yAxis,delta.multiplyScalar(1/length));
  scale.set(radius,length,radius);
  transform.compose(mid,quaternion,scale);
  fibers.setMatrixAt(slot,transform);
  fibers.setColorAt(slot,color);
  const k=slot*6;
  haloPositions.set([a.x,a.y,a.z,b.x,b.y,b.z],k);
  haloColors.set([color.r*1.65,color.g*1.65,color.b*1.65,
                  color.r*1.65,color.g*1.65,color.b*1.65],k);
  fibers.count=engine.segmentCount===engine.maxSegments?engine.maxSegments:Math.max(fibers.count,slot+1);
  haloGeometry.setDrawRange(0,Math.max(haloGeometry.drawRange.count,(slot+1)*2));
  geometryDirty=true;
};
const nodeSphere=new THREE.IcosahedronGeometry(.12,1);
const nodeMaterials={
  attract:new THREE.MeshBasicMaterial({color:'#80ffe4'}),
  repel:new THREE.MeshBasicMaterial({color:'#ff7a69'})
};
const nodeViews=new Map();
function syncNodes(){
  const existing=new Set();
  engine.nodes.forEach(node=>{
    existing.add(node.id);
    let mesh=nodeViews.get(node.id);
    if(!mesh){
      mesh=new THREE.Mesh(nodeSphere,nodeMaterials[node.type]);
      mesh.userData.id=node.id;
      scene.add(mesh);nodeViews.set(node.id,mesh);
    }
    mesh.material=nodeMaterials[node.type];
    mesh.position.copy(node.pos);
  });
  for(const [id,mesh] of nodeViews){
    if(!existing.has(id)){scene.remove(mesh);nodeViews.delete(id);}
  }
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

let tool='attract',draggedNode=null,activePointer=null,paused=false;
const hints={
  attract:'DRAG TO CREATE OR MOVE AN ATTRACTOR',
  repel:'DRAG TO CREATE OR MOVE A REPULSOR',
  seed:'TOUCH TO GERMINATE MORE STRANDS',
  crystal:'TOUCH TO SEED THREE-DIMENSIONAL CELLS',
  feed:'DRAG TO INJECT NUTRIENTS INTO 3D SPACE',
  orbit:'DRAG TO ORBIT · PINCH TO ZOOM',
  erase:'TAP A FIELD NODE TO ERASE IT'
};
function setTool(next){
  tool=next;
  orbit.enabled=tool==='orbit';
  $('hint').textContent=hints[tool];
  for(const btn of document.querySelectorAll('[data-tool]'))btn.classList.toggle('active',btn.dataset.tool===tool);
}
document.querySelectorAll('[data-tool]').forEach(btn=>btn.addEventListener('click',()=>setTool(btn.dataset.tool)));
$('food-tool').addEventListener('click',()=>setTool('feed'));
$('food-view').addEventListener('click',()=>{
  showFood=!showFood;
  foodCloud.visible=showFood;
  $('food-view').classList.toggle('active',showFood);
  $('food-view').setAttribute('aria-pressed',String(showFood));
  $('food-view').textContent=showFood?'◈ HIDE NUTRIENT VOLUME':'◇ SHOW NUTRIENT VOLUME';
  if(showFood)updateFoodCloud();
});
canvas.addEventListener('pointerdown',e=>{
  if(tool==='orbit'||(activePointer!==null))return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  activePointer=e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  const pos=positionFromEvent(e);
  if(tool==='feed'){engine.feedAt(pos);if(showFood)updateFoodCloud();return;}
  if(tool==='crystal'){engine.seedCrystal(pos);syncCrystals();return;}
  if(tool==='seed'){
    const count=18;
    if(engine.agents.length>engine.config.agents-count) engine.agents.splice(0,Math.min(count,engine.agents.length));
    engine.seedAt(pos,count);
    return;
  }
  if(tool==='erase'){engine.deleteNode(pos);syncNodes();return;}
  draggedNode=engine.nearestNode(pos,.45);
  if(draggedNode){engine.recordNodeEdit();}
  else{draggedNode=engine.addNode(tool,pos);}
  draggedNode.pos.copy(pos);
  syncNodes();
});
canvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==activePointer)return;
  if(tool==='feed'){engine.feedAt(positionFromEvent(e));return;}
  if(!draggedNode)return;
  draggedNode.pos.copy(positionFromEvent(e));
  syncNodes();
});
function stopPointer(e){
  if(e.pointerId!==activePointer)return;
  activePointer=null;draggedNode=null;
}
canvas.addEventListener('pointerup',stopPointer);
canvas.addEventListener('pointercancel',stopPointer);
$('undo').addEventListener('click',()=>{engine.undoNodes();syncNodes();});
$('redo').addEventListener('click',()=>{engine.redoNodes();syncNodes();});
$('clear-nodes').addEventListener('click',()=>{engine.clearNodes();syncNodes();});

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
  syncNodes();setPaused(false);
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
new ResizeObserver(fit).observe(canvas);
window.addEventListener('resize',fit);
fit();readControls();updateCrystalControls();
let last=performance.now(),accumulator=0,lastStatus=0;
function frame(now){
  requestAnimationFrame(frame);
  let elapsed=Math.min((now-last)/1000,.1);last=now;
  if(!paused){
    accumulator+=elapsed;
    const fixed=1/60;
    let steps=0;
    while(accumulator>=fixed&&steps<5){engine.step(fixed);accumulator-=fixed;steps++;}
    if(steps===5)accumulator=0;
  }else accumulator=0;
  if(geometryDirty){
    fibers.instanceMatrix.needsUpdate=true;
    if(fibers.instanceColor)fibers.instanceColor.needsUpdate=true;
    haloPositionAttribute.needsUpdate=true;
    haloColorAttribute.needsUpdate=true;
    geometryDirty=false;
  }
  updateTips();
  syncCrystals();
  if(showFood&&now-lastFoodRefresh>700){updateFoodCloud();lastFoodRefresh=now;}
  orbit.update();
  renderer.render(scene,camera);
  if(now-lastStatus>600){
    $('stats').textContent=engine.segmentCount.toLocaleString()+' STRANDS / '+engine.agents.length+' TIPS / '+engine.colony.population.toLocaleString()+' CELLS';
    $('crystal-stats').textContent=engine.colony.population.toLocaleString()+' CRYSTALS · '+engine.colony.generation+' GENERATIONS';
    lastStatus=now;
  }
}
requestAnimationFrame(frame);
