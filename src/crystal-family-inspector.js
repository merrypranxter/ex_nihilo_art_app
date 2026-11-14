// CRYSTAL FAMILY INSPECTOR — pure selection and honest living genealogy.
// IDs are immutable birth *events*, never mutable GPU instance slots.
// Only direct edges between currently living parents and children are drawn.
// A selected ancestor may die while the saved founder family survives.
export const FAMILY_FOCUS_MODES=Object.freeze({
  family:'ALL LIVING FAMILY',
  descendants:'LIVING DESCENDANT BRANCH'
});
const validId=id=>Number.isSafeInteger(id)&&id>0&&id<=0xffffffff;

export function inspectCrystalFamily(colony,birthId=0,familyId=0,mode='family'){
  const focusedId=validId(birthId)?birthId:0;
  const family=validId(familyId)?familyId:0;
  const kind=Object.hasOwn(FAMILY_FOCUS_MODES,mode)?mode:'family';
  const blank={
    birthId:focusedId,familyId:family,mode:kind,tracked:false,
    selectedIndex:-1,selectedAlive:false,parentId:0,parentIndex:-1,
    founderIndex:-1,directChildren:0,visibleDescendants:0,
    members:[],links:[],familiesLive:0,interruptedLinks:0
  };
  if(!focusedId)return blank;
  const byBirth=new Map(),children=new Map();
  const len=Math.min(colony.capacity??colony.cells.length,colony.cells.length);
  for(let i=0;i<len;i++){
    if(!colony.cells[i])continue;
    const id=colony.birthIds[i];
    if(!validId(id))continue; // don't invent ancestry for old-world cells
    byBirth.set(id,i);
    const parent=colony.parentBirthIds[i];
    if(parent){
      if(!children.has(parent))children.set(parent,[]);
      children.get(parent).push(id);
    }
  }
  const selectedIndex=byBirth.get(focusedId)??-1;
  const actualFamily=selectedIndex>=0?colony.families[selectedIndex]:family;
  const parentId=selectedIndex>=0?colony.parentBirthIds[selectedIndex]:0;
  if(!validId(actualFamily))return {...blank,selectedIndex,
    selectedAlive:selectedIndex>=0};
  const descendants=new Set();
  // Even an extinct selected parent can have living direct children; chain
  // traversal thereafter follows only surviving birth-event records.
  const pending=[focusedId];
  const visited=new Set([focusedId]);
  for(let j=0;j<pending.length;j++){
    const ancestor=pending[j];
    for(const child of children.get(ancestor)||[]){
      if(visited.has(child))continue;
      visited.add(child);
      descendants.add(child);
      pending.push(child);
    }
  }
  const included=new Set();
  const members=[];
  for(const [id,index] of byBirth){
    if(kind==='family'?
      colony.families[index]===actualFamily:
      (id===focusedId||descendants.has(id))){
      included.add(id);
      members.push(index);
    }
  }
  const links=[];
  let interruptedLinks=0;
  for(const index of members){
    const id=colony.birthIds[index],parent=colony.parentBirthIds[index];
    if(!parent)continue;
    const pIndex=byBirth.get(parent);
    if(pIndex!==undefined&&included.has(parent)){
      links.push({parentIndex:pIndex,childIndex:index,parentId:parent,childId:id});
    }else if(pIndex===undefined)interruptedLinks++;
    // A living parent outside the chosen branch is merely filtered, not dead.
  }
  return {
    ...blank,tracked:true,familyId:actualFamily,
    selectedIndex,selectedAlive:selectedIndex>=0,parentId,
    parentIndex:byBirth.get(parentId)??-1,
    founderIndex:byBirth.get(actualFamily)??-1,
    directChildren:(children.get(focusedId)||[]).length,
    visibleDescendants:descendants.size,
    members,links,interruptedLinks,
    familiesLive:new Set(members.map(i=>colony.families[i])).size
  };
}

// Raycast hits return an InstancedMesh slot which can change every time the
// living CA grows, and again when three optical-stage meshes are enabled.
// Resolve it to a voxel only through the matching current renderer map.
export function crystalVoxelForHit(hit,classicMesh,classicMapping,stageMeshes,stageMappings){
  if(!hit||!Number.isInteger(hit.instanceId)||hit.instanceId<0||
    !hit.object||hit.instanceId>=hit.object.count)return -1;
  if(hit.object===classicMesh)return classicMapping[hit.instanceId]??-1;
  for(const [stage,mesh] of Object.entries(stageMeshes)){
    if(hit.object===mesh)return stageMappings[stage]?.[hit.instanceId]??-1;
  }
  return -1;
}

// Uniform deterministic sampling of a potentially huge family for one
// bounded instanced highlight draw. No moving RNG and no first-voxel bias.
export function sampleFamilyMembers(members,maxCount=900){
  const n=members.length,cap=Math.max(0,Math.floor(maxCount));
  if(n<=cap)return [...members];
  if(!cap)return [];
  const picked=[];
  for(let k=0;k<cap;k++)picked.push(members[Math.floor((k+.5)*n/cap)]);
  return picked;
}
