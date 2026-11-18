(()=>{
'use strict';

const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;

const W=336,H=480,TILE=16;
const PATH_WIDTH=32;

const waveHud=document.getElementById('waveHud');
const moneyHud=document.getElementById('moneyHud');
const livesHud=document.getElementById('livesHud');
const scoreHud=document.getElementById('scoreHud');
const bestStart=document.getElementById('bestStart');
const waveBanner=document.getElementById('waveBanner');
const levelLabel=document.getElementById('levelLabel');
const levelName=document.getElementById('levelName');
const startWaveButton=document.getElementById('startWaveButton');
const towerChoices=[...document.querySelectorAll('.towerChoice')];
const buildHint=document.getElementById('buildHint');
const towerPanel=document.getElementById('towerPanel');
const towerPanelName=document.getElementById('towerPanelName');
const towerPanelStats=document.getElementById('towerPanelStats');
const upgradeButton=document.getElementById('upgradeButton');
const upgradeCostEl=document.getElementById('upgradeCost');
const sellButton=document.getElementById('sellButton');
const sellValueEl=document.getElementById('sellValue');
const startOverlay=document.getElementById('startOverlay');
const gameOverOverlay=document.getElementById('gameOverOverlay');
const playButton=document.getElementById('playButton');
const introHowButton=document.getElementById('introHowButton');
const finalScoreEl=document.getElementById('finalScore');
const finalBreakdown=document.getElementById('finalBreakdown');
const recordText=document.getElementById('recordText');
const resultEyebrow=document.getElementById('resultEyebrow');
const resultTitle=document.getElementById('resultTitle');
const againButton=document.getElementById('againButton');
const pauseButton=document.getElementById('pauseButton');
const pauseSheet=document.getElementById('pauseSheet');
const closePause=document.getElementById('closePause');
const resumeButton=document.getElementById('resumeButton');
const pauseHowButton=document.getElementById('pauseHowButton');
const restartButton=document.getElementById('restartButton');
const soundButton=document.getElementById('soundButton');
const howSheet=document.getElementById('howSheet');
const closeHow=document.getElementById('closeHow');
const closeHowButton=document.getElementById('closeHowButton');

const P82='assets/vendor/admurin/pack82/Monster%20Pack%2082%20(Event)/Snowmen/';
const P85='assets/vendor/admurin/pack85/Monster%20Pack%2085%20(Event%203)/Spritesheets/';
const RABBIT='assets/vendor/admurin/rabbits/Monster%20Pack%20(Free)/Spritesheets/Updated%20Rabbit%20Horned/';
const WINTER='assets/vendor/gherwit/winter/Winter-Download/Winter-tiles.png';

const ASSETS={
  winter:WINTER,
  snowA:P82+'Christmas_Snowman_A_Idle.png',
  snowC:P82+'Christmas_Snowman_C_Idle.png',
  snowD:P82+'Christmas_Snowman_D_Idle.png',
  snowE:P82+'Christmas_Snowman_E_Idle.png',
  snowF:P82+'Christmas_Snowman_F_Idle.png',
  snowG:P82+'Christmas_Snowman_G_Idle.png',
  ginger:P85+'Gingerbread/Christmas_Gingerbread_Move.png',
  slime:P85+'Slime/Christmas_Slime_Move.png',
  devil:P85+'Devil/Christmas_Devil_Move.png',
  rabbit:RABBIT+'Rabbit_Horned_Move.png'
};

// Exact labels/coordinates exported by the Workshop Watch Asset Organiser.
// pathFloor supplies the normal 9-slice. snowFloor supplies inverse/inside corners.
const GHERWIT={
  snowGround:{col:12,row:1},
  snowDetailSmall:{col:1,row:1},
  snowDetailLarge:{col:0,row:1},
  pathFloor:{
    top_left_corner:{col:6,row:0},top_edge:{col:7,row:0},top_right_corner:{col:8,row:0},
    left_edge:{col:6,row:1},centre:{col:7,row:1},right_edge:{col:8,row:1},
    bottom_left_corner:{col:6,row:2},bottom_edge:{col:7,row:2},bottom_right_corner:{col:8,row:2}
  },
  snowFloor:{
    top_left_corner:{col:9,row:0},top_edge:{col:7,row:2},top_right_corner:{col:10,row:0},
    left_edge:{col:8,row:1},centre:{col:12,row:1},right_edge:{col:6,row:1},
    bottom_left_corner:{col:9,row:1},bottom_edge:{col:7,row:0},bottom_right_corner:{col:10,row:1}
  },
  tree:{
    tiles:[
      {col:9,row:6,x:0,y:0},{col:10,row:6,x:1,y:0},{col:11,row:6,x:2,y:0},
      {col:9,row:7,x:0,y:1},{col:10,row:7,x:1,y:1},{col:11,row:7,x:2,y:1},
      {col:9,row:8,x:0,y:2},{col:10,row:8,x:1,y:2},{col:11,row:8,x:2,y:2}
    ]
  },
  workshopGate:{
    tiles:[
      {col:6,row:0,x:0,y:0},{col:7,row:0,x:1,y:0},{col:8,row:0,x:2,y:0},
      {col:3,row:5,x:0,y:1},{col:1,row:5,x:1,y:1},{col:5,row:5,x:2,y:1}
    ]
  }
};

const TOWERS={
  snowA:{name:'SNOWBALLER',asset:'snowA',cost:65,range:88,damage:10,rate:.55,shotSpeed:240,kind:'snow',slow:0,splash:0},
  // DOUBLE TOSS deliberately uses the former green-hat Cheer snowman artwork.
  snowB:{name:'DOUBLE TOSS',asset:'snowG',cost:90,range:88,damage:8,rate:.62,shotSpeed:255,kind:'double',slow:0,splash:0,shots:2},
  snowC:{name:'RAPID SNOW',asset:'snowC',cost:95,range:82,damage:6,rate:.25,shotSpeed:275,kind:'rapid',slow:0,splash:0},
  snowD:{name:'FROST THROW',asset:'snowD',cost:110,range:98,damage:8,rate:.72,shotSpeed:230,kind:'frost',slow:.42,splash:0},
  snowE:{name:'HEAVY SNOW',asset:'snowE',cost:145,range:112,damage:30,rate:1.22,shotSpeed:190,kind:'heavy',slow:0,splash:30},
  snowF:{name:'LONG SHOT',asset:'snowF',cost:130,range:142,damage:22,rate:1.02,shotSpeed:340,kind:'long',slow:0,splash:0}
};

const ENEMIES={
  ginger:{asset:'ginger',hp:50,speed:39,reward:7,leak:1,draw:128},
  slime:{asset:'slime',hp:34,speed:62,reward:6,leak:1,draw:128},
  rabbit:{asset:'rabbit',hp:26,speed:78,reward:7,leak:1,draw:144},
  devil:{asset:'devil',hp:135,speed:32,reward:13,leak:1,draw:136},
  boss:{asset:'devil',hp:520,speed:24,reward:45,leak:2,draw:190,boss:true}
};

const TOTAL_LEVELS=12;
const WAVES_PER_LEVEL=5;

// Twelve fixed orthogonal tracks. Each stage changes the route instead of exposing a
// player-facing left/right route toggle.
const LEVELS=[
  {name:'FROST GATE',pressure:1.00,route:[[168,472],[168,424],[88,424],[88,344],[248,344],[248,264],[120,264],[120,184],[216,184],[216,120],[168,120],[168,72]]},
  {name:'CANDY CANE',pressure:1.02,route:[[168,472],[280,472],[280,360],[216,360],[216,232],[72,232],[72,120],[168,120],[168,72]]},
  {name:'ICICLE RUN',pressure:1.04,route:[[168,472],[56,472],[56,392],[136,392],[136,296],[296,296],[296,184],[200,184],[200,104],[168,104],[168,72]]},
  {name:'TINSEL STEPS',pressure:1.06,route:[[168,472],[104,472],[104,424],[232,424],[232,376],[120,376],[120,328],[248,328],[248,280],[136,280],[136,232],[216,232],[216,184],[152,184],[152,136],[168,136],[168,72]]},
  {name:'NORTH LOOP',pressure:1.08,route:[[168,472],[40,472],[40,104],[120,104],[120,376],[280,376],[280,152],[200,152],[200,312],[152,312],[152,120],[168,120],[168,72]]},
  {name:'SLEIGH SPIRAL',pressure:1.10,route:[[168,472],[296,472],[296,88],[56,88],[56,408],[248,408],[248,152],[104,152],[104,344],[200,344],[200,216],[152,216],[152,120],[168,120],[168,72]]},
  {name:'HOLLY HOURGLASS',pressure:1.12,route:[[168,472],[56,472],[56,424],[280,424],[280,360],[88,360],[88,296],[248,296],[248,232],[120,232],[120,168],[216,168],[216,104],[168,104],[168,72]]},
  {name:'POLAR DETOUR',pressure:1.14,route:[[168,472],[168,424],[296,424],[296,264],[200,264],[200,344],[72,344],[72,184],[136,184],[136,104],[168,104],[168,72]]},
  {name:'MISTLETOE BOXES',pressure:1.16,route:[[168,472],[72,472],[72,392],[264,392],[264,136],[104,136],[104,312],[216,312],[216,200],[152,200],[152,104],[168,104],[168,72]]},
  {name:'BLIZZARD SERPENT',pressure:1.18,route:[[168,472],[296,472],[296,408],[40,408],[40,344],[280,344],[280,280],[56,280],[56,216],[264,216],[264,152],[88,152],[88,104],[168,104],[168,72]]},
  {name:'ELF PASS',pressure:1.20,route:[[168,472],[120,472],[120,408],[216,408],[216,344],[136,344],[136,280],[200,280],[200,216],[152,216],[152,152],[184,152],[184,104],[168,104],[168,72]]},
  {name:'WORKSHOP GAUNTLET',pressure:1.24,route:[[168,472],[40,472],[40,424],[296,424],[296,376],[56,376],[56,328],[280,328],[280,280],[72,280],[72,232],[264,232],[264,184],[88,184],[88,136],[248,136],[248,104],[168,104],[168,72]]}
]

const images={};
let terrainMaskCache={level:0,mask:null};
let money=190,lives=10,score=0,level=1,wave=1,levelsCleared=0,perfectWaves=0;
let waveActive=false,paused=false,gameEnded=false,soundOn=true;
let buildType=null,selectedTower=-1;
let enemies=[],towers=[],projectiles=[],particles=[],spawnQueue=[];
let spawnClock=0,leaksThisWave=0,last=0,raf=0,bannerTimer=0,audioCtx=null,howFromPause=false,animClock=0;
let objectiveHit=0;
let pointer={x:-99,y:-99,inside:false};

const BEST_KEY='gamebox.workshopWatch.best.levels.v3';
let best=Number(localStorage.getItem(BEST_KEY)||0)||0;
bestStart.textContent=pad(best,4);

function pad(v,n=4){return String(Math.max(0,Math.floor(v))).padStart(n,'0')}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function pointDist(x1,y1,x2,y2){return Math.hypot(x1-x2,y1-y2)}
function currentLevel(){return LEVELS[level-1]}
function levelStartMoney(n){return 190+(n-1)*7}
function towerCost(type){
  const base=TOWERS[type].cost;
  const scaled=base*(1+(level-1)*.08);
  return Math.ceil(scaled/5)*5;
}
function levelWaveGroups(levelNo,waveNo){
  const l=levelNo;
  if(waveNo===1)return [['ginger',7+l*2],['slime',Math.max(0,Math.floor(l/2))]];
  if(waveNo===2)return [['slime',6+l],['rabbit',3+Math.ceil(l*.75)]];
  if(waveNo===3)return [['ginger',7+l],['rabbit',5+l],['devil',1+Math.ceil(l/3)]];
  if(waveNo===4)return [['ginger',4+Math.floor(l/2)],['slime',7+l],['devil',3+Math.ceil(l/2)],['rabbit',5+l]];
  return [['ginger',8+l],['rabbit',7+l],['devil',3+Math.ceil(l/2)],['boss',1+Math.floor((l-1)/4)]];
}

function loadAssets(){
  const entries=Object.entries(ASSETS);
  Promise.all(entries.map(([key,url])=>new Promise((resolve,reject)=>{
    const im=new Image();
    im.decoding='async';
    im.onload=()=>{images[key]=im;resolve()};
    im.onerror=reject;
    im.src=url;
  }))).then(()=>{
    playButton.disabled=false;
    playButton.textContent='DEFEND THE WORKSHOP';
    draw();
  }).catch(err=>{
    console.error('Workshop Watch asset load failed',err);
    playButton.disabled=false;
    playButton.textContent='RETRY / PLAY';
    showBanner('ASSET LOAD ERROR');
  });
}

function tone(kind){
  if(!soundOn)return;
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    const spec={
      build:[520,.05],shot:[780,.025],heavy:[180,.06],hit:[260,.02],
      wave:[650,.08],leak:[115,.12],win:[900,.16],sell:[330,.045],upgrade:[720,.07]
    }[kind]||[440,.04];
    o.frequency.value=spec[0];
    o.type=kind==='leak'?'sawtooth':'square';
    g.gain.setValueAtTime(.032,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+spec[1]);
    o.connect(g).connect(audioCtx.destination);
    o.start();o.stop(audioCtx.currentTime+spec[1]);
  }catch{}
}

function showBanner(textValue){
  waveBanner.textContent=textValue;
  waveBanner.classList.add('show');
  bannerTimer=1.35;
}

function buildPathData(points){
  const segments=[];let total=0;
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1];
    const dx=b[0]-a[0],dy=b[1]-a[1];
    const len=Math.hypot(dx,dy);
    let row=0;
    if(Math.abs(dx)>Math.abs(dy))row=dx>0?2:1;
    else row=dy>0?0:3;
    segments.push({a,b,dx,dy,len,start:total,row});
    total+=len;
  }
  return {points,segments,total};
}
const pathData=LEVELS.map(entry=>buildPathData(entry.route));

function pathPosition(path,travel){
  if(travel<=0){
    const s=path.segments[0];
    return{x:path.points[0][0],y:path.points[0][1],progress:0,row:s.row};
  }
  if(travel>=path.total){
    const p=path.points[path.points.length-1];
    const s=path.segments[path.segments.length-1];
    return{x:p[0],y:p[1],progress:1,row:s.row};
  }
  for(const seg of path.segments){
    if(travel<=seg.start+seg.len){
      const t=(travel-seg.start)/seg.len;
      return{
        x:seg.a[0]+seg.dx*t,
        y:seg.a[1]+seg.dy*t,
        progress:travel/path.total,
        row:seg.row
      };
    }
  }
  return{x:168,y:64,progress:1,row:3};
}

function distanceToSegment(px,py,a,b){
  const vx=b[0]-a[0],vy=b[1]-a[1];
  const wx=px-a[0],wy=py-a[1];
  const len2=vx*vx+vy*vy;
  const t=len2?clamp((wx*vx+wy*vy)/len2,0,1):0;
  return Math.hypot(px-(a[0]+vx*t),py-(a[1]+vy*t));
}

function distanceToActivePath(x,y){
  let best=Infinity;
  const pts=currentLevel().route;
  for(let i=0;i<pts.length-1;i++)best=Math.min(best,distanceToSegment(x,y,pts[i],pts[i+1]));
  return best;
}

function routeGridIndex(v){
  return Math.round((v-TILE/2)/TILE);
}

function activeRouteGrid(){
  return currentLevel().route.map(([x,y])=>[routeGridIndex(x),routeGridIndex(y)]);
}

function activeTerrainMask(){
  if(terrainMaskCache.level===level&&terrainMaskCache.mask)return terrainMaskCache.mask;
  const cols=W/TILE,rows=H/TILE;
  const mask=Array.from({length:rows},()=>Array(cols).fill(false));
  const grid=activeRouteGrid();

  const mark=(col,row)=>{
    if(col>=0&&col<cols&&row>=0&&row<rows)mask[row][col]=true;
  };

  for(let i=0;i<grid.length-1;i++){
    const [c1,r1]=grid[i],[c2,r2]=grid[i+1];
    if(c1===c2){
      for(let row=Math.min(r1,r2);row<=Math.max(r1,r2);row++)mark(c1,row);
    }else if(r1===r2){
      for(let col=Math.min(c1,c2);col<=Math.max(c1,c2);col++)mark(col,r1);
    }
  }

  terrainMaskCache={level,mask};
  return mask;
}

function maskHas(mask,col,row){
  return row>=0&&row<mask.length&&col>=0&&col<mask[0].length&&mask[row][col];
}

function terrainBorderTile(mask,col,row){
  if(maskHas(mask,col,row))return null;

  const up=maskHas(mask,col,row-1);
  const down=maskHas(mask,col,row+1);
  const left=maskHas(mask,col-1,row);
  const right=maskHas(mask,col+1,row);

  // A snow cell touching path on two perpendicular sides is a concave/inside
  // corner. The snow-floor sheet is specifically the inverse transition set.
  if(up&&left)return {set:'snowFloor',role:'top_left_corner'};
  if(up&&right)return {set:'snowFloor',role:'top_right_corner'};
  if(down&&left)return {set:'snowFloor',role:'bottom_left_corner'};
  if(down&&right)return {set:'snowFloor',role:'bottom_right_corner'};

  // Straight path borders live in the snow cell outside the brown centre fill.
  if(down)return {set:'pathFloor',role:'top_edge'};
  if(up)return {set:'pathFloor',role:'bottom_edge'};
  if(right)return {set:'pathFloor',role:'left_edge'};
  if(left)return {set:'pathFloor',role:'right_edge'};

  // Convex/outside corners are diagonal neighbours of the path with no
  // cardinal contact.
  const upLeft=maskHas(mask,col-1,row-1);
  const upRight=maskHas(mask,col+1,row-1);
  const downLeft=maskHas(mask,col-1,row+1);
  const downRight=maskHas(mask,col+1,row+1);

  if(downRight)return {set:'pathFloor',role:'top_left_corner'};
  if(downLeft)return {set:'pathFloor',role:'top_right_corner'};
  if(upRight)return {set:'pathFloor',role:'bottom_left_corner'};
  if(upLeft)return {set:'pathFloor',role:'bottom_right_corner'};

  return null;
}

function canPlaceTower(x,y){
  if(x<22||x>W-22||y<82||y>H-24)return false;
  if(distanceToActivePath(x,y)<PATH_WIDTH/2+13)return false;
  if(towers.some(t=>pointDist(x,y,t.x,t.y)<30))return false;
  return true;
}

function resetGame(){
  money=levelStartMoney(1);lives=10;score=0;level=1;wave=1;levelsCleared=0;perfectWaves=0;
  terrainMaskCache={level:0,mask:null};
  waveActive=false;paused=false;gameEnded=false;buildType=null;selectedTower=-1;
  enemies=[];towers=[];projectiles=[];particles=[];spawnQueue=[];
  spawnClock=0;leaksThisWave=0;animClock=0;objectiveHit=0;
  pointer={x:-99,y:-99,inside:false};
  gameOverOverlay.classList.remove('show');
  pauseSheet.classList.remove('show');
  howSheet.classList.remove('show');
  towerPanel.classList.remove('show');
  towerChoices.forEach(b=>b.classList.remove('selected'));
  buildHint.textContent='Choose a snowman, then tap clear snow to place it.';
  updateUI();draw();
}

function startGame(){
  resetGame();
  startOverlay.classList.remove('show');
  last=performance.now();
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(loop);
  showBanner('LEVEL 1 · '+currentLevel().name);
}

function makeWaveQueue(){
  const q=[];
  for(const [kind,count] of levelWaveGroups(level,wave)){
    for(let i=0;i<count;i++)q.push(kind);
  }
  return q;
}

function startWave(){
  if(waveActive||gameEnded||wave>WAVES_PER_LEVEL)return;
  selectedTower=-1;
  towerPanel.classList.remove('show');
  waveActive=true;leaksThisWave=0;
  spawnQueue=makeWaveQueue();
  spawnClock=.12;
  showBanner('LEVEL '+level+' · WAVE '+wave);
  tone('wave');
  updateUI();
}

function spawnEnemy(kind){
  const def=ENEMIES[kind];
  const pressure=currentLevel().pressure||1;
  const hpScale=(1+(level-1)*.42+(wave-1)*.16)*pressure;
  const speedScale=(1+(level-1)*.035+(wave-1)*.018)*(1+(pressure-1)*.45);
  enemies.push({
    kind,levelIndex:level-1,travel:0,
    hp:def.hp*hpScale,maxHp:def.hp*hpScale,
    speed:def.speed*speedScale,
    reward:Math.ceil(def.reward*(1+(level-1)*.025)),
    leak:def.leak,
    slow:0,flash:0,x:168,y:H+16,row:3,
    progress:0,dead:false,seed:Math.floor(Math.random()*6)
  });
}

function advanceLevel(){
  levelsCleared=level;
  score+=250+level*70;
  level++;
  wave=1;
  terrainMaskCache={level:0,mask:null};
  waveActive=false;
  buildType=null;selectedTower=-1;
  enemies=[];projectiles=[];particles=[];spawnQueue=[];towers=[];
  money=levelStartMoney(level);
  towerPanel.classList.remove('show');
  towerChoices.forEach(b=>b.classList.remove('selected'));
  buildHint.textContent='New track: rebuild your defence for '+currentLevel().name+'.';
  showBanner('LEVEL '+level+' · '+currentLevel().name);
  tone('wave');
  updateUI();draw();
}

function finishWave(){
  waveActive=false;
  const perfect=leaksThisWave===0;
  const waveBonus=90+level*28+wave*16;
  score+=waveBonus;
  money+=14+level*3+wave*2;
  if(perfect){
    perfectWaves++;
    score+=75+level*5;
    money+=6;
    showBanner('PERFECT WAVE');
  }else showBanner('WAVE CLEAR');

  if(wave>=WAVES_PER_LEVEL){
    if(level>=TOTAL_LEVELS){levelsCleared=TOTAL_LEVELS;endGame(true);return}
    advanceLevel();
    return;
  }
  wave++;
  updateUI();
}

function endGame(victory){
  if(gameEnded)return;
  gameEnded=true;waveActive=false;buildType=null;
  const protectionBonus=lives*75;
  const final=score+protectionBonus;
  const isBest=final>best;
  if(isBest){best=final;localStorage.setItem(BEST_KEY,String(best))}
  resultEyebrow.textContent=victory?'ALL 12 TRACKS SAFE':'PRESENTS STOLEN';
  resultEyebrow.classList.toggle('danger',!victory);
  resultTitle.textContent=victory?'CHRISTMAS SAVED!':'RUN OVER';
  finalScoreEl.textContent=final;
  const cleared=victory?TOTAL_LEVELS:Math.max(levelsCleared,level-1);
  finalBreakdown.textContent=cleared+' levels cleared · '+perfectWaves+' perfect waves · '+lives+' presents safe · +'+protectionBonus+' protection bonus';
  recordText.textContent=isBest?'NEW BEST SCORE '+best:'Best score: '+best;
  bestStart.textContent=pad(best,4);
  gameOverOverlay.classList.add('show');
  tone(victory?'win':'leak');
}

function chooseBuildType(type){
  if(gameEnded)return;
  const def=TOWERS[type];
  const cost=towerCost(type);
  if(!def||money<cost){showBanner('NOT ENOUGH BAUBLES');return}
  buildType=buildType===type?null:type;
  selectedTower=-1;towerPanel.classList.remove('show');
  towerChoices.forEach(b=>b.classList.toggle('selected',b.dataset.tower===buildType));
  buildHint.textContent=buildType
    ? def.name+': tap clear snow to place.'
    : 'Choose a snowman, then tap any clear snow to place it.';
  draw();
}

function placeTower(x,y){
  if(!buildType)return false;
  const def=TOWERS[buildType];
  const cost=towerCost(buildType);
  if(money<cost){showBanner('NOT ENOUGH BAUBLES');buildType=null;updateUI();return false}
  if(!canPlaceTower(x,y)){showBanner('PLACE ON CLEAR SNOW');return false}

  const gx=Math.round(x/4)*4,gy=Math.round(y/4)*4;
  money-=cost;
  towers.push({
    type:buildType,x:gx,y:gy,level:1,cooldown:.15,
    spent:cost,pulse:0,row:0,seed:Math.floor(Math.random()*4)
  });
  tone('build');
  if(money<towerCost(buildType)){
    buildType=null;
    towerChoices.forEach(b=>b.classList.remove('selected'));
  }
  buildHint.textContent='Snowman placed. Build more or start the wave.';
  updateUI();return true;
}

function selectTower(index){
  selectedTower=index;buildType=null;
  towerChoices.forEach(b=>b.classList.remove('selected'));
  const t=towers[index],def=TOWERS[t.type];
  towerPanelName.textContent=def.name;
  towerPanelStats.textContent='LEVEL '+t.level+' · '+towerStatText(t);
  const cost=upgradeCost(t),sell=sellValue(t);
  upgradeCostEl.textContent=cost;sellValueEl.textContent=sell;
  upgradeButton.disabled=t.level>=3||money<cost;
  upgradeButton.textContent=t.level>=3?'MAX LEVEL':'UPGRADE '+cost;
  sellButton.textContent='SELL '+sell;
  towerPanel.classList.add('show');
  buildHint.textContent='Snowman selected.';
}

function towerStatText(t){
  const def=TOWERS[t.type];
  const damage=Math.round(def.damage*(1+(t.level-1)*.4));
  const range=Math.round(def.range*(1+(t.level-1)*.08));
  return damage+' DMG · '+range+' RANGE';
}
function upgradeCost(t){
  return Math.ceil((towerCost(t.type)*(.68+t.level*.42))/5)*5;
}
function sellValue(t){return Math.round(t.spent*.65)}

function upgradeSelected(){
  const t=towers[selectedTower];
  if(!t||t.level>=3)return;
  const cost=upgradeCost(t);
  if(money<cost){showBanner('NOT ENOUGH BAUBLES');return}
  money-=cost;t.spent+=cost;t.level++;t.pulse=.18;
  tone('upgrade');
  selectTower(selectedTower);updateUI();
}

function sellSelected(){
  const t=towers[selectedTower];
  if(!t)return;
  money+=sellValue(t);
  towers.splice(selectedTower,1);
  selectedTower=-1;towerPanel.classList.remove('show');
  buildHint.textContent='Snowman sold. Choose another defender to place.';
  tone('sell');updateUI();
}

function targetForTower(t){
  const def=TOWERS[t.type];
  const range=def.range*(1+(t.level-1)*.08);
  let target=null,best=-1;
  for(const e of enemies){
    if(e.dead)continue;
    if(pointDist(t.x,t.y,e.x,e.y)<=range && e.progress>best){
      target=e;best=e.progress;
    }
  }
  return target;
}

function rowForVector(dx,dy){
  if(Math.abs(dx)>Math.abs(dy))return dx>=0?1:2;
  return dy>=0?0:3;
}

function fireTower(t,target){
  const def=TOWERS[t.type];
  const levelScale=1+(t.level-1)*.4;
  const range=def.range*(1+(t.level-1)*.08);
  t.row=rowForVector(target.x-t.x,target.y-t.y);

  const targets=[target];
  if((def.shots||1)>1){
    let second=null,best=-1;
    for(const e of enemies){
      if(e===target||e.dead)continue;
      if(pointDist(t.x,t.y,e.x,e.y)<=range&&e.progress>best){
        second=e;best=e.progress;
      }
    }
    targets.push(second||target);
  }

  targets.forEach((shotTarget,i)=>{
    projectiles.push({
      x:t.x+(i===0?-2:2),y:t.y,
      target:shotTarget,
      damage:def.damage*levelScale,
      speed:def.shotSpeed,
      kind:def.kind,
      slow:def.slow,
      splash:def.splash+(def.splash?5*(t.level-1):0),
      dead:false
    });
  });

  t.cooldown=def.rate/(1+(t.level-1)*.15);
  t.pulse=.12;
  tone(def.kind==='heavy'?'heavy':'shot');
}

function updateTowers(dt){
  for(const t of towers){
    t.cooldown-=dt;t.pulse=Math.max(0,t.pulse-dt);
    const target=targetForTower(t);
    if(target)t.row=rowForVector(target.x-t.x,target.y-t.y);
    if(t.cooldown<=0&&target)fireTower(t,target);
  }
}

function hitEnemy(p,e){
  if(!e||e.dead)return;
  const hitOne=target=>{
    target.hp-=p.damage;
    target.flash=.07;
    if(p.slow)target.slow=Math.max(target.slow,1.8);
  };
  if(p.splash){
    for(const other of enemies){
      if(!other.dead&&pointDist(e.x,e.y,other.x,other.y)<=p.splash)hitOne(other);
    }
  }else hitOne(e);

  for(let i=0;i<5;i++)particles.push({
    x:e.x,y:e.y,
    vx:(Math.random()-.5)*38,vy:(Math.random()-.5)*38,
    life:.24,size:2
  });
  tone('hit');
}

function updateProjectiles(dt){
  for(const p of projectiles){
    if(p.dead)continue;
    const e=p.target;
    if(!e||e.dead||!enemies.includes(e)){p.dead=true;continue}
    const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy);
    if(d<6){hitEnemy(p,e);p.dead=true;continue}
    const step=Math.min(d,p.speed*dt);
    p.x+=dx/d*step;p.y+=dy/d*step;
  }
  projectiles=projectiles.filter(p=>!p.dead);
}

function killEnemy(e){
  if(e.dead)return;
  e.dead=true;money+=e.reward;score+=12+level*3+wave*2;
  for(let i=0;i<8;i++)particles.push({
    x:e.x,y:e.y,vx:(Math.random()-.5)*65,vy:(Math.random()-.5)*65,
    life:.4,size:2+Math.random()*2
  });
}

function updateEnemies(dt){
  for(const e of enemies){
    e.slow=Math.max(0,e.slow-dt);e.flash=Math.max(0,e.flash-dt);
    e.travel+=e.speed*(e.slow>0?.57:1)*dt;
    const p=pathPosition(pathData[e.levelIndex],e.travel);
    e.x=p.x;e.y=p.y;e.progress=p.progress;e.row=p.row;

    if(e.hp<=0){killEnemy(e);continue}
    if(e.progress>=1){
      e.dead=true;
      lives=Math.max(0,lives-e.leak);
      leaksThisWave+=e.leak;
      objectiveHit=.42;
      showBanner('-'+e.leak+' PRESENT'+(e.leak===1?'':'S'));
      tone('leak');
      if(lives<=0){endGame(false);return}
    }
  }
  enemies=enemies.filter(e=>!e.dead);
}

function updateSpawning(dt){
  if(!waveActive)return;
  if(spawnQueue.length){
    spawnClock-=dt;
    if(spawnClock<=0){
      spawnEnemy(spawnQueue.shift());
      spawnClock=Math.max(.16,.62-level*.026-wave*.035);
    }
  }else if(enemies.length===0&&projectiles.length===0)finishWave();
}

function updateParticles(dt){
  for(const p of particles){
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=15*dt;p.life-=dt;
  }
  particles=particles.filter(p=>p.life>0);
}

function update(dt){
  if(paused||gameEnded)return;
  animClock+=dt;
  objectiveHit=Math.max(0,objectiveHit-dt);
  if(bannerTimer>0){
    bannerTimer-=dt;
    if(bannerTimer<=0)waveBanner.classList.remove('show');
  }
  updateSpawning(dt);
  updateEnemies(dt);
  updateTowers(dt);
  updateProjectiles(dt);
  updateParticles(dt);
  updateUI();
}

function drawAtlasCell(col,row,x,y,scale=1){
  const im=images.winter;if(!im)return;
  const s=TILE*scale;
  ctx.drawImage(im,col*TILE,row*TILE,TILE,TILE,Math.round(x),Math.round(y),s,s);
}

function drawMappedTile(tile,x,y,scale=1){
  if(tile)drawAtlasCell(tile.col,tile.row,x,y,scale);
}

function drawMappedComposite(asset,x,y,scale=1){
  if(!asset)return;
  for(const tile of asset.tiles){
    drawAtlasCell(tile.col,tile.row,x+tile.x*TILE*scale,y+tile.y*TILE*scale,scale);
  }
}

function drawSnowGround(){
  for(let y=0;y<H;y+=TILE){
    for(let x=0;x<W;x+=TILE)drawMappedTile(GHERWIT.snowGround,x,y,1);
  }
}

function drawRoute(){
  const mask=activeTerrainMask();

  // The organiser's path sheet describes ONE route tile plus its eight
  // surrounding transition cells. The route mask must therefore stay one tile
  // wide: centre tile on the route, edging in the neighbouring snow cells.
  for(let row=0;row<mask.length;row++){
    for(let col=0;col<mask[row].length;col++){
      if(mask[row][col]){
        drawMappedTile(GHERWIT.pathFloor.centre,col*TILE,row*TILE,1);
      }
    }
  }

  // Then draw the eight surrounding transition pieces in the neighbouring
  // snow cells. Concave bends use the inverse snow-floor corner pieces.
  for(let row=0;row<mask.length;row++){
    for(let col=0;col<mask[row].length;col++){
      if(mask[row][col])continue;
      const border=terrainBorderTile(mask,col,row);
      if(!border)continue;
      drawMappedTile(GHERWIT[border.set][border.role],col*TILE,row*TILE,1);
    }
  }
}

function drawObjective(){
  // Exact 3x2 gate assembled in the organiser. Its bottom aligns with the route's top edge.
  const x=144,y=32;
  drawMappedComposite(GHERWIT.workshopGate,x,y,1);

  ctx.save();
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle=objectiveHit>0?'#8f3037':'#202934';
  ctx.fillRect(132,10,72,14);
  ctx.fillStyle='#f7fbff';
  ctx.font='700 7px monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('WORKSHOP GATE',168,17);
  if(objectiveHit>0){
    ctx.strokeStyle='#f5c45a';ctx.lineWidth=2;
    ctx.strokeRect(x-2,y-2,52,36);
  }
  ctx.restore();
}

function drawTerrain(){
  drawSnowGround();
  drawRoute();

  const details=[
    [GHERWIT.snowDetailLarge,24,104],[GHERWIT.snowDetailSmall,296,136],
    [GHERWIT.snowDetailSmall,32,272],[GHERWIT.snowDetailLarge,288,256],
    [GHERWIT.snowDetailSmall,48,448],[GHERWIT.snowDetailLarge,272,432]
  ];
  for(const [tile,x,y] of details){
    if(distanceToActivePath(x+8,y+8)>PATH_WIDTH/2+12)drawMappedTile(tile,x,y,1);
  }

  // Exact 3x3 tree assembled in the organiser.
  const candidates=[
    [8,88],[280,96],[8,208],[280,216],
    [8,320],[280,328],[8,416],[280,416]
  ];
  let drawn=0;
  for(let i=0;i<candidates.length&&drawn<4;i++){
    const [x,y]=candidates[(i+level)%candidates.length];
    if(distanceToActivePath(x+24,y+24)<PATH_WIDTH/2+32)continue;
    drawMappedComposite(GHERWIT.tree,x,y,1);
    drawn++;
  }

  drawObjective();
}

function drawSheetFrame(key,cols,row,frame,x,y,dest=128,alpha=1){
  const im=images[key];if(!im)return;
  const cell=128;
  const safeRow=clamp(row|0,0,3);
  const safeFrame=((frame%cols)+cols)%cols;
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(
    im,safeFrame*cell,safeRow*cell,cell,cell,
    Math.round(x-dest/2),Math.round(y-dest/2),dest,dest
  );
  ctx.restore();
}

function drawTower(t,index){
  const def=TOWERS[t.type];

  if(selectedTower===index){
    const range=def.range*(1+(t.level-1)*.08);
    ctx.save();
    ctx.beginPath();ctx.arc(t.x,t.y,range,0,Math.PI*2);
    ctx.fillStyle='rgba(112,196,226,.08)';ctx.fill();
    ctx.strokeStyle='rgba(70,153,184,.6)';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.stroke();
    ctx.restore();
  }

  const frame=(Math.floor(animClock*5)+t.seed)%4;
  const recoil=t.pulse>0?2:0;
  let ox=0,oy=0;
  if(recoil){
    if(t.row===1)ox=-recoil;
    else if(t.row===2)ox=recoil;
    else if(t.row===0)oy=-recoil;
    else oy=recoil;
  }
  drawSheetFrame(def.asset,4,t.row,frame,t.x+ox,t.y+oy,128);

  ctx.save();
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#17384a';ctx.fillRect(t.x+7,t.y+7,11,9);
  ctx.fillStyle='#fff';ctx.font='700 7px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(String(t.level),t.x+12.5,t.y+11.5);
  ctx.restore();
}

function drawEnemy(e){
  const def=ENEMIES[e.kind];
  const frame=(Math.floor(animClock*7)+e.seed)%6;
  drawSheetFrame(def.asset,6,e.row,frame,e.x,e.y,def.draw,e.flash>0?.55:1);

  const w=def.boss?42:25;
  const ratio=clamp(e.hp/e.maxHp,0,1);
  const barY=e.y-(def.boss?30:21);
  ctx.fillStyle='rgba(15,30,40,.62)';ctx.fillRect(Math.round(e.x-w/2),Math.round(barY),w,4);
  ctx.fillStyle=ratio>.5?'#3fa56d':ratio>.25?'#e1ae47':'#cf4d55';
  ctx.fillRect(Math.round(e.x-w/2),Math.round(barY),Math.round(w*ratio),4);

  if(e.slow>0){
    ctx.save();ctx.strokeStyle='#78d5ee';ctx.lineWidth=2;
    ctx.strokeRect(Math.round(e.x-11),Math.round(e.y-11),22,22);ctx.restore();
  }
}

function drawProjectile(p){
  ctx.save();ctx.imageSmoothingEnabled=false;
  const x=Math.round(p.x),y=Math.round(p.y);
  if(p.kind==='frost'){
    ctx.fillStyle='#71cbe7';ctx.fillRect(x-4,y-4,8,8);
    ctx.fillStyle='#dff9ff';ctx.fillRect(x-2,y-3,4,4);
  }else if(p.kind==='heavy'){
    ctx.fillStyle='#a4d4e5';ctx.fillRect(x-5,y-5,10,10);
    ctx.fillStyle='#fff';ctx.fillRect(x-4,y-4,7,7);
  }else if(p.kind==='long'){
    ctx.fillStyle='#79bdd7';ctx.fillRect(x-5,y-2,10,4);
    ctx.fillStyle='#effcff';ctx.fillRect(x-3,y-1,7,2);
  }else{
    ctx.fillStyle='#9dcadd';ctx.fillRect(x-3,y-3,7,7);
    ctx.fillStyle='#fff';ctx.fillRect(x-2,y-2,5,5);
  }
  ctx.restore();
}

function drawPlacementGhost(){
  if(!buildType||!pointer.inside)return;
  const def=TOWERS[buildType];
  const valid=money>=towerCost(buildType)&&canPlaceTower(pointer.x,pointer.y);

  ctx.save();
  ctx.globalAlpha=.18;
  ctx.fillStyle=valid?'#3dbb75':'#d65055';
  ctx.beginPath();ctx.arc(pointer.x,pointer.y,def.range,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=.75;
  ctx.strokeStyle=valid?'#2d9b60':'#bd3d42';ctx.lineWidth=2;
  ctx.strokeRect(Math.round(pointer.x-11),Math.round(pointer.y-11),22,22);
  ctx.restore();

  const frame=Math.floor(animClock*5)%4;
  drawSheetFrame(def.asset,4,0,frame,pointer.x,pointer.y,128,valid?.75:.45);
}

function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.imageSmoothingEnabled=false;
  drawTerrain();

  towers.forEach(drawTower);
  enemies.forEach(drawEnemy);
  projectiles.forEach(drawProjectile);

  ctx.save();
  for(const p of particles){
    ctx.globalAlpha=clamp(p.life*2.4,0,1);
    ctx.fillStyle='#f7fbff';
    ctx.fillRect(Math.round(p.x),Math.round(p.y),Math.ceil(p.size),Math.ceil(p.size));
  }
  ctx.restore();

  drawPlacementGhost();

  if(!waveActive&&!gameEnded){
    ctx.save();
    ctx.fillStyle='rgba(20,50,66,.85)';
    ctx.fillRect(91,H-18,154,13);
    ctx.fillStyle='#fff';ctx.font='700 7px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('LEVEL '+level+'/'+TOTAL_LEVELS+' · WAVE '+wave+'/'+WAVES_PER_LEVEL,168,H-11);
    ctx.restore();
  }
}

function updateUI(){
  waveHud.textContent=pad(level,2)+' · '+wave+'/'+WAVES_PER_LEVEL;
  moneyHud.textContent=money;
  livesHud.textContent=lives;
  scoreHud.textContent=pad(score,4);
  levelLabel.textContent='LEVEL '+level+'/'+TOTAL_LEVELS;
  levelName.textContent=currentLevel().name;
  startWaveButton.textContent=waveActive
    ? 'WAVE '+wave+'/'+WAVES_PER_LEVEL+' IN PROGRESS'
    : 'START WAVE '+wave+'/'+WAVES_PER_LEVEL;
  startWaveButton.disabled=waveActive||gameEnded;

  for(const b of towerChoices){
    const type=b.dataset.tower;
    const def=TOWERS[type];
    if(!def)continue;
    const cost=towerCost(type);
    const costEl=b.querySelector('small');
    if(costEl)costEl.textContent=cost;
    b.disabled=gameEnded||money<cost;
    b.classList.toggle('selected',type===buildType);
  }

  if(selectedTower>=0&&towers[selectedTower]){
    const t=towers[selectedTower];
    const cost=upgradeCost(t);
    upgradeButton.disabled=t.level>=3||money<cost;
    upgradeButton.textContent=t.level>=3?'MAX LEVEL':'UPGRADE '+cost;
  }
}

function pointerToGame(e){
  const r=canvas.getBoundingClientRect();
  return{
    x:(e.clientX-r.left)*W/r.width,
    y:(e.clientY-r.top)*H/r.height
  };
}

function handleCanvasPointer(e){
  if(gameEnded||paused)return;
  const p=pointerToGame(e);
  pointer={x:p.x,y:p.y,inside:true};

  // Existing snowmen always take selection priority.
  let hit=-1,bestD=18;
  towers.forEach((t,i)=>{
    const d=pointDist(p.x,p.y,t.x,t.y);
    if(d<bestD){bestD=d;hit=i}
  });
  if(hit>=0){selectTower(hit);draw();return}

  if(buildType){
    if(placeTower(p.x,p.y))draw();
    return;
  }

  selectedTower=-1;towerPanel.classList.remove('show');
  buildHint.textContent='Choose a snowman, then tap any clear snow to place it.';
  draw();
}

function openPause(){
  if(gameEnded||startOverlay.classList.contains('show'))return;
  paused=true;
  pauseSheet.classList.add('show');
  pauseSheet.setAttribute('aria-hidden','false');
}
function closePauseSheet(){
  pauseSheet.classList.remove('show');
  pauseSheet.setAttribute('aria-hidden','true');
  paused=false;last=performance.now();
}
function openHow(fromPause=false){
  howFromPause=fromPause;
  howSheet.classList.add('show');
  howSheet.setAttribute('aria-hidden','false');
}
function closeHowSheet(){
  howSheet.classList.remove('show');
  howSheet.setAttribute('aria-hidden','true');
  if(howFromPause){
    howFromPause=false;
    pauseSheet.classList.add('show');
    pauseSheet.setAttribute('aria-hidden','false');
  }
}

function loop(now){
  const dt=Math.min(.04,(now-last)/1000||.016);
  last=now;
  update(dt);draw();
  if(!gameEnded)raf=requestAnimationFrame(loop);
}

canvas.addEventListener('pointerdown',handleCanvasPointer);
canvas.addEventListener('pointermove',e=>{
  const p=pointerToGame(e);pointer={x:p.x,y:p.y,inside:true};
  if(buildType)draw();
});
canvas.addEventListener('pointerleave',()=>{pointer.inside=false;if(buildType)draw()});

startWaveButton.addEventListener('click',startWave);
towerChoices.forEach(b=>b.addEventListener('click',()=>chooseBuildType(b.dataset.tower)));
upgradeButton.addEventListener('click',upgradeSelected);
sellButton.addEventListener('click',sellSelected);
playButton.addEventListener('click',startGame);
againButton.addEventListener('click',startGame);
pauseButton.addEventListener('click',openPause);
closePause.addEventListener('click',closePauseSheet);
resumeButton.addEventListener('click',closePauseSheet);
restartButton.addEventListener('click',()=>{closePauseSheet();startGame()});
soundButton.addEventListener('click',()=>{
  soundOn=!soundOn;
  soundButton.textContent=soundOn?'SOUND ON':'SOUND OFF';
});
introHowButton.addEventListener('click',()=>openHow(false));
pauseHowButton.addEventListener('click',()=>{
  pauseSheet.classList.remove('show');
  pauseSheet.setAttribute('aria-hidden','true');
  openHow(true);
});
closeHow.addEventListener('click',closeHowSheet);
closeHowButton.addEventListener('click',closeHowSheet);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&!gameEnded&&!startOverlay.classList.contains('show'))openPause();
});

loadAssets();
updateUI();
draw();
})();