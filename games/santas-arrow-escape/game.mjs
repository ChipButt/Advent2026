import {generateLevel,removeArrow,isFree,freePaths,direction} from './engine.mjs';
const $=id=>document.getElementById(id);
const canvas=$('board'),ctx=canvas.getContext('2d',{alpha:true});
const STORAGE='gamebox-santas-arrow-escape-v1',MAX_LEVEL=40,MAX_HEARTS=3,MAX_HINTS=1;
const COLORS=['#b74758','#2f8373','#507cb5','#91608d','#be8538'];
const LABELS=['Snowfall','Twinkling Trees','Toy Workshop','Candy Cane Lane','Winter Wonderland','North Pole Night','Blizzard'];
const overlays=['intro','menu','levelPicker','result'].map($);
const saved=(()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch{return {}}})();
let progress={unlocked:Math.min(MAX_LEVEL,Math.max(1,saved.unlocked||1)),best:saved.best||{},seen:!!saved.seen,sound:saved.sound!==false,level:Math.min(MAX_LEVEL,Math.max(1,saved.level||1))};
let board,lives=MAX_HEARTS,hints=MAX_HINTS,usedHint=false,originalCount=0,animation=null,hintTarget=null,hintUntil=0,selected=null,highlightBad=null,shakeUntil=0,particles=[];
let geometry={width:0,height:0,cell:20,ox:0,oy:0},toastTimer=0,actx=null,winning=false;
const store=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(progress));}catch{}};
function sound(type){
 if(!progress.sound)return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return;
  actx??=new Audio();
  if(actx.state==='suspended')actx.resume();
  const now=actx.currentTime,osc=actx.createOscillator(),gain=actx.createGain();
  osc.type=type==='bad'?'triangle':'sine';
  osc.frequency.setValueAtTime(type==='bad'?175:type==='win'?500:560,now);
  osc.frequency.exponentialRampToValueAtTime(type==='bad'?95:type==='win'?970:810,now+.18);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.065,now+.014);gain.gain.exponentialRampToValueAtTime(.0001,now+.23);
  osc.connect(gain).connect(actx.destination);osc.start(now);osc.stop(now+.25);
 }catch{}
}
function toast(message){
 const node=$('boardToast');node.textContent=message;node.classList.add('show');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),1150);
}
function overlay(id){
 overlays.forEach(el=>el.classList.toggle('show',id===el.id));
 const visible=overlays.find(el=>el.classList.contains('show'));
 if(visible){const action=visible.querySelector('button:not(:disabled),a');action?.focus({preventScroll:true});}
}
function closeOverlays(){overlays.forEach(el=>el.classList.remove('show'));}
function resize(){
 const r=canvas.getBoundingClientRect();
 if(!r.width||!r.height)return;
 const dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));
 ctx.setTransform(dpr,0,0,dpr,0,0);
 const width=r.width,height=r.height;
 const cell=Math.min((width-21)/board.cols,(height-20)/board.rows);
 geometry={width,height,cell,ox:(width-cell*board.cols)/2,oy:(height-cell*board.rows)/2};
 draw(performance.now());
}
const point=([x,y])=>[geometry.ox+(x+.5)*geometry.cell,geometry.oy+(y+.5)*geometry.cell];
function roundLine(pts,color,emphasis=false,opacity=1){
 if(pts.length<2)return;
 const cell=geometry.cell,thick=Math.max(3.2,cell*.33);
 ctx.save();ctx.globalAlpha=opacity;
 ctx.lineCap='round';ctx.lineJoin='round';
 ctx.beginPath();pts.forEach((p,i)=>{const [x,y]=point(p);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
 ctx.lineWidth=thick+Math.max(2.1,cell*.13);ctx.strokeStyle='#ffffffdc';ctx.shadowColor='#37566533';ctx.shadowBlur=2;ctx.shadowOffsetY=1;ctx.stroke();
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.lineWidth=thick;ctx.strokeStyle=color;
 if(emphasis){ctx.shadowColor='#f9c453';ctx.shadowBlur=10;}
 ctx.stroke();ctx.shadowBlur=0;
 ctx.lineWidth=Math.max(.7,thick*.2);ctx.strokeStyle='#ffffff99';ctx.stroke();
 // The arrowhead is a real polygon, not a font or emoji.
 const end=pts.at(-1),before=pts.at(-2),dx=end[0]-before[0],dy=end[1]-before[1];
 const magnitude=Math.hypot(dx,dy)||1,ux=dx/magnitude,uy=dy/magnitude;
 const [hx,hy]=point(end),size=Math.max(5,cell*.42);
 ctx.beginPath();
 ctx.moveTo(hx+ux*size*.57,hy+uy*size*.57);
 ctx.lineTo(hx-ux*size*.38-uy*size*.57,hy-uy*size*.38+ux*size*.57);
 ctx.lineTo(hx-ux*size*.38+uy*size*.57,hy-uy*size*.38-ux*size*.57);
 ctx.closePath();ctx.fillStyle=color;ctx.strokeStyle='#fff9e8';ctx.lineWidth=Math.max(1,cell*.075);
 ctx.fill();ctx.stroke();
 ctx.restore();
}
function samplePath(path,t){
 const points=path.points,len=points.length-1;
 if(t<=0)return points[0];
 if(t<len){const i=Math.min(len-1,Math.floor(t)),f=t-i,a=points[i],b=points[i+1];return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];}
 const [dx,dy]=direction(path),head=points.at(-1);
 return [head[0]+dx*(t-len),head[1]+dy*(t-len)];
}
function shiftedPath(path,distance){
 const len=path.points.length-1,pts=[],count=Math.max(8,Math.ceil(len*5));
 for(let i=0;i<=count;i++)pts.push(samplePath(path,distance+i*len/count));
 return pts;
}
function draw(now){
 if(!geometry.width||!board)return;
 const {width,height,cell,ox,oy}=geometry;
 ctx.clearRect(0,0,width,height);
 // Frosted paper dot-grid and a subtle centre mark for each tile.
 ctx.save();ctx.fillStyle='#8bb6bb57';
 for(let y=0;y<board.rows;y++)for(let x=0;x<board.cols;x++){
   const px=ox+(x+.5)*cell,py=oy+(y+.5)*cell;
   ctx.beginPath();ctx.arc(px,py,Math.max(.5,cell*.033),0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
 const bad=highlightBad&&now<shakeUntil;
 for(const path of board.paths){
   const selectedNow=selected===path.id||hintTarget===path.id&&now<hintUntil;
   if(animation&&animation.path.id===path.id){
     const elapsed=Math.min(1,(now-animation.start)/animation.duration);
     const eased=elapsed<.5?2*elapsed*elapsed:1-Math.pow(-2*elapsed+2,2)/2;
     const distance=eased*animation.travel;
     roundLine(shiftedPath(path,distance),COLORS[path.color],false,1);
   }else if(bad&&highlightBad===path.id){
     ctx.save();ctx.translate(Math.sin(now*.095)*Math.min(3,cell*.16),0);
     roundLine(path.points,'#de4545',true,1);ctx.restore();
   }else if(hintTarget===path.id&&now<hintUntil){
     roundLine(path.points,COLORS[path.color],true,.85+.15*Math.sin(now/130));
   }else{
     roundLine(path.points,COLORS[path.color],selectedNow,1);
   }
 }
 particles=particles.filter(p=>now-p.birth<690);
 for(const p of particles){
   const k=(now-p.birth)/690;
   ctx.save();ctx.globalAlpha=1-k;ctx.fillStyle=p.color;
   ctx.beginPath();ctx.arc(p.x+p.vx*k,p.y+p.vy*k+40*k*k,p.size*(1-k*.6),0,Math.PI*2);ctx.fill();ctx.restore();
 }
}
function burst(path){
 const [px,py]=point(path.points.at(-1));
 for(let i=0;i<12;i++){
   const angle=i*Math.PI/6,d=14+Math.random()*48;
   particles.push({birth:performance.now(),x:px,y:py,vx:Math.cos(angle)*d,vy:Math.sin(angle)*d-20,size:1.5+Math.random()*3,color:i%2?'#ffcb62':'#ffffff'});
 }
}
function hearts(){
 const icons=$('lives').querySelectorAll('svg');
 icons.forEach((el,i)=>el.classList.toggle('empty',i>=lives));
 $('lives').setAttribute('aria-label',lives+' heart'+(lives===1?'':'s')+' remaining');
}
function updateHud(){
 $('levelTitle').textContent='LEVEL '+board.level;
 $('chapterName').textContent=LABELS[Math.min(LABELS.length-1,Math.floor((board.level-1)/6))];
 $('remaining').textContent=board.paths.length;$('total').textContent=originalCount;
 $('hintCount').textContent=hints+' LEFT';$('hintBtn').disabled=hints<=0;
 hearts();
}
function loadLevel(n){
 const level=Math.min(MAX_LEVEL,Math.max(1,n));
 board=generateLevel(level);originalCount=board.paths.length;lives=MAX_HEARTS;hints=MAX_HINTS;usedHint=false;winning=false;
 animation=null;selected=null;highlightBad=null;hintTarget=null;particles=[];
 progress.level=level;store();updateHud();resize();
 $('footerTip').textContent='Tap a clear arrow to free its route.';
 closeOverlays();
}
function finish(won){
 animation=null;selected=null;winning=true;
 $('nextBtn').hidden=!won||board.level===MAX_LEVEL;
 $('resultTag').textContent=won?'DELIVERY COMPLETE':'THE ROUTES ARE BLOCKED';
 $('resultTitle').textContent=won?'All arrows escaped!':'Oh snow!';
 let stars=0;
 if(won){
   stars=lives===MAX_HEARTS&&!usedHint?3:lives>=2?2:1;
   progress.best[board.level]=Math.max(progress.best[board.level]||0,stars);
   progress.unlocked=Math.max(progress.unlocked,Math.min(MAX_LEVEL,board.level+1));
   progress.level=Math.min(MAX_LEVEL,board.level+1);store();
   sound('win');
 }
 $('stars').textContent=won?'★'.repeat(stars)+'☆'.repeat(3-stars):'☆☆☆';
 $('resultDetails').textContent=won?(stars===3?'A perfect North Pole delivery!':(originalCount+' arrows cleared · '+lives+' hearts remaining')):'You ran out of hearts. Give it another go!';
 $('retryBtn').textContent=won?'PLAY AGAIN':'TRY AGAIN';
 overlay('result');
}
function chooseArrow(path){
 if(!path||animation||winning||overlays.some(el=>el.classList.contains('show')))return;
 selected=path.id;
 const result=removeArrow(board,path.id);
 if(!result.ok){
   if(result.reason!=='blocked')return;
   lives--;highlightBad=path.id;shakeUntil=performance.now()+470;
   hearts();sound('bad');toast('Blocked! −1 heart');
   $('footerTip').textContent=lives+' hearts left — look for a clear exit.';
   if(lives<=0){winning=true;const lostBoard=board;setTimeout(()=>{if(board===lostBoard&&winning)finish(false);},525);}
   return;
 }
 sound('move');burst(path);
 const [dx,dy]=direction(path),head=path.points.at(-1);
 const exit=dx>0?board.cols-head[0]:dx<0?head[0]+1:dy>0?board.rows-head[1]:head[1]+1;
 animation={path,start:performance.now(),duration:430+path.points.length*16,travel:exit+path.points.length+2};
 const after=result.board;
 setTimeout(()=>{
   if(!animation||animation.path.id!==path.id)return;
   board=after;animation=null;highlightBad=null;selected=null;hintTarget=null;updateHud();
   $('footerTip').textContent=board.paths.length?'Keep going — every clear path counts.':'';
   if(!board.paths.length)finish(true);
 },animation.duration+30);
}
function hitTest(x,y){
 let best=null,bestD=Infinity;
 for(const path of board.paths){
   for(let i=1;i<path.points.length;i++){
     const a=point(path.points[i-1]),b=point(path.points[i]),vx=b[0]-a[0],vy=b[1]-a[1];
     const t=Math.max(0,Math.min(1,((x-a[0])*vx+(y-a[1])*vy)/(vx*vx+vy*vy)));
     const dist=Math.hypot(x-a[0]-vx*t,y-a[1]-vy*t);
     if(dist<bestD){bestD=dist;best=path;}
   }
 }
 return bestD<Math.max(12,geometry.cell*.56)?best:null;
}
canvas.addEventListener('pointerdown',event=>{
 if(animation||winning)return;
 const r=canvas.getBoundingClientRect(),path=hitTest(event.clientX-r.left,event.clientY-r.top);
 if(path)chooseArrow(path);
});
canvas.addEventListener('keydown',event=>{
 if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(event.key)){
   event.preventDefault();const paths=board.paths;if(!paths.length)return;
   const idx=paths.findIndex(p=>p.id===selected);
   selected=paths[(idx+(event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1)+paths.length)%paths.length].id;
 }else if(event.key==='Enter'||event.key===' '){
   event.preventDefault();chooseArrow(board.paths.find(p=>p.id===selected)||freePaths(board)[0]);
 }
});
function hint(){
 if(!hints||winning||animation||overlays.some(el=>el.classList.contains('show')))return;
 const free=freePaths(board);
 if(!free.length){toast('No free arrow — restart this level.');return;}
 const path=free[Math.floor(Math.random()*free.length)];
 hints--;usedHint=true;hintTarget=path.id;hintUntil=performance.now()+2300;
 updateHud();toast('Follow the glowing arrow');
 sound('move');
}
function restart(){loadLevel(board.level);}
function buildLevelGrid(){
 const grid=$('levelGrid');grid.replaceChildren();
 for(let n=1;n<=MAX_LEVEL;n++){
   const btn=document.createElement('button');
   btn.type='button';btn.textContent=n;
   btn.disabled=n>progress.unlocked;
   btn.classList.toggle('current',n===board.level);
   btn.setAttribute('aria-label',n>progress.unlocked?'Level '+n+' locked':'Play level '+n);
   const best=progress.best[n];
   if(best){const small=document.createElement('small');small.textContent='★'.repeat(best);btn.appendChild(small);}
   btn.addEventListener('click',()=>loadLevel(n));grid.appendChild(btn);
 }
}
$('hintBtn').addEventListener('click',hint);
$('restartBtn').addEventListener('click',restart);
$('menuBtn').addEventListener('click',()=>overlay('menu'));
$('resumeBtn').addEventListener('click',closeOverlays);
$('menuRestartBtn').addEventListener('click',restart);
$('levelsBtn').addEventListener('click',()=>{buildLevelGrid();overlay('levelPicker');});
$('resultLevelsBtn').addEventListener('click',()=>{buildLevelGrid();overlay('levelPicker');});
$('levelsClose').addEventListener('click',()=>overlay(winning?'result':'menu'));
$('nextBtn').addEventListener('click',()=>loadLevel(Math.min(MAX_LEVEL,board.level+1)));
$('retryBtn').addEventListener('click',restart);
$('soundBtn').addEventListener('click',()=>{progress.sound=!progress.sound;store();$('soundBtn').textContent='SOUND: '+(progress.sound?'ON':'OFF');});
$('helpBtn').addEventListener('click',()=>overlay('intro'));
$('playBtn').addEventListener('click',()=>{progress.seen=true;store();closeOverlays();});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'){
   if($('intro').classList.contains('show'))return;
   if(overlays.some(el=>el.classList.contains('show')))closeOverlays();else overlay('menu');
 }
 if(event.key.toLowerCase()==='h'&&!event.ctrlKey&&!event.altKey)hint();
 if(event.key.toLowerCase()==='r'&&!event.ctrlKey&&!event.altKey&&overlays.every(el=>!el.classList.contains('show')))restart();
});
loadLevel(Math.min(progress.level,progress.unlocked));
if(!progress.seen)overlay('intro');
const observer=new ResizeObserver(resize);observer.observe(canvas);
window.addEventListener('resize',resize);
let lastFrame=0;
function tick(now){
 if(now-lastFrame>=22){lastFrame=now;draw(now);}
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
