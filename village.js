(() => {
'use strict';
const canvas=document.getElementById('villageCanvas');
if(!canvas)return;
const ctx=canvas.getContext('2d',{alpha:false});
const calendar=window.AdventCalendar;
const $=id=>document.getElementById(id);
const stage=$('villageStage'), prompt=$('housePrompt'), enter=$('houseEnterButton');
const interior=$('houseInteriorHud'),play=$('playHouseGame'),leave=$('leaveHouseButton');
const dayLabel=$('insideHouseNumber'),greeting=$('insideElfGreeting'),activityTitle=$('insideActivityTitle'),activityText=$('insideActivityText');
const zoneLabel=$('zoneLabel'),dayCounter=$('dayCounter'),mapButton=$('mapButton'),mapOverlay=$('mapOverlay'),mapDays=$('mapDays'),mapClose=$('mapClose');
const W=320,H=416,T=16,WORLD_W=1488,WORLD_H=1136,PLAYER_SPEED=102;
canvas.width=W;canvas.height=H;
ctx.imageSmoothingEnabled=false;
const GB='https://chipbutt.github.io/GameBox/';
const TILE_URL='assets/winter/Winter-tiles.png';
const WINTER_TREE=[[9,6],[10,6],[11,6],[9,7],[10,7],[11,7],[9,8],[10,8],[11,8]];
const c={snow:'#deeafa',snowDeep:'#bfd8ed',snowShadow:'#98bcd5',ink:'#20344b',gold:'#fbe39e',pine:'#286449',wood:'#9b6549',cream:'#fff1cc'};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const hash=(x,y)=>{let h=(Math.imul(x+61,374761393)+Math.imul(y+47,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295};
const camera={x:0,y:0};
const player={x:752,y:1070,dir:'up',moving:false,frame:0};
let scene='village',inside=null,nearby=null,active=true,ready=false,now=0,last=performance.now(),distance=0;
let selectedZone='Christmas Town',image=null;
const keys=new Set(),held=new Set();
const visited=new Set();
const STORAGE='advent2026-rpg-v2';
let oldSave=null;
try{oldSave=JSON.parse(localStorage.getItem(STORAGE)||'null');if(oldSave){
 if(Number.isFinite(oldSave.x)&&Number.isFinite(oldSave.y)){player.x=clamp(oldSave.x,32,WORLD_W-32);player.y=clamp(oldSave.y,36,WORLD_H-25);}
 for(const d of oldSave.visited||[])if(Number.isInteger(d)&&d>=1&&d<=24)visited.add(d);
}}catch(_){}
const houses=[];
function addHouses(xs,ys,start,zone){
 for(const y of ys)for(const x of xs)houses.push({day:start++,x,y,w:88,h:80,zone,colour:(start+y+x)%6});
}
addHouses([310,566,838],[458,662,866],1,'Christmas Town');
addHouses([320,558,796],[80,255],13,'Northern Snow Trail');
addHouses([1150,1356],[354,588,826],19,'Eastern Pine Route');
// Christmas Town's last row completes the twelve homes.
houses.push({day:10,x:310,y:1010,w:88,h:80,zone:'Christmas Town',colour:3});
houses.push({day:11,x:566,y:1010,w:88,h:80,zone:'Christmas Town',colour:4});
houses.push({day:12,x:838,y:1010,w:88,h:80,zone:'Christmas Town',colour:5});
// The first three rows are limited to houses 1–9; final row contains 10–12.
houses.sort((a,b)=>a.day-b.day);
const paths=new Set(), obstacles=[];
const gridX=Math.ceil(WORLD_W/T),gridY=Math.ceil(WORLD_H/T);
const key=(x,y)=>x+','+y;
function carve(x0,y0,x1,y1,width=3){
 const ax=Math.round(x0/T),ay=Math.round(y0/T),bx=Math.round(x1/T),by=Math.round(y1/T),half=Math.floor(width/2);
 function fill(cx,cy){for(let yy=-half;yy<=half;yy++)for(let xx=-half;xx<=half;xx++)if(cx+xx>=0&&cy+yy>=0&&cx+xx<gridX&&cy+yy<gridY)paths.add(key(cx+xx,cy+yy));}
 let x=ax,y=ay;fill(x,y);
 while(x!==bx){x+=Math.sign(bx-x);fill(x,y)}
 while(y!==by){y+=Math.sign(by-y);fill(x,y)}
}
function rectPath(x1,y1,x2,y2){for(let y=Math.floor(y1/T);y<=Math.floor(y2/T);y++)for(let x=Math.floor(x1/T);x<=Math.floor(x2/T);x++)paths.add(key(x,y))}
const spineX=744;
carve(spineX,32,spineX,1090,3);
carve(280,422,1070,422,3);
carve(270,615,1070,615,3);
carve(270,819,1070,819,3);
carve(270,996,1070,996,3);
carve(230,212,940,212,3);
carve(220,364,1000,364,3);
carve(1030,595,1430,595,3);
carve(1245,300,1245,985,3);
carve(998,595,1245,595,3);
carve(1050,805,1245,805,3);
carve(1040,420,1245,420,3);
rectPath(648,672,824,782);
for(const h of houses){
 const doorX=h.x+h.w/2,doorY=h.y+h.h+8;
 const join=h.zone==='Northern Snow Trail'? (h.y<180?212:364)
  :h.zone==='Eastern Pine Route'?(h.y<500?595:(h.y<700?805:985))
  : (h.y>950?1090:h.y<550?615:h.y<760?819:996);
 carve(doorX,doorY,doorX,join,2);
 if(h.zone==='Christmas Town')carve(doorX,join,spineX,join,2);
 else if(h.zone==='Eastern Pine Route')carve(doorX,join,1245,join,2);
 else carve(doorX,join,spineX,join,2);
 obstacles.push({x:h.x+8,y:h.y+22,w:h.w-16,h:h.h-16});
}
const bridge={x:1070,y:691,w:195,h:43};
const river={x:1070,y:670,w:418,h:74};
const trees=[];
function inRect(x,y,r,p){return x>r.x-p&&x<r.x+r.w+p&&y>r.y-p&&y<r.y+r.h+p}
function nearPath(x,y,radius=32){
 const gx=Math.floor(x/T),gy=Math.floor(y/T),n=Math.ceil(radius/T);
 for(let yy=-n;yy<=n;yy++)for(let xx=-n;xx<=n;xx++)if(paths.has(key(gx+xx,gy+yy)))return true;
 return false;
}
for(let y=30;y<WORLD_H-24;y+=55)for(let x=20;x<WORLD_W-25;x+=52){
 const shiftX=(hash(x,y)*24-12)|0,shiftY=(hash(y,x)*18-9)|0;
 const px=x+shiftX,py=y+shiftY;
 if(hash(x+7,y+9)>.78)continue;
 if(nearPath(px,py,25))continue;
 if(inRect(px,py,river,26))continue;
 if(houses.some(h=>inRect(px,py,h,32)))continue;
 trees.push({x:px,y:py,size:hash(x+12,y)*.2+.85});
 obstacles.push({x:px+12,y:py+30,w:19,h:13});
}
const lamps=[];
for(const [x,y] of [[648,616],[840,616],[658,809],[841,809],[678,971],[874,973],[690,356],[820,355],[1060,595],[1190,592],[1260,785],[980,418]])lamps.push({x,y});
const signs=[{x:848,y:373,label:'CHRISTMAS TOWN'},{x:826,y:200,label:'SNOW TRAIL'},{x:1065,y:568,label:'PINE ROUTE'},{x:690,y:1081,label:'ADVENT 2026'}];
const benches=[[590,739],[889,743],[476,810],[1000,805]];
const palette=['#a23b4b','#2f7468','#98613f','#365c87','#865471','#a66e37'];
const atlas=new Image();
let terrain=null;
let atlasReadyResolve,atlasReadyReject;
const atlasReady=new Promise((resolve,reject)=>{atlasReadyResolve=resolve;atlasReadyReject=reject;});
atlas.onload=()=>{image=atlas;ready=true;atlasReadyResolve();};
atlas.onerror=()=>{ready=false;atlasReadyReject(new Error('Original Gherwit winter tiles failed to load'));};
atlas.src=TILE_URL;
function atlasTile(col,row,dx,dy,w=16,h=16){
 if(!image)return false;
 ctx.drawImage(image,col*16,row*16,16,16,Math.round(dx),Math.round(dy),w,h);
 return true;
}
function buildTerrainCache(){
 if(!ready||!image)throw new Error('Winter atlas must be ready before drawing world terrain');
 terrain=document.createElement('canvas');
 terrain.width=WORLD_W;terrain.height=WORLD_H;
 const ground=terrain.getContext('2d');ground.imageSmoothingEnabled=false;
 for(let gy=0;gy<gridY;gy++)for(let gx=0;gx<gridX;gx++){
   const x=gx*T,y=gy*T,p=paths.has(key(gx,gy));
   let col=p?7:12,row=1;
   if(!p&&hash(gx,gy)>.9){col=hash(gx+30,gy)>.5?1:0;row=1}
   if(p){
     const n=paths.has(key(gx,gy-1)),s=paths.has(key(gx,gy+1)),w=paths.has(key(gx-1,gy)),e=paths.has(key(gx+1,gy));
     col=w?(e?7:8):6;row=n?(s?1:2):0;
   }
   ground.drawImage(image,col*16,row*16,16,16,x,y,T,T);
 }
}
// Approved existing Christmas Village pack: 34 genuine source sprites, not code-rendered substitutes.
// Player 'character.png' is the original 16-cell 4-direction walk sheet (4 frames per direction).
let villageArt=null,christmasNPCs=null,artError=null;
const frameCache=new Map();
function sourceFrame(provider,name,index){
 const k=(provider===villageArt?'v:':'t:')+name+':'+index;
 if(frameCache.has(k))return frameCache.get(k);
 const frame=index==null?provider.canvas(name):provider.frame(name,index);
 frameCache.set(k,frame);return frame;
}
function drawSource(provider,name,x,y,w=null,h=null,frame=null){
 if(!provider||!provider.names.includes(name))return false;
 const src=sourceFrame(provider,name,frame);
 if(!src)return false;
 ctx.drawImage(src,Math.round(x),Math.round(y),Math.round(w??src.width),Math.round(h??src.height));
 return true;
}
function base(name,x,y,w=null,h=null,frame=null){
 if(!villageArt)return false;
 const virtual={
  'couch-horizontal':['couch.png',0,0,32,16],
  'couch-vertical':['couch.png',32,0,16,32],
  'fence-horizontal':['fence.png',0,0,32,16],
  'fence-vertical':['fence.png',32,0,16,32]
 };
 if(virtual[name]){
   const [source,sx,sy,sw,sh]=virtual[name],im=villageArt.canvas(source);
   ctx.drawImage(im,sx,sy,sw,sh,Math.round(x),Math.round(y),Math.round(w??sw),Math.round(h??sh));
   return true;
 }
 return drawSource(villageArt,name,x,y,w,h,frame);
}
function extra(name,x,y,w=null,h=null,frame=null){return drawSource(christmasNPCs,name,x,y,w,h,frame)}
function treeAt(t){
 const sx=Math.round(t.x-camera.x),sy=Math.round(t.y-camera.y);
 if(sx<-55||sy<-60||sx>W+55||sy>H+50)return;
 if(ready)for(let n=0;n<9;n++){
   const cell=WINTER_TREE[n];atlasTile(cell[0],cell[1],sx+(n%3)*16,sy+Math.floor(n/3)*16);
 }
 else base('small-tree.png',sx+8,sy,30,44);
}
function lampAt(x,y){
 base('lamp-post.png',x-camera.x-8,y-camera.y-30,16,32);
}
function fenceAt(x,y,count=4){
 for(let i=0;i<count*2;i++)base('fence-horizontal',x-camera.x+i*16,y-camera.y-9,16,16);
}
function signAt(s){
 base('sign-post.png',s.x-camera.x,s.y-camera.y-11,20,20);
}
function christmasTree(x,y){
 base('main-tree.png',x-camera.x-46,y-camera.y-70,92,122);
 for(const [i,dx,dy] of [[1,-52,24],[2,31,21],[3,10,37]])
 base('present'+i+'.png',x-camera.x+dx,y-camera.y+dy,18,18);
}
function houseAt(h){
 const x=Math.round(h.x-camera.x),y=Math.round(h.y-camera.y);
 if(x<-104||y<-110||x>W+95||y>H+95)return;
 const decorated=h.day%4===0;
 // Native house textures are sourced from the user-provided Christmas Village pack.
 // house1: actual 80x64 7-frame building sprite; house2: actual 80x48 companion cottage.
 if(decorated){base('house2.png',x+4,y+30,80,48)}
 else base('house1.png',x+4,y+14,80,64,0);
 const unlocked=calendar.isUnlocked(h.day),done=visited.has(h.day);
 if(h.day%3===0){
   base('wreath.png',x+36,y+48,12,12);
   base('present1.png',x+10,y+66,13,13);
 } else if(h.day%3===1){
   base('snowman1.png',x+2,y+57,21,23);
   base('small-tree.png',x+66,y+51,18,30);
 }else{
   base('christmas-lights.png',x+9,y+24,64,8,0);
 }
 // A label is text UI atop the actual artwork, not a painted replacement house.
 ctx.fillStyle=done?'#277654':unlocked?'#fae1a8':'#8594a5';
 ctx.fillRect(x+30,y+26,28,18);
 ctx.strokeStyle='#253647';ctx.lineWidth=2;ctx.strokeRect(x+30,y+26,28,18);
 ctx.fillStyle=done?'#fffdf2':'#273747';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='bold 12px monospace';ctx.fillText(String(h.day),x+44,y+35);
 if(h===nearby&&scene==='village'){
    ctx.strokeStyle=unlocked?'#ffe294':'#b4c0d0';ctx.lineWidth=2;
    ctx.strokeRect(x+27,y+47,34,31);
 }
}
function drawPlayer(){
 const dirBase={down:0,up:4,left:8,right:12};
 const step=player.moving?(Math.floor(distance/9)%4):0;
 const frame=(dirBase[player.dir]??0)+step;
 base('character.png',player.x-camera.x-16,player.y-camera.y-31,32,32,frame);
}
function drawResident(name,x,y,dir='down'){
 if(!christmasNPCs)return;
 const cols=3,baseIndex={down:0,left:3,right:6,up:9}[dir]??0;
 extra(name,x-camera.x-13,y-camera.y-34,26,36,baseIndex+Math.floor(now/240)%3);
}
function drawInterior(){
 if(!villageArt)return;
 // Full room tiles and furniture from the original Christmas Village pack.
 for(let y=0;y<H;y+=16)for(let x=0;x<W;x+=16){
    base('floor-tile.png',x,y,16,16);
 }
 for(let x=0;x<W;x+=16){
    base('wall-tileset.png',x,0,16,48,0);
    base('wall-tileset.png',x,48,16,48,1);
 }
 base('rug.png',76,260,168,104);
 base('fireplace.png',26,87,83,64,0);
 base('table.png',135,199,57,45);
 base('hot-chocolate.png',153,209,15,15,0);
 base('couch-horizontal',198,205,87,42);
 base('main-tree.png',241,104,67,94);
 base('present1.png',224,188,17,17);
 base('present2.png',286,190,19,19);
 base('stocking.png',88,89,14,22);
 base('wreath.png',163,71,28,28);
 if(christmasNPCs){
   const day=inside?.day||1;
   const people=['TF Santa.png','TF Gnome A.png','TF Mrs Claus.png','TF Gnome B.png','TF Elf B.png'];
   const name=people[(day-1)%people.length];
   const step=Math.floor(now/280)%3;
   extra(name,179,164,26,36,step);
 }
 base('character.png',148,305,32,32,4);
}
function collides(x,y){
 if(x<18||y<30||x>WORLD_W-18||y>WORLD_H-16)return true;
 const box={x:x-6,y:y-9,w:12,h:10};
 return obstacles.some(r=>box.x<r.x+r.w&&box.x+box.w>r.x&&box.y<r.y+r.h&&box.y+box.h>r.y);
}
function checkHouse(){
 nearby=null;let best=41;
 if(scene!=='village')return;
 for(const h of houses){
   const dx=player.x-h.x-h.w/2,dy=player.y-h.y-h.h-11,d=Math.hypot(dx,dy);
   if(d<best){best=d;nearby=h}
 }
 const unlocked=nearby&&calendar.isUnlocked(nearby.day);
 enter.disabled=!unlocked;
 enter.classList.toggle('ready',!!unlocked);
 prompt.classList.toggle('visible',!!nearby);
 prompt.textContent=nearby?(unlocked?'DOOR '+nearby.day+' — PRESS A': 'DOOR '+nearby.day+' — OPENS '+nearby.day+' DEC'):'';
}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify({x:Math.round(player.x),y:Math.round(player.y),visited:[...visited]}));}catch(_){}
 window.dispatchEvent(new CustomEvent('advent-progress',{detail:{visited:visited.size}}));}
function region(){
 if(player.y<415&&player.x<1090)return 'Northern Snow Trail';
 if(player.x>1090&&player.y<1030)return 'Eastern Pine Route';
 return 'Christmas Town';
}
function update(dt){
 if(scene!=='village'||!active||!mapOverlay.hidden)return;
 let direction=null;
 for(const k of ['arrowup','w','up','arrowdown','s','down','arrowleft','a','left','arrowright','d','right']){
  if(keys.has(k)||held.has(k)){direction=k;break;}
 }
 const dirs={arrowup:[0,-1,'up'],w:[0,-1,'up'],up:[0,-1,'up'],arrowdown:[0,1,'down'],s:[0,1,'down'],down:[0,1,'down'],arrowleft:[-1,0,'left'],a:[-1,0,'left'],left:[-1,0,'left'],arrowright:[1,0,'right'],d:[1,0,'right'],right:[1,0,'right']};
 player.moving=false;
 if(direction){const [dx,dy,dir]=dirs[direction];player.dir=dir;
  const nx=player.x+dx*PLAYER_SPEED*dt,ny=player.y+dy*PLAYER_SPEED*dt;
  if(!collides(nx,ny)){player.x=nx;player.y=ny;player.moving=true;distance+=PLAYER_SPEED*dt}
 }
 const tx=clamp(player.x-W/2,0,WORLD_W-W),ty=clamp(player.y-H/2,0,WORLD_H-H);
 camera.x+=(tx-camera.x)*Math.min(1,dt*11);camera.y+=(ty-camera.y)*Math.min(1,dt*11);
 const z=region();if(z!==selectedZone){selectedZone=z;if(zoneLabel)zoneLabel.textContent=z.toUpperCase()}
 checkHouse();
}
function drawVillage(){
 if(!terrain||!villageArt)return;
 ctx.drawImage(terrain,Math.round(camera.x),Math.round(camera.y),W,H,0,0,W,H);
 const render=[];
 for(const t of trees)render.push({y:t.y+46,draw:()=>treeAt(t)});
 for(const h of houses)render.push({y:h.y+h.h,draw:()=>houseAt(h)});
 for(const l of lamps)render.push({y:l.y,draw:()=>lampAt(l.x,l.y)});
 for(const s of signs)render.push({y:s.y,draw:()=>signAt(s)});
 for(const b of benches)render.push({y:b[1],draw:()=>base('bench.png',b[0]-camera.x,b[1]-camera.y-12,36,24)});
 for(const [x,y] of [[485,595],[900,590],[1040,812],[274,810],[1120,554]])render.push({y:y+12,draw:()=>fenceAt(x,y,4)});
 render.push({y:774,draw:()=>christmasTree(750,735)});
 const npcs=[['TF Santa.png',728,650],['TF Gnome A.png',525,768],['TF Mrs Claus.png',927,705],['TF Elf B.png',1170,545]];
 for(const [name,x,y] of npcs)render.push({y,draw:()=>drawResident(name,x,y)});
 render.push({y:player.y,draw:drawPlayer});
 render.sort((a,b)=>a.y-b.y);
 for(const r of render)r.draw();
}
function render(){
 ctx.imageSmoothingEnabled=false;
 if(scene==='interior')drawInterior();else drawVillage();
}
function enterHouse(h=nearby){
 if(!h||!calendar.isUnlocked(h.day))return;
 inside=h;scene='interior';
 const game=calendar.gameForDay(h.day);
 dayLabel.textContent='DAY '+h.day+' · '+h.zone.toUpperCase();
 greeting.textContent='Welcome in! It’s lovely to see you.';
 activityTitle.textContent=game?game.title:'Your surprise is being prepared';
 activityText.textContent=game?game.description:'This Advent door is waiting for its game assignment.';
 play.hidden=!game;interior.hidden=false;prompt.classList.remove('visible');
 enter.disabled=true;document.querySelector('.villageControls').hidden=true;
}
function leaveHouse(){
 if(inside){
  player.x=inside.x+inside.w/2;player.y=inside.y+inside.h+17;
 }
 scene='village';inside=null;interior.hidden=true;
 document.querySelector('.villageControls').hidden=false;
 persist();checkHouse();
}
function dayFinder(){
 mapDays.replaceChildren();
 for(let n=1;n<=24;n++){
  const h=houses.find(x=>x.day===n),b=document.createElement('button');
  b.type='button';b.className='mapDay'+(calendar.isUnlocked(n)?' unlocked':' locked')+(visited.has(n)?' visited':'');
  b.textContent=String(n);b.setAttribute('aria-label','Find Advent door '+n);
  b.onclick=()=>{mapOverlay.hidden=true;if(scene==='interior')leaveHouse();focusHouse(n);};
  mapDays.append(b);
 }
 mapOverlay.hidden=false;
}
function focusHouse(n){
 const h=houses.find(x=>x.day===n);if(!h)return;
 player.x=h.x+h.w/2;player.y=h.y+h.h+24;
 player.dir='up';
 camera.x=clamp(player.x-W/2,0,WORLD_W-W);
 camera.y=clamp(player.y-H/2,0,WORLD_H-H);
 selectedZone=region();if(zoneLabel)zoneLabel.textContent=selectedZone.toUpperCase();
 checkHouse();persist();
}
mapButton?.addEventListener('click',dayFinder);
mapClose?.addEventListener('click',()=>{mapOverlay.hidden=true});
mapOverlay?.addEventListener('click',e=>{if(e.target===mapOverlay)mapOverlay.hidden=true});
enter.addEventListener('click',()=>{if(scene==='village')enterHouse()});
leave.addEventListener('click',leaveHouse);
play.addEventListener('click',()=>{
 if(!inside||!calendar.isUnlocked(inside.day))return;
 const game=calendar.gameForDay(inside.day);if(!game)return;
 visited.add(inside.day);persist();location.href=game.url;
});
document.querySelectorAll('[data-direction]').forEach(button=>{
 const direction=button.dataset.direction;
 button.addEventListener('pointerdown',e=>{e.preventDefault();held.add(direction);button.setPointerCapture(e.pointerId)});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>held.delete(direction));
 button.addEventListener('contextmenu',e=>e.preventDefault());
});
addEventListener('keydown',e=>{
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter'].includes(e.key))e.preventDefault();
 if(e.repeat&&(e.key===' '||e.key==='Enter'))return;
 keys.add(e.key.toLowerCase());
 if((e.key===' '||e.key==='Enter')&&scene==='village'&&mapOverlay.hidden)enterHouse();
 if(e.key==='Escape'){if(!mapOverlay.hidden)mapOverlay.hidden=true;else if(scene==='interior')leaveHouse();}
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>{keys.clear();held.clear()});
function resize(){
 const r=document.querySelector('.screenBezel').getBoundingClientRect();
 const scale=Math.max(.25,Math.min((r.width-14)/W,(r.height-14)/H,2));
 canvas.style.width=Math.floor(W*scale)+'px';
 canvas.style.height=Math.floor(H*scale)+'px';
}
function tick(time){
 const dt=Math.min(.05,Math.max(0,(time-last)/1000));last=time;now=time;
 if(active){update(dt);render();}
 requestAnimationFrame(tick);
}
window.AdventVillage={
 setActive(v){active=!!v;if(!active&&scene==='interior')leaveHouse();if(active)resize()},
 focusHouse,
 getVisitedCount(){return visited.size},
 getHouseCount(){return houses.length},
 getPlayerPosition(){return {x:player.x,y:player.y}},
 getZone(){return region()}
};
resize();addEventListener('resize',resize);
window.visualViewport?.addEventListener('resize',resize);
camera.x=clamp(player.x-W/2,0,WORLD_W-W);
camera.y=clamp(player.y-H/2,0,WORLD_H-H);
if(zoneLabel)zoneLabel.textContent=region().toUpperCase();
if(dayCounter)dayCounter.textContent='24 DOORS';
checkHouse();
const villageProvider=window.VillagePixelAssets;
if(!villageProvider){throw new Error('Christmas Village source sprite pack was not loaded');}
Promise.all([villageProvider.ready,window.WorldBuilderExtraAssets?.ready||Promise.resolve(null),atlasReady])
.then(([v,t])=>{
 villageArt=v;christmasNPCs=t;
 // Verify the original 4-direction sheet is present before allowing game movement.
 const meta=v.metadata('character.png');
 if(meta.width!==256||meta.cell?.width!==16)throw new Error('16-frame village player spritesheet invalid');
 buildTerrainCache();
 requestAnimationFrame(tick);
}).catch(err=>{
 console.error('Advent art asset error:',err);artError=err;
 prompt.textContent='Christmas artwork could not load. Please refresh the page.';
 prompt.classList.add('visible');
});
})();