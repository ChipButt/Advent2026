import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const dirname = path.dirname(new URL(import.meta.url).pathname);
const code = fs.readFileSync(path.join(dirname, 'game.js'), 'utf8');
const html = fs.readFileSync(path.join(dirname, 'index.html'), 'utf8');
const gameIds = [...code.matchAll(/\$\("([a-z][A-Za-z]+)"\)/g)].map(match => match[1]);

test('every game control resolves to an existing HTML element', () => {
  for(const id of gameIds) assert.match(html, new RegExp('id="'+id+'"'), 'Missing HTML control '+id);
});

function boot({ failAsset=false }={}){
  const el = new Map(), listeners={}, raf=[],paths=[];
  let canvasCalls=0;
  const canvasContext={
    imageSmoothingEnabled:false,
    drawImage(){canvasCalls++},clearRect(){},fillRect(){},save(){},restore(){},
    translate(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(){},fill(){},fillText(){}
  };
  function element(id){
    if(!el.has(id))el.set(id,{
      id,hidden:false,disabled:false,innerHTML:'',textContent:'',attributes:{},
      classList:{add(){},remove(){}},
      addEventListener(type,fn){(this[type]??=[]).push(fn)},
      setAttribute(name,value){this.attributes[name]=value},
      getContext(){return canvasContext},setPointerCapture(){},
      getBoundingClientRect(){return {width:360,height:600}}
    });
    return el.get(id);
  }
  const document={
    getElementById:element,createElement:()=>element('canvas-'+el.size),
    querySelectorAll:()=>[element('moveLeft'),element('moveRight'),element('fire')],
    addEventListener(type,fn){(listeners[type]??=[]).push(fn)},
    hidden:false
  };
  const window={addEventListener(){}}, storage={};
  const localStorage={getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v};
  class MockImage {
    naturalWidth=768;naturalHeight=512;complete=true;
    set src(url){
      paths.push(url);
      queueMicrotask(()=>{
        if(failAsset && url.includes('Gingerbread'))this.onerror?.(new Error('blocked'));
        else this.onload?.();
      });
    }
  }
  const instrumented=code.replace(
    'spawnWave();openPanel("ready");load();',
    'window.testAccess={game,player,begin,move,fire,damagePlayer,nextWave,pause,resume,release};spawnWave();openPanel("ready");load();'
  );
  assert.notEqual(instrumented,code,'Test hook missing');
  vm.runInNewContext(instrumented,{window,document,Image:MockImage,localStorage,
    requestAnimationFrame:fn=>raf.push(fn),console,setTimeout,clearTimeout});
  let time=0;
  function frames(count){
    for(let n=0;n<count;n++){time+=16.6667;const f=raf.shift();assert.ok(f,'RAF still scheduled');f(time);}
  }
  function key(event,key){for(const fn of listeners[event]??[])fn({key,repeat:false,preventDefault(){}})}
  function click(id){for(const fn of element(id).click??[])fn()}
  return {window,storage,paths,frames,key,click,element,canvasCalls:()=>canvasCalls};
}
async function settled(){for(let n=0;n<5;n++)await Promise.resolve()}
test('all eight existing art assets load, game runs, and full arcade loop works',async()=>{
  const t=boot();await settled();
  assert.equal(t.paths.length,8);
  assert.equal(t.element('primaryButton').disabled,false);
  assert.equal(t.element('assetStatus').hidden,true);
  for(const rel of t.paths){
    const file=path.resolve(dirname,decodeURIComponent(rel));
    assert.ok(fs.existsSync(file),'Missing source asset '+file);
  }
  t.click('primaryButton');
  const {game,player,move,damagePlayer}=t.window.testAccess;
  assert.equal(game.state,'playing');
  assert.equal(game.invaders.length,7,'First wave should be a small bauble formation');
  assert.equal(game.forts.length,20);
  t.key('keydown',' ');t.frames(650);t.key('keyup',' ');
  assert.ok(game.score>0,'Shooting hits invaders and awards points');
  assert.ok(game.invaders.some(e=>!e.alive),'Invader collision works');
  t.click('menuButton');assert.equal(game.state,'paused');
  t.click('primaryButton');assert.equal(game.state,'playing');
  game.invaders.forEach(e=>e.alive=false);
  move(.016);assert.equal(game.wave,2);assert.equal(game.state,'between');
  game.state='playing';player.hurt=0;
  for(let n=0;n<3;n++){player.hurt=0;damagePlayer();}
  assert.equal(game.state,'over');assert.equal(game.lives,0);
  assert.ok(Number(t.storage['gamebox-santa-invaders-best'])>0);
  assert.ok(t.canvasCalls()>100,'Canvas draws on every frame');
});
test('missing art blocks the game and offers retry instead of invisible sprites',async()=>{
  const t=boot({failAsset:true});await settled();
  assert.equal(t.element('assetStatus').hidden,false);
  assert.equal(t.element('primaryButton').disabled,false);
  assert.equal(t.element('primaryButton').textContent,'RETRY ASSETS');
  t.click('primaryButton');
  assert.equal(t.window.testAccess.game.state,'ready','Never start with missing game sprites');
});
