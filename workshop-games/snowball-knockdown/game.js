(function(){
"use strict";
const E=window.SnowballEngine,$=id=>document.getElementById(id);
const canvas=$("game"),ctx=canvas.getContext("2d",{alpha:false});
const pref="chipin-snowball-v1";
const PRESENTS={};
for(const [type,color] of [["light","red"],["medium","green"],["heavy","blue"]]){
 const img=new Image();
 img.src="../assets/gamebox/kenney/2d/Platformer%20Assets%20Holiday/present_small_"+color+".png";
 PRESENTS[type]=img;
}
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(pref+key))??fallback;}catch{return fallback;}};
const save=(key,v)=>{try{localStorage.setItem(pref+key,JSON.stringify(v));}catch{}};
let unlocked=read("-unlocked",1),best=read("-best",0),records=read("-stars",{}),sound=read("-sound",true);
let state=E.makeLevel(1),mode="intro",aim={x:210,y:325},holding=false,down=null,scale=1,ox=0,oy=0,dpr=1;
let sparks=[],toastUntil=0,toastText="",last=0,roundToken=0,announced=false;
const SNOW=Array.from({length:62},(_,i)=>({x:(i*103.71+47)%420,y:(i*127.23+81)%640,r:((i*7)%3)+.6,s:.7+(i%6)*.16}));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rand=(a,b)=>a+Math.random()*(b-a);
let audio=null;
function beep(kind){
 if(!sound)return;
 try{
  audio=audio||new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state==="suspended")audio.resume();
  const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();
  o.type=kind==="throw"?"sine":kind==="win"?"triangle":"square";
  const f=kind==="throw"?280:kind==="blast"?130:kind==="win"?660:kind==="lose"?170:410;
  o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(kind==="win"?990:Math.max(75,f*.55),t+.13);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(kind==="blast"?.11:.045,t+.012);
  g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.18);
 }catch{}
}
function vibrate(){if(navigator.vibrate)try{navigator.vibrate(15);}catch{}}
function msg(txt,seconds=1.1){toastText=txt;toastUntil=performance.now()+seconds*1000;$("message").textContent=txt;$("announcer").textContent=txt;}
function updateHUD(){
 $("level").textContent=String(state.level).padStart(2,"0");
 $("balls").textContent=state.balls+" / "+state.initialBalls;
 $("score").textContent=state.score.toLocaleString("en-GB");
 $("gifts").textContent=String(state.gifts.filter(g=>!g.cleared).length).padStart(2,"0");
}
function setOverlay(next){
 mode=next;const ov=$("overlay");ov.classList.add("show");
 $("resultMeta").hidden=true;$("secondBtn").hidden=false;$("levelBtn").hidden=false;
 const headline=$("overlayTitle"),k=$("overlayKicker"),p=$("overlayText"),play=$("playBtn"),secondary=$("secondBtn");
 if(next==="intro"){k.textContent="THE NORTH POLE WINTER FAIR";headline.innerHTML="SNOWBALL<br><em>KNOCKDOWN</em>";
  p.textContent="Knock every Christmas present off the shelves. Small gifts take one hit, medium gifts two, and heavy gifts three!";
  play.textContent="LET'S PLAY  ➜";secondary.textContent="HOW TO PLAY";$("levelBtn").textContent="CHOOSE LEVEL";}
 if(next==="menu"){k.textContent="TAKE A BREATHER";headline.innerHTML="GAME<br><em>PAUSED</em>";
  p.textContent="Snowballs at the ready. The North Pole fair is right where you left it.";
  play.textContent="RESUME  ➜";secondary.textContent="RESTART LEVEL";$("levelBtn").textContent="CHOOSE LEVEL";}
 if(next==="help"){k.textContent="HOW TO PLAY";headline.innerHTML="READY, AIM,<br><em>SNOW!</em>";
  p.innerHTML="Tap a present to throw, or drag to aim and release. <b>Small red:</b> 1 hit. <b>Medium green:</b> 2 hits. <b>Heavy blue:</b> 3 hits. Each snowball only hits what it touches. Knock every gift off the shelf before you run out! Keyboard: ← → aim · Space shoot.";
  play.textContent="GOT IT  ➜";secondary.textContent="RESTART LEVEL";$("levelBtn").hidden=true;}
 if(next==="win"){
  const stars=E.stars(state);
  if(state.level+1>unlocked){unlocked=state.level+1;save("-unlocked",unlocked);}
  records[state.level]=Math.max(stars,records[state.level]||0);save("-stars",records);
  best=Math.max(best,state.score);save("-best",best);updateHUD();
  k.textContent="THE SHELF IS CLEAR!";headline.innerHTML="BRILLIANT<br><em>SHOT!</em>";
  p.textContent=stars===3?"Snowball superstar! You cleared every Christmas present with snowballs to spare.":"All the presents knocked off! Could you manage it with fewer snowballs?";
  $("resultMeta").hidden=false;$("resultStars").textContent="★".repeat(stars)+"☆".repeat(3-stars);
  $("resultScore").textContent=state.score.toLocaleString("en-GB")+" PTS";
  play.textContent="NEXT LEVEL  ➜";secondary.textContent="PLAY AGAIN";$("levelBtn").textContent="CHOOSE LEVEL";
 }
 if(next==="lose"){k.textContent="SO CLOSE!";headline.innerHTML="OUT OF<br><em>SNOWBALLS</em>";
  p.textContent=state.gifts.filter(g=>!g.cleared).length+" present(s) left on the shelves. Aim carefully and save your snowballs for the heavier boxes.";
  $("resultMeta").hidden=false;$("resultStars").textContent="☆☆☆";$("resultScore").textContent=state.score.toLocaleString("en-GB")+" PTS";
  play.textContent="TRY AGAIN  ➜";secondary.textContent="HOW TO PLAY";$("levelBtn").textContent="CHOOSE LEVEL";
 }
 $("soundBtn").textContent=sound?"♪ SOUND ON":"♪ SOUND OFF";$("soundBtn").setAttribute("aria-pressed",String(sound));
}
function hideOverlay(){mode="playing";$("overlay").classList.remove("show");$("levelOverlay").hidden=true;canvas.focus({preventScroll:true});}
function start(level){roundToken++;state=E.makeLevel(level);save("-current",level);aim={x:210,y:325};holding=false;announced=false;sparks=[];hideOverlay();updateHUD();msg("READY, AIM, SNOW!",.9);}
function finish(kind){const token=roundToken;if(announced)return;announced=true;beep(kind);if(kind==="win")vibrate();
 setTimeout(()=>{if(token===roundToken&&mode==="playing")setOverlay(kind);},560);
}
$("playBtn").addEventListener("click",()=>{
 if(mode==="intro")start(Math.min(unlocked,read("-current",1)));
 else if(mode==="menu"){hideOverlay();}
 else if(mode==="help"){hideOverlay();}
 else if(mode==="win")start(state.level+1);
 else if(mode==="lose")start(state.level);
});
$("secondBtn").addEventListener("click",()=>{
 if(mode==="intro"||mode==="lose")setOverlay("help");
 else if(mode==="menu"||mode==="win")start(state.level);
 else if(mode==="help")start(state.level);
});
$("menuBtn").addEventListener("click",()=>{if(mode==="playing")setOverlay("menu");else if(mode==="menu")hideOverlay();});
$("restartBtn").addEventListener("click",()=>start(state.level));
$("soundBtn").addEventListener("click",()=>{sound=!sound;save("-sound",sound);$("soundBtn").textContent=sound?"♪ SOUND ON":"♪ SOUND OFF";$("soundBtn").setAttribute("aria-pressed",String(sound));if(sound)beep("tin");});
function renderLevels(){
 const grid=$("levelGrid");grid.replaceChildren();
 for(let i=1;i<=Math.min(36,Math.max(12,unlocked));i++){
  const b=document.createElement("button");b.type="button";b.disabled=i>unlocked;
  if(i===state.level)b.classList.add("selected");
  b.innerHTML=String(i).padStart(2,"0")+"<small>"+(i>unlocked?"LOCKED":records[i]?"★".repeat(records[i]):"○")+"</small>";
  b.addEventListener("click",()=>{save("-current",i);start(i);});
  grid.appendChild(b);
 }
}
$("levelBtn").addEventListener("click",()=>{renderLevels();$("levelOverlay").hidden=false;});
$("closeLevels").addEventListener("click",()=>{$("levelOverlay").hidden=true;});
function resize(){
 const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
 dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
 scale=Math.min(canvas.width/E.W,canvas.height/E.H);
 ox=(canvas.width-E.W*scale)/2;oy=(canvas.height-E.H*scale)/2;
}
window.addEventListener("resize",resize,{passive:true});
if("ResizeObserver" in window)new ResizeObserver(resize).observe(canvas);resize();
function point(e){const r=canvas.getBoundingClientRect();return{x:clamp(((e.clientX-r.left)*dpr-ox)/scale,8,E.W-8),y:clamp(((e.clientY-r.top)*dpr-oy)/scale,120,610)};}
function shoot(x,y){if(mode!=="playing")return;aim={x,y};if(E.launch(state,x,y)){beep("throw");updateHUD();}else if(!state.ball)msg("AIM ABOVE THE SNOWBALL",.8);}
canvas.addEventListener("pointerdown",e=>{if(mode!=="playing"||state.ball)return;down=point(e);holding=true;aim=down;try{canvas.setPointerCapture(e.pointerId);}catch{}});
canvas.addEventListener("pointermove",e=>{if(!holding||mode!=="playing")return;aim=point(e);});
canvas.addEventListener("pointerup",e=>{if(!holding||mode!=="playing")return;holding=false;const p=point(e);shoot(p.x,p.y);down=null;});
canvas.addEventListener("pointercancel",()=>{holding=false;down=null;});
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"||e.key.toLowerCase()==="p"){if(!$("levelOverlay").hidden){$("levelOverlay").hidden=true;return;}if(mode==="playing")setOverlay("menu");else if(mode==="menu")hideOverlay();}
 if(mode!=="playing")return;
 if(e.key==="ArrowLeft"||e.key==="a"){aim.x=clamp(aim.x-15,10,410);e.preventDefault();}
 if(e.key==="ArrowRight"||e.key==="d"){aim.x=clamp(aim.x+15,10,410);e.preventDefault();}
 if(e.key==="ArrowUp"){aim.y=clamp(aim.y-15,180,450);e.preventDefault();}
 if(e.key==="ArrowDown"){aim.y=clamp(aim.y+15,180,450);e.preventDefault();}
 if(e.key===" "||e.key==="Enter"){shoot(aim.x,aim.y);e.preventDefault();}
});
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function label(txt,x,y,size,color="#fff0d0",align="center"){
 ctx.font="900 "+size+"px 'Barlow Condensed',system-ui";ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(txt,x,y);
}
function scenery(t){
 const g=ctx.createLinearGradient(0,0,0,640);g.addColorStop(0,"#102a40");g.addColorStop(.48,"#375b61");g.addColorStop(1,"#7eada8");ctx.fillStyle=g;ctx.fillRect(0,0,420,640);
 ctx.fillStyle="#e9edd7";ctx.beginPath();ctx.arc(332,66,30,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#f9ebd5";ctx.globalAlpha=.1;ctx.beginPath();ctx.arc(332,66,50,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 for(let k=0;k<2;k++){
  const y=197+k*60;ctx.fillStyle=k?"#1b4651":"#284f59";ctx.beginPath();ctx.moveTo(-5,280);
  for(let i=0;i<10;i++){let x=i*54-12;ctx.lineTo(x,y+(i%2)*15);ctx.lineTo(x+23,y-55-(i%3)*12);ctx.lineTo(x+52,y+(i%2)*12);}
  ctx.lineTo(425,470);ctx.closePath();ctx.fill();
 }
 ctx.fillStyle="#143b3b";for(let i=0;i<9;i++){const x=i*53-8,h=80+(i*17)%54;ctx.beginPath();ctx.moveTo(x,365);ctx.lineTo(x+22,365-h);ctx.lineTo(x+46,365);ctx.closePath();ctx.fill();ctx.fillStyle="#f3f5e6";ctx.beginPath();ctx.moveTo(x+9,365-h+27);ctx.lineTo(x+22,365-h);ctx.lineTo(x+35,365-h+27);ctx.closePath();ctx.fill();ctx.fillStyle="#143b3b";}
 // Wooden shooting gallery posts and canvas awning.
 ctx.fillStyle="#704537";ctx.fillRect(17,91,17,414);ctx.fillRect(386,91,17,414);
 ctx.fillStyle="#a46e49";ctx.fillRect(20,92,7,413);ctx.fillRect(390,92,7,413);
 ctx.fillStyle="#76333c";rr(26,101,368,89,10);ctx.fill();
 ctx.fillStyle="#bd504d";rr(31,106,358,70,7);ctx.fill();
 for(let i=0;i<12;i++){ctx.fillStyle=i%2?"#f3dcc0":"#c45150";ctx.beginPath();ctx.moveTo(31+i*30,161);ctx.lineTo(61+i*30,161);ctx.lineTo(46+i*30,197);ctx.closePath();ctx.fill();}
 label("THE NORTH POLE",210,133,19,"#f5e9ca");label("SNOWBALL TOSS",210,162,37,"#fff4da");
 // Bulbs on a suspended wire.
 ctx.strokeStyle="#263a37";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(25,207);ctx.quadraticCurveTo(210,245,394,207);ctx.stroke();
 for(let i=0;i<11;i++){const x=33+i*35,y=208+Math.sin(i/10*Math.PI)*18;ctx.fillStyle=["#edb65f","#cf5557","#80cbb2"][i%3];ctx.shadowBlur=8;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(x,y,4.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
 // Falling snow.
 for(const s of SNOW){const x=(s.x+t*7*s.s)%430,y=(s.y+t*11*s.s)%640;ctx.fillStyle="rgba(241,251,251,.43)";ctx.beginPath();ctx.arc(x,y,s.r,0,6.29);ctx.fill();}
}
function platform(){
 ctx.fillStyle="#23383a";ctx.fillRect(24,414,370,103);
 // Display shelves only: decorative supports, never collision obstacles.
 for(const row of [1,2]){
  if(!state.gifts.some(g=>g.row===row))continue;
  const sy=E.SHELF_Y[row],left=39,right=381;
  ctx.fillStyle="#442f32";rr(left+2,sy+4,right-left,12,3);ctx.fill();
  const sg=ctx.createLinearGradient(0,sy,0,sy+11);
  sg.addColorStop(0,"#d4a06c");sg.addColorStop(1,"#6e4937");
  ctx.fillStyle=sg;rr(left,sy,right-left,11,3);ctx.fill();
  ctx.fillStyle="#eff8ec";ctx.fillRect(left+3,sy-2,right-left-6,3);
 }
 const wood=ctx.createLinearGradient(0,437,0,512);wood.addColorStop(0,"#c6915f");wood.addColorStop(.35,"#794938");wood.addColorStop(1,"#4a3434");
 ctx.fillStyle=wood;rr(23,437,373,78,5);ctx.fill();
 ctx.fillStyle="#d3a070";ctx.fillRect(27,457,367,5);ctx.fillRect(27,493,367,4);
 ctx.fillStyle="#513b32";for(let i=0;i<6;i++){const x=50+i*58;ctx.fillRect(x,461,3,32);ctx.beginPath();ctx.arc(x+2,450,3,0,6.29);ctx.fill();}
 ctx.fillStyle="#eaf7ef";ctx.beginPath();ctx.moveTo(18,439);ctx.lineTo(18,432);
 for(let x=20;x<=399;x+=17){ctx.quadraticCurveTo(x+8,425+Math.sin(x)*3,x+17,434);}ctx.lineTo(399,440);ctx.closePath();ctx.fill();
 // Foreground snow bank and snowball loading ramp.
 ctx.fillStyle="#d5e9e5";ctx.beginPath();ctx.moveTo(0,560);ctx.quadraticCurveTo(60,543,121,558);ctx.quadraticCurveTo(290,541,420,557);ctx.lineTo(420,640);ctx.lineTo(0,640);ctx.fill();
 ctx.fillStyle="#f5fcf3";ctx.beginPath();ctx.moveTo(0,573);ctx.quadraticCurveTo(192,556,420,574);ctx.lineTo(420,640);ctx.lineTo(0,640);ctx.fill();
 // Wooden ammunition box.
 ctx.fillStyle="#684735";rr(150,587,120,40,7);ctx.fill();
 ctx.fillStyle="#ad7848";rr(153,587,114,27,4);ctx.fill();ctx.fillStyle="#f3d0a0";ctx.fillRect(160,599,100,3);
 label("SNOWBALLS",210,612,15,"#392c2b");
}
function present(g){
 if(g.cleared)return;
 ctx.save();
 const x=g.x,y=g.y,size=g.size,angle=g.angle;
 ctx.fillStyle="#07192375";ctx.beginPath();
 ctx.ellipse(x+4,g.baseY+g.size*.54,g.fallen?size*.55:size*.48,5,0,0,Math.PI*2);ctx.fill();
 ctx.translate(x,y);ctx.rotate(angle);
 // Weight-coded, increasingly large presents: approved Kenney holiday sprites.
 const sprite=PRESENTS[g.type],pad=3;
 if(sprite&&sprite.complete&&sprite.naturalWidth>0){
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(sprite,-size*.5-pad,-size*.5-pad,size+pad*2,size+pad*2);
 }else{
  const c={light:"#d74f57",medium:"#40956f",heavy:"#5889c7"}[g.type];
  const dark={light:"#8f3342",medium:"#24634e",heavy:"#3c5c93"}[g.type];
  ctx.fillStyle=dark;rr(-size*.5,-size*.47,size,size*.94,5);ctx.fill();
  ctx.fillStyle=c;rr(-size*.5+4,-size*.44,size-8,size*.83,2);ctx.fill();
  ctx.fillStyle="#f8e7b6";ctx.fillRect(-3,-size*.44,6,size*.83);
  ctx.fillRect(-size*.5+4,-4,size-8,7);
  ctx.fillStyle="#fff4d9";ctx.beginPath();ctx.ellipse(-5,-size*.45,7,4,.4,0,6.29);ctx.ellipse(5,-size*.45,7,4,-.4,0,6.29);ctx.fill();
 }
 // Visible, distinct mass labels, with dimmed labels on partly hit gifts.
 ctx.fillStyle="#102c35df";rr(-size*.45,size*.23,size*.9,17,5);ctx.fill();
 ctx.fillStyle="#f6deb1";ctx.font="900 11px 'Barlow Condensed',system-ui";ctx.textAlign="center";
 ctx.fillText(g.type==="light"?"1 HIT":g.type==="medium"?"2 HITS":"3 HITS",0,size*.23+12);
 if(!g.fallen&&g.damage>0){
  // Damage is visible: segments show how many hits are still required.
  const count=Math.ceil(g.needed/1.05);
  for(let i=0;i<count;i++){
   ctx.fillStyle=i<Math.floor(g.damage/1.05+.0001)?"#ffe1a5":"#1f344a";
   ctx.fillRect(-count*8/2+i*8,-size*.53,6,5);
  }
 }
 ctx.restore();
}
function snowball(x,y,r){
 ctx.save();
 ctx.fillStyle="#1b4d5988";ctx.beginPath();ctx.ellipse(x+3,y+r*.6,r*1.1,r*.38,0,0,6.29);ctx.fill();
 const g=ctx.createRadialGradient(x-r*.37,y-r*.4,1,x,y,r);
 g.addColorStop(0,"#fff");g.addColorStop(.47,"#edfaff");g.addColorStop(1,"#78b7cb");
 ctx.fillStyle=g;ctx.strokeStyle="#c4e4e9";ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x,y,r,0,6.29);ctx.fill();ctx.stroke();
 ctx.fillStyle="#ffffffb9";ctx.beginPath();ctx.arc(x-r*.3,y-r*.36,r*.22,0,6.29);ctx.fill();ctx.restore();
}
function snowflakes(){
 for(const f of sparks){
  ctx.globalAlpha=clamp(f.life/.7,0,1);
  ctx.fillStyle=f.color;ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.rot);
  ctx.fillRect(-f.r/2,-f.r/2,f.r,f.r);ctx.restore();
 }
 ctx.globalAlpha=1;
}
function launcher(){
 if(state.ball||mode!=="playing"){snowball(E.START.x,E.START.y,20);return;}
 ctx.save();
 const dx=aim.x-E.START.x,dy=aim.y-E.START.y,n=Math.hypot(dx,dy)||1;
 ctx.setLineDash([4,12]);ctx.lineDashOffset=-(state.clock*26)%16;ctx.strokeStyle="#fffbe0a8";ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(E.START.x,E.START.y);ctx.lineTo(E.START.x+dx/n*Math.min(n,430),E.START.y+dy/n*Math.min(n,430));ctx.stroke();ctx.setLineDash([]);
 ctx.strokeStyle="#ffe7a0";ctx.lineWidth=2;ctx.beginPath();ctx.arc(aim.x,aim.y,14,0,6.29);ctx.stroke();
 ctx.beginPath();ctx.moveTo(aim.x-21,aim.y);ctx.lineTo(aim.x-8,aim.y);ctx.moveTo(aim.x+8,aim.y);ctx.lineTo(aim.x+21,aim.y);ctx.moveTo(aim.x,aim.y-21);ctx.lineTo(aim.x,aim.y-8);ctx.moveTo(aim.x,aim.y+8);ctx.lineTo(aim.x,aim.y+21);ctx.stroke();
 ctx.restore();snowball(E.START.x,E.START.y,20);
}
function render(){
 if(!scale)return;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle="#142b32";ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.setTransform(scale,0,0,scale,ox,oy);
 scenery(state.clock);platform();
 [...state.gifts].sort((a,b)=>a.y-b.y).forEach(present);
 launcher();
 if(state.ball){
  const b=state.ball;
  b.trail.forEach((p,i)=>{ctx.globalAlpha=(i+1)/b.trail.length*.26;snowball(p[0],p[1],6+i/b.trail.length*7);});
  ctx.globalAlpha=1;
  snowball(b.x,b.y,clamp(11+(b.y-250)/23,8,23));
 }
 snowflakes();
 if(mode==="playing"&&!state.ball&&state.balls>0&&state.clock<5){label("AIM FOR THE PRESENTS",210,533,15,"#245863");}
}
function addParticles(x,y,kind){
 const color=kind==="topple"?"#ffdf9b":kind==="impact"?"#e6f6fc":"#e5f8fa",num=kind==="topple"?18:kind==="impact"?11:7;
 for(let i=0;i<num;i++){const a=i/num*Math.PI*2,v=rand(40,200);sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,r:rand(3,8),life:rand(.28,.86),color:i%4?"#e9f6e8":color,rot:rand(0,6.28)});}
 if(sparks.length>150)sparks.splice(0,sparks.length-150);
}
function tick(now){
 const dt=Math.min(.033,(now-last)/1000||0);last=now;
 if(mode==="playing"){
  E.step(state,dt);
  for(const ev of state.events){
   if(ev.kind==="impact"){addParticles(ev.x,ev.y,"impact");beep("impact");vibrate();
     if(ev.remaining>0)msg(ev.type==="heavy"?"HEAVY PRESENT!": "ONE MORE HIT!",.55);
   }
   if(ev.kind==="topple"){addParticles(ev.x,ev.y,"topple");beep("tin");}
   if(ev.kind==="clear")addParticles(ev.x,ev.y,"snow");
   if(ev.kind==="snow")addParticles(ev.x,ev.y,"snow");
   if(ev.kind==="win"){msg("SHELF CLEARED!",1.3);finish("win");}
   if(ev.kind==="lose"){msg("OUT OF SNOWBALLS!",1.3);finish("lose");}
  }
  updateHUD();
 }
 for(const f of sparks){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=190*dt;f.life-=dt;f.rot+=dt*5;}
 sparks=sparks.filter(f=>f.life>0);
 $("message").classList.toggle("on",now<toastUntil&&mode==="playing");
 render();requestAnimationFrame(tick);
}
setOverlay("intro");updateHUD();requestAnimationFrame(tick);
})();
