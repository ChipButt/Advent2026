const test=require("node:test"),assert=require("node:assert/strict");
const {ChimneyDrop,passage,difficulty}=require("./engine.js");
const G=()=>new ChimneyDrop(4129).start();
test("chimney walls are smoothly varying and always leave a passable opening",()=>{
 let previous=passage(0,4129);
 for(let d=15;d<20000;d+=15){
   const p=passage(d,4129);
   assert.ok(p.left>25&&p.right<334,JSON.stringify({d,p}));
   assert.ok(p.width>150,"fair passage width");
   assert.ok(Math.abs(previous.center-p.center)<20,"no teleporting horizontal shafts");
   previous=p;
 }
});
test("the chimney descends indefinitely and generates several distinct obstacles",()=>{
 const g=G();
 for(let i=0;i<1200;i++)g.advance(.05);
 assert.ok(g.distance>0);
 assert.ok(g.nextId>=4,"objects generated");
 assert.ok(g.nextDepth>g.distance);
});
test("touch steering and held keyboard inputs move Santa to his selected lane",()=>{
 const g=G(),x=g.x;g.input.left=true;for(let i=0;i<9;i++)g.advance(.05);
 assert.ok(g.x<x,"left steering");
 g.input.left=false;g.setTarget(240);for(let i=0;i<11;i++)g.advance(.05);
 assert.ok(g.x>170,"drag-to-target");
 g.setTarget(null);assert.equal(g.input.target,null);
});
test("pausing freezes distance, power timers and procedural spawning",()=>{
 const g=G();g.collect("cookie");g.pause();
 const d=g.distance,n=g.nextId,t=g.shield;
 for(let i=0;i<30;i++)g.advance(.05);
 assert.equal(g.distance,d);assert.equal(g.shield,t);assert.equal(g.nextId,n);
 g.resume();g.advance(.05);assert.ok(g.distance>d);
});
test("cookie grants a shield which blocks one hazard with no lost heart",()=>{
 const g=G();g.collect("cookie");
 assert.equal(g.shield,6.5);
 assert.equal(g.damage("ember"),false);
 assert.equal(g.health,3);
 assert.equal(g.shield,0);
 assert.ok(g.invincible>0);
});
test("milk grants a timed 30 percent faster descent",()=>{
 const normal=G(),boosted=G();boosted.collect("milk");
 normal.advance(.05);boosted.advance(.05);
 assert.ok(boosted.distance>normal.distance*1.2);
 assert.ok(boosted.boost>4.9);
});
test("collectibles award distinct bonus scores and a consecutive combo",()=>{
 const g=G();g.collect("cookie");g.collect("milk");g.collect("gift");
 assert.deepEqual(g.collected,{cookie:1,milk:1,gift:1});
 assert.equal(g.combo,3);assert.equal(g.bestCombo,3);
 g.advance(.05);assert.ok(g.score>80+95+140);
});
test("three unshielded hits end the run; repeated hits during invulnerability do not",()=>{
 const g=G();g.damage("ember");
 assert.equal(g.health,2);
 g.damage("ember");assert.equal(g.health,2);
 g.invincible=0;g.damage("ledge");assert.equal(g.health,1);
 g.invincible=0;g.damage("wreath");assert.equal(g.status,"over");
 const depth=g.distance;g.advance(.05);assert.equal(g.distance,depth);
});
test("procedural generation is repeatable for the same seed",()=>{
 const a=G(),b=G();a.advance(.05);b.advance(.05);
 const sa=a.entities.map(({id,kind,depth,x,side,reach})=>({id,kind,depth,x,side,reach}));
 const sb=b.entities.map(({id,kind,depth,x,side,reach})=>({id,kind,depth,x,side,reach}));
 assert.deepEqual(sa,sb);
});
test("difficulty increases gradually and spawn intervals stay above threshold",()=>{
 assert.ok(difficulty(9000).speed>difficulty(0).speed);
 assert.ok(difficulty(9000).interval>=126);
});
