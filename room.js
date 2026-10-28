(() => {
  'use strict';
  // Public review build: purely client-side; does not invent real Advent assignments or scores.
  const ROOM_W = 941, ROOM_H = 1672;
  const SHOWCASE = new URLSearchParams(location.search).get('showcase') === '1';
  const STORAGE_KEY = 'advent2026-christmas-home-v1' + (SHOWCASE ? '-showcase' : '');
  const GAME_ROOT = 'https://chipbutt.github.io/Advent2026/games/';
  const TEST = SHOWCASE || new URLSearchParams(location.search).get('test') === '1';
  const GAMES = Object.freeze([
    {id:'tiny-ski-run', title:'Tiny Ski Run', icon:'⛷', description:'Ski downhill, pass the gates and beat your best run.'},
    {id:'jigsaw', title:'Jigsaw', icon:'🧩', description:'Put the festive picture back together.'},
    {id:'workshop-watch', title:'Workshop Watch', icon:'🛡', description:'Defend the Christmas workshop across 12 levels.'},
    {id:'block-breaker', title:'Block Breaker', icon:'❄', description:'Break Christmas ice blocks with bouncing snowballs.'},
    {id:'santa-invaders', title:'Santa Invaders', icon:'☄', description:'Defend the ice path against Christmas invaders.'},
    {id:'festive-blocks', title:'Festive Blocks', icon:'▦', description:'Place festive pieces and clear rows.'}
  ]);
  // Approved game-to-day assignments are intentionally blank until the owner sets them.
  const DAY_GAMES = Object.freeze(Object.fromEntries(Array.from({length:24},(_,i)=>[i+1,null])));
  const $ = id => document.getElementById(id);
  const viewport=$('viewport'), world=$('world'), layer=$('placedDecorations'), gifts=$('giftLayer');
  const tray=$('inventoryTray'), inventoryItems=$('inventoryItems');
  const dialog=$('giftDialog'), giftAction=$('giftAction');
  const fire=$('fire');
  let state;
  try {state=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch(_){state=null;}
  if(!state || state.version!==1 || !Array.isArray(state.decorations) || !Array.isArray(state.opened)) {
    state={version:1,tutorialDone:false,decorations:[],opened:[],sound:false};
  }
  state.opened=state.opened.filter(n=>Number.isInteger(n)&&n>=1&&n<=24);
  state.decorations=state.decorations.filter(d=>{
  if(!d||typeof d.id!=='string'||typeof d.kind!=='string'||!Number.isFinite(d.x)||!Number.isFinite(d.y))return false;
  if(d.kind==='bauble')return Number.isInteger(d.day)&&state.opened.includes(d.day)&&d.id==='bauble-'+d.day;
  if(d.id.startsWith('bauble-')||d.kind==='ornament'||d.kind==='gift-prop')return false;
  if(d.kind==='star'&&!state.opened.includes(24))return false;
  return true;
});
  if(SHOWCASE && !localStorage.getItem(STORAGE_KEY)){
    state.tutorialDone=true;
    state.decorations=[
      {id:'starter-wreath',kind:'wreath',x:227,y:328},
      {id:'starter-garland',kind:'garland',x:242,y:470},
      {id:'starter-stocking',kind:'stocking',x:185,y:552},
      {id:'stocking-ivory-knit',kind:'stocking',x:295,y:550},
      {id:'bow-gold',kind:'bow',x:680,y:329},
    ];
  }

  let saveTimer=null;
  function saveNow(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){toast('Your browser storage is full; changes may not persist.');}}
  function saveSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,350);}
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const uid=()=>crypto.randomUUID?.()||String(Date.now())+Math.random().toString(36).slice(2);
  const londonParts=()=>Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23',minute:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
  const dateNumber=p=>p.year*10000+p.month*100+p.day;
  const unlocked=day=>TEST||dateNumber(londonParts())>=20261200+day;
  let toastTimer;
  function toast(message){const t=$('toast');t.textContent=message;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),3000);}
  
  // Coordinates remain anchored to the full, original artwork, independent of zoom or device size.
  let scale=1, tx=0,ty=0;
  const activePointers=new Map();
  let panOrigin=null,pinchStart=null;
  const treeFocus={x:710,y:500};
  function transform(){world.style.transform=`translate3d(${tx}px,${ty}px,0) scale(${scale})`;}
  function bounds(){const r=viewport.getBoundingClientRect();return {w:r.width,h:r.height};}
  function rangeScale(){const {w,h}=bounds();return {min:Math.min(w/ROOM_W,h/ROOM_H),max:Math.max(2.6,w/300,h/470)};}
  function fitTree(){const {w,h}=bounds();const bar=tray.classList.contains('collapsed')?45:128;const usableHeight=Math.max(290,h-bar-58);return clamp(Math.min(w/500,usableHeight/740),rangeScale().min,rangeScale().max);}
  function limitCamera(){const {w,h}=bounds();const sw=ROOM_W*scale,sh=ROOM_H*scale;tx=sw<=w?w/2-sw/2:clamp(tx,w-sw,0);
    ty=sh<=h?h/2-sh/2:clamp(ty,h-sh,0);
  }
  function positionCamera(x,y,s=scale){const {w,h}=bounds();scale=clamp(s,rangeScale().min,rangeScale().max);tx=w/2-x*scale;ty=h/2-y*scale;limitCamera();transform();}
  function focusTree(){positionCamera(treeFocus.x,treeFocus.y,fitTree());
    // The inventory overlays the lower part of the viewport: centre the tree in the unobstructed region.
    const covered=tray.classList.contains('collapsed')?45:128;ty-=covered/2;limitCamera();transform();
  }
  function viewRoom(){const {w,h}=bounds();positionCamera(ROOM_W/2,ROOM_H/2,Math.min(w/ROOM_W,h/ROOM_H));}
  function zoomAt(newScale,cx,cy){const next=clamp(newScale,rangeScale().min,rangeScale().max);const wx=(cx-tx)/scale,wy=(cy-ty)/scale;scale=next;tx=cx-wx*scale;ty=cy-wy*scale;limitCamera();transform();}
  function pointToWorld(clientX,clientY){const r=viewport.getBoundingClientRect();return {x:(clientX-r.left-tx)/scale,y:(clientY-r.top-ty)/scale};}
  function viewportPoint(e){const r=viewport.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  viewport.addEventListener('pointerdown',e=>{if(e.target.closest('.decor,.present'))return;viewport.setPointerCapture(e.pointerId);const p=viewportPoint(e);activePointers.set(e.pointerId,p);
    if(activePointers.size===1)panOrigin={x:p.x,y:p.y,tx,ty};
    if(activePointers.size===2){const [a,b]=[...activePointers.values()];pinchStart={dist:Math.hypot(a.x-b.x,a.y-b.y),scale,mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};panOrigin=null;}
  });
  viewport.addEventListener('pointermove',e=>{if(!activePointers.has(e.pointerId))return;const p=viewportPoint(e);activePointers.set(e.pointerId,p);
    if(activePointers.size===2&&pinchStart){const [a,b]=[...activePointers.values()];const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},dist=Math.hypot(a.x-b.x,a.y-b.y);zoomAt(pinchStart.scale*dist/Math.max(1,pinchStart.dist),mid.x,mid.y);return;}
    if(panOrigin){tx=panOrigin.tx+p.x-panOrigin.x;ty=panOrigin.ty+p.y-panOrigin.y;limitCamera();transform();}
  });
  function clearPointer(e){activePointers.delete(e.pointerId);if(activePointers.size===1){const p=[...activePointers.values()][0];panOrigin={x:p.x,y:p.y,tx,ty};pinchStart=null;}else if(activePointers.size===0){panOrigin=null;pinchStart=null;}}
  viewport.addEventListener('pointerup',clearPointer);viewport.addEventListener('pointercancel',clearPointer);viewport.addEventListener('lostpointercapture',clearPointer);
  viewport.addEventListener('wheel',e=>{e.preventDefault();const p=viewportPoint(e);zoomAt(scale*Math.exp(-e.deltaY*.0015),p.x,p.y);},{passive:false});
  viewport.addEventListener('keydown',e=>{const delta=e.shiftKey?95:45;switch(e.key){case'+':case'=':zoomAt(scale*1.22,bounds().w/2,bounds().h/2);break;case'-':zoomAt(scale/1.22,bounds().w/2,bounds().h/2);break;case'ArrowLeft':tx+=delta;break;case'ArrowRight':tx-=delta;break;case'ArrowUp':ty+=delta;break;case'ArrowDown':ty-=delta;break;default:return;}e.preventDefault();limitCamera();transform();});
  $('treeBtn').addEventListener('click',focusTree);$('roomBtn').addEventListener('click',viewRoom);
  $('zoomIn').addEventListener('click',()=>zoomAt(scale*1.3,bounds().w/2,bounds().h/2));
  $('zoomOut').addEventListener('click',()=>zoomAt(scale/1.3,bounds().w/2,bounds().h/2));
  addEventListener('resize',()=>{if(document.querySelector('.nav-link.active')?.dataset.view==='room')focusTree();});

  function isTreePosition(x,y){if(y<170||y>800)return false;const hw=clamp((y-170)/620*225+22,28,235);return Math.abs(x-691)<=hw;}
  // Any decoration can be placed anywhere in the room; tree locations are suggestions, not restrictions.
  function validPosition(kind,x,y){return Number.isFinite(x)&&Number.isFinite(y)&&x>=12&&x<=ROOM_W-12&&y>=12&&y<=ROOM_H-12;}
  function dragPosition(kind,x,y){return {x:clamp(x,12,ROOM_W-12),y:clamp(y,12,ROOM_H-12)};}
  // All source artwork lives in assets/decor as individually isolated, true-RGBA PNGs.
  // Review mode (?test=1 or ?showcase=1) allows trying every asset; only selected
  // room starters are normally available before earned rewards are integrated.
  const ASSET_CATALOG = Object.freeze([
    ['starter-wreath','wreath','Christmas wreath','wreath-red-bow',112,112,true],
    ['starter-stocking','stocking','Red Christmas stocking','stocking-red-snowflake',62,113,true],
    ['starter-garland','garland','Mantel garland','garland-red-bow',288,86,true],
    ['starter-bow','bow','Red festive bow','bow-red',67,70,true],
    ['starter-lantern','lantern','Candle lantern','lantern-black',70,78,true],
    ['wreath-frosted','wreath','Snowy wreath','wreath-frosted',112,108,false],
    ['wreath-gold-bow','wreath','Gold bow wreath','wreath-gold-bow',108,108,false],
    ['wreath-rustic-star','wreath','Woodland wreath','wreath-rustic-star',110,110,false],
    ['garland-cream-berries','garland','Winter berry garland','garland-cream-berries',288,79,false],
    ['stocking-green-reindeer','stocking','Reindeer stocking','stocking-green-reindeer',62,116,false],
    ['stocking-ivory-knit','stocking','Knitted stocking','stocking-ivory-knit',62,113,false],
    ['stocking-red-gold','stocking','Gold snowflake stocking','stocking-red-gold',62,113,false],
    ['stocking-red-tartan','stocking','Tartan stocking','stocking-red-tartan',62,113,false],
    ['stocking-green-holly','stocking','Holly stocking','stocking-green-holly',62,113,false],
    ['bow-gold','bow','Gold ribbon bow','bow-gold',73,77,false],
    ['bow-tartan','bow','Tartan ribbon bow','bow-tartan',73,77,false],
    ['candles-holly','table','Holly candles','candles-holly',85,92,false],
    ['ornament-gingerbread','ornament','Gingerbread ornament','ornament-gingerbread',59,78,false],
    ['bauble-red','ornament','Red bauble','bauble-red',52,70,false],
    ['bauble-green','ornament','Green bauble','bauble-green',52,70,false],
    ['bauble-cream','ornament','Cream bauble','bauble-cream',52,70,false],
    ['bauble-gold-diamond','ornament','Gold patterned bauble','bauble-gold-diamond',52,70,false],
    ['bauble-gold-ribbed','ornament','Ribbed gold bauble','bauble-gold-ribbed',52,70,false],
    ['bauble-red-striped','ornament','Striped red bauble','bauble-red-striped',52,70,false],
    ['bauble-tartan','ornament','Tartan bauble','bauble-tartan',52,70,false],
    ['bauble-snowglobe','ornament','Winter snowglobe','bauble-snowglobe',52,70,false],
    ['gift-red-gold','gift-prop','Red wrapped present','gift-red-gold',78,85,false],
    ['gift-green','gift-prop','Green wrapped present','gift-green',78,85,false],
    ['tree-skirt','skirt','Festive tree skirt','tree-skirt',190,93,false],
    ['star-gold','star','Christmas Eve star','star-gold',98,112,false],
  ].map(([id,kind,label,asset,w,h,starter])=>({id,kind,label,src:'assets/decor/'+asset+'.webp?v=20261028-clean2',w,h,starter})));
  const assetFor=id=>ASSET_CATALOG.find(a=>a.id===id);
  function ownedItems(){
    const placed=new Set(state.decorations.map(d=>d.id));
    const items=ASSET_CATALOG.filter(a=>a.kind!=='ornament'&&a.kind!=='gift-prop'&&a.kind!=='star'&&!placed.has(a.id));
    const baubles=state.opened.filter(day=>!placed.has('bauble-'+day)).map(day=>({kind:'bauble',id:'bauble-'+day,day,label:'Day '+day,src:'assets/decor/bauble-red.webp?v=20261028-clean2',w:55,h:75}));
    const star=state.opened.includes(24)&&!placed.has('star-gold')?[assetFor('star-gold')]:[];
    return [...items,...star,...baubles];
  }
  let inventorySelection=null;
  let tutorialPhase=0;
  function makeArt(src,alt){const img=document.createElement('img');img.src=src;img.alt=alt;img.loading='lazy';img.draggable=false;return img;}
  function renderInventory(){const arr=ownedItems();inventoryItems.replaceChildren();$('inventoryCount').textContent=arr.length+' available';
    for(const item of arr){const b=document.createElement('button');b.type='button';b.className='inventory-item'+(inventorySelection===item.id?' selected':'');b.setAttribute('aria-label',`Select ${item.label} for placement`);
      const pic=document.createElement('span');pic.className='item-picture';pic.append(makeArt(item.src||'assets/decor/bauble-red.webp?v=20261028-clean2',''));
      const cap=document.createElement('span');cap.textContent=item.label;b.append(pic,cap);
      b.addEventListener('click',()=>{inventorySelection=inventorySelection===item.id?null:item.id;renderInventory();if(inventorySelection)toast('Tap where you want to place '+item.label.toLowerCase());});inventoryItems.append(b);
    }
    if(!arr.length){const p=document.createElement('span');p.className='inventory-placeholder';p.textContent='Everything is placed. Press and hold to rearrange.';inventoryItems.append(p);}
  }
  function dataForDec(id){const catalog=assetFor(id);if(catalog)return catalog;
    if(id.startsWith('bauble-')){const day=Number(id.slice(7));return {id,day,kind:'bauble',label:'Day '+day,src:'assets/decor/bauble-red.webp?v=20261028-clean2',w:55,h:75};}
    return {id,kind:'art',label:'Decoration'};
  }
  function decorationElement(d){const b=document.createElement('button');const item=dataForDec(d.id);
    b.className='decor asset-decor'+(d.kind==='bauble'?' game-bauble':'');b.type='button';b.style.cssText=`left:${d.x}px;top:${d.y}px;width:${item.w||84}px;height:${item.h||84}px`;b.dataset.id=d.id;
    b.setAttribute('aria-label',d.kind==='bauble'?`Day ${d.day} game bauble: tap to open game, hold to move`:`${item.label}: hold to move`);
    if(item.src)b.append(makeArt(item.src,''));
    if(d.kind==='bauble'){
      const game=DAY_GAMES[d.day]&&GAMES.find(x=>x.id===DAY_GAMES[d.day]);
      const badge=document.createElement('span');badge.className='game-bauble-number';badge.textContent=game?game.icon:String(d.day);b.append(badge);
    }
    attachDecorationEvents(b,d);return b;
  }
  function renderPlaced(){layer.replaceChildren();for(const d of state.decorations)layer.append(decorationElement(d));}
  function placeItem(item,x,y){if(!validPosition(item.kind,x,y)){toast('Choose a spot in the room');return false;}
    state.decorations.push({id:item.id,kind:item.kind,day:item.day||null,x,y});inventorySelection=null;renderPlaced();renderInventory();saveSoon();toast('Lovely! Hold a decoration to move it.');
    if(tutorialPhase===1&&item.kind==='wreath'){tutorialPhase=2;inventorySelection='starter-stocking';renderInventory();renderGuide();}
    else if(tutorialPhase===2&&item.kind==='stocking'){tutorialPhase=3;renderGuide();}
    return true;}
  viewport.addEventListener('click',e=>{if(!inventorySelection||e.target.closest('.decor,.present'))return;const p=pointToWorld(e.clientX,e.clientY);placeItem(dataForDec(inventorySelection),p.x,p.y);});
  function attachDecorationEvents(el,d){let heldTimer=null,down=null,dragging=false,pointerId=null,cancelledTap=false;
    el.addEventListener('pointerdown',e=>{if(!e.isPrimary)return;e.stopPropagation();pointerId=e.pointerId;down={clientX:e.clientX,clientY:e.clientY,originX:d.x,originY:d.y};dragging=false;cancelledTap=false;el.setPointerCapture(e.pointerId);
      heldTimer=setTimeout(()=>{if(!down)return;dragging=true;el.classList.add('dragging','decor-placement-glow');navigator.vibrate?.(15);toast('Move and release to reposition');},475);
    });
    el.addEventListener('pointermove',e=>{if(pointerId!==e.pointerId||!down)return;
      // Moving a finger before the hold threshold cancels dragging rather than launching a game.
      if(!dragging){if(Math.hypot(e.clientX-down.clientX,e.clientY-down.clientY)>16){clearTimeout(heldTimer);heldTimer=null;cancelledTap=true;}return;}
      const p=pointToWorld(e.clientX,e.clientY),next=dragPosition(d.kind,p.x,p.y);el.style.left=next.x+'px';el.style.top=next.y+'px';
    });
    const release=e=>{if(pointerId!==e.pointerId)return;clearTimeout(heldTimer);const wasDrag=dragging;dragging=false;pointerId=null;el.classList.remove('dragging','decor-placement-glow');if(wasDrag){const p=pointToWorld(e.clientX,e.clientY);
        const next=dragPosition(d.kind,p.x,p.y);d.x=next.x;d.y=next.y;
        renderPlaced();renderInventory();saveSoon();if(tutorialPhase===3){tutorialPhase=0;state.tutorialDone=true;saveNow();renderGuide();focusTree();toast('All yours! Presents arrive from 1 December.');}}
      else if(d.kind==='bauble'&&!cancelledTap&&down&&Math.hypot(e.clientX-down.clientX,e.clientY-down.clientY)<=15){playDay(d.day);}
      down=null;};
    el.addEventListener('pointerup',release);el.addEventListener('pointercancel',()=>{clearTimeout(heldTimer);down=null;dragging=false;pointerId=null;el.classList.remove('dragging');});
    el.addEventListener('click',e=>{e.stopPropagation();if(e.detail===0&&d.kind==='bauble')playDay(d.day);});
    el.addEventListener('keydown',e=>{if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();state.decorations=state.decorations.filter(x=>x.id!==d.id);saveSoon();renderPlaced();renderInventory();toast('Decoration returned to inventory');}});
  }
  function playDay(day){const g=DAY_GAMES[day]&&GAMES.find(x=>x.id===DAY_GAMES[day]);if(!g){toast(`Day ${day}'s game has not been assigned yet.`);return;}location.href=GAME_ROOT+encodeURIComponent(g.id)+'/';}
  $('inventoryToggle').addEventListener('click',()=>{const collapsed=tray.classList.toggle('collapsed');$('inventoryToggle').setAttribute('aria-expanded',String(!collapsed));});

  let modalDay=null;
  // Twenty-four daily gifts arranged in a close, illustrated pile around the snowy base.
  const GIFT_POSITIONS=Array.from({length:24},(_,i)=>{
    const row=Math.floor(i/6),col=i%6;
    return {x:502+col*66+(row%2?22:0)+(i*7%17-8),y:772+row*35+(i*5%13-6),size:65+(i*13%18),angle:(i*11%15)-7};
  });
  const giftArtwork=day=>'assets/decor/'+(day%2?'gift-red-gold.webp?v=20261028-clean2':'gift-green.webp?v=20261028-clean2');
  function renderGifts(){
    gifts.replaceChildren();
    const available=Array.from({length:24},(_,i)=>i+1).filter(day=>unlocked(day)&&!state.opened.includes(day));
    for(const day of available){
      const i=day-1,p=GIFT_POSITIONS[i],b=document.createElement('button');b.type='button';
      b.className='present illustrated-present';b.setAttribute('aria-label','Open Advent present '+day);
      b.style.left=p.x+'px';b.style.top=p.y+'px';b.style.width=p.size+'px';b.style.height=p.size+'px';b.style.zIndex=1+Math.floor(i/6);
      b.style.setProperty('--tilt',p.angle+'deg');b.style.setProperty('--gift-hue',String([0,15,-18,25,-35,48,8,90][i%8])+'deg');
      const art=makeArt(giftArtwork(day),'');art.className='present-art';
      const number=document.createElement('span');number.className='present-day';number.textContent=String(day);
      b.append(art,number);if(day===londonParts().day&&londonParts().month===12)b.classList.add('new');
      b.addEventListener('click',()=>openGift(day));gifts.append(b);
    }
  }
  function openGift(day){if(!unlocked(day)||state.opened.includes(day))return;modalDay=day;$('giftTitle').textContent='Present '+day;$('giftEyebrow').textContent='DAY '+day+' · ADVENT 2026';$('giftDescription').textContent='A Christmas bauble for your tree is waiting inside.';$('giftOpening').classList.remove('opening');document.querySelectorAll('.gift-package').forEach(img=>img.src=giftArtwork(day));giftAction.hidden=false;giftAction.disabled=false;giftAction.textContent='Unwrap present';giftOpenedInDialog=false;dialog.showModal();}
  let giftOpenedInDialog=false,revealTimeout=null;
  giftAction.addEventListener('click',()=>{
    if(!modalDay)return;
    if(giftOpenedInDialog){
      const placedDay=modalDay;dialog.close();focusTree();inventorySelection='bauble-'+placedDay;renderInventory();
      toast('Tap anywhere in the room to place your game bauble');return;
    }
    giftOpenedInDialog=true;
    if(!state.opened.includes(modalDay))state.opened.push(modalDay);
    $('giftOpening').classList.add('opening');giftAction.disabled=true;
    $('giftDescription').textContent=`Day ${modalDay}'s bauble is going into your inventory. Place it on the tree to access its game once assigned.`;
    renderGifts();renderInventory();saveNow();
    const revealedDay=modalDay;
    revealTimeout=setTimeout(()=>{
      if(modalDay!==revealedDay||!dialog.open)return;
      giftAction.disabled=false;giftAction.textContent='Decorate your tree';
      $('giftDescription').textContent=`Place day ${revealedDay}'s game bauble anywhere in your room.`;
    },1250);
  });
  $('giftClose').addEventListener('click',()=>{clearTimeout(revealTimeout);dialog.close();});
  dialog.addEventListener('close',()=>{clearTimeout(revealTimeout);modalDay=null;giftOpenedInDialog=false;});

  const tutorial=[
    {heading:'Welcome to your Christmas home',body:'Before Advent begins, you can make this room your own. Let’s try placing your first decoration.'},
    {heading:'Decorate the room',body:'Choose a wreath, stocking or another decoration and place it anywhere you like.'},
    {heading:'Move things whenever you like',body:'Press and hold a decoration for half a second, then move it. Release your finger to leave it in its new place.'},
    {heading:'Keep an eye on the tree',body:'Your Christmas tree is waiting for its first bauble. Numbered presents arrive from 1 December. Open one, place its bauble on the tree, then tap the bauble to launch its game.'}
  ];
  let tutorialStep=0;
  function renderTutorial(){const item=tutorial[tutorialStep];$('tutorialTitle').textContent=item.heading;$('tutorialText').textContent=item.body;$('nextTutorial').textContent=tutorialStep===tutorial.length-1?'Try it now':tutorialStep===0?'Let’s decorate':'Next';$('tutorialProgress').replaceChildren();tutorial.forEach((_,i)=>{const n=document.createElement('i');if(i===tutorialStep)n.classList.add('active');$('tutorialProgress').append(n);});}
  const guide=$('guideBanner');
  function renderGuide(){
    guide.hidden=tutorialPhase===0;
    if(tutorialPhase===1){$('guideTitle').textContent='1 of 3 · Hang the wreath';$('guideMessage').textContent='The wreath is selected. Tap anywhere in the room to place it.';}
    else if(tutorialPhase===2){$('guideTitle').textContent='2 of 3 · Hang a stocking';$('guideMessage').textContent='The stocking is selected. Place it anywhere you like.';}
    else if(tutorialPhase===3){$('guideTitle').textContent='3 of 3 · Try rearranging';$('guideMessage').textContent='Press and hold one of your decorations, then drag and release it.';}
  }
  function finishTutorial(){tutorialPhase=0;guide.hidden=true;state.tutorialDone=true;saveNow();if($('tutorialDialog').open)$('tutorialDialog').close();toast('Your room is ready.');}
  function beginPractice(){
    $('tutorialDialog').close();tutorialPhase=1;inventorySelection='starter-wreath';renderInventory();renderGuide();
    positionCamera(240,385,Math.min(bounds().w/560,bounds().h/930));
  }
  function showTutorial(){tutorialStep=0;renderTutorial();$('tutorialDialog').showModal();}
  $('helpBtn').addEventListener('click',showTutorial);
  $('guideSkip').addEventListener('click',finishTutorial);
  $('nextTutorial').addEventListener('click',()=>{if(tutorialStep<tutorial.length-1){tutorialStep++;renderTutorial();}else beginPractice();});
  $('skipTutorial').addEventListener('click',finishTutorial);
  function updateFire(){const p=londonParts(),hr=p.hour;const phase=(hr>=23||hr<7)?'out':hr>=22?'embers':hr>=20?'soft':'full';fire.className='fire '+phase;fire.dataset.phase=phase;
    $('ukClock').textContent=`UK ${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}`;
  }
  let audio=null,crackleTimer=null;
  function crackle(){if(!audio||audio.state!=='running'||fire.dataset.phase==='out'||document.hidden)return;
    const duration=.045+Math.random()*.055,frames=Math.round(audio.sampleRate*duration),buffer=audio.createBuffer(1,frames,audio.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/frames,2);
    const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;gain.gain.value=(fire.dataset.phase==='embers'?.008:.018)*(.35+Math.random());source.connect(gain).connect(audio.destination);source.start();
  }
  $('soundBtn').addEventListener('click',async()=>{state.sound=!state.sound;saveSoon();if(state.sound){audio=audio||new (window.AudioContext||window.webkitAudioContext)();await audio.resume();clearInterval(crackleTimer);crackleTimer=setInterval(crackle,250+Math.random()*200);crackle();}else{clearInterval(crackleTimer);audio?.suspend();}renderSound();});
  function renderSound(){$('soundBtn').setAttribute('aria-pressed',String(state.sound));$('soundBtn').title=state.sound?'Mute fireplace':'Enable fireplace crackles';$('soundBtn').setAttribute('aria-label',state.sound?'Turn fireplace sounds off':'Turn fireplace sounds on');}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)audio?.suspend();else if(state.sound&&audio)audio.resume().catch(()=>{});});

  function renderGameShelf(){const list=$('gamesList');list.replaceChildren();for(const g of GAMES.filter(g=>TEST||Object.entries(DAY_GAMES).some(([day,id])=>id===g.id&&unlocked(Number(day))))){const link=document.createElement('a');link.className='game-card';link.href=GAME_ROOT+g.id+'/';link.innerHTML=`<span class="game-symbol">${g.icon}</span><span><strong>${g.title}</strong><small>${g.description}<br>Game copy · ${TEST?'test preview':'unlocked'}</small></span><span class="game-arrow">›</span>`;list.append(link);}}
  function showView(v){if(!['room','games','scores','settings'].includes(v))return;document.querySelectorAll('.nav-link').forEach(b=>{b.classList.toggle('active',b.dataset.view===v);if(b.dataset.view===v)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    $('roomView').hidden=v!=='room';$('gamesView').hidden=v!=='games';$('scoresView').hidden=v!=='scores';$('settingsView').hidden=v!=='settings';if(v==='room')requestAnimationFrame(focusTree);
  }
  document.querySelectorAll('.nav-link').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  $('resetPreview').addEventListener('click',()=>{if(!confirm('Reset the decorations and opened presents stored on this device?'))return;try{localStorage.removeItem(STORAGE_KEY);}catch(_){}location.reload();});
  renderGameShelf();renderPlaced();renderInventory();renderGifts();updateFire();setInterval(()=>{updateFire();renderGifts();},60000);renderSound();
  requestAnimationFrame(()=>{focusTree();if(!state.tutorialDone)setTimeout(showTutorial,450);});
  window.AdventRoomPreview=Object.freeze({GAMES,DAY_GAMES,unlocked,londonParts,focusTree,viewRoom,openGift,TEST});
})();
