(function(){
'use strict';

const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;

const distanceEl=document.getElementById('distance');
const gatesEl=document.getElementById('gates');
const bestEl=document.getElementById('best');
const startBestEl=document.getElementById('startBest');
const finalScoreEl=document.getElementById('finalScore');
const runBreakdownEl=document.getElementById('runBreakdown');
const recordText=document.getElementById('recordText');
const speedLabel=document.getElementById('speedLabel');
const assetStatus=document.getElementById('assetStatus');
const startOverlay=document.getElementById('startOverlay');
const gameOverOverlay=document.getElementById('gameOverOverlay');
const pauseSheet=document.getElementById('pauseSheet');
const startButton=document.getElementById('startButton');
const soundButton=document.getElementById('soundButton');
const soundIcon=document.getElementById('soundIcon');

const BASE='https://chipbutt.github.io/ToolBox/assets/gamebox/kenney/2d/Tiny%20Ski/Tiles/';
const tileUrl=n=>BASE+'tile_'+String(n).padStart(4,'0')+'.png';
const TILE=16;
const SEGMENT=224;
const GATE_BONUS=25;

const F={
  // Ground: the pack uses the first six columns of each terrain row as the piste/autotile family.
  snowOutside:[0,5],
  snowPiste:[2,3],
  leftStraight:1,
  rightStraight:4,

  // Full Tiny Ski piste transition set from the supplied eight-tile montage.
  // Left boundary pieces (off-piste on left, piste on right):
  leftExitFromRight:12, // right edge -> centre
  leftEnterLeft:14,     // centre -> left edge
  leftEnterRight:24,    // centre -> right edge
  leftDiagonalLeft:25,  // right edge -> left edge

  // Right boundary pieces (piste on left, off-piste on right):
  rightEnterRight:15,   // centre -> right edge
  rightExitFromLeft:17, // left edge -> centre
  rightDiagonalRight:28,// left edge -> right edge
  rightEnterLeft:29,    // centre -> left edge

  // Tree composites: 6 sits directly above 18; 7 sits directly above 19.
  treeTop:6,
  treeBottom:18,
  smallTree:30,
  deadTreeTop:7,
  deadTreeBottom:19,
  stump:31,
  redFlag:[8,20],
  blueFlag:[9,21],
  redNet:10,
  blueNet:11,

  // Small bordered signs are roadside course signs.
  signRed:32,
  signBlue:33,

  // Long blue chevrons are piste boost-pad halves.
  boostLeft:22,
  boostRight:23,

  // Lift components are not interchangeable sprites.
  liftTop:42,
  liftCableJoin:43,
  liftHangerJoin:44,
  liftTowerHead:45,
  liftCable:46,
  chairA:47,
  liftShadow:53,
  liftPole:54,
  gondolaTopLeft:55,
  gondolaTopRight:56,
  chairB:57,
  tracksA:58,
  tracksB:59,
  liftFoot:66,
  gondolaBottomLeft:67,
  gondolaBottomRight:68,

  snowman:69,

  // Skier animations are 70/71 and 82/83. Yeti is 78/79 with 80 as attack.
  playerA:70,
  playerB:71,
  skierBases:[70,82],
  yetiA:78,
  yetiB:79,
  yetiAttack:80,
  rock:81
};

// Exact internal piste-boundary locations, measured from the supplied 16x16
// assets. Values are the centre of the 2px bank line at the tile's top/bottom.
// This lets us place every sprite so its painted edge and gameplay boundary
// are literally the same line.
const EDGE_PROFILE={
  1:{top:7.5,bottom:7.5},
  4:{top:7.5,bottom:7.5},
  12:{top:14.5,bottom:7.5},
  14:{top:7.5,bottom:.5},
  15:{top:7.5,bottom:14.5},
  17:{top:.5,bottom:7.5},
  24:{top:7.5,bottom:14.5},
  25:{top:14.5,bottom:.5},
  28:{top:.5,bottom:14.5},
  29:{top:7.5,bottom:.5}
};

let courseRows=[];
let courseBaseLeft=0,courseBaseRight=0;

// Load the complete non-font visual half of Tiny Ski so later sections can use the full pack
// without late network loads. 84+ is the Tiny Ski glyph/font set.
const REQUIRED=Array.from({length:84},(_,i)=>i);
const images={};
let outsidePattern=null,pistePattern=null;

let W=360,H=720,dpr=1;
let running=false,paused=false,crashing=false,gameOver=false,soundOn=true;
let last=0,raf=0,audioCtx=null;
let speed=100,distance=0,scroll=0,viewScroll=0,gates=0,nearMisses=0;
let player=null,tracks=[],puffs=[],feedback=[];
let startLineWorldY=0;
let scenery=[],obstacles=[],courseGates=[],lifts=[],boostPads=[],yetiEncounters=[];
let monster=null,yetiSpawnCount=0,boostTimer=0,animClock=0,baseSpeed=100;
let nextSegment=0,trackClock=0,shake=0,crashClock=0;
const input={left:false,right:false,pointerId:null,startX:0,analog:0};
const BEST_KEY='gamebox.tinySkiRun.bestScore.v6';
let best=Number(
  localStorage.getItem(BEST_KEY)||
  localStorage.getItem('gamebox.tinySkiRun.best.v5')||
  localStorage.getItem('gamebox.tinySkiRun.best.v4')||
  localStorage.getItem('gamebox.tinySkiRun.best.v3')||
  localStorage.getItem('gamebox.tinySkiRun.best')||
  0
)||0;

bestEl.textContent=pad(best,4);
startBestEl.textContent=pad(best,4);

function pad(v,n){return String(Math.max(0,Math.floor(v))).padStart(n,'0')}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function randRange(r,a,b){return a+r()*(b-a)}
function pickR(r,arr){return arr[Math.floor(r()*arr.length)]}
function metres(){return Math.floor(distance/15)}
function score(){return metres()+gates*GATE_BONUS}
function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function hash2(a,b){let n=(a*73856093)^(b*19349663);n=(n^(n>>>13))*1274126177;return(n^(n>>>16))>>>0}

function loadImage(frame){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.decoding='async';
    img.onload=()=>{images[frame]=img;resolve()};
    img.onerror=()=>reject(new Error('Tiny Ski tile failed: '+frame));
    img.src=tileUrl(frame);
  });
}

Promise.all(REQUIRED.map(loadImage)).then(()=>{
  buildTerrainPatterns();
  assetStatus.textContent='Mountain ready';
  assetStatus.classList.add('ready');
  startButton.disabled=false;
  resetWorld();
  render();
}).catch(err=>{
  console.error(err);
  assetStatus.textContent='Tiny Ski assets failed';
});

function buildTerrainPatterns(){
  function make(frames,seed){
    const c=document.createElement('canvas');
    c.width=TILE*4;c.height=TILE*4;
    const cctx=c.getContext('2d');
    cctx.imageSmoothingEnabled=false;
    for(let row=0;row<4;row++){
      for(let col=0;col<4;col++){
        const frame=frames[hash2(col+seed,row+seed)%frames.length];
        cctx.drawImage(images[frame],col*TILE,row*TILE,TILE,TILE);
      }
    }
    return ctx.createPattern(c,'repeat');
  }
  outsidePattern=make(F.snowOutside,3);
  pistePattern=make(F.snowPiste,11);
}

function resizeCanvas(){
  const r=canvas.getBoundingClientRect();
  if(!r.width||!r.height)return;

  // Draw directly in CSS pixels, then scale only for devicePixelRatio.
  // The old fixed 360-wide virtual canvas was being stretched by a non-integer amount,
  // which caused nearest-neighbour pixel art to shimmer/jerk while scrolling.
  W=Math.max(280,Math.round(r.width));
  H=Math.max(520,Math.round(r.height));
  dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.max(1,Math.round(W*dpr));
  canvas.height=Math.max(1,Math.round(H*dpr));

  rebuildCourseRows();
  ensureCourseRows(Math.ceil((scroll+H+SEGMENT*2)/TILE)+2);

  if(player){
    player.y=H*.55;
    const b=boundsAtWorld(scroll+player.y);
    player.x=clamp(player.x,b.left+8,b.right-8);
  }
  render();
}
new ResizeObserver(resizeCanvas).observe(canvas);
addEventListener('orientationchange',()=>setTimeout(resizeCanvas,60));
resizeCanvas();

function rebuildCourseRows(){
  courseRows=[];
  const width=clamp(Math.round(clamp(W*.44,132,192)/16)*16,128,192);
  courseBaseLeft=W/2-width/2;
  courseBaseRight=W/2+width/2;
}

function courseFramesForRow(row){
  // 32-row repeating piste phrase:
  // 8 straight -> 4-row right bend -> 8 straight -> 4-row left bend -> 8 straight.
  //
  // The continuation tiles 25 and 28 are now used in the middle of the bend,
  // instead of pretending each row was an isolated corner.
  const phase=((row%32)+32)%32;

  if(phase>=8 && phase<12){
    const i=phase-8;
    return {
      left:[F.leftEnterRight,F.leftEnterRight,F.leftEnterRight,F.leftEnterRight][i],
      right:[F.rightEnterRight,F.rightDiagonalRight,F.rightExitFromLeft,F.rightStraight][i],
      bend:'right'
    };
  }

  if(phase>=20 && phase<24){
    const i=phase-20;
    return {
      left:[F.leftEnterLeft,F.leftDiagonalLeft,F.leftExitFromRight,F.leftStraight][i],
      right:[F.rightEnterLeft,F.rightEnterLeft,F.rightEnterLeft,F.rightEnterLeft][i],
      bend:'left'
    };
  }

  return {left:F.leftStraight,right:F.rightStraight,bend:'straight'};
}

function buildCourseRow(row,topLeft,topRight){
  const frames=courseFramesForRow(row);
  const lp=EDGE_PROFILE[frames.left];
  const rp=EDGE_PROFILE[frames.right];

  // Position each PNG from its real painted top-edge coordinate.
  // Its bottom edge then defines the next row's actual collision boundary.
  const leftX=topLeft-(lp.top-7.5);
  const rightX=topRight-(rp.top-7.5);
  const bottomLeft=topLeft+(lp.bottom-lp.top);
  const bottomRight=topRight+(rp.bottom-rp.top);

  return {
    row,
    topLeft,topRight,bottomLeft,bottomRight,
    leftFrame:frames.left,rightFrame:frames.right,
    leftX,rightX,bend:frames.bend
  };
}

function ensureCourseRows(targetRow){
  if(targetRow<0)return;
  while(courseRows.length<=targetRow){
    const row=courseRows.length;
    const previous=row?courseRows[row-1]:null;
    const topLeft=previous?previous.bottomLeft:courseBaseLeft;
    const topRight=previous?previous.bottomRight:courseBaseRight;
    courseRows.push(buildCourseRow(row,topLeft,topRight));
  }
}

function getCourseRow(row){
  if(row<0){
    return buildCourseRow(row,courseBaseLeft,courseBaseRight);
  }
  ensureCourseRows(row);
  return courseRows[row];
}

function boundsAtWorld(worldY){
  const row=Math.floor(worldY/TILE);
  const frac=(worldY-row*TILE)/TILE;
  const r=getCourseRow(row);
  const left=r.topLeft+(r.bottomLeft-r.topLeft)*frac;
  const right=r.topRight+(r.bottomRight-r.topRight)*frac;
  return {left,right,width:right-left,center:(left+right)/2};
}

function resetWorld(){
  speed=100;baseSpeed=100;distance=0;scroll=0;viewScroll=0;gates=0;nearMisses=0;
  tracks=[];puffs=[];feedback=[];scenery=[];obstacles=[];courseGates=[];lifts=[];boostPads=[];yetiEncounters=[];
  monster=null;yetiSpawnCount=0;boostTimer=0;animClock=0;
  nextSegment=0;trackClock=0;shake=0;crashClock=0;crashing=false;gameOver=false;
  rebuildCourseRows();
  ensureCourseRows(Math.ceil((H+SEGMENT*2)/TILE)+2);
  const py=H*.55;
  player={x:boundsAtWorld(py).center,y:py,vx:0,angle:0,spin:0,slide:0};
  startLineWorldY=py+9;
  ensureWorld(true);
  updateHud();
}

function ensureWorld(initial){
  const ahead=scroll+H+SEGMENT*2;
  ensureCourseRows(Math.ceil(ahead/TILE)+2);
  while(nextSegment*SEGMENT<ahead){
    generateSegment(nextSegment,initial&&nextSegment===0);
    nextSegment++;
  }
}

function addScenery(worldY,side,offset,frame,kind,topFrame=null){
  scenery.push({worldY,side,offset,frame,topFrame,kind,size:TILE});
}

function generateSegment(index,isFirst){
  const r=mulberry32(92731+index*7919);
  const start=index*SEGMENT;

  // Demo-style side dressing: both sides receive coherent little groups.
  for(const side of ['left','right']){
    const clusterCount=2+Math.floor(r()*2);
    for(let c=0;c<clusterCount;c++){
      const baseY=start+22+c*(SEGMENT/clusterCount)+randRange(r,-12,12);
      const count=2+Math.floor(r()*2);
      for(let i=0;i<count;i++){
        const rr=r();
        let frame,kind;
        if(rr<.46){
          // Full 2-tile evergreen: 6 above 18.
          addScenery(
            baseY+i*randRange(r,12,22),
            side,
            randRange(r,18,58)+i*4,
            F.treeBottom,
            'treeFull',
            F.treeTop
          );
          continue;
        }else if(rr<.58){
          frame=F.smallTree;kind='treeSmall';
        }else if(rr<.70){
          // Full 2-tile dead tree: 7 above 19.
          addScenery(
            baseY+i*randRange(r,12,22),
            side,
            randRange(r,18,58)+i*4,
            F.deadTreeBottom,
            'deadFull',
            F.deadTreeTop
          );
          continue;
        }else if(rr<.76){
          frame=F.stump;kind='stump';
        }else if(rr<.88){
          frame=F.rock;kind='rock';
        }else{
          frame=F.snowman;kind='snowman';
        }
        addScenery(
          baseY+i*randRange(r,9,19),
          side,
          randRange(r,18,58)+i*4,
          frame,
          kind
        );
      }
    }
  }

  // Direction signs and nets are intentional course furniture in the Kenney demo.
  if(index%2===0){
    const side=index%4===0?'left':'right';
    const signFrame=side==='left'?F.signBlue:F.signRed;
    addScenery(start+randRange(r,82,132),side,12,signFrame,'sign');
  }
  if(index%3===1){
    const side=r()<.5?'left':'right';
    addScenery(start+randRange(r,142,190),side,10,r()<.5?F.redNet:F.blueNet,'net');
  }

  // Small standalone course-marker flags appear outside the main piste in the source demo.
  if(index%4===2){
    const side=r()<.5?'left':'right';
    addScenery(start+52,side,randRange(r,20,34),r()<.5?F.redFlag[1]:F.blueFlag[1],'marker');
  }

  // Put a complete lift crossing in the first screen, then another every few sections.
  if(isFirst){
    addLift(H*.29,r);
  }else if(index%5===0){
    addLift(start+104,r);
  }

  // One slalom gate per world section after the opening stretch.
  // This is the middle ground between the old gate tunnel and the later too-sparse version.
  if(index>=2){
    const gateY=start+(index%5===0?190:118);
    addGate(gateY,index,0,false);
  }

  // Blue chevron strips are placed on the piste as boost pads, not roadside signs.
  if(index>=2 && index%4===2){
    addBoostPad(start+176);
  }

  // Sparse static hazards: keep the middle of the piste readable.
  if(index>1){
    const worldY=start+142+randRange(r,-14,14);
    const roll=r();
    const kind=roll<.5?'rock':roll<.72?'snowman':'tree';
    const t=kind==='tree'
      ? (r()<.5?randRange(r,.09,.17):randRange(r,.83,.91))
      : randRange(r,.22,.78);
    addObstacle(worldY,t,kind,r);
  }

  // Other skiers are recurring traffic, not a rare random hazard.
  // They hold a line and descend at different speeds so the player catches them.
  if(index>=4 && index%2===0){
    addObstacle(start+62+randRange(r,-12,12),randRange(r,.24,.76),'skier',r);
  }

  // Yeti encounters are course events, not a permanent pursuer. The marker
  // activates as soon as its row scrolls onto the bottom of the screen.
  if(index>=4 && (index-4)%7===0){
    yetiEncounters.push({
      worldY:start+128,
      side:((index-4)/7)%2===0?'left':'right',
      activated:false
    });
  }
}

function addGate(worldY,index,g,passed){
  const centerT=clamp(.5+Math.sin((index*2+g)*1.27)*.17,.29,.71);
  const half=.12;
  courseGates.push({
    worldY,
    leftT:centerT-half,
    rightT:centerT+half,
    redLeft:(index+g)%2===0,
    passed:!!passed
  });
}

function addObstacle(worldY,t,kind,r){
  let frame=F.rock,radius=5,frameBase=null,speedFactor=0,animOffset=0;
  if(kind==='tree'){
    frame=F.treeBottom;
    radius=5;
  }
  else if(kind==='snowman'){frame=F.snowman;radius=5}
  else if(kind==='skier'){
    frameBase=pickR(r,F.skierBases);
    frame=frameBase;
    radius=5;

    // Other skiers are actually skiing downhill. Each gets their own pace:
    // slower ones are overtaken; faster ones can pass the player.
    speedFactor=randRange(r,.58,.94);
    animOffset=randRange(r,0,10);
  }
  obstacles.push({
    worldY,t,baseT:t,kind,frame,frameBase,
    topFrame:kind==='tree'?F.treeTop:null,
    radius,nearChecked:false,
    speedFactor,animOffset
  });
}

function addBoostPad(worldY){
  // Boost art is a 16x32 vertical pad. Move the requested point forward to
  // the nearest pair of straight piste rows so it can never straddle a bank.
  let row=Math.floor(worldY/TILE);
  for(let i=0;i<10;i++){
    const r0=getCourseRow(row+i);
    const r1=getCourseRow(row+i+1);
    if(r0.bend==='straight' && r1.bend==='straight'){
      row+=i;
      break;
    }
  }
  boostPads.push({worldY:row*TILE+TILE,used:false});
}

function addLift(worldY,r){
  lifts.push({
    worldY,
    chairLeft:r()<.5?F.chairA:F.chairB,
    chairRight:r()<.5?F.chairA:F.chairB,
    // A 2×2 gondola: 55/56 are its top quadrants and 67/68 its bottom quadrants.
    gondola:true,
    movePhase:r()
  });
}

function startGame(){
  resetWorld();
  running=true;paused=false;
  startOverlay.classList.remove('show');
  gameOverOverlay.classList.remove('show');
  closePause();
  last=performance.now();
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(loop);
  tone('start');
}

function loop(now){
  if(!running||paused)return;
  const dt=Math.min(.04,Math.max(.001,(now-last)/1000||.016));
  last=now;

  update(dt);

  // Smooth visual camera follows simulation scroll. The slight lag absorbs uneven frame timing
  // without changing collisions or distance.
  const cameraEase=1-Math.exp(-dt*30);
  viewScroll+=(scroll-viewScroll)*cameraEase;

  render();
  if(running&&!paused)raf=requestAnimationFrame(loop);
}

function update(dt){
  if(crashing){updateCrash(dt);return}

  animClock+=dt;
  distance+=speed*dt;
  scroll+=speed*dt;
  const m=metres();

  // Base course speed keeps rising; boost is a temporary player advantage.
  baseSpeed=Math.min(330,100+m*.05);
  boostTimer=Math.max(0,boostTimer-dt);
  speed=baseSpeed+(boostTimer>0?52:0);
  ensureWorld(false);
  pruneWorld();

  const steer=((input.left?-1:0)+(input.right?1:0))||input.analog;
  const target=steer*(82+speed*.1);
  player.vx+=(target-player.vx)*Math.min(1,dt*8.5);
  if(!steer)player.vx*=Math.pow(.08,dt);
  player.x+=player.vx*dt;
  player.angle=clamp(player.vx/250,-.3,.3);

  trackClock-=dt;
  if(trackClock<=0){
    tracks.push({
      worldY:scroll+player.y+7,
      x:player.x,
      frame:tracks.length%2?F.tracksA:F.tracksB,
      // Trail is behind the skier: for a vertical mark sprite the canvas
      // rotation must be the inverse of the skier's lean/velocity direction.
      // Left carve -> trail leans left through the snow; right carve -> right.
      angle:-player.angle,
      life:1
    });
    if(tracks.length>70)tracks.shift();
    trackClock=.075;
  }

  if(Math.abs(steer)>.25&&Math.random()<dt*8){
    puffs.push({
      x:player.x+randRange(Math.random,-4,4),
      worldY:scroll+player.y+7,
      vx:randRange(Math.random,-12,12),
      life:.24,size:2
    });
  }

  for(const o of obstacles){
    if(o.kind==='skier'){
      // No side-to-side walking. They hold their line and move downhill at
      // individual speeds relative to the player's current course pace.
      o.worldY+=baseSpeed*o.speedFactor*dt;
    }
  }

  updateMonster(dt,m);

  for(const t of tracks)t.life-=dt*.18;
  tracks=tracks.filter(t=>t.worldY>scroll-30&&t.life>0);

  for(const p of puffs){p.x+=p.vx*dt;p.life-=dt}
  puffs=puffs.filter(p=>p.worldY>scroll-30&&p.life>0);

  checkBoundary();
  if(!crashing)checkLiftSupports();
  if(!crashing)checkBoostPads();
  if(!crashing)checkMonsterCollision();
  if(!crashing)checkObstacles();
  if(!crashing)checkGates();
  updateFeedback(dt);
  updateHud();
}

function pruneWorld(){
  const behind=scroll-120;
  scenery=scenery.filter(x=>x.worldY>behind);
  obstacles=obstacles.filter(x=>
    x.worldY>behind &&
    (x.kind!=='skier' || x.worldY<scroll+H+SEGMENT*2)
  );
  courseGates=courseGates.filter(x=>x.worldY>behind);
  lifts=lifts.filter(x=>x.worldY>behind);
  boostPads=boostPads.filter(x=>x.worldY>behind);
  yetiEncounters=yetiEncounters.filter(x=>!x.activated || x.worldY>behind);
}

function checkBoundary(){
  const b=boundsAtWorld(scroll+player.y);
  if(player.x<b.left+5||player.x>b.right-5)startCrash();
}

function liftTowerXs(){
  return [W*.22,W*.5,W*.78];
}

function checkLiftSupports(){
  const playerWorldY=scroll+player.y;
  for(const lift of lifts){
    // Only the orange foot/base at the very bottom of each support is solid.
    // The long vertical mast above it is visual-only so the skier can pass behind it.
    const footY=lift.worldY+TILE*4+3;
    if(Math.abs(playerWorldY-footY)>6)continue;
    for(const x of liftTowerXs()){
      if(Math.abs(player.x-x)<7){
        startCrash();
        return;
      }
    }
  }
}

function boostPadPosition(pad,camera=scroll){
  const b=boundsAtWorld(pad.worldY);
  return {x:b.center,y:pad.worldY-camera};
}

function checkBoostPads(){
  for(const pad of boostPads){
    if(pad.used)continue;
    const p=boostPadPosition(pad,scroll);
    if(Math.abs(p.y-player.y)<18 && Math.abs(p.x-player.x)<9){
      pad.used=true;
      boostTimer=1.35;
      addFeedback('BOOST!','#187bb4');
      tone('gate');
      vibrate(10);
    }
  }
}

function updateMonster(dt,m){
  // Trigger as soon as the encounter tile reaches the bottom of the viewport.
  // Spawn in WORLD coordinates so the pursuit is not faked by camera-space Y.
  if(!monster){
    for(const encounter of yetiEncounters){
      if(encounter.activated)continue;
      const markerY=encounter.worldY-scroll;
      if(markerY<=H-8 && markerY>-TILE*2){
        encounter.activated=true;
        const spawnWorldY=scroll+H-10;
        const b=boundsAtWorld(spawnWorldY);
        const sideX=encounter.side==='left'?b.left-18:b.right+18;
        const initialSpeedFactor=Math.min(.90,.60+yetiSpawnCount*.05);
        yetiSpawnCount++;
        monster={
          x:clamp(sideX,8,W-8),
          worldY:spawnWorldY,
          side:encounter.side,
          phase:'rush',
          initialSpeedFactor,
          dangerousThisFrame:true
        };
        break;
      }
    }
  }

  if(!monster)return;

  // ONE pursuit target only: the NORTH/top-centre of the skier sprite.
  const targetX=player.x;
  const rearScreenY=player.y-TILE/2;
  const targetWorldY=scroll+rearScreenY;

  let dx=targetX-monster.x;
  let dy=targetWorldY-monster.worldY;
  let dist=Math.hypot(dx,dy);

  monster.dangerousThisFrame=monster.phase==='rush';

  if(dist>.001){
    // Each successive yeti in the same run starts 5% faster:
    // 60%, 65%, 70%, 75%, 80%, 85%, then 90% (capped).
    // Once the skier passes it, pursuit speed is always 90%.
    const seekSpeed=baseSpeed*(monster.phase==='rush'?monster.initialSpeedFactor:.90);
    const step=Math.min(dist,seekSpeed*dt);
    monster.x+=dx/dist*step;
    monster.worldY+=dy/dist*step;

  }

  // "Passed" is now a world-space event: the skier's NORTH edge has moved
  // downhill beyond the yeti. From here it turns and pursues at 90%, but the
  // faster skier continues opening the gap (especially under boost).
  if(monster.phase==='rush' && targetWorldY>=monster.worldY+2){
    monster.phase='trailing';
  }

  monster.x=clamp(monster.x,6,W-6);

  const screenY=monster.worldY-scroll;
  if(monster.phase==='trailing' && screenY<-TILE*2){
    monster=null;
  }
}

function checkMonsterCollision(){
  if(!monster || !monster.dangerousThisFrame)return;

  const rearWorldY=scroll+player.y-TILE/2;
  if(Math.hypot(monster.x-player.x,monster.worldY-rearWorldY)<9){
    startCrash();
  }
}

function obstaclePosition(o,camera=scroll){
  const b=boundsAtWorld(o.worldY);
  return {x:b.left+b.width*o.t,y:o.worldY-camera};
}

function checkObstacles(){
  for(const o of obstacles){
    const p=obstaclePosition(o,scroll);
    if(p.y<player.y-28||p.y>player.y+28)continue;
    const d=Math.hypot(player.x-p.x,player.y-p.y);
    if(d<5+o.radius){startCrash();return}
    if(!o.nearChecked&&p.y<player.y-8){
      o.nearChecked=true;
      if(d<18&&d>11){
        nearMisses++;
        addFeedback('CLOSE!','#1e638a');
        tone('near');
      }
    }
  }
}

function checkGates(){
  for(const g of courseGates){
    const y=g.worldY-scroll;
    if(g.passed||y>player.y+2)continue;
    g.passed=true;
    const b=boundsAtWorld(g.worldY);
    const lx=b.left+b.width*g.leftT;
    const rx=b.left+b.width*g.rightT;
    if(player.x>lx+3&&player.x<rx-3){
      gates++;
      addFeedback('GATE!','#cb424a');
      tone('gate');
      vibrate(8);
    }else{
      addFeedback('MISSED GATE','#687f8c');
      tone('miss');
    }
  }
}

function startCrash(){
  if(crashing||gameOver)return;
  crashing=true;crashClock=0;shake=4;
  input.left=input.right=false;input.analog=0;input.pointerId=null;
  vibrate([55,30,80]);tone('crash');
  for(let i=0;i<12;i++){
    puffs.push({
      x:player.x+randRange(Math.random,-4,4),
      worldY:scroll+player.y+randRange(Math.random,1,8),
      vx:randRange(Math.random,-38,38),
      life:randRange(Math.random,.28,.5),
      size:2
    });
  }
}

function updateCrash(dt){
  crashClock+=dt;
  player.spin+=dt*4.4;
  player.slide+=dt*12;
  player.x+=player.vx*dt*.2;
  shake=Math.max(0,shake-dt*15);
  for(const p of puffs){p.x+=p.vx*dt;p.life-=dt}
  puffs=puffs.filter(p=>p.life>0);
  updateFeedback(dt);
  if(crashClock>.62)finishRun();
}

function finishRun(){
  if(gameOver)return;
  gameOver=true;running=false;crashing=false;
  const m=metres();
  const gatePoints=gates*GATE_BONUS;
  const finalScore=m+gatePoints;
  const isBest=finalScore>best;
  if(isBest){best=finalScore;localStorage.setItem(BEST_KEY,String(best))}
  finalScoreEl.textContent=finalScore;
  runBreakdownEl.textContent=m+' distance + '+gates+' gate'+(gates===1?'':'s')+' × '+GATE_BONUS+' = +'+gatePoints+' · '+nearMisses+' near miss'+(nearMisses===1?'':'es');
  recordText.textContent=isBest?'NEW BEST SCORE!':'Best score: '+best;
  bestEl.textContent=pad(best,4);
  startBestEl.textContent=pad(best,4);
  render();
  gameOverOverlay.classList.add('show');
}

function addFeedback(textValue,color){feedback.push({x:player.x,y:player.y-14,text:textValue,color,life:1})}
function updateFeedback(dt){
  for(const f of feedback){f.y-=15*dt;f.life-=dt*1.35}
  feedback=feedback.filter(f=>f.life>0);
}
function updateHud(){
  distanceEl.textContent=pad(metres(),4);
  gatesEl.textContent=pad(gates,2);
  bestEl.textContent=pad(Math.max(best,score()),4);
  speedLabel.textContent=speed<135?'CRUISE':speed<190?'CARVING':speed<255?'FAST':'FLYING';
}

function drawSprite(frame,x,y,size=TILE,angle=0,alpha=1,flip=false){
  const img=images[frame];if(!img)return;
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.translate(x,y);
  ctx.rotate(angle);
  ctx.scale(flip?-1:1,1);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img,-size/2,-size/2,size,size);
  ctx.restore();
}

function fillScrollingPattern(pattern){
  if(!pattern)return;
  const phase=-(viewScroll%(TILE*4));
  ctx.save();
  ctx.translate(0,phase);
  ctx.fillStyle=pattern;
  ctx.fillRect(0,-TILE*4,W,H+TILE*8);
  ctx.restore();
}

function drawPiste(){
  // Two prebuilt native-Tiny-Ski patterns replace thousands of per-frame tile draw calls.
  // This keeps the exact pack textures while dramatically reducing mobile render cost.
  fillScrollingPattern(outsidePattern);

  ctx.save();
  ctx.beginPath();
  for(let y=-TILE;y<=H+TILE;y+=6){
    const b=boundsAtWorld(viewScroll+y);
    if(y===-TILE)ctx.moveTo(b.left,y);else ctx.lineTo(b.left,y);
  }
  for(let y=H+TILE;y>=-TILE;y-=6){
    const b=boundsAtWorld(viewScroll+y);
    ctx.lineTo(b.right,y);
  }
  ctx.closePath();
  ctx.clip();
  fillScrollingPattern(pistePattern);
  ctx.restore();

  // Render the exact preplanned bank sequence. The same row record supplies
  // both the visual sprite placement and boundsAtWorld(), so corners cannot
  // visually disagree with collision geometry.
  const firstRow=Math.floor(viewScroll/TILE)-1;
  const lastRow=Math.ceil((viewScroll+H)/TILE)+1;
  ensureCourseRows(Math.max(0,lastRow));
  for(let row=firstRow;row<=lastRow;row++){
    const worldY=row*TILE;
    const screenY=worldY-viewScroll+TILE/2;
    const r=getCourseRow(row);
    drawSprite(r.leftFrame,r.leftX,screenY,TILE);
    drawSprite(r.rightFrame,r.rightX,screenY,TILE);
  }
}

function sceneryPosition(s){
  const b=boundsAtWorld(s.worldY);
  const raw=s.side==='left'?b.left-s.offset:b.right+s.offset;
  // Composite trees are 16px wide but 32px tall; horizontal safe margin still
  // needs only the base tile width plus a little breathing room.
  const half=(s.size||TILE)/2;
  const safe=half+4;
  return {x:clamp(raw,safe,W-safe),y:s.worldY-viewScroll};
}

function drawStartLine(){
  const y=startLineWorldY-viewScroll;
  if(y<-20||y>H+20)return;
  const b=boundsAtWorld(startLineWorldY);
  const left=b.left+10;
  const right=b.right-10;
  const block=4;
  let col=0;

  // Crisp two-row checkered starting stripe across the piste.
  for(let x=left;x<right;x+=block,col++){
    ctx.fillStyle=col%2===0?'#ffffff':'#426a84';
    ctx.fillRect(x,y-4,Math.min(block,right-x),4);
    ctx.fillStyle=col%2===0?'#426a84':'#ffffff';
    ctx.fillRect(x,y,Math.min(block,right-x),4);
  }

  // Use the Tiny Ski gate flags to frame the start line.
  drawSprite(F.redFlag[0],b.left+4,y,TILE);
  drawSprite(F.blueFlag[0],b.right-4,y,TILE);
}

function drawScenery(){
  const visible=scenery
    .filter(s=>{const y=s.worldY-viewScroll;return y>-TILE*2&&y<H+TILE*2})
    .sort((a,b)=>a.worldY-b.worldY);

  for(const s of visible){
    const p=sceneryPosition(s);
    drawSprite(s.frame,p.x,p.y,s.size);
    if(s.topFrame!==null){
      // Exact tile relationship from the Tiny Ski sheet:
      // top tile centre is one 16px tile above the bottom tile centre.
      drawSprite(s.topFrame,p.x,p.y-TILE,s.size);
    }
  }
}

function drawLiftShadow(lift){
  const cableY=lift.worldY-viewScroll;
  const shadowY=cableY+58;
  if(shadowY<-TILE||shadowY>H+TILE)return;

  // tile_0053 is the pack's pale horizontal lift/shadow line.
  for(let x=TILE/2;x<W+TILE;x+=TILE){
    drawSprite(F.liftShadow,x,shadowY,TILE,0,.62);
  }

  // Soft mast shadows mirror the pack demo without adding new art.
  const towerXs=liftTowerXs();
  ctx.save();
  ctx.globalAlpha=.18;
  ctx.fillStyle='#8fc0d8';
  for(const x of towerXs)ctx.fillRect(x-2,shadowY-2,4,46);
  ctx.restore();
}

function drawLiftTower(x,cableY){
  // 42 is the mast head; 54 is the shaft; 66 is the orange foot.
  drawSprite(F.liftTop,x,cableY,TILE);
  drawSprite(F.liftPole,x,cableY+TILE,TILE);
  drawSprite(F.liftPole,x,cableY+TILE*2,TILE);
  drawSprite(F.liftPole,x,cableY+TILE*3,TILE);
  drawSprite(F.liftFoot,x,cableY+TILE*4,TILE);
}

function drawChair(x,cableY,frame){
  // hanger line + Kenney chair. Keep it aligned to whole source-pixel widths.
  ctx.save();
  ctx.fillStyle='#342c34';
  ctx.fillRect(x-1,cableY+3,2,14);
  ctx.restore();
  drawSprite(frame,x,cableY+TILE+7,TILE);
}

function drawGondola(x,cableY){
  ctx.save();
  ctx.fillStyle='#342c34';
  ctx.fillRect(x-1,cableY+3,2,12);
  ctx.restore();

  const topY=cableY+TILE+5;
  drawSprite(F.gondolaTopLeft,x-TILE/2,topY,TILE);
  drawSprite(F.gondolaTopRight,x+TILE/2,topY,TILE);
  drawSprite(F.gondolaBottomLeft,x-TILE/2,topY+TILE,TILE);
  drawSprite(F.gondolaBottomRight,x+TILE/2,topY+TILE,TILE);
}

function wrapCableX(x){
  const span=W+TILE*4;
  return ((x+TILE*2)%span+span)%span-TILE*2;
}

function drawLift(lift){
  const cableY=lift.worldY-viewScroll;
  if(cableY<-TILE*6||cableY>H+TILE*2)return;

  const towerXs=liftTowerXs();

  // Straight triple cable is tile_0046. The supports stay fixed; chairs and
  // gondola now physically travel along the cable.
  for(let x=TILE/2;x<W+TILE;x+=TILE)drawSprite(F.liftCable,x,cableY,TILE);
  drawSprite(F.liftCableJoin,TILE/2,cableY,TILE);
  drawSprite(F.liftCableJoin,W-TILE/2,cableY,TILE);

  for(const x of towerXs){
    drawSprite(F.liftTowerHead,x,cableY,TILE);
    drawLiftTower(x,cableY);
  }

  const cableSpeed=18;
  const base=animClock*cableSpeed+(lift.movePhase||0)*(W+TILE*4);
  const moving=[
    {type:'chair',x:wrapCableX(base),frame:lift.chairLeft},
    {type:'gondola',x:wrapCableX(base+W*.28)},
    {type:'chair',x:wrapCableX(base+W*.56),frame:lift.chairRight},
    {type:'chair',x:wrapCableX(base+W*.82),frame:lift.chairLeft}
  ];

  for(const car of moving){
    if(car.x<-TILE*2||car.x>W+TILE*2)continue;
    drawSprite(F.liftHangerJoin,car.x,cableY,TILE);
    if(car.type==='gondola')drawGondola(car.x,cableY);
    else drawChair(car.x,cableY,car.frame);
  }
}

function render(){
  if(!canvas.width||!canvas.height)return;

  ctx.save();
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingEnabled=false;
  ctx.clearRect(0,0,W,H);

  if(shake>0)ctx.translate(randRange(Math.random,-shake,shake),randRange(Math.random,-shake,shake));

  drawPiste();
  drawStartLine();

  // Lift shadows belong underneath people and scenery.
  for(const lift of lifts)drawLiftShadow(lift);

  drawScenery();

  for(const t of tracks){
    const y=t.worldY-viewScroll;
    if(y>-TILE&&y<H+TILE)drawSprite(t.frame,t.x,y,TILE,t.angle,t.life*.62);
  }

  for(const pad of boostPads){
    if(pad.used)continue;
    const p=boostPadPosition(pad,viewScroll);
    if(p.y<-TILE*2||p.y>H+TILE*2)continue;
    // 22+23 form one right-pointing 32x16 chevron. Rotate the complete
    // composite clockwise so the arrow points downhill (screen-down).
    drawSprite(F.boostLeft,p.x,p.y-TILE/2,TILE,Math.PI/2);
    drawSprite(F.boostRight,p.x,p.y+TILE/2,TILE,Math.PI/2);
  }

  for(const g of courseGates){
    const y=g.worldY-viewScroll;
    if(y<-TILE*2||y>H+TILE*2)continue;
    const b=boundsAtWorld(g.worldY);
    const lx=b.left+b.width*g.leftT;
    const rx=b.left+b.width*g.rightT;
    drawSprite(g.redLeft?F.redFlag[0]:F.blueFlag[0],lx,y,TILE);
    drawSprite(g.redLeft?F.blueFlag[0]:F.redFlag[0],rx,y,TILE);
  }

  for(const o of obstacles){
    const p=obstaclePosition(o,viewScroll);
    if(p.y<-TILE*2||p.y>H+TILE*2)continue;
    const frame=o.kind==='skier'
      ? o.frameBase+((Math.floor((animClock+o.animOffset)*7)&1))
      : o.frame;
    drawSprite(frame,p.x,p.y,TILE,0);
    if(o.topFrame!==null && o.topFrame!==undefined){
      drawSprite(o.topFrame,p.x,p.y-TILE,TILE,0);
    }
  }

  for(const p of puffs){
    const y=p.worldY-viewScroll;
    if(y<-10||y>H+10)continue;
    ctx.globalAlpha=clamp(p.life*3,0,1);
    ctx.fillStyle='#fff';
    ctx.fillRect(p.x,y,p.size,p.size);
  }
  ctx.globalAlpha=1;

  if(monster){
    const my=monster.worldY-viewScroll;
    if(my>-TILE*2&&my<H+TILE*2){
      const rearY=player.y-TILE/2;
      const close=monster.phase==='rush' && Math.hypot(monster.x-player.x,my-rearY)<24;
      const mFrame=close?F.yetiAttack:(F.yetiA+(Math.floor(animClock*7)&1));
      drawSprite(mFrame,monster.x,my,TILE,0);
    }
  }

  if(player){
    const pFrame=F.playerA+(Math.floor(animClock*7)&1);
    drawSprite(pFrame,player.x,player.y+player.slide,TILE,crashing?player.spin:player.angle);
  }

  // The physical lift is overhead.
  for(const lift of lifts)drawLift(lift);

  for(const f of feedback){
    ctx.save();
    ctx.globalAlpha=clamp(f.life,0,1);
    ctx.font='900 10px ui-rounded, Arial Rounded MT Bold, sans-serif';
    ctx.textAlign='center';
    ctx.lineWidth=3;
    ctx.strokeStyle='#fff';
    ctx.strokeText(f.text,f.x,f.y);
    ctx.fillStyle=f.color;
    ctx.fillText(f.text,f.x,f.y);
    ctx.restore();
  }

  ctx.restore();
}

canvas.addEventListener('pointerdown',e=>{
  if(!running||paused||crashing||gameOver)return;
  const r=canvas.getBoundingClientRect();
  input.pointerId=e.pointerId;
  input.startX=e.clientX-r.left;
  input.analog=input.startX<r.width/2?-1:1;
  canvas.setPointerCapture?.(e.pointerId);
  e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{
  if(input.pointerId!==e.pointerId)return;
  const r=canvas.getBoundingClientRect();
  const x=e.clientX-r.left;
  const delta=x-input.startX;
  input.analog=Math.abs(delta)>10?clamp(delta/(r.width*.18),-1,1):(x<r.width/2?-1:1);
  e.preventDefault();
});
function clearPointer(e){
  if(input.pointerId===null||!e||input.pointerId===e.pointerId){
    input.pointerId=null;
    input.analog=0;
  }
}
canvas.addEventListener('pointerup',clearPointer);
canvas.addEventListener('pointercancel',clearPointer);
canvas.addEventListener('lostpointercapture',clearPointer);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('dblclick',e=>e.preventDefault());

addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){input.left=true;e.preventDefault()}
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){input.right=true;e.preventDefault()}
  if((e.key==='Escape'||e.key==='p'||e.key==='P')&&running){paused?resume():openPause();e.preventDefault()}
});
addEventListener('keyup',e=>{
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')input.left=false;
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')input.right=false;
});

function openPause(){
  if(!running||gameOver||crashing)return;
  paused=true;
  input.left=input.right=false;input.analog=0;input.pointerId=null;
  pauseSheet.classList.add('open');
  pauseSheet.setAttribute('aria-hidden','false');
}
function closePause(){pauseSheet.classList.remove('open');pauseSheet.setAttribute('aria-hidden','true')}
function resume(){
  if(!running||gameOver)return;
  closePause();paused=false;last=performance.now();raf=requestAnimationFrame(loop);
  document.activeElement?.blur?.();
}

document.getElementById('pauseButton').addEventListener('click',e=>{e.currentTarget.blur();openPause()});
document.getElementById('closePause').addEventListener('click',e=>{e.currentTarget.blur();resume()});
document.getElementById('resumeButton').addEventListener('click',e=>{e.currentTarget.blur();resume()});
document.getElementById('restartButton').addEventListener('click',e=>{e.currentTarget.blur();startGame()});
document.querySelector('.sheetBackdrop').addEventListener('click',resume);
startButton.addEventListener('click',e=>{e.currentTarget.blur();startGame()});
document.getElementById('againButton').addEventListener('click',e=>{e.currentTarget.blur();startGame()});

soundButton.addEventListener('click',e=>{
  e.currentTarget.blur();
  soundOn=!soundOn;
  soundButton.querySelector('span').textContent=soundOn?'SOUND ON':'SOUND OFF';
  soundIcon.src='../assets/gamebox/kenney/icons/Game%20Icons/White/2x/'+(soundOn?'audioOn.png':'audioOff.png');
});

function getAudio(){
  if(!soundOn)return null;
  try{
    audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();
    return audioCtx;
  }catch(_){return null}
}
function tone(type){
  const a=getAudio();if(!a)return;
  const o=a.createOscillator(),g=a.createGain();
  o.type=type==='crash'?'square':'sine';
  const f=type==='gate'?650:type==='near'?500:type==='miss'?165:type==='crash'?100:type==='start'?330:145;
  o.frequency.setValueAtTime(f,a.currentTime);
  o.frequency.exponentialRampToValueAtTime(type==='crash'?50:f*1.14,a.currentTime+.06);
  g.gain.setValueAtTime(.0001,a.currentTime);
  g.gain.exponentialRampToValueAtTime(type==='crash'?.08:.018,a.currentTime+.006);
  g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+(type==='crash'?.14:.05));
  o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.16);
}
function vibrate(pattern){if(navigator.vibrate)navigator.vibrate(pattern)}

document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused&&!gameOver&&!crashing)openPause()});
addEventListener('pagehide',()=>{input.left=input.right=false;input.analog=0;input.pointerId=null});
})();
