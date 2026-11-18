import test from "node:test";
import assert from "node:assert/strict";
import {CAPACITY,COLORS,topRun,canPour,pour,isSolved,isSorted,
        makeLevel,replayProof,difficulty,colourCounts} from "./engine.mjs";
const snapshot = b => JSON.stringify(b);
test("only top colour can pour, and only into empty/matching containers",()=>{
 const b=[[0,1,1],[1],[],[2,2,2,2]];
 assert.equal(topRun(b[0]),2);
 assert.equal(canPour(b,0,1),true);
 assert.equal(canPour(b,0,2),true);
 assert.equal(canPour(b,0,3),false);
 assert.equal(canPour(b,3,1),false);
 assert.equal(canPour(b,2,1),false);
 assert.equal(canPour(b,1,1),false);
 assert.equal(canPour(b,-1,0),false);
 assert.equal(canPour(b,0,999),false);
 const before=snapshot(b), p=pour(b,0,1);
 assert.equal(p.moved,2);
 assert.deepEqual(p.bottles,[[0],[1,1,1],[],[2,2,2,2]]);
 assert.equal(snapshot(b),before,"input must not mutate");
 assert.equal(pour(b,0,3),null);
});
test("pour stops at bottle capacity and does not overfill",()=>{
 const b=[[2,2,2,2],[2,2,2],[]],p=pour(b,0,1);
 assert.equal(p.moved,1);
 assert.deepEqual(p.bottles,[[2,2,2],[2,2,2,2],[]]);
 assert.equal(isSorted(p.bottles[1]),true);
 assert.equal(isSolved([[0,0,0,0],[1,1,1,1],[]]),true);
 assert.equal(isSolved([[0,0,0,0],[1,1],[]]),false);
});
test("every generated puzzle is deterministic, balanced, and replay-solvable",()=>{
 for(let level=1;level<=120;level++){
  const p=makeLevel(level),q=makeLevel(level),n=difficulty(level).colors;
  assert.equal(snapshot(p.bottles),snapshot(q.bottles),"unstable seed level "+level);
  assert.equal(p.bottles.length,n+2,"wrong bottle count level "+level);
  assert.ok(!isSolved(p.bottles),"already solved level "+level);
  assert.ok(p.proof.length>=20,"challenge is too simple on level "+level+": "+p.proof.length);
  assert.equal(p.minChallengeMoves,p.proof.length);
  const mixed=p.bottles.filter(b=>b.length&&new Set(b).size>=3).length;
  assert.ok(mixed>=Math.floor(n*.7),"too many trivial bottles level "+level+" mixed "+mixed+" of "+n);
  assert.ok(p.bottles.every(b=>b.length<=CAPACITY),"overcapacity level "+level);
  const counts=colourCounts(p.bottles);
  for(let c=0;c<n;c++)assert.equal(counts[c],4,"unbalanced colour "+c+" level "+level);
  assert.equal(replayProof(p),true,"proof cannot reach solved state level "+level);
  let state=p.bottles.map(b=>[...b]);
  for(const step of p.proof){
   const moved=pour(state,step.from,step.to);
   assert.ok(moved,"illegal solution step level "+level);
   assert.ok(moved.moved>=1&&moved.moved<=CAPACITY,"bad legal pour size level "+level);
   state=moved.bottles;
  }
  assert.ok(isSolved(state),"actual gameplay moves do not win level "+level);
 }
});
test("difficulty scales with an intentional high-skill tier of ten colours",()=>{
 assert.equal(difficulty(1).colors,7);
 assert.equal(difficulty(3).colors,8);
 assert.equal(difficulty(7).colors,9);
 assert.equal(difficulty(14).colors,10);
 assert.ok(difficulty(25).colors>difficulty(1).colors);
 assert.equal(difficulty(500).colors,10);
 assert.equal(COLORS.length,10);
});
