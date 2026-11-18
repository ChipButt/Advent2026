import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { loadThreeAsset } from '../shared/asset-pool/gamebox-asset-pool.js';

const $=id=>document.getElementById(id);
const canvas=$('world'), map=$('map'), ctx=map.getContext('2d');
const clock=new THREE.Clock();
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.53;
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#abcdd7');
scene.fog=new THREE.FogExp2('#b8d4df',.016);
const camera=new THREE.PerspectiveCamera(65,1,.12,135);
scene.add(new THREE.HemisphereLight('#e9fbff','#84a6b0',2.05));
const sun=new THREE.DirectionalLight('#fff3d6',2.7);
sun.position.set(-15,28,-12);
sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-48;sun.shadow.camera.right=48;sun.shadow.camera.top=48;sun.shadow.camera.bottom=-48;
sun.shadow.camera.near=1;sun.shadow.camera.far=110;
sun.shadow.bias=-.0005;
scene.add(sun);
const mat=(color,props={})=>new THREE.MeshStandardMaterial({color,roughness:.82,metalness:0,...props});
const M={
snow:mat('#e8f4f6'),snowLight:mat('#fffdfa'),snowShade:mat('#b6d7e0'),
road:mat('#c4dfe5'),stone:mat('#768998'),stoneLight:mat('#afbfc4'),
wall:mat('#d6aa87'),brick:mat('#a95e62'),cream:mat('#f8ebd2'),
wood:mat('#6a4539'),woodDark:mat('#493738'),rooftop:mat('#8d4b51'),
blueRoof:mat('#385b79'),greenRoof:mat('#346654'),
red:mat('#bf343d'),green:mat('#267b64'),gold:mat('#f5c867',{metalness:.16}),
ribbon:mat('#fff3d2'),glass:mat('#ffdb83',{emissive:'#ecaa48',emissiveIntensity:.8,roughness:.38}),
iron:mat('#263e45'),pine:mat('#215b52'),mist:mat('#ceeaf1',{transparent:true,opacity:.32,depthWrite:false})
};
const geometries={box:new THREE.BoxGeometry(1,1,1),ball:new THREE.SphereGeometry(1,14,10),cone:new THREE.ConeGeometry(1,1,8),cylinder:new THREE.CylinderGeometry(1,1,1,12)};
const mesh=(parent,geo,m,x,y,z,sx=1,sy=sx,sz=sx)=>{
 const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);
 o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
};
const box=(p,m,x,y,z,sx,sy,sz)=>mesh(p,geometries.box,m,x,y,z,sx,sy,sz);
const ball=(p,m,x,y,z,r)=>mesh(p,geometries.ball,m,x,y,z,r);
const cone=(p,m,x,y,z,r,h)=>mesh(p,geometries.cone,m,x,y,z,r,h,r);
const cylinder=(p,m,x,y,z,r,h)=>mesh(p,geometries.cylinder,m,x,y,z,r,h,r);
const world=new THREE.Group();scene.add(world);
const buildings=[],treeSites=[],treeBlockers=[],giftSites=[
 [-25,-25],[-16,-26],[-7,-21],[8,-22],[23,-25],[27,-8],[24,8],[24,25],
 [10,22],[-6,25],[-23,24],[-27,8],[-25,-8],[-11,-9],[9,-9],[-11,7],[11,7],
 [-2,1],[18,-2],[-18,1]
];
const gifts=[],foes=[],sfx={},sparkles=[];
const ambientAnimals=[];
const translucentHouses=[];
let hero=null,ready=false,lookPointer=null,joyPointer=null,toastSecs=0,lastMap=0;
let canvasYaw=0,joyX=0,joyY=0,keySprint=false,touchSprint=false;
const keys=new Set();
const state={mode:'menu',time:240,elapsed:0,score:0,gifts:0,lives:3,stamina:100,
 invulnerable:0,jump:0,jumpVel:0,near:null,chase:false,hitTime:0,deathTime:0,chain:0,lastPickup:-50};
const bestKey='gamebox.christmasVillageGiftHunt.best.v1';
let best=0;
try{best=Math.max(0,Number(localStorage.getItem(bestKey))||0);}catch{}
$('best').textContent=best.toLocaleString('en-GB');
$('introBest').textContent=best.toLocaleString('en-GB');
function stamp(parent,text,x,y,z,wide=3){
 const c=document.createElement('canvas');c.width=512;c.height=128;
 const q=c.getContext('2d');q.fillStyle='#163b42';q.fillRect(0,0,512,128);
 q.strokeStyle='#d6b86d';q.lineWidth=9;q.strokeRect(5,5,502,118);
 q.fillStyle='#fff3ce';q.font='bold 53px Georgia';q.textAlign='center';q.fillText(text,256,82);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const o=mesh(parent,new THREE.PlaneGeometry(wide,wide/4),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}),x,y,z);
 o.castShadow=false;return o;
}
function buildCottage(x,z,variant=0,rot=0){
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;world.add(g);
 const wall=variant%3===0?M.wall:variant%3===1?M.brick:M.cream;
 const roof=variant%3===0?M.greenRoof:variant%3===1?M.rooftop:M.blueRoof;
 const width=7.8,depth=6.6;
 box(g,M.stone,0,.28,0,8.4,.56,7.1);
 box(g,wall,0,2.1,0,width,3.8,depth);
 for(const a of [-3.92,3.92])box(g,M.woodDark,a,2.14,0,.16,4,6.6);
 for(const b of [-3.34,3.34])box(g,M.woodDark,0,2.14,b,7.8,4,.13);
 for(const [xx,yy] of [[-2.1,2.35],[2.1,2.35]]){
  box(g,M.woodDark,xx,yy,3.34,1.4,1.65,.15);
  box(g,M.glass,xx,yy,3.44,1.15,1.37,.07);
  box(g,M.cream,xx,yy,3.52,.1,1.46,.09);
  box(g,M.cream,xx,yy,3.52,1.25,.09,.09);
  box(g,M.snowLight,xx,1.48,3.51,1.63,.17,.32);
 }
 box(g,M.woodDark,0,1.24,3.46,1.63,2.55,.22);
 box(g,M.wood,0,1.25,3.61,1.32,2.38,.04);
 ball(g,M.gold,.43,1.22,3.67,.09);
 const wreath=mesh(g,new THREE.TorusGeometry(.33,.1,8,16),M.pine,0,1.85,3.68);
 wreath.castShadow=false;
 for(let k=0;k<5;k++){
  const a=k*Math.PI*2/5;ball(g,k%2?M.red:M.gold,Math.sin(a)*.32,1.85+Math.cos(a)*.32,3.75,.075);
 }
 // Proper pitched double roof, snow shoulders, chimney, decorative gable trim.
 const incline=Math.atan2(2.3,4.45),len=Math.hypot(2.3,4.45);
 for(const sign of [-1,1]){
  const panel=box(g,roof,sign*2.1,5.12,0,len,.22,7.7);
  panel.rotation.z=-sign*incline;
  const cap=box(g,M.snowLight,sign*2.1,5.3,0,len,.23,7.87);
  cap.rotation.z=-sign*incline;
  for(const ez of [-3.82,3.82]){
   const trim=box(g,M.cream,sign*2.1,5.38,ez,len,.13,.12);
   trim.rotation.z=-sign*incline;
  }
 }
 box(g,M.woodDark,0,6.24,0,.27,.36,7.88);
 box(g,M.snowLight,0,6.49,0,.65,.15,8.12);
 box(g,M.brick,2.55,6.2,-1.8,.78,1.7,.75);
 box(g,M.snowLight,2.55,7.11,-1.8,1,.25,.95);
 for(let k=0;k<14;k++){
  const bx=-3.5+k*7/13;
  ball(g,[M.red,M.green,M.gold,M.glass][k%4],bx,3.98,3.64,.14);
 }
 const porch=box(g,M.wood,0,.2,4,2.45,.25,1.95);porch.castShadow=false;
 const snowbank=ball(g,M.snowShade,-3.5,.25,3.25,.6);
 snowbank.scale.y=.32;
 // Collide with actual walls, not roof or porch overhang.
  const turned=Math.abs(Math.sin(rot))>.7;
  const house={x,z,hx:turned?3.3:3.9,hz:turned?3.9:3.3,group:g,opacity:1,parts:[]};
  g.traverse(part=>{
   if(!part.isMesh)return;
   const unique=m=>{const c=m.clone();c.transparent=true;c.depthWrite=true;return c;};
   part.material=Array.isArray(part.material)?part.material.map(unique):unique(part.material);
   house.parts.push(part);
  });
  buildings.push(house);translucentHouses.push(house);
 return g;
}
function lamp(x,z){
 const g=new THREE.Group();g.position.set(x,0,z);world.add(g);
 cylinder(g,M.iron,0,1.55,0,.11,3.1);
 box(g,M.iron,0,3.15,0,.75,.18,.75);
 box(g,M.glass,0,3.49,0,.48,.64,.48);
 box(g,M.iron,0,3.85,0,.78,.12,.78);
 cone(g,M.snowLight,0,4.03,0,.52,.38);
 const light=new THREE.PointLight('#ffd091',2.0,7,2);
 light.position.y=3.4;g.add(light);
}
function snowSurface(){
 const plane=mesh(world,new THREE.PlaneGeometry(76,76),M.snow,0,-.07,0);plane.rotation.x=-Math.PI/2;plane.castShadow=false;
 const roads=[[0,0,8,69],[0,0,69,8],[-18,0,5,68],[18,0,5,68],[0,-18,70,5],[0,18,70,5]];
 for(const [x,z,w,d] of roads){
  const r=mesh(world,new THREE.PlaneGeometry(w,d),M.road,x,-.045,z);
  r.rotation.x=-Math.PI/2;r.castShadow=false;
 }
 const circle=mesh(world,new THREE.CircleGeometry(9,44),M.road,0,-.03,0);
 circle.rotation.x=-Math.PI/2;circle.castShadow=false;
 for(let i=0;i<75;i++){
  const x=(Math.sin(i*19.41)*.5+.5)*69-34.5,z=(Math.sin(i*37.73)*.5+.5)*69-34.5;
  if(Math.abs(x)<3.5||Math.abs(z)<3.5)continue;
  const bank=ball(world,i%3===0?M.snowLight:M.snowShade,x,.08,z,.4+(i%5)*.12);
  bank.scale.y=.2;bank.castShadow=false;
 }
 // Village square's dressed Christmas tree uses genuine snow-covered Quaternius tree models below.
 cylinder(world,M.stone,0,.32,0,2.05,.64);
 cylinder(world,M.stoneLight,0,.66,0,1.88,.1);
 for(const pos of [[-11,10],[11,10],[-11,-10],[11,-10],[-27,19],[27,19],[-27,-18],[27,-18]])lamp(...pos);
 [[-16,-16],[-16,16],[16,-16],[16,16],[-28,0],[28,0],[0,-28]].forEach((p,i)=>{
  const rotation=i<4?(p[1]<0?0:Math.PI):i===4?Math.PI/2:i===5?-Math.PI/2:0;
  buildCottage(p[0],p[1],i,rotation);
 });
 for(const [x,z] of [[-28,-28],[28,-28],[-28,28],[28,28],[0,31],[-7,0],[7,0]]){
  const g=new THREE.Group();g.position.set(x,0,z);world.add(g);
  cylinder(g,M.wood,0,.3,0,.55,.6);
  ball(g,M.snowLight,0,.65,0,.5).scale.y=.3;
 }
 stamp(world,'NORTH POLE',0,2.55,-31,5.4);
 for(let i=0;i<25;i++){
  const a=(i*61.7)% (Math.PI*2),dist=23+i%4*2.1,x=Math.cos(a)*dist,z=Math.sin(a)*dist;
  if(!buildings.some(b=>Math.abs(x-b.x)<b.hx+3&&Math.abs(z-b.z)<b.hz+3))treeSites.push([x,z,i%2?1:2]);
 }
 treeSites.push([0,0,1],[-5,12,1],[5,12,2],[-5,-12,2],[5,-12,1]);
}
// Christmas street dressing: snow families, lantern arches and overhead
// garlands. All posts are collidable and the arch remains walkable.
function populateChristmasScenery(){
 for(const [x,z] of [[-3,16],[5,-16],[-30,25],[30,27]]){
  const g=new THREE.Group();g.position.set(x,0,z);world.add(g);
  ball(g,M.snowLight,0,.69,0,.67);
  ball(g,M.snowLight,0,1.61,0,.47);
  for(const eye of [-.16,.16])ball(g,M.iron,eye,1.74,.43,.065);
  const nose=cone(g,M.gold,0,1.57,.51,.12,.42);nose.rotation.x=Math.PI/2;
  for(let i=0;i<3;i++)ball(g,M.iron,0,.58+i*.33,.61,.062);
  cylinder(g,M.iron,0,2.13,0,.35,.43);
  cylinder(g,M.iron,0,1.95,0,.58,.09);
  box(g,M.red,0,1.28,0,1.05,.17,.2);
  for(const side of [-1,1]){
   const twig=cylinder(g,M.wood,side*.65,1.25,0,.067,.95);
   twig.rotation.z=side*.88;
  }
  treeBlockers.push({x,z,radius:.55});
 }
 // A gateway in an open street, with clearance for sprinting underneath.
 for(const x of [-2.75,2.75]){
  cylinder(world,M.cream,x,1.72,-9,.22,3.44);
  for(let y=.4;y<3.4;y+=.48)cylinder(world,M.red,x,y,-9,.25,.12);
  ball(world,M.gold,x,3.53,-9,.31);
  treeBlockers.push({x,z:-9,radius:.25});
 }
 box(world,M.red,0,3.37,-9,5.65,.25,.35);
 for(let i=0;i<11;i++)ball(world,i%2?M.gold:M.glass,-2.5+i*.5,3.37,-8.76,.10);
 stamp(world,'GIFT HUNT',0,4.12,-9,3.0);
 // Festive strands drawn at real height, without blocking walking routes.
 for(const z of [-22,-5,12,28]){
  const cable=box(world,M.iron,0,6.55,z,50,.024,.024);
  cable.castShadow=false;
  for(let i=0;i<26;i++){
   const x=-25+i*2,y=6.52-Math.sin(i*Math.PI/25)*.3;
   const bulb=ball(world,[M.red,M.green,M.gold,M.glass][i%4],x,y,z,.135);
   bulb.castShadow=false;
  }
 }
}
snowSurface();
populateChristmasScenery();
const snowGeo=new THREE.BufferGeometry();
const snowP=new Float32Array(350*3);
for(let i=0;i<350;i++){
 snowP[i*3]=(Math.random()-.5)*76;
 snowP[i*3+1]=Math.random()*19;
 snowP[i*3+2]=(Math.random()-.5)*76;
}
snowGeo.setAttribute('position',new THREE.BufferAttribute(snowP,3));
const snowfall=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:0xffffff,size:.15,transparent:true,opacity:.83,depthWrite:false}));
scene.add(snowfall);
function normalized(asset,height){
 const root=asset.object;
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 let bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
 if(size.y<.001)throw Error('Artwork has no visible geometry');
 root.scale.multiplyScalar(height/size.y);
 bounds=new THREE.Box3().setFromObject(root);
 root.position.set(-(bounds.max.x+bounds.min.x)*.5,-bounds.min.y,-(bounds.max.z+bounds.min.z)*.5);
 return root;
}
function playAnim(actor,mode){
 if(!actor.mixer)return;
 if(actor.playing===mode)return;
 const a=actor.assetAnimations;
 const patterns=mode==='run'?[/run/i,/walk/i]:
  mode==='jump'?[/jump/i,/run/i]:
  mode==='attack'?[/attack/i,/punch/i,/slash/i,/strike/i,/run/i]:
  mode==='hit'?[/hit/i,/hurt/i,/damage/i,/idle/i]:
  mode==='death'?[/death/i,/die/i,/dying/i,/fall/i,/idle/i]:
  [/idle/i,/stand/i,/walk/i];
 const target=patterns.map(p=>a.find(c=>p.test(c.name))).find(Boolean)||a[0];
 if(!target)return;
 if(actor.action)actor.action.fadeOut(.17);
 actor.action=actor.mixer.clipAction(target);actor.action.reset();
 actor.action.setLoop(mode==='attack'||mode==='death'?THREE.LoopOnce:THREE.LoopRepeat,mode==='attack'||mode==='death'?1:Infinity);
 actor.action.clampWhenFinished=mode==='death';
 actor.action.fadeIn(.17).play();
 actor.playing=mode;
}
async function loadActor(kind,x,z,height=2.15){
 const a=await loadThreeAsset('quaternius:ultimate-animated-character:'+kind,{GLTFLoader});
 const asset=normalized(a,height);
 // Keep Quaternius' real elf mesh, skeleton and animations; recolour costume materials.
  if(kind==='Elf')asset.traverse(n=>{
   if(!n.isMesh)return;
   const festive=m=>{
    const c=m.clone(),name=(m.name+' '+n.name).toLowerCase();
    if(/skin|face|hair|eye|nose|mouth|ear/.test(name)){
     if(/skin/.test(name))c.color.set('#efb990');return c;
    }
    if(/boot|shoe|belt|leather/.test(name)){c.color.set('#49362f');c.map=null;}
    else if(/trim|fur|white|wool/.test(name)){c.color.set('#fff4e0');c.map=null;}
    else if(/hat|tunic|jacket|robe|shirt|coat|cloth|fabric|outfit|body/.test(name)){
     c.color.set(/hat|sleeve|trouser|pant/.test(name)?'#176247':'#be2f3b');c.map=null;
    }else if(m.color){
     const {r,g,b}=m.color;
     if(b>r*1.2&&b>g*1.06&&b>.21){c.color.set('#be3040');c.map=null;}
     else if(g>r*1.12&&g>b*.88&&g>.16){c.color.set('#1b6547');c.map=null;}
    }
    c.needsUpdate=true;return c;
   };
   n.material=Array.isArray(n.material)?n.material.map(festive):festive(n.material);
  });
  // Repair a known incorrectly dark material in the original elf asset.
 if(kind==='Elf')asset.traverse(n=>{
  if(!n.isMesh)return;
  const repair=m=>{
   if(m?.name?.trim().toLowerCase()!=='skin')return m;
   const c=m.clone();c.color.set('#eeb38e');c.needsUpdate=true;return c;
  };
  n.material=Array.isArray(n.material)?n.material.map(repair):repair(n.material);
 });
 const group=new THREE.Group();group.position.set(x,0,z);
 const face=new THREE.Group();face.rotation.y=Math.PI;face.add(asset);group.add(face);scene.add(group);
 const mixer=a.animations.length?new THREE.AnimationMixer(asset):null;
 const result={kind,group,face,mixer,assetAnimations:a.animations,playing:'',action:null};
 playAnim(result,'idle');
 return result;
}
async function populateTrees(){
 const types=await Promise.all(['PineTree_Snow_2','PineTree_Snow_4'].map(n=>loadThreeAsset('quaternius:ultimate-nature:'+n,{FBXLoader})));
 const templates=types.map((a,i)=>normalized(a,4.1+i*.45));
 for(const [x,z,k] of treeSites){
   treeBlockers.push({x,z,radius:k===1?.8:.95});
  const tree=templates[k-1].clone(true);
  tree.position.set(x,tree.position.y,z);
  tree.scale.multiplyScalar(.78+(Math.abs(x*7+z*11)%5)*.07);
  tree.rotation.y=(x*4+z*3)%6.28;
  tree.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  scene.add(tree);
 }
 // Brighter central village tree: real model plus individual bauble/lamp artwork.
 const center=templates[0].clone(true);
  treeBlockers.push({x:0,z:0,radius:1.65});
 center.position.set(0,center.position.y,0);center.scale.multiplyScalar(2.05);
 scene.add(center);
 for(let i=0;i<32;i++){
  const height=1.0+(i%7)*.59,angle=i*2.4,radius=(4.3-height*.58)*.56;
  const bx=Math.sin(angle)*radius,bz=Math.cos(angle)*radius;
  ball(world,[M.red,M.gold,M.glass,M.green][i%4],bx,height,bz,.105);
 }
 const star=mesh(world,new THREE.OctahedronGeometry(.58),M.gold,0,9.1,0);
 star.rotation.z=.3;
}
function pickupSparkles(x,z){
 for(let k=0;k<10;k++){
  const angle=k*Math.PI*2/10;
  const o=ball(scene,k%3?M.gold:M.snowLight,x,.7,z,.08);
  o.castShadow=false;
  sparkles.push({o,x,z,angle,time:0});
 }
}
function makeGift(i){
 const g=new THREE.Group(),hues=[M.red,M.green,M.blueRoof,M.rooftop];
 const body=i%5===0?M.gold:hues[i%hues.length];
 box(g,body,0,.55,0,1.05,.86,.91);
 box(g,M.ribbon,0,.58,.48,.22,.94,.07);
 box(g,M.ribbon,0,.58,-.48,.22,.94,.07);
 box(g,M.ribbon,.56,.58,0,.07,.94,.2);
 box(g,M.ribbon,-.56,.58,0,.07,.94,.2);
 box(g,M.gold,0,1.02,0,1.16,.18,1.02);
 box(g,M.ribbon,0,1.12,0,.2,.08,1.02);
 box(g,M.ribbon,0,1.12,0,1.16,.08,.2);
 for(const side of [-1,1]){
  const loop=mesh(g,new THREE.TorusGeometry(.18,.065,9,16),M.ribbon,side*.18,1.25,0);
  loop.rotation.y=Math.PI/2;
 }
 const halo=mesh(g,new THREE.RingGeometry(.75,.86,32),new THREE.MeshBasicMaterial({color:'#ffe5a2',transparent:true,opacity:.72,side:THREE.DoubleSide}),0,.06,0);
 halo.rotation.x=-Math.PI/2;halo.castShadow=false;
 g.userData.halo=halo;
 if(i%5===0){
  const beacon=mesh(g,new THREE.CylinderGeometry(.08,.56,2.6,10,1,true),
   new THREE.MeshBasicMaterial({color:'#ffecaa',transparent:true,opacity:.19,depthWrite:false,side:THREE.DoubleSide}),0,1.83,0);
  beacon.castShadow=false;
 }
 return g;
}
function canWalk(x,z,r=.38){
 if(x<-33+r||x>33-r||z<-33+r||z>33-r)return false;
 for(const b of buildings){
  const dx=Math.max(Math.abs(x-b.x)-b.hx,0);
  const dz=Math.max(Math.abs(z-b.z)-b.hz,0);
  if(dx*dx+dz*dz<r*r)return false;
  if(Math.abs(x-b.x)<b.hx&&Math.abs(z-b.z)<b.hz)return false;
 }
 for(const t of treeBlockers){
  const dx=x-t.x,dz=z-t.z;
  if(dx*dx+dz*dz<(t.radius+r)*(t.radius+r))return false;
 }
 return true;
}
function activateGift(item){
 const choices=giftSites.filter(([x,z])=>canWalk(x,z,1.1)&&
  !gifts.some(g=>g!==item&&g.active&&Math.hypot(g.x-x,g.z-z)<3.6)&&
  (!hero||Math.hypot(hero.group.position.x-x,hero.group.position.z-z)>3.6));
 if(!choices.length)return;
 const index=Math.floor(Math.random()*choices.length);
 const site=choices[index];
 item.x=site[0];item.z=site[1];item.active=true;item.respawnAt=0;
 item.group.position.set(item.x,0,item.z);
 item.group.visible=true;
}
function setUpGifts(){
 for(let i=0;i<9;i++){
  const g=makeGift(i);scene.add(g);
  const gift={group:g,x:0,z:0,active:false,respawnAt:0,i};
  gifts.push(gift);
 }
 gifts.forEach(activateGift);
}
function nearGift(){
 if(!hero)return null;
 let found=null,dist=2.2;
 for(const g of gifts)if(g.active){
  const d=Math.hypot(g.x-hero.group.position.x,g.z-hero.group.position.z);
  if(d<dist){dist=d;found=g;}
 }
 return found;
}
function toast(str,duration=1.6){
 $('toast').textContent=str;$('toast').classList.add('visible');toastSecs=duration;
}
function updateHud(){
 $('timer').textContent=Math.floor(state.time/60)+':'+String(Math.ceil(state.time%60)).padStart(2,'0');
 $('gifts').textContent=state.gifts;
 $('score').textContent=state.score.toLocaleString('en-GB');
 $('hearts').textContent='♥'.repeat(state.lives)+'♡'.repeat(3-state.lives);
 $('staminaFill').style.width=state.stamina.toFixed(1)+'%';
 $('staminaFill').style.background=state.stamina<20?'#cb565b':'#bce9db';
}
function collect(g=state.near){
 if(!g||!g.active||state.mode!=='running')return;
 if(Math.hypot(g.x-hero.group.position.x,g.z-hero.group.position.z)>2.45)return;
 g.active=false;g.group.visible=false;g.respawnAt=state.elapsed+5+Math.random()*5;
 state.chain=state.elapsed-state.lastPickup<19?Math.min(state.chain+1,5):1;
 state.lastPickup=state.elapsed;
 state.gifts++;
 const chase=state.chase?15:0,streak=(state.chain-1)*10,rare=g.i%5===0?45:0;
 const earned=60+chase+streak+rare;
 state.score+=earned;pickupSparkles(g.x,g.z);
 toast((rare?'GOLDEN GIFT! ':'PRESENT SAVED! ')+(state.chain>1?' ×'+state.chain+' STREAK':'')+' +'+earned,1.35);
 $('combo').textContent=state.chain>1?'STREAK ×'+state.chain+' · KEEP COLLECTING!':'SAVE THE PRESENTS';
 if(navigator.vibrate)navigator.vibrate(32);
 updateHud();
}
function finishRun(reason){
 state.mode='ended';
 $('endTitle').textContent=reason==='caught'?'THE MONSTERS GOT YOU':'THE BELLS HAVE RUNG';
 $('endDetail').textContent=reason==='caught'?'Your elf fell defending the village.':'Four minutes of festive mayhem!';
 $('finalScore').textContent=state.score.toLocaleString('en-GB');
 $('finalGifts').textContent=state.gifts;
 if(state.score>best){
  best=state.score;try{localStorage.setItem(bestKey,String(best));}catch{}
  $('newBest').textContent='NEW PERSONAL BEST';
 }else $('newBest').textContent='PERSONAL BEST: '+best.toLocaleString('en-GB');
 $('best').textContent=best.toLocaleString('en-GB');
 $('introBest').textContent=best.toLocaleString('en-GB');
 $('endOverlay').classList.remove('hidden');
}
function endRun(reason){
 if(state.mode==='ended'||state.mode==='dying')return;
 if(reason==='caught'){
  state.mode='dying';state.deathTime=0;
  hero.face.rotation.z=0;hero.face.position.y=0;
  playAnim(hero,'death');
  toast('THE ELF HAS FALLEN!',1.4);
  return;
 }
 finishRun(reason);
}
function resetRun(){
 state.mode='running';state.time=240;state.elapsed=0;state.score=0;state.gifts=0;state.lives=3;
 state.stamina=100;state.invulnerable=0;state.jump=0;state.jumpVel=0;
 state.near=null;state.chase=false;state.hitTime=0;state.deathTime=0;state.chain=0;state.lastPickup=-50;
 $('combo').textContent='SAVE THE PRESENTS';
 hero.face.rotation.z=0;hero.face.rotation.x=0;hero.face.position.set(0,0,0);
 hero.playing='';playAnim(hero,'idle');
 hero.group.position.set(0,0,23);
 hero.group.rotation.y=0;canvasYaw=0;
 foes.forEach((f,i)=>{
  const sites=[[-25,-17],[25,-17],[-26,15],[26,17]];
  f.group.position.set(sites[i][0],0,sites[i][1]);
  f.patrol=i;f.path=[];f.pathTimer=0;f.chasing=false;f.lost=0;
   f.cooldown=0;f.attackTime=0;f.attackElapsed=0;f.didStrike=false;
   f.face.rotation.x=0;f.face.rotation.z=0;f.face.position.set(0,0,0);
   if(f.swipe)f.swipe.visible=false;
   f.playing='';playAnim(f,'idle');
 });
 gifts.forEach(g=>{g.active=false;g.group.visible=false;});gifts.forEach(activateGift);
 $('startOverlay').classList.add('hidden');$('pauseOverlay').classList.add('hidden');$('endOverlay').classList.add('hidden');
 updateHud();clock.getDelta();
}
function pause(){
 if(state.mode!=='running')return;
 state.mode='paused';$('pauseOverlay').classList.remove('hidden');
}
function resume(){
 if(state.mode!=='paused')return;
 state.mode='running';$('pauseOverlay').classList.add('hidden');clock.getDelta();
}
function togglePause(){
 if(state.mode==='running')pause();else if(state.mode==='paused')resume();
}
const CELL=2,GRID=33;
function gridPos(x){return Math.min(GRID-1,Math.max(0,Math.round((x+32)/CELL)));}
function gridWorld(i){return i*CELL-32;}
function findRoute(ax,az,bx,bz){
 const start=gridPos(ax)+gridPos(az)*GRID,end=gridPos(bx)+gridPos(bz)*GRID;
 if(start===end)return [[bx,bz]];
 const prev=new Int32Array(GRID*GRID);prev.fill(-1);
 const seen=new Uint8Array(GRID*GRID),q=new Int32Array(GRID*GRID);
 let front=0,back=0;q[back++]=start;seen[start]=1;
 while(front<back){
  const here=q[front++];if(here===end)break;
  const gx=here%GRID,gz=Math.floor(here/GRID);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=gx+dx,nz=gz+dz,ni=nx+nz*GRID;
   if(nx<0||nz<0||nx>=GRID||nz>=GRID||seen[ni]||!canWalk(gridWorld(nx),gridWorld(nz),.65))continue;
   seen[ni]=1;prev[ni]=here;q[back++]=ni;
  }
 }
 if(!seen[end])return [[bx,bz]];
 const result=[];let index=end;
 while(index!==start&&result.length<110){
  result.push([gridWorld(index%GRID),gridWorld(Math.floor(index/GRID))]);index=prev[index];
  if(index<0)break;
 }
 result.reverse();result.push([bx,bz]);return result;
}
function damageHero(f){
 if(state.mode!=='running'||state.invulnerable>0)return;
 const p=hero.group.position,q=f.group.position;
 const distance=Math.hypot(p.x-q.x,p.z-q.z);
 if(distance>2.12)return; // attacks can miss if the player escaped the swipe
 state.invulnerable=2.3;state.hitTime=.58;state.lives--;
 const nx=(p.x-q.x)/Math.max(distance,.001),nz=(p.z-q.z)/Math.max(distance,.001);
 const bx=p.x+nx*2.2,bz=p.z+nz*2.2;
 if(canWalk(bx,bz))p.set(bx,p.y,bz);
 playAnim(hero,'hit');
 if(navigator.vibrate)navigator.vibrate([110,60,125]);
 if(state.lives<=0){endRun('caught');return;}
 toast('MONSTER ATTACK! '+state.lives+' HEART'+(state.lives===1?'':'S')+' LEFT',1.6);
}
function updateFoes(dt){
 if(!hero)return;
 let nearest=99,anyChase=false;
 const px=hero.group.position.x,pz=hero.group.position.z;
 for(const f of foes){
  const x=f.group.position.x,z=f.group.position.z;
  const d=Math.hypot(px-x,pz-z);
  nearest=Math.min(nearest,d);
  if(d<13.3){f.chasing=true;f.lost=0;}
  else if(f.chasing){f.lost+=dt;if(f.lost>4.5&&d>19)f.chasing=false;}
  if(f.chasing)anyChase=true;
  f.cooldown=Math.max(0,(f.cooldown||0)-dt);
  const patrol=[[24,-26],[24,24],[-24,24],[-24,-26],[0,-18],[0,18]];
  const current=patrol[f.patrol%patrol.length];
  const target=f.chasing?[px,pz]:current;
  if(!f.chasing&&Math.hypot(current[0]-x,current[1]-z)<2.3)f.patrol=(f.patrol+1+f.index)%patrol.length;
  if(!f.attackTime&&d<2.02&&f.cooldown<=0){
   f.attackTime=.67;f.attackElapsed=0;f.didStrike=false;f.cooldown=2.1;
  }
  if(f.attackTime>0){
   f.attackElapsed+=dt;f.attackTime=Math.max(0,f.attackTime-dt);
   const progress=Math.min(1,f.attackElapsed/.67),lunge=Math.sin(Math.PI*progress);
   f.face.position.z=-lunge*.65;
   f.face.rotation.x=-lunge*.36;
   f.face.rotation.z=Math.sin(progress*Math.PI*2)*.12;
   if(f.swipe){
    f.swipe.visible=progress>.28&&progress<.77;
    f.swipe.rotation.z=-1.2+progress*2.8;
    f.swipe.material.opacity=Math.max(0,1-Math.abs(progress-.5)*3);
   }
   if(!f.didStrike&&f.attackElapsed>=.33){
    f.didStrike=true;damageHero(f);
   }
   if(f.attackTime===0){
    f.face.position.z=0;f.face.rotation.x=0;f.face.rotation.z=0;
    if(f.swipe)f.swipe.visible=false;
   }
  }else{
   f.pathTimer-=dt;
   if(f.pathTimer<=0||!f.path.length){
    f.path=findRoute(x,z,target[0],target[1]);f.pathTimer=f.chasing?.53:1.8;
   }
   while(f.path.length&&Math.hypot(f.path[0][0]-x,f.path[0][1]-z)<.7)f.path.shift();
   const to=f.path[0]||target,dx=to[0]-x,dz=to[1]-z,len=Math.hypot(dx,dz);
   if(len>.08){
    const speed=f.chasing?Math.min(4.55,3.1+state.elapsed/130):1.75;
    const stepx=dx/len*speed*dt,stepz=dz/len*speed*dt;
    if(canWalk(x+stepx,z,.52))f.group.position.x+=stepx;
    if(canWalk(f.group.position.x,z+stepz,.52))f.group.position.z+=stepz;
    const angle=Math.atan2(-stepx,-stepz);
    f.group.rotation.y+=Math.atan2(Math.sin(angle-f.group.rotation.y),Math.cos(angle-f.group.rotation.y))*Math.min(1,dt*8);
   }
  }
  playAnim(f,f.attackTime>0?'attack':'run');
  f.mixer?.update(dt*(f.chasing?1.13:.7));
 }
 state.chase=anyChase;
 $('danger').classList.toggle('visible',nearest<9);
 $('danger').textContent=nearest<4.8?'MONSTER RIGHT BEHIND YOU':nearest<9?'A MONSTER IS CLOSE':'';
 $('vignette').classList.toggle('hurt',state.hitTime>0);
}
// Sightline cutaway: keep the player and chasing creatures visible through cottages.
function crossesHouse(a,b,h){
 const dx=b.x-a.x,dz=b.z-a.z;
 let low=0,high=1;
 for(const [start,d,min,max] of [[a.x,dx,h.x-h.hx-.12,h.x+h.hx+.12],[a.z,dz,h.z-h.hz-.12,h.z+h.hz+.12]]){
  if(Math.abs(d)<.0001){if(start<min||start>max)return false;continue;}
  const t1=(min-start)/d,t2=(max-start)/d;
  low=Math.max(low,Math.min(t1,t2));high=Math.min(high,Math.max(t1,t2));
  if(low>high)return false;
 }
 return low<=1&&high>=0;
}
function updateVisibility(dt){
 if(!hero)return;
 const eye={x:camera.position.x,z:camera.position.z};
 const player={x:hero.group.position.x,z:hero.group.position.z};
 for(const h of translucentHouses){
  let occludes=crossesHouse(eye,player,h);
  if(!occludes)for(const foe of foes){
   const point={x:foe.group.position.x,z:foe.group.position.z};
   if(Math.hypot(point.x-player.x,point.z-player.z)<13&&crossesHouse(eye,point,h)){occludes=true;break;}
  }
  const target=occludes?.17:1;
  const next=h.opacity+(target-h.opacity)*Math.min(1,dt*12);
  if(Math.abs(next-h.opacity)<.001)continue;
  h.opacity=next;
  for(const part of h.parts){
   for(const m of (Array.isArray(part.material)?part.material:[part.material])){
    m.opacity=next;m.depthWrite=next>.97;
   }
   part.castShadow=next>.7;
  }
 }
}
function drawMap(){
 const w=map.width,h=map.height,X=x=>(x+34)/68*w,Z=z=>(z+34)/68*h;
 ctx.clearRect(0,0,w,h);
 ctx.fillStyle='#d8e9e8';ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#bdd7d7';
 ctx.fillRect(X(-4),0,X(4)-X(-4),h);
 ctx.fillRect(0,Z(-4),w,Z(4)-Z(-4));
 ctx.fillStyle='#9a6c65';for(const b of buildings)ctx.fillRect(X(b.x-b.hx),Z(b.z-b.hz),b.hx*2/68*w,b.hz*2/68*h);
 ctx.fillStyle='#397a65';for(const t of treeSites){ctx.beginPath();ctx.arc(X(t[0]),Z(t[1]),2.2,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle='#d6a344';for(const g of gifts)if(g.active){ctx.beginPath();ctx.arc(X(g.x),Z(g.z),3.2,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle='#ad3748';for(const f of foes){ctx.beginPath();ctx.arc(X(f.group.position.x),Z(f.group.position.z),3.6,0,Math.PI*2);ctx.fill();}
 if(hero){
  ctx.save();ctx.translate(X(hero.group.position.x),Z(hero.group.position.z));ctx.rotate(canvasYaw);
  ctx.fillStyle='#173f59';ctx.strokeStyle='#ffffff';ctx.lineWidth=1.8;
  ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(-5,5);ctx.lineTo(5,5);ctx.closePath();
  ctx.fill();ctx.stroke();ctx.restore();
 }
}
function resize(){
 const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?71:57;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();
function joyMove(e){
 const r=$('joystick').getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
 const len=Math.hypot(dx,dy),f=Math.min(1,40/Math.max(1,len));
 joyX=dx*f/40;joyY=-dy*f/40;
 $('knob').style.transform='translate('+joyX*40+'px,'+-joyY*40+'px)';
}
$('joystick').addEventListener('pointerdown',e=>{
 joyPointer=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);joyMove(e);e.preventDefault();
});
$('joystick').addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)joyMove(e);});
function releaseJoy(e){
 if(e.pointerId!==joyPointer)return;
 joyPointer=null;joyX=joyY=0;$('knob').style.transform='translate(0,0)';
}
$('joystick').addEventListener('pointerup',releaseJoy);
$('joystick').addEventListener('pointercancel',releaseJoy);
let lastLook=0;
canvas.addEventListener('pointerdown',e=>{
 if(state.mode!=='running')return;
 lookPointer=e.pointerId;lastLook=e.clientX;canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
 if(e.pointerId!==lookPointer)return;
 canvasYaw-=(e.clientX-lastLook)/Math.max(canvas.clientWidth,350)*3.8;
 lastLook=e.clientX;
});
canvas.addEventListener('pointerup',e=>{if(e.pointerId===lookPointer)lookPointer=null;});
canvas.addEventListener('pointercancel',e=>{if(e.pointerId===lookPointer)lookPointer=null;});
$('takeBtn').addEventListener('click',()=>collect(nearGift()));
$('jumpBtn').addEventListener('click',()=>jump());
const runBtn=$('runBtn');
runBtn.addEventListener('pointerdown',e=>{
 e.preventDefault();touchSprint=true;runBtn.setPointerCapture(e.pointerId);
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])runBtn.addEventListener(event,()=>touchSprint=false);
function jump(){
 if(state.mode!=='running'||state.jump>.01)return;
 state.jumpVel=6.8;
}
$('pauseBtn').addEventListener('click',togglePause);
$('resumeBtn').addEventListener('click',resume);
$('restartBtn').addEventListener('click',resetRun);
$('retryBtn').addEventListener('click',resetRun);
$('startBtn').addEventListener('click',()=>{if(ready)resetRun();});
$('helpBtn').addEventListener('click',()=>{if(state.mode==='running')pause();});
window.addEventListener('keydown',e=>{
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
 keys.add(e.code);
 if(e.repeat)return;
 if(e.code==='KeyE'||e.code==='KeyF')collect(nearGift());
 if(e.code==='Space')jump();
 if(e.code==='Escape'||e.code==='KeyP')togglePause();
 if(e.code==='Enter'&&state.mode==='menu'&&ready)resetRun();
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();touchSprint=false;joyX=joyY=0;if(state.mode==='running')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.mode==='running')pause();});
let cameraReady=false;
function tick(){
 requestAnimationFrame(tick);
 const dt=Math.min(clock.getDelta(),.045);
 if(state.mode==='running'){
  state.elapsed+=dt;state.time=Math.max(0,240-state.elapsed);
  if(state.time<=0)endRun('time');
  if(state.invulnerable>0)state.invulnerable-=dt;
  if(state.hitTime>0)state.hitTime=Math.max(0,state.hitTime-dt);
  const mx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joyX;
  const mz=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+joyY;
  const magnitude=Math.min(1,Math.hypot(mx,mz));
  const nx=magnitude?mx/Math.hypot(mx,mz):0,nz=magnitude?mz/Math.hypot(mx,mz):0;
  const sprint=(keys.has('ShiftLeft')||keys.has('ShiftRight')||touchSprint)&&state.stamina>5&&magnitude>.1;
  state.stamina=Math.max(0,Math.min(100,state.stamina+(sprint?-27:13)*dt));
  const speed=sprint?7.05:4.72;
  const dx=(nx*Math.cos(canvasYaw)-nz*Math.sin(canvasYaw))*speed*magnitude*dt;
  const dz=(-nx*Math.sin(canvasYaw)-nz*Math.cos(canvasYaw))*speed*magnitude*dt;
  if(canWalk(hero.group.position.x+dx,hero.group.position.z))hero.group.position.x+=dx;
  if(canWalk(hero.group.position.x,hero.group.position.z+dz))hero.group.position.z+=dz;
  if(magnitude>.08){
   const angle=Math.atan2(-dx,-dz);
   hero.group.rotation.y+=Math.atan2(Math.sin(angle-hero.group.rotation.y),Math.cos(angle-hero.group.rotation.y))*Math.min(1,dt*10);
  }
  state.jump=Math.max(0,state.jump+state.jumpVel*dt);
  if(state.jumpVel!==0||state.jump>0){
   state.jumpVel-=16.1*dt;
   if(state.jump<=0){state.jump=0;state.jumpVel=0;}
  }
  hero.group.position.y=state.jump;
  hero.face.rotation.z=state.hitTime>0?Math.sin(state.hitTime/.58*Math.PI)*.2:0;
  playAnim(hero,state.hitTime>0?'hit':state.jump>.02?'jump':magnitude>.07?'run':'idle');
  hero.mixer?.update(dt*(sprint?1.3:1));
  state.near=nearGift();
  $('takeBtn').disabled=!state.near;
  $('prompt').classList.toggle('visible',Boolean(state.near));
  if(state.near&&Math.hypot(state.near.x-hero.group.position.x,state.near.z-hero.group.position.z)<1.0)collect(state.near);
  for(const g of gifts){
   if(!g.active){
    if(state.elapsed>=g.respawnAt)activateGift(g);
    continue;
   }
   g.group.rotation.y+=dt*.65;
   g.group.position.y=Math.sin(state.elapsed*3+g.i)*.12;
  }
  updateFoes(dt);
  updateHud();
 }else if(state.mode==='dying'&&hero){
  state.deathTime+=dt;
  const p=Math.min(1,state.deathTime/1.18);
  // Physical collapse remains visible even on models that have no death clip.
  hero.face.rotation.z=p*Math.PI*.47;
  hero.face.position.y=-p*.35;
  hero.mixer?.update(dt);
  if(state.deathTime>=1.55)finishRun('caught');
 }else if(hero){hero.mixer?.update(dt);}
 if(toastSecs>0){toastSecs-=dt;if(toastSecs<=0)$('toast').classList.remove('visible');}
 // Drift snow rather than using an unrelated repeating screen effect.
 const pa=snowGeo.getAttribute('position');
 for(let i=0;i<350;i++){
  let y=pa.getY(i)-dt*(.65+i%5*.14);
  if(y<0)y=15+Math.random()*4;
  pa.setY(i,y);
 }
 pa.needsUpdate=true;snowfall.rotation.y+=dt*.003;
  for(let k=sparkles.length-1;k>=0;k--){
   const p=sparkles[k];p.time+=dt;const dist=p.time*2.1;
   p.o.position.set(p.x+Math.cos(p.angle)*dist,.7+p.time*2.8,p.z+Math.sin(p.angle)*dist);
   p.o.scale.setScalar(Math.max(0,1-p.time));
   if(p.time>=1){scene.remove(p.o);sparkles.splice(k,1);}
  }
  for(const deer of ambientAnimals){
   deer.phase+=dt*.27;
   deer.group.position.set(deer.origin[0]+Math.cos(deer.phase)*1.1,0,deer.origin[1]+Math.sin(deer.phase)*1.1);
   deer.group.rotation.y=deer.phase+Math.PI*.5;
   deer.mixer?.update(dt);
  }
 if(hero){
  const look=new THREE.Vector3(-Math.sin(canvasYaw),0,-Math.cos(canvasYaw));
  const mobile=innerWidth<700,distance=mobile?7.7:10.1,up=mobile?5.0:6.15;
  const pos=hero.group.position;
  const aim=new THREE.Vector3(pos.x-look.x*distance,pos.y+up,pos.z-look.z*distance);
  if(!cameraReady){camera.position.copy(aim);cameraReady=true;}
  else camera.position.lerp(aim,Math.min(1,dt*5));
  camera.lookAt(pos.x+look.x*3.7,pos.y+1.45,pos.z+look.z*3.7);
   updateVisibility(dt);
 }
 if(performance.now()-lastMap>110){drawMap();lastMap=performance.now();}
 renderer.render(scene,camera);
}
async function populateReindeer(){
 // Real Quaternius animated deer, loaded independently so each has its own rig.
 for(const [x,z,phase] of [[-7,26,0],[8,27,1.5]]){
  try{
   const a=await loadThreeAsset('quaternius:ultimate-animated-animals:Deer',{GLTFLoader});
   const asset=normalized(a,2.05);
   const holder=new THREE.Group();holder.position.set(x,0,z);
   holder.add(asset);scene.add(holder);
   const mixer=a.animations.length?new THREE.AnimationMixer(asset):null;
   if(mixer)mixer.clipAction(a.animations.find(v=>/walk|idle/i.test(v.name))||a.animations[0]).play();
   ambientAnimals.push({group:holder,mixer,phase,origin:[x,z]});
  }catch(err){console.warn('Deer artwork could not load:',err);}
 }
}
async function boot(){
 $('startBtn').disabled=true;$('startBtn').textContent='LOADING CHRISTMAS ARTWORK...';
 tick();
 try{
  const actorNames=['Elf','Goblin_Male','Goblin_Female','Witch','Zombie_Male'];
  const actorPromises=actorNames.map((name,i)=>loadActor(name,
   i===0?0:[-25,25,-26,26][i-1],i===0?23:[-17,-17,15,17][i-1],
   i===0?2.25:2.25));
  const [p,a,b,c,d]=await Promise.all(actorPromises);
  hero=p;
  [a,b,c,d].forEach((f,i)=>{
   f.index=i;f.patrol=i;f.path=[];f.pathTimer=0;f.chasing=false;f.lost=0;
    f.attackTime=0;f.attackElapsed=0;f.cooldown=0;f.didStrike=false;
    const arc=new THREE.Mesh(new THREE.TorusGeometry(.57,.06,6,27,Math.PI*1.45),
     new THREE.MeshBasicMaterial({color:'#ffdfbb',transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide}));
    arc.position.set(0,1.35,-.85);arc.visible=false;arc.rotation.z=-.9;
    f.face.add(arc);f.swipe=arc;
    foes.push(f);
  });
  await populateTrees();
  setUpGifts();
  populateReindeer();
  ready=true;
  $('startBtn').disabled=false;$('startBtn').textContent='ENTER THE VILLAGE';
  $('loading').textContent='All 3D character and village artwork loaded.';
 }catch(err){
  console.error('Christmas Village artwork failed:',err);
  $('loading').textContent='A required 3D artwork asset could not load. Refresh to try again.';
  $('startBtn').disabled=true;$('startBtn').textContent='ARTWORK NOT READY';
 }
}
boot();