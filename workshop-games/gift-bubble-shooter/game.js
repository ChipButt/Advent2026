(() => {
'use strict';
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const W=480,H=760, LEFT=48, TOP=106, STEP=44, RISE=38, RADIUS=20, SHOOT_X=240, SHOOT_Y=684, DANGER=607;
const COLOURS=['#ef5e52','#6bc675','#62adeb','#f0c654','#b48ad9','#f38c50'];
const ASSET_ROOT='../assets/gamebox/kenney/2d/';
const GIFT_FILES=[
 ASSET_ROOT+'Platformer Assets Holiday/present_small_red.png',
 ASSET_ROOT+'Platformer Assets Holiday/present_small_green.png',
 ASSET_ROOT+'Platformer Assets Holiday/present_small_blue.png',
 ASSET_ROOT+'Platformer Assets Holiday/present_small_yellow.png',
 ASSET_ROOT+'Platformer Assets Holiday/present_small_lightBlue.png',
 ASSET_ROOT+'Platformer Assets Holiday/present_small_orange.png'
];
const image = src => { const i=new Image();i.src=src;return i; };
const gifts=GIFT_FILES.map(image);
const snowTree=image(ASSET_ROOT+'Background Elements Remastered/treePineSnow.png');
const mark=image(ASSET_ROOT+'Holiday Pack 2016/RTS pack/Retina/RTSobject_15.png');
const star=image(ASSET_ROOT+'Rolling Ball Assets/Retina/star.png');
const store={get(k,d){try{return JSON.parse(localStorage.getItem('gift-bubble-v1-'+k))??d}catch(_){return d}},set(k,v){try{localStorage.setItem('gift-bubble-v1-'+k,JSON.stringify(v))}catch(_){}}};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const rand=n=>Math.floor(Math.random()*n);
const fmt=n=>Math.floor(n).toLocaleString('en-GB');
let level=1,unlocked=clamp(Number(store.get('unlocked',1))||1,1,12),best=Number(store.get('best',0))||0;
let board=[],phase=0,score=0,misses=0,shots=0,combo=0,active=4,aim=-Math.PI/2,current=0,next=1;
let shot=null,particles=[],clock=0,last=0,mode='ready',sound=store.get('sound',true),audio=null,pointerActive=false,splashSeen=false;
let hintTimer=0;
const sheets=['startSheet','menuSheet','helpSheet','levelsSheet','resultSheet'];
const card = (r,c)=>board[r]?.[c]||null;
const widthAt=r=>9-((r+phase)&1);
const cell=(r,c)=>({x:LEFT+c*STEP+((r+phase)&1)*STEP/2,y:TOP+r*RISE});
const valid=(r,c)=>r>=0&&r<16&&c>=0&&c<widthAt(r);
function each(fn){for(let r=0;r<board.length;r++)for(let c=0;c<widthAt(r);c++)if(card(r,c))fn(board[r][c],r,c);}
function neighbours(r,c){
 const arr=[];
 for(let rr=r-1;rr<=r+1;rr++){
  if(rr<0||rr>=16)continue;
  for(let cc=Math.max(0,c-2);cc<=Math.min(8,c+2);cc++){
   if(!valid(rr,cc)||(rr===r&&cc===c))continue;
   const a=cell(r,c),b=cell(rr,cc);
   const d=Math.hypot(a.x-b.x,a.y-b.y);
   if(d<STEP+2)arr.push([rr,cc]);
  }
 }
 return arr;
}
function colourChoices(){
 const seen=new Set();
 each(b=>seen.add(b.k));
 return [...seen];
}
function pickColour(){
 const choices=colourChoices();
 return choices.length?choices[rand(choices.length)]:rand(active);
}
function countGifts(){let n=0;each(b=>{if(b.gift)n++});return n;}
function updateHud(){
 $('level').textContent=String(level).padStart(2,'0');
 $('score').textContent=fmt(score);
 $('gifts').textContent=countGifts();
 $('best').textContent=fmt(best);
}
function closeSheets(){sheets.forEach(s=>$(s).classList.remove('open'))}
function openSheet(s){closeSheets();$(s).classList.add('open')}
function hint(txt){
 $('hint').textContent=txt;$('hint').classList.add('show');
 clearTimeout(hintTimer);hintTimer=setTimeout(()=>$('hint').classList.remove('show'),1200);
}
function playSound(freq=620,duration=.10,kind='sine'){
 if(!sound)return;
 try{
  const A=window.AudioContext||window.webkitAudioContext;
  if(!A)return;
  audio=audio||new A();
  if(audio.state==='suspended')audio.resume().catch(()=>{});
  const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();
  o.type=kind;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(90,freq*.64),t+duration);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.065,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+duration+.01);
 }catch(_){}
}
function saveBest(){
 if(score>best){best=score;store.set('best',best)}
}
function makeBoard(n){
 level=n;active=Math.min(6,3+Math.ceil(n/3));phase=0;score=0;misses=0;shots=0;combo=0;
 board=[];particles=[];shot=null;aim=-Math.PI/2;
 const rows=Math.min(10,4+Math.ceil(n/2));
 const seed=rand(active);
 for(let r=0;r<rows;r++){
  board[r]=[];
  for(let c=0;c<widthAt(r);c++){
   // Pairs are intentionally grouped so first shots can form matches.
   let k=(Math.floor((c+((r&1)?1:0))/2)+Math.floor(r/2)+seed)%active;
   if(r>3&&Math.random()<.12)k=rand(active);
   board[r][c]={k,gift:false};
  }
 }
 const candidates=[];
 for(let r=1;r<rows;r++)for(let c=0;c<widthAt(r);c++)candidates.push([r,c]);
 const count=Math.min(13,3+Math.ceil(n*.7));
 for(let i=0;i<count&&candidates.length;i++){
  const at=rand(candidates.length),[r,c]=candidates.splice(at,1)[0];
  board[r][c].gift=true;
 }
 current=pickColour();next=pickColour();
 mode='playing';closeSheets();splashSeen=true;updateHud();
}
function addScore(n){score+=n;saveBest();updateHud();}
function visibleSheets(){return sheets.some(s=>$(s).classList.contains('open'))}
function pause(){
 if(mode!=='playing')return;
 mode='paused';$('soundBtn').textContent='SOUND: '+(sound?'ON':'OFF');openSheet('menuSheet');
}
function resume(){
 if(mode==='paused')mode='playing';
 closeSheets();last=performance.now();
}
function cluster(r,c,k,onlyMatching=true){
 const found=[],seen=new Set(),queue=[[r,c]];
 while(queue.length){
  const [a,b]=queue.pop(),key=a+':'+b;
  if(seen.has(key)||!card(a,b))continue;
  if(onlyMatching&&card(a,b).k!==k)continue;
  seen.add(key);found.push([a,b]);
  for(const nb of neighbours(a,b))queue.push(nb);
 }
 return found;
}
function supported(){
 const visited=new Set(),stack=[];
 for(let c=0;c<widthAt(0);c++)if(card(0,c))stack.push([0,c]);
 while(stack.length){
  const [r,c]=stack.pop(),key=r+':'+c;
  if(visited.has(key)||!card(r,c))continue;
  visited.add(key);
  neighbours(r,c).forEach(([a,b])=>{if(card(a,b))stack.push([a,b])});
 }
 return visited;
}
function burst(x,y,k,amount=9){
 for(let i=0;i<amount;i++){
  const a=Math.random()*Math.PI*2,sp=50+Math.random()*160;
  particles.push({type:'spark',x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.38+Math.random()*.30,max:.68,k});
 }
}
function detach(cells,falling){
 let presents=0;
 for(const [r,c] of cells){
  const b=card(r,c);if(!b)continue;
  const p=cell(r,c);board[r][c]=null;
  if(b.gift){
   presents++;
   particles.push({type:'gift',k:b.k,x:p.x,y:p.y,vx:(Math.random()-.5)*115,vy:-45,life:1.45,max:1.45,rotation:(Math.random()-.5)*.6});
  }
  if(falling){
   particles.push({type:'orb',k:b.k,x:p.x,y:p.y,vx:(Math.random()-.5)*95,vy:35,life:1.05,max:1.05});
  }else burst(p.x,p.y,b.k,7);
 }
 return presents;
}
function nearestSlot(x,y){
 let nearest=null,dist=Infinity;
 for(let r=0;r<=Math.min(15,board.length+1);r++){
  for(let c=0;c<widthAt(r);c++){
   if(card(r,c))continue;
   if(r!==0&&!neighbours(r,c).some(([a,b])=>card(a,b)))continue;
   const p=cell(r,c),d=(p.x-x)**2+(p.y-y)**2;
   if(d<dist){dist=d;nearest=[r,c]}
  }
 }
 return nearest;
}
function arrive(){
 const p=shot;if(!p)return;
 shot=null;
 const slot=nearestSlot(p.x,p.y);
 if(!slot){finish(false);return}
 const [r,c]=slot;
 while(board.length<=r)board.push([]);
 board[r][c]={k:p.k,gift:false};
 shots++;
 const matched=cluster(r,c,p.k);
 let removed=0,presents=0,dropped=0;
 if(matched.length>=3){
  presents+=detach(matched,false);removed+=matched.length;
  const roots=supported(),loose=[];
  each((b,rr,cc)=>{if(!roots.has(rr+':'+cc))loose.push([rr,cc])});
  dropped=loose.length;
  presents+=detach(loose,true);
  combo++;
  addScore(removed*20+dropped*35+presents*300+Math.max(0,combo-1)*40);
  misses=0;playSound(750+.07*removed*100,.18);
  if(presents)hint(presents+' PRESENT'+(presents===1?'':'S')+' SAVED!');
  else if(dropped>=5)hint('GREAT DROP!');
 }else{
  combo=0;misses++;
  playSound(245,.08,'triangle');
 }
 if(countGifts()===0){mode='clearing';setTimeout(()=>{if(mode==='clearing')finish(true)},550);return}
 if(misses>=Math.max(4,7-Math.floor(level/3))){
  misses=0;pushRow();hint('NEW ROW!');
 }
 const over=board.some((row,rr)=>row.some((b,c)=>b&&cell(rr,c).y>=DANGER-26));
 if(over)finish(false);
 current=next;next=pickColour();updateHud();
}
function pushRow(){
 phase^=1;
 board.unshift(Array.from({length:widthAt(0)},(_,c)=>({k:(Math.floor(c/2)+rand(2)+shots)%active,gift:false})));
 playSound(180,.22,'sawtooth');
}
function finish(won){
 if(mode==='win'||mode==='lose')return;
 shot=null;mode=won?'win':'lose';
 if(won){
  addScore(Math.max(0,180-shots*4)+level*45);
  if(level>=unlocked){unlocked=Math.min(12,level+1);store.set('unlocked',unlocked)}
  $('resultEyebrow').textContent='DELIVERY COMPLETE';
  $('resultTitle').textContent='All Gifts Rescued!';
  $('resultStars').textContent=shots<=15?'★★★':shots<=28?'★★☆':'★☆☆';
  $('resultMessage').textContent='Every present made it out of the bubbles.';
  $('nextBtn').textContent=level===12?'PLAY LEVEL 12 AGAIN':'NEXT LEVEL';
  playSound(870,.22);
 }else{
  $('resultEyebrow').textContent='SNOW LINE REACHED';
  $('resultTitle').textContent='Snowed Under!';
  $('resultStars').textContent='☆☆☆';
  $('resultMessage').textContent='The ornaments reached the snow line. Try a different angle!';
  $('nextBtn').textContent='TRY AGAIN';
  playSound(160,.5,'sawtooth');
 }
 $('resultScore').textContent=fmt(score);
 openSheet('resultSheet');
}
function shoot(){
 if(mode!=='playing'||shot||visibleSheets())return;
 const a=clamp(aim,-Math.PI+.12,-.12);
 shot={x:SHOOT_X,y:SHOOT_Y,vx:Math.cos(a)*750,vy:Math.sin(a)*750,k:current};
 playSound(550,.10,'triangle');
}
function swap(){
 if(mode!=='playing'||shot)return;
 [current,next]=[next,current];playSound(400,.06);
}
function setAim(x,y){
 const dx=x-SHOOT_X,dy=Math.min(-18,y-SHOOT_Y);
 aim=clamp(Math.atan2(dy,dx),-Math.PI+.12,-.12);
}
function point(e){
 const rect=canvas.getBoundingClientRect();
 return {x:(e.clientX-rect.left)*W/rect.width,y:(e.clientY-rect.top)*H/rect.height};
}
canvas.addEventListener('pointerdown',e=>{
 if(mode!=='playing'||shot||visibleSheets())return;
 const p=point(e);
 if(p.x>337&&p.y>650){swap();return}
 pointerActive=true;canvas.setPointerCapture(e.pointerId);setAim(p.x,p.y);
});
canvas.addEventListener('pointermove',e=>{if(pointerActive)setAim(point(e).x,point(e).y)});
canvas.addEventListener('pointerup',e=>{
 if(!pointerActive)return;
 pointerActive=false;
 setAim(point(e).x,point(e).y);shoot();
});
canvas.addEventListener('pointercancel',()=>{pointerActive=false});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if($('menuSheet').classList.contains('open'))resume();else if(mode==='playing')pause();return}
 if(visibleSheets())return;
 if(['ArrowLeft','ArrowRight',' ','Enter'].includes(e.key))e.preventDefault();
 if(e.key==='ArrowLeft')aim=clamp(aim-.068,-Math.PI+.12,-.12);
 if(e.key==='ArrowRight')aim=clamp(aim+.068,-Math.PI+.12,-.12);
 if(e.key===' '||e.key==='Enter')shoot();
 if(e.key.toLowerCase()==='p')pause();
 if(e.key.toLowerCase()==='r')makeBoard(level);
 if(e.key.toLowerCase()==='s')swap();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause()});
function step(dt){
 clock+=dt;
 if(mode==='playing'&&shot){
  // Small physics steps avoid tunnelling through the cluster at low frame rates.
  let remaining=Math.min(dt,.06);
  while(remaining>0&&shot){
   const t=Math.min(remaining,.007);remaining-=t;
   shot.x+=shot.vx*t;shot.y+=shot.vy*t;
   if(shot.x<LEFT-4){shot.x=LEFT-4;shot.vx=Math.abs(shot.vx)}
   if(shot.x>W-LEFT+4){shot.x=W-LEFT+4;shot.vx=-Math.abs(shot.vx)}
   let hit=shot.y<=TOP;
   if(!hit)each((b,r,c)=>{
    const p=cell(r,c);
    if((p.x-shot.x)**2+(p.y-shot.y)**2<(STEP-2)**2)hit=true;
   });
   if(hit)arrive();
  }
 }
 for(let i=particles.length-1;i>=0;i--){
  const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(p.type==='gift'||p.type==='orb')p.vy+=510*dt;
  if(p.life<=0||p.y>H+45)particles.splice(i,1);
 }
}
function roundedRect(x,y,w,h,r){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);
}
const flakes=Array.from({length:49},(_,i)=>({x:rand(W),y:rand(H),speed:9+rand(22),size:1+Math.random()*2}));
function paintBack(){
 const g=ctx.createLinearGradient(0,0,0,H);
 g.addColorStop(0,'#18464e');g.addColorStop(.6,'#154347');g.addColorStop(1,'#0d2938');
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.globalAlpha=.17;
 for(const [x,y,s] of [[15,155,1.2],[390,330,1.1],[80,470,.8]]){
  if(snowTree.complete&&snowTree.naturalWidth)ctx.drawImage(snowTree,x,y,110*s,170*s);
 }
 ctx.globalAlpha=1;
 const l=ctx.createRadialGradient(230,210,30,240,290,310);
 l.addColorStop(0,'#40817437');l.addColorStop(1,'#0c253100');
 ctx.fillStyle=l;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#d7edee';
 flakes.forEach(f=>{
  const y=(f.y+clock*f.speed)%H;
  ctx.globalAlpha=.12+f.size*.11;ctx.beginPath();ctx.arc(f.x,y,f.size,0,Math.PI*2);ctx.fill();
 });
 ctx.globalAlpha=1;
 // Game boundary and danger line use intentional contrast, not decoration.
 ctx.strokeStyle='#c4ecdf36';ctx.lineWidth=5;
 ctx.beginPath();ctx.moveTo(20,71);ctx.lineTo(20,644);ctx.moveTo(460,71);ctx.lineTo(460,644);ctx.stroke();
 ctx.lineWidth=2;ctx.setLineDash([12,9]);ctx.strokeStyle='#f2d5a2a3';
 ctx.beginPath();ctx.moveTo(25,DANGER);ctx.lineTo(455,DANGER);ctx.stroke();ctx.setLineDash([]);
 ctx.font='700 12px Fredoka, sans-serif';ctx.textAlign='center';
 ctx.fillStyle='#f6d6aa';ctx.fillText('SNOW LINE',240,DANGER+18);
 // The rail and bottom play area are framed in the same dark wood palette.
 const rail=ctx.createLinearGradient(0,646,0,H);rail.addColorStop(0,'#28665b');rail.addColorStop(1,'#132f36');
 ctx.fillStyle=rail;roundedRect(13,647,454,108,18);ctx.fill();
 ctx.strokeStyle='#8dc5a36a';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle='#0b2739a8';roundedRect(128,650,226,101,45);ctx.fill();
}
function drawPresent(k,x,y,size=24,rot=0){
 const im=gifts[k];if(!im||!im.complete||!im.naturalWidth)return;
 ctx.save();ctx.translate(x,y);ctx.rotate(rot);
 ctx.imageSmoothingEnabled=false;
 ctx.drawImage(im,-size/2,-size/2,size,size);ctx.imageSmoothingEnabled=true;
 ctx.restore();
}
function drawBall(k,x,y,r=RADIUS,hasGift=false){
 ctx.save();ctx.translate(x,y);
 ctx.shadowColor='#051a24a3';ctx.shadowBlur=5;ctx.shadowOffsetY=3;
 const g=ctx.createRadialGradient(-r*.35,-r*.47,r*.06,2,r*.1,r*1.2);
 g.addColorStop(0,'#ffffff');g.addColorStop(.12,COLOURS[k]);g.addColorStop(.73,COLOURS[k]);g.addColorStop(1,'#192d3d');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.shadowColor='transparent';
 ctx.lineWidth=2;ctx.strokeStyle='#f9fcf4ae';ctx.stroke();
 ctx.beginPath();ctx.ellipse(-r*.33,-r*.40,r*.30,r*.14,-.6,0,Math.PI*2);
 ctx.fillStyle='#ffffffa6';ctx.fill();
 ctx.fillStyle='#d1e6dd';roundedRect(-r*.24,-r-3,r*.48,5,2);ctx.fill();
 if(hasGift){
  ctx.beginPath();ctx.arc(0,1,r*.65,0,Math.PI*2);ctx.fillStyle='#10343a9c';ctx.fill();
  drawPresent(k,0,1,r*1.52);
 }
 ctx.restore();
}
function drawAim(){
 if(shot||mode!=='playing')return;
 const a=clamp(aim,-Math.PI+.12,-.12);
 let x=SHOOT_X,y=SHOOT_Y,vx=Math.cos(a)*7,vy=Math.sin(a)*7;
 ctx.fillStyle='#fffce6bd';
 let lastPoint={x,y};
 for(let i=0;i<103;i++){
  x+=vx;y+=vy;
  if(x<LEFT-4){x=2*(LEFT-4)-x;vx=Math.abs(vx)}
  if(x>W-LEFT+4){x=2*(W-LEFT+4)-x;vx=-Math.abs(vx)}
  let hit=y<=TOP;
  if(!hit)each((b,r,c)=>{const p=cell(r,c);if((x-p.x)**2+(y-p.y)**2<(STEP-2)**2)hit=true});
  if(hit)break;
  if(i%4===0){
   ctx.globalAlpha=clamp(.92-i*.006,.25,.92);
   ctx.beginPath();ctx.arc(x,y,2.6,0,Math.PI*2);ctx.fill();
  }
  lastPoint={x,y};
 }
 ctx.globalAlpha=1;
 ctx.strokeStyle='#fbdda087';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(SHOOT_X,SHOOT_Y+10);ctx.lineTo(SHOOT_X+Math.cos(a)*40,SHOOT_Y+Math.sin(a)*40);ctx.stroke();
}
function drawCannon(){
 // The muzzle is a functional cannon mount, with the real Kenney gift art on deck.
 const g=ctx.createRadialGradient(SHOOT_X,710,4,SHOOT_X,710,68);
 g.addColorStop(0,'#619e83');g.addColorStop(1,'#0e333e');
 ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(SHOOT_X,722,60,26,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#c3d7c8';ctx.beginPath();ctx.ellipse(SHOOT_X,728,33,13,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#c58f4e';roundedRect(204,728,72,20,9);ctx.fill();
 if(mark.complete&&mark.naturalWidth){
  ctx.save();ctx.globalAlpha=.84;ctx.imageSmoothingEnabled=false;ctx.drawImage(mark,18,672,83,77);ctx.imageSmoothingEnabled=true;ctx.restore();
 }
 ctx.font='700 12px Fredoka,sans-serif';ctx.textAlign='center';ctx.fillStyle='#e4edc6';ctx.fillText('NEXT / SWAP',379,676);
 ctx.fillStyle='#2b6660';roundedRect(343,680,76,67,16);ctx.fill();
 ctx.strokeStyle='#bfe6ca';ctx.lineWidth=2;ctx.stroke();
 drawBall(next,382,714,23);
 if(!shot)drawBall(current,SHOOT_X,SHOOT_Y,23);
}
function paint(){
 ctx.clearRect(0,0,W,H);paintBack();
 each((b,r,c)=>{const p=cell(r,c);drawBall(b.k,p.x,p.y,RADIUS,b.gift)});
 drawAim();drawCannon();
 if(shot)drawBall(shot.k,shot.x,shot.y,21);
 particles.forEach(p=>{
  ctx.save();ctx.globalAlpha=clamp(p.life/p.max,0,1);
  if(p.type==='gift')drawPresent(p.k,p.x,p.y,40,p.rotation+p.vx*.002);
  if(p.type==='orb')drawBall(p.k,p.x,p.y,18);
  if(p.type==='spark'){
   if(star.complete&&star.naturalWidth){ctx.drawImage(star,p.x-6,p.y-6,12,12)}
   else{ctx.fillStyle=COLOURS[p.k];ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill()}
  }
  ctx.restore();
 });
 if(mode==='paused'){ctx.fillStyle='#08242b60';ctx.fillRect(0,0,W,H)}
}
function frame(t){
 const dt=Math.min(.05,Math.max(0,(t-last)/1000||0));last=t;
 step(dt);paint();requestAnimationFrame(frame);
}
$('startBtn').addEventListener('click',()=>makeBoard(unlocked));
$('menuBtn').addEventListener('click',()=>{
 if(mode==='playing')pause();
 else if(mode==='paused')resume();
});
$('resumeBtn').addEventListener('click',resume);
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',resume));
$('soundBtn').addEventListener('click',()=>{sound=!sound;store.set('sound',sound);$('soundBtn').textContent='SOUND: '+(sound?'ON':'OFF');if(sound)playSound()});
$('helpBtn').addEventListener('click',()=>openSheet('helpSheet'));
$('helpDone').addEventListener('click',resume);
$('restartBtn').addEventListener('click',()=>makeBoard(level));
function showLevels(){
 const grid=$('levelGrid');grid.replaceChildren();
 for(let n=1;n<=12;n++){
  const btn=document.createElement('button');btn.textContent=n;btn.disabled=n>unlocked;
  btn.classList.toggle('selected',n===level);btn.setAttribute('aria-label','Level '+n+(n>unlocked?', locked':''));
  btn.addEventListener('click',()=>makeBoard(n));grid.appendChild(btn);
 }
 openSheet('levelsSheet');
}
$('levelBtn').addEventListener('click',showLevels);
$('resultLevelsBtn').addEventListener('click',showLevels);
$('levelsBack').addEventListener('click',()=>{
 if(mode==='win'||mode==='lose')openSheet('resultSheet');
 else resume();
});
$('nextBtn').addEventListener('click',()=>makeBoard(mode==='win'?Math.min(12,level+1):level));
$('retryBtn').addEventListener('click',()=>makeBoard(level));
$('startBtn').textContent='PLAY LEVEL '+unlocked;
$('best').textContent=fmt(best);
makeBoard(1);mode='ready';openSheet('startSheet'); // Preview an actual board behind the welcome sheet.
requestAnimationFrame(frame);
})();