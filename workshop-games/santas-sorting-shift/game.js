/* Santa's Sorting Shift — original pixel-art workshop, drag-and-drop arcade. */
(() => {
"use strict";
const {SortingShift,MAX_SHIFT}=window.SortingShiftEngine||{};
if(!SortingShift)throw Error("Sorting Shift engine missing");
const $=id=>document.getElementById(id);
const canvas=$("world"),ctx=canvas.getContext("2d",{alpha:false});
ctx.imageSmoothingEnabled=false;
const W=360,H=540,game=new SortingShift();
// Local-only, read-only test telemetry keeps drag tests accurate as belt speed changes.
if(location.hostname==="127.0.0.1"||location.hostname==="localhost"){
 window.__sortingShiftTest=()=>({status:game.status,level:game.level,speed:game.rule?.speed,items:game.items.map(i=>({id:i.id,x:i.x,y:i.y,type:i.type,held:i.held}))});
}
const C={ink:"#102936",wood:"#79503a",woodDark:"#4a302c",woodLight:"#b98253",gold:"#ffd983",cream:"#ffefd0",light:"#c7ebdf",green:"#329978",red:"#d2534a",steel:"#829a9b",dark:"#071c2b"};
const binList=[
 {id:"gift",x:13,w:106,color:"#54ba8c",dark:"#1a5d51",text:"PRESENTS"},
 {id:"coal",x:127,w:106,color:"#e27862",dark:"#843d40",text:"COAL"},
 {id:"express",x:241,w:106,color:"#f3c56a",dark:"#966532",text:"EXPRESS"}
];
const giftColors=["red","blue","green","orange","yellow","lightBlue"];
const giftImages=giftColors.map(name=>{const im=new Image();im.src="../assets/gamebox/kenney/2d/Platformer%20Assets%20Holiday/present_small_"+name+".png";return im;});
const ui={score:$("score"),shift:$("shift"),streak:$("streak"),lives:$("lives"),timer:$("timer"),mission:$("mission"),progressLabel:$("progressLabel"),progressTrack:$("progressTrack"),progressFill:$("progressFill"),toast:$("toast"),overlay:$("overlay"),kicker:$("menuKicker"),title:$("overlayTitle"),text:$("menuText"),stats:$("menuStats"),bestMenu:$("bestMenu"),primary:$("primaryButton"),secondary:$("secondaryButton"),sound:$("soundButton"),pause:$("pauseButton"),announce:$("announce")};
const STORAGE="gamebox.santasSortingShift.v1";
let save={best:0,unlocked:1,sound:true};
try{const loaded=JSON.parse(localStorage.getItem(STORAGE)||"null");if(loaded&&typeof loaded==="object"){save.best=Math.max(0,Number(loaded.best)||0);save.unlocked=Math.min(MAX_SHIFT,Math.max(1,Number(loaded.unlocked)||1));save.sound=loaded.sound!==false;}}catch(_){}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(save));}catch(_){}}
let screen="home",helpFrom="home",drag=null,particles=[],floaters=[],glow=0,impact=0,last=0,phase=0,feedbackTimer=null,audio=null,scene;
function rect(g,x,y,w,h,col){g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
function line(g,x,y,xx,yy,col,width=1){g.strokeStyle=col;g.lineWidth=width;g.beginPath();g.moveTo(Math.round(x)+.5,Math.round(y)+.5);g.lineTo(Math.round(xx)+.5,Math.round(yy)+.5);g.stroke();}
function text(g,s,x,y,sz=13,col=C.cream,align="center",weight=900){g.fillStyle=col;g.textAlign=align;g.textBaseline="middle";g.font=weight+" "+sz+"px 'Barlow Condensed', 'Arial Narrow', sans-serif";g.fillText(s,x,y);}
function hash(x,y){let n=(Math.imul(x+13,374761393)+Math.imul(y+7,668265263))|0;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;}
function circle(g,x,y,r,col){g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}
function createCoal(){
 const c=document.createElement("canvas");c.width=46;c.height=46;
 const g=c.getContext("2d");g.imageSmoothingEnabled=false;
 const poly=(points,color)=>{g.fillStyle=color;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
 poly([[4,26],[10,15],[19,10],[25,6],[34,12],[41,20],[39,33],[28,40],[13,37],[6,32]],"#101c2b");
 poly([[8,27],[13,18],[21,14],[25,10],[33,15],[38,21],[36,31],[27,36],[15,34]],"#303747");
 poly([[10,24],[16,18],[23,13],[30,16],[27,23],[16,27]],"#4f5865");
 poly([[15,29],[24,26],[34,21],[36,29],[28,34],[18,32]],"#242e3d");
 poly([[21,13],[25,10],[31,15],[28,18]],"#828b91");
 poly([[9,27],[12,20],[17,19],[15,26]],"#6b7781");
 rect(g,27,24,3,2,"#b5b7ae");rect(g,17,31,4,2,"#455363");rect(g,11,31,3,2,"#1c2532");
 return c;
}
const coal=createCoal();
function tree(g,x,y,s=1){
 const p=(xx,yy,w,h,col)=>rect(g,x+xx*s,y+yy*s,w*s,h*s,col);
 p(13,34,8,9,"#593c33");
 [[11,2,14,12],[7,12,22,13],[3,22,30,14]].forEach(([a,b,w,h],idx)=>{
   p(a,b,w,h,"#143e38");p(a+3,b+3,w-5,h-4,idx%2?"#2c7959":"#245f4d");
   p(a+6,b+5,4,3,"#449c73");p(a+w-9,b+8,3,3,"#0e302f");
 });
 p(15,-2,4,5,"#efcc77");p(13,0,8,2,"#ffe5a0");
 p(7,28,3,3,"#d55055");p(23,18,3,3,"#eac56c");p(15,8,3,3,"#e7ece3");
}
function makeBackdrop(){
 const c=document.createElement("canvas");c.width=W;c.height=H;
 const g=c.getContext("2d");g.imageSmoothingEnabled=false;
 rect(g,0,0,W,H,"#193942");
 // Fir-green workshop wall; hand-timbered beams and fine grain.
 for(let y=0;y<230;y+=20){
   rect(g,0,y,W,19,(Math.floor(y/20)%2)?"#3a5c57":"#31534e");
   rect(g,0,y+18,W,2,"#183c3c");
   for(let i=0;i<28;i++){
     const x=(i*83+Math.floor(y*1.9))%359;
     rect(g,x,y+4,13+(i%3)*6,1,"#628579");
     if(i%4===0)rect(g,x+10,y+12,9,1,"#244844");
   }
 }
 for(let x of [0,117,257,350]){
   rect(g,x,0,10,231,"#77513d");rect(g,x+2,0,3,231,"#bd895c");
   for(let y=11;y<231;y+=29)rect(g,x+3,y,3,3,"#d5b27b");
 }
 // Snowfall beyond the workshop windows.
 for(const [wx,wy,ww,hh] of [[22,56,94,101],[275,58,65,91]]){
   rect(g,wx-6,wy-7,ww+12,hh+14,"#624737");
   rect(g,wx-3,wy-4,ww+6,hh+8,"#dfbd80");
   rect(g,wx,wy,ww,hh,"#37778b");
   rect(g,wx,wy+hh*.56,ww,hh*.44,"#a5ccd4");
   for(let i=0;i<16;i++){
     const sx=wx+4+hash(i,wx)*Math.max(1,ww-8),sy=wy+5+hash(i,wy)*Math.max(1,hh-13);
     rect(g,sx,sy,2+(i%2),2,i%3?"#e5f4ed":"#a4dee9");
   }
   for(let i=0;i<7;i++){
     const px=wx+(i*23)%ww,peak=wy+hh*.63-(i%3)*7;
     rect(g,px,peak,15,wy+hh-peak,"#bfd6cf");
     rect(g,px+2,peak-4,6,5,"#e8f4e7");
   }
   rect(g,wx+Math.floor(ww/2)-3,wy,6,hh,"#ad8058");rect(g,wx,wy+Math.floor(hh/2)-2,ww,5,"#a5764c");
   rect(g,wx-7,wy+hh-2,ww+14,9,"#b47c54");rect(g,wx-8,wy+hh+6,ww+16,3,"#493333");
 }
 // Workshop shelf with parcel stacks and hanging tools.
 rect(g,137,67,115,7,"#c29660");rect(g,135,74,119,5,"#392c29");
 for(let i=0;i<5;i++){const x=142+i*21;rect(g,x,49-(i%2)*8,16,19+(i%2)*8,["#c75c52","#c79750","#4a9e83"][i%3]);rect(g,x+6,49-(i%2)*8,4,19+(i%2)*8,"#f4d89f");rect(g,x,58-(i%2)*7,16,3,"#f4d89f");}
 rect(g,149,110,113,8,"#aa7b54");rect(g,149,118,113,4,"#4d3330");
 for(let i=0;i<4;i++){const x=154+i*27;rect(g,x,94,20,16,"#8a5a47");rect(g,x+3,97,14,9,["#b95b4c","#d6a960","#559e86"][i%3]);rect(g,x+9,97,3,10,"#f2e0ae");}
 // Mechanical pipes, braced press and flywheel.
 rect(g,284,160,42,61,"#365b5d");rect(g,291,163,28,48,"#638b83");rect(g,286,169,4,45,"#203c40");
 rect(g,304,157,16,9,"#c39c60");rect(g,316,127,9,40,"#658e8e");rect(g,318,129,4,30,"#b2c7b8");
 circle(g,305,189,21,"#1d3e44");circle(g,305,189,17,"#b5aaa0");circle(g,305,189,13,"#47666b");
 for(let a=0;a<6;a++){const ang=a*Math.PI/3;line(g,305+Math.cos(ang)*4,189+Math.sin(ang)*4,305+Math.cos(ang)*12,189+Math.sin(ang)*12,"#ced0b6",3);}
 circle(g,305,189,5,"#dfc584");
 rect(g,126,133,137,73,"#253f43");rect(g,130,136,129,66,"#8c6147");rect(g,134,139,121,57,"#d8b57e");rect(g,139,143,111,48,"#254c49");
 text(g,"SANTA'S",195,158,14,"#ffdf9c");text(g,"PACKING LINE",195,178,15,"#f6e5c4");
 rect(g,142,186,104,2,"#569380");
 // Hanging festive bunting, garland and light sockets.
 line(g,8,25,351,24,"#174c41",3);
 for(let x=12;x<356;x+=13){
   const y=27+Math.round(Math.sin(x*.018)*8);
   rect(g,x,y,7,5,x%3?"#206b4b":"#3c8d61");
   rect(g,x+2,y+3,3,5,x%4?"#51ab71":"#bd484c");
 }
 // Wooden factory floor behind bins.
 rect(g,0,318,W,H-318,"#6c4936");
 for(let y=318;y<H;y+=24){
   rect(g,0,y,W,2,"#442f2b");
   rect(g,0,y+3,W,1,"#9e6a4b");
   for(let i=0;i<6;i++){
     const x=((i*91+(y%48)*8)%378);
     rect(g,x,y+8,23,1,"#80553c");
     rect(g,x+21,y+14,12,1,"#b07a54");
   }
 }
 // Side trusses and details, to frame the play surface.
 rect(g,0,206,11,318,"#583b32");rect(g,3,207,4,318,"#bd8959");
 rect(g,349,206,11,318,"#583b32");rect(g,351,207,4,318,"#bd8959");
 for(let y=210;y<534;y+=31){rect(g,3,y,4,4,"#d4bc84");rect(g,351,y,4,4,"#d4bc84");}
 // Scene props and workshop's side sacks.
 tree(g,9,454,.82);tree(g,319,463,.72);
 rect(g,117,500,127,10,"#55372e");rect(g,115,495,131,6,"#d4a56e");text(g,"THE NORTH POLE  ·  EST. 1823",180,518,11,"#e1c89f");
 return c;
}
scene=makeBackdrop();
function showToast(s,colour="#fff4cf"){
 ui.toast.textContent=s;ui.toast.style.color=colour;ui.toast.classList.add("visible");
 clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>ui.toast.classList.remove("visible"),720);
}
function sound(kind){
 if(!save.sound)return;
 try{
   const AC=window.AudioContext||window.webkitAudioContext;
   if(!AC)return;
   if(!audio)audio=new AC();
   if(audio.state==="suspended")audio.resume();
   const now=audio.currentTime;
   const notes=kind==="good"?[[620,.065],[830,.075]]:kind==="gold"?[[650,.07],[870,.08],[1060,.1]]:kind==="bad"?[[170,.13],[125,.18]]:kind==="clear"?[[520,.1],[660,.1],[820,.13],[1040,.21]]:[[240,.16]];
   notes.forEach(([freq,dur],i)=>{
     const o=audio.createOscillator(),v=audio.createGain(),start=now+i*.062;
     o.type=kind==="bad"?"sawtooth":"triangle";o.frequency.setValueAtTime(freq,start);o.frequency.exponentialRampToValueAtTime(Math.max(70,freq*.82),start+dur);
     v.gain.setValueAtTime(.0001,start);v.gain.exponentialRampToValueAtTime(kind==="bad"?.032:.052,start+.012);v.gain.exponentialRampToValueAtTime(.0001,start+dur);
     o.connect(v);v.connect(audio.destination);o.start(start);o.stop(start+dur+.005);
   });
 }catch(_){}
}
function uiUpdate(){
 ui.score.textContent=String(game.score).padStart(6,"0");
 ui.shift.textContent=String(game.level).padStart(2,"0")+" / 12";
 ui.streak.textContent="×"+(game.streak||0);
 ui.lives.textContent="♥ ".repeat(Math.max(0,game.lives??3)).trim()||"—";
 const sec=Math.ceil(game.timeLeft||0);ui.timer.textContent=Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0");
 ui.timer.style.color=sec<10?"#ff847c":"#ffdf9b";
 const required=game.rule?.quota||11;
 ui.progressLabel.textContent=(game.sorted||0)+" / "+required;
 ui.progressFill.style.width=Math.min(100,(game.sorted/required)*100)+"%";
 ui.progressTrack.setAttribute("aria-valuemax",required);
 ui.progressTrack.setAttribute("aria-valuenow",game.sorted||0);
 ui.mission.textContent="SHIFT "+String(game.level).padStart(2,"0")+" · "+("PRESENTS · COAL · EXPRESS");
}
function menu(kind){
 screen=kind;ui.overlay.hidden=false;drag=null;
 ui.bestMenu.textContent=save.best.toLocaleString("en-GB");
 ui.stats.hidden=false;ui.secondary.hidden=false;ui.sound.hidden=false;
 ui.kicker.textContent="NORTH POLE WORKSHOP";
 const set=(title,desc,primary,secondary)=>{ui.title.innerHTML=title;ui.text.innerHTML=desc;ui.primary.innerHTML=primary+' <span>➜</span>';ui.secondary.textContent=secondary};
 if(kind==="home"){
   ui.kicker.textContent="A NORTH POLE ORIGINAL";
   set("THE <em>CHRISTMAS</em><br>RUSH IS ON!","The belt starts fast! Sort presents, coal and glowing Express presents into the matching crates before they escape.",(save.unlocked>1?"CONTINUE SHIFT "+String(save.unlocked).padStart(2,"0"):"START SHIFT 01"),save.unlocked>1?"START FROM SHIFT 01":"HOW TO PLAY");
 }else if(kind==="pause"){
   ui.kicker.textContent="WORKSHOP BREAK";
   set("SHIFT <em>PAUSED</em>","Take a moment. The conveyor is stopped until you're ready to return.","RESUME SHIFT","HOW TO PLAY");
 }else if(kind==="cleared"){
   ui.kicker.textContent=game.level===MAX_SHIFT?"ALL TWELVE SHIFTS COMPLETE":"SHIFT COMPLETE";
   set(game.level===MAX_SHIFT?"CHRISTMAS <em>SAVED!</em>":"VERY <em>ELF-ICIENT!</em>","Sorted <b>"+game.sorted+"</b> parcels · best streak <b>×"+game.bestStreak+"</b><br>Shift score <b>"+game.score.toLocaleString("en-GB")+"</b>",game.level===MAX_SHIFT?"PLAY FROM SHIFT 01":"NEXT SHIFT "+String(game.level+1).padStart(2,"0"),"REPLAY THIS SHIFT");
 }else if(kind==="failed"){
   ui.kicker.textContent="WORKSHOP EMERGENCY";
   set("THE BELT <em>WON!</em>","You sorted <b>"+game.sorted+" / "+game.rule.quota+"</b> parcels this shift.<br>Don't let the workshop fall behind!","RETRY SHIFT "+String(game.level).padStart(2,"0"),"BACK TO TITLE");
 }else if(kind==="help"){
   ui.kicker.textContent="HOW TO PLAY";
   ui.stats.hidden=true;ui.sound.hidden=true;ui.secondary.hidden=true;
   set("SORT <em>FAST!</em>","<b>1.</b> Touch a parcel on the moving belt.<br><b>2.</b> Drag it into the matching crate below.<br><b>3.</b> Don't let parcels escape at the right!<br><br><b>GREEN</b> for presents · <b>RED</b> for coal.<br><b>GOLD</b> for glowing express presents from Shift 1.<br><br>Three mistakes end your shift.","GOT IT","");
 }
 ui.sound.textContent=save.sound?"♪ SOUND ON":"♪ SOUND OFF";ui.sound.setAttribute("aria-pressed",String(save.sound));
 ui.pause.textContent="Ⅱ";uiUpdate();
}
function start(level){
 game.start(level);particles=[];floaters=[];glow=0;impact=0;drag=null;
 screen="game";ui.overlay.hidden=true;ui.pause.textContent="Ⅱ";last=performance.now();uiUpdate();showToast("SHIFT "+String(game.level).padStart(2,"0")+" · GO!","#fff2c1");
 sound("clear");
}
function stop(){
 drag=null;game.pause();menu("pause");
}
function addParticles(x,y,col,n=12){
 for(let i=0;i<n;i++){
   const a=Math.random()*Math.PI*2,vel=35+Math.random()*95;
   particles.push({x,y,vx:Math.cos(a)*vel,vy:Math.sin(a)*vel-35,age:0,life:.4+Math.random()*.4,s:2+Math.random()*3,col});
 }
}
function floatText(s,x,y,col){floaters.push({s,x,y,col,age:0,life:1});}
function handle(events){
 for(const ev of events){
   if(ev.type==="correct"){
     const b=binList.find(x=>x.id===ev.itemType);
     const cx=b.x+b.w/2;
     addParticles(cx,390,b.color,14);floatText("+"+ev.points,cx,344,b.color);
     sound(ev.itemType==="express"?"gold":"good");
     if(ev.streak>2&&ev.streak%5===0)showToast(ev.streak+"× COMBO!","#ffe28a");
     glow=.4;
   }else if(ev.type==="wrong"||ev.type==="miss"){
     impact=.6;addParticles(ev.type==="miss"?329:180,285,"#ff7868",16);
     showToast(ev.type==="wrong"?"WRONG BIN! −1 CHANCE":"MISSED! −1 CHANCE","#ffa397");
     sound("bad");
   }else if(ev.type==="cleared"){
     save.best=Math.max(save.best,game.score);save.unlocked=Math.max(save.unlocked,Math.min(MAX_SHIFT,game.level+1));persist();
     sound("clear");showToast("SHIFT COMPLETE!","#ffe59a");menu("cleared");
   }else if(ev.type==="failed"){
     save.best=Math.max(save.best,game.score);persist();sound("bad");menu("failed");
   }
 }
 uiUpdate();
}
ui.primary.addEventListener("click",()=>{
 if(screen==="home")start(save.unlocked);
 else if(screen==="pause"){game.resume();screen="game";ui.overlay.hidden=true;last=performance.now();}
 else if(screen==="cleared")start(game.level===MAX_SHIFT?1:game.level+1);
 else if(screen==="failed")start(game.level);
 else if(screen==="help")menu(helpFrom);
});
ui.secondary.addEventListener("click",()=>{
 if(screen==="home"&&save.unlocked>1)start(1);
 else if(screen==="home"||screen==="pause"){helpFrom=screen;menu("help");}
 else if(screen==="cleared")start(game.level);
 else if(screen==="failed")menu("home");
});
ui.sound.addEventListener("click",()=>{save.sound=!save.sound;persist();ui.sound.textContent=save.sound?"♪ SOUND ON":"♪ SOUND OFF";ui.sound.setAttribute("aria-pressed",String(save.sound));if(save.sound)sound("good");});
ui.pause.addEventListener("click",()=>{
 if(screen==="game")stop();
 else if(screen==="pause"){game.resume();screen="game";ui.overlay.hidden=true;last=performance.now();}
});
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"||e.key.toLowerCase()==="p"){
   if(screen==="game")stop();
   else if(screen==="pause"){game.resume();screen="game";ui.overlay.hidden=true;last=performance.now();}
 }
});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&screen==="game")stop();});
function worldPoint(e){
 const b=canvas.getBoundingClientRect();
 return {x:(e.clientX-b.left)*(W/b.width),y:(e.clientY-b.top)*(H/b.height)};
}
// Match the visible crates, not only the centre of a parcel grabbed off-centre.
function binAt(x,y){
 // The clickable area follows the complete visible crate, including its opening
 // and base. Accept releases on the down arrow just above the rim as well.
 if(y<339||y>481)return null;
 return binList.find(b=>x>=b.x-2&&x<=b.x+b.w+2)||null;
}
function beginDrag(e,kind="pointer"){
 if(screen!=="game"||drag)return false;
 if(e.pointerType==="mouse"&&e.button!==0)return false;
 if(kind==="mouse"&&e.button!==0)return false;
 const p=worldPoint(e);
 let best=null,distance=44;
 for(const item of game.items){
  const d=Math.hypot(p.x-item.x,p.y-item.y);
  if(d<distance){distance=d;best=item;}
 }
 if(!best||!game.hold(best.id))return false;
 drag={
  id:best.id,pointer:kind==="pointer"?e.pointerId:null,
  kind:kind==="mouse"||e.pointerType==="mouse"?"mouse":"touch",
  x:p.x,y:p.y,pointerX:p.x,pointerY:p.y,
  dx:p.x-best.x,dy:p.y-best.y
 };
 // A desktop browser can abandon pointer capture during a mouse drag.
 // Keep the drag state until mouseup/pointerup instead of resetting it.
 if(kind==="pointer"){
  try{canvas.setPointerCapture?.(e.pointerId);}catch(_){}
 }
 // On desktop, allow native mouse compatibility events to fire; the
 // mouseup fallback cannot help if pointerdown suppresses those events.
 if(kind!=="pointer"||e.pointerType!=="mouse")e.preventDefault();
 return true;
}
function moveDrag(e,mouseFallback=false){
 if(!drag)return;
 if(mouseFallback){if(drag.kind!=="mouse")return;}
 else if(drag.pointer!==e.pointerId)return;
 const p=worldPoint(e);
 drag.pointerX=p.x;drag.pointerY=p.y;
 drag.x=Math.max(8,Math.min(W-8,p.x-drag.dx));
 drag.y=Math.max(10,Math.min(H-8,p.y-drag.dy));
 if(drag.kind!=="mouse")e.preventDefault();
}
function drop(e,cancelled=false,mouseFallback=false){
 if(!drag)return;
 if(mouseFallback){if(drag.kind!=="mouse")return;}
 else if(drag.pointer!==e.pointerId)return;
 const d=drag;drag=null;
 const p=worldPoint(e);
 // Desktop release position takes precedence over the off-centre item.
 // Retain the item's centre as a fallback for touch and mouse grabs.
 const b=!cancelled&&(binAt(p.x,p.y)||binAt(p.x-d.dx,p.y-d.dy)
   ||binAt(d.pointerX,d.pointerY)||binAt(d.x,d.y));
 if(d.pointer!==null){
  try{if(canvas.hasPointerCapture?.(d.pointer))canvas.releasePointerCapture(d.pointer);}catch(_){}
 }
 if(b){game.sort(d.id,b.id);handle(game.consume());}
 else game.release(d.id);
 e.preventDefault();
}
canvas.addEventListener("pointerdown",e=>beginDrag(e));
window.addEventListener("pointermove",e=>moveDrag(e));
window.addEventListener("pointerup",e=>drop(e));
window.addEventListener("pointercancel",e=>{if(drag?.kind!=="mouse")drop(e,true);});
// Mouse compatibility events cover desktop browsers that cancel or fail to
// deliver their pointerup when capture changes between canvas and window.
canvas.addEventListener("mousedown",e=>{if(!drag)beginDrag(e,"mouse");});
window.addEventListener("mousemove",e=>moveDrag(e,true));
window.addEventListener("mouseup",e=>{if(e.button===0)drop(e,false,true);});
// Losing pointer capture does not mean a mouse was released over no bin.
canvas.addEventListener("lostpointercapture",()=>{});
window.addEventListener("blur",()=>{
 if(!drag)return;
 game.release(drag.id);drag=null;
});
function drawWheel(g,x,y,r,angle){
 circle(g,x,y,r+4,"#243741");circle(g,x,y,r,"#acb5a9");circle(g,x,y,r-4,"#586d73");
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5+angle;line(g,x+Math.cos(a)*4,y+Math.sin(a)*4,x+Math.cos(a)*(r-4),y+Math.sin(a)*(r-4),"#d3c8a9",3);}
 circle(g,x,y,5,"#344752");circle(g,x,y,2,"#ffd48b");
}
function drawBelt(g,time){
 // Stand legs and shadows sit behind the sorting belt.
 rect(g,21,303,25,61,"#273b44");rect(g,25,309,7,51,"#7c9490");rect(g,318,303,23,61,"#273b44");rect(g,322,309,7,51,"#7c9490");
 rect(g,8,223,344,82,"#0e2733");rect(g,12,228,336,73,"#536975");
 rect(g,16,236,328,54,"#142f3a");
 const shift=(time*game.rule?.speed||time*70)%24;
 for(let x=-25+shift;x<370;x+=24){
   rect(g,x,241,13,47,"#4b6268");rect(g,x+3,243,3,44,"#607c80");rect(g,x+17,243,2,44,"#1e3e46");
 }
 rect(g,17,238,326,3,"#a8aaa0");rect(g,17,288,326,5,"#263e49");
 rect(g,10,224,340,9,"#203d45");rect(g,12,225,336,3,"#a9b9a5");
 for(let x=17;x<344;x+=31){rect(g,x,228,4,3,"#edce87");rect(g,x+1,229,1,1,"#253942");}
 // Repeating roller detail below the moving fabric.
 rect(g,15,294,328,23,"#273c49");
 for(let x=24;x<340;x+=29)drawWheel(g,x,306,9,time*2);
 rect(g,8,316,344,7,"#b48354");rect(g,8,322,344,4,"#493a35");
 rect(g,14,326,330,4,"#bda472");
 // Conveyor at right exits into a red warning chute.
 rect(g,335,231,14,69,"#8b4b43");rect(g,339,237,7,49,"#e28765");
 for(let j=0;j<5;j++)rect(g,337,242+j*10,11,4,j%2?"#e6c268":"#402e34");
 rect(g,336,286,14,9,"#30464b");
 // Direction emblem
 rect(g,46,217,75,15,"#3e706d");rect(g,50,219,68,10,"#183c41");
 text(g,"CONVEYOR →",84,224,11,"#ffd68f");
}
function gift(g,x,y,idx,size=49){
 const image=giftImages[((idx%6)+6)%6];
 if(image.complete&&image.naturalWidth){g.drawImage(image,Math.round(x-size/2),Math.round(y-size/2),size,size);return;}
 const c=["#d2524e","#3c8dbb","#43a37c","#dc9e48","#e7c86a","#5aafce"][idx%6];
 rect(g,x-size*.42,y-size*.33,size*.84,size*.77,"#102c38");
 rect(g,x-size*.37,y-size*.28,size*.74,size*.68,c);
 rect(g,x-size*.06,y-size*.28,size*.12,size*.68,"#fff1bc");
 rect(g,x-size*.37,y-size*.03,size*.74,size*.1,"#fff1bc");
 rect(g,x-size*.13,y-size*.43,size*.11,size*.17,"#ffe8a7");
 rect(g,x+size*.06,y-size*.43,size*.11,size*.17,"#ffe8a7");
}
// Express is recognised by its warm moving radiance, not an added label or badge.
function drawExpressPresent(g,x,y,size,clock){
 const pulse=(Math.sin(clock*5.3)+1)*.5;
 const radius=size*.77+pulse*size*.10;
 g.save();g.translate(Math.round(x),Math.round(y));
 const halo=g.createRadialGradient(0,0,size*.12,0,0,radius);
 halo.addColorStop(0,"rgba(255,253,218,0.55)");
 halo.addColorStop(.48,"rgba(255,215,102,0.30)");
 halo.addColorStop(1,"rgba(255,188,56,0)");
 g.fillStyle=halo;g.fillRect(-radius,-radius,radius*2,radius*2);
 g.shadowColor="#ffd45c";g.shadowBlur=9+pulse*10;
 gift(g,0,0,4,size);
 g.shadowBlur=0;
 // A handful of detached pinprick highlights accent the glow without a star sticker.
 for(let i=0;i<4;i++){
   const a=clock*.85+i*Math.PI/2;
   const d=size*(.60+.055*Math.sin(clock*3+i));
   const sx=Math.cos(a)*d,sy=Math.sin(a)*d;
   const r=i%2?2:3;
   rect(g,sx-r/2,sy-r/2,r,r,i%2?"#ffe096":"#fffbe3");
 }
 g.restore();
}
function drawItem(g,item,x,y,lift=false){
 const scale=lift?1.18:1;
 if(!lift){rect(g,x-18,y+19,37,5,"#071a276e");}
 else{circle(g,x+2,y+36,20,"#061a2455");}
 g.save();g.translate(Math.round(x),Math.round(y));g.scale(scale,scale);
 if(item.type==="coal")g.drawImage(coal,-25,-25,50,50);
 else if(item.type==="express")drawExpressPresent(g,0,0,49,phase);
 else gift(g,0,0,item.variant,49);
 g.restore();
}
function drawBins(g,time){
 const active=true;
 const hovered=drag&&(binAt(drag.pointerX,drag.pointerY)||binAt(drag.x,drag.y));
 for(const b of binList){
   const locked=b.id==="express"&&!active,selected=hovered?.id===b.id;
   const x=b.x,w=b.w;
   // Feet/shadow and reinforced wooden side pieces.
   rect(g,x+8,465,w-10,10,"#2e292d");rect(g,x+16,474,12,5,"#302d30");rect(g,x+w-28,474,12,5,"#302d30");
   rect(g,x+2,361,w-4,106,"#392f2f");
   rect(g,x+6,369,w-12,91,"#865942");
   rect(g,x+10,373,w-20,82,locked?"#745e52":"#b27b51");
   for(let k=0;k<3;k++){rect(g,x+12,382+k*24,w-24,2,"#81543f");rect(g,x+13,386+k*24,w-26,1,"#ca956b");}
   // Opening has real depth; a travelling item can disappear into it.
   rect(g,x+8,358,w-16,32,"#171e2c");rect(g,x+11,363,w-22,22,"#302f31");
   rect(g,x+4,354,w-8,10,locked?"#85817b":b.color);
   rect(g,x+6,355,w-12,3,"#ffe9bbaa");
   rect(g,x+3,359,9,100,"#593f36");rect(g,x+w-12,359,9,100,"#5a4037");
   rect(g,x+5,362,3,93,"#dba676");rect(g,x+w-10,362,3,93,"#be8760");
   // Painted identity plaque.
   rect(g,x+15,392,w-30,53,locked?"#53504d":b.dark);
   rect(g,x+18,395,w-36,46,locked?"#797b70":b.color);
   rect(g,x+21,398,w-42,41,locked?"#555d5c":b.dark);
   if(!locked){
     if(b.id==="gift")gift(g,x+w/2,412,0,34);
     if(b.id==="coal")g.drawImage(coal,x+w/2-21,391,42,39);
     if(b.id==="express")drawExpressPresent(g,x+w/2,412,34,time);
   }else{text(g,"III",x+w/2,408,25,"#d5c19c");}
   rect(g,x+14,442,w-28,20,locked?"#5f5c52":b.color);
   text(g,locked?"EXPRESS":b.text,x+w/2,452,b.id==="express"?15:16,locked?"#d6c5a5":"#132f36");
   for(const bx of [x+12,x+w-16])for(const by of [373,454])rect(g,bx,by,3,3,"#e9c588");
   if(selected&&!locked){
     g.strokeStyle="#fff0ab";g.lineWidth=4;g.strokeRect(x+3,354,w-6,111);
     rect(g,x+9,355,w-18,5,"#fff5cb");
   }
   if(locked){g.fillStyle="#081b2688";g.fillRect(x+4,362,w-8,101);}
 }
 // Item destination arrow guidance in normal gameplay, one per bin.
 for(const b of binList){
   if(!drag)continue;
   text(g,"↓",b.x+b.w/2,345,19,hovered?.id===b.id?"#ffe795":"#b8d9ca");
 }
}
function drawScene(time){
 ctx.drawImage(scene,0,0);
 // Workshop lamps are glass with a moving amber halo.
 for(const x of [134,269]){
   circle(ctx,x,35,15,"#ffe4a00f");rect(ctx,x-3,18,7,9,"#293940");rect(ctx,x-9,28,18,9,"#c69f66");
   rect(ctx,x-6,37,12,3,"#fff2b4");rect(ctx,x-4,40,8,2,"#ffcf75");
 }
 // Animated festive bulbs connected along the north wall.
 for(let i=0;i<21;i++){
   const x=15+i*16,y=32+7*Math.sin(i*.34);
   circle(ctx,x,y,3,["#d76767","#f9d779","#8bd7b4"][i%3]);
   if(i%4===0)circle(ctx,x,y,5,"#ffe19b20");
 }
 // Steam from left-side pipes.
 for(let i=0;i<4;i++){
   const t=(time*.23+i*.27)%1;
   circle(ctx,318+Math.sin(i*4+t*4)*7,130-t*25,3+t*2,"#c9dbce"+(t>.65?"33":"66"));
 }
 drawBelt(ctx,time);
 let items=game.items;
 if(screen==="home"){
   items=[{x:48+(time*50)%415-40,y:261,type:"gift",variant:0,phase:0},{x:130+(time*50)%415-40,y:261,type:"coal",variant:0,phase:2},{x:240+(time*50)%415-40,y:261,type:"express",variant:2,phase:3}];
 }
 for(const item of items){
   if(item.held)continue;
   drawItem(ctx,item,item.x,item.y+Math.sin(time*5+item.phase)*1.2,false);
 }
 // The front lip draws after parcels, making objects appear to sit on the belt.
 rect(ctx,13,285,320,4,"#233c48");rect(ctx,14,289,319,3,"#a3b7ae");
 for(let x=30;x<330;x+=37){rect(ctx,x,290,5,2,"#d2c69c");}
 drawBins(ctx,time);
 if(drag){
   drawItem(ctx,{type:game.items.find(i=>i.id===drag.id)?.type||"gift",variant:game.items.find(i=>i.id===drag.id)?.variant||0},drag.x,drag.y,true);
 }
 // Ambient shining gear gauge / warning on the hopper.
 rect(ctx,309,213,34,12,"#2d4b4b");
 rect(ctx,311,215,30,8,game.status==="playing"&&game.timeLeft<10?"#d06253":"#437c66");
 text(ctx,"ON",326,220,9,"#fff1d2");
 if(glow>0){ctx.fillStyle="#f5d777"+Math.round(Math.min(1,glow)*20).toString(16).padStart(2,"0");ctx.fillRect(0,210,W,130);}
 if(impact>0){ctx.fillStyle="#df4e48"+Math.round(Math.min(1,impact)*50).toString(16).padStart(2,"0");ctx.fillRect(0,0,W,H);}
 for(const p of particles){ctx.globalAlpha=Math.min(1,Math.max(0,1-p.age/p.life));rect(ctx,p.x,p.y,p.s,p.s,p.col);}
 ctx.globalAlpha=1;
 for(const f of floaters){
   ctx.globalAlpha=Math.min(1,Math.max(0,1-f.age/f.life));
   text(ctx,f.s,f.x,f.y-f.age*30,20,f.col);ctx.globalAlpha=1;
 }
}
function animate(now){
 const dt=Math.min(.05,Math.max(0,(now-(last||now))/1000));last=now;phase+=dt;
 if(screen==="game"){
   const events=game.step(dt);if(events.length)handle(events);
 }
 for(const p of particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=175*dt;}
 particles=particles.filter(p=>p.age<p.life);
 for(const f of floaters)f.age+=dt;floaters=floaters.filter(f=>f.age<f.life);
 glow=Math.max(0,glow-dt*2.2);impact=Math.max(0,impact-dt*2.4);
 if(screen==="game")uiUpdate();
 drawScene(phase);
 requestAnimationFrame(animate);
}
game.start(1);menu("home");requestAnimationFrame(animate);
})();