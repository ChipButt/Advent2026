'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const match=html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert(match,'Snow Shoveller inline engine exists');
const source=match[1]
  .replace('(function(){','var engine=(function(){')
  .replace(/\}\)\(\);\s*$/, 'return {get state(){return state;},get helpers(){return helpers;},tick,read,save,generateSnow,rescue,deposit,remaining,progress,cost,UPGRADE,updateHud,buildShop,render,keys,get stageDone(){return stageDone;}};})();');

function game(existing=new Map()){
  const elements={};
  const el=id=>{
    if(!elements[id]){
      const node={id,textContent:'',innerHTML:'',style:{},children:[],listeners:{},disabled:false,
        classList:{data:new Set(),add(n){this.data.add(n);},remove(n){this.data.delete(n);},contains(n){return this.data.has(n);},toggle(n,v){v?this.add(n):this.remove(n);}},
        append(...nodes){this.children.push(...nodes);},appendChild(node){this.children.push(node);},
        addEventListener(n,fn){this.listeners[n]=fn;},focus(){},getBoundingClientRect(){return {width:390,height:650,left:0,top:0};},
        getContext(){return new Proxy({createLinearGradient(){return {addColorStop(){}};}},{get(obj,key){return obj[key]??(()=>{});}});}
      };
      elements[id]=node;
    }
    return elements[id];
  };
  const document={getElementById:el,createElement:()=>el('el-'+Math.random()),addEventListener(){}};
  const window={devicePixelRatio:1,addEventListener(){}};
  const localStorage={getItem:k=>existing.get(k)||null,setItem:(k,v)=>existing.set(k,v)};
  const performance={now:()=>8000};
  const engine=new Function('window','document','localStorage','performance','requestAnimationFrame','confirm','navigator',source+'\nreturn engine;')
    (window,document,localStorage,performance,()=>{},()=>true,{});
  return {engine,el,existing};
}

test('game starts with snow, an empty sack and no free currency',()=>{
  const {engine:e}=game();
  assert(e.remaining()>0);
  assert.equal(e.state.coins,0);
  assert.equal(e.state.player.bag,0);
  assert.equal(e.helpers.length,0);
  e.render();
});

test('shovelling changes snow and sack but does not mint coins before furnace delivery',()=>{
  const {engine:e}=game();
  e.keys.d=true;const start=e.state.player.x;
  for(let i=0;i<90;i++)e.tick(.025);
  e.keys.d=false;
  assert(e.state.player.x>start);
  assert(e.state.player.bag>0);
  assert.equal(e.state.coins,0);
  e.state.player.x=5.7;e.state.player.y=5.6;
  const load=e.state.player.bag;
  e.tick(.02);
  assert.equal(e.state.player.bag,0);
  assert(e.state.coins>=Math.floor(load*3)-1);
});

test('tiny furnace loads cannot mint extra currency',()=>{
  const {engine:e}=game();
  const p=e.state.player;
  p.x=5.7;p.y=5.6;p.bag=.05;
  e.tick(.016);
  assert.equal(e.state.coins,0);
  assert(p.bag>.01);
  p.bag=1;
  e.tick(.016);
  assert.equal(e.state.coins,3);
});

test('upgrade purchases subtract money and increase capacity/power',()=>{
  const {engine:e,el}=game();
  e.state.coins=400;
  e.buildShop();
  assert.equal(el('shopGrid').children.length,4);
  const shovel=el('shopGrid').children[0],pack=el('shopGrid').children[1];
  assert(!shovel.disabled);
  const p=e.state.up.power,b=e.state.up.capacity,start=e.state.coins;
  shovel.listeners.click();pack.listeners.click();
  assert.equal(e.state.up.power,p+1);
  assert.equal(e.state.up.capacity,b+1);
  assert(e.state.coins<start);
});

test('ice rescue produces an independent limited-capacity helper',()=>{
  const {engine:e}=game();
  const i=e.state.ice[0],p=e.state.player;
  p.x=i.x;p.y=i.y;
  for(let j=0;j<25;j++)e.rescue(.1);
  assert(e.state.saved.includes(i.id));
  assert(e.helpers.some(h=>h.id===i.id&&h.bag===0));
  const helper=e.helpers[0];helper.bag=13;
  const old=e.state.coins;
  helper.x=5.7;helper.y=5.6;helper.mode='deposit';
  e.tick(.05);
  assert(e.state.coins>old);
  assert.equal(helper.bag,0);
});

test('progress survives reload and a cleared district can advance',()=>{
  const store=new Map(),{engine:e}=game(store);
  e.state.coins=123;e.state.up.power=3;e.state.player.bag=10;e.save();
  const {engine:copy}=game(store);
  assert.equal(copy.state.coins,123);
  assert.equal(copy.state.up.power,3);
  assert.equal(copy.state.player.bag,10);
  copy.state.snow.fill(0);copy.state.player.bag=0;
  copy.tick(.016);
  assert(copy.stageDone);
  assert.equal(copy.progress(),100);
});
