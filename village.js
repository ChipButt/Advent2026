(() => {
  'use strict';

  const canvas = document.getElementById('villageCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const stage = document.getElementById('villageStage');
  const joy = document.getElementById('villageJoystick');
  const knob = document.getElementById('villageJoyKnob');
  const enterButton = document.getElementById('houseEnterButton');
  const prompt = document.getElementById('housePrompt');
  const interiorHud = document.getElementById('houseInteriorHud');
  const houseNumberEl = document.getElementById('insideHouseNumber');
  const elfGreetingEl = document.getElementById('insideElfGreeting');
  const activityTitleEl = document.getElementById('insideActivityTitle');
  const activityTextEl = document.getElementById('insideActivityText');
  const leaveButton = document.getElementById('leaveHouseButton');

  const VIEW_W = 480;
  const VIEW_H = 320;
  const WORLD_W = 920;
  const WORLD_H = 760;
  const PLAYER_DRAW = 38;
  const PLAYER_RADIUS = 9;
  const MOVE_SPEED = 82;
  const WALK_FPS = 10;
  const IDLE_FPS = 6;
  const STORAGE_KEY = 'advent2026-village-v1';

  const PALETTE = {
    outline:'#18251f',
    snow:'#f3f0df',
    snowShade:'#d7ddd2',
    path:'#a87d5b',
    pathDark:'#816047',
    evergreen:'#234d38',
    evergreenDark:'#173526',
    red:'#a9363f',
    redDark:'#762832',
    green:'#426d4a',
    greenDark:'#2d4d35',
    cream:'#ead9b6',
    gold:'#d8ae58',
    brown:'#7c523b',
    brownDark:'#55382c',
    window:'#f7c56b',
    windowGlow:'#ffe6a3',
    night:'#10291f'
  };

  const ACTIVITIES = [
    ['Snowball Toss','Hit the moving snow targets before the timer runs out.'],
    ['Christmas Memory','Turn over festive cards and find every matching pair.'],
    ['Parcel Sort','Sort the workshop parcels into the correct coloured sleigh bags.'],
    ['Reindeer Dash','Guide a reindeer through the snowy course without clipping the markers.'],
    ['Carol Quiz','Listen to clues and work out which Christmas song the elf means.'],
    ['Tree Lights','Repeat the growing sequence of coloured Christmas lights.'],
    ['Gingerbread Builder','Copy the elf’s gingerbread-house design using the right pieces.'],
    ['Present Stack','Balance the presents and build the tallest stable stack you can.'],
    ['Festive Words','Find the hidden Christmas words before the clock reaches zero.'],
    ['Sleigh Maze','Find the quickest route through the snowy maze to Santa’s sleigh.'],
    ['Bauble Balance','Keep the baubles balanced while the branch moves underneath them.'],
    ['Christmas Trivia','Answer a quick round of festive questions and chase a perfect score.'],
    ['Snowman Builder','Choose the right parts to recreate the snowman shown by the elf.'],
    ['Stocking Match','Match each stocking to its owner using the clues on the mantle.'],
    ['Bell Rhythm','Copy the elf’s bell rhythm without missing a beat.'],
    ['North Pole Code','Crack the short code using the symbols and clues around the room.'],
    ['Gift Wrap Puzzle','Fold and place the wrapping pieces so the present is completely covered.'],
    ['Candy Cane Catch','Catch the good candy canes and dodge everything that should stay in the box.'],
    ['Christmas Movie Quiz','Identify the festive films from visual and written clues.'],
    ['Chimney Drop','Time each present so it lands safely down the correct chimney.'],
    ['Reindeer Roll Call','Match the reindeer names to the clues the stable elf gives you.'],
    ['Toy Workshop Rush','Complete a short chain of toy-making jobs before the workshop bell rings.'],
    ['Santa Route','Plan Santa’s route so every stop is visited without wasting moves.'],
    ['Christmas Eve Challenge','A final mixed challenge using skills from across the Advent village.']
  ];

  const houseColours = [
    ['#a9363f','#762832','#ead9b6'],
    ['#426d4a','#2d4d35','#ead9b6'],
    ['#8f5b3e','#65402f','#e8d4ad'],
    ['#436477','#2d4656','#e8d4ad'],
    ['#87506c','#5f384d','#ead9b6'],
    ['#7d6841','#57482f','#f0ddb5']
  ];

  const xCols = [82, 276, 570, 764];
  const yRows = [70, 180, 290, 400, 510, 620];
  const houses = [];
  let day = 1;
  for (let row = 0; row < yRows.length; row += 1) {
    const rowOrder = row % 2 === 0 ? [0,1,2,3] : [1,0,3,2];
    for (const col of rowOrder) {
      houses.push({
        day: day++,
        x: xCols[col],
        y: yRows[row],
        w: 74,
        h: 64,
        palette: houseColours[(day + col + row) % houseColours.length],
        chimneySide: (day + row) % 2 ? 'left' : 'right'
      });
    }
  }
  houses.sort((a,b)=>a.day-b.day);

  const trees = [
    [32,135],[168,140],[460,92],[688,138],[865,150],
    [185,252],[475,250],[735,258],[35,355],[875,365],
    [175,470],[465,470],[690,472],[35,575],[875,575],
    [185,686],[470,685],[700,690]
  ];

  const lamps = [
    [458,145],[458,255],[458,365],[458,475],[458,585],[458,695]
  ];

  let sprite = null;
  let active = true;
  let scene = 'village';
  let insideHouse = null;
  let nearbyHouse = null;
  let last = performance.now();
  let animStart = last;
  let moveDir = 'south';
  let moveMode = 'idle';
  let joyPointer = null;
  const keys = new Set();
  const camera = { x:0, y:0 };
  const player = { x:456, y:724, vx:0, vy:0 };
  const visited = new Set();

  function loadState() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (Number.isFinite(data.x)) player.x = data.x;
      if (Number.isFinite(data.y)) player.y = data.y;
      for (const n of data.visited || []) if (n >= 1 && n <= 24) visited.add(n);
    } catch (_) {}
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      x:Math.round(player.x), y:Math.round(player.y), visited:[...visited]
    }));
    window.dispatchEvent(new CustomEvent('advent-progress',{detail:{visited:visited.size}}));
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    const scale = Math.max(.45, Math.min(rect.width / VIEW_W, rect.height / VIEW_H));
    canvas.style.width = Math.round(VIEW_W * scale) + 'px';
    canvas.style.height = Math.round(VIEW_H * scale) + 'px';
  }

  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

  function rectHitCircle(rx,ry,rw,rh,cx,cy,r) {
    const qx=clamp(cx,rx,rx+rw), qy=clamp(cy,ry,ry+rh);
    const dx=cx-qx,dy=cy-qy;
    return dx*dx+dy*dy < r*r;
  }

  function houseCollision(x,y) {
    for (const h of houses) {
      if (rectHitCircle(h.x+5,h.y+21,h.w-10,h.h-15,x,y,PLAYER_RADIUS)) return true;
    }
    return false;
  }

  function tryMove(dx,dy) {
    const nx=clamp(player.x+dx,18,WORLD_W-18);
    if (!houseCollision(nx,player.y)) player.x=nx;
    const ny=clamp(player.y+dy,42,WORLD_H-16);
    if (!houseCollision(player.x,ny)) player.y=ny;
  }

  function updateNearbyHouse() {
    let best=null,bestD=Infinity;
    for (const h of houses) {
      const doorX=h.x+h.w/2, doorY=h.y+h.h+6;
      const d=Math.hypot(player.x-doorX,player.y-doorY);
      if (d < 34 && d < bestD) { best=h; bestD=d; }
    }
    nearbyHouse=best;
    if (scene !== 'village') return;
    enterButton.disabled=!nearbyHouse;
    enterButton.classList.toggle('ready',!!nearbyHouse);
    prompt.classList.toggle('visible',!!nearbyHouse);
    prompt.textContent=nearbyHouse ? 'House '+nearbyHouse.day+' · Press A to visit' : '';
  }

  function update(dt,now) {
    if (!active || scene !== 'village') return;
    let x=0,y=0;
    if (joyPointer === null) {
      if (keys.has('arrowleft')||keys.has('a')) x-=1;
      if (keys.has('arrowright')||keys.has('d')) x+=1;
      if (keys.has('arrowup')||keys.has('w')) y-=1;
      if (keys.has('arrowdown')||keys.has('s')) y+=1;
    } else {
      x=player.vx;y=player.vy;
    }
    const mag=Math.hypot(x,y);
    if (mag>.12) {
      x/=mag;y/=mag;
      tryMove(x*MOVE_SPEED*dt,y*MOVE_SPEED*dt);
      const next=Math.abs(x)>Math.abs(y)?(x<0?'west':'east'):(y<0?'north':'south');
      if(moveMode!=='walk'||moveDir!==next){moveMode='walk';moveDir=next;animStart=now}
    } else if(moveMode!=='idle') {
      moveMode='idle';animStart=now;
    }
    updateNearbyHouse();
    camera.x=clamp(player.x-VIEW_W/2,0,WORLD_W-VIEW_W);
    camera.y=clamp(player.y-VIEW_H/2,0,WORLD_H-VIEW_H);
  }

  function pixelRect(x,y,w,h,fill,outline=null) {
    if (outline) {ctx.fillStyle=outline;ctx.fillRect(Math.round(x-1),Math.round(y-1),Math.round(w+2),Math.round(h+2))}
    ctx.fillStyle=fill;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }

  function drawSnowGround() {
    ctx.fillStyle='#dfe5dd';ctx.fillRect(0,0,VIEW_W,VIEW_H);
    const ox=-camera.x,oy=-camera.y;
    ctx.fillStyle='#edf0e6';
    for(let gy=0;gy<WORLD_H;gy+=32)for(let gx=0;gx<WORLD_W;gx+=40){
      const sx=gx+((gy/32)%2?13:0)+ox,sy=gy+oy;
      if(sx>-8&&sy>-8&&sx<VIEW_W+8&&sy<VIEW_H+8)ctx.fillRect(Math.round(sx),Math.round(sy),3,2);
    }
  }

  function drawPathSegment(x,y,w,h) {
    const sx=x-camera.x,sy=y-camera.y;
    if(sx+w<0||sy+h<0||sx>VIEW_W||sy>VIEW_H)return;
    pixelRect(sx,sy,w,h,PALETTE.path,PALETTE.pathDark);
    ctx.fillStyle='#c39b73';
    for(let yy=4;yy<h-2;yy+=10)for(let xx=4+(yy%20?7:0);xx<w-3;xx+=14)ctx.fillRect(Math.round(sx+xx),Math.round(sy+yy),5,2);
    ctx.fillStyle=PALETTE.snowShade;
    ctx.fillRect(Math.round(sx),Math.round(sy),Math.round(w),2);
  }

  function drawPaths() {
    drawPathSegment(445,32,30,704);
    for (const h of houses) {
      const doorX=h.x+h.w/2;
      const y=h.y+h.h+4;
      const x1=Math.min(460,doorX),x2=Math.max(460,doorX);
      drawPathSegment(x1,y,x2-x1+1,14);
      drawPathSegment(doorX-6,y-2,13,30);
    }
  }

  function drawTree(x,y) {
    const sx=Math.round(x-camera.x),sy=Math.round(y-camera.y);
    if(sx<-35||sy<-55||sx>VIEW_W+35||sy>VIEW_H+20)return;
    ctx.fillStyle='#203329';ctx.fillRect(sx-3,sy+16,7,12);
    const tiers=[[0,-30,15],[0,-20,19],[0,-8,23]];
    for(const [dx,dy,r] of tiers){
      ctx.fillStyle=PALETTE.outline;ctx.beginPath();ctx.moveTo(sx+dx,sy+dy-r);ctx.lineTo(sx+dx-r-2,sy+dy+r);ctx.lineTo(sx+dx+r+2,sy+dy+r);ctx.fill();
      ctx.fillStyle=PALETTE.evergreenDark;ctx.beginPath();ctx.moveTo(sx+dx,sy+dy-r+2);ctx.lineTo(sx+dx-r,sy+dy+r-1);ctx.lineTo(sx+dx+r,sy+dy+r-1);ctx.fill();
      ctx.fillStyle=PALETTE.evergreen;ctx.beginPath();ctx.moveTo(sx+dx-2,sy+dy-r+4);ctx.lineTo(sx+dx-r+3,sy+dy+r-3);ctx.lineTo(sx+dx+3,sy+dy+r-3);ctx.fill();
      ctx.fillStyle=PALETTE.snow;ctx.fillRect(sx-r+5,sy+dy+r-4,Math.max(5,r-2),3);
    }
  }

  function drawLamp(x,y) {
    const sx=Math.round(x-camera.x),sy=Math.round(y-camera.y);
    ctx.fillStyle=PALETTE.outline;ctx.fillRect(sx-2,sy-18,4,20);
    ctx.fillStyle=PALETTE.brown;ctx.fillRect(sx-1,sy-17,2,19);
    ctx.fillStyle=PALETTE.outline;ctx.fillRect(sx-7,sy-26,14,10);
    ctx.fillStyle=PALETTE.window;ctx.fillRect(sx-5,sy-24,10,6);
    ctx.fillStyle=PALETTE.windowGlow;ctx.fillRect(sx-3,sy-23,4,3);
    ctx.fillStyle=PALETTE.snow;ctx.fillRect(sx-8,sy-28,16,3);
  }

  function drawHouse(h) {
    const sx=Math.round(h.x-camera.x),sy=Math.round(h.y-camera.y);
    const [wall,wallDark,trim]=h.palette;
    const w=h.w,hgt=h.h;
    if(sx+w<-20||sy+hgt<-30||sx>VIEW_W+20||sy>VIEW_H+20)return;

    // chimney
    const chimneyX=h.chimneySide==='left'?sx+13:sx+w-20;
    pixelRect(chimneyX,sy+2,9,21,PALETTE.redDark,PALETTE.outline);
    ctx.fillStyle=PALETTE.snow;ctx.fillRect(chimneyX-2,sy,13,4);

    // visible front wall
    pixelRect(sx+5,sy+27,w-10,hgt-27,wall,PALETTE.outline);
    ctx.fillStyle=wallDark;ctx.fillRect(sx+7,sy+hgt-9,w-14,6);
    ctx.fillStyle=trim;ctx.fillRect(sx+8,sy+31,w-16,3);

    // stepped roof + snow, deliberately chunky to match elf outlines/shading
    ctx.fillStyle=PALETTE.outline;
    ctx.beginPath();ctx.moveTo(sx+w/2,sy-8);ctx.lineTo(sx-5,sy+29);ctx.lineTo(sx+w+5,sy+29);ctx.fill();
    ctx.fillStyle=wallDark;
    ctx.beginPath();ctx.moveTo(sx+w/2,sy-5);ctx.lineTo(sx,sy+27);ctx.lineTo(sx+w,sy+27);ctx.fill();
    ctx.fillStyle=wall;
    ctx.beginPath();ctx.moveTo(sx+w/2,sy-2);ctx.lineTo(sx+7,sy+23);ctx.lineTo(sx+w-7,sy+23);ctx.fill();
    ctx.fillStyle=PALETTE.snow;
    ctx.fillRect(sx+2,sy+20,w-4,5);
    ctx.fillRect(sx+11,sy+14,18,4);
    ctx.fillRect(sx+w-31,sy+11,20,4);
    ctx.fillStyle=PALETTE.snowShade;
    ctx.fillRect(sx+4,sy+24,w-8,2);

    // windows
    const winY=sy+38;
    for(const wx of [sx+13,sx+w-26]){
      pixelRect(wx,winY,13,13,PALETTE.window,PALETTE.outline);
      ctx.fillStyle=PALETTE.windowGlow;ctx.fillRect(wx+2,winY+2,4,4);
      ctx.fillStyle=PALETTE.brownDark;ctx.fillRect(wx+6,winY,1,13);ctx.fillRect(wx,winY+6,13,1);
    }

    // door
    const doorX=sx+Math.floor(w/2)-8,doorY=sy+hgt-25;
    pixelRect(doorX,doorY,17,25,PALETTE.brown,PALETTE.outline);
    ctx.fillStyle='#a97a52';ctx.fillRect(doorX+3,doorY+4,11,5);
    ctx.fillStyle=PALETTE.gold;ctx.fillRect(doorX+12,doorY+13,2,2);

    // wreath
    ctx.fillStyle=PALETTE.evergreenDark;ctx.fillRect(doorX+4,doorY+6,9,8);
    ctx.fillStyle=PALETTE.evergreen;ctx.fillRect(doorX+5,doorY+7,7,6);
    ctx.fillStyle=PALETTE.brown;ctx.fillRect(doorX+7,doorY+9,3,3);
    ctx.fillStyle=PALETTE.red;ctx.fillRect(doorX+7,doorY+12,3,2);

    // numbered plaque
    const plateW=h.day>9?24:18;
    const px=sx+w/2-plateW/2,py=sy+27;
    pixelRect(px,py,plateW,13,PALETTE.cream,PALETTE.outline);
    ctx.fillStyle=PALETTE.redDark;
    ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(String(h.day),sx+w/2,py+7);

    if(visited.has(h.day)){
      ctx.fillStyle=PALETTE.gold;ctx.fillRect(sx+w-10,sy+30,5,5);
      ctx.fillStyle=PALETTE.windowGlow;ctx.fillRect(sx+w-9,sy+31,2,2);
    }

    if(nearbyHouse===h && scene==='village'){
      ctx.strokeStyle=PALETTE.gold;ctx.lineWidth=2;ctx.strokeRect(doorX-3,doorY-3,23,31);
    }
  }

  function currentPlayerFrame(now) {
    const elapsed=Math.max(0,now-animStart)/1000;
    const index=Math.floor(elapsed*(moveMode==='walk'?WALK_FPS:IDLE_FPS))%8;
    if(moveMode==='walk')return sprite.walk(moveDir,index);
    if(moveDir==='north'||moveDir==='south')return sprite.idle(moveDir,index,false);
    return sprite.rotation(moveDir);
  }

  function drawElfFrame(frame,x,y,size) {
    if(!frame)return;
    const b=sprite.bounds(frame),scale=size/64;
    const dx=Math.round(x-32*scale),dy=Math.round(y-(b.maxY+1)*scale);
    ctx.fillStyle='#14201955';ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y+1),Math.max(7,b.width*scale*.32),3,0,0,Math.PI*2);ctx.fill();
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(frame,dx,dy,size,size);
  }

  function drawVillage(now) {
    drawSnowGround();
    drawPaths();
    const renderables=[];
    for(const t of trees)renderables.push({y:t[1]+26,draw:()=>drawTree(t[0],t[1])});
    for(const l of lamps)renderables.push({y:l[1]+2,draw:()=>drawLamp(l[0],l[1])});
    for(const h of houses)renderables.push({y:h.y+h.h,draw:()=>drawHouse(h)});
    renderables.push({y:player.y,draw:()=>drawElfFrame(currentPlayerFrame(now),player.x-camera.x,player.y-camera.y,PLAYER_DRAW)});
    renderables.sort((a,b)=>a.y-b.y);
    for(const r of renderables)r.draw();
  }

  function drawInterior(now) {
    ctx.fillStyle='#2b2019';ctx.fillRect(0,0,VIEW_W,VIEW_H);
    // timber floor
    ctx.fillStyle='#8b5d3f';ctx.fillRect(0,156,VIEW_W,164);
    ctx.fillStyle='#70482f';
    for(let y=160;y<320;y+=18)ctx.fillRect(0,y,VIEW_W,2);
    for(let x=0;x<VIEW_W;x+=48)ctx.fillRect(x,156,2,164);

    // rear wall
    ctx.fillStyle='#7e4639';ctx.fillRect(0,0,VIEW_W,158);
    ctx.fillStyle='#62342d';ctx.fillRect(0,0,VIEW_W,12);
    // beams
    ctx.fillStyle=PALETTE.brownDark;ctx.fillRect(0,54,VIEW_W,7);ctx.fillRect(62,0,7,158);ctx.fillRect(410,0,7,158);

    // fireplace
    pixelRect(24,76,76,82,'#6d4938',PALETTE.outline);
    pixelRect(36,101,52,57,'#2b211c',PALETTE.outline);
    ctx.fillStyle='#bd5937';ctx.fillRect(50,133,25,17);
    ctx.fillStyle='#f5b654';ctx.fillRect(57,125,13,24);
    ctx.fillStyle=PALETTE.cream;ctx.fillRect(16,68,92,10);

    // window with snow
    pixelRect(340,36,80,70,'#254559',PALETTE.outline);
    ctx.fillStyle='#dce6e6';ctx.fillRect(343,89,74,14);
    ctx.fillStyle='#f3f0df';ctx.fillRect(348,82,65,10);
    ctx.fillStyle='#1a3040';ctx.fillRect(378,38,5,62);ctx.fillRect(342,68,76,5);

    // garland
    ctx.fillStyle=PALETTE.evergreenDark;
    for(let x=126;x<324;x+=13)ctx.fillRect(x,39+(x%26?3:0),15,5);
    ctx.fillStyle=PALETTE.red;for(let x=140;x<314;x+=42)ctx.fillRect(x,43,4,4);

    // table and activity parcel
    pixelRect(300,192,112,43,PALETTE.brown,PALETTE.outline);
    pixelRect(327,173,42,27,PALETTE.red,PALETTE.outline);
    ctx.fillStyle=PALETTE.gold;ctx.fillRect(346,172,5,29);ctx.fillRect(327,184,42,5);

    // resident elf and player
    const index=Math.floor(now/1000*IDLE_FPS)%8;
    drawElfFrame(sprite.idle('south',index,false),191,224,54);
    drawElfFrame(sprite.idle('north',index,false),236,281,38);
  }

  function draw(now) {
    ctx.clearRect(0,0,VIEW_W,VIEW_H);
    if(scene==='interior')drawInterior(now);else drawVillage(now);
  }

  function enterHouse(h=nearbyHouse) {
    if(!h)return;
    insideHouse=h;scene='interior';visited.add(h.day);saveState();
    houseNumberEl.textContent='HOUSE '+h.day;
    elfGreetingEl.textContent='Hello! Come in — I’ve been waiting for you.';
    activityTitleEl.textContent=ACTIVITIES[h.day-1][0];
    activityTextEl.textContent=ACTIVITIES[h.day-1][1];
    interiorHud.hidden=false;
    prompt.classList.remove('visible');
    enterButton.disabled=true;
  }

  function leaveHouse() {
    scene='village';interiorHud.hidden=true;
    if(insideHouse){
      player.x=insideHouse.x+insideHouse.w/2;
      player.y=insideHouse.y+insideHouse.h+28;
    }
    insideHouse=null;updateNearbyHouse();saveState();
  }

  function setJoy(clientX,clientY) {
    const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    const dx=clientX-cx,dy=clientY-cy,max=34,mag=Math.hypot(dx,dy)||1,s=Math.min(1,max/mag);
    const px=dx*s,py=dy*s;
    knob.style.transform='translate('+px+'px,'+py+'px)';
    player.vx=px/max;player.vy=py/max;
  }
  joy.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;joy.setPointerCapture(e.pointerId);setJoy(e.clientX,e.clientY)});
  joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)setJoy(e.clientX,e.clientY)});
  function stopJoy(e){if(e.pointerId!==joyPointer)return;joyPointer=null;player.vx=0;player.vy=0;knob.style.transform='translate(0,0)'}
  joy.addEventListener('pointerup',stopJoy);joy.addEventListener('pointercancel',stopJoy);

  addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();
    if(['arrowup','arrowdown','arrowleft','arrowright',' ','enter'].includes(k))e.preventDefault();
    keys.add(k);
    if((k===' '||k==='enter')&&scene==='village')enterHouse();
    if((k==='escape'||k==='backspace')&&scene==='interior')leaveHouse();
  });
  addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));

  enterButton.addEventListener('click',()=>enterHouse());
  leaveButton.addEventListener('click',leaveHouse);

  function loop(now) {
    const dt=Math.min(.05,(now-last)/1000);last=now;
    update(dt,now);draw(now);requestAnimationFrame(loop);
  }

  window.AdventVillage = {
    setActive(next){active=!!next;if(!active&&scene==='interior')leaveHouse()},
    getVisitedCount(){return visited.size},
    focusHouse(dayNumber){
      const h=houses.find(x=>x.day===dayNumber);if(!h)return;
      player.x=h.x+h.w/2;player.y=h.y+h.h+30;camera.x=clamp(player.x-VIEW_W/2,0,WORLD_W-VIEW_W);camera.y=clamp(player.y-VIEW_H/2,0,WORLD_H-VIEW_H);
    }
  };

  loadState();
  resize();
  addEventListener('resize',resize,{passive:true});
  window.visualViewport?.addEventListener('resize',resize,{passive:true});

  window.CuteElfSprite.ready.then(api=>{
    sprite=api;
    sprite.setTheme(sprite.defaults);
    requestAnimationFrame(loop);
  }).catch(error=>{
    console.error(error);
    prompt.textContent='The coded elf could not be loaded.';
    prompt.classList.add('visible');
  });
})();