import { MATHEMAGICAL_VAULT } from './palette-vault.js';

// Preserve the five original Nerve Cathedral palettes alongside EVERY
// source-authored MATHEMAGICAL palette; no synthetic truncation of long ramps.
export const LEGACY_PALETTES=Object.freeze({
  acid:['#00ffc8','#ff37c7','#a45cff','#ffeb83'],
  molten:['#ffeb45','#ff532b','#ef38a7','#45d9ff'],
  biolume:['#50ffee','#51adff','#7b4dff','#ebffa8'],
  candy:['#ff499b','#48e3ff','#e8ff58','#b46aff'],
  ivory:['#f6e9ff','#b8d5eb','#ffb8df','#e6fbf0']
});
export const PALETTE_CATALOG=Object.freeze([
  ...Object.entries(LEGACY_PALETTES).map(([id,colors])=>({
    id,name:({acid:'ULTRAVIOLET ACID',molten:'MOLTEN PRISM',
      biolume:'BIOLUMINESCENT',candy:'TOXIC CANDY',ivory:'GHOST FILAMENT'})[id],
    source:'EX NIHILO ORIGINAL',colors:[...colors]
  })),
  ...MATHEMAGICAL_VAULT.palettes.map(p=>({
    ...p,id:'vault:'+p.id,originId:p.id,colors:[...p.colors]
  }))
]);
export const PALETTES=Object.freeze(Object.fromEntries(
  PALETTE_CATALOG.map(p=>[p.id,Object.freeze([...p.colors])])
));
export const PALETTE_NAMES=Object.freeze(Object.fromEntries(
  PALETTE_CATALOG.map(p=>[p.id,p.name])
));
export const isPaletteStops=stops=>stops===null||(
  Array.isArray(stops)&&stops.length>=2&&stops.length<=12&&
  stops.every(s=>typeof s==='string'&&/^#[0-9a-f]{6}$/i.test(s))
);
export function filteredPalettes(query=''){
  const words=String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  return PALETTE_CATALOG.filter(p=>{
    const hay=[p.id,p.name,p.source,p.originId||''].join(' ').toLowerCase();
    return words.every(w=>hay.includes(w));
  });
}
export function activeStops(config){
  return config.paletteStops??PALETTES[config.palette]??PALETTES.acid;
}
