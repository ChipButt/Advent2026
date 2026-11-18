/* Chimney Drop-In · Pixel-art endless Christmas descent for GameBox */
(()=>{
"use strict";
const E=window.ChimneyEngine;if(!E)throw Error("ChimneyDrop engine failed to load");
const {ChimneyDrop,passage,hash,Y,W}=E;
const $=id=>document.getElementById(id),canvas=$("world"),ctx=canvas.getContext("2d",{alpha:false});
ctx.imageSmoothingEnabled=false;
const game=new ChimneyDrop(4129);
const UI={score:$("score"),depth:$("depth"),combo:$("combo"),hearts:$("hearts"),toast:$("toast"),overlay:$("overlay"),eyebrow:$("menuEyebrow"),title:$("overlayTitle"),text:$("menuText"),best:$("bestScore"),stats:$("menuStats"),primary:$("primaryButton"),secondary:$("secondaryButton"),sound:$("soundButton"),pause:$("pauseBtn"),shieldFill:$("shieldFill"),boostFill:$("boostFill"),shieldTime:$("shieldTime"),boostTime:$("boostTime"),announce:$("announce")};
UI.helpGallery=$("helpGallery");UI.helpPager=$("helpPager");UI.menu=UI.overlay.querySelector(".menu");
const KEY="gamebox.chimneyDropIn.v1";let save={best:0,meters:0,plays:0,sound:true};
try{const v=JSON.parse(localStorage.getItem(KEY)||"null");if(v&&typeof v==="object"){save.best=Math.max(0,+v.best||0);save.meters=Math.max(0,+v.meters||0);save.plays=Math.max(0,+v.plays||0);save.sound=v.sound!==false;}}catch(_){}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));}catch(_){}}
const P={ink:"#151d2c",black:"#101b28",stone:"#6a3d40",stoneLight:"#bd6f58",stoneTop:"#dc9270",grout:"#322b39",fire:"#ffb94e",ash:"#777984",cream:"#fff0d2",snow:"#dae9e5",gold:"#ffd37a",pine:"#427758",red:"#bd414c"};
let mode="home",helpFrom="home",helpPage=0,time=0,last=0,activeTouch=null,fx=[],floats=[],hits=0,flash=0,shake=0,shakeAge=0,toastTimer,ac=null;
const images={};
function loadImg(name,path){const im=new Image();im.src=path;images[name]=im;}
loadImg("brick","../assets/gamebox/kenney/2d/Brick%20Pack/Double/Red/brick_medium_2.png");
loadImg("gift","../assets/gamebox/kenney/2d/Platformer%20Assets%20Holiday/present_small_green.png");
loadImg("gift2","../assets/gamebox/kenney/2d/Platformer%20Assets%20Holiday/present_small_red.png");
loadImg("candy","../assets/gamebox/kenney/2d/Platformer%20Assets%20Candy/canePink.png");
function rect(g,x,y,w,h,col){g.fillStyle=col;g.fillRect(Math.floor(x),Math.floor(y),Math.ceil(w),Math.ceil(h));}
function line(g,x,y,xx,yy,col,thick=1){g.strokeStyle=col;g.lineWidth=thick;g.beginPath();g.moveTo(x+.5,y+.5);g.lineTo(xx+.5,yy+.5);g.stroke();}
function circ(g,x,y,r,c){g.fillStyle=c;g.beginPath();g.arc(x,y,r,0,6.283185);g.fill();}
function label(g,t,x,y,size=13,col=P.cream,align="center"){g.textAlign=align;g.textBaseline="middle";g.fillStyle=col;g.font="900 "+size+"px 'Barlow Condensed',system-ui,sans-serif";g.fillText(t,x,y);}
function newCanvas(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;return [c,c.getContext("2d")];}
function santaArt(frame){
 // Hand-authored 48x58 pixel-art Santa: silhouette, soft shading, flowing hat, bag, bobbing limbs.
 const [c,g]=newCanvas(48,58),p=(x,y,w,h,col)=>rect(g,x,y,w,h,col);
 const flow=frame%4,wing=flow===1?-3:flow===3?2:0,hat=flow===0?-1:flow===2?1:0;
 // Gift sack peeks out behind the right shoulder; rope tied at neck.
 p(30,17,13,27,"#193b3c");p(32,18,10,23,"#396d52");p(33,21,8,16,"#569874");p(37,14,3,7,"#deba79");
 // Flying/falling left glove and sleeve.
 p(6,25+wing,8,12,"#852f3c");p(8,26+wing,7,10,"#c94c4d");p(4,24+wing,6,6,"#faf5d8");p(3,23+wing,5,6,"#d8e9e5");
 // Boots have deliberately asymmetric falling poses.
 p(14,42,9,9,"#642d31");p(26,42,9,9,"#642d31");
 p(12+((flow%2)*2),48,12,7,"#1d2a34");p(25-((flow%2)*2),48,13,7,"#202830");
 p(10+((flow%2)*2),50,13,5,"#333641");p(25-((flow%2)*2),50,14,5,"#32333c");
 p(14,45,9,3,"#f8eedb");p(26,45,9,3,"#f8eedb");
 // Coat shadow and body; white trim; thick gold buckle.
 p(12,25,25,24,"#502d35");p(13,27,22,20,"#bb3f49");p(15,28,18,8,"#dd5d51");
 p(14,40,22,5,"#1c2631");p(22,40,6,5,"#e8ba6d");p(24,41,3,3,"#745333");
 p(15,45,21,4,"#fff3dc");p(16,46,18,2,"#cddfd9");
 // Sweeping right arm.
 p(31,25-wing,10,9,"#7a303a");p(34,26-wing,9,8,"#c84949");p(40,27-wing,5,5,"#f4f0de");
 // Face and sideburn silhouette.
 p(12,14,23,20,"#31303a");p(14,15,20,17,"#d9a08b");p(16,15,17,14,"#f6bea1");
 p(13,23,7,5,"#f7f2df");p(28,23,8,5,"#f5f2df");
 p(18,22,3,3,"#202a31");p(28,22,3,3,"#242d35");
 p(15,25,4,2,"#f1a3a0");p(31,25,3,2,"#e69d8e");
 p(23,25,6,5,"#ba6769");p(24,26,5,3,"#ec948b");
 // Beard has a readable point, textured highlights.
 p(18,29,16,7,"#c9d8d7");p(16,28,18,5,"#f5f6e8");p(20,34,13,5,"#f4f2e7");
 p(22,38,8,4,"#dcebe8");p(24,40,4,2,"#eff5e6");p(20,30,5,6,"#ffffff");
 // Hat floppy angled through the slipstream.
 p(10,12,26,6,"#fff5df");p(12,13,24,4,"#d1e4e5");
 p(12,10,23,4,"#c3444a");p(14,5,19,6,"#d24b4d");
 p(18,2,13,5,"#d44c4b");p(19+hat,0,7,3,"#a93e44");
 p(8+hat,4,10,5,"#c4434b");p(4+hat,5,6,5,"#d75551");
 p(1+hat,6,6,7,"#fcf4dc");p(2+hat,7,4,3,"#f6f8ed");
 // Coat details / seam highlights.
 p(19,35,2,2,"#ffd8a0");p(19,30,2,3,"#f5ce91");
 return c;
}
function cookieArt(){
 const[c,g]=newCanvas(36,36);const p=(x,y,w,h,col)=>rect(g,x,y,w,h,col);
 const pts=[[11,2,14,3],[6,5,24,6],[3,11,30,15],[6,26,24,6],[11,31,14,3]];
 for(const [x,y,w,h] of pts)p(x,y+2,w,h,"#59322c");
 for(const[x,y,w,h]of pts)p(x,y,w,h,"#c7874f");
 p(10,5,17,3,"#eab06e");p(6,13,4,9,"#e0a164");p(13,27,11,3,"#9c5b3e");
 [[11,12],[23,11],[17,19],[9,23],[25,24],[18,7]].forEach(([x,y],i)=>{p(x,y,5,4,i%2?"#68413c":"#6a3b36");p(x+1,y+1,2,1,"#3e2b30");});
 p(14,11,2,2,"#ffe0a0");p(27,18,2,2,"#e5b275");
 return c;
}
function milkArt(){
 const[c,g]=newCanvas(36,42),p=(x,y,w,h,col)=>rect(g,x,y,w,h,col);
 p(11,1,14,5,"#9c4b45");p(12,2,12,3,"#e6a27d");p(13,6,10,6,"#879d9d");
 p(8,10,20,28,"#203c4b");p(10,12,16,23,"#a9dce2");p(12,15,12,18,"#edf7ee");
 p(11,14,4,20,"#f7fff3");p(10,17,16,3,"#dbebea");p(12,28,13,5,"#aed0d6");
 p(8,35,20,3,"#6a999e");p(12,13,12,4,"#91afb8");
 p(14,20,8,7,"#477f88");p(16,21,4,5,"#f4f5e6");
 return c;
}
function emberArt(){
 const[c,g]=newCanvas(34,39),p=(x,y,w,h,col)=>rect(g,x,y,w,h,col);
 p(14,1,5,5,"#9c3b43");p(12,6,11,6,"#d85f47");p(6,10,19,8,"#b74243");p(8,18,20,11,"#e55f42");
 p(13,28,15,6,"#d84941");p(17,33,8,3,"#e37642");
 p(12,13,12,18,"#ffa94e");p(16,19,9,14,"#ffce67");p(17,24,5,7,"#fff0ac");
 p(15,11,5,4,"#fda75a");p(24,11,4,5,"#ec8351");p(4,16,4,4,"#e2864d");
 return c;
}
function wreathArt(){
 const[c,g]=newCanvas(46,46),p=(x,y,w,h,col)=>rect(g,x,y,w,h,col);
 const dots=16;
 for(let i=0;i<dots;i++){const a=i*Math.PI*2/dots;const x=Math.round(23+Math.cos(a)*15),y=Math.round(23+Math.sin(a)*15);
  p(x-6,y-6,12,12,"#153c39");p(x-4,y-5,9,10,i%2?"#2c7d57":"#3f9962");p(x-2,y-4,4,4,"#57a96d");
 }
 p(14,16,8,7,"#f6ede0");p(25,16,8,7,"#f7ede0");p(17,18,3,5,"#af4946");p(28,18,3,5,"#a94846");
 p(18,29,13,5,"#301f2e");p(19,30,3,4,"#f8e9d0");p(25,30,3,4,"#f8e9d0");
 p(20,1,8,7,"#ca4852");p(16,2,8,5,"#db5960");p(25,2,8,5,"#d44d55");
 p(8,8,4,4,"#db4650");p(35,24,4,4,"#f3b15c");p(8,31,4,4,"#f4cc76");
 return c;
}
function baubleArt(){
 const[c,g]=newCanvas(36,44),p=(x,y,w,h,col)=>rect(g,x,y,w,h,col);
 p(15,2,7,7,"#cfbd83");p(17,0,3,4,"#d5c4a2");p(12,8,15,3,"#65414d");
 p(7,11,25,25,"#332c44");p(9,10,21,26,"#a64a77");p(12,11,16,21,"#d36288");
 p(14,12,6,5,"#ef9bad");p(11,19,4,6,"#f29bb9");p(20,20,5,8,"#792c62");
 p(15,23,4,4,"#fff6d9");p(24,23,4,4,"#fff4dc");
 p(17,24,2,3,"#212536");p(26,24,2,3,"#212536");p(19,30,8,2,"#552b4b");
 p(6,3,6,8,"#d5bbb3");p(28,4,5,7,"#d5bbb3");p(2,15,6,5,"#d5bbb3");p(29,16,5,6,"#cdb6ab");
 p(13,35,4,7,"#d5bbb3");p(25,35,5,7,"#d5bbb3");
 return c;
}
const art={santa:[0,1,2,3].map(santaArt),cookie:cookieArt(),milk:milkArt(),ember:emberArt(),wreath:wreathArt(),bauble:baubleArt()};
const menuSanta=document.querySelector(".menu-santa-shape");
if(menuSanta){menuSanta.textContent="";menuSanta.classList.add("has-art");menuSanta.style.backgroundImage="url("+art.santa[0].toDataURL("image/png")+")";}
// Render the actual, separately-authored Santa sprite in the front menu too.
const heroSanta=$("heroSanta");
if(heroSanta){const heroContext=heroSanta.getContext("2d");heroContext.imageSmoothingEnabled=false;heroContext.clearRect(0,0,60,68);heroContext.drawImage(art.santa[1],3,0,54,66);}
function sprite(g,im,x,y,w,h){if(!im)return;g.drawImage(im,Math.round(x-w/2),Math.round(y-h/2),w,h);}

/* Non-colour-only affordances: round green '+' pickups and red diamond '!' hazards. */
function markerBase(g,x,y,r,good,now){
 const throb=1+Math.sin(now*5+x*.017)*.035;
 g.save();g.translate(Math.round(x),Math.round(y));g.scale(throb,throb);
 g.beginPath();
 if(good)g.arc(0,0,r,0,Math.PI*2);
 else for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4,xx=Math.cos(a)*r,yy=Math.sin(a)*r;i?g.lineTo(xx,yy):g.moveTo(xx,yy);}
 g.closePath();
 g.fillStyle=good?"#103c36a9":"#4e252bc2";g.fill();
 g.strokeStyle=good?"#9ff3bc":"#ff846d";g.lineWidth=3;g.stroke();
 g.restore();
}
function markerLabel(g,x,y,r,kind,good){
 const iconX=Math.round(x+r*.79),iconY=Math.round(y-r*.76);
 g.save();g.translate(iconX,iconY);
 if(good){
  circ(g,0,0,10,"#102b2c");circ(g,0,0,8,"#56cd84");
  rect(g,-6,-2,12,4,"#f8ffec");rect(g,-2,-6,4,12,"#f8ffec");
 }else{
  g.rotate(Math.PI/4);rect(g,-10,-10,20,20,"#48242d");rect(g,-8,-8,16,16,"#e65b4e");
  g.rotate(-Math.PI/4);label(g,"!",0,0,17,"#fff2ce");
 }
 g.restore();
 const tag=good?(kind==="cookie"?"SHIELD":kind==="milk"?"BOOST":"BONUS"):"AVOID";
 const w=good?49:43,top=Math.round(y+r-5);
 rect(g,x-w/2-2,top-1,w+4,15,"#10212b");
 rect(g,x-w/2,top,w,12,good?"#2f915f":"#af3c3e");
 label(g,tag,x,top+6,11,"#fff9e3");
}

function tone(kind){
 if(!save.sound)return;
 try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!ac)ac=new AC();if(ac.state==="suspended")ac.resume();
 const sounds={cookie:[[720,.065],[900,.09]],milk:[[320,.065],[510,.075],[780,.12]],gift:[[460,.07],[720,.08],[1060,.13]],hit:[[150,.20],[108,.22]],block:[[470,.09],[630,.08]],start:[[390,.07],[540,.09],[740,.13]],end:[[360,.12],[250,.13],[160,.19]]};
 const notes=sounds[kind]||sounds.cookie;
 notes.forEach(([freq,dur],i)=>{const o=ac.createOscillator(),v=ac.createGain(),t=ac.currentTime+i*.065;
 o.type=kind==="hit"||kind==="end"?"sawtooth":"triangle";o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*.72,t+dur);
 v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(.035,t+.008);v.gain.exponentialRampToValueAtTime(.0001,t+dur);
 o.connect(v);v.connect(ac.destination);o.start(t);o.stop(t+dur+.01);
 });
 }catch(_){}
}
function toast(message,c="#ffe2a2"){
 UI.toast.textContent=message;UI.toast.style.color=c;UI.toast.classList.add("show");
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>UI.toast.classList.remove("show"),780);
}
function scatter(x,y,color,n=14){
 for(let i=0;i<n;i++){const a=Math.random()*6.283,v=30+Math.random()*110;
  fx.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-28,s:2+Math.random()*3,age:0,life:.35+Math.random()*.55,color});}
}
function floatMsg(text,x,y,color){floats.push({text,x,y,color,age:0,life:1});}
function hud(){
 UI.score.textContent=String(game.score||0).padStart(6,"0");
 UI.depth.textContent=String(Math.floor((game.distance||0)/10)).padStart(4,"0")+"m";
 UI.combo.textContent="×"+(game.combo||0);
 UI.hearts.textContent="♥ ".repeat(Math.max(0,game.health)).trim()||"—";
 UI.shieldFill.style.width=(100*(game.shield||0)/6.5)+"%";
 UI.boostFill.style.width=(100*(game.boost||0)/5)+"%";
 UI.shieldTime.textContent=game.shield>0?game.shield.toFixed(1)+"s":"—";
 UI.boostTime.textContent=game.boost>0?game.boost.toFixed(1)+"s":"—";
}
const HOW_TO=[
 {section:"collect",entries:[
  {kind:"cookie",title:"COOKIE",hint:"Shield for 6.5 sec"},
  {kind:"milk",title:"MILK",hint:"Speed boost"},
  {kind:"gift",title:"PRESENT",hint:"Extra points"}
 ]},
 {section:"avoid",entries:[
  {kind:"ember",title:"EMBERS",hint:"Hot flames"},
  {kind:"ledge",title:"BRICKS",hint:"Jutting ledges"},
  {kind:"wreath",title:"WREATH",hint:"Angry decoration"},
  {kind:"bauble",title:"BAUBLE",hint:"Spiky ornament"},
  {kind:"embers",title:"EMBER SHOWER",hint:"Fire clusters"}
 ]}
];
function drawGuideIcon(canvas,kind){
 const g=canvas.getContext("2d");g.imageSmoothingEnabled=false;
 g.clearRect(0,0,64,64);
 if(kind==="ledge"){
  // Render the same actual obstacle silhouette as the moving chimney.
  const [tmp,tc]=newCanvas(360,94);
  const depth=780;
  drawLedge(tc,{side:"left",depth,reach:63},43);
  const x=passage(depth,game.seed).left;
  g.drawImage(tmp,Math.max(0,Math.floor(x)-13),0,92,94,1,2,62,60);
  return;
 }
 if(kind==="cookie")sprite(g,art.cookie,32,32,45,45);
 else if(kind==="milk")sprite(g,art.milk,32,32,39,53);
 else if(kind==="gift"){
  // Do not substitute a different pictogram while the approved Kenney PNG loads.
  if(images.gift.complete&&images.gift.naturalWidth)sprite(g,images.gift,32,32,51,51);
 }
 else if(kind==="ember")sprite(g,art.ember,32,32,43,49);
 else if(kind==="wreath")sprite(g,art.wreath,32,32,55,55);
 else if(kind==="bauble")sprite(g,art.bauble,32,32,47,57);
 else if(kind==="embers"){
  for(let i=0;i<4;i++)sprite(g,art.ember,20+i%2*20,20+Math.floor(i/2)*21,26,30);
 }
}
function renderHelpGallery(){
 const data=HOW_TO[helpPage];
 UI.helpGallery.replaceChildren();
 UI.helpGallery.className="help-gallery "+data.section;
 for(const item of data.entries){
  const card=document.createElement("div");card.className="guide-card "+data.section;
  const artBox=document.createElement("div");artBox.className="guide-art";
  const canvas=document.createElement("canvas");canvas.width=64;canvas.height=64;
  canvas.className="guide-sprite";canvas.setAttribute("role","img");canvas.setAttribute("aria-label",item.title+" gameplay sprite");
  artBox.appendChild(canvas);
  const marker=document.createElement("span");marker.className="guide-marker "+data.section;marker.textContent=helpPage===0?"+":"!";
  artBox.appendChild(marker);
  const name=document.createElement("strong");name.textContent=item.title;
  const hint=document.createElement("small");hint.textContent=item.hint;
  card.append(artBox,name,hint);UI.helpGallery.appendChild(card);
  drawGuideIcon(canvas,item.kind);
 }
 UI.helpPager.textContent="PAGE "+(helpPage+1)+" OF 2";
}
images.gift.addEventListener("load",()=>{
 if(mode==="help")for(const canvas of UI.helpGallery.querySelectorAll(".guide-sprite")){
  if(canvas.getAttribute("aria-label")==="PRESENT gameplay sprite")drawGuideIcon(canvas,"gift");
 }
});
function menu(name){
 mode=name;UI.overlay.hidden=false;
 const help=name==="help";
 UI.menu.classList.toggle("help-mode",help);
 UI.helpGallery.hidden=!help;UI.helpPager.hidden=!help;
 UI.best.textContent=save.meters+"m";UI.stats.hidden=help;UI.secondary.hidden=false;UI.sound.hidden=help;
 const set=(eyebrow,title,desc,primary,secondary)=>{
  UI.eyebrow.textContent=eyebrow;UI.title.innerHTML=title;UI.text.innerHTML=desc;
  UI.primary.innerHTML=primary+" <span>➜</span>";UI.secondary.textContent=secondary;
 };
 if(name==="home")set("THE MOST DANGEROUS DELIVERY ROUTE","DOWN THE<br><em>CHIMNEY!</em>","One Santa. Endless chimneys. Dodge red-hot embers, crumbling bricks and nasty Christmas decorations on your way down.","START FALLING","HOW TO PLAY");
 if(name==="pause")set("TAKE A BREATHER","FALLING<br><em>PAUSED</em>","The chimney network has stopped. Santa will continue from exactly here when you're ready.","RESUME THE DROP","HOW TO PLAY");
 if(name==="over")set("DELIVERY INTERRUPTED","YOU GOT<br><em>SOOTED!</em>","Santa made it <b>"+Math.floor(game.distance/10).toLocaleString("en-GB")+"m</b> down the chimney.<br>Score <b>"+game.score.toLocaleString("en-GB")+"</b> · cookies <b>"+game.collected.cookie+"</b> · milk <b>"+game.collected.milk+"</b>.","TRY AGAIN","BACK TO TITLE");
 if(help){
  if(helpPage===0)set("HOW TO PLAY · 1 / 2","<em>COLLECT</em> THESE","Green + means helpful. Grab these as you fall.","NEXT: AVOID","CLOSE GUIDE");
  else set("HOW TO PLAY · 2 / 2","<em>AVOID</em> THESE","Red ! means danger. Steer clear to protect Santa's three hearts.","GOT IT","PREVIOUS PAGE");
  renderHelpGallery();
 }
 UI.sound.textContent=save.sound?"♪ SOUND ON":"♪ SOUND OFF";UI.sound.setAttribute("aria-pressed",String(save.sound));hud();
}
function start(){
 game.start();mode="play";UI.overlay.hidden=true;fx=[];floats=[];flash=0;hits=0;shake=0;activeTouch=null;save.plays++;persist();
 hud();last=performance.now();toast("LET IT SNOW!","#fff1ce");tone("start");
}
function pause(){if(mode==="play"){game.pause();stopControl();menu("pause");}}
function stopControl(){game.input.left=false;game.input.right=false;game.setTarget(null);activeTouch=null;document.querySelectorAll(".steer").forEach(x=>x.classList.remove("held"));}
UI.primary.addEventListener("click",()=>{
 if(mode==="home"||mode==="over")start();
 else if(mode==="pause"){game.resume();mode="play";UI.overlay.hidden=true;last=performance.now();}
 else if(mode==="help"){
  if(helpPage===0){helpPage=1;menu("help");}
  else{helpPage=0;menu(helpFrom);}
 }
});
UI.secondary.addEventListener("click",()=>{
 if(mode==="over"){menu("home");return;}
 if(mode==="help"){
  if(helpPage===1){helpPage=0;menu("help");}
  else menu(helpFrom);
  return;
 }
 helpFrom=mode;helpPage=0;menu("help");
});
UI.sound.addEventListener("click",()=>{save.sound=!save.sound;persist();UI.sound.textContent=save.sound?"♪ SOUND ON":"♪ SOUND OFF";UI.sound.setAttribute("aria-pressed",String(save.sound));if(save.sound)tone("cookie");});
UI.pause.addEventListener("click",()=>{if(mode==="play")pause();else if(mode==="pause"){game.resume();mode="play";UI.overlay.hidden=true;last=performance.now();}});
document.addEventListener("keydown",e=>{
 if(["ArrowLeft","ArrowRight"," ","Escape"].includes(e.key))e.preventDefault();
 if(e.key==="Escape"||e.key.toLowerCase()==="p"){if(!e.repeat){if(mode==="play")pause();else if(mode==="pause"){game.resume();mode="play";UI.overlay.hidden=true;last=performance.now();}}return;}
 if(mode!=="play")return;
 if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")game.input.left=true;
 if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")game.input.right=true;
});
document.addEventListener("keyup",e=>{if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")game.input.left=false;if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")game.input.right=false;});
document.addEventListener("visibilitychange",()=>{if(document.hidden)pause();});
function steerButton(button,dir){
 const key=dir==="left"?"left":"right";
 button.addEventListener("pointerdown",e=>{if(mode!=="play")return;e.preventDefault();try{if(e.isTrusted)button.setPointerCapture?.(e.pointerId);}catch(_){}game.input[key]=true;game.setTarget(null);button.classList.add("held");});
 const up=e=>{game.input[key]=false;button.classList.remove("held");};
 ["pointerup","pointercancel","lostpointercapture"].forEach(n=>button.addEventListener(n,up));
}
steerButton($("moveLeft"),"left");steerButton($("moveRight"),"right");
function screenPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*360/r.width,y:(e.clientY-r.top)*560/r.height};}
canvas.addEventListener("pointerdown",e=>{if(mode!=="play")return;const p=screenPoint(e);activeTouch=e.pointerId;game.setTarget(p.x);try{canvas.setPointerCapture?.(e.pointerId);}catch(_){}e.preventDefault();});
canvas.addEventListener("pointermove",e=>{if(mode!=="play"||activeTouch!==e.pointerId)return;game.setTarget(screenPoint(e).x);e.preventDefault();});
const unstick=e=>{if(activeTouch!==e.pointerId)return;activeTouch=null;game.setTarget(null);};
canvas.addEventListener("pointerup",unstick);canvas.addEventListener("pointercancel",unstick);
canvas.addEventListener("lostpointercapture",()=>{activeTouch=null;game.setTarget(null);});
function events(list){
 for(const ev of list){
  if(ev.type==="collect"){
   const e=ev.kind;
   scatter(game.x,Y,e==="cookie"?"#ffce83":e==="milk"?"#c3f7f1":"#a2e59c",18);
   floatMsg("+"+ev.points,game.x,Y-32,e==="cookie"?"#ffe1a0":"#c2ecdc");
   tone(e);flash=.26;
   if(e==="cookie")toast("COOKIE SHIELD!","#baf8f1");
   else if(e==="milk")toast("MILK BOOST!","#ffe0a0");
   else toast("GIFT BONUS!","#f8ddb1");
  }else if(ev.type==="hit"){
   hits=1;shake=7;scatter(game.x,Y,"#ff7457",21);tone("hit");toast("OUCH! "+ev.health+" HEARTS LEFT","#ffa79a");
   if(navigator.vibrate)navigator.vibrate(35);
  }else if(ev.type==="blocked"){
   scatter(game.x,Y,"#9cebf2",19);tone("block");toast("SHIELD SAVED SANTA!","#b7f5f7");
  }else if(ev.type==="over"){
   save.best=Math.max(save.best,game.score);save.meters=Math.max(save.meters,Math.floor(game.distance/10));persist();tone("end");stopControl();menu("over");
  }
 }
 hud();
}
function drawBrick(g,x,y,w,h,seed,shift){
 if(w<=0)return;
 rect(g,x,y,w,h,"#693f42");rect(g,x,y+1,w,h-2,"#994f49");
 rect(g,x,y,w,2,"#cf8065");
 if(images.brick.complete&&images.brick.naturalWidth){
  g.save();g.globalAlpha=.22;g.drawImage(images.brick,x,y,Math.max(3,w),h);g.restore();
 }
 const k=hash(seed,game.seed);
 rect(g,x+3,y+5,Math.min(w-4,8+Math.floor(k*12)),2,k>.5?"#b96758":"#814848");
 if(w>20&&k>.43)rect(g,x+w-11,y+8,6,2,"#c37760");
 if(shift)rect(g,x+w-3,y,3,h,"#3b3039");
}
function sideRow(g,xStart,xEnd,y,row,flips=false){
 const width=xEnd-xStart;if(width<2)return;
 rect(g,xStart,y,width,24,"#50343c");
 const off=row%2?17:0,brickW=34;
 for(let x=Math.floor((xStart-off)/brickW)*brickW+off;x<xEnd;x+=brickW){
  const xa=Math.max(x,xStart),xb=Math.min(x+brickW-2,xEnd);
  if(xb-xa<=0)continue;
  drawBrick(g,xa,y+1,xb-xa,22,Math.floor(x/brickW)+row*11,false);
  rect(g,xa,y+1,1,19,"#713e41");
  if(hash(Math.floor(x/brickW),row+game.seed)>.92){line(g,x+9,y+4,x+12,y+10,"#59313b");line(g,x+12,y+10,x+9,y+16,"#59313b");}
 }
 const edge=flips?xStart:xEnd;
 rect(g,flips?edge:edge-9,y,9,24,"#272a35");
 rect(g,flips?edge:edge-6,y,6,24,"#564149");
 rect(g,flips?edge+2:edge-5,y,3,24,"#a16d5c");
 rect(g,flips?edge+8:edge-9,y+8,2,3,"#c99063");
}
function wallScene(g,depth,now){
 // Deep-shaft gradient is drawn behind the masonry. All geometry scrolls in world units.
 const grad=g.createLinearGradient(0,0,360,0);
 grad.addColorStop(0,"#332c38");grad.addColorStop(.24,"#121f2c");grad.addColorStop(.5,"#1c2334");grad.addColorStop(.76,"#111f2b");grad.addColorStop(1,"#362a35");
 g.fillStyle=grad;g.fillRect(0,0,W,560);
 const first=Math.floor((depth-Y)/24)-1,last=Math.ceil((depth+560-Y)/24)+1;
 for(let row=first;row<=last;row++){
  const d=row*24,y=Y+d-depth,p=passage(d,game.seed);
  sideRow(g,0,Math.ceil(p.left),Math.round(y),row);
  sideRow(g,Math.floor(p.right),W,Math.round(y),row,true);
  // Atmospheric soot layer runs down the inner flue face.
  const l=p.left,r=p.right;
  rect(g,l+6,y+1,4,22,"#0b1b2977");rect(g,r-10,y+1,4,22,"#0a1b2977");
  if(row%7===1){
    rect(g,l+2,y+5,6,11,"#d49a67");rect(g,l+4,y+7,2,7,"#ffb87b");
    rect(g,r-8,y+5,6,11,"#cb9166");rect(g,r-6,y+7,2,7,"#f5c087");
  }
  // Slotted flue vents and copper bolts create mechanical variation.
  if(row%13===5){rect(g,l-18,y+5,18,12,"#30333e");rect(g,l-16,y+8,15,4,"#15252f");rect(g,l-15,y+13,10,2,"#b98158");}
  if(row%19===7){rect(g,r+3,y+4,22,14,"#3a363e");rect(g,r+6,y+6,14,3,"#c6996d");rect(g,r+6,y+12,14,2,"#181f2a");}
 }
 // Modular bulkhead arches make the shaft feel like connected chimneys, not one background loop.
 const archStep=470,archFirst=Math.floor((depth-Y)/archStep);
 for(let k=archFirst;k<archFirst+4;k++){
  if(k<0)continue;
  const d=k*archStep+300,y=Y+d-depth,p=passage(d,game.seed);
  if(y<-85||y>620)continue;
  // Decorative side-mounted chimney markers. Do not draw a fake solid
  // barrier across the playable passage: players can fly straight through.
  rect(g,p.left-16,y,48,8,"#34323e");rect(g,p.right-32,y,48,8,"#34323e");
  rect(g,p.left-13,y+1,43,2,"#bb9270");rect(g,p.right-30,y+1,43,2,"#bb9270");
  rect(g,p.left+6,y+8,12,29,"#584244");rect(g,p.right-18,y+8,12,29,"#584244");
  rect(g,p.left+8,y+10,3,18,"#bd8966");rect(g,p.right-12,y+10,3,18,"#bd8966");
  rect(g,p.left+6,y+35,19,12,"#322f3a");
  label(g,""+(k+1),p.left+16,y+41,11,"#f5d19a");
 }
 // Soot and falling flakes: parallax specks locked to distance for deterministic visual texture.
 for(let i=0;i<37;i++){
  const x=18+hash(i*17,game.seed)*324,
    yy=((i*139-depth*(.4+hash(i,7)*.6))%680+680)%680-50,
    size=hash(i,11)>.86?2:1;
  rect(g,x,yy,size,size,hash(i,19)>.8?"#edaa735f":"#b4bdc253");
 }
 // Environmental candy canes / presents decorate recessed side windows only.
 for(let i=0;i<12;i++){
  const d=i*790+270,y=Y+d-depth;if(y<-80||y>640)continue;
  const p=passage(d,game.seed),xx=i%2?p.right+21:p.left-22;
  rect(g,xx-15,y-23,29,45,"#332b37");rect(g,xx-12,y-21,23,40,"#734d4a");
  if(images.candy.complete&&images.candy.naturalWidth)sprite(g,images.candy,xx,y,21,34);
  else {rect(g,xx-2,y-14,6,28,"#fae6bd");for(let t=-11;t<13;t+=9)rect(g,xx-2,y+t,6,4,"#d75b5c");}
 }
 // Molten embers crawl along brick cracks, creating depth and warmth.
 for(let i=0;i<20;i++){
  const d=i*329+70,y=Y+d-depth;
  if(y<-25||y>580)continue;
  const p=passage(d,game.seed),x=i%2?p.right-2:p.left+1;
  const a=.55+.45*Math.sin(now*5+i);
  circ(g,x,y,5,"#ffb55b"+Math.floor(a*65).toString(16).padStart(2,"0"));
  rect(g,x-1,y-3,2,7,a>.6?"#f3a256":"#d46a49");
 }
}
function drawLedge(g,e,y){
 const p=passage(e.depth,game.seed),left=e.side==="left";
 const x=left?p.left:p.right-e.reach,w=e.reach;
 rect(g,x,y-17,w,35,"#302b34");
 rect(g,x,y-16,w,30,"#955248");
 rect(g,x,y-18,w,6,"#cb8865");
 rect(g,x+2,y-14,w-4,4,"#ad6355");
 const n=Math.ceil(w/24);
 for(let i=0;i<n;i++){const bx=x+i*24;rect(g,bx+1,y-8,Math.min(21,x+w-bx-2),12,"#af6051");rect(g,bx+6,y-5,6,2,"#d58b6c");}
 rect(g,left?x+w-6:x,y-15,6,34,"#4b3d40");rect(g,left?x+w-4:x+2,y-13,2,27,"#e09d73");
 for(let i=0;i<3;i++)rect(g,x+4+i*(w-8)/3,y+16,5,3,"#d29c70");
 // Hazard stripes and a warning badge mark the protruding brick lip.
 for(let i=0;i<w-7;i+=11){rect(g,x+i+3,y-18,6,4,"#ffce77");rect(g,x+i+9,y-18,3,4,"#d95649");}
 const tip=left?x+w-2:x+2;
 circ(g,tip,y-25,12,"#3d232d");circ(g,tip,y-25,9,"#df594c");
 label(g,"!",tip,y-25,18,"#fff4d6");
 rect(g,tip-19,y+20,38,13,"#37252e");rect(g,tip-17,y+21,34,11,"#ac3c3f");
 label(g,"AVOID",tip,y+27,10,"#fff4d9");
}
function drawEntity(g,e,now){
 const y=Y+(e.depth-game.distance);
 if(y< -70||y>625)return;
 const x=e.x+((e.sway||0)*Math.sin(game.time*2.25+e.phase));
 if(e.kind==="ledge"){drawLedge(g,e,y);return;}
 const good=e.kind==="cookie"||e.kind==="milk"||e.kind==="gift";
 const radius=e.kind==="embers"?38:good?26:28;
 markerBase(g,x,y,radius,good,now);
 if(e.kind==="cookie"){
  circ(g,x,y,22,"#e0a75620");sprite(g,art.cookie,x,y,34,34);
 }else if(e.kind==="milk"){
  circ(g,x,y,23,"#88e1e728");sprite(g,art.milk,x,y,32,38);
 }else if(e.kind==="gift"){
  circ(g,x,y,23,"#b9ebad23");
  sprite(g,images.gift?.naturalWidth?images.gift:art.cookie,x,y,37,37);
 }else if(e.kind==="wreath"){
  circ(g,x,y,24,"#76c6a122");sprite(g,art.wreath,x,y+Math.sin(now*4+e.phase)*2,47,47);
 }else if(e.kind==="bauble"){
  circ(g,x,y,22,"#de8caa30");sprite(g,art.bauble,x,y,40,47);
 }else if(e.kind==="embers"){
  for(let i=0;i<4;i++){
   const dx=Math.sin(now*3+e.phase+i)*8+((i%2)*16-8),dy=(i-2)*13+Math.cos(now*2+i)*3;
   circ(g,x+dx,y+dy,8,"#ed803647");sprite(g,art.ember,x+dx,y+dy,19,22);
  }
 }else{
  circ(g,x,y,19,"#ff893b45");
  sprite(g,art.ember,x,y+Math.sin(now*9+e.phase)*2,35,39);
  if(Math.floor(now*10+e.phase)%3===0){rect(g,x+14,y+9,3,5,"#ffdd8c");rect(g,x-17,y-1,2,4,"#ee8b42");}
 }
 markerLabel(g,x,y,radius,e.kind,good);
}
function drawSanta(g,now){
 if(game.invincible>0&&Math.floor(now*14)%2===0)return;
 const x=game.x,y=Y+Math.sin(now*7)*3,lean=Math.max(-.25,Math.min(.25,game.vx/800));
 if(game.shield>0){
   const r=34+2*Math.sin(now*6);
   circ(g,x,y,r,"#76d2e922");g.strokeStyle="#a5f3ee";g.lineWidth=3;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.stroke();
   for(let i=0;i<5;i++){const a=now*1.3+i*Math.PI*2/5;rect(g,x+Math.cos(a)*r-2,y+Math.sin(a)*r-2,4,4,"#e1ffff");}
 }
 if(game.boost>0){
   for(let i=0;i<7;i++){const dx=Math.sin(i*2.1+now*2)*15,dy=20+i*10+((now*160)%12);
    rect(g,x+dx,y+dy,2+(i%2),9,"#ffdb8c"+(i>4?"77":"aa"));
   }
 }
 g.save();g.translate(Math.round(x),Math.round(y));g.rotate(lean);
 const frame=art.santa[Math.floor(now*9)%4];
 g.drawImage(frame,-25,-28,50,61);
 g.restore();
 // Tiny snow-dust wake softens the silhouette against the dark chimney.
 if(game.boost<=0)for(let i=0;i<3;i++)rect(g,x-15+i*14,y+30+Math.sin(now*5+i)*5,2,3,"#c7dae19b");
}
function scene(now){
 ctx.save();
 if(shake>0){ctx.translate((hash(Math.floor(now*69),5)-.5)*shake,(hash(Math.floor(now*37),9)-.5)*shake);}
 const depth=mode==="home"?now*34:game.distance;
 wallScene(ctx,depth,now);
 // Moving visual cues make the descent legible even before the first hazard.
 if(mode==="home"){
  drawEntity(ctx,{id:1,kind:"ember",x:253,depth:game.distance+130,phase:0},now);
  drawEntity(ctx,{id:2,kind:"cookie",x:142,depth:game.distance+245,phase:2},now);
  drawEntity(ctx,{id:3,kind:"wreath",x:248,depth:game.distance+320,phase:1,sway:8},now);
 }else{
  const sorted=[...game.entities].sort((a,b)=>a.depth-b.depth);
  for(const e of sorted)drawEntity(ctx,e,now);
 }
 drawSanta(ctx,now);
 // Vignette beams / distant glow - subtle not a wall-obscuring HUD.
 const glow=ctx.createLinearGradient(0,410,0,560);glow.addColorStop(0,"#4b292500");glow.addColorStop(1,"#bd62352a");ctx.fillStyle=glow;ctx.fillRect(0,410,W,150);
 if(flash>0){ctx.fillStyle="#ffdfa2"+Math.round(Math.min(1,flash)*50).toString(16).padStart(2,"0");ctx.fillRect(0,0,W,560);}
 if(hits>0){ctx.fillStyle="#f13f46"+Math.round(Math.min(1,hits)*65).toString(16).padStart(2,"0");ctx.fillRect(0,0,W,560);}
 ctx.globalAlpha=1;
 for(const p of fx){
  ctx.globalAlpha=Math.max(0,1-p.age/p.life);
  rect(ctx,p.x,p.y,p.s,p.s,p.color);
 }
 ctx.globalAlpha=1;
 for(const f of floats){
  ctx.globalAlpha=Math.max(0,1-f.age/f.life);
  label(ctx,f.text,f.x,f.y-f.age*30,20,f.color);
 }
 ctx.globalAlpha=1;ctx.restore();
}
function animate(nowMs){
 const dt=Math.max(0,Math.min(.05,((nowMs-last)||0)/1000));last=nowMs;time+=dt;
 if(mode==="play"){const es=game.advance(dt);if(es.length)events(es);hud();}
 else if(mode==="home"||mode==="help"){game.x=180+Math.sin(time*.8)*26;game.vx=0;}
 for(const p of fx){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt;}
 fx=fx.filter(p=>p.age<p.life);
 for(const f of floats)f.age+=dt;floats=floats.filter(f=>f.age<f.life);
 hits=Math.max(0,hits-dt*2.3);flash=Math.max(0,flash-dt*1.7);shake=Math.max(0,shake-dt*35);
 scene(time);requestAnimationFrame(animate);
}
hud();menu("home");requestAnimationFrame(animate);
})();