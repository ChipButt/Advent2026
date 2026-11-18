const test=require("node:test"),assert=require("node:assert/strict"),E=require("./engine.js");
function advance(s,time=2.6){for(let i=0;i<Math.ceil(time*60);i++)E.step(s,1/60);}
test("36 challenge levels contain only weighted presents; no obstacles, and sufficient snowballs",()=>{
 for(let n=1;n<=36;n++){const s=E.makeLevel(n);
  assert.ok(s.gifts.length>=3);assert.equal("barriers" in s,false);
  assert.ok(s.gifts.every(g=>E.TYPES[g.type]&&g.x>=40&&g.x<=380&&g.y>=220&&g.y<=420));
  assert.ok(s.balls>s.gifts.reduce((sum,g)=>sum+Math.ceil(g.needed/1.05),0));
  assert.equal(new Set(s.gifts.map(g=>g.id)).size,s.gifts.length);
 }
});
test("a direct hit removes just one light present, not the entire row",()=>{
 const s=E.makeLevel(1);
 assert.ok(E.launch(s,s.gifts[0].x,s.gifts[0].y));advance(s);
 assert.equal(s.gifts.filter(g=>g.cleared).length,1);
 assert.equal(s.gifts.filter(g=>!g.cleared).length,2);
 assert.equal(s.won,false);
});
test("a miss costs one snowball and never knocks a gift down",()=>{
 const s=E.makeLevel(1),before=s.balls;
 assert.equal(E.launch(s,15,280),true);advance(s);
 assert.equal(s.balls,before-1);
 assert.equal(s.gifts.filter(g=>g.fallen).length,0);
});
test("a medium present moves on its second hit, not on its first",()=>{
 const s=E.makeLevel(2),g=s.gifts.find(g=>g.type==="medium");
 assert.ok(E.launch(s,g.x,g.y));advance(s);
 assert.equal(g.fallen,false);assert.ok(g.damage>0);
 assert.ok(E.launch(s,g.x,g.y));advance(s);
 assert.equal(g.cleared,true);
});
test("a heavy present needs three separate accurate hits",()=>{
 const s=E.makeLevel(6),g=s.gifts.find(g=>g.type==="heavy");
 for(let i=0;i<2;i++){assert.ok(E.launch(s,g.x,g.y));advance(s);assert.equal(g.fallen,false);}
 assert.ok(E.launch(s,g.x,g.y));advance(s);
 assert.equal(g.cleared,true);
});
test("a neighbouring light present is not automatically defeated by a hit",()=>{
 const s=E.makeLevel(1),g=s.gifts[0],neighbour=s.gifts[1];
 E.applyImpact(s,g,0,-920,1.1);advance(s);
 assert.equal(g.cleared,true);assert.equal(neighbour.cleared,false);assert.equal(neighbour.fallen,false);
});
test("clear animation finishes before victory is awarded",()=>{
 const s=E.makeLevel(1);
 for(const g of s.gifts)E.applyImpact(s,g,0,-920,3.1);
 assert.equal(s.won,false);
 advance(s);assert.equal(s.won,true);assert.equal(E.stars(s),3);
});
test("missed final snowball causes loss after it has left the scene",()=>{
 const s=E.makeLevel(1);s.balls=1;
 assert.ok(E.launch(s,15,280));assert.equal(s.failed,false);
 advance(s);assert.equal(s.failed,true);assert.equal(s.won,false);
 assert.equal(E.launch(s,210,400),false);
});
test("invalid taps cannot fire or spend snowballs",()=>{
 const s=E.makeLevel(1),shots=s.balls;
 assert.equal(E.launch(s,210,600),false);assert.equal(s.balls,shots);
});

test("all toppled presents cannot consume surplus snowballs before the clearance animation",()=>{
 const s=E.makeLevel(1);s.gifts.forEach(g=>E.applyImpact(s,g,0,-920,3));
 const before=s.balls;assert.equal(E.launch(s,210,400),false);assert.equal(s.balls,before);
 advance(s);assert.equal(s.won,true);
});
