import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/loaders/GLTFLoader.js';
import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/loaders/FBXLoader.js';
import {loadThreeAsset} from '../shared/asset-pool/gamebox-asset-pool.js';
import {LANES, PLAYER_Z, createRun, startRun, advance, steer, jump, duck, releaseDuck, togglePause} from './engine.mjs?v=7';

const $ = id => document.getElementById(id);
const canvas = $('world'), startBtn = $('startBtn');
const savedKey = 'gamebox.northPoleDash.best.v1';
let best = 0;
try { best = Math.max(0, Number(localStorage.getItem(savedKey)) || 0); } catch {}
$('startBest').textContent = best.toLocaleString('en-GB');

let renderer, scene, camera, clock, player, elfModel, mixer, currentRun = createRun();
let sound = true, audio, loaded = false, lastUi = 0, toastTimeout = 0;
const visuals = new Map(), snowTrees = [], groundStripes = [], decorations = [];
let snowField;
const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({color, roughness:0.78, metalness:0, ...opts});
const M = {
  snow:mat('#f1fbf8'), snowBlue:mat('#d7ebec'), icy:mat('#b8e9ef', {roughness:.24}),
  path:mat('#c4e4e8'), pale:mat('#eaf8f6'),
  red:mat('#dd4047'), darkRed:mat('#942c3e'), mint:mat('#13766a'), pine:mat('#196352'),
  green:mat('#238876'), gold:mat('#ffcd62',{metalness:.12,roughness:.36}),
  ribbon:mat('#fff2ce'), wood:mat('#825246'), night:mat('#225269'),
  window:mat('#ffe79a',{emissive:'#f8ad3c',emissiveIntensity:.65}), white:mat('#ffffff')
};
const geo = {
  box: new THREE.BoxGeometry(1,1,1),
  sphere: new THREE.SphereGeometry(1,12,9),
  cone: new THREE.ConeGeometry(1,1,8),
  cylinder: new THREE.CylinderGeometry(1,1,1,10),
  torus: new THREE.TorusGeometry(.3,.07,7,18)
};
function mesh(g,m,x=0,y=0,z=0, scale=1, parent=scene) {
  const o = new THREE.Mesh(g,m); o.position.set(x,y,z);
  if (Array.isArray(scale)) o.scale.set(...scale); else o.scale.setScalar(scale);
  o.castShadow=true; o.receiveShadow=true; parent.add(o);return o;
}
function box(parent,m,x,y,z,sx,sy,sz) {return mesh(geo.box,m,x,y,z,[sx,sy,sz],parent);}
function ball(parent,m,x,y,z,r=1) {return mesh(geo.sphere,m,x,y,z,r,parent);}
function cone(parent,m,x,y,z,r,h) {return mesh(geo.cone,m,x,y,z,[r,h,r],parent);}
function setup() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#9ad4ee');
  scene.fog = new THREE.FogExp2('#b9e1ef', .012);
  renderer = new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.48;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  clock = new THREE.Clock();
  camera = new THREE.PerspectiveCamera(63,1,.1,240);
  scene.add(new THREE.HemisphereLight('#d9f5ff','#9dbfa9',2.15));
  const sun = new THREE.DirectionalLight('#fff0d2',2.3);
  sun.position.set(-10,22,-22);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=34;sun.shadow.camera.bottom=-34;
  sun.shadow.camera.near=1;sun.shadow.camera.far=100;
  sun.shadow.bias=-.0006;scene.add(sun);
  const ground=mesh(new THREE.PlaneGeometry(160,320),M.snow,0,-.14,-30,1);
  ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  const path = mesh(new THREE.PlaneGeometry(9.35,310),M.path,0,-.105,-30,1);
  path.rotation.x=-Math.PI/2;path.castShadow=false;
  for(let i=0;i<40;i++)for(const x of [-1.5,1.5]){
    const stripe=mesh(new THREE.PlaneGeometry(.075,1.8),M.white,x,-.091,-105+i*7,1);
    stripe.rotation.x=-Math.PI/2;stripe.castShadow=false;groundStripes.push(stripe);
  }
  // Snow banks give the road a rounded, readable silhouette at mobile scale.
  for(const x of [-4.8,4.8]){
    const bank = mesh(new THREE.CylinderGeometry(.6,.6,310,10),M.snowBlue,x,-.12,-30);
    bank.rotation.x=Math.PI/2;
  }
  // Coloured mountain forms, distant buildings and warm lanterns create depth.
  for(let i=0;i<18;i++){
    const x=(i%2?1:-1)*(28+i%5*6), z=-155+Math.floor(i/2)*18;
    cone(scene,i%3?M.snowBlue:M.pale,x,7,z,12,18+i%4*5);
  }
  for(let i=0;i<12;i++){
    const z=-115+i*14;
    const side=i%2?1:-1;
    const cottage=makeCottage();
    cottage.position.set(side*(13+(i%3)*3),0,z);
    cottage.rotation.y=side*.14;scene.add(cottage);
    decorations.push(cottage);
  }
  for(let i=0;i<44;i++){
    const tree=makePine();
    const side=i%2?1:-1;
    tree.position.set(side*(6.5+(i*7%7)),0,-129+i*3.7);
    tree.rotation.y=(i*1.9)%6;
    tree.scale.setScalar(.8+(i%4)*.14);
    tree.userData.side=side;snowTrees.push(tree);scene.add(tree);
  }
  for(let i=0;i<30;i++){
    const z=-115+i*4.8;
    for(let side of [-1,1]){
      const post=makeCandyPost();
      post.position.set(side*5.2,0,z);
      scene.add(post);decorations.push(post);
    }
  }
  const snowPositions = new Float32Array(260*3);
  for(let i=0;i<260;i++){const n=i*3;snowPositions[n]=(Math.random()-.5)*48;snowPositions[n+1]=Math.random()*23;snowPositions[n+2]=-150+Math.random()*180;}
  const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(snowPositions,3));
  snowField=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:'#ffffff',size:.17,opacity:.85,transparent:true,depthWrite:false}));
  snowField.frustumCulled=false;scene.add(snowField);
  player=new THREE.Group();player.position.set(0,0,PLAYER_Z);scene.add(player);
  elfModel=makeFallbackElf();player.add(elfModel);
  resize();
  window.addEventListener('resize',resize);
}
function makePine() {
  const g=new THREE.Group();
  mesh(geo.cylinder,M.wood,0,1.15,0,[.2,2.3,.2],g);
  for(let j=0;j<3;j++)cone(g,j%2?M.green:M.pine,0,2.1+j*.8,0,1.5-j*.21,2.8-j*.25);
  for(let j=0;j<3;j++)cone(g,M.pale,0,2.43+j*.8,0,1.15-j*.15,.34);
  return g;
}
function makeCottage(){
  const g=new THREE.Group();
  box(g,M.darkRed,0,1.6,0,4.5,3.2,3.5);
  const roof=mesh(new THREE.ConeGeometry(3.7,2.1,4),M.pale,0,4.2,0,1,g);roof.rotation.y=Math.PI/4;
  box(g,M.wood,0,.93,1.79,1.15,1.85,.15);
  for(const x of [-1.4,1.4]){
    box(g,M.window,x,2,1.81,.85,.85,.11);
    box(g,M.ribbon,x,2,1.89,.08,.85,.08);
    box(g,M.ribbon,x,2,1.89,.85,.08,.08);
  }
  ball(g,M.gold,0,3.5,1.6,.2);
  return g;
}
function makeCandyPost(){
  const g=new THREE.Group();
  const pole=mesh(geo.cylinder,M.ribbon,0,1,0,[.11,2,.11],g);
  for(let i=0;i<5;i++){
    const stripe=mesh(geo.cylinder,M.red,0,.28+i*.38,0,[.119,.13,.119],g);
    stripe.rotation.z=Math.PI/6;
  }
  ball(g,M.gold,0,2.05,0,.19);
  return g;
}
function makeFallbackElf(){
  const g=new THREE.Group();
  box(g,M.red,0,1.55,0,1,.96,.53);
  cone(g,M.pine,0,2.65,0,.45,.95);
  ball(g,mat('#ffc99a'),0,2.25,.05,.38);
  cone(g,M.pine,-.32,.39,.02,.22,.72);
  cone(g,M.pine,.32,.39,.02,.22,.72);
  box(g,M.darkRed,-.23,1.09,0,.3,.68,.3);
  box(g,M.darkRed,.23,1.09,0,.3,.68,.3);
  box(g,M.green,-.72,1.6,0,.3,.73,.3);
  box(g,M.green,.72,1.6,0,.3,.73,.3);
  return g;
}
function makeGift(lane, elevated = false) {
  const g=new THREE.Group();
  const base=[M.red,M.mint,M.darkRed][lane]||M.red;
  box(g,base,0,.85,0,.89,.89,.89);
  box(g,M.ribbon,0,.85,.456,.18,.91,.03);
  box(g,M.ribbon,0,.85,.456,.91,.18,.035);
  box(g,M.gold,0,1.33,0,.98,.18,.98);
  const loop=mesh(geo.torus,M.ribbon,-.19,1.53,0,1,g);loop.rotation.y=Math.PI/2;
  const loop2=mesh(geo.torus,M.ribbon,.19,1.53,0,1,g);loop2.rotation.y=Math.PI/2;
  const halo=mesh(new THREE.RingGeometry(.65,.76,22),mat('#ffdb77',{emissive:'#e7aa24',emissiveIntensity:.6,transparent:true,opacity:.85}),0,.08,0,1,g);
  halo.rotation.x=-Math.PI/2;
  // Raised gift: its glow sits above the barricade rather than inside it.
  if(elevated)halo.position.y=.48;
  g.userData.spin=true;return g;
}
function makeCrate(){
  const g=new THREE.Group();
  box(g,M.wood,0,.58,0,1.9,1.12,1.12);
  for(const x of [-.65,.65])box(g,M.gold,x,.62,.59,.18,.86,.05);
  box(g,M.pale,0,1.15,0,2.05,.18,1.22);
  return g;
}
function makeSnowman(){
  const g=new THREE.Group();
  ball(g,M.pale,0,.83,0,.85);ball(g,M.white,0,1.9,0,.59);
  for(let i=0;i<3;i++)ball(g,M.night,0,.66+i*.33,.77,.075);
  ball(g,M.night,-.19,2.04,.48,.07);ball(g,M.night,.19,2.04,.48,.07);
  cone(g,M.gold,0,1.93,.61,.12,.39).rotation.x=Math.PI/2;
  box(g,M.red,0,1.5,.1,1.3,.17,.2);
  const hat=mesh(geo.cylinder,M.night,0,2.62,0,[.4,.63,.4],g);
  box(g,M.night,0,2.32,0,1.08,.12,1.06);
  return g;
}
function makeArch(){
  const g=new THREE.Group();
  for(const x of [-.86,.86])box(g,M.red,x,1.46,0,.19,2.92,.35);
  box(g,M.red,0,2.67,0,1.9,.38,.36);
  for(let i=-2;i<=2;i++)box(g,M.ribbon,i*.36,2.68,.2,.13,.4,.07);
  ball(g,M.gold,0,3.04,0,.29);
  return g;
}
function makeVisual(o) {
  const g = o.kind==='gift'?makeGift(o.lane,(o.height||0)>0):o.kind==='crate'?makeCrate():o.kind==='snowman'?makeSnowman():makeArch();
  g.position.set(LANES[o.lane],o.height||0,o.z);scene.add(g);visuals.set(o.id,g);
}
function clearVisuals(){for(const obj of visuals.values())scene.remove(obj);visuals.clear();}
function resize(){
  const w=canvas.clientWidth||window.innerWidth,h=canvas.clientHeight||window.innerHeight;
  renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.fov=w<h?68:53;camera.updateProjectionMatrix();
  camera.position.set(0,w<h?7.2:7.6,w<h?17.2:17.5);
  camera.lookAt(0,1.3,-20);
}
function getScore(){return currentRun.score.toLocaleString('en-GB');}
function refreshHUD(){
  $('score').textContent=String(currentRun.score).padStart(6,'0');
  $('gifts').textContent=currentRun.gifts;
  const metres=Math.floor(currentRun.distance);
  $('distance').textContent=String(metres).padStart(5,'0');
  const level=Math.min(10,1+Math.floor(metres/120));
  $('speedtag').textContent='NORTH POLE · LEVEL '+level;
  $('distanceFill').style.width=((metres%120)/120*100).toFixed(1)+'%';
}
function showToast(message){
  const t=$('toast');t.textContent=message;t.classList.add('show');
  window.clearTimeout(toastTimeout);toastTimeout=window.setTimeout(()=>t.classList.remove('show'),590);
}
function playTone(freq=660,duration=.09,type='triangle'){
  if(!sound)return;
  try {
    audio ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==='suspended')audio.resume();
    const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
    osc.type=type;osc.frequency.setValueAtTime(freq,now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(90,freq*.66),now+duration);
    gain.gain.setValueAtTime(.065,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+duration);
  }catch{}
}
function showOverlay(id) {
  for(const name of ['startOverlay','overOverlay','pauseOverlay'])$(name).classList.toggle('shown',name===id);
}
function begin(){
  currentRun=createRun();clearVisuals();startRun(currentRun);
  mixer?.stopAllAction();
  if(elfModel.userData.runnerClip&&mixer) mixer.clipAction(elfModel.userData.runnerClip).play();
  showOverlay(null);refreshHUD();clock.getDelta();playTone(720,.12);
}
function endRun(){
  const previous=best;const newBest=currentRun.score>best;
  if(newBest){best=currentRun.score;try{localStorage.setItem(savedKey,String(best));}catch{}}
  $('finalScore').textContent=getScore();
  $('finalDistance').textContent=Math.floor(currentRun.distance);
  $('finalGifts').textContent=currentRun.gifts;
  $('finalBest').textContent=best.toLocaleString('en-GB');
  $('startBest').textContent=best.toLocaleString('en-GB');
  $('newRecord').textContent=newBest?'NEW PERSONAL BEST!':('PERSONAL BEST: '+previous.toLocaleString('en-GB'));
  showOverlay('overOverlay');playTone(180,.35,'sawtooth');
  if(navigator.vibrate) navigator.vibrate([100,70,100]);
}
function pause(){
  if(currentRun.status==='running'){togglePause(currentRun);showOverlay('pauseOverlay');}
}
function resume(){if(currentRun.status==='paused'){togglePause(currentRun);showOverlay(null);clock.getDelta();}}
function action(name, held = false){
  if(currentRun.status!=='running')return;
  if(name==='left'||name==='right'){steer(currentRun,name==='left'?-1:1);playTone(220,.038);}
  if(name==='jump'&&jump(currentRun))playTone(480,.1);
  if(name==='slide'&&duck(currentRun,held))playTone(310,.08);
}
function inputs(){
  window.addEventListener('keydown',e=>{
    const actions={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump',ArrowDown:'slide',KeyS:'slide'};
    if(actions[e.code]){e.preventDefault();if(!e.repeat)action(actions[e.code],actions[e.code]==='slide');}
    else if(['Escape','KeyP'].includes(e.code)){e.preventDefault();currentRun.status==='paused'?resume():pause();}
    else if(e.code==='Enter'&&!e.repeat&&currentRun.status==='ready')begin();
  });
  window.addEventListener('keyup',e=>{if(e.code==='ArrowDown'||e.code==='KeyS')releaseDuck(currentRun);});
  // Mobile steering is entirely swipe-based. Never treat canvas taps as jumps
  // or vertical swipes as ducks: those actions belong to the corner buttons.
  // Match pointer IDs so a second finger pressing Jump/Duck cannot steer.
  let gesture=null;
  canvas.addEventListener('pointerdown',e=>{
    if(gesture || currentRun.status!=='running')return;
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY};
  },{passive:true});
  canvas.addEventListener('pointerup',e=>{
    if(!gesture || gesture.id!==e.pointerId)return;
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
    gesture=null;
    if(Math.abs(dx)>=32 && Math.abs(dx)>Math.abs(dy)*1.25)
      action(dx<0?'left':'right');
  },{passive:true});
  canvas.addEventListener('pointercancel',e=>{
    if(gesture?.id===e.pointerId)gesture=null;
  },{passive:true});
  let duckPointerId=null;
  for(const b of document.querySelectorAll('[data-action]')){
    b.addEventListener('pointerdown',e=>{
      e.preventDefault();
      if(b.dataset.action==='slide'){
        duckPointerId=e.pointerId;
        b.setPointerCapture?.(e.pointerId);
        action('slide',true);
      }else action(b.dataset.action);
    });
    if(b.dataset.action==='slide'){
      const release=e=>{
        if(e.pointerId!==duckPointerId)return;
        duckPointerId=null;releaseDuck(currentRun);
      };
      b.addEventListener('pointerup',release);
      b.addEventListener('pointercancel',release);
      b.addEventListener('lostpointercapture',release);
      window.addEventListener('pointerup',release);
    }
  }
  window.addEventListener('blur',()=>{duckPointerId=null;releaseDuck(currentRun);});
  $('pauseBtn').onclick=()=>currentRun.status==='paused'?resume():pause();
  $('resumeBtn').onclick=resume;$('startBtn').onclick=begin;$('retryBtn').onclick=begin;$('restartBtn').onclick=begin;
  $('soundBtn').onclick=()=>{sound=!sound;$('soundBtn').textContent='SOUND: '+(sound?'ON':'OFF');};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
}
async function loadModels(){
  // Reuse the already-committed CC0 3D elf and snow-covered Quaternius pines.
  try {
    const asset=await loadThreeAsset('quaternius:ultimate-animated-character:Elf',{GLTFLoader});
    const obj=asset.object;
    if(!obj)throw Error('Elf scene missing');
    let recolouredSkin = 0;
    obj.traverse(node=>{
      if(!node.isMesh)return;
      node.castShadow=true;node.receiveShadow=true;
      // Quaternius Elf.gltf defines Skin as [0.0134, 0.0134, 0.0134].
      // Keep the original animated mesh and correct just the faulty material.
      const recolour = original=>{
        if(original?.name?.trim().toLowerCase()!=='skin')return original;
        const corrected=original.clone();
        corrected.color.set('#eeb38e');
        corrected.roughness=0.92;
        corrected.needsUpdate=true;
        recolouredSkin++;
        return corrected;
      };
      node.material=Array.isArray(node.material)?node.material.map(recolour):recolour(node.material);
    });
    if(!recolouredSkin)console.warn('The imported elf did not expose its named Skin material');
    canvas.dataset.skinCorrected = String(recolouredSkin);
    const box3=new THREE.Box3().setFromObject(obj);
    const size=new THREE.Vector3();box3.getSize(size);
    if(size.y<.0001)throw Error('Elf model has no bounds');
    obj.scale.multiplyScalar(2.75/size.y);
    box3.setFromObject(obj);
    const center=new THREE.Vector3();box3.getCenter(center);
    obj.position.set(-center.x,-box3.min.y,-center.z);
    const holder=new THREE.Group();holder.add(obj);holder.rotation.y=Math.PI;
    player.remove(elfModel);elfModel=holder;player.add(elfModel);
    if(asset.animations?.length){
      mixer=new THREE.AnimationMixer(obj);
      const clip=asset.animations.find(c=>/run/i.test(c.name))
        ||asset.animations.find(c=>/walk/i.test(c.name))||asset.animations[0];
      elfModel.userData.runnerClip=clip;mixer.clipAction(clip).play();
    }
  }catch(err){console.warn('GameBox elf model unavailable; using a local fallback:',err);}
  // Replace initial trees in place only after successfully loading the original assets.
  const treeAssets=['quaternius:ultimate-nature:PineTree_Snow_2','quaternius:ultimate-nature:PineTree_Snow_4'];
  const results=await Promise.allSettled(treeAssets.map(id=>loadThreeAsset(id,{FBXLoader})));
  const sources=results.filter(r=>r.status==='fulfilled').map(r=>r.value.object);
  if(sources.length){
    snowTrees.forEach((old,i)=>{
      try {
        const source=sources[i%sources.length],newTree=source.clone(true);
        const bounds=new THREE.Box3().setFromObject(newTree),size=new THREE.Vector3();
        bounds.getSize(size);
        if(size.y<=.00001)return;
        const factor=5.3/size.y;newTree.scale.setScalar(factor);
        bounds.setFromObject(newTree);
        newTree.position.set(-bounds.min.x, -bounds.min.y, -bounds.min.z);
        newTree.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}});
        // Keeping a wrapper preserves each tree's game-relative position.
        const holder=new THREE.Group();
        holder.add(newTree);holder.position.copy(old.position);holder.rotation.copy(old.rotation);holder.scale.copy(old.scale);
        scene.remove(old);scene.add(holder);snowTrees[i]=holder;
      }catch(err){console.warn('Unable to instance snowy tree',err);}
    });
  }
  if(results.every(x=>x.status==='rejected'))console.warn('GameBox snowy tree files could not load; procedural snowy trees remain visible.');
}
function moveWorld(dt,travel){
  for(const s of groundStripes){s.position.z+=travel;if(s.position.z>20)s.position.z-=280;}
  for(const t of snowTrees){t.position.z+=travel;if(t.position.z>22)t.position.z-=160;}
  for(const d of decorations){d.position.z+=travel;if(d.position.z>22)d.position.z-=169;}
  if(snowField){
    const attribute=snowField.geometry.attributes.position,points=attribute.array;
    for(let i=0;i<points.length;i+=3){
      points[i+1]-=dt*.52;points[i+2]+=travel*.42;
      if(points[i+1]<0)points[i+1]=20+Math.random()*4;
      if(points[i+2]>20)points[i+2]=-150;
    }
    attribute.needsUpdate=true;
  }
}
function frame(){
  requestAnimationFrame(frame);
  // Advance with real elapsed time, not frame count. Substeps preserve
  // accurate metres and collision detection on slower WebGL/mobile devices.
  const dt=Math.min(clock.getDelta(),.25),running=currentRun.status==='running';
  if(running){
    const before=currentRun.distance;
    let remaining=dt,crashed=false;
    while(remaining>0.000001&&!crashed){
      const step=Math.min(remaining,1/50);
      remaining-=step;
      const events=advance(currentRun,step);
      for(const e of events){
        if(e.type==='gift'){playTone(750+(currentRun.gifts%4)*110,.095);if(currentRun.gifts%3===0)showToast('PRESENTS +75');}
        if(e.type==='crash'){crashed=true;break;}
      }
    }
    moveWorld(dt,currentRun.distance-before);
    if(crashed)endRun();
  }
  for(const obj of currentRun.objects){
    if(!visuals.has(obj.id))makeVisual(obj);
    const v=visuals.get(obj.id);
    v.position.z=obj.z;
    if(v.userData.spin)v.rotation.y+=dt*1.8;
  }
  for(const [id,visual] of visuals){
    if(!currentRun.objects.some(o=>o.id===id)){scene.remove(visual);visuals.delete(id);}
  }
  // Read-only lane state lets mobile browser smoke tests verify real swipes.
  canvas.dataset.lane=String(currentRun.lane);
  canvas.dataset.status=currentRun.status;
  const tx=LANES[currentRun.lane];
  player.position.x+=(tx-player.position.x)*Math.min(1,dt*12);
  player.position.y=currentRun.jumpY;
  // Recover to running posture promptly after the Duck button is released.
  if(currentRun.slide>.01){player.scale.y+=(.56-player.scale.y)*Math.min(1,dt*28);}
  else player.scale.y+=(1-player.scale.y)*Math.min(1,dt*28);
  const pose=currentRun.jumpY>0?'jump':currentRun.slide>.01?'duck':'run';
  if(canvas.dataset.pose!==pose)canvas.dataset.pose=pose;
  if(running){
    elfModel.rotation.z = (tx-player.position.x)*.048;
    if(!mixer)elfModel.position.y=Math.sin(currentRun.seconds*17)*.06;
    mixer?.update(dt);
  }
  camera.position.x+=(player.position.x*.46-camera.position.x)*Math.min(1,dt*5);
  camera.lookAt(camera.position.x*.3,1.25,-20);
  if(running||currentRun.status==='ready'){refreshHUD();lastUi=currentRun.seconds;}
  renderer.render(scene,camera);
}
async function boot(){
  try{
    setup();inputs();
    // Always show a complete playable scene, while model imports use the repo asset pool.
    await loadModels();loaded=true;
    startBtn.disabled=false;startBtn.textContent='START RUNNING';
    frame();
  }catch(err){
    console.error('North Pole Dash failed:',err);
    $('fatal').hidden=false;
    startBtn.textContent='GRAPHICS UNAVAILABLE';
  }
}
boot();
