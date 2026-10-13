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
const TILE_URL=GB+'workshop-watch/assets/vendor/gherwit/winter/Winter-Download/Winter-tiles.png';
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
atlas.onload=()=>{image=atlas;ready=true;buildTerrainCache();};
atlas.onerror=()=>{ready=false;buildTerrainCache();};
atlas.src=TILE_URL;
let terrain=null;
function atlasTile(col,row,dx,dy,w=16,h=16){
 if(!image)return false;
 ctx.drawImage(image,col*16,row*16,16,16,Math.round(dx),Math.round(dy),w,h);
 return true;
}
function drawGroundTile(gx,gy){
 const x=gx*T,y=gy*T,p=paths.has(key(gx,gy));
 if(ready){
   atlasTile(p?7:12,1,x,y);
   if(!p&&hash(gx,gy)>.89)atlasTile(hash(gx+30,gy)>0.5?1:0,1,x,y);
   if(p){
     const n=paths.has(key(gx,gy-1)),s=paths.has(key(gx,gy+1)),w=paths.has(key(gx-1,gy)),e=paths.has(key(gx+1,gy));
     // Ground-edge cells from the verified Gherwit 9-slice path atlas.
     const col=w?(e?7:8):6,row=n?(s?1:2):0;
     if(!n||!s||!w||!e)atlasTile(col,row,x,y);
   }
 }else{
   ctx.fillStyle=p?'#d8c4a8':(hash(gx,gy)>.82?'#c5dbe9':'#deeaf5');ctx.fillRect(x,y,T,T);
   if(!p&&hash(gx+7,gy)>.78){ctx.fillStyle='#f6fcff';ctx.fillRect(x+4,y+5,5,2);ctx.fillRect(x+8,y+9,3,2)}
 }
}
function buildTerrainCache(){
 terrain=document.createElement('canvas');terrain.width=WORLD_W;terrain.height=WORLD_H;
 const old=ctx;
 const ground=terrain.getContext('2d');ground.imageSmoothingEnabled=false;
 // Draw once at world resolution, never recreate every game frame.
 for(let gy=0;gy<gridY;gy++)for(let gx=0;gx<gridX;gx++){
   const x=gx*T,y=gy*T,p=paths.has(key(gx,gy));
   if(ready){
     let col=p?7:12,row=1;
     if(!p&&hash(gx,gy)>.9){col=hash(gx+30,gy)>.5?1:0;row=1}
     if(p){
       const n=paths.has(key(gx,gy-1)),s=paths.has(key(gx,gy+1)),w=paths.has(key(gx-1,gy)),e=paths.has(key(gx+1,gy));
       col=w?(e?7:8):6;row=n?(s?1:2):0;
     }
     ground.drawImage(image,col*16,row*16,16,16,x,y,T,T);
   }else{ground.fillStyle=p?'#ddc5a4':'#d8e9f4';ground.fillRect(x,y,T,T)}
 }
 // Winter creek: water with an icy shore, later covered by bridges.
 ground.fillStyle='#91d5ec';ground.fillRect(river.x,river.y,river.w,river.h);
 ground.fillStyle='#66b8da';ground.fillRect(river.x+2,river.y+9,river.w-4,river.h-18);
 for(let n=0;n<62;n++){const x=river.x+hash(n,41)*river.w,y=river.y+12+hash(83,n)*54;ground.fillStyle=n%3===0?'#e8ffff':'#9cdeee';ground.fillRect(Math.floor(x),Math.floor(y),7,2);}
 for(let edge of [river.y,river.y+river.h-5]){ground.fillStyle='#effaff';for(let x=river.x;x<river.x+river.w;x+=16)ground.fillRect(x,edge+Math.round(hash(x,edge)*4),13,4);}
 // Proper wooden bridge instead of a clear route painted across the water.
 ground.fillStyle='#293b48';ground.fillRect(bridge.x-2,bridge.y-4,bridge.w+4,bridge.h+8);
 ground.fillStyle='#94674c';ground.fillRect(bridge.x,bridge.y,bridge.w,bridge.h);
 for(let xx=bridge.x;xx<bridge.x+bridge.w;xx+=13){ground.fillStyle='#b9895d';ground.fillRect(xx,bridge.y,10,bridge.h);ground.fillStyle='#634635';ground.fillRect(xx+10,bridge.y,2,bridge.h)}
 ground.fillStyle='#e8f3ec';ground.fillRect(bridge.x,bridge.y,bridge.w,4);ground.fillRect(bridge.x,bridge.y+bridge.h-4,bridge.w,4);
 // Main town square: cobbled plaza with tiny alternating stone pixels.
 for(let yy=690;yy<773;yy+=10)for(let xx=665;xx<818;xx+=13){
   ground.fillStyle=hash(xx,yy)>.5?'#dac2a6':'#ebd8b9';ground.fillRect(xx+(yy%20?4:0),yy,10,7);
 }
}
function pixel(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function outlineRect(x,y,w,h,fill,stroke=c.ink,thick=2){
 pixel(x-thick,y-thick,w+2*thick,h+2*thick,stroke);pixel(x,y,w,h,fill);
}
function treeAt(t){
 const sx=Math.round(t.x-camera.x),sy=Math.round(t.y-camera.y),size=48;
 if(sx< -55||sy< -60||sx>W+45||sy>H+40)return;
 if(ready){
   for(let n=0;n<9;n++){const m=WINTER_TREE[n],cx=n%3,cy=(n/3)|0;atlasTile(m[0],m[1],sx+cx*16,sy+cy*16)}
 }else{
   pixel(sx+20,sy+33,8,13,'#75543d');
   for(const [y,w] of [[3,18],[13,28],[24,40]]){
     pixel(sx+(48-w)/2-2,sy+y-1,w+4,14,'#233e3b');
     pixel(sx+(48-w)/2,sy+y,w,11,'#2d7864');
     pixel(sx+(48-w)/2+4,sy+y,w-10,3,'#edf9fb');
   }
 }
}
function lampAt(x,y){
 const sx=Math.round(x-camera.x),sy=Math.round(y-camera.y);
 pixel(sx+4,sy-24,3,25,'#253b46');pixel(sx+1,sy-28,9,11,'#1e3643');pixel(sx+3,sy-26,5,7,'#ffd47d');
 pixel(sx,sy-29,11,3,'#243b44');pixel(sx+3,sy-32,5,3,'#e4eced');
}
function fenceAt(x,y,count=4){
 const sx=x-camera.x,sy=y-camera.y;
 for(let i=0;i<count;i++){const xx=Math.round(sx+i*12);pixel(xx,sy-7,4,18,'#503c31');pixel(xx+1,sy-9,3,3,'#f6fbfa');}
 pixel(sx,sy-4,count*12,3,'#9e7051');pixel(sx,sy+4,count*12,3,'#77503b');
}
function signAt(s){
 const x=Math.round(s.x-camera.x),y=Math.round(s.y-camera.y);
 pixel(x+19,y-7,4,28,'#614533');outlineRect(x-17,y-18,76,18,'#d5a874','#42372d',2);
 pixel(x-12,y-16,67,2,'#fff1bc');ctx.fillStyle='#283a39';ctx.font='bold 6px monospace';ctx.textAlign='center';ctx.fillText(s.label,x+22,y-6);
}
function gift(x,y,tone){
 outlineRect(x,y,12,12,tone,'#384653',1);pixel(x+5,y,3,12,'#f8cf78');pixel(x,y+5,12,3,'#f8cf78');pixel(x+3,y-3,4,4,'#f9e6af');pixel(x+7,y-3,4,4,'#f9e6af');
}
function christmasTree(x,y){
 const px=x-camera.x,py=y-camera.y;
 pixel(px-4,py+25,8,20,'#62462f');
 for(const [yy,ww] of [[-42,23],[-22,38],[0,55],[15,69]]){
   pixel(px-ww/2-2,py+yy+4,ww+4,16,'#243e3b');
   pixel(px-ww/2,py+yy,ww,15,'#276951');pixel(px-ww/2+4,py+yy+1,ww-8,3,'#6b9f82');
   pixel(px-ww/2+6,py+yy+5,8,3,'#e9f8f4');
 }
 for(let i=0;i<13;i++){let dx=(hash(i,33)*50-25)|0,dy=(hash(43,i)*48-26)|0;pixel(px+dx,py+dy,4,4,i%3===0?'#fddf83':i%3===1?'#e05f67':'#a5cef7')}
 pixel(px-3,py-49,7,12,'#ffdf72');pixel(px-7,py-45,15,5,'#ffdf72');
 gift(px-28,py+30,'#c14b53');gift(px+17,py+29,'#367b6c');
}
function houseAt(h){
 const sx=Math.round(h.x-camera.x),sy=Math.round(h.y-camera.y);
 if(sx < -110||sy< -110||sx>W+80||sy>H+80)return;
 const col=palette[h.colour%palette.length],open=calendar.isUnlocked(h.day),done=visited.has(h.day);
 // shadow, cut-stone base, wooden sill and varied brick rows
 pixel(sx+4,sy+73,88,8,'#809caa');
 outlineRect(sx+5,sy+25,78,50,'#af876a','#293947',3);
 pixel(sx+8,sy+31,72,6,'#e8b689');
 for(let r=0;r<4;r++)for(let j=0;j<5;j++)if((j+r)%2===0)pixel(sx+9+j*14+(r%2?4:0),sy+40+r*8,9,2,'#997157');
 // roof silhouette + three snow drifts with stepped pixel edge
 pixel(sx-6,sy+24,100,9,'#294052');
 pixel(sx+2,sy+14,84,12,'#304b5b');
 pixel(sx+11,sy+6,66,11,'#304b5b');
 pixel(sx+23,sy-1,42,11,'#304b5b');
 pixel(sx+30,sy-7,28,9,'#304b5b');
 pixel(sx-5,sy+22,98,5,col);
 pixel(sx+3,sy+12,82,8,col);
 pixel(sx+12,sy+5,64,9,col);
 pixel(sx+22,sy-2,44,10,col);
 pixel(sx+29,sy-6,29,6,col);
 pixel(sx+10,sy+11,22,4,'#f4f7f5');pixel(sx+36,sy+2,29,5,'#f4f7f5');pixel(sx+56,sy+14,20,4,'#f4f7f5');
 pixel(sx-8,sy+23,100,5,'#eef7f7');pixel(sx-2,sy+27,18,4,'#ecf7f9');pixel(sx+59,sy+27,25,4,'#ecf7f9');
 // individual porch, lit windows, snow on ledges, and a numbered Advent plaque
 for(const wx of [sx+15,sx+63]){
   outlineRect(wx,sy+40,12,17,'#fbd886','#36404b',2);
   pixel(wx+5,sy+40,2,17,'#72543d');pixel(wx,sy+47,12,2,'#72543d');
   pixel(wx-2,sy+38,16,3,'#f4fcfb');
 }
 outlineRect(sx+35,sy+48,19,27,open?'#88543e':'#5a5361','#293944',2);
 pixel(sx+39,sy+52,11,19,'#50392f');pixel(sx+48,sy+63,2,2,'#fce199');
 pixel(sx+39,sy+52,11,4,done?'#4b9c77':open?'#ad704a':'#676c79');
 pixel(sx+38,sy+48,13,3,'#d5b27c');
 outlineRect(sx+32,sy+30,25,16,'#fff0c0','#634d3a',2);
 ctx.fillStyle='#563b30';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(h.day),sx+44,sy+38);
 // wreath and green garland, distinct doors
 pixel(sx+35,sy+57,5,7,'#1f6149');pixel(sx+38,sy+55,5,8,'#41885c');pixel(sx+39,sy+61,2,3,'#d95357');
 pixel(sx+9,sy+37,17,3,'#2f7353');pixel(sx+64,sy+37,17,3,'#2f7353');
 pixel(sx+7,sy+74,75,3,'#eef8fa');
 if(nearby===h&&scene==='village'){ctx.strokeStyle=open?'#ffe596':'#b4c5d8';ctx.lineWidth=2;ctx.strokeRect(sx+31,sy+45,27,35);}
 if(!open){pixel(sx+41,sy+64,7,6,'#9daab6');pixel(sx+42,sy+61,5,5,'#9daab6');pixel(sx+43,sy+63,3,4,'#5a677a')}
 if(done){pixel(sx+71,sy+10,7,7,'#f5db85');pixel(sx+73,sy+9,3,9,'#f5db85')}
}
function makePlayerSprites(){
 const out={};
 for(const d of ['down','up','left','right'])for(let frame=0;frame<2;frame++){
  const b=document.createElement('canvas');b.width=22;b.height=30;
  const g=b.getContext('2d');g.imageSmoothingEnabled=false;
  const p=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h)};
  p(5,27,13,3,'#4c6580');
  p(5,11,13,13,'#2a3e5a');
  p(6,12,11,13,'#ae4250');
  p(7,14,9,8,'#c95861');
  p(5,21+(frame?1:0),5,6,'#344765');p(13,22-(frame?1:0),5,5,'#344765');
  p(4,26+(frame?1:0),7,3,'#253345');p(12,26-(frame?1:0),7,3,'#253345');
  p(3,12,4,9,'#2d4159');p(17,12,3,9,'#2d4159');
  p(7,10,11,4,'#f9d480'); // scarf
  p(5,4,13,8,'#e3aa87'); // face and ears
  p(6,2,11,7,'#30435d'); // hair
  p(4,1,14,5,'#ae3e49');p(2,5,18,4,'#d44d57');p(13,0,4,3,'#f5f9f7');
  p(2,6,18,2,'#eef7f5');
  if(d==='down'){p(8,8,2,2,'#202f41');p(14,8,2,2,'#202f41');p(11,11,3,2,'#f8c6a0');}
  if(d==='up'){p(6,8,12,5,'#7b3042');p(7,14,10,4,'#a74b51');}
  if(d==='left'){p(5,8,2,2,'#203244');p(3,10,3,3,'#e7b38b');p(14,14,3,4,'#f1d481');}
  if(d==='right'){p(16,8,2,2,'#203244');p(18,10,3,3,'#e7b38b');p(5,14,3,4,'#f1d481');}
  out[d+frame]=b;
 }
 return out;
}
const playerSprites=makePlayerSprites();
function drawPlayer(){
 const x=Math.round(player.x-camera.x)-11,y=Math.round(player.y-camera.y)-29;
 const f=player.moving?(Math.floor(distance/9)%2):0;
 ctx.fillStyle='#4b709266';ctx.beginPath();ctx.ellipse(x+11,y+28,10,4,0,0,Math.PI*2);ctx.fill();
 ctx.drawImage(playerSprites[player.dir+f],x,y);
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
 if(!terrain){pixel(0,0,W,H,'#e1eff5');return;}
 ctx.drawImage(terrain,Math.round(camera.x),Math.round(camera.y),W,H,0,0,W,H);
 const render=[];
 for(const t of trees)render.push({y:t.y+46,draw:()=>treeAt(t)});
 for(const h of houses)render.push({y:h.y+h.h,draw:()=>houseAt(h)});
 for(const l of lamps)render.push({y:l.y,draw:()=>lampAt(l.x,l.y)});
 for(const s of signs)render.push({y:s.y,draw:()=>signAt(s)});
 for(const b of benches)render.push({y:b[1],draw:()=>{const x=b[0]-camera.x,y=b[1]-camera.y;pixel(x,y,34,5,'#634c40');pixel(x,y-8,34,5,'#a77556');pixel(x+4,y+5,4,8,'#77583f');pixel(x+26,y+5,4,8,'#77583f')}})
 for(const [x,y] of [[485,595],[900,590],[1040,812],[274,810],[1120,554]])render.push({y:y+12,draw:()=>fenceAt(x,y,4)});
 render.push({y:774,draw:()=>christmasTree(750,735)});
 render.push({y:player.y,draw:drawPlayer});
 render.sort((a,b)=>a.y-b.y);
 for(const r of render)r.draw();
}
function drawInterior(){
 pixel(0,0,W,H,'#67483c');pixel(0,0,W,174,'#9b7050');
 for(let y=175;y<H;y+=18){pixel(0,y,W,2,'#4d382e');for(let x=(y%36?10:0);x<W;x+=42)pixel(x,y+2,2,17,'#7a573e')}
 pixel(0,0,W,7,'#47372f');pixel(20,0,8,176,'#61442f');pixel(292,0,8,176,'#61442f');
 outlineRect(28,61,75,94,'#6a493b','#362d32',4);
 outlineRect(43,80,46,67,'#292b30','#57392e',3);
 pixel(49,124,33,20,'#cb5e32');pixel(56,106,18,39,'#ffbf62');pixel(62,110,10,23,'#fff0a8');
 outlineRect(22,53,88,9,'#f6d69d','#523c32',2);
 outlineRect(218,52,72,70,'#658faa','#2e3f50',4);
 pixel(252,53,5,68,'#32495d');pixel(219,85,70,5,'#32495d');pixel(220,108,68,13,'#edf6f5');
 // Table, parcel, rug, garlands, warm Christmas lighting.
 outlineRect(111,196,104,47,'#9d6749','#45362d',4);
 outlineRect(141,179,39,34,'#b94350','#493942',2);pixel(157,179,6,34,'#fbd78d');pixel(141,193,39,6,'#fbd78d');
 outlineRect(69,263,185,93,'#a33f4d','#553944',5);
 pixel(78,272,167,75,'#b85c5a');pixel(88,280,146,58,'#903947');
 for(let x=119;x<213;x+=14)pixel(x,26+(x%3),12,4,'#326e4f');
 for(let x=131;x<212;x+=27)pixel(x,33,4,5,'#d34f57');
 // Resident snowman from locally authorised scenery palette.
 pixel(255,203,4,20,'#5b4d46');pixel(238,209,20,5,'#604c41');
 ctx.fillStyle='#e8f2f1';ctx.beginPath();ctx.arc(257,208,14,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(257,186,10,0,Math.PI*2);ctx.fill();
 pixel(250,172,17,6,'#b04350');pixel(254,166,10,10,'#b04350');pixel(252,185,3,3,'#203444');pixel(262,185,3,3,'#203444');
 pixel(257,189,8,3,'#e5a259');
 // Player in interior and door at top.
 const frame=playerSprites['up0'];ctx.drawImage(frame,151,289,22,30);
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
 const r=stage.getBoundingClientRect();
 const maxHeight=r.height-195;
 const scale=Math.max(.56,Math.min((r.width-12)/W,maxHeight/H,2));
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
checkHouse();buildTerrainCache();requestAnimationFrame(tick);
})();