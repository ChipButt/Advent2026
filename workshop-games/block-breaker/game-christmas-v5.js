(function(){
'use strict';

const W=390,H=650,COLS=15,ROWS=15,BRICK_W=21,BRICK_H=12,GAP_X=3,GAP_Y=3,BRICK_X=17,BRICK_Y=88;
const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
const levelNameEl=document.getElementById('levelName');
const settingsSheet=document.getElementById('settingsSheet');
const howToSheet=document.getElementById('howToSheet');
const resultSheet=document.getElementById('resultSheet');
const soundState=document.getElementById('soundState');
const soundIcon=document.getElementById('soundIcon');
const soundCheck=document.getElementById('soundCheck');
const settingsHighScore=document.getElementById('settingsHighScore');
const powerToast=document.getElementById('powerToast');
const resultTitle=document.getElementById('resultTitle');
const resultKicker=document.getElementById('resultKicker');
const resultScore=document.getElementById('resultScore');
const resultBest=document.getElementById('resultBest');
const resultMessage=document.getElementById('resultMessage');

const ASSET={
  iceClean:'../assets/gamebox/kenney/2d/Physics Assets/Glass elements/elementGlass013.png',
  iceCracked:'../assets/gamebox/kenney/2d/Physics Assets/Glass elements/elementGlass048.png',
  explosive:'../assets/gamebox/kenney/2d/Brick Pack/Double/Special/extra_crate_explosive.png',
  powerBrick:'../assets/gamebox/kenney/2d/Brick Pack/Double/Special/extra_box_exclamation.png',
  ball:'../assets/gamebox/kenney/2d/Rolling Ball Assets/Retina/ball_blue_large.png',
  star:'../assets/gamebox/kenney/2d/Rolling Ball Assets/Retina/star.png',
  particle0:'../assets/gamebox/kenney/2d/Rolling Ball Assets/Retina/particle_0.png',
  particle1:'../assets/gamebox/kenney/2d/Rolling Ball Assets/Retina/particle_1.png',
  particle2:'../assets/gamebox/kenney/2d/Rolling Ball Assets/Retina/particle_2.png',
  particle3:'../assets/gamebox/kenney/2d/Rolling Ball Assets/Retina/particle_3.png',
  paddle:'../assets/gamebox/kenney/ui/UI Pack/Grey/Double/button_rectangle_depth_gradient.png',
  wood:'../assets/gamebox/kenney/2d/Retro Textures Fantasy/floor_wood_planks_wide.png',
  treeSnow:'../assets/gamebox/kenney/2d/Background Elements Remastered/treePineSnow.png',
  holidayCluster:'../assets/gamebox/kenney/2d/Holiday Pack 2016/RTS pack/Retina/RTSobject_15.png',
  giftRed:'../assets/gamebox/kenney/2d/Platformer Assets Holiday/present_small_red.png',
  giftGreen:'../assets/gamebox/kenney/2d/Platformer Assets Holiday/present_small_green.png',
  giftBlue:'../assets/gamebox/kenney/2d/Platformer Assets Holiday/present_small_blue.png',
  giftYellow:'../assets/gamebox/kenney/2d/Platformer Assets Holiday/present_small_yellow.png',
  giftOrange:'../assets/gamebox/kenney/2d/Platformer Assets Holiday/present_small_orange.png',
  giftIce:'../assets/gamebox/kenney/2d/Platformer Assets Holiday/present_small_lightBlue.png',
  baublesBlue:'../assets/gamebox/kenney/2d/Platformer Assets Holiday/balls_blue.png',
  baubleIce:'../assets/gamebox/kenney/2d/Platformer Assets Holiday/ball_lightBlue.png',
  larger:'../assets/gamebox/kenney/icons/Game Icons/White/2x/larger.png',
  smaller:'../assets/gamebox/kenney/icons/Game Icons/White/2x/smaller.png',
  fast:'../assets/gamebox/kenney/icons/Game Icons/White/2x/fastForward.png',
  plus:'../assets/gamebox/kenney/icons/Game Icons/White/2x/plus.png',
  power:'../assets/gamebox/kenney/icons/Game Icons/White/2x/power.png',
  target:'../assets/gamebox/kenney/icons/Game Icons/White/2x/target.png'
};
const img={};
const POWER={
  multi:{label:'MULTIBALL',pickup:'baublesBlue',icon:null},
  wide:{label:'WIDE PADDLE',pickup:'giftGreen',icon:'larger'},
  slow:{label:'SLOW BALL',pickup:'baubleIce',icon:'smaller'},
  boost:{label:'SPEED x2',pickup:'giftYellow',icon:'fast'},
  life:{label:'EXTRA LIFE',pickup:'giftRed',icon:'plus'},
  fire:{label:'FIREBALL',pickup:'giftOrange',icon:'power'},
  laser:{label:'SNOW SHOT',pickup:'giftBlue',icon:'snowShot'},
  catch:{label:'CATCH',pickup:'giftIce',icon:'target'}
};
const POWER_KEYS=Object.keys(POWER);
const COLORS=['blue','green','red','yellow'];

const LEVELS=[
 {name:'Christmas Tree',pattern:'tree',speed:245,armor:0,solid:0,bombs:0,powers:1},
 {name:'Wrapped Present',pattern:'present',speed:250,armor:1,solid:0,bombs:0,powers:2},
 {name:'Candy Cane',pattern:'candycane',speed:255,armor:2,solid:0,bombs:1,powers:2},
 {name:'Christmas Stocking',pattern:'stocking',speed:260,armor:2,solid:0,bombs:1,powers:2},
 {name:'Jingle Bell',pattern:'bell',speed:265,armor:3,solid:0,bombs:1,powers:2},
 {name:'Christmas Bauble',pattern:'bauble',speed:270,armor:3,solid:0,bombs:1,powers:3},
 {name:'Christmas Wreath',pattern:'wreath',speed:275,armor:4,solid:1,bombs:1,powers:3},
 {name:'Snowflake',pattern:'snowflake',speed:280,armor:4,solid:1,bombs:2,powers:3},
 {name:'Christmas Star',pattern:'star',speed:285,armor:5,solid:1,bombs:2,powers:3},
 {name:'Christmas Cracker',pattern:'cracker',speed:290,armor:5,solid:1,bombs:2,powers:3},
 {name:'Snowman',pattern:'snowman',speed:295,armor:6,solid:2,bombs:2,powers:4},
 {name:'Winter Mitten',pattern:'mitten',speed:300,armor:6,solid:2,bombs:2,powers:4},
 {name:'Holly Sprig',pattern:'holly',speed:305,armor:7,solid:2,bombs:3,powers:4},
 {name:'Candlelight',pattern:'candle',speed:310,armor:7,solid:2,bombs:3,powers:4},
 {name:'Santa Hat',pattern:'hat',speed:315,armor:8,solid:3,bombs:3,powers:4},
 {name:'Gingerbread Man',pattern:'gingerbread',speed:320,armor:8,solid:3,bombs:4,powers:5},
 {name:'Sleigh Ride',pattern:'sleigh',speed:325,armor:9,solid:3,bombs:4,powers:5},
 {name:'Reindeer',pattern:'reindeer',speed:330,armor:9,solid:4,bombs:4,powers:5},
 {name:'Snowy House',pattern:'house',speed:340,armor:10,solid:4,bombs:5,powers:5},
 {name:'Christmas Finale',pattern:'finale',speed:350,armor:11,solid:4,bombs:5,powers:6}
];

let assetsReady=false,audioCtx=null,sound=true,paused=true,pausedAt=0,lastTime=performance.now();
let state='ready',levelIndex=0,score=0,highScore=readHighScore(),lives=3,combo=0,comboBest=0;
let bricks=[],balls=[],powerups=[],particles=[],lasers=[];
let pointerId=null,keyLeft=false,keyRight=false,lastLaserShot=0,levelTransitionAt=0,message='',messageUntil=0,toastTimer=0;
let speedFactorApplied=1;
const paddle={x:W/2,y:602,baseWidth:82,height:18,vx:0,lastX:W/2};
const effects={wide:0,slow:0,boost:0,fire:0,laser:0,catch:0};
let woodPattern=null;

function readHighScore(){
  try{return Math.max(0,Number(localStorage.getItem('gamebox-block-breaker-high'))||0);}catch(_){return 0;}
}
function saveHighScore(){
  if(score<=highScore)return;
  highScore=score;
  try{localStorage.setItem('gamebox-block-breaker-high',String(highScore));}catch(_){}
  settingsHighScore.textContent=String(highScore);
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function lerp(a,b,t){return a+(b-a)*t;}
function roundRectPath(c,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();
}
function drawSnowball(x,y,r,alpha){
  ctx.save();
  ctx.globalAlpha=alpha===undefined?1:alpha;
  ctx.translate(x,y);

  // Soft compact snowball with an uneven packed-snow edge and cool shadow.
  ctx.shadowColor='rgba(12,30,42,.36)';
  ctx.shadowBlur=Math.max(2,r*.45);
  ctx.shadowOffsetY=Math.max(1,r*.18);

  const g=ctx.createRadialGradient(-r*.34,-r*.38,r*.08,0,0,r*1.05);
  g.addColorStop(0,'#ffffff');
  g.addColorStop(.48,'#f4f8fb');
  g.addColorStop(.78,'#dce9f1');
  g.addColorStop(1,'#afc6d3');
  ctx.fillStyle=g;

  ctx.beginPath();
  const bumps=12;
  for(let i=0;i<=bumps;i++){
    const a=(i/bumps)*Math.PI*2;
    const jitter=1+Math.sin(i*2.71+1.2)*.055+Math.cos(i*4.13)*.025;
    const px=Math.cos(a)*r*jitter,py=Math.sin(a)*r*jitter;
    if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.strokeStyle='rgba(116,151,171,.55)';
  ctx.lineWidth=Math.max(.7,r*.1);
  ctx.stroke();

  // Packed-snow facets/specks keep it from reading as a plain white circle.
  ctx.fillStyle='rgba(255,255,255,.78)';
  ctx.beginPath();ctx.arc(-r*.3,-r*.32,r*.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(150,181,198,.34)';
  [[.33,.14,.09],[-.18,.34,.07],[.05,-.18,.06]].forEach(function(p){
    ctx.beginPath();ctx.arc(r*p[0],r*p[1],Math.max(.7,r*p[2]),0,Math.PI*2);ctx.fill();
  });
  ctx.restore();
}
function drawSnowShot(x,y,r){drawSnowball(x,y,r===undefined?4:r,1);}
function seeded(seed){
  let a=seed>>>0;
  return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
}
function loadAssets(){
  return Promise.all(Object.keys(ASSET).map(function(key){
    return new Promise(function(resolve){
      const im=new Image();img[key]=im;im.onload=resolve;im.onerror=resolve;im.src=ASSET[key];
    });
  })).then(function(){assetsReady=true;});
}
function drawImg(key,x,y,w,h,alpha){
  const im=img[key];
  if(!im||!im.complete||!im.naturalWidth)return false;
  if(alpha!==undefined){ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(im,x,y,w,h);ctx.restore();}
  else ctx.drawImage(im,x,y,w,h);
  return true;
}
function ensureAudio(){
  if(!sound)return;
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();
  }catch(_){}
}
function tone(freq,dur,type,vol,endFreq){
  if(!sound)return;
  ensureAudio();
  if(!audioCtx)return;
  try{
    const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;
    o.type=type||'sine';o.frequency.setValueAtTime(freq,t);
    if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol||.035,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+dur+.01);
  }catch(_){}
}
function buzz(){
  if(!sound)return;
  ensureAudio();
  if(!audioCtx)return;
  try{
    const len=Math.floor(audioCtx.sampleRate*.11),buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
    const s=audioCtx.createBufferSource(),g=audioCtx.createGain();s.buffer=buf;g.gain.value=.035;s.connect(g);g.connect(audioCtx.destination);s.start();
  }catch(_){}
}
function vibrate(pattern){try{if(navigator.vibrate)navigator.vibrate(pattern);}catch(_){}}

const PATTERN_MASKS={
  tree:[
    ".......Y.......","......YYY......",".....GGGGG.....","....GGGGGGG....","...GGGGRGGGG...",".....GGGGG.....","....GGGGGGG....","...GGYGGGYGG...","..GGGGGGGGGGG..","....GGGGGGG....","...GGRGGGGGRG..","..GGGGGGGGGGG..",".GGGGGGGGGGGGG.","......OOO......","......OOO......"
  ],
  present:[
    ".....YY.YY.....","....YYYYYYY....",".....YYYYY.....","..RRRRYYYRRRR..","..RRRRYYYRRRR..","..RRRRYYYRRRR..","..YYYYYYYYYYY..","..YYYYYYYYYYY..","..RRRRYYYRRRR..","..RRRRYYYRRRR..","..RRRRYYYRRRR..","..RRRRYYYRRRR..","..RRRRYYYRRRR..","..RRRRYYYRRRR..","..RRRRRRRRRRR.."
  ],
  candycane:[
    "....RRRWWW.....","...RRRWWWWWW...","..RRRWW...WWW..","..RRWW.....WW..","...RWW.....WW..",".........RRR...","........WWW....",".......RRR.....","......WWW......",".....RRR.......","....WWW........","...RRR.........","..WWW..........","..RR...........","..WW..........."
  ],
  stocking:[
    "...WWWWWW......","...WWWWWW......","...RRRRR.......","...RRRRR.......","...RRRRR.......","...RRRRR.......","...RRRRR.......","...RRRRR.......","...RRRRRR......","...RRRRRRR.....","...RRRRRRRRR...","..RRRRRRRRRRR..",".RRRRRRRRRRRRR.","..RRRRRRRRRR...","....RRRRRR....."
  ],
  bell:[
    ".......Y.......","......YYY......",".....YYYYY.....","....YYYYYYY....","...YYYYYYYYY...","..YYYYYYYYYYY..","..YYYYYYYYYYY..","..YYYYYYYYYYY..","...YYYYYYYYY...","...YYYYYYYYY...","....YYYYYYY....","..YYYYYYYYYYY..",".YYYYYYYYYYYYY.","......OOO......","......OOO......"
  ],
  bauble:[
    "......YYY......",".....YYYYY.....",".....YYYYY.....","....RRRRRRR....","...RRRRRRRRR...","..RRRRYRRRRR...","..RRRRYRRRRR...","..YYYYYYYYYYY..","..RRRRYRRRRR...","..RRRRYRRRRR...","...RRRRRRRRR...","....RRRRRRR....",".....RRRRR.....","......RRR......",".......R......."
  ],
  wreath:[
    ".....GGGGG.....","...GGGGGGGGG...","..GGGG...GGGG..",".GGG.......GGG.",".GG.........GG.","GG...........GG","GG...........GG","GG...........GG","GG...........GG",".GG.........GG.",".GGG.......GGG.","..GGGG...GGGG..","...GGRRRRRGG...","....RRRRRRR....",".....RR.RR....."
  ],
  snowflake:[
    ".......W.......","...W...W...W...","....W..W..W....",".....W.W.W.....","W.....WWW.....W",".W...WWWWW...W.","..W.WWWWWWW.W..","WWWWWWWWWWWWWWW","..W.WWWWWWW.W..",".W...WWWWW...W.","W.....WWW.....W",".....W.W.W.....","....W..W..W....","...W...W...W...",".......W......."
  ],
  star:[
    ".......Y.......","......YYY......","......YYY......",".....YYYYY.....","YYYYYYYYYYYYYYY",".YYYYYYYYYYYYY.","..YYYYYYYYYYY..","...YYYYYYYYY...","....YYYYYYY....","...YYYY.YYYY...","..YYYY...YYYY..",".YYYY.....YYYY.","YYY.........YYY","Y.............Y","..............."
  ],
  cracker:[
    "RR...........RR",".RR.........RR.","..RR.......RR..","...RRYYYYYRR...","....YYYYYYY....","...YYYYYYYYY...","...YYYYYYYYY...","...YYYYYYYYY...","...YYYYYYYYY...","....YYYYYYY....","...RRYYYYYRR...","..RR.......RR..",".RR.........RR.","RR...........RR","..............."
  ],
  snowman:[
    ".....WWWWW.....","....WWWWWWW....","...WWWWWWWWW...","...WWKWWWKWW...","...WWWWOWWWW...","....WWWWWWW....","...RRRRRRRRR...","..WWWWWWWWWWW..",".WWWWWWKWWWWWW.",".WWWWWWWWWWWWW.",".WWWWKWWWKWWWW.","..WWWWWWWWWWW..","...WWWWWWWWW...","....WWWWWWW....",".....WWWWW....."
  ],
  mitten:[
    ".....RRRR......","....RRRRRR.....","...RRRRRRRR....","..RRRRRRRRR....","..RRRRRRRRR....","..RRRRRRRRR....","RRRRRRRRRRR....","RRRRRRRRRRR....",".RRRRRRRRRR....","..RRRRRRRRR....","...RRRRRRRR....","...RRRRRRRR....","...RRRRRRRR....","...WWWWWWWW....","...WWWWWWWW...."
  ],
  holly:[
    "G.............G","GG...........GG","GGG.........GGG",".GGG.......GGG.","..GGG.....GGG..","...GGG...GGG...","....GGG.GGG....",".....GRRRG.....","....GGRRRGG....","...GGG.R.GGG...","..GGG.....GGG..",".GGG.......GGG.","GGG.........GGG","GG...........GG","G.............G"
  ],
  candle:[
    ".......Y.......","......YYY......",".....YYYYY.....","......YYY......",".......Y.......",".....WWWWW.....",".....WWWWW.....",".....WWRWW.....",".....WWRWW.....",".....WWRWW.....",".....WWRWW.....",".....WWRWW.....",".....WWWWW.....","....WWWWWWW....","...WWWWWWWWW..."
  ],
  hat:[
    "..............W",".............WW","............RRW","...........RRR.","..........RRRR.",".........RRRRR.","........RRRRRR.",".......RRRRRRR.","......RRRRRRRR.",".....RRRRRRRRR.","....RRRRRRRRRR.","...RRRRRRRRRRR.","..WWWWWWWWWWWW.",".WWWWWWWWWWWWWW","..............."
  ],
  gingerbread:[
    ".....OOOOO.....","....OOOOOOO....","...OOOWOWOOO...","...OOOOOOOOO...","....OOOOOOO....","OOO..OOOOO..OOO",".OOOOOOOOOOOOO.","..OOOOOOOOOOO..","...OOOOWOOOO...","...OOOOOOOOO...","...OOOOOOOOO...","....OOO.OOO....","...OOO...OOO...","..OOO.....OOO..",".OOO.......OOO."
  ],
  sleigh:[
    "RRR............","RRR............","RRR............","RRR............","RRRRRRRRR......",".RRRRRRRRRRR...","..RRRRRRRRRRR..","...RRRRRRRRRRR.","....RRRRRRRRRRR",".....RRRRRRRRR.","......YYYYYY...","...YYYYYYYYYYY.","..YY.........YY",".YY...........Y","YY............."
  ],
  reindeer:[
    "YY.........YY..",".YY.......YY...","..YY.....YY....","...YY...YY.....","....YYYYY......","...OOOOOOO.....","..OOKOOOKOO....","...OOOOOOO.....","....OOROO......","...OOOOOOOOO...","..OOOOOOOOOOO..","..OOOOOOOOOOO..","...OOO...OOO...","...OOO...OOO...","..OO.......OO.."
  ],
  house:[
    "......WWW......",".....WWWWW.....","....WWWWWWW....","...WWWWWWWWW...","..WWWWWWWWWWW..",".RRRRRRRRRRRRR.",".RRRRRRRRRRRRR.",".RGGGRRRRRGGGR.",".RGGGRRRRRGGGR.",".RRRRRRRRRRRRR.",".RRRRROOORRRRR.",".RRRRROOORRRRR.",".RRRRROOORRRRR.",".RRRRROOORRRRR.",".RRRRRRRRRRRRR."
  ],
  finale:[
    ".......Y.......","......YYY......",".....GGGGG.....","....GGGGGGG....","...GGGGRGGGG...","..GGGGGGGGGGG..",".GGGYGGGGGYGGG.","GGGGGGGGGGGGGGG","...GGGGGGGGG...","..GGGGGGGGGGG..",".GGGGGGGGGGGGG.","......OOO......","RRRRR.OOO.BBBBB","RRYRR.OOO.BYBBB","RRRRR.....BBBBB"
  ]
};
const COLOR_CODE={R:'red',G:'green',Y:'yellow',W:'white',B:'blue',O:'orange',K:'black'};
function makePattern(type){
  const rows=PATTERN_MASKS[type]||PATTERN_MASKS.tree;
  return rows.map(function(row){
    return row.split('').map(function(ch){return ch==='.'?null:{color:COLOR_CODE[ch]||'blue'};});
  });
}
function shuffledIndices(n,seed){
  const a=[];for(let i=0;i<n;i++)a.push(i);
  const rnd=seeded(seed);
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}
  return a;
}
function buildLevel(index){
  const cfg=LEVELS[index],matrix=makePattern(cfg.pattern),list=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const cell=matrix[r][c];if(!cell)continue;
    const color=cell.color||COLORS[(r+c+index)%COLORS.length];
    list.push({r:r,c:c,x:BRICK_X+c*(BRICK_W+GAP_X),y:BRICK_Y+r*(BRICK_H+GAP_Y),w:BRICK_W,h:BRICK_H,kind:'normal',color:color,hp:1,maxHp:1,alive:true,unbreakable:false});
  }
  const order=shuffledIndices(list.length,9137+index*971);
  let cursor=0;
  function apply(count,kind){
    let done=0,guard=0;
    while(done<count&&guard<order.length*3){
      const b=list[order[cursor%order.length]];cursor++;guard++;
      if(!b||b.kind!=='normal')continue;
      if(kind==='armor'){b.kind='armor';b.color='white';b.hp=2;b.maxHp=2;}
      else if(kind==='solid'){b.kind='solid';b.color='black';b.unbreakable=true;b.hp=999;b.maxHp=999;}
      else if(kind==='explosive'){b.kind='explosive';}
      else if(kind==='power'){b.kind='power';}
      done++;
    }
  }
  apply(cfg.armor,'armor');apply(cfg.solid,'solid');apply(cfg.bombs,'explosive');apply(cfg.powers,'power');
  return list;
}

function currentPaddleWidth(now){return paddle.baseWidth+(now<effects.wide?38:0);}
function effectSpeedFactor(now){
  let f=1;if(now<effects.boost)f*=1.22;if(now<effects.slow)f*=.80;return f;
}
function currentTargetSpeed(ball,now){return ball.baseSpeed*effectSpeedFactor(now);}
function rescaleBall(ball,now){
  if(ball.stuck)return;
  const m=Math.hypot(ball.vx,ball.vy)||1,s=currentTargetSpeed(ball,now);ball.vx=ball.vx/m*s;ball.vy=ball.vy/m*s;
}
function syncSpeedEffects(now){
  const f=effectSpeedFactor(now);
  if(Math.abs(f-speedFactorApplied)<.001)return;
  speedFactorApplied=f;balls.forEach(function(b){rescaleBall(b,now);});
}
function makeBall(x,y,angle,stuck){
  const cfg=LEVELS[levelIndex],speed=cfg.speed;
  return {x:x,y:y,r:9,vx:Math.sin(angle||0)*speed,vy:-Math.cos(angle||0)*speed,baseSpeed:speed,stuck:!!stuck,stuckOffset:0,trail:[]};
}
function resetServe(){
  balls=[makeBall(paddle.x,paddle.y-14,0,true)];balls[0].stuckOffset=0;state='ready';combo=0;
  message='TAP / SPACE TO LAUNCH';messageUntil=Infinity;
}
function launchStuck(){
  const stuck=balls.filter(function(b){return b.stuck;});
  if(!stuck.length)return;
  ensureAudio();
  stuck.forEach(function(b,i){
    const angle=((i-(stuck.length-1)/2)*.18)+(Math.random()-.5)*.08;
    b.stuck=false;b.vx=Math.sin(angle)*b.baseSpeed;b.vy=-Math.cos(angle)*b.baseSpeed;rescaleBall(b,performance.now());
  });
  state='playing';message='';messageUntil=0;tone(520,.08,'sine',.035,700);
}
function newRun(){
  score=0;lives=3;combo=0;comboBest=0;levelIndex=0;powerups=[];particles=[];lasers=[];
  Object.keys(effects).forEach(function(k){effects[k]=0;});speedFactorApplied=1;
  paddle.x=W/2;paddle.lastX=paddle.x;paddle.vx=0;
  loadCurrentLevel(true);
}
function loadCurrentLevel(first){
  const cfg=LEVELS[levelIndex];bricks=buildLevel(levelIndex);levelNameEl.textContent=cfg.name;
  powerups=[];lasers=[];Object.keys(effects).forEach(function(k){effects[k]=0;});speedFactorApplied=1;
  resetServe();
  message=(first?'LEVEL 1 · ':'LEVEL '+(levelIndex+1)+' · ')+cfg.name;messageUntil=performance.now()+1300;
}
function nextLevel(){
  levelIndex++;
  if(levelIndex>=LEVELS.length){finishRun(true);return;}
  loadCurrentLevel(false);
  state='ready';
}
function remainingBreakables(){return bricks.some(function(b){return b.alive&&!b.unbreakable;});}
function scoreForBrick(b,now){
  const base=b.kind==='armor'?220:b.kind==='explosive'?180:b.kind==='power'?160:100;
  const comboMul=1+Math.min(2,Math.floor(combo/5)*.25);
  const boost=now<effects.boost?2:1;
  return Math.round(base*comboMul*boost);
}
function addScore(v){score+=v;if(score>highScore)saveHighScore();}
function showToast(text){
  clearTimeout(toastTimer);powerToast.textContent=text;powerToast.classList.add('show');
  toastTimer=setTimeout(function(){powerToast.classList.remove('show');},1150);
}
function spawnParticles(x,y,count){
  const rnd=Math.random;
  for(let i=0;i<count;i++){
    const a=rnd()*Math.PI*2,s=35+rnd()*115;
    particles.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.42+rnd()*.38,max:.8,size:5+rnd()*7,img:'particle'+Math.floor(rnd()*4)});
  }
}
function maybeDropPower(b,forced){
  if(!forced&&Math.random()>.13)return;
  const type=POWER_KEYS[Math.floor(Math.random()*POWER_KEYS.length)];
  powerups.push({type:type,x:b.x+b.w/2,y:b.y+b.h/2,vy:102,size:type==='multi'?34:32,spin:Math.random()*6.28,phase:Math.random()*6.28});
}
function destroyBrick(b,now,fromBlast){
  if(!b.alive||b.unbreakable)return;
  b.alive=false;combo++;comboBest=Math.max(comboBest,combo);addScore(scoreForBrick(b,now));
  spawnParticles(b.x+b.w/2,b.y+b.h/2,b.kind==='explosive'?14:6);
  if(b.kind==='power')maybeDropPower(b,true);else maybeDropPower(b,false);
  if(b.kind==='explosive')triggerExplosion(b,now);
  tone(520+Math.min(360,combo*8),.045,'square',.018);
  if(!remainingBreakables()&&state!=='levelClear'){
    state='levelClear';levelTransitionAt=now+1300;message='LEVEL CLEAR';messageUntil=levelTransitionAt;addScore(500+(levelIndex+1)*100);tone(740,.22,'sine',.05,1120);vibrate([14,35,22]);
  }
}
function triggerExplosion(source,now){
  buzz();vibrate(18);
  const sx=source.x+source.w/2,sy=source.y+source.h/2;
  bricks.forEach(function(b){
    if(!b.alive||b.unbreakable||b===source)return;
    const dx=(b.x+b.w/2)-sx,dy=(b.y+b.h/2)-sy;
    if(Math.hypot(dx,dy)<=72){b.hp=1;destroyBrick(b,now,true);}
  });
}
function hitBrick(b,now,fire){
  if(!b.alive)return;
  if(b.unbreakable){tone(210,.04,'square',.012);return;}
  if(fire)b.hp=1;
  b.hp--;
  if(b.hp<=0)destroyBrick(b,now,false);
  else{addScore(45*(now<effects.boost?2:1));spawnParticles(b.x+b.w/2,b.y+b.h/2,3);tone(360,.045,'square',.015);}
}
function splitBalls(now){
  const originals=balls.filter(function(b){return !b.stuck;});
  if(!originals.length){launchStuck();return splitBalls(now);}
  const fresh=[];
  originals.forEach(function(b){
    if(balls.length+fresh.length>=6)return;
    const speed=currentTargetSpeed(b,now),baseAngle=Math.atan2(b.vx,-b.vy);
    [-.34,.34].forEach(function(delta){
      if(balls.length+fresh.length>=6)return;
      const ang=baseAngle+delta;
      fresh.push({x:b.x,y:b.y,r:b.r,vx:Math.sin(ang)*speed,vy:-Math.cos(ang)*speed,baseSpeed:b.baseSpeed,stuck:false,stuckOffset:0,trail:[]});
    });
  });
  balls=balls.concat(fresh);tone(720,.13,'sine',.045,1040);vibrate(12);
}
function applyPower(type,now){
  const def=POWER[type];if(!def)return;
  if(type==='multi')splitBalls(now);
  else if(type==='life'){lives=Math.min(9,lives+1);tone(940,.18,'sine',.05,1250);}
  else{
    const durations={wide:12000,slow:9000,boost:9000,fire:8000,laser:10000,catch:10000};
    effects[type]=Math.max(effects[type],now)+durations[type];
    if(type==='boost'||type==='slow')syncSpeedEffects(now);
    tone(760,.12,'sine',.04,980);
  }
  showToast(def.label);vibrate(10);
}
function updatePaddle(dt,now){
  const before=paddle.x;
  const keyboard=(keyRight?1:0)-(keyLeft?1:0);
  if(keyboard)paddle.x+=keyboard*330*dt;
  const pw=currentPaddleWidth(now);paddle.x=clamp(paddle.x,pw/2+7,W-pw/2-7);
  paddle.vx=(paddle.x-before)/Math.max(dt,.001);paddle.lastX=before;
  balls.forEach(function(b){if(b.stuck){b.x=clamp(paddle.x+b.stuckOffset,pw/2?10:10,W-10);b.y=paddle.y-b.r-3;}});
}
function circleRectHit(b,r){
  const nx=clamp(b.x,r.x,r.x+r.w),ny=clamp(b.y,r.y,r.y+r.h),dx=b.x-nx,dy=b.y-ny;
  return dx*dx+dy*dy<=b.r*b.r;
}
function bounceFromRect(ball,r){
  const cx=clamp(ball.x,r.x,r.x+r.w),cy=clamp(ball.y,r.y,r.y+r.h);
  let dx=ball.x-cx,dy=ball.y-cy;
  if(Math.abs(dx)>Math.abs(dy)){ball.vx=dx<0?-Math.abs(ball.vx):Math.abs(ball.vx);ball.x+=dx<0?-1:1;}
  else{ball.vy=dy<0?-Math.abs(ball.vy):Math.abs(ball.vy);ball.y+=dy<0?-1:1;}
}
function paddleBounce(ball,now){
  const pw=currentPaddleWidth(now);
  if(ball.vy<=0)return;
  const rect={x:paddle.x-pw/2,y:paddle.y,w:pw,h:paddle.height};
  if(!circleRectHit(ball,rect))return;
  ball.y=paddle.y-ball.r-1;
  if(now<effects.catch){
    ball.stuck=true;ball.stuckOffset=clamp(ball.x-paddle.x,-pw*.4,pw*.4);ball.vx=0;ball.vy=0;message='TAP / SPACE TO RELEASE';messageUntil=Infinity;
  }else{
    const hit=clamp((ball.x-paddle.x)/(pw/2),-.96,.96);
    const angle=hit*1.12;
    const speed=currentTargetSpeed(ball,now);
    ball.vx=Math.sin(angle)*speed+paddle.vx*.08;ball.vy=-Math.abs(Math.cos(angle)*speed);rescaleBall(ball,now);
  }
  combo=0;tone(430,.045,'sine',.02,540);
}
function updateBall(ball,dt,now){
  if(ball.stuck)return true;
  const speed=Math.hypot(ball.vx,ball.vy),steps=clamp(Math.ceil(speed*dt/(ball.r*.65)),1,8),step=dt/steps;
  for(let s=0;s<steps;s++){
    ball.x+=ball.vx*step;ball.y+=ball.vy*step;
    if(ball.x-ball.r<5){ball.x=5+ball.r;ball.vx=Math.abs(ball.vx);tone(250,.025,'sine',.008);}
    if(ball.x+ball.r>W-5){ball.x=W-5-ball.r;ball.vx=-Math.abs(ball.vx);tone(250,.025,'sine',.008);}
    if(ball.y-ball.r<58){ball.y=58+ball.r;ball.vy=Math.abs(ball.vy);tone(280,.025,'sine',.008);}
    paddleBounce(ball,now);
    const fire=now<effects.fire;
    for(let i=0;i<bricks.length;i++){
      const b=bricks[i];if(!b.alive||!circleRectHit(ball,b))continue;
      if(b.unbreakable){bounceFromRect(ball,b);hitBrick(b,now,false);break;}
      hitBrick(b,now,fire);
      if(!fire){bounceFromRect(ball,b);break;}
    }
    if(ball.y-ball.r>H+14)return false;
  }
  ball.trail.unshift({x:ball.x,y:ball.y});if(ball.trail.length>7)ball.trail.pop();
  return true;
}
function updatePowerups(dt,now){
  const pw=currentPaddleWidth(now),left=paddle.x-pw/2,right=paddle.x+pw/2;
  powerups=powerups.filter(function(p){
    p.y+=p.vy*dt;p.spin+=dt*3.2;p.x+=Math.sin(p.phase+p.spin)*7*dt;p.x=clamp(p.x,18,W-18);
    if(p.y+p.size/2>=paddle.y&&p.y-p.size/2<=paddle.y+paddle.height&&p.x>=left-8&&p.x<=right+8){applyPower(p.type,now);return false;}
    return p.y<H+35;
  });
}
function fireLasers(now){
  if(now>=effects.laser||state!=='playing'||now-lastLaserShot<410)return;
  lastLaserShot=now;const pw=currentPaddleWidth(now);
  lasers.push(
    {x:paddle.x-pw*.32,y:paddle.y-8,vy:-455,r:4.3},
    {x:paddle.x+pw*.32,y:paddle.y-8,vy:-455,r:4.3}
  );
  tone(560,.04,'sine',.012,430);
}
function updateLasers(dt,now){
  fireLasers(now);
  lasers=lasers.filter(function(l){
    l.y+=l.vy*dt;
    for(let i=0;i<bricks.length;i++){
      const b=bricks[i];if(!b.alive)continue;
      const nx=clamp(l.x,b.x,b.x+b.w),ny=clamp(l.y,b.y,b.y+b.h),dx=l.x-nx,dy=l.y-ny;
      if(dx*dx+dy*dy<=l.r*l.r){hitBrick(b,now,false);spawnParticles(l.x,l.y,2);return false;}
    }
    return l.y>-12;
  });
}
function updateParticles(dt){
  particles=particles.filter(function(p){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt;return p.life>0;});
}
function loseLife(now){
  lives--;combo=0;powerups=[];lasers=[];
  if(lives<=0){finishRun(false);return;}
  tone(230,.28,'sawtooth',.035,115);vibrate([25,40,25]);resetServe();message='LIFE LOST · '+lives+' LEFT';messageUntil=now+1100;
}
function finishRun(victory){
  state=victory?'victory':'gameOver';paused=true;saveHighScore();
  resultKicker.textContent=victory?'ALL 20 LEVELS CLEARED':'RUN OVER';
  resultTitle.textContent=victory?'Workshop Complete!':'Game Over';
  resultScore.textContent=String(score);resultBest.textContent=String(highScore);
  resultMessage.textContent=victory?'You cleared the entire Block Breaker run. Best combo: '+comboBest+'.':'You reached level '+(levelIndex+1)+' of '+LEVELS.length+'. Best combo: '+comboBest+'.';
  resultSheet.classList.add('show');
  if(victory){tone(660,.32,'sine',.05,1320);vibrate([20,40,20,40,35]);}else tone(200,.3,'sawtooth',.035,90);
}
function update(dt,now){
  updatePaddle(dt,now);syncSpeedEffects(now);
  if(state==='playing'){
    const kept=[];balls.forEach(function(b){if(updateBall(b,dt,now))kept.push(b);});balls=kept;
    if(!balls.length){loseLife(now);return;}
    updatePowerups(dt,now);updateLasers(dt,now);
  }else if(state==='ready'){
    balls.forEach(function(b){if(b.stuck){b.x=paddle.x+b.stuckOffset;b.y=paddle.y-b.r-3;}});
  }else if(state==='levelClear'&&now>=levelTransitionAt){
    nextLevel();
  }
  updateParticles(dt);
}

function drawBackground(){
  ctx.fillStyle='#30231c';ctx.fillRect(0,0,W,H);
  const wood=img.wood;
  if(wood&&wood.complete&&wood.naturalWidth){
    if(!woodPattern)woodPattern=ctx.createPattern(wood,'repeat');
    ctx.fillStyle=woodPattern;ctx.fillRect(0,58,W,H-58);
  }
  const wash=ctx.createLinearGradient(0,58,0,H);
  wash.addColorStop(0,'rgba(7,48,36,.70)');wash.addColorStop(.48,'rgba(14,31,28,.63)');wash.addColorStop(1,'rgba(52,17,24,.68)');
  ctx.fillStyle=wash;ctx.fillRect(0,58,W,H-58);

  // Real Christmas scenery, deliberately subdued so the ball and bricks stay readable.
  drawImg('treeSnow',-22,82,92,188,.16);
  ctx.save();ctx.translate(W,0);ctx.scale(-1,1);drawImg('treeSnow',-22,108,82,168,.12);ctx.restore();
  drawImg('holidayCluster',10,H-112,76,76,.18);
  drawImg('holidayCluster',W-78,H-96,66,66,.14);

  const centre=ctx.createRadialGradient(W/2,330,30,W/2,330,260);
  centre.addColorStop(0,'rgba(9,18,18,.02)');centre.addColorStop(1,'rgba(3,8,9,.42)');
  ctx.fillStyle=centre;ctx.fillRect(0,58,W,H-58);
}
function drawHud(now){
  ctx.fillStyle='rgba(7,14,18,.94)';ctx.fillRect(0,0,W,58);
  ctx.strokeStyle='rgba(118,145,158,.25)';ctx.beginPath();ctx.moveTo(0,57.5);ctx.lineTo(W,57.5);ctx.stroke();
  ctx.textBaseline='middle';
  drawImg('star',13,12,26,26);
  ctx.fillStyle='#8fa4af';ctx.font='800 7px Inter, sans-serif';ctx.fillText('SCORE',44,17);
  ctx.fillStyle='#fff';ctx.font='700 17px Fredoka, sans-serif';ctx.fillText(String(score),44,34);
  ctx.textAlign='center';ctx.fillStyle='#8fa4af';ctx.font='800 7px Inter, sans-serif';ctx.fillText('LEVEL',W/2,17);
  ctx.fillStyle='#ffd86a';ctx.font='700 17px Fredoka, sans-serif';ctx.fillText(String(levelIndex+1)+' / '+LEVELS.length,W/2,34);
  ctx.textAlign='right';ctx.fillStyle='#8fa4af';ctx.font='800 7px Inter, sans-serif';ctx.fillText('LIVES',W-14,17);
  for(let i=0;i<lives;i++)drawSnowball(W-13-i*18,34,6,1);
  ctx.textAlign='left';
  const active=[];
  if(now<effects.wide)active.push(['WIDE','#2bc989']);
  if(now<effects.slow)active.push(['SLOW','#879aa6']);
  if(now<effects.boost)active.push(['x2 SPEED','#f3bd29']);
  if(now<effects.fire)active.push(['FIRE','#f07a3f']);
  if(now<effects.laser)active.push(['SNOW SHOT','#8ed8f5']);
  if(now<effects.catch)active.push(['CATCH','#36bcae']);
  let x=8;
  active.slice(0,4).forEach(function(a){
    ctx.font='800 6px Inter, sans-serif';const w=ctx.measureText(a[0]).width+12;
    roundRectPath(ctx,x,62,w,15,6);ctx.fillStyle=a[1];ctx.globalAlpha=.9;ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.fillText(a[0],x+6,70);x+=w+4;
  });
}
const ICE_TINT={
  blue:'rgba(76,184,235,.34)',
  green:'rgba(73,210,157,.34)',
  red:'rgba(229,91,111,.34)',
  yellow:'rgba(255,205,70,.31)',
  orange:'rgba(225,143,68,.34)',
  white:'rgba(245,251,255,.10)',
  black:'rgba(15,58,86,.66)'
};
function drawIceSlab(b){
  const cracked=b.kind==='armor'&&b.hp===1;
  const key=cracked?'iceCracked':'iceClean';
  const tint=ICE_TINT[b.color]||ICE_TINT.blue;

  ctx.save();
  ctx.shadowColor=b.unbreakable?'rgba(41,151,205,.32)':'rgba(167,232,255,.20)';
  ctx.shadowBlur=b.unbreakable?6:3;

  if(!drawImg(key,b.x,b.y,b.w,b.h)){
    const g=ctx.createLinearGradient(b.x,b.y,b.x,b.y+b.h);
    g.addColorStop(0,'#faffff');g.addColorStop(.55,'#dceff6');g.addColorStop(1,'#9fc7d8');
    ctx.fillStyle=g;roundRectPath(ctx,b.x,b.y,b.w,b.h,5);ctx.fill();
  }

  // Gentle embedded colour keeps the Christmas silhouette readable without
  // turning the ice back into coloured toy bricks.
  roundRectPath(ctx,b.x+2,b.y+2,b.w-4,b.h-4,4);
  ctx.fillStyle=tint;ctx.fill();

  // Repaint the clear slab softly over the tint to restore its frosted/glass highlights.
  drawImg(key,b.x,b.y,b.w,b.h,.58);

  if(b.unbreakable){
    ctx.strokeStyle='rgba(80,203,246,.72)';ctx.lineWidth=1.2;
    roundRectPath(ctx,b.x+.7,b.y+.7,b.w-1.4,b.h-1.4,5);ctx.stroke();
  }

  // Special objects are visibly frozen *inside* the ice rather than replacing it.
  if(b.kind==='explosive'){
    drawImg('explosive',b.x+b.w*.25,b.y+b.h*.10,b.w*.50,b.h*.80,.82);
  }else if(b.kind==='power'){
    drawImg('powerBrick',b.x+b.w*.29,b.y+b.h*.13,b.w*.42,b.h*.74,.82);
  }
  ctx.restore();
}
function drawBricks(){
  bricks.forEach(function(b){
    if(!b.alive)return;
    drawIceSlab(b);
  });
}
function drawPaddle(now){
  const pw=currentPaddleWidth(now),x=paddle.x-pw/2;
  if(!drawImg('paddle',x,paddle.y,pw,paddle.height)){ctx.fillStyle='#e9edf0';roundRectPath(ctx,x,paddle.y,pw,paddle.height,8);ctx.fill();}
  if(now<effects.laser){
    ctx.save();ctx.shadowColor='#dff6ff';ctx.shadowBlur=7;
    drawSnowShot(x+10,paddle.y-5,4.2);drawSnowShot(x+pw-10,paddle.y-5,4.2);
    ctx.restore();
  }
}
function drawBalls(now){
  balls.forEach(function(b){
    if((now<effects.boost||now<effects.fire)&&!b.stuck){
      b.trail.slice().reverse().forEach(function(t,i){
        ctx.globalAlpha=(i+1)/b.trail.length*.12;
        ctx.fillStyle=now<effects.fire?'#ffd0a3':'#dff5ff';
        ctx.beginPath();ctx.arc(t.x,t.y,b.r*(.32+i*.05),0,Math.PI*2);ctx.fill();
      });
      ctx.globalAlpha=1;
    }
    if(now<effects.fire){
      ctx.save();ctx.shadowColor='#ff9a4b';ctx.shadowBlur=14;drawSnowball(b.x,b.y,b.r,1);ctx.restore();
      ctx.strokeStyle='#ffc06c';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(b.x,b.y,b.r+1.2,0,Math.PI*2);ctx.stroke();
    }else{
      drawSnowball(b.x,b.y,b.r,1);
    }
  });
}
function drawPowerIcon(p){
  const def=POWER[p.type],s=p.size,asset=img[def.pickup];
  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.rotate(Math.sin(p.spin)*.07);
  ctx.shadowColor='rgba(0,0,0,.42)';ctx.shadowBlur=7;ctx.shadowOffsetY=3;
  if(asset&&asset.complete&&asset.naturalWidth)ctx.drawImage(asset,-s/2,-s/2,s,s);
  else{ctx.fillStyle='#d94b43';roundRectPath(ctx,-s/2,-s/2,s,s,6);ctx.fill();}
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  if(def.icon){
    ctx.globalAlpha=.95;
    if(def.icon==='snowShot'){
      drawSnowShot(-4,3,2.7);drawSnowShot(4,0,2.7);drawSnowShot(1,6,2.5);
    }else drawImg(def.icon,-6,0,12,12);
    ctx.globalAlpha=1;
  }
  ctx.restore();
}
function drawPowerups(){powerups.forEach(drawPowerIcon);}
function drawLasers(){lasers.forEach(function(l){drawSnowShot(l.x,l.y,l.r||4.3);});}
function drawParticles(){
  particles.forEach(function(p){ctx.globalAlpha=clamp(p.life/p.max,0,1);if(!drawImg(p.img,p.x-p.size/2,p.y-p.size/2,p.size,p.size)){ctx.fillStyle='#fff';ctx.fillRect(p.x,p.y,2,2);}});ctx.globalAlpha=1;
}
function drawOverlayText(now){
  if(combo>=3&&state==='playing'){
    ctx.textAlign='center';ctx.fillStyle='rgba(255,216,106,.92)';ctx.font='700 13px Fredoka, sans-serif';ctx.fillText('COMBO x'+combo,W/2,334);ctx.textAlign='left';
  }
  if(message&&now<messageUntil){
    ctx.textAlign='center';ctx.font='700 17px Fredoka, sans-serif';
    const tw=Math.min(W-44,ctx.measureText(message).width+30);roundRectPath(ctx,(W-tw)/2,355,tw,42,14);ctx.fillStyle='rgba(7,14,18,.84)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.16)';ctx.stroke();ctx.fillStyle='#fff';ctx.fillText(message,W/2,376);ctx.textAlign='left';
  }
  if(state==='ready'&&!message){
    ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,.88)';ctx.font='700 14px Fredoka, sans-serif';ctx.fillText('TAP / SPACE TO LAUNCH',W/2,376);ctx.textAlign='left';
  }
}
function render(now){
  ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=true;
  drawBackground();drawHud(now);drawBricks();drawLasers();drawParticles();drawPowerups();drawPaddle(now);drawBalls(now);drawOverlayText(now);
}
function loop(now){
  const raw=(now-lastTime)/1000;lastTime=now;const dt=clamp(raw,0,.033);
  if(!paused)update(dt,now);render(now);requestAnimationFrame(loop);
}

function canvasPos(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
function movePaddleTo(x,now){
  const pw=currentPaddleWidth(now);paddle.x=clamp(x,pw/2+7,W-pw/2-7);
  balls.forEach(function(b){if(b.stuck){b.x=clamp(paddle.x+b.stuckOffset,10,W-10);b.y=paddle.y-b.r-3;}});
}
canvas.addEventListener('pointerdown',function(e){e.preventDefault();ensureAudio();pointerId=e.pointerId;try{canvas.setPointerCapture(e.pointerId);}catch(_){}const p=canvasPos(e);movePaddleTo(p.x,performance.now());if(!paused&&(state==='ready'||balls.some(function(b){return b.stuck;})))launchStuck();});
canvas.addEventListener('pointermove',function(e){if(e.pointerType==='mouse'||e.pointerId===pointerId){const p=canvasPos(e);movePaddleTo(p.x,performance.now());}});
canvas.addEventListener('pointerup',function(e){if(e.pointerId===pointerId)pointerId=null;});
canvas.addEventListener('pointercancel',function(e){if(e.pointerId===pointerId)pointerId=null;});
document.addEventListener('keydown',function(e){
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){keyLeft=true;e.preventDefault();}
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){keyRight=true;e.preventDefault();}
  if(e.code==='Space'){ensureAudio();if(!paused&&(state==='ready'||balls.some(function(b){return b.stuck;})))launchStuck();e.preventDefault();}
  if(e.key==='Escape'){if(howToSheet.classList.contains('show'))closeHowTo();else if(settingsSheet.classList.contains('show'))closeSettings();else if(!resultSheet.classList.contains('show'))openSettings();}
});
document.addEventListener('keyup',function(e){if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')keyLeft=false;if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')keyRight=false;});

function shiftTimers(delta){
  Object.keys(effects).forEach(function(k){if(effects[k]>0)effects[k]+=delta;});
  if(levelTransitionAt>0)levelTransitionAt+=delta;if(messageUntil!==Infinity&&messageUntil>0)messageUntil+=delta;
}
function setPaused(v){
  const now=performance.now();
  if(v&&!paused){paused=true;pausedAt=now;}
  else if(!v&&paused){if(pausedAt)shiftTimers(now-pausedAt);paused=false;pausedAt=0;lastTime=now;}
}
function openSettings(){setPaused(true);settingsHighScore.textContent=String(highScore);settingsSheet.classList.add('show');}
function closeSettings(){settingsSheet.classList.remove('show');if(!howToSheet.classList.contains('show')&&!resultSheet.classList.contains('show'))setPaused(false);}
function openHowTo(){settingsSheet.classList.remove('show');setPaused(true);howToSheet.classList.add('show');}
function closeHowTo(){howToSheet.classList.remove('show');if(!settingsSheet.classList.contains('show')&&!resultSheet.classList.contains('show'))setPaused(false);}
function updateSoundUi(){
  soundState.textContent=sound?'On':'Off';soundIcon.src='../assets/gamebox/kenney/icons/Game Icons/White/2x/'+(sound?'audioOn.png':'audioOff.png');
  soundCheck.src='../assets/gamebox/kenney/ui/UI Pack/'+(sound?'Green/Double/check_square_color_checkmark.png':'Grey/Double/check_square_grey.png');
}
document.getElementById('menuButton').addEventListener('click',openSettings);
document.getElementById('closeSettings').addEventListener('click',closeSettings);
document.getElementById('resumeButton').addEventListener('click',closeSettings);
document.getElementById('howToButton').addEventListener('click',openHowTo);
document.getElementById('closeHowTo').addEventListener('click',closeHowTo);
document.getElementById('startGameButton').addEventListener('click',function(){ensureAudio();closeHowTo();});
document.getElementById('soundButton').addEventListener('click',function(){sound=!sound;ensureAudio();updateSoundUi();});
document.getElementById('restartRunButton').addEventListener('click',function(){settingsSheet.classList.remove('show');resultSheet.classList.remove('show');newRun();setPaused(false);});
document.getElementById('playAgainButton').addEventListener('click',function(){resultSheet.classList.remove('show');newRun();setPaused(false);});
settingsSheet.addEventListener('click',function(e){if(e.target===settingsSheet)closeSettings();});
howToSheet.addEventListener('click',function(e){if(e.target===howToSheet)closeHowTo();});
document.addEventListener('visibilitychange',function(){if(document.hidden&&!resultSheet.classList.contains('show'))openSettings();});

settingsHighScore.textContent=String(highScore);updateSoundUi();
newRun();paused=true;pausedAt=performance.now();lastTime=performance.now();requestAnimationFrame(loop);
loadAssets().then(function(){assetsReady=true;}).catch(function(){assetsReady=false;});
})();