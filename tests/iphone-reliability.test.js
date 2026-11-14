import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');

function bootstrap(){
  const match=html.match(/<script>([\s\S]*?)<\/script>\s*<script type="module"/);
  assert.ok(match,'A non-module diagnostics catcher must load before the app.');
  const elements=new Map();
  for(const id of [
    'runtime-diagnostic','runtime-error-text','live',
    'copy-runtime-error','dismiss-runtime-error'
  ]){
    elements.set(id,{
      hidden:true,textContent:'',listeners:{},
      addEventListener(type,callback){this.listeners[type]=callback;},
      setAttribute(name,value){this[name]=value;},
      focus(){this.focused=true;}
    });
  }
  const events=new Map();
  let clipboard='';
  const window={
    addEventListener(type,callback){events.set(type,callback);}
  };
  const document={getElementById:id=>elements.get(id)};
  const navigator={clipboard:{async writeText(value){clipboard=value;}}};
  runInNewContext(match[1],{window,document,navigator});
  return {window,elements,events,getClipboard:()=>clipboard};
}

test('module-load failures and graphics crashes are visible on the canvas',()=>{
  const ctx=bootstrap();
  ctx.events.get('error')({target:{tagName:'SCRIPT'}});
  assert.equal(ctx.elements.get('runtime-diagnostic').hidden,false);
  assert.match(ctx.elements.get('runtime-error-text').textContent,/script failed to load/);
  ctx.events.get('unhandledrejection')({reason:new Error('WebGL shader compilation failed')});
  assert.match(ctx.elements.get('runtime-error-text').textContent,/shader compilation failed/);
  assert.equal(ctx.elements.get('live').textContent,'RENDER ISSUE');
});

test('diagnostic report redacts secrets, can copy and dismiss, and reopens on recurrence',async()=>{
  const ctx=bootstrap();
  const message='failed https://example.org?access_token=PLEASE_HIDE&key=ANOTHER_SECRET sk-0123456789012345 Bearer abc012.def';
  ctx.window.__genesisDiagnostics.report(message);
  const output=ctx.elements.get('runtime-error-text').textContent;
  assert.doesNotMatch(output,/PLEASE_HIDE|ANOTHER_SECRET|0123456789012345|abc012\.def/);
  assert.match(output,/REDACTED/);
  await ctx.elements.get('copy-runtime-error').listeners.click();
  assert.match(ctx.getClipboard(),/EX NIHILO runtime diagnostic/);
  ctx.elements.get('dismiss-runtime-error').listeners.click();
  assert.equal(ctx.elements.get('runtime-diagnostic').hidden,true);
  ctx.window.__genesisDiagnostics.report(message);
  assert.equal(ctx.elements.get('runtime-diagnostic').hidden,false);
});

test('iPhone portrait must use natural height for the five-button two-row toolbar',()=>{
  assert.equal((html.match(/class="mini[^"]*" id="(?:pressure-quick|sculpt-quick|frame-art|pause|new)"/g)||[]).length,5);
  const portrait=css.slice(css.indexOf('/* 03K MOBILE STAGE RELIABILITY'));
  assert.match(portrait,/@media \(max-width:600px\) and \(orientation:portrait\)/);
  assert.match(portrait,/\.masthead\s*\{[^}]*height:auto/);
  assert.match(portrait,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(portrait,/\.console\s*\{[^}]*overflow-y:auto/);
});

test('short touch-screen landscape overrides old 580px/250px desktop minimums',()=>{
  const portrait=css.slice(css.indexOf('/* 03K MOBILE STAGE RELIABILITY'));
  assert.match(portrait,/@media \(pointer:coarse\) and \(orientation:landscape\) and \(max-height:560px\)/);
  assert.match(portrait,/main\s*\{[^}]*display:grid;[^}]*min-height:0/);
  assert.match(portrait,/\.stage\s*\{[^}]*height:auto;min-height:0/);
  assert.match(portrait,/safe-area-inset-left/);
  assert.match(portrait,/safe-area-inset-bottom/);
});

test('WebGL render and context loss cannot silently erase or reset the organism',()=>{
  assert.match(main,/WebGL2 startup failed/);
  assert.match(main,/webglcontextlost/);
  assert.match(main,/webglcontextrestored/);
  assert.match(main,/if\(graphicsLost\)return/);
  assert.match(main,/WebGL render error/);
  assert.doesNotMatch(main.slice(main.indexOf("canvas.addEventListener('webglcontextlost'"),
    main.indexOf('renderer.outputColorSpace')),/engine\.reset\(/);
});

test('local performance report stays opt-in and is only copyable after a real sample',()=>{
  assert.match(html,/id="performance-toggle"/);
  assert.match(html,/id="performance-copy" disabled/);
  assert.match(main,/if\(!performanceMeter\.enabled\)return/);
  assert.match(main,/performanceMeter\.frames\*1000/);
  assert.match(main,/Draw calls:/);
  assert.match(main,/GPU geometries:/);
  assert.match(main,/performance-copy'\)\.disabled=false/);
});

test('new UI IDs are unique and all main source lookups exist',()=>{
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  const refs=[...main.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length);
  assert.deepEqual([...new Set(refs.filter(id=>!ids.includes(id)))],[]);
});
