'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'game.js'),'utf8');

function boot(){
  const elements=new Map(),pending=[];
  const el=id=>{
    if(!elements.has(id))elements.set(id,{
      textContent:'',classList:{add(){},remove(){},toggle(){},contains(){return false}},
      addEventListener(){},setAttribute(){},replaceChildren(){},appendChild(){},
      getContext(){return {}},getBoundingClientRect(){return {left:0,top:0,width:480,height:760}}
    });
    return elements.get(id);
  };
  const document={getElementById:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el('new-'+elements.size),hidden:false};
  const fakeStorage=new Map();
  const storage={getItem:k=>fakeStorage.get(k)||null,setItem:(k,v)=>fakeStorage.set(k,v)};
  class Image{constructor(){this.complete=true;this.naturalWidth=32}}
  const signature='requestAnimationFrame(frame);\n})();';
  assert.ok(source.endsWith(signature),'Keep test seam aligned with the game entrypoint');
  const exposed=source.replace(signature,`return {
    makeBoard,neighbours,cell,cluster,supported,nearestSlot,arrive,pushRow,countGifts,step,finish,
    setBoard:(value)=>{board=value;phase=0},
    setShot:(value)=>{shot=value},
    get:()=>({level,phase,board,score,mode,misses,shot,unlocked})
  };\n})();`);
  const fn=new Function('document','window','Image','localStorage','performance','requestAnimationFrame','setTimeout','clearTimeout','return '+exposed);
  return {api:fn(document,{},Image,storage,{now:()=>0},()=>{},fn=>{pending.push(fn);return pending.length},()=>{}),pending};
}

test('Every level begins with gifts and selectable ornament colours',()=>{
  const {api}=boot();
  for(const level of [1,3,7,12]){
    api.makeBoard(level);
    const b=api.get().board.flat().filter(Boolean);
    assert.ok(api.countGifts()>=3,'At least three gifts per level');
    assert.ok(b.every(x=>x.k>=0&&x.k<6),'Every ornament uses an approved colour');
    assert.ok(api.neighbours(1,3).length===6,'Regular hex cluster has six neighbours');
  }
});
test('Matches of three pop and rescue embedded gifts',()=>{
  const {api}=boot();api.makeBoard(1);
  api.setBoard([
    [{k:0,gift:false},{k:0,gift:true},null,null,null,null,null,null,null],
    [{k:1,gift:true},{k:2,gift:false},null,null,null,null,null,null]
  ]);
  const at=api.cell(1,1);
  api.setShot({x:at.x,y:at.y,k:0});
  api.arrive();
  assert.equal(api.get().shot,null);
  assert.ok(api.countGifts()<2);
  assert.ok(api.get().score>=300);
});
test('Unsupported bubbles detach after a match',()=>{
  const {api}=boot();api.makeBoard(1);
  api.setBoard([
    [{k:0,gift:false},{k:0,gift:false},null,null,null,null,null,null,null],
    [{k:0,gift:false},{k:1,gift:true},null,null,null,null,null,null]
  ]);
  assert.equal(api.cluster(0,0,0).length,3);
  // Removing the three red ceiling anchors leaves the blue gift disconnected.
  const b=api.get().board;
  b[0][0]=null;b[0][1]=null;b[1][0]=null;
  assert.equal(api.supported().size,0);
});
test('Row descent retains horizontal positions of existing ornaments',()=>{
  const {api}=boot();api.makeBoard(4);
  const before=api.cell(1,1).x;
  const b=api.get().board[1][1];
  api.pushRow();
  assert.strictEqual(api.get().board[2][1],b);
  assert.equal(api.cell(2,1).x,before);
});
test('Passing the last present wins and unlocks the next level',()=>{
  const {api,pending}=boot();api.makeBoard(2);
  api.setBoard([[{k:0,gift:false},{k:0,gift:true},null,null,null,null,null,null,null]]);
  const at=api.cell(1,0);
  api.setShot({x:at.x,y:at.y,k:0});
  api.arrive();
  assert.equal(api.countGifts(),0);
  pending.forEach(f=>f());
  assert.equal(api.get().mode,'win');
  assert.ok(api.get().unlocked>=3);
});
