(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;root.SnowballEngine=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
// Side-on Christmas shooting gallery: presents stay on their shelves until enough
// actual, localised impact energy knocks them off. No magical radius clears.
const W=420,H=640,START={x:210,y:575},SHELF_Y=[433,352,271];
const TYPES=Object.freeze({
 light:{mass:1,needed:0.9,size:39,color:"red",points:100},
 medium:{mass:1.9,needed:1.85,size:45,color:"green",points:200},
 heavy:{mass:3.1,needed:2.85,size:51,color:"blue",points:350}
});
const PATTERNS=[
 [["light","light","light"]],
 [["light","medium","light"]],
 [["light","light","medium","light"]],
 [["light","medium","light"],["light","light"]],
 [["medium","light","medium"],["light","light"]],
 [["light","heavy","light"],["medium","light"]],
 [["light","medium","light","medium"],["light","light"]],
 [["medium","light","heavy","light"],["medium","light"]],
 [["light","heavy","medium","light"],["light","medium","light"]],
 [["medium","medium","light","heavy"],["light","light","medium"]],
 [["light","heavy","light","medium","light"],["medium","light","medium"]],
 [["medium","light","heavy","light","medium"],["light","medium","light"]]
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function makeLevel(level){
 const n=Math.max(1,Math.floor(level||1)),rows=PATTERNS[(n-1)%PATTERNS.length],cycle=Math.floor((n-1)/PATTERNS.length);
 const gifts=[];
 rows.forEach((r,row)=>{
  const pitch=r.length>=6?56:60;
  r.forEach((type,i)=>{
   const spec=TYPES[type],x=210+(i-(r.length-1)/2)*pitch,y=SHELF_Y[row]-spec.size/2-1;
   gifts.push({id:row*10+i,x,y,baseX:x,baseY:y,row,type,color:spec.color,mass:spec.mass,
    size:spec.size,needed:spec.needed,damage:0,wobble:0,angle:0,vx:0,vy:0,
    spin:0,fallen:false,cleared:false,age:0,collided:[],points:spec.points});
  });
 });
 const required=gifts.reduce((n,g)=>n+Math.ceil(g.needed/1.05),0);
 // Every arrangement is possible with direct hits and at least one spare ball.
 const shots=required+Math.max(2,Math.floor(gifts.length/3))-Math.min(cycle,1);
 return {level:n,gifts,balls:shots,initialBalls:shots,ball:null,events:[],won:false,failed:false,
         used:0,clock:0,score:0,aim:{x:210,y:350}};
}
function launch(s,x,y){
 if(s.ball||s.balls<=0||s.won||s.failed||s.gifts.every(g=>g.fallen||g.cleared))return false;
 let dx=x-START.x,dy=y-START.y,d=Math.hypot(dx,dy);
 if(d<9||dy>=-20)return false;
 dx/=d;dy/=d;
 s.ball={x:START.x,y:START.y,vx:dx*920,vy:dy*920,r:11,age:0,trail:[]};
 s.balls--;s.used++;return true;
}
function knockOff(s,g,vx,vy,source){
 if(g.fallen||g.cleared)return false;
 g.fallen=true;g.age=0;g.wobble=0;
 // Horizontal impulse is from the actual impact; a head-on shot also pushes
 // the gift *backwards* off the shallow display shelf, modelled as a tumble.
 const side=Math.abs(vx)>45?Math.sign(vx):(g.x<210?-1:1);
 g.vx=side*(88/g.mass+18)+clamp(vx*.08,-35,35);
 g.vy=-105/g.mass-30;
 g.spin=side*(3.4/g.mass+1);
 s.events.push({kind:"topple",x:g.x,y:g.y,type:g.type,source});
 return true;
}
function applyImpact(s,g,vx,vy,power=1,source="snowball"){
 if(!g||g.fallen||g.cleared)return false;
 const n=clamp(power,0,1.2);
 g.damage=Math.min(g.needed,g.damage+n);
 g.wobble=Math.min(1.1,g.wobble+n*.8);
 s.events.push({kind:"impact",x:g.x,y:g.y,type:g.type,source,remaining:Math.max(0,g.needed-g.damage)});
 if(g.damage+1e-5>=g.needed)return knockOff(s,g,vx,vy,source);
 return false;
}
function intersects(b,g){
 const half=g.size*.48;
 const qx=clamp(b.x,g.x-half,g.x+half),qy=clamp(b.y,g.y-half,g.y+half);
 return (b.x-qx)**2+(b.y-qy)**2<=(b.r)**2;
}
function step(s,dt){
 dt=clamp(dt,0,.033);s.clock+=dt;s.events=[];
 if(s.ball){
  const b=s.ball,sub=dt/4;
  for(let k=0;k<4&&s.ball;k++){
   b.age+=sub;b.trail.push([b.x,b.y]);if(b.trail.length>6)b.trail.shift();
   b.x+=b.vx*sub;b.y+=b.vy*sub;
   const contacts=s.gifts.filter(g=>!g.fallen&&!g.cleared&&intersects(b,g));
   if(contacts.length){
    contacts.sort((a,c)=>Math.hypot(b.x-a.x,b.y-a.y)-Math.hypot(b.x-c.x,b.y-c.y));
    const target=contacts[0]; // one ball transfers its momentum to ONE gift
    const centreDistance=Math.abs(b.x-target.x)/(target.size*.5+ b.r);
    const strength=clamp(1.13-centreDistance*.17,.92,1.13);
    applyImpact(s,target,b.vx,b.vy,strength,"snowball");
    s.events.push({kind:"snow",x:b.x,y:b.y});
    s.ball=null;break;
   }
   // No ricochets, invisible obstacles, or back-wall collision assists.
   if(b.y<190||b.x<-15||b.x>W+15||b.age>2){s.ball=null;break;}
  }
 }
 for(const g of s.gifts){
  if(g.cleared)continue;
  if(!g.fallen){
   g.wobble*=Math.exp(-7*dt);
   g.angle=Math.sin(s.clock*24)*g.wobble*.16;
   continue;
  }
  g.age+=dt;g.x+=g.vx*dt;g.y+=g.vy*dt;
  g.vy+=525*dt;g.vx*=Math.exp(-.75*dt);
  g.angle+=g.spin*dt;
  // Contacts must overlap spatially *and* have actual remaining momentum.
  // At most one contact impulse per distinct pair, no recursive explosions.
  for(const n of s.gifts){
   if(n===g||n.row!==g.row||n.fallen||n.cleared||g.collided.includes(n.id))continue;
   const distX=Math.abs(g.x-n.x),distY=Math.abs(g.y-n.y);
   if(distX<(g.size+n.size)*.46&&distY<(g.size+n.size)*.43){
    g.collided.push(n.id);
    const transferred=Math.min(.9,Math.abs(g.vx)/170*g.mass/n.mass);
    if(transferred>.18){
      applyImpact(s,n,g.vx,g.vy,transferred,"contact");
      g.vx*=.52;
    }
   }
  }
  if(g.y>505||g.x<-g.size||g.x>W+g.size||g.age>2.2){
   g.cleared=true;s.score+=g.points;s.events.push({kind:"clear",x:clamp(g.x,20,400),y:clamp(g.y,200,500),type:g.type});
  }
 }
 if(!s.ball&&!s.won&&!s.failed&&!s.gifts.some(g=>g.fallen&&!g.cleared)){
  if(s.gifts.every(g=>g.cleared)){
   s.won=true;s.score+=s.balls*150;s.events.push({kind:"win",x:210,y:320});
  }else if(s.balls===0){s.failed=true;s.events.push({kind:"lose",x:210,y:320});}
 }
 return s;
}
function stars(s){return !s.won?0:s.balls>=2?3:s.balls>=1?2:1;}
return {W,H,START,SHELF_Y,TYPES,PATTERNS,makeLevel,launch,step,applyImpact,intersects,stars};
});
