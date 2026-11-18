/* Chimney Drop-In — deterministic endless vertical avoidance game engine. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.ChimneyEngine=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const W=360, Y=180, R=12;
 const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
 function hash(n,seed=1){let x=(Math.imul((n|0)+31,374761393)^Math.imul(seed+17,668265263))|0;x=Math.imul(x^(x>>>13),1274126177);return((x^(x>>>16))>>>0)/4294967296;}
 function passage(d,seed=1){
   const p=Math.max(0,d)/165, i=Math.floor(p),t=p-i, s=t*t*(3-2*t);
   const center0=155+hash(i,seed)*50, center1=155+hash(i+1,seed)*50;
   const center=center0+(center1-center0)*s;
   const n0=hash(i+45,seed),n1=hash(i+46,seed);
   const width=228+28*(n0+(n1-n0)*s)-((Math.floor(i/3)%4===2)?35*Math.sin(Math.PI*t):0);
   return {left:center-width/2,right:center+width/2,center,width};
 }
 const difficulty=d=>({speed:139+Math.min(116,d*.032),interval:Math.max(126,235-d*.055)});
 class ChimneyDrop {
   constructor(seed=7,rng){
     this.seed=Number.isFinite(seed)?seed:7;
     this.rng=rng||(()=>hash(this.nextId*29+Math.floor(this.nextDepth),this.seed));
     this.reset();
   }
   reset(){
     this.status="ready";this.x=180;this.vx=0;this.distance=0;this.score=0;this.time=0;
     this.health=3;this.bestCombo=0;this.combo=0;this.collected={cookie:0,milk:0,gift:0};
     this.shield=0;this.boost=0;this.invincible=0;this.entities=[];this.nextId=1;
     this.nextDepth=365;this.input={left:false,right:false,target:null};this.events=[];this.speed=139;
     return this;
   }
   start(){this.reset();this.status="playing";return this;}
   pause(){if(this.status==="playing")this.status="paused";}
   resume(){if(this.status==="paused")this.status="playing";}
   steer(direction){this.input.left=direction==="left";this.input.right=direction==="right";}
   setTarget(x){this.input.target=x===null?null:clamp(x,0,W);}
   add(kind,depth,x,more={}){
     const e={id:this.nextId++,kind,depth,x,phase:hash(this.nextId*7,this.seed)*Math.PI*2,...more};
     this.entities.push(e);return e;
   }
   generate(){
     const id=this.nextId,depth=this.nextDepth;
     const P=passage(depth,this.seed),diff=difficulty(depth),r=hash(id*17,this.seed),safe=hash(id*13,this.seed)>0.5?1:-1;
     const hazardLane=Math.min(2,Math.floor(hash(id*43+17,this.seed)*3));
     const freeLane=(hazardLane+1+(hash(id*71+23,this.seed)>.52?1:0))%3;
     const laneX=index=>P.center+(index-1)*P.width*.265;
     const lane=clamp(laneX(freeLane),P.left+42,P.right-42);
     const danger=clamp(laneX(hazardLane),P.left+38,P.right-38);
     const sector=Math.floor(depth/150);
     if(sector>1 && sector%8===6 && r<.48){
       this.add("ledge",depth,0,{side:r<.24?"left":"right",reach:34+hash(id*9,this.seed)*26});
     }else if(r<.27){
       this.add("ember",depth,danger);
       if(depth>950&&r<.12)this.add("ember",depth+42,clamp(danger+safe*24,P.left+30,P.right-30),{small:true});
     }else if(r<.5&&depth>450){
       this.add("wreath",depth,danger,{sway:16+hash(id+8,this.seed)*11});
     }else if(r<.69&&depth>1200){
       this.add("bauble",depth,danger,{sway:12});
     }else if(r<.85){
       this.add("embers",depth,danger,{sway:7});
     }
     // Safe collectibles on a different lane, away from hazards.
     if(id%3===0||r>.68){
       const k=(id%9===0)?"milk":(id%6===0?"gift":"cookie");
       this.add(k,depth+(r<.3?15:0),lane);
     }
     this.nextDepth+=diff.interval+(hash(id*31,this.seed)-.5)*38;
   }
   advance(dt){
     if(this.status!=="playing")return [];
     dt=clamp(Number(dt)||0,0,.05);
     this.time+=dt;
     this.shield=Math.max(0,this.shield-dt);
     this.boost=Math.max(0,this.boost-dt);
     this.invincible=Math.max(0,this.invincible-dt);
     const axis=Number(this.input.right)-Number(this.input.left);
     if(this.input.target!==null){
       const delta=this.input.target-this.x;
       const v=clamp(delta*8,-330,330);
       this.vx+=(v-this.vx)*Math.min(1,dt*14);
     }else {
       const desired=axis*292;
       this.vx+=(desired-this.vx)*Math.min(1,dt*(axis?13:10));
     }
     this.x+=this.vx*dt;
     this.speed=difficulty(this.distance).speed*(this.boost>0?1.30:1);
     this.distance+=this.speed*dt;
     const bounds=passage(this.distance,this.seed);
     const min=bounds.left+R+3,max=bounds.right-R-3;
     if(this.x<min||this.x>max){
       this.x=clamp(this.x,min,max);this.vx=0;
       this.damage("wall");
     }
     // Lengthen the procedural world ahead of camera before every update.
     while(this.nextDepth<this.distance+560)this.generate();
     for(const e of this.entities){
       const dy=e.depth-this.distance;
       if(dy>37||dy< -39)continue;
       if(e.used)continue;
       const ex=e.x+((e.sway||0)*Math.sin(this.time*2.25+e.phase));
       if(e.kind==="ledge"){
         const p=passage(e.depth,this.seed),edge=e.side==="left"?p.left+e.reach:p.right-e.reach;
         const crash=e.side==="left" ? this.x-R<edge : this.x+R>edge;
         if(Math.abs(dy)<18&&crash){this.damage("ledge");e.used=true;}
       }else{
         const rr=e.kind==="wreath"?19:e.kind==="bauble"?16:e.kind==="ember"||e.kind==="embers"?13:e.kind==="gift"?15:17;
         if(Math.hypot(this.x-ex,dy)<R+rr-3){
           e.used=true;
           if(["ember","embers","wreath","bauble"].includes(e.kind))this.damage(e.kind);
           else this.collect(e.kind);
         }
       }
     }
     this.entities=this.entities.filter(e=>!e.used&&e.depth>this.distance-95);
     this.score=Math.max(this.score,Math.floor(this.distance/8)+this.bonus);
     return this.consume();
   }
   collect(kind){
     this.collected[kind]++;
     this.combo++;this.bestCombo=Math.max(this.combo,this.bestCombo);
     let points=kind==="cookie"?80:kind==="milk"?95:140;
     points+=Math.min(10,this.combo)*10;
     this.bonus+=points;
     if(kind==="cookie")this.shield=Math.max(this.shield,6.5);
     if(kind==="milk")this.boost=Math.max(this.boost,5.0);
     this.events.push({type:"collect",kind,points,combo:this.combo});
   }
   damage(kind){
     if(this.invincible>0)return false;
     if(this.shield>0){
       this.shield=0;this.invincible=.65;
       this.events.push({type:"blocked",kind});return false;
     }
     this.health--;this.combo=0;this.invincible=1.4;
     this.events.push({type:"hit",kind,health:this.health});
     if(this.health<=0){
       this.status="over";
       this.events.push({type:"over",score:this.score,meters:Math.floor(this.distance/10)});
     }
     return true;
   }
   consume(){const result=this.events;this.events=[];return result;}
 }
 // Fix reset's dynamic score source separately from score so distance always increases.
 const originalReset=ChimneyDrop.prototype.reset;
 ChimneyDrop.prototype.reset=function(){originalReset.call(this);this.bonus=0;return this;};
 return {ChimneyDrop,passage,difficulty,hash,W,Y,R};
});