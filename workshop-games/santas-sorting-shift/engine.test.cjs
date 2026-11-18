const test=require("node:test");
const assert=require("node:assert/strict");
const {SortingShift,config,MAX_SHIFT}=require("./engine.js");

test("conveyor starts briskly, accelerates further, and Express is unlocked from Shift 1",()=>{
 assert.equal(MAX_SHIFT,12);
 assert.ok(config(1).speed>=100,"the opening belt must not feel slow");
 assert.ok(config(1).interval<=1.4,"opening parcels should appear frequently");
 assert.ok(config(12).speed>config(1).speed);
 assert.ok(config(12).interval<config(1).interval);
 for(let level=1;level<=MAX_SHIFT;level++)assert.equal(config(level).express,true);
});
test("moving parcels can be lifted, held still, and released",()=>{
 const g=new SortingShift(()=>.4).start(1),item=g.spawn("gift");
 assert.equal(g.hold(item.id),item);
 g.step(.05);assert.equal(item.x,-31);
 g.release(item.id);g.step(.05);assert.ok(item.x>-31);
});
test("correct drop increments quota, streak, and score",()=>{
 const g=new SortingShift(()=>.4).start(1);
 const one=g.spawn("gift");assert.equal(g.sort(one.id,"gift").type,"correct");
 const two=g.spawn("coal");assert.equal(g.sort(two.id,"coal").type,"correct");
 assert.equal(g.sorted,2);assert.equal(g.streak,2);assert.equal(g.score,215);
});
test("wrong drop consumes a chance, missed parcel consumes a chance",()=>{
 const g=new SortingShift(()=>.4).start(1);
 const first=g.spawn("gift");g.sort(first.id,"coal");
 assert.equal(g.lives,2);assert.equal(g.streak,0);
 const second=g.spawn("coal");second.x=380;
 g.step(.02);assert.equal(g.lives,1);assert.ok(!g.items.includes(second));
});
test("three errors ends the shift with failure",()=>{
 const g=new SortingShift(()=>.4).start(1);
 for(let i=0;i<3;i++)g.sort(g.spawn("coal").id,"gift");
 assert.equal(g.status,"failed");
});
test("quota completion grants bonus, locks state and blocks extra sorts",()=>{
 const g=new SortingShift(()=>.4).start(1);
 for(let i=0;i<g.rule.quota;i++)g.sort(g.spawn("gift").id,"gift");
 assert.equal(g.status,"cleared");const points=g.score;
 assert.equal(g.sort(g.spawn("coal").id,"coal").type,"ignored");
 g.step(.05);assert.equal(g.score,points);
});
test("time only advances while running, and expiration fails unfinished shift",()=>{
 const g=new SortingShift(()=>.4).start(1);g.pause();g.step(.05);
 assert.equal(g.timeLeft,47);g.resume();
 for(let i=0;i<950;i++)g.step(.05);
 assert.equal(g.status,"failed");
});
test("Express parcels spawn and score correctly in the first shift",()=>{
 const first=new SortingShift(()=>.01).start(1);
 assert.equal(first.choose(),"express");
 const special=first.spawn();
 assert.equal(special.type,"express");
 assert.equal(first.sort(special.id,"express").type,"correct");
 assert.equal(first.score,160);
});
test("Express appears by the third parcel even if random rolls avoid specials",()=>{
 const g=new SortingShift(()=>.5).start(1);
 const types=[g.spawn().type,g.spawn().type,g.spawn().type];
 assert.deepEqual(types,["gift","gift","express"]);
});
test("invalid destination does not consume the parcel",()=>{
 const g=new SortingShift(()=>.4).start(1),item=g.spawn("gift");
 assert.equal(g.sort(item.id,"unknown").type,"ignored");
 assert.equal(g.items.length,1);assert.equal(g.lives,3);
});
