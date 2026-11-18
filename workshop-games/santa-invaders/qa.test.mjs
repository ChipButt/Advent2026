/* Offline browser-engine smoke tests for Santa Invaders.
   Uses the actual production script and verifies every referenced sprite file
   and sheet layout rather than silently substituting placeholder graphics. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.dirname(dir);
const source = fs.readFileSync(path.join(dir, 'game.js'), 'utf8');
const anchor = 'spawnWave();openPanel("ready");load();';
assert.ok(source.includes(anchor), 'Test hooks must remain attached to actual production source');
const script = source.replace(anchor,
  'window.__qa={game,player,ASSETS,images,spawnWave,begin,fire,move,pause,resume,end,damagePlayer,openPanel,hud,formationFor,difficultyFor,shatterOnContact,ICE_LINE_Y};' + anchor);

function pngDimensions(file) {
  const buf = fs.readFileSync(file);
  assert.equal(buf.subarray(1,4).toString('ascii'), 'PNG', file+' is not a PNG');
  return { width:buf.readUInt32BE(16), height:buf.readUInt32BE(20) };
}
function makeHarness(){
  const elements = new Map(), events=new Map(), frames=[], seen=[], store=new Map();
  const ctx = new Proxy({createLinearGradient(){return {addColorStop(){}}}},{
    get(t,p){if(p in t)return t[p];if(p === 'imageSmoothingEnabled')return false;return ()=>{}},
    set(t,p,v){t[p]=v;return true}
  });
  function element(id){
    if(elements.has(id))return elements.get(id);
    const handlers=new Map();
    const el = {
      id,disabled:false,hidden:false,textContent:'',innerHTML:'',style:{},
      classList: {tokens:new Set(),add(v){this.tokens.add(v)},remove(v){this.tokens.delete(v)},contains(v){return this.tokens.has(v)}},
      addEventListener(type,cb){const a=handlers.get(type)||[];a.push(cb);handlers.set(type,a)},
      trigger(type,arg={}){for(const cb of handlers.get(type)||[])cb(arg)},
      setAttribute(){},setPointerCapture(){},
      getBoundingClientRect(){return {width:360,height:600}},
      getContext(){return ctx}
    };
    elements.set(id,el);
    return el;
  }
  const document={
    getElementById:element,createElement:()=>element('canvas-'+elements.size),
    querySelectorAll(sel){return sel==='.control'?[element('moveLeft'),element('moveRight'),element('fire')]:[]},
    addEventListener(type,cb){const a=events.get(type)||[];a.push(cb);events.set(type,a)}
  };
  class Image {
    constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;this.onload=null;this.onerror=null}
    set src(value){
      const file=path.resolve(dir,decodeURIComponent(value));
      seen.push(file);
      queueMicrotask(()=>{
        if(!fs.existsSync(file)){this.onerror?.(new Error('Missing source asset '+file));return}
        const dimensions=pngDimensions(file);
        this.naturalWidth=dimensions.width;this.naturalHeight=dimensions.height;this.complete=true;
        this.onload?.();
      });
    }
  }
  const localStorage={
    getItem(k){return store.get(k)||null},
    setItem(k,v){store.set(k,String(v))}
  };
  const window={addEventListener(){}};
  const sandbox={window,document,Image,localStorage,requestAnimationFrame:fn=>frames.push(fn),
    console:{error(...args){sandbox.errors.push(args.map(String).join(' '))}},errors:[],Math,Promise,Number,String,Set,Array};
  vm.runInNewContext(script,sandbox,{filename:'loaded-game-script',timeout:1500});
  const qa=window.__qa;
  function event(type,arg={}){for(const fn of events.get(type)||[])fn(arg)}
  return {qa,element,event,frames,seen,store,sandbox};
}
async function loaded() {
  const h=makeHarness();await Promise.resolve();await Promise.resolve();await Promise.resolve();
  assert.equal(h.sandbox.errors.length,0,'Asset loading failed '+h.sandbox.errors.join('; '));
  assert.equal(h.element('primaryButton').disabled,false,'Start never became enabled');
  assert.equal(h.element('assetStatus').hidden,true,'Loading banner did not close');
  return h;
}

test('all artwork is present, valid PNG, and sprite-sheet frames have correct grid', async()=>{
  const h=await loaded();
  for(const [key,url] of Object.entries(h.qa.ASSETS)){
    const filepath=path.resolve(dir,decodeURIComponent(url));
    assert.ok(fs.existsSync(filepath),'Missing required art: '+key+' '+url);
    const {width,height}=pngDimensions(filepath);
    if(key==='ground')assert.deepEqual({width,height},{width:224,height:192},'Gherwit tiles atlas changed');
    else {
      assert.ok(height===384||height===512,key+' needs three or four 128px direction rows (got '+height+')');
      const frames=(key==='defenderIdle'||key==='boss')?4:6;
      assert.equal(width,frames*128,key+' animation columns are wrong');
    }
  }
  assert.equal(h.seen.length,Object.keys(h.qa.ASSETS).length,'Some required assets were not requested');
});
test('the run starts only after sprites load and player can shoot',async()=>{
  const h=await loaded();const {qa}=h;qa.begin();
  assert.equal(qa.game.state,'playing');
  assert.equal(qa.game.invaders.length,7,'Wave one begins with a small seven-invader bauble');
  assert.equal(qa.game.lives,3);
  qa.fire();assert.equal(qa.game.shots.length,1);
  qa.fire();assert.equal(qa.game.shots.length,1,'Fire cooldown ignored');
});
test('enemy hit increases score and dead enemies disappear',async()=>{
  const {qa}=await loaded();qa.begin();
  qa.game.invaders=[{type:'ginger',row:0,col:0,alive:true,points:30,variant:0}];
  qa.game.gridX=150;qa.game.gridY=100;qa.game.direction=1;
  qa.game.shots=[{x:162,y:114,vy:-100,r:4}];
  qa.move(.01);
  assert.equal(qa.game.score,30+130,'Hit score and wave-clear bonus must both apply');
  assert.equal(qa.game.wave,2,'Next wave was not prepared');
  assert.equal(qa.game.state,'between');
});
test('incoming fire damages player, then ends the game when lives run out',async()=>{
  const {qa,store}=await loaded();qa.begin();
  const start=qa.game.lives;
  for(let i=0;i<3;i++){
    qa.player.hurt=0;
    qa.game.enemyShots=[{x:qa.player.x,y:qa.player.y,vy:0,r:4}];
    qa.move(.01);
    assert.equal(qa.game.lives,start-i-1);
  }
  assert.equal(qa.game.state,'over');
  assert.equal(qa.player.hurt>0,true);
  qa.player.hurt=0;qa.damagePlayer();qa.damagePlayer();
  assert.equal(qa.game.lives,0,'Damage after game over must never create negative lives');
  qa.begin();assert.equal(qa.game.state,'playing');assert.equal(qa.game.lives,3);
  assert.ok(store instanceof Map);
});
test('pause/resume and keyboard fire/stop work',async()=>{
  const h=await loaded();const {qa,event}=h;qa.begin();qa.pause();
  assert.equal(qa.game.state,'paused');
  qa.resume();assert.equal(qa.game.state,'playing');
  const before=qa.game.shots.length;
  event('keydown',{key:' ',repeat:false,preventDefault(){}});
  qa.move(.03);assert.ok(qa.game.shots.length>before);
  event('keyup',{key:' '});assert.equal(qa.game.state,'playing');
});
test('menu previews and gameplay do not reference unrelated art packs',()=>{
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
  const files=html+'\\n'+css+'\\n'+source;
  assert.doesNotMatch(files,/Pixel Shmup|Ship_|Platformer Assets Holiday|Emoji|fake checkerboard/i);
  assert.match(html,/id="assetStatus"/);
  assert.match(html,/id="game"/);
  assert.match(html,/id="moveLeft"/);
  assert.match(html,/id="moveRight"/);
  assert.match(html,/id="fire"/);
  // Verify direct CSS assets used in the overlay are not broken relative links.
  for(const m of css.matchAll(/url\((["']?)([^)'"]+)\1\)/g)){
    const u=m[2];if(/^(data:|https?:)/.test(u))continue;
    const file=path.resolve(dir,decodeURIComponent(u));
    assert.ok(fs.existsSync(file),'Broken CSS art: '+u);
  }
});


test('twelve consecutive waves spell out twelve different Christmas silhouettes',async()=>{
  const {qa}=await loaded();
  qa.begin();
  const expected=["BAUBLE","CANDY CANE","CHRISTMAS TREE","STOCKING","SNOWMAN","STAR",
    "PRESENT","WREATH","BELL","SANTA HAT","SNOWFLAKE","GINGERBREAD"];
  const masks=new Set(),sizes=[];
  for(let wave=1;wave<=expected.length;wave++){
    const form=qa.formationFor(wave);
    assert.equal(form.name,expected[wave-1],`Wrong Christmas icon at wave ${wave}`);
    assert.ok(form.rows.every(row=>/^[.X]{9}$/.test(row)),'Every shape needs exactly nine clean cells per row');
    const mask=form.rows.join('/');
    assert.ok(!masks.has(mask),`Duplicate formation: ${form.name}`);
    masks.add(mask);
    qa.game.wave=wave;
    qa.spawnWave();
    const intended=form.rows.reduce((sum,row)=>sum+[...row].filter(x=>x==='X').length,0);
    assert.equal(qa.game.invaders.length,intended,`Gaps in ${form.name} must stay empty`);
    assert.equal(qa.game.startCount,intended,'Wave count should match speed denominator');
    assert.ok(qa.game.invaders.every(e=>e.col>=0&&e.col<9&&e.row>=0&&e.row<form.rows.length),'Enemy placed outside silhouette');
    assert.ok(qa.game.invaders.every(e=>e.points>0),'No undefined points on tall shapes');
    sizes.push(intended);
    if(wave>1){
      assert.ok(qa.difficultyFor(wave).speed>qa.difficultyFor(wave-1).speed,'Movement must get faster');
      assert.ok(qa.difficultyFor(wave).volleyTime<qa.difficultyFor(wave-1).volleyTime,'Firing must get faster');
    }
  }
  assert.equal(sizes[0],7,'Begin with an easy small Christmas bauble');
  assert.ok(sizes.at(-1)>sizes[0],'Later formations should be fuller');
  assert.equal(qa.formationFor(13).name,'BAUBLE','All twelve shapes play before the sequence repeats');
});
test('invader bodies shatter the protective ice and only the ice boundary ends the run',async()=>{
  const {qa}=await loaded();qa.begin();
  const fort=qa.game.forts[0];
  assert.equal(fort.hp,3);
  qa.game.invaders=[{type:'ginger',row:0,col:0,alive:true,points:30,variant:0}];
  qa.game.startCount=1;
  qa.game.gridX=fort.x;qa.game.gridY=fort.y-23;
  qa.game.enemyShots=[];qa.game.shots=[];qa.game.grace=10;
  qa.move(.01);
  assert.equal(fort.hp,0,'Invader contact must destroy the ice block, without needing a shot');
  assert.equal(qa.game.invaders[0].alive,true,'Invader continues through the broken ice');
  assert.equal(qa.game.state,'playing','Ice is protection, not the defeat line');
  const effects=qa.game.fx.length;
  qa.move(.01);
  assert.ok(qa.game.fx.length<=effects,'Destroyed segment should not shatter again next frame');
  qa.game.gridX=250;
  qa.game.gridY=qa.ICE_LINE_Y-26;
  qa.move(.01);
  assert.equal(qa.game.state,'playing','Invaders may approach without crossing the marked ice line');
  qa.game.gridY=qa.ICE_LINE_Y-23;
  qa.move(.01);
  assert.equal(qa.game.state,'over','Crossing the ice line ends the run');
  assert.match(qa.game.overReason,/ice line/i);
});
test('winter stage has a real continuous ice crossing and no workshop door decoration',()=>{
  assert.match(source,/drawIceLine\(g\)/,'Frozen crossing must be rendered on the actual cached background');
  assert.doesNotMatch(source,/fillText\(["']ICE LINE["']/,'Do not draw label text on frozen boundary');
  assert.match(source,/ICE_LINE_Y=H-112/,'Marked ice line and collision threshold share one constant');
  assert.doesNotMatch(source,/156\+tx\*16,H-73\+ty\*16/,'Old door tiles must be removed');
  assert.match(source,/shatterOnContact\(live\)/,'Invader collision must run during every formation update');
});
