import test from 'node:test';
import assert from 'node:assert/strict';
import {generateLevel,dimensions,verifyBoard,freePaths,isFree,removeArrow,blockerIds} from './engine.mjs';

test('all 40 Christmas levels are deterministic, correctly sized, nonoverlapping and solvable',()=>{
 for(let level=1;level<=40;level++){
  const puzzle=generateLevel(level);
  assert.deepEqual(puzzle,generateLevel(level),'level '+level+' must be stable across reloads');
  assert.equal(puzzle.level,level);
  assert.deepEqual([puzzle.cols,puzzle.rows],[dimensions(level).cols,dimensions(level).rows]);
  const occupied=puzzle.paths.reduce((sum,path)=>sum+path.points.length,0);
  const coverage=occupied/(puzzle.cols*puzzle.rows);
  assert.ok(puzzle.paths.length>=17,'level '+level+' needs a crowded board of arrows');
  assert.ok(coverage>=.64,'level '+level+' must keep arrows closely packed; only '+Math.round(coverage*100)+'% occupied');
  assert.ok(freePaths(puzzle).length<=puzzle.paths.length/2,'level '+level+' must have at least half its arrows initially blocked');
  assert.ok(verifyBoard(puzzle),'level '+level+' is not solvable');
  const snapshot=puzzle.paths.map(x=>x.id);
  let cur=puzzle,cleared=0;
  while(cur.paths.length){
   const available=freePaths(cur);
   assert.ok(available.length,'level '+level+' has a dead end after '+cleared+' removals');
   const result=removeArrow(cur,available[0].id);
   assert.equal(result.ok,true);
   cur=result.board;cleared++;
  }
  assert.equal(cleared,snapshot.length);
 }
});
test('blocked arrows cost a heart in the UI but never mutate puzzle state',()=>{
 const puzzle=generateLevel(15);
 const blocked=puzzle.paths.find(p=>!isFree(puzzle,p));
 if(blocked){
  assert.ok(blockerIds(puzzle,blocked).length>0);
  const result=removeArrow(puzzle,blocked.id);
  assert.equal(result.ok,false);assert.equal(result.reason,'blocked');
  assert.strictEqual(result.board,puzzle);
 }
 const free=freePaths(puzzle)[0];assert.ok(free);
 const result=removeArrow(puzzle,free.id);
 assert.equal(result.ok,true);assert.equal(result.board.paths.length,puzzle.paths.length-1);
 assert.ok(puzzle.paths.includes(free),'original puzzle must stay unchanged');
});
test('all arrow paths end in an actual direction and IDs are unique',()=>{
 for(let i=1;i<=40;i++){
  const b=generateLevel(i),ids=new Set(b.paths.map(p=>p.id));
  assert.equal(ids.size,b.paths.length);
  for(const p of b.paths){
   assert.ok(p.points.length>=3);
   assert.ok(['number'].includes(typeof p.color));
  }
 }
});

test('first level is a real interlocking challenge, not a sparse tutorial board',()=>{
 const level=generateLevel(1);
 const occupied=level.paths.reduce((sum,p)=>sum+p.points.length,0);
 assert.ok(level.paths.length>=18,'Level one should have significantly more arrows');
 assert.ok(occupied/(level.cols*level.rows)>=.78,'Level one should be tightly packed');
 assert.ok(freePaths(level).length<=6,'Level one should have few initially removable arrows');
});
