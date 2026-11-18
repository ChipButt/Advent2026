/* Santa's Present Stack — GameBox arcade presentation */
(function(){
'use strict';
const {Game,COLS,ROWS,W,H}=window.PresentStackEngine;
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;
const WIDTH=360,HEIGHT=512,TILE=32,OX=20,OY=104;
const $=id=>document.getElementById(id);
const game=new Game();
const input={left:false,right:false,jump:false};
let started=false,paused=false,last=0,anim=0,particles=[],floaters=[],flash=0,shake=0,sound=true;
let audio=null;
const giftColors=['#d84e54','#3286c1','#4ea765','#e2a640','#9e72c4','#66bfd0'];
const giftFiles=['red','blue','green','orange','yellow','lightBlue'];
const gifts=giftFiles.map(color=>{
 const image=new Image();image.src=encodeURI('../assets/gamebox/kenney/2d/Platformer Assets Holiday/present_small_'+color+'.png');return image;
});
function getBest(){try{return Number(localStorage.getItem('gb-present-stack-best')||0)||0;}catch(_){return 0;}}
let best=getBest();
function storeBest(){if(game.score>best){best=game.score;try{localStorage.setItem('gb-present-stack-best',String(best));}catch(_){}}}
function tone(f=480,d=.07,type='square',gain=.035){
 if(!sound)return;
 try{
  const A=window.AudioContext||window.webkitAudioContext;
  if(!A)return;
  if(!audio)audio=new A();
  if(audio.state==='suspended')audio.resume();
  const o=audio.createOscillator(),v=audio.createGain(),n=audio.currentTime;
  o.type=type;o.frequency.setValueAtTime(f,n);o.frequency.exponentialRampToValueAtTime(Math.max(80,f*.64),n+d);
  v.gain.setValueAtTime(gain,n);v.gain.exponentialRampToValueAtTime(.0001,n+d);
  o.connect(v);v.connect(audio.destination);o.start(n);o.stop(n+d);
 }catch(_){}
}
function rect(g,x,y,w,h,color){g.fillStyle=color;g.fillRect(Math.floor(x),Math.floor(y),Math.ceil(w),Math.ceil(h));}
function line(g,x,y,x2,y2,color,width=1){g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(x+.5,y+.5);g.lineTo(x2+.5,y2+.5);g.stroke();}
function write(g,text,x,y,size,color,align='left'){
 g.textAlign=align;g.fillStyle=color;g.font='900 '+size+'px system-ui, sans-serif';g.fillText(text,x,y);
}
function buildBackdrop(){
 const bg=document.createElement('canvas');bg.width=WIDTH;bg.height=HEIGHT;
 const g=bg.getContext('2d');g.imageSmoothingEnabled=false;
 rect(g,0,0,WIDTH,HEIGHT,'#0d2832');
 // Wooden workshop upper wall, weathered paint, horizontal timber planks.
 for(let y=0;y<OY;y+=13){
  rect(g,0,y,WIDTH,12,y%26===0?'#30505a':'#385760');
  rect(g,0,y+11,WIDTH,2,'#213a43');
  for(let x=13+(y*7)%54;x<WIDTH;x+=57)rect(g,x,y+3,2,2,'#53717a');
 }
 for(let x=0;x<WIDTH;x+=57){
  rect(g,x,0,5,OY,'#183844');rect(g,x+3,0,2,OY,'#5d7b73');
 }
 // Shelves and trinkets on the workshop wall.
 rect(g,9,25,342,5,'#79503e');rect(g,9,30,342,4,'#3c2a2c');
 for(let x=28;x<=326;x+=75){
  rect(g,x,10,25,14,'#8b5e42');rect(g,x+2,11,21,10,'#c09267');
  rect(g,x+8,9,7,17,'#e0bc78');rect(g,x+11,10,2,15,'#f9e4a5');
 }
 // Mechanical gift chute, overhead with periodic warning stripes.
 rect(g,14,75,332,25,'#142f3a');rect(g,14,75,332,6,'#849e9f');
 for(let x=22;x<344;x+=18){rect(g,x,83,9,7,'#d1a75e');rect(g,x+9,83,9,7,'#244957');}
 rect(g,14,95,332,5,'#9b7d55');
 // The warehouse wall behind grid: dim contrast to foreground presents.
 rect(g,OX,OY,COLS*TILE,ROWS*TILE,'#1e3e47');
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
  const x=OX+c*TILE,y=OY+r*TILE;
  rect(g,x+1,y+1,30,30,(r+c)%2?'#21444a':'#264850');
  rect(g,x+4,y+2,1,27,'#2e5358');
  rect(g,x+30,y,1,TILE,'#193640');
  rect(g,x,y+31,TILE,1,'#193640');
  if((r*11+c*5)%7===0){rect(g,x+9,y+6,3,1,'#335c61');rect(g,x+15,y+24,4,1,'#32575b');}
 }
 // Window light columns without interfering with gift silhouettes.
 rect(g,OX+3*TILE+6,OY+2,3,ROWS*TILE-4,'#54716a11');
 rect(g,OX+7*TILE+13,OY+2,3,ROWS*TILE-4,'#54716a11');
 // Side beams, bolts, panelling.
 [8,343].forEach(x=>{
  rect(g,x,98,9,375,'#775944');rect(g,x+2,98,3,375,'#b38257');
  for(let y=113;y<470;y+=34){rect(g,x+2,y,3,3,'#eac17c');rect(g,x+3,y+1,1,1,'#5f5143');}
 });
 // Workshop floor: a roller conveyor at the foot of the playfield.
 rect(g,0,472,WIDTH,40,'#2a4652');rect(g,0,473,WIDTH,6,'#dbb36c');
 rect(g,0,481,WIDTH,18,'#405969');rect(g,0,501,WIDTH,11,'#122c35');
 for(let x=13;x<WIDTH;x+=28){
  rect(g,x,483,19,12,'#203d48');rect(g,x+2,485,15,7,'#91a2a2');
  rect(g,x+4,486,9,5,'#5a7982');rect(g,x+9,486,2,5,'#b2c4be');
 }
 return bg;
}
const backdrop=buildBackdrop();
function elfSprite(phase){
 const c=document.createElement('canvas');c.width=30;c.height=40;
 const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 const p=(x,y,w,h,col)=>rect(g,x,y,w,h,col);
 const step=phase%4,run=step===1?1:step===3?-1:0;
 // silhouette / hat, bells, curved tip
 p(7,3,13,2,'#1c4439');p(9,1,10,4,'#1b4537');p(12,0,7,2,'#2e8656');
 p(7,5,17,3,'#2b8551');p(5,7,18,3,'#27754b');
 p(5,7,9,2,'#54ae63');p(4,8,4,2,'#163e38');p(2,9,3,3,'#e8b64f');p(3,10,1,1,'#fff1a1');
 p(7,10,17,3,'#d9e9c8');p(8,13,16,11,'#482e2e');
 // Face, pointed ears, hair; highlights near left
 p(5,16,4,5,'#d18e72');p(23,16,4,5,'#cd846c');
 p(8,12,16,11,'#f0c19b');p(9,14,13,6,'#ffd5ac');
 p(9,12,13,2,'#503733');p(11,13,7,1,'#6c4336');
 p(10,17,2,2,'#27313b');p(19,17,2,2,'#27313b');
 p(15,19,3,2,'#b96f65');p(12,22,9,1,'#aa665d');
 p(9,19,2,1,'#ffc0ae');p(21,19,2,1,'#e4a08c');
 // Collar + tunic silhouette and sleeves.
 p(7,24,18,11,'#143e38');p(8,24,16,10,'#2d8559');
 p(9,25,13,6,'#3da269');p(12,24,5,3,'#faf4d9');
 p(3,26,6,5,'#277c56');p(23,26,5,5,'#277c56');
 p(3,29,5,4,'#bd4a48');p(24,29,5,4,'#bd4a48');
 p(9,32,14,3,'#be3e42');p(9,31,14,2,'#222f35');p(15,31,4,3,'#f3c464');
 p(16,32,2,1,'#fff2af');
 // Bouncy legs, striped stockings, shoes with pointed curls.
 p(9+run,35,5,3,'#d4e5cf');p(18-run,35,5,3,'#d4e5cf');
 p(9+run,35,2,2,'#b73742');p(19-run,35,2,2,'#b73742');
 p(6+run,37,9,2,'#403638');p(17-run,37,10,2,'#403638');
 p(4+run,37,5,2,'#277950');p(25-run,36,3,2,'#277950');
 p(5+run,36,2,1,'#f7ce67');p(26-run,35,2,1,'#f7ce67');
 return c;
}
const elfFrames=[0,1,2,3].map(elfSprite);
function drawGift(x,y,kind,alpha=1){
 const color=giftColors[(kind-1)%6],img=gifts[(kind-1)%6];
 ctx.save();ctx.globalAlpha=alpha;
 rect(ctx,x+3,y+27,27,5,'#081a2580');
 if(img.complete&&img.naturalWidth){
  ctx.drawImage(img,Math.round(x)+1,Math.round(y)+1,30,30);
 }else{
  // Artwork fallback while the repository's actual holiday sprite is loading.
  rect(ctx,x+2,y+5,28,25,'#132b38');rect(ctx,x+4,y+6,24,22,color);
  rect(ctx,x+6,y+7,20,5,'#ffffff48');rect(ctx,x+14,y+6,6,22,'#f9e6b0');
  rect(ctx,x+4,y+15,24,5,'#f9e6b0');rect(ctx,x+14,y+3,5,4,'#ffefd0');
 }
 ctx.restore();
}
function puff(x,y,color,n=8){
 for(let i=0;i<n;i++){
  const a=Math.PI*2*i/n+(Math.random()-.5)*.5,vel=30+Math.random()*70;
  particles.push({x,y,vx:Math.cos(a)*vel,vy:Math.sin(a)*vel-26,life:.35+Math.random()*.45,age:0,color,size:2+Math.random()*3});
 }
}
function feedback(events){
 for(const ev of events){
  if(ev.type==='land'){puff(OX+ev.x*TILE+16,OY+ev.y*TILE+26,'#e8c27e',4);tone(155,.06,'triangle',.011);}
  if(ev.type==='push'){puff(OX+ev.x*TILE+16,OY+ev.y*TILE+16,'#bce9d6',3);tone(310,.05,'triangle',.018);}
  if(ev.type==='smash'){puff(OX+ev.x*TILE+16,OY+ev.y*TILE+16,'#ffdf95',15);addFloat('+20',OX+ev.x*TILE+16,OY+ev.y*TILE);shake=3;tone(460,.12);}
  if(ev.type==='jump')tone(220,.06,'sine',.015);
  if(ev.type==='clear'){
   for(let x=OX+12;x<OX+COLS*TILE;x+=18)puff(x,OY+(ROWS-1)*TILE,'#ffe69b',5);
   addFloat('+'+ev.points,180,380);flash=.6;shake=7;tone(740,.20,'triangle',.065);
  }
  if(ev.type==='hurt'||ev.type==='hit'){shake=7;tone(130,.29,'sawtooth',.04);}
  if(ev.type==='over'){tone(120,.35,'triangle',.035);}
 }
}
function addFloat(text,x,y){floaters.push({text,x,y,age:0,life:.95});}
function updateFX(dt){
 flash=Math.max(0,flash-dt*2);shake=Math.max(0,shake-dt*15);
 for(const p of particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=140*dt;}
 particles=particles.filter(p=>p.age<p.life);
 for(const f of floaters){f.age+=dt;f.y-=22*dt;}
 floaters=floaters.filter(f=>f.age<f.life);
}
function draw(t){
 ctx.clearRect(0,0,WIDTH,HEIGHT);
 ctx.save();
 if(shake>0)ctx.translate(Math.round((Math.random()-.5)*shake),Math.round((Math.random()-.5)*shake));
 ctx.drawImage(backdrop,0,0);
 // Warm hanging bulbs: three-frame light variation.
 for(let x=20,i=0;x<360;x+=34,i++){
  const y=53+(i%3)*3;
  line(ctx,x-17,y-9,x,y,'#153a40',2);
  rect(ctx,x-3,y,6,3,'#1b3637');
  const warm=['#ffcb69','#d86d60','#9dd9bd'][i%3];
  rect(ctx,x-4,y+3,8,6,warm);
  ctx.fillStyle=warm;ctx.globalAlpha=.08+.05*Math.sin(t*2+i);
  ctx.fillRect(x-11,y,22,20);ctx.globalAlpha=1;
  rect(ctx,x-1,y+4,2,2,'#fff7d5');
 }
 // Indicator diamonds at the drop lane.
 for(let x=24;x<WIDTH-18;x+=32){
  rect(ctx,x,100,8,2,(Math.floor(t*3+x/32)%2)?'#c4a15c':'#5a7b75');
 }
 // Under-canvas world glows, moving present shadow, rolling floor highlights.
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
  const kind=game.board[r][c];
  if(kind)drawGift(OX+c*TILE,OY+r*TILE,kind);
 }
 for(const box of game.incoming){
  const x=OX+box.col*TILE,y=OY+box.y*TILE;
  rect(ctx,x+15,Math.max(OY,y-15),2,8,'#cbe9e488');
  drawGift(x,y,box.kind);
 }
 // Elf contact shadow and hand-authored walk-cycle sprite.
 const p=game.player,px=OX+p.x*TILE,py=OY+p.y*TILE;
 ctx.globalAlpha=.22;
 rect(ctx,px+3,Math.min(OY+ROWS*TILE-4,py+H*TILE-2),21,3,'#071a20');
 ctx.globalAlpha=1;
 if(p.invulnerable<=0||Math.floor(t*10)%2===0){
  const frame=p.grounded?Math.floor(p.walk)%4:1;
  const sprite=elfFrames[frame];
  ctx.save();
  if(p.face<0){ctx.translate(Math.round(px+W*TILE),0);ctx.scale(-1,1);ctx.drawImage(sprite,-2,Math.round(py+H*TILE-40),30,40);}
  else ctx.drawImage(sprite,Math.round(px-3),Math.round(py+H*TILE-40),30,40);
  ctx.restore();
 }
 // Controlled particles and crisp score sparks.
 for(const p of particles){
  ctx.globalAlpha=1-p.age/p.life;rect(ctx,p.x,p.y,p.size,p.size,p.color);
 }ctx.globalAlpha=1;
 for(const f of floaters){
  ctx.globalAlpha=1-f.age/f.life;
  ctx.strokeStyle='#19363f';ctx.lineWidth=3;
  ctx.textAlign='center';ctx.font='900 17px system-ui';ctx.strokeText(f.text,f.x,f.y);
  ctx.fillStyle='#fff0a2';ctx.fillText(f.text,f.x,f.y);
 }ctx.globalAlpha=1;
 if(flash>0){ctx.globalAlpha=flash*.22;rect(ctx,OX,OY,COLS*TILE,ROWS*TILE,'#fff6b9');ctx.globalAlpha=1;}
 ctx.restore();
}
function refreshHud(){
 $('score').textContent=String(game.score).padStart(5,'0');
 if($('best'))$('best').textContent=String(Math.max(best,game.score)).padStart(5,'0');
 $('shift').textContent=String(game.level).padStart(2,'0');
 $('lines').textContent=String(game.lines).padStart(2,'0');
 $('hearts').textContent=Array.from({length:3},(_,i)=>i<game.lives?'♥':'♡').join(' ');
}
function setOverlay(mode){
 const element=$('overlay');
 element.hidden=mode==='none';
 $('intro').hidden=mode!=='intro';$('paused').hidden=mode!=='pause';$('end').hidden=mode!=='end';
 if(mode==='end'){
  storeBest();$('finalScore').textContent=String(game.score).padStart(5,'0');
  $('finalLines').textContent=String(game.lines);$('finalBest').textContent=String(best).padStart(5,'0');
  $('endTitle').textContent=game.lines>0?'SHIFT COMPLETE':'END OF SHIFT';
 }
 refreshHud();
}
function start(){
 game.reset();particles=[];floaters=[];flash=0;shake=0;
 started=true;paused=false;input.left=false;input.right=false;input.jump=false;
 setOverlay('none');tone(650,.12,'triangle');
}
function pauseGame(){
 if(!started||game.status==='over')return;
 paused=!paused;input.left=false;input.right=false;input.jump=false;
 setOverlay(paused?'pause':'none');
}
function frame(now){
 if(!last)last=now;
 const dt=Math.min(.035,Math.max(0,(now-last)/1000));last=now;anim+=dt;
 if(started&&!paused&&game.status==='playing'){
  game.step(dt,input);input.jump=false;
  const events=game.drainEvents();feedback(events);
  if(game.status==='over'){started=false;setOverlay('end');}
  refreshHud();
 }
 updateFX(dt);draw(anim);requestAnimationFrame(frame);
}
for(const btn of document.querySelectorAll('[data-hold]')){
 const key=btn.dataset.hold;
 function down(e){e.preventDefault();if(!started||paused)return;btn.classList.add('held');if(key==='jump')input.jump=true;else input[key]=true;try{btn.setPointerCapture(e.pointerId);}catch(_){}}
 function up(e){e.preventDefault();btn.classList.remove('held');if(key!=='jump')input[key]=false;}
 btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);
 btn.addEventListener('pointercancel',up);btn.addEventListener('lostpointercapture',()=>{btn.classList.remove('held');if(key!=='jump')input[key]=false;});
}
document.addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();
 if(['arrowleft','arrowright','arrowup',' ','a','d','w','p','escape'].includes(k))e.preventDefault();
 if(k==='arrowleft'||k==='a')input.left=true;
 if(k==='arrowright'||k==='d')input.right=true;
 if((k==='arrowup'||k==='w'||k===' ')&&!e.repeat)input.jump=true;
 if((k==='p'||k==='escape')&&!e.repeat)pauseGame();
});
document.addEventListener('keyup',e=>{
 const k=e.key.toLowerCase();
 if(k==='arrowleft'||k==='a')input.left=false;
 if(k==='arrowright'||k==='d')input.right=false;
});
window.addEventListener('blur',()=>{input.left=false;input.right=false;if(started&&!paused)pauseGame();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!paused)pauseGame();});
$('start').addEventListener('click',start);
$('again').addEventListener('click',start);
$('resume').addEventListener('click',pauseGame);
$('pauseButton').addEventListener('click',pauseGame);
$('soundButton').addEventListener('click',()=>{sound=!sound;$('soundButton').textContent=sound?'SOUND ON':'SOUND OFF';});
refreshHud();setOverlay('intro');requestAnimationFrame(frame);
})();
