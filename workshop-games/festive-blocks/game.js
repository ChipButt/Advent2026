(function(){
'use strict';

const W=390,H=650,SCALE=2;
const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
ctx.setTransform(SCALE,0,0,SCALE,0,0);
ctx.imageSmoothingEnabled=true;

const settingsSheet=document.getElementById('settingsSheet');
const howToSheet=document.getElementById('howToSheet');
const resultSheet=document.getElementById('resultSheet');
const settingsHighScore=document.getElementById('settingsHighScore');
const soundState=document.getElementById('soundState');
const resultScore=document.getElementById('resultScore');
const resultBest=document.getElementById('resultBest');
const toastEl=document.getElementById('toast');

const ASSET={
 green:'../assets/gamebox/kenney/2d/Puzzle Pack 1/element_green_square_glossy.png',
 red:'../assets/gamebox/kenney/2d/Puzzle Pack 1/element_red_square_glossy.png',
 yellow:'../assets/gamebox/kenney/2d/Puzzle Pack 1/element_yellow_square_glossy.png',
 blue:'../assets/gamebox/kenney/2d/Puzzle Pack 1/element_blue_square_glossy.png',
 cloud1:'../assets/gamebox/kenney/2d/Background Elements Remastered/cloud1.png',
 cloud4:'../assets/gamebox/kenney/2d/Background Elements Remastered/cloud4.png',
 lollipop:'../assets/gamebox/kenney/2d/Platformer Assets Candy/lollipopWhiteRed.png',
 candyRed:'../assets/gamebox/kenney/2d/Platformer Assets Candy/candyRed.png',
 candyGreen:'../assets/gamebox/kenney/2d/Platformer Assets Candy/candyGreen.png',
 candyYellow:'../assets/gamebox/kenney/2d/Platformer Assets Candy/candyYellow.png'
};
const img={};let assetsReady=false;
Promise.all(Object.keys(ASSET).map(function(k){return new Promise(function(resolve){const im=new Image();img[k]=im;im.onload=resolve;im.onerror=resolve;im.src=ASSET[k];});})).then(function(){assetsReady=true;draw();});

const BOARD_N=10,CELL=27,GAP=3,STEP=CELL+GAP;
const BOARD_X=(W-(BOARD_N*CELL+(BOARD_N-1)*GAP))/2;
const BOARD_Y=105;
const BOARD_SIZE=BOARD_N*CELL+(BOARD_N-1)*GAP;
const TRAY_Y=477;
const SLOT_X=[14,140,266],SLOT_W=110,SLOT_H=120;
const COLORS=['red','green','yellow','blue'];

const SHAPES=[
 [[0,0]],
 [[0,0],[1,0]],[[0,0],[0,1]],
 [[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],
 [[0,0],[1,0],[0,1]],[[0,0],[1,0],[1,1]],[[0,0],[0,1],[1,1]],[[1,0],[0,1],[1,1]],
 [[0,0],[1,0],[0,1],[1,1]],
 [[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[0,3]],
 [[0,0],[1,0],[2,0],[1,1]],[[1,0],[0,1],[1,1],[2,1]],
 [[0,0],[1,0],[1,1],[2,1]],[[1,0],[2,0],[0,1],[1,1]],
 [[0,0],[0,1],[0,2],[1,2]],[[1,0],[1,1],[0,2],[1,2]],
 [[0,0],[1,0],[2,0],[0,1],[0,2]],[[0,0],[1,0],[2,0],[2,1],[2,2]],
 [[1,0],[0,1],[1,1],[2,1],[1,2]],
 [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]
];

let board=[],tray=[],score=0,high=readHigh(),sound=true,gameOver=false;
let active=null,hover=null,pointer={x:0,y:0},particles=[],clearFlash=[],lastTime=performance.now(),toastTimer=0;
const snow=Array.from({length:36},function(_,i){return{x:(i*47)%W,y:(i*83)%H,r:1+(i%3)*.45,s:7+(i%5)*2,phase:i*.7};});

function emptyBoard(){return Array.from({length:BOARD_N},function(){return Array(BOARD_N).fill(null);});}
function readHigh(){try{return Math.max(0,Number(localStorage.getItem('gamebox-festive-blocks-high'))||0);}catch(_){return 0;}}
function saveHigh(){if(score>high){high=score;try{localStorage.setItem('gamebox-festive-blocks-high',String(high));}catch(_){}}settingsHighScore.textContent=String(high);}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function bounds(cells){
 let maxX=0,maxY=0;cells.forEach(function(p){maxX=Math.max(maxX,p[0]);maxY=Math.max(maxY,p[1]);});
 return{w:maxX+1,h:maxY+1};
}
function randomPiece(){
 const cells=SHAPES[Math.floor(Math.random()*SHAPES.length)].map(function(p){return[p[0],p[1]];});
 return{cells:cells,color:COLORS[Math.floor(Math.random()*COLORS.length)],used:false};
}
function refillTray(){tray=[randomPiece(),randomPiece(),randomPiece()];}
function newGame(){
 board=emptyBoard();score=0;gameOver=false;particles=[];clearFlash=[];active=null;hover=null;refillTray();resultSheet.classList.remove('show');saveHigh();showToast('MERRY CHRISTMAS!');draw();
}
function canPlace(piece,row,col){
 if(!piece||piece.used)return false;
 for(let i=0;i<piece.cells.length;i++){
  const x=col+piece.cells[i][0],y=row+piece.cells[i][1];
  if(x<0||x>=BOARD_N||y<0||y>=BOARD_N||board[y][x])return false;
 }
 return true;
}
function anyFit(piece){
 const b=bounds(piece.cells);
 for(let r=0;r<=BOARD_N-b.h;r++)for(let c=0;c<=BOARD_N-b.w;c++)if(canPlace(piece,r,c))return true;
 return false;
}
function availableMove(){return tray.some(function(p){return !p.used&&anyFit(p);});}
function placePiece(index,row,col){
 const piece=tray[index];if(!canPlace(piece,row,col))return false;
 piece.cells.forEach(function(p){board[row+p[1]][col+p[0]]=piece.color;});
 piece.used=true;score+=piece.cells.length*10;tone(440,.045,'sine',.025,620);
 clearCompleted();
 if(tray.every(function(p){return p.used;}))refillTray();
 saveHigh();
 if(!availableMove())finishGame();
 return true;
}
function clearCompleted(){
 const rows=[],cols=[];
 for(let r=0;r<BOARD_N;r++)if(board[r].every(Boolean))rows.push(r);
 for(let c=0;c<BOARD_N;c++){let full=true;for(let r=0;r<BOARD_N;r++)if(!board[r][c]){full=false;break;}if(full)cols.push(c);}
 if(!rows.length&&!cols.length)return;
 const cells=new Set();
 rows.forEach(function(r){for(let c=0;c<BOARD_N;c++)cells.add(r+','+c);});
 cols.forEach(function(c){for(let r=0;r<BOARD_N;r++)cells.add(r+','+c);});
 clearFlash=[...cells].map(function(k){const p=k.split(',');return{r:+p[0],c:+p[1],life:.28};});
 cells.forEach(function(k){const p=k.split(','),r=+p[0],c=+p[1];spawnBurst(BOARD_X+c*STEP+CELL/2,BOARD_Y+r*STEP+CELL/2,board[r][c]);board[r][c]=null;});
 const lines=rows.length+cols.length;score+=lines*120+(lines>1?(lines-1)*80:0);
 showToast(lines>1?lines+' LINES!':'LINE CLEAR!');tone(lines>1?760:620,.13,'triangle',.04,lines>1?1120:860);
}
function finishGame(){
 gameOver=true;saveHigh();resultScore.textContent=String(score);resultBest.textContent=String(high);setTimeout(function(){resultSheet.classList.add('show');},220);tone(180,.28,'sawtooth',.03,90);
}
function showToast(text){clearTimeout(toastTimer);toastEl.textContent=text;toastEl.classList.add('show');toastTimer=setTimeout(function(){toastEl.classList.remove('show');},900);}
function spawnBurst(x,y,color){for(let i=0;i<7;i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*65;particles.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.45+Math.random()*.25,max:.7,color:color});}if(particles.length>150)particles.splice(0,particles.length-150);}
function ensureAudio(){if(!sound)return null;try{window.AudioContext=window.AudioContext||window.webkitAudioContext;if(!window._festiveAudio)window._festiveAudio=new AudioContext();if(window._festiveAudio.state==='suspended')window._festiveAudio.resume();return window._festiveAudio;}catch(_){return null;}}
function tone(freq,dur,type,vol,endFreq){if(!sound)return;const ac=ensureAudio();if(!ac)return;try{const o=ac.createOscillator(),g=ac.createGain();o.type=type||'sine';o.frequency.setValueAtTime(freq,ac.currentTime);if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,ac.currentTime+dur);g.gain.setValueAtTime(vol||.02,ac.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+dur);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+dur);}catch(_){}}

function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function drawImage(key,x,y,w,h,alpha){
 const im=img[key];if(!(im&&im.complete&&im.naturalWidth))return false;
 ctx.save();ctx.globalAlpha=alpha===undefined?1:alpha;ctx.drawImage(im,x,y,w,h);ctx.restore();return true;
}
function drawSky(){
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#78c8e8');g.addColorStop(.58,'#b9ebf6');g.addColorStop(1,'#effbff');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 if(assetsReady){
  drawImage('cloud4',-55,30,210,74,.88);drawImage('cloud1',260,58,165,58,.78);drawImage('cloud1',-50,390,170,60,.9);drawImage('cloud4',265,400,190,68,.88);
  drawImage('lollipop',12,425,42,42,.9);drawImage('candyRed',337,440,28,32,.88);drawImage('candyGreen',360,422,25,29,.84);drawImage('candyYellow',323,420,23,27,.82);
 }
 ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(0,0,W,H);
}
function drawSnow(now){
 ctx.fillStyle='#fff';snow.forEach(function(s){const y=(s.y+(now*.001*s.s))%H;ctx.globalAlpha=.34+.22*Math.sin(now*.0015+s.phase);ctx.beginPath();ctx.arc(s.x,y,s.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
}
function drawScore(){
 ctx.save();
 ctx.fillStyle='rgba(17,25,30,.84)';roundRect(ctx,18,17,150,55,13);ctx.fill();roundRect(ctx,222,17,150,55,13);ctx.fill();
 ctx.fillStyle='#a9bac3';ctx.font='800 7px Inter, sans-serif';ctx.textAlign='center';ctx.fillText('SCORE',93,34);ctx.fillText('BEST',297,34);
 ctx.fillStyle='#fff';ctx.font='700 23px Fredoka, sans-serif';ctx.fillText(String(score),93,58);ctx.fillStyle='#ffd86a';ctx.fillText(String(high),297,58);
 ctx.restore();
}
function drawBoard(){
 ctx.save();
 ctx.shadowColor='rgba(24,68,92,.25)';ctx.shadowBlur=12;ctx.fillStyle='rgba(236,250,255,.90)';roundRect(ctx,BOARD_X-13,BOARD_Y-13,BOARD_SIZE+26,BOARD_SIZE+26,20);ctx.fill();ctx.shadowBlur=0;
 ctx.strokeStyle='rgba(77,149,180,.38)';ctx.lineWidth=2;roundRect(ctx,BOARD_X-13,BOARD_Y-13,BOARD_SIZE+26,BOARD_SIZE+26,20);ctx.stroke();
 for(let r=0;r<BOARD_N;r++)for(let c=0;c<BOARD_N;c++){
  const x=BOARD_X+c*STEP,y=BOARD_Y+r*STEP;
  ctx.fillStyle='rgba(88,171,206,.16)';roundRect(ctx,x,y,CELL,CELL,6);ctx.fill();
  ctx.strokeStyle='rgba(74,149,182,.14)';ctx.lineWidth=1;ctx.stroke();
  if(board[r][c])drawBlock(board[r][c],x,y,CELL,1);
 }
 if(hover&&active){
  const piece=tray[active.index],valid=canPlace(piece,hover.row,hover.col);
  piece.cells.forEach(function(p){
   const c=hover.col+p[0],r=hover.row+p[1];if(c<0||c>=BOARD_N||r<0||r>=BOARD_N)return;
   const x=BOARD_X+c*STEP,y=BOARD_Y+r*STEP;
   if(valid)drawBlock(piece.color,x,y,CELL,.43);
   else{ctx.fillStyle='rgba(218,55,66,.34)';roundRect(ctx,x,y,CELL,CELL,6);ctx.fill();}
  });
 }
 clearFlash.forEach(function(f){ctx.fillStyle='rgba(255,255,255,'+(f.life/.28*.8)+')';roundRect(ctx,BOARD_X+f.c*STEP,BOARD_Y+f.r*STEP,CELL,CELL,6);ctx.fill();});
 ctx.restore();
}
function drawBlock(color,x,y,size,alpha){
 if(drawImage(color,x,y,size,size,alpha))return;
 const fall={red:'#e54b52',green:'#55b66c',yellow:'#f1c538',blue:'#48a9d5'};
 ctx.save();ctx.globalAlpha=alpha===undefined?1:alpha;ctx.fillStyle=fall[color]||'#fff';roundRect(ctx,x,y,size,size,5);ctx.fill();ctx.restore();
}
function drawDivider(){
 const y=439;ctx.save();ctx.fillStyle='#f7e9ef';roundRect(ctx,34,y,322,17,8);ctx.fill();
 ctx.save();roundRect(ctx,34,y,322,17,8);ctx.clip();
 for(let x=18;x<370;x+=28){ctx.fillStyle='#df6689';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+12,y);ctx.lineTo(x+24,y+17);ctx.lineTo(x+12,y+17);ctx.closePath();ctx.fill();}
 ctx.restore();ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=2;roundRect(ctx,34,y,322,17,8);ctx.stroke();ctx.restore();
}
function trayPiecePosition(index,piece){
 const b=bounds(piece.cells),preview=20,g=3,w=b.w*preview+(b.w-1)*g,h=b.h*preview+(b.h-1)*g;
 return{x:SLOT_X[index]+(SLOT_W-w)/2,y:TRAY_Y+46+(55-h)/2,size:preview,gap:g};
}
function drawTray(){
 ctx.textAlign='center';ctx.font='800 7px Inter, sans-serif';ctx.fillStyle='#276078';ctx.fillText('DRAG A PIECE INTO THE BOARD',W/2,471);
 tray.forEach(function(piece,i){
  const x=SLOT_X[i],y=TRAY_Y+9;
  ctx.fillStyle=piece.used?'rgba(255,255,255,.22)':'rgba(255,255,255,.72)';roundRect(ctx,x,y,SLOT_W,SLOT_H-12,16);ctx.fill();
  ctx.strokeStyle=piece.used?'rgba(80,130,150,.12)':'rgba(255,255,255,.84)';ctx.lineWidth=2;ctx.stroke();
  if(piece.used)return;
  if(active&&active.index===i)return;
  const pos=trayPiecePosition(i,piece);
  piece.cells.forEach(function(p){drawBlock(piece.color,pos.x+p[0]*(pos.size+pos.gap),pos.y+p[1]*(pos.size+pos.gap),pos.size,1);});
 });
 if(active){
  const piece=tray[active.index],b=bounds(piece.cells),size=24,g=3,w=b.w*size+(b.w-1)*g,h=b.h*size+(b.h-1)*g;
  const x=pointer.x-w/2,y=pointer.y-66-h/2;
  ctx.save();ctx.shadowColor='rgba(0,0,0,.24)';ctx.shadowBlur=12;piece.cells.forEach(function(p){drawBlock(piece.color,x+p[0]*(size+g),y+p[1]*(size+g),size,1);});ctx.restore();
 }
}
function drawParticles(){
 particles.forEach(function(p){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color==='yellow'?'#ffe274':p.color==='red'?'#ff8690':p.color==='green'?'#91e0aa':'#9bdcf2';ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
}
function draw(now){
 ctx.clearRect(0,0,W,H);drawSky();drawSnow(now||performance.now());drawScore();drawBoard();drawDivider();drawTray();drawParticles();
}

function logicalPoint(ev){
 const r=canvas.getBoundingClientRect();return{x:(ev.clientX-r.left)*W/r.width,y:(ev.clientY-r.top)*H/r.height};
}
function slotAt(x,y){if(y<TRAY_Y||y>TRAY_Y+SLOT_H)return -1;for(let i=0;i<3;i++)if(x>=SLOT_X[i]&&x<=SLOT_X[i]+SLOT_W)return i;return -1;}
function updateHover(){
 if(!active){hover=null;return;}
 const piece=tray[active.index],b=bounds(piece.cells);
 const liftedY=pointer.y-66;
 const col=Math.round((pointer.x-BOARD_X-(b.w*STEP-STEP)/2-CELL/2)/STEP);
 const row=Math.round((liftedY-BOARD_Y-(b.h*STEP-STEP)/2-CELL/2)/STEP);
 hover={row:row,col:col};
}
canvas.addEventListener('pointerdown',function(ev){
 if(gameOver)return;ensureAudio();const p=logicalPoint(ev),i=slotAt(p.x,p.y);if(i<0||tray[i].used)return;
 active={index:i,id:ev.pointerId};pointer=p;updateHover();canvas.classList.add('dragging');try{canvas.setPointerCapture(ev.pointerId);}catch(_){}draw();
});
canvas.addEventListener('pointermove',function(ev){if(!active||active.id!==ev.pointerId)return;pointer=logicalPoint(ev);updateHover();draw();});
function release(ev){
 if(!active||active.id!==ev.pointerId)return;
 if(hover)placePiece(active.index,hover.row,hover.col);
 active=null;hover=null;canvas.classList.remove('dragging');draw();
}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',function(ev){if(active&&active.id===ev.pointerId){active=null;hover=null;canvas.classList.remove('dragging');draw();}});

function update(dt,now){
 particles=particles.filter(function(p){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=55*dt;return p.life>0;});
 clearFlash=clearFlash.filter(function(f){f.life-=dt;return f.life>0;});
 draw(now);
}
function loop(now){const dt=Math.min(.035,(now-lastTime)/1000);lastTime=now;update(dt,now);requestAnimationFrame(loop);}

document.getElementById('menuButton').addEventListener('click',function(){settingsHighScore.textContent=String(high);settingsSheet.classList.add('show');});
document.getElementById('closeSettings').addEventListener('click',function(){settingsSheet.classList.remove('show');});
document.getElementById('soundButton').addEventListener('click',function(){sound=!sound;soundState.textContent=sound?'On':'Off';if(sound)tone(520,.06,'sine',.025,700);});
document.getElementById('howToButton').addEventListener('click',function(){settingsSheet.classList.remove('show');howToSheet.classList.add('show');});
document.getElementById('closeHowTo').addEventListener('click',function(){howToSheet.classList.remove('show');});
document.getElementById('howToDone').addEventListener('click',function(){howToSheet.classList.remove('show');});
document.getElementById('restartButton').addEventListener('click',function(){settingsSheet.classList.remove('show');newGame();});
document.getElementById('playAgainButton').addEventListener('click',newGame);

board=emptyBoard();refillTray();settingsHighScore.textContent=String(high);requestAnimationFrame(loop);
})();