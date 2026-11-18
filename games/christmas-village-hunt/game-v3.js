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
const workshopGifts=[],bonusGifts=[],mysteryLights=[];
let secretRoom=null;
const mysteryKey='gamebox.christmasVillage.discoveries.v3';
let discovered=new Set();
try{discovered=new Set(JSON.parse(localStorage.getItem(mysteryKey)||'[]'));}catch{}
const secrets=[
 {id:'snowman',x:-3,z:16,r:2.7,name:'The Whispering Snowman',icon:'❄',
  text:'The snowman turns its head and whispers: “Before the village fell silent, someone lost a bell beneath the frozen water. Follow the dancing lights and listen for the ice.”',
  action:'FOLLOW THE WHISPER',hint:'A snowman spoke of something hidden beneath the ice.'},
 {id:'pond',x:-8,z:-26,r:3,name:'The Bell Beneath the Ice',icon:'✧',
  text:'Under the clear ice lies a golden bell. It rings without being touched. Across the village, every monster stops moving... but only briefly.',
  action:'RING THE BELL',hint:'The frozen pond hides a bell that can halt the monsters.'},
 {id:'tree',x:2.0,z:1.7,r:2.5,name:'The Hollow Christmas Tree',icon:'✦',
  text:'Behind the ornaments is a tiny hollow full of silver snow. A soft voice offers you the protection of the old forest.',
  action:'TAKE THE WINTER BLESSING',hint:'The tree in the square contains an old protective spell.'},
 {id:'workshop',x:16,z:-11.5,r:2.3,name:'The Door That Shouldn’t Be There',icon:'⌂',
  text:'Behind the cottage, a small golden keyhole appears. The door creaks open onto a room much larger than the house could possibly hold...',
  action:'STEP THROUGH THE DOOR',hint:'An ordinary cottage conceals an impossible toy workshop.'},
 {id:'postbox',x:25,z:6,r:2.6,name:'A Letter From Tomorrow',icon:'✉',
  text:'Inside the red postbox is a letter addressed to you. It reads: “Do not worry about the monsters. Worry about what they are trying to keep you from finding.”',
  action:'READ THE REST',hint:'A strange letter suggests the monsters are guarding more than gifts.'}
];
let lastEncounter=null,previousMode='running',encounterReturn='running',previousPage='pause';
const ambientAnimals=[];
const translucentHouses=[];
let hero=null,ready=false,lookPointer=null,joyPointer=null,toastSecs=0,lastMap=0;
let canvasYaw=0,joyX=0,joyY=0,keySprint=false,touchSprint=false;
const keys=new Set();
const state={mode:'menu',time:240,elapsed:0,score:0,gifts:0,lives:3,stamina:100,
 invulnerable:0,jump:0,jumpVel:0,near:null,chase:false,hitTime:0,deathTime:0,chain:0,lastPickup:-50,
 playMode:'explore',insideSecret:false,nearSecret:null,freezeUntil:0,hiddenUntil:0,nextSurprise:55};
const bestKey='gamebox.christmasVillageGiftHunt.bestChallenge.v3';
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

function buildMysteryLandmarks(){
 // All mysteries have world-space physical landmarks. They do NOT appear on the minimap.
 const glow=new THREE.MeshBasicMaterial({color:'#ffdf86',transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide});
 // A warm music-box glow near the whispering snowman.
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2;
  const fire=ball(world,i%2?M.gold:M.glass,-3+Math.sin(a)*1.1,1.8,16+Math.cos(a)*1.1,.095);
  mysteryLights.push({o:fire,x:fire.position.x,y:fire.position.y,z:fire.position.z,phase:i});
 }
 // Sunken pond with visible concentric ice, a little crack and a snowflake beneath the surface.
 const pond=new THREE.Group();pond.position.set(-8,0,-26);world.add(pond);
 const ice=mesh(pond,new THREE.CircleGeometry(3.35,40),
  new THREE.MeshStandardMaterial({color:'#b1e7ee',emissive:'#5ab6c4',emissiveIntensity:.23,metalness:.13,roughness:.23,transparent:true,opacity:.88,side:THREE.DoubleSide}),
  0,.013,0);ice.rotation.x=-Math.PI/2;ice.castShadow=false;
 const ring=mesh(pond,new THREE.TorusGeometry(2.9,.13,6,40),M.snowLight,0,.09,0);ring.rotation.x=Math.PI/2;
 for(let i=0;i<6;i++){
  const angle=i*Math.PI/3;
  const crack=box(pond,M.snowLight,Math.cos(angle)*1.1,.06,Math.sin(angle)*1.1,.04,.015,1.28);
  crack.rotation.y=angle+.3;crack.castShadow=false;
 }
 const bell=mesh(pond,new THREE.SphereGeometry(.46,16,10,0,Math.PI*2,0,Math.PI*.75),M.gold,0,.17,0);
 bell.rotation.x=Math.PI;bell.castShadow=false;
 // Bright but low-profile door at the actual face of the cottage.
 const door=new THREE.Group();door.position.set(16,0,-12.47);world.add(door);
 box(door,M.woodDark,0,1.5,.09,1.62,3.0,.13);
 box(door,M.blueRoof,0,1.45,.17,1.27,2.76,.12);
 const outline=mesh(door,new THREE.TorusGeometry(.66,.062,6,28,Math.PI),M.gold,0,2.35,.26);
 outline.rotation.z=Math.PI;outline.castShadow=false;
 ball(door,M.gold,.33,1.43,.28,.12);
 for(let k=0;k<6;k++)ball(door,k%2?M.glass:M.gold,-.5+k*.2,2.85,.18,.066);
 // A letterbox with a physically visible slot and envelope.
 const post=new THREE.Group();post.position.set(25,0,6);world.add(post);
 cylinder(post,M.iron,0,.25,0,.58,.5);
 cylinder(post,M.red,0,1.16,0,.45,1.5);
 ball(post,M.red,0,1.98,0,.46);
 box(post,M.gold,0,1.32,.45,.65,.16,.08);
 box(post,M.cream,0,1.08,.48,.42,.27,.04);
 box(post,M.woodDark,0,2.43,0,.75,.12,.75);
 treeBlockers.push({x:25,z:6,radius:.42});
 // The big tree's inner hollow is signalled with a tiny hanging golden bell.
 const treeBell=cylinder(world,M.gold,1.1,1.15,1.1,.25,.48);
 ball(world,M.gold,1.1,.89,1.1,.15);
 const treeAura=mesh(world,new THREE.TorusGeometry(1.1,.042,6,32),glow,0,.17,0);
 treeAura.rotation.x=Math.PI/2;treeAura.castShadow=false;
}
function buildSecretWorkshop(){
 // This room occupies its own remote piece of world, not the walkable village.
 // Open sky prevents the third-person camera from clipping a low ceiling.
 const room=new THREE.Group();room.position.set(0,0,79);scene.add(room);secretRoom=room;room.visible=false;
 const floor=mesh(room,new THREE.PlaneGeometry(15,23),M.wood,0,-.02,0);
 floor.rotation.x=-Math.PI/2;floor.castShadow=false;
 for(const x of [-7.5,7.5])box(room,M.woodDark,x,2.25,0,.3,4.5,23);
 for(const z of [-11.5,11.5])box(room,M.woodDark,0,2.25,z,15,4.5,.3);
 for(let i=0;i<8;i++){
  const x=-6.2+(i%4)*4.15,z=-8+Math.floor(i/4)*7.2;
  box(room,i%2?M.green:M.red,x,.75,z,1.48,1.4,1.3);
  box(room,M.gold,x,1.46,z,1.64,.18,1.45);
  box(room,M.ribbon,x,1.55,z,.17,.12,1.47);
 }
 for(const x of [-5,5]){
  box(room,M.wood,x,2.0,-4,.8,3.5,10.2);
  for(let n=0;n<5;n++){
   box(room,n%2?M.green:M.gold,x,1.0+n*.57,-4,.52,.32,1.7);
  }
 }
 for(let i=0;i<9;i++){
  const x=-5+(i%3)*5,z=-9+Math.floor(i/3)*7;
  ball(room,[M.glass,M.gold,M.snowLight][i%3],x,4.0,z,.23);
 }
 const rug=mesh(room,new THREE.CircleGeometry(3.6,36),M.red,0,.02,-1);
 rug.rotation.x=-Math.PI/2;rug.castShadow=false;
 stamp(room,'THE FORGOTTEN TOYROOM',0,3.65,-11.23,7);
 // Exit portal in the back of the hidden room.
 const exit=mesh(room,new THREE.TorusGeometry(1.05,.12,10,32),M.gold,0,1.45,9.3);
 exit.castShadow=false;
 const light=new THREE.PointLight('#f6d68a',7,23,2);light.position.set(0,3.5,0);room.add(light);
 for(const [x,z] of [[-4,-4],[4,-4],[0,2]]){
  const g=makeGift(20+workshopGifts.length);g.position.set(x,0,79+z);
  scene.add(g);g.visible=false;
  workshopGifts.push({group:g,x,z:79+z,i:20+workshopGifts.length,active:true,secretOnly:true,respawnAt:Infinity});
 }
}
buildMysteryLandmarks();
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
 if(state.insideSecret)return x>-6.85+r&&x<6.85-r&&z>68.1+r&&z<89.8-r;
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
 for(const g of (state.insideSecret?workshopGifts:[...gifts,...bonusGifts]))if(g.active){
  const d=Math.hypot(g.x-hero.group.position.x,g.z-hero.group.position.z);
  if(d<dist){dist=d;found=g;}
 }
 return found;
}

function nearSecret(){
 if(!hero||state.mode!=='running')return null;
 const x=hero.group.position.x,z=hero.group.position.z;
 if(state.insideSecret){
  return Math.hypot(x,z-88.3)<2.55?{id:'exit',name:'The doorway home'}:null;
 }
 let found=null,best=999;
 for(const secret of secrets){
  const d=Math.hypot(x-secret.x,z-secret.z);
  if(d<secret.r&&d<best){found=secret;best=d;}
 }
 return found;
}
function spawnBonusGifts(x,z,count=4){
 if(state.insideSecret)return;
 let created=0;
 for(let i=0;i<count*4&&created<count;i++){
  const angle=(i*.84+Math.random()*.35)*Math.PI;
  const radius=2.3+Math.random()*3.1;
  const gx=x+Math.cos(angle)*radius,gz=z+Math.sin(angle)*radius;
  if(!canWalk(gx,gz,1.05))continue;
  if(Math.hypot(gx-hero.group.position.x,gz-hero.group.position.z)<1.4)continue;
  const meshGroup=makeGift(30+bonusGifts.length);
  meshGroup.position.set(gx,0,gz);scene.add(meshGroup);
  bonusGifts.push({group:meshGroup,x:gx,z:gz,i:30+bonusGifts.length,
   bonus:true,active:true,respawnAt:Infinity,expiresAt:state.elapsed+35});
  created++;
 }
}
function trailTo(x0,z0,x1,z1){
 for(let n=0;n<13;n++){
  const t=(n+1)/14;
  const px=x0+(x1-x0)*t,pz=z0+(z1-z0)*t;
  if(!canWalk(px,pz,.3))continue;
  const orb=ball(world,n%2?M.gold:M.glass,px,.21,pz,.10);
  orb.castShadow=false;
  mysteryLights.push({o:orb,x:px,y:.21,z:pz,phase:n*.63,expiresAt:state.elapsed+38});
 }
}
function rememberSecret(secret){
 if(discovered.has(secret.id))return false;
 discovered.add(secret.id);
 try{localStorage.setItem(mysteryKey,JSON.stringify([...discovered]));}catch{}
 $('secretsCount').textContent=discovered.size;
 state.score+=120;
 pickupSparkles(secret.x,secret.z);
 return true;
}
function interact(){
 if(state.mode!=='running')return;
 const gift=nearGift();
 if(gift){collect(gift);return;}
 const secret=nearSecret();
 if(!secret)return;
 if(secret.id==='exit'){exitSecretWorkshop();return;}
 openEncounter(secret);
}
function openEncounter(secret){
 if(state.mode!=='running')return;
 lastEncounter=secret;encounterReturn='running';state.mode='encounter';
 $('encounterEyebrow').textContent=discovered.has(secret.id)?'A FAMILIAR MYSTERY':'YOU FOUND SOMETHING';
 $('encounterTitle').textContent=secret.name.toUpperCase();
 $('encounterText').textContent=secret.text;
 $('encounterIllustration').textContent=secret.icon;
 $('encounterAction').textContent=discovered.has(secret.id)&&secret.id==='workshop'?'GO INSIDE AGAIN':secret.action;
 $('encounterLeave').textContent='NOT YET';
 $('encounterOverlay').classList.remove('hidden');
}
function closeEncounter(){
 $('encounterOverlay').classList.add('hidden');
 if(state.mode==='encounter'){state.mode='running';state.invulnerable=Math.max(state.invulnerable,1.5);}
}
function enterSecretWorkshop(){
 state.insideSecret=true;
 if(secretRoom)secretRoom.visible=true;
 for(const item of workshopGifts)item.group.visible=item.active;state.invulnerable=3;
 hero.group.position.set(0,0,82);hero.group.rotation.y=0;
 canvasYaw=0;cameraReady=false;
 state.near=null;state.nearSecret=null;state.chase=false;
 $('combo').textContent='AN IMPOSSIBLY LARGE TOYROOM';
 toast('THE WALLS SHIMMER. YOU ARE SOMEWHERE ELSE...',3);
}
function exitSecretWorkshop(){
 state.insideSecret=false;
 if(secretRoom)secretRoom.visible=false;
 for(const item of workshopGifts)item.group.visible=false;state.invulnerable=3;
 hero.group.position.set(16,0,-10.3);hero.group.rotation.y=0;
 canvasYaw=Math.PI;cameraReady=false;
 $('combo').textContent=state.playMode==='explore'?'FOLLOW YOUR CURIOSITY':'COLLECT WHAT YOU CAN';
 toast('THE SECRET DOOR CLOSES BEHIND YOU...',2.5);
}
function resolveEncounter(){
 if(!lastEncounter)return;
 const secret=lastEncounter;closeEncounter();
 const first=rememberSecret(secret);
 if(secret.id==='snowman'){
  if(first){trailTo(-3,16,-8,-26);toast('GOLDEN FOOTPRINTS APPEAR IN THE SNOW',3);}
  else toast('THE SNOWMAN WHISPERS: FOLLOW THE LIGHTS',2);
 }else if(secret.id==='pond'){
  state.freezeUntil=state.elapsed+16;
  spawnBonusGifts(-8,-26,4);
  toast('THE BELL RINGS! ALL MONSTERS FREEZE FOR 16 SECONDS',3);
 }else if(secret.id==='tree'){
  state.hiddenUntil=state.elapsed+22;
  state.lives=Math.min(3,state.lives+1);
  toast('WINTER MAGIC HIDES YOU FROM MONSTERS FOR 22 SECONDS',3);
 }else if(secret.id==='workshop'){
  enterSecretWorkshop();
 }else if(secret.id==='postbox'){
  spawnBonusGifts(25,6,4);
  toast('THE LETTER TURNS INTO SPARKLING GIFTS',2.6);
 }
 updateHud();
}
function showJournal(){
 if(state.mode!=='paused')return;
 state.mode='journal';
 const entries=$('journalEntries');entries.replaceChildren();
 const found=secrets.filter(secret=>discovered.has(secret.id));
 $('journalIntro').textContent=found.length+
  ' of '+secrets.length+' mysteries found. Nothing is marked on the village map.';
 if(!found.length){
  const note=document.createElement('p');note.textContent='No secrets discovered yet. Follow odd sounds, examine unusual objects and explore the village corners.';
  entries.appendChild(note);
 }
 for(const secret of found){
  const card=document.createElement('div');card.className='journalEntry';
  const title=document.createElement('strong');title.textContent=secret.name;
  const body=document.createElement('p');body.textContent=secret.hint;
  card.append(title,body);entries.append(card);
 }
 $('pauseOverlay').classList.add('hidden');
 $('journalOverlay').classList.remove('hidden');
}
function closeJournal(){
 $('journalOverlay').classList.add('hidden');
 if(state.mode==='journal'){
  state.mode='paused';
  $('pauseOverlay').classList.remove('hidden');
 }
}
function unexpectedEncounter(){
 if(state.mode!=='running'||state.insideSecret)return;
 const x=hero.group.position.x,z=hero.group.position.z;
 const type=Math.floor(Math.random()*5);
 if(type===0){
  spawnBonusGifts(x,z,4);toast('A HIDDEN SACK BURSTS! PRESENTS SCATTER IN THE SNOW!',3);
 }else if(type===1){
  state.freezeUntil=state.elapsed+9;
  toast('DISTANT BELLS RING. THE MONSTERS STAND COMPLETELY STILL...',3);
 }else if(type===2){
  const unknown=secrets.filter(secret=>!discovered.has(secret.id));
  if(unknown.length){
   const secret=unknown[Math.floor(Math.random()*unknown.length)];
   trailTo(x,z,secret.x,secret.z);
   toast('STRANGE LIGHTS DANCE THROUGH THE SNOW. FOLLOW THEM?',3);
  }else spawnBonusGifts(x,z,3);
 }else if(type===3){
  state.hiddenUntil=state.elapsed+10;
  toast('A SILVER REINDEER SHADOW CROSSES THE STREET. YOU VANISH FROM MONSTER SIGHT.',3);
 }else{
  spawnBonusGifts(x,z,2);
  toast('A TRAPDOOR CLATTERS SOMEWHERE NEARBY...',3);
 }
}
$('encounterAction').addEventListener('click',resolveEncounter);
$('encounterLeave').addEventListener('click',closeEncounter);
$('journalBtn').addEventListener('click',showJournal);
$('journalClose').addEventListener('click',closeJournal);

function toast(str,duration=1.6){
 $('toast').textContent=str;$('toast').classList.add('visible');toastSecs=duration;
}
function updateHud(){
 $('timerLabel').textContent=state.playMode==='explore'?'MODE':'TIME';
 $('timer').textContent=state.playMode==='explore'?'FREE':Math.floor(state.time/60)+':'+String(Math.ceil(state.time%60)).padStart(2,'0');
 $('gifts').textContent=state.gifts;
 $('score').textContent=state.score.toLocaleString('en-GB');
 $('hearts').textContent='♥'.repeat(state.lives)+'♡'.repeat(3-state.lives);
 $('staminaFill').style.width=state.stamina.toFixed(1)+'%';
 $('staminaFill').style.background=state.stamina<20?'#cb565b':'#bce9db';
}
function collect(g=state.near){
 if(!g||!g.active||state.mode!=='running')return;
 if(Math.hypot(g.x-hero.group.position.x,g.z-hero.group.position.z)>2.45)return;
 g.active=false;g.group.visible=false;g.respawnAt=g.secretOnly||g.bonus?Infinity:state.elapsed+5+Math.random()*5;
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
 $('endDetail').textContent=reason==='caught'?'Your elf fell defending the village.':'Your timed expedition is complete.';
 $('finalScore').textContent=state.score.toLocaleString('en-GB');
 $('finalGifts').textContent=state.gifts;
 if(state.playMode==='challenge'&&state.score>best){
  best=state.score;try{localStorage.setItem(bestKey,String(best));}catch{}
  $('newBest').textContent='NEW CHALLENGE BEST';
 }else if(state.playMode==='explore'){
  $('newBest').textContent='EXPLORE MODE · DISCOVERIES SAVED: '+discovered.size+'/'+secrets.length;
 }else $('newBest').textContent='CHALLENGE BEST: '+best.toLocaleString('en-GB');
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
function resetRun(chosenMode=state.playMode){
 state.playMode=typeof chosenMode==='string'?chosenMode:state.playMode;
 state.mode='running';state.time=240;state.elapsed=0;state.score=0;state.gifts=0;state.lives=3;
 state.stamina=100;state.invulnerable=0;state.jump=0;state.jumpVel=0;
 state.near=null;state.nearSecret=null;state.chase=false;state.hitTime=0;state.deathTime=0;state.chain=0;state.lastPickup=-50;
 state.freezeUntil=0;state.hiddenUntil=0;state.nextSurprise=44+Math.random()*27;state.insideSecret=false;
 scene.background.set('#abcdd7');
 for(const bonus of bonusGifts)scene.remove(bonus.group);
 bonusGifts.length=0;
 for(const treasure of workshopGifts){treasure.active=true;treasure.group.visible=false;}
 if(secretRoom)secretRoom.visible=false;
 $('encounterOverlay').classList.add('hidden');$('journalOverlay').classList.add('hidden');
 $('secretsCount').textContent=discovered.size;
 $('combo').textContent=state.playMode==='explore'?'FOLLOW YOUR CURIOSITY':'COLLECT WHAT YOU CAN';
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
 if(state.insideSecret||state.elapsed<state.freezeUntil||state.elapsed<state.hiddenUntil){
  for(const f of foes){
   f.attackTime=0;f.chasing=false;f.face.position.z=0;f.face.rotation.x=0;f.face.rotation.z=0;
   if(f.swipe)f.swipe.visible=false;
   f.mixer?.update(dt*.23);
  }
  state.chase=false;$('danger').classList.remove('visible');return;
 }
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
 if(state.insideSecret){
  const w=map.width,h=map.height,xx=x=>(x+7.5)/15*w,zz=z=>(z-67.5)/23*h;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#684a45';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#aa816e';ctx.fillRect(8,8,w-16,h-16);
  ctx.strokeStyle='#ffdf8a';ctx.lineWidth=4;ctx.strokeRect(7,7,w-14,h-14);
  ctx.fillStyle='#f3dc82';
  for(const gift of workshopGifts)if(gift.active){
   ctx.beginPath();ctx.arc(xx(gift.x),zz(gift.z),4,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle='#b3e9dd';ctx.fillRect(xx(0)-5,zz(88.3)-5,10,10);
  ctx.fillStyle='#173e49';ctx.beginPath();
  ctx.arc(xx(hero.group.position.x),zz(hero.group.position.z),5,0,Math.PI*2);ctx.fill();
  return;
 }
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
$('takeBtn').addEventListener('click',interact);
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
$('restartBtn').addEventListener('click',()=>resetRun(state.playMode));
$('retryBtn').addEventListener('click',()=>resetRun(state.playMode));
$('startBtn').addEventListener('click',()=>{if(ready)resetRun('explore');});
$('challengeBtn').addEventListener('click',()=>{if(ready)resetRun('challenge');});
$('helpBtn').addEventListener('click',()=>{if(state.mode==='running')pause();});
window.addEventListener('keydown',e=>{
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
 keys.add(e.code);
 if(e.repeat)return;
 if(e.code==='KeyE'||e.code==='KeyF')interact();
 if(e.code==='Space')jump();
 if(e.code==='Escape'&&state.mode==='encounter'){closeEncounter();return;}
 if(e.code==='Escape'&&state.mode==='journal'){closeJournal();return;}
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
  state.elapsed+=dt;
  if(state.playMode==='challenge'){
   state.time=Math.max(0,240-state.elapsed);
   if(state.time<=0)endRun('time');
  }
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
  state.near=nearGift();state.nearSecret=nearSecret();
  const available=state.near||state.nearSecret;
  $('takeBtn').disabled=!available;
  $('actionWord').textContent=state.near?'GIFT':'LOOK';
  $('actionGlyph').textContent=state.near?'✦':'⌕';
  $('prompt').textContent=state.near?'A PRESENT · PRESS E / GIFT':state.nearSecret?'SOMETHING UNUSUAL · PRESS E / LOOK':'';
  $('prompt').classList.toggle('visible',Boolean(available));
  if(state.near&&Math.hypot(state.near.x-hero.group.position.x,state.near.z-hero.group.position.z)<1.0)collect(state.near);
  for(const g of [...gifts,...bonusGifts,...workshopGifts]){
   if(g.bonus&&state.elapsed>g.expiresAt){
    scene.remove(g.group);g.active=false;continue;
   }
   if(g.secretOnly&&!state.insideSecret)continue;
   if(!g.active){
    if(!g.secretOnly&&!g.bonus&&state.elapsed>=g.respawnAt)activateGift(g);
    continue;
   }
   g.group.rotation.y+=dt*.65;
   g.group.position.y=Math.sin(state.elapsed*3+g.i)*.12;
  }
  updateFoes(dt);
  if(!state.insideSecret&&state.elapsed>state.nextSurprise){
   unexpectedEncounter();state.nextSurprise=state.elapsed+43+Math.random()*30;
  }
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
  for(const light of mysteryLights){
   const elapsed=state.elapsed;
   if(light.expiresAt&&elapsed>light.expiresAt){light.o.visible=false;continue;}
   light.o.position.y=light.y+Math.sin(elapsed*2.4+light.phase)*.15;
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
  buildSecretWorkshop();
  $('secretsCount').textContent=discovered.size;
  populateReindeer();
  ready=true;
  $('startBtn').disabled=false;$('startBtn').textContent='EXPLORE THE VILLAGE';
  $('challengeBtn').disabled=false;
  $('loading').textContent='All 3D character and village artwork loaded.';
 }catch(err){
  console.error('Christmas Village artwork failed:',err);
  $('loading').textContent='A required 3D artwork asset could not load. Refresh to try again.';
  $('startBtn').disabled=true;$('startBtn').textContent='ARTWORK NOT READY';
 }
}
boot();