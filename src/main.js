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
canvas.addEventListener('pointerdown',e=>{
  if(tool==='orbit'||(activePointer!==null))return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  activePointer=e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  const pos=positionFromEvent(e);
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
  if(e.pointerId!==activePointer||!draggedNode)return;
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
const ranges={
  speed:{format:n=>n.toFixed(1)+'×',read:n=>n},
  agents:{format:n=>String(n),read:n=>n},
  branching:{format:n=>Math.round(n)+'%',read:n=>n/100},
  feedback:{format:n=>Math.round(n)+'%',read:n=>n/100},
  thickness:{format:n=>(n/100).toFixed(3),read:n=>n/100},
  force:{format:n=>n.toFixed(1)+'×',read:n=>n},
  frequency:{format:n=>n.toFixed(1),read:n=>n},
  evolution:{format:n=>n.toFixed(1),read:n=>n}
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
    const number=key==='branching'||key==='feedback'||key==='thickness'?engine.config[key]*100:engine.config[key];
    $(key).value=String(number);
    $(key+'-value').textContent=opt.format(number);
  }
  $('palette').value=engine.config.palette;
  $('topology').value=engine.config.topology;
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
fit();readControls();
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
  orbit.update();
  renderer.render(scene,camera);
  if(now-lastStatus>600){
    $('stats').textContent=engine.segmentCount.toLocaleString()+' STRANDS / '+engine.agents.length+' TIPS';
    lastStatus=now;
  }
}
requestAnimationFrame(frame);
