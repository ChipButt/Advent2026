/* Santa's Present Stack — original Stack Attack-inspired arcade engine.
   Deterministic core, independent of canvas or DOM for regression testing. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.PresentStackEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const COLS=10, ROWS=11, W=.68, H=.86;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class Game {
 constructor(random=Math.random){this.random=random;this.reset();}
 reset(){
  this.board=Array.from({length:ROWS},()=>Array(COLS).fill(0));
  [0,1,3,6,8].forEach((c,i)=>this.board[ROWS-1][c]=1+i%5);
  this.player={x:4.13,y:ROWS-H,vy:0,grounded:true,face:1,walk:0,invulnerable:0};
  this.incoming=[];this.score=0;this.lines=0;this.level=1;this.lives=3;
  this.spawnWait=1.9;this.fallWait=0;this.pushWait=0;this.status='playing';this.events=[];
 }
 event(type,details={}){this.events.push(Object.assign({type},details));}
 drainEvents(){return this.events.splice(0);}
 hitBox(x,y){
  if(x<0||x>=COLS||y<0||y>=ROWS)return false;
  const kind=this.board[y][x];
  if(!kind)return false;
  this.board[y][x]=0;this.score+=20;this.event('smash',{x,y,kind});
  return true;
 }
 blockAt(x,y){
  const l=Math.floor(x+.07),r=Math.floor(x+W-.07);
  const t=Math.floor(y+.06),b=Math.floor(y+H-.06);
  for(let row=Math.max(0,t);row<=Math.min(ROWS-1,b);row++){
   for(let col=Math.max(0,l);col<=Math.min(COLS-1,r);col++){
    if(this.board[row][col])return {x:col,y:row};
   }
  }
  return null;
 }
 tryPush(x,y,dir){
  const target=x+dir;
  if(this.pushWait>0||target<0||target>=COLS||this.board[y][target])return false;
  if(this.incoming.some(v=>v.col===target&&v.y+1>y&&v.y<y+1))return false;
  const kind=this.board[y][x];
  if(!kind)return false;
  this.board[y][target]=kind;this.board[y][x]=0;this.pushWait=.14;
  this.score+=5;this.event('push',{x:target,y,kind});
  return true;
 }
 loseLife(){
  const p=this.player;
  if(p.invulnerable>0||this.status!=='playing')return;
  this.lives--;this.event('hit',{x:p.x+.35,y:p.y});
  if(this.lives<=0){this.end('out-of-hearts');return;}
  p.invulnerable=1.8;
  p.vy=-5.8;
  p.x=clamp(p.x,0,COLS-W);
  this.event('hurt');
 }
 end(reason){
  if(this.status==='over')return;
  this.status='over';this.event('over',{reason});
 }
 overlapPlayer(x,y){
  const p=this.player;
  return x<p.x+W-.08 && x+1>p.x+.08 && y<p.y+H-.08 && y+1>p.y+.08;
 }
 movePlayer(dt,input){
  const p=this.player;
  const direction=(input.right?1:0)-(input.left?1:0);
  if(direction)p.face=direction;
  if(input.jump&&p.grounded){p.vy=-10.7;p.grounded=false;this.event('jump');}
  const dx=direction*4.15*dt;
  if(direction){
   const count=Math.max(1,Math.ceil(Math.abs(dx)/.11)),step=dx/count;
   for(let i=0;i<count;i++){
    const nx=clamp(p.x+step,0,COLS-W);
    const b=this.blockAt(nx,p.y);
    if(b){
     if(this.tryPush(b.x,b.y,direction)&&!this.blockAt(nx,p.y))p.x=nx;
     else break;
    }else p.x=nx;
   }
   if(p.grounded)p.walk+=dt*11;
  }
  // Vertical movement uses small substeps to avoid tunnelling through gifts.
  p.vy=Math.min(13,p.vy+25*dt);
  const dy=p.vy*dt,steps=Math.max(1,Math.ceil(Math.abs(dy)/.1));
  p.grounded=false;
  for(let i=0;i<steps;i++){
   const ny=p.y+dy/steps;
   if(ny>=ROWS-H){p.y=ROWS-H;p.vy=0;p.grounded=true;break;}
   if(ny<0){p.y=0;p.vy=0;break;}
   const b=this.blockAt(p.x,ny);
   if(!b){p.y=ny;continue;}
   if(p.vy<0){
    this.hitBox(b.x,b.y);
    p.vy=0;
   }else{
    p.y=b.y-H;p.vy=0;p.grounded=true;
   }
   break;
  }
  if(p.grounded&&direction===0)p.walk=0;
 }
 settleBoard(){
  for(let r=ROWS-2;r>=0;r--)for(let c=0;c<COLS;c++){
   if(this.board[r][c] && !this.board[r+1][c]){
    // Falling gifts can land on the elf.
    if(this.overlapPlayer(c,r+1))this.loseLife();
    this.board[r+1][c]=this.board[r][c];this.board[r][c]=0;
   }
  }
  this.clearRows();
 }
 clearRows(){
  let cleared=0;
  for(let r=ROWS-1;r>=0;r--)if(this.board[r].every(Boolean)){
   this.board.splice(r,1);this.board.unshift(Array(COLS).fill(0));cleared++;r++;
  }
  if(cleared){
   this.lines+=cleared;this.level=1+Math.floor(this.lines/4);
   const points=150*cleared*cleared*this.level;this.score+=points;
   this.event('clear',{count:cleared,points});
  }
 }
 launchGift(){
  const occupied=new Set(this.incoming.map(b=>b.col));
  const choices=[];
  for(let c=0;c<COLS;c++)if(!occupied.has(c))choices.push(c);
  if(!choices.length)return;
  // Prefer lower columns slightly, but keep a natural random spread.
  const weights=choices.map(c=>{
   let height=0;
   for(let r=0;r<ROWS;r++)if(this.board[r][c]){height=ROWS-r;break;}
   return Math.max(1,6-height);
  });
  let roll=this.random()*weights.reduce((a,b)=>a+b,0),col=choices[0];
  for(let i=0;i<choices.length;i++){roll-=weights[i];if(roll<=0){col=choices[i];break;}}
  const kind=1+Math.floor(this.random()*6);
  this.incoming.push({col,y:-1.08,kind});
  this.event('drop',{x:col});
 }
 updateIncoming(dt){
  const speed=Math.min(9,2.55+(this.level-1)*.45);
  for(let i=this.incoming.length-1;i>=0;i--){
   const box=this.incoming[i];box.y+=speed*dt;
   if(this.overlapPlayer(box.col,box.y))this.loseLife();
   let firstOccupied=ROWS;
   for(let r=0;r<ROWS;r++)if(this.board[r][box.col]){firstOccupied=r;break;}
   const landing=firstOccupied-1;
   if(box.y+1>=firstOccupied){
    this.incoming.splice(i,1);
    if(landing<0){this.end('stack-overflow');continue;}
    this.board[landing][box.col]=box.kind;
    this.event('land',{x:box.col,y:landing,kind:box.kind});
    this.clearRows();
   }
  }
 }
 step(dt,input={}){
  if(this.status!=='playing')return;
  dt=clamp(Number.isFinite(dt)?dt:0,0,.04);
  this.player.invulnerable=Math.max(0,this.player.invulnerable-dt);
  this.pushWait=Math.max(0,this.pushWait-dt);
  this.movePlayer(dt,input);
  this.fallWait+=dt;
  while(this.fallWait>=.115){this.fallWait-=.115;this.settleBoard();}
  this.updateIncoming(dt);
  if(this.status==='over')return;
  this.spawnWait-=dt;
  if(this.spawnWait<=0){
   if(this.incoming.length<2)this.launchGift();
   this.spawnWait=Math.max(.64,2.1-(this.level-1)*.13)+(this.random()*.32);
  }
 }
}
return {Game,COLS,ROWS,W,H};
});
