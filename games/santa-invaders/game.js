/* Santa Invaders: GameBox / Workshop Watch Christmas pixel-art family.
   Real frames: Admurin Monster Pack 82 + 85, rabbit pack; terrain: Gherwit winter atlas.
   Every gameplay character is loaded from its existing licensed pack, never generated. */
(()=>{
"use strict";
const W=360,H=600,TILE=16,COLS=9,STEP_X=32,STEP_Y=32;
const ICE_LINE_Y=H-112, INVADER_W=24,INVADER_H=25;
// Each wave uses an actual Christmas silhouette, authored on a 9-column
// pixel grid. Empty cells remain empty: no filler rows or generic swarms.
const FORMATIONS=[
  {name:"BAUBLE",rows:["....X....","...XXX...","...X.X...","....X...."]} ,
  {name:"CANDY CANE",rows:["...XXXX..","..XX..XX.","......XX.",".....XX..",".....XX..",".....XX..",".....XX.."]} ,
  {name:"CHRISTMAS TREE",rows:["....X....","...XXX...","...XXX...","..XXXXX..",".XXXXXXX.","....X....","....X...."]} ,
  {name:"STOCKING",rows:["..XXXXX..","..XX.....","..XX.....","..XX.....","..XXXXXX.","..XXXXXXX","...XXXXX."]} ,
  {name:"SNOWMAN",rows:["...XXX...","..XXXXX..","...XXX...","..XXXXX..",".XXXXXXX.",".XXXXXXX.","..XXXXX.."]} ,
  {name:"STAR",rows:["....X....","...XXX...","XXXXXXXXX",".XXXXXXX.","..XXXXX..","...X.X...","..X...X.."]} ,
  {name:"PRESENT",rows:["...X.X...","...XXX...","..XXXXX..",".XXXXXXX.",".XX.X.XX.",".XX.X.XX.",".XXXXXXX."]} ,
  {name:"WREATH",rows:["...XXX...","..X...X..",".X.....X.",".X.....X.",".X.....X.","..X...X..","...XXX..."]} ,
  {name:"BELL",rows:["....X....","...XXX...","..XXXXX..","..XXXXX..",".XXXXXXX.",".XXXXXXX.","XXXXXXXXX","....X...."]} ,
  {name:"SANTA HAT",rows:[".....X...","....XX...","...XXX...","..XXXX...","..XXXXX..",".XXXXXXX.","XXXXXXXXX"]} ,
  {name:"SNOWFLAKE",rows:["..X.X.X..","...XXX...","XXXXXXXXX","..XXXXX..","XXXXXXXXX","...XXX...","..X.X.X.."]} ,
  {name:"GINGERBREAD",rows:["...XXX...","...XXX...",".X.XXX.X.","XXXXXXXXX","...XXX...","..XX.XX..","..XX.XX.."]} 
];
function formationFor(wave){
  const pattern=FORMATIONS[(wave-1)%FORMATIONS.length];
  // Preserve the orientation of recognisable holiday icons (especially candy canes).
  // After all twelve shapes, replay them at higher difficulty.
  return {name:pattern.name,rows:pattern.rows};
}
function difficultyFor(wave){
  const n=Math.max(0,wave-1);
  return {
    speed:Math.min(60,12+n*4),
    volleyTime:Math.max(.65,3.4-n*.27),
    projectileSpeed:Math.min(255,112+n*14),
    drop:Math.min(16,9+Math.floor(n/2)),
    grace:Math.max(1.2,3.0-n*.18)
  };
}
const $=id=>document.getElementById(id),canvas=$("game"),ctx=canvas.getContext("2d");
ctx.imageSmoothingEnabled=false;
const ui={score:$("score"),wave:$("wave"),lives:$("lives"),banner:$("waveBanner"),asset:$("assetStatus"),
  hero:$("heroCanvas"),overlay:$("overlay"),title:$("overlayTitle"),text:$("overlayText"),primary:$("primaryButton"),
  secondary:$("secondaryButton"),sound:$("soundButton"),result:$("resultStrip"),
  endScore:$("endScore"),endBest:$("endBest"),hint:$("controlsHint"),announce:$("announce")};
const ASSETS={
  ground:"../workshop-watch/assets/vendor/gherwit/winter/Winter-Download/Winter-tiles.png",
  defenderIdle:"../workshop-watch/assets/vendor/admurin/pack82/Monster%20Pack%2082%20(Event)/Snowmen/Christmas_Snowman_C_Idle.png",
  defenderMove:"../workshop-watch/assets/vendor/admurin/pack82/Monster%20Pack%2082%20(Event)/Snowmen/Christmas_Snowman_C_Move.png",
  ginger:"../workshop-watch/assets/vendor/admurin/pack85/Monster%20Pack%2085%20(Event%203)/Spritesheets/Gingerbread/Christmas_Gingerbread_Move.png",
  slime:"../workshop-watch/assets/vendor/admurin/pack85/Monster%20Pack%2085%20(Event%203)/Spritesheets/Slime/Christmas_Slime_Move.png",
  devil:"../workshop-watch/assets/vendor/admurin/pack85/Monster%20Pack%2085%20(Event%203)/Spritesheets/Devil/Christmas_Devil_Move.png",
  boss:"../workshop-watch/assets/vendor/admurin/pack85/Monster%20Pack%2085%20(Event%203)/Spritesheets/Devil/Christmas_Devil_Idle.png",
  rabbit:"../workshop-watch/assets/vendor/admurin/rabbits/Monster%20Pack%20(Free)/Spritesheets/Updated%20Rabbit%20Horned/Rabbit_Horned_Move.png"
};
const images={},clamp=(v,min,max)=>Math.max(min,Math.min(max,v)),rand=(a,b)=>a+Math.random()*(b-a);
let ready=false,failed=false,audio=null,soundOn=true;
try{soundOn=localStorage.getItem("gamebox-santa-invaders-sound")!=="off"}catch(e){}
let best=0;try{best=Number(localStorage.getItem("gamebox-santa-invaders-best")||0)||0}catch(e){}
const held={left:false,right:false,fire:false};
const player={x:W/2,y:H-79,hurt:0,rapid:0,fireCooldown:0,moveAnimation:0};
const game={state:"ready",returnTo:"ready",score:0,lives:3,wave:1,time:0,
  fx:[],shots:[],enemyShots:[],invaders:[],forts:[],special:null,
  direction:1,gridX:20,gridY:84,fireClock:1.7,specialClock:14,
  grace:0,transition:0,flash:0,shake:0,bannerTimer:0,
  rules:difficultyFor(1),startCount:0,formationName:"SCOUTS",overReason:""};
function tone(freq=520,length=.055,type="square",vol=.022){
  if(!soundOn)return;
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    if(!audio)audio=new AC();
    if(audio.state==="suspended")audio.resume();
    const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;
    o.type=type;o.frequency.setValueAtTime(freq,now);
    o.frequency.exponentialRampToValueAtTime(Math.max(80,freq*.7),now+length);
    g.gain.setValueAtTime(vol,now);g.gain.exponentialRampToValueAtTime(.001,now+length);
    o.connect(g);g.connect(audio.destination);o.start(now);o.stop(now+length+.01);
  }catch(e){}
}
function announce(message){ui.announce.textContent=message}
function showBanner(message){
  ui.banner.textContent=message;ui.banner.classList.add("on");game.bannerTimer=1.45;announce(message);
}
function saveBest(){
  if(game.score<=best)return;best=game.score;
  try{localStorage.setItem("gamebox-santa-invaders-best",String(best))}catch(e){}
}
function hud(){
  ui.score.textContent=String(game.score).padStart(6,"0");
  ui.wave.textContent=String(game.wave).padStart(2,"0");
  ui.lives.textContent="♥ ".repeat(Math.max(0,game.lives)).trim()||"—";
}
function sprite(key,col,row,x,y,dim=128,alpha=1){
  const img=images[key];if(!img||!img.complete||!img.naturalWidth)return;
  const cols=key==="defenderIdle"||key==="boss"?4:6,cell=128;
  const c=((col%cols)+cols)%cols,r=clamp(row|0,0,3);
  ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img,c*cell,r*cell,cell,cell,Math.round(x-dim/2),Math.round(y-dim/2),dim,dim);
  ctx.restore();
}
function tile(c,r,x,y,scale=1,target=ctx){
  const im=images.ground;if(!im||!im.complete||!im.naturalWidth)return;
  const s=TILE*scale;
  target.drawImage(im,c*TILE,r*TILE,TILE,TILE,Math.round(x),Math.round(y),s,s);
}
function tree(x,y,target=ctx){
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)
    tile(9+col,6+row,x+col*TILE,y+row*TILE,1,target);
}
// A continuous frozen crossing, made from the same Gherwit winter ground
// tiles as the rest of the stage, with crisp blue ice edging. This is the
// actual gameplay boundary, not a decorative line near the defender.
function drawIceLine(target){
  const y=ICE_LINE_Y;
  for(let x=0;x<W;x+=TILE){
    tile(12,1,x,y-5,1,target);
    target.fillStyle="#6caac7";target.fillRect(x,y+5,TILE,3);
    target.fillStyle="#b5e6f5";target.fillRect(x,y-4,TILE,10);
    target.fillStyle="#e9faff";target.fillRect(x+1,y-4,13,2);
    target.fillStyle="#85c3dc";target.fillRect(x+1,y+2,13,2);
    target.fillStyle="#468ba9";target.fillRect(x,y+7,TILE,2);
    if((x/TILE)%3===0){
      target.fillStyle="#ffffff";target.fillRect(x+3,y-2,5,2);
      target.fillStyle="#7ebbd5";target.fillRect(x+9,y+1,2,3);
    }
  }
}
let backdrop=null;
function background(){
  if(!ready){ctx.fillStyle="#eaf8fc";ctx.fillRect(0,0,W,H);return;}
  if(!backdrop){
    // Cache the entire static winter scene ONCE. Rebuilding ~850 terrain tiles
    // every animation frame is not acceptable on a phone.
    backdrop=document.createElement("canvas");backdrop.width=W;backdrop.height=H;
    const g=backdrop.getContext("2d");g.imageSmoothingEnabled=false;
    g.fillStyle="#effaff";g.fillRect(0,0,W,H);
    for(let y=0;y<H;y+=16)for(let x=0;x<W;x+=16)tile(12,1,x,y,1,g);
    for(const [x,y] of [[-28,15],[W-21,25],[-24,240],[W-23,250],[-27,466],[W-22,477]])
      tree(x,y,g);
    for(const [x,y] of [[25,55],[310,187],[20,344],[315,440]])tile(1,1,x,y,1,g);
    // No workshop door or building: a single visible frozen no-cross line.
    drawIceLine(g);
  }
  ctx.drawImage(backdrop,0,0);
}
function renderHeroPreview(){
  // Draw directly from the approved source sprites and tiles; no CSS frame-cropping.
  if(!ready||!ui.hero)return;
  const g=ui.hero.getContext("2d");if(!g)return;
  const w=ui.hero.width,h=ui.hero.height;
  g.imageSmoothingEnabled=false;g.clearRect(0,0,w,h);
  for(let y=0;y<h;y+=16)for(let x=0;x<w;x+=16)tile(12,1,x,y,1,g);
  tree(-18,6,g);tree(w-29,2,g);
  for(const [x,y] of [[30,74],[110,33],[229,77],[277,34]])tile(1,1,x,y,1,g);
  const char=(name,frame,row,x,y,dim,cols)=>{
    const im=images[name];if(!im)return;
    g.drawImage(im,frame*128,row*128,128,128,
      Math.round(x-dim/2),Math.round(y-dim/2),dim,dim);
  };
  char("defenderIdle",1,0,61,73,154,4);
  char("ginger",0,2,153,53,134,6);
  char("slime",1,2,211,67,122,6);
  char("devil",0,2,268,48,138,6);
  // Gameplay-like projectile trail belongs to the preview, not to faux enemy art.
  for(const [x,y] of [[93,66],[105,48],[116,30]]){
    g.fillStyle="#448eac";g.fillRect(x-3,y-3,7,7);
    g.fillStyle="#f7feff";g.fillRect(x-2,y-2,5,5);
  }
}
function projectile(x,y,enemy=false){
  ctx.fillStyle=enemy?"#a64448":"#72b4c9";ctx.fillRect(Math.round(x-4),Math.round(y-4),9,9);
  ctx.fillStyle=enemy?"#f4a0a3":"#fff";ctx.fillRect(Math.round(x-3),Math.round(y-3),6,6);
  ctx.fillStyle=enemy?"#fff8ec":"#cce9f3";ctx.fillRect(Math.round(x-2),Math.round(y-3),3,2);
}
function particle(x,y,color,count=11){
  for(let n=0;n<count;n++)game.fx.push({x,y,vx:rand(-95,95),vy:rand(-110,50),
    left:rand(.17,.52),color,sz:rand(1.8,4)});
}
function makeForts(){
  game.forts=[];
  for(let base=0;base<4;base++)for(let row=0;row<2;row++)for(let col=0;col<3;col++){
    if(row===1&&col===1)continue;
    game.forts.push({x:30+base*84+col*13,y:H-172+row*13,hp:3});
  }
}
function fort(f){
  if(f.hp<=0)return;
  ctx.save();ctx.imageSmoothingEnabled=false;
  // Gherwit snow tile with distinct cold-blue raised ice edging.
  ctx.fillStyle="#3c8fb3";ctx.fillRect(f.x-1,f.y-1,15,15);
  tile(12,1,f.x,f.y,.8);
  ctx.fillStyle="#c8eefa";ctx.fillRect(f.x+1,f.y+1,11,2);
  ctx.fillStyle="#7bbbd2";ctx.fillRect(f.x+1,f.y+11,11,2);
  if(f.hp<3){
    ctx.strokeStyle="#356d8b";ctx.lineWidth=1;ctx.beginPath();
    ctx.moveTo(f.x+4,f.y+2);ctx.lineTo(f.x+7,f.y+6);ctx.lineTo(f.x+5,f.y+9);
    if(f.hp===1){ctx.moveTo(f.x+7,f.y+6);ctx.lineTo(f.x+12,f.y+8);ctx.lineTo(f.x+11,f.y+12);}
    ctx.stroke();
  }
  ctx.restore();
}
function spawnWave(){
  game.invaders=[];
  game.rules=difficultyFor(game.wave);
  const formation=formationFor(game.wave);
  game.formationName=formation.name;
  game.gridY=70;game.direction=1;
  // Centre the occupied columns, not the unused cells at the edges, so a
  // small bauble or candy cane appears centred instead of to one side.
  const used=[];
  for(let row=0;row<formation.rows.length;row++)
    for(let col=0;col<COLS;col++)if(formation.rows[row][col]==="X")used.push(col);
  const first=Math.min(...used),last=Math.max(...used);
  game.gridX=(W-((last-first)*STEP_X+INVADER_W))/2-first*STEP_X;
  game.fireClock=game.rules.volleyTime;
  game.specialClock=rand(12,20);game.special=null;
  game.shots=[];game.enemyShots=[];game.grace=game.rules.grace;
  const types=["devil","ginger","slime","rabbit"];
  for(let row=0;row<formation.rows.length;row++){
    for(let col=0;col<COLS;col++){
      if(formation.rows[row][col]!=="X")continue;
      game.invaders.push({type:types[(row+game.wave-1)%types.length],
        row,col,alive:true,points:Math.max(10,40-row*5),variant:(row+col)%6});
    }
  }
  game.startCount=game.invaders.length;
  makeForts();hud();
}
function xy(e){return{x:game.gridX+e.col*STEP_X,y:game.gridY+e.row*STEP_Y}}
function overlap(ax,ay,aw,ah,bx,by,bw,bh){
  return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;
}
// Enemy bodies smash ice shields on contact, without losing the invader.
// Every segment shatters once; subsequent frames cannot repeatedly damage it.
function shatterOnContact(enemies){
  let broken=0;
  for(const e of enemies){
    const p=xy(e);
    if(p.y+INVADER_H<H-174||p.y>ICE_LINE_Y)continue;
    for(const f of game.forts){
      if(f.hp<=0)continue;
      if(!overlap(p.x,p.y,INVADER_W,INVADER_H,f.x,f.y,13,13))continue;
      f.hp=0;broken++;
      particle(f.x+6,f.y+6,"#8ccbe7",9);
      particle(f.x+6,f.y+6,"#ecfcff",5);
    }
  }
  if(broken)tone(225,.075,"triangle",.032);
  return broken;
}
function openPanel(state){
  game.state=state;ui.overlay.classList.add("show");ui.overlay.setAttribute("aria-hidden","false");
  ui.result.hidden=state!=="over";ui.sound.hidden=state==="over"||state==="help";
  ui.hint.hidden=state==="over";ui.sound.textContent=soundOn?"SOUND ON":"SOUND OFF";
  ui.secondary.hidden=state==="help"||state==="over";
  if(state==="ready"){
    ui.title.innerHTML="SANTA <em>INVADERS</em>";
    ui.text.textContent="Snowman defenders versus a marching monster invasion. Hold the line and save the workshop.";
    ui.primary.textContent=ready?"DEFEND THE WORKSHOP":failed?"RETRY ASSETS":"LOADING CHRISTMAS…";
    ui.primary.disabled=!ready&&!failed;ui.secondary.textContent="HOW TO PLAY";
  }else if(state==="paused"){
    ui.title.innerHTML="GAME <em>PAUSED</em>";
    ui.text.textContent="One snowman. A whole army of Christmas monsters.";
    ui.primary.textContent="RESUME";ui.primary.disabled=false;ui.secondary.textContent="RESTART RUN";
  }else if(state==="help"){
    ui.title.innerHTML="HOW TO <em>PLAY</em>";
    ui.text.textContent="Hold the arrows (or A / D) to move and FIRE (or SPACE) to throw snowballs. Clear each differently shaped wave before it crosses the blue ice line. Ice shields block shots but invaders smash them on contact. Hit the rare glowing monster for bonus points and rapid fire.";
    ui.primary.textContent="GOT IT";ui.primary.disabled=false;
  }else if(state==="over"){
    ui.title.innerHTML="WORKSHOP <em>OVERRUN</em>";
    ui.text.textContent=game.overReason||"The monsters broke through. Fancy another go?";
    ui.primary.textContent="PLAY AGAIN";ui.primary.disabled=false;
    ui.endScore.textContent=game.score.toLocaleString();ui.endBest.textContent=best.toLocaleString();
  }
}
function closePanel(){ui.overlay.classList.remove("show");ui.overlay.setAttribute("aria-hidden","true")}
function release(){
  held.left=false;held.right=false;held.fire=false;
  for(const el of document.querySelectorAll(".control"))el.classList.remove("down");
}
function begin(){
  if(!ready)return;game.score=0;game.wave=1;game.lives=3;game.time=0;game.fx=[];
  player.x=W/2;player.hurt=0;player.rapid=0;player.fireCooldown=0;
  game.overReason="";spawnWave();game.state="playing";closePanel();
  showBanner("WAVE 01 · "+game.formationName);
  tone(660,.1,"triangle",.05);
}
function pause(){
  if(game.state!=="playing"&&game.state!=="between")return;
  game.returnTo=game.state;release();openPanel("paused");
}
function resume(){game.state=game.returnTo;closePanel()}
function end(reason=""){
  game.overReason=reason;
  release();saveBest();openPanel("over");announce("Run over. Score: "+game.score);
  tone(210,.2,"sawtooth",.05);
}
function damagePlayer(){
  if(game.state!=="playing"||player.hurt>0||game.lives<=0)return;
  game.lives=Math.max(0,game.lives-1);player.hurt=1.55;game.shake=4;game.flash=.17;
  particle(player.x,player.y,"#d55a5d",18);hud();tone(165,.15,"sawtooth",.055);
  if(game.lives<=0)end();
}
function addScore(n){game.score+=n;hud()}
function fire(){
  if(game.state!=="playing"||player.fireCooldown>0)return;
  game.shots.push({x:player.x,y:player.y-23,vy:-490,r:4});
  player.fireCooldown=player.rapid>0?.105:.24;
  tone(player.rapid>0?850:720,.025,"triangle",.024);
}
function enemyFire(){
  const choices=[];
  for(let col=0;col<COLS;col++){
    const line=game.invaders.filter(e=>e.alive&&e.col===col);
    if(line.length)choices.push(line[line.length-1]);
  }
  if(!choices.length)return;
  const e=choices[Math.floor(Math.random()*choices.length)],p=xy(e);
  game.enemyShots.push({x:p.x+12,y:p.y+12,vy:game.rules.projectileSpeed,r:4});
}
function hit(b,x,y,w,h){return b.x+b.r>x&&b.x-b.r<x+w&&b.y+b.r>y&&b.y-b.r<y+h}
function nextWave(){
  addScore(100+game.wave*30);game.wave++;spawnWave();
  game.transition=1.6;game.state="between";
  showBanner("WAVE "+String(game.wave).padStart(2,"0")+" · "+game.formationName);
  tone(920,.15,"triangle",.05);
}
function move(dt){
  game.time+=dt;
  player.hurt=Math.max(0,player.hurt-dt);
  player.rapid=Math.max(0,player.rapid-dt);
  player.fireCooldown=Math.max(0,player.fireCooldown-dt);
  game.shake=Math.max(0,game.shake-35*dt);
  game.flash=Math.max(0,game.flash-dt);
  game.grace=Math.max(0,game.grace-dt);
  if(game.bannerTimer>0){game.bannerTimer-=dt;if(game.bannerTimer<=0)ui.banner.classList.remove("on")}
  for(let i=game.fx.length-1;i>=0;i--){
    const p=game.fx[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=150*dt;p.left-=dt;
    if(p.left<=0)game.fx.splice(i,1);
  }
  if(game.state==="between"){game.transition-=dt;if(game.transition<=0)game.state="playing";return}
  if(game.state!=="playing")return;
  const dir=Number(held.right)-Number(held.left);
  player.x=clamp(player.x+dir*240*dt,25,W-25);
  player.moveAnimation+=dt*(dir?8:5);
  if(held.fire)fire();
  const live=game.invaders.filter(e=>e.alive);
  const speed=game.rules.speed*(1+(1-live.length/game.startCount)*.72);
  game.gridX+=game.direction*speed*dt;
  if(live.length){
    const xs=live.map(xy),left=Math.min(...xs.map(p=>p.x)),right=Math.max(...xs.map(p=>p.x+24));
    if((game.direction>0&&right>W-14)||(game.direction<0&&left<14)){
      game.gridX+=game.direction>0?W-14-right:14-left;
      game.direction*=-1;game.gridY+=game.rules.drop;
      tone(180,.025,"square",.01);
    }
    shatterOnContact(live);
    if(xs.some(p=>p.y+INVADER_H>=ICE_LINE_Y)){
      end("The invaders crossed the ice line. Protect it next time!");return
    }
  }
  game.fireClock-=dt;
  if(game.fireClock<=0&&game.grace<=0){
    enemyFire();game.fireClock=game.rules.volleyTime*rand(.85,1.15);
  }
  game.specialClock-=dt;
  if(game.specialClock<=0&&!game.special){
    game.special={x:-35,y:35,vx:rand(60,85)};
    game.specialClock=rand(17,23);
  }
  if(game.special){game.special.x+=game.special.vx*dt;if(game.special.x>W+42)game.special=null}
  for(let i=game.shots.length-1;i>=0;i--){
    const b=game.shots[i];b.y+=b.vy*dt;
    if(b.y<-8){game.shots.splice(i,1);continue}
    let used=false;
    if(game.special&&hit(b,game.special.x-17,game.special.y-14,34,30)){
      particle(game.special.x,game.special.y,"#ffd57a",20);
      game.special=null;addScore(175);player.rapid=7;showBanner("RAPID FIRE!");
      tone(1050,.14,"triangle",.07);used=true;
    }
    if(!used)for(const e of game.invaders){
      if(!e.alive)continue;const p=xy(e);
      if(hit(b,p.x,p.y,24,25)){
        e.alive=false;used=true;addScore(e.points);
        particle(p.x+12,p.y+12,"#d9a764",12);tone(500+e.points*6,.06,"triangle",.04);
        break;
      }
    }
    if(!used)for(const f of game.forts){
      if(f.hp<=0)continue;
      if(hit(b,f.x,f.y,13,13)){f.hp--;used=true;particle(b.x,b.y,"#b1dae7",4);break}
    }
    if(used)game.shots.splice(i,1);
  }
  for(let i=game.enemyShots.length-1;i>=0;i--){
    const b=game.enemyShots[i];b.y+=b.vy*dt;
    if(b.y>H+8){game.enemyShots.splice(i,1);continue}
    let used=false;
    for(const f of game.forts){
      if(f.hp<=0)continue;
      if(hit(b,f.x,f.y,13,13)){f.hp--;used=true;particle(b.x,b.y,"#b1dae7",4);break}
    }
    if(!used&&player.hurt<=0&&hit(b,player.x-15,player.y-15,30,31)){
      damagePlayer();used=true;
    }
    if(used)game.enemyShots.splice(i,1);
  }
  if(game.state==="playing"&&!game.invaders.some(e=>e.alive))nextWave();
}
function draw(){
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,W,H);
  if(game.shake)ctx.translate(Math.round(rand(-game.shake,game.shake)),Math.round(rand(-game.shake,game.shake)));
  background();
  // Subtle lane markers, drawn beneath all characters.
  ctx.fillStyle="rgba(81,147,174,.35)";
  for(let y=26;y<H-42;y+=12){ctx.fillRect(9,y,2,4);ctx.fillRect(W-11,y,2,4);}
  for(const f of game.forts)fort(f);
  if(game.special){
    sprite("boss",Math.floor(game.time*5)%4,2,game.special.x,game.special.y,158);
    ctx.fillStyle="#f2bc4e";ctx.fillRect(Math.round(game.special.x-11),Math.round(game.special.y-24),22,3);
  }
  for(const e of game.invaders){
    if(!e.alive)continue;const p=xy(e);
    const animation=(Math.floor(game.time*6)+e.variant)%6;
    sprite(e.type,animation,game.direction>0?2:1,p.x+INVADER_W/2,p.y+INVADER_H/2,104);
  }
  for(const b of game.shots)projectile(b.x,b.y);
  for(const b of game.enemyShots)projectile(b.x,b.y,true);
  const blinking=player.hurt>0&&Math.floor(player.hurt*12)%2===0;
  if(!blinking){
    sprite(Number(held.left)||Number(held.right)?"defenderMove":"defenderIdle",
      Math.floor(player.moveAnimation)%4,
      held.left?1:held.right?2:0,player.x,player.y,168);
  }
  if(player.rapid>0){ctx.strokeStyle="#e2af35";ctx.lineWidth=2;ctx.strokeRect(player.x-17,player.y-22,34,37);}
  for(const p of game.fx){ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.sz,p.sz)}
  if(game.flash){ctx.fillStyle="rgba(244,78,78,.2)";ctx.fillRect(0,0,W,H)}
  ctx.restore();
}
function load(){
  failed=false;ready=false;ui.asset.hidden=false;ui.asset.textContent="Loading Christmas sprites…";
  ui.primary.disabled=true;ui.primary.textContent="LOADING CHRISTMAS…";
  const entries=Object.entries(ASSETS);
  Promise.all(entries.map(([name,url])=>new Promise((resolve,reject)=>{
    const img=new Image();img.decoding="async";
    img.onload=()=>{
      // Prevent an apparently working game from silently using blank art.
      if(img.naturalWidth<128||img.naturalHeight<128)return reject(new Error(name+" invalid dimensions"));
      images[name]=img;resolve();
    };
    img.onerror=()=>reject(new Error(name+" failed to load"));
    img.src=url;
  }))).then(()=>{
    ready=true;failed=false;ui.asset.hidden=true;renderHeroPreview();openPanel("ready");draw();
  }).catch(error=>{
    failed=true;ready=false;ui.asset.textContent="Asset load failed — retry in menu";
    console.error("Santa Invaders: required game art did not load",error);
    openPanel("ready");
  });
}
function bindHeld(id,key){
  const el=$(id);
  el.addEventListener("pointerdown",e=>{
    e.preventDefault();if(game.state!=="playing")return;
    el.setPointerCapture(e.pointerId);held[key]=true;el.classList.add("down");if(key==="fire")fire();
  });
  for(const type of ["pointerup","pointercancel","lostpointercapture"])
    el.addEventListener(type,()=>{held[key]=false;el.classList.remove("down")});
}
bindHeld("moveLeft","left");bindHeld("moveRight","right");bindHeld("fire","fire");
document.addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  if(["arrowleft","arrowright","a","d"," ","enter","p","escape"].includes(k))e.preventDefault();
  if(k==="arrowleft"||k==="a")held.left=true;
  if(k==="arrowright"||k==="d")held.right=true;
  if(k===" ")held.fire=true;
  if(!e.repeat&&(k==="escape"||k==="p")){
    if(game.state==="paused")resume();
    else if(game.state==="playing"||game.state==="between")pause();
  }
  if(k==="enter"&&game.state==="ready"&&ready)begin();
});
document.addEventListener("keyup",e=>{
  const k=e.key.toLowerCase();
  if(k==="arrowleft"||k==="a")held.left=false;
  if(k==="arrowright"||k==="d")held.right=false;
  if(k===" ")held.fire=false;
});
window.addEventListener("blur",()=>{release();pause()});
document.addEventListener("visibilitychange",()=>{if(document.hidden){release();pause()}});
let drag=null;
canvas.addEventListener("pointerdown",e=>{
  if(game.state!=="playing")return;
  drag={id:e.pointerId,start:e.clientX,original:player.x};
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove",e=>{
  if(!drag||e.pointerId!==drag.id||game.state!=="playing")return;
  const rect=canvas.getBoundingClientRect(),scale=Math.min(rect.width/W,rect.height/H);
  player.x=clamp(drag.original+(e.clientX-drag.start)/Math.max(.1,scale),25,W-25);
});
for(const type of ["pointerup","pointercancel","lostpointercapture"])
  canvas.addEventListener(type,()=>drag=null);
$("menuButton").addEventListener("click",()=>{
  if(game.state==="playing"||game.state==="between")pause();
  else if(game.state==="paused")resume();
});
ui.primary.addEventListener("click",()=>{
  if(game.state==="ready"){if(ready)begin();else if(failed)load()}
  else if(game.state==="over")begin();
  else if(game.state==="paused")resume();
  else if(game.state==="help")openPanel(game.returnTo);
});
ui.secondary.addEventListener("click",()=>{
  if(game.state==="ready"){game.returnTo="ready";openPanel("help")}
  else if(game.state==="paused")begin();
});
ui.sound.addEventListener("click",()=>{
  soundOn=!soundOn;
  try{localStorage.setItem("gamebox-santa-invaders-sound",soundOn?"on":"off")}catch(e){}
  ui.sound.textContent=soundOn?"SOUND ON":"SOUND OFF";
  if(soundOn)tone(660,.09,"triangle");
});
spawnWave();openPanel("ready");load();
let previous=0;
function frame(now){
  const dt=previous?Math.min(.033,(now-previous)/1000):0;previous=now;
  if(game.state==="playing"||game.state==="between")move(dt);
  draw();requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();