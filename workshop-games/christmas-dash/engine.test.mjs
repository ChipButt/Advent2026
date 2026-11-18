import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun, startRun, steer, jump, duck, releaseDuck, advance, spawnRow} from './engine.mjs';
test('every obstacle section always has a viable jumping, ducking or open route',()=>{
  const run=createRun(()=>0.49);
  run.rows=4; run.distance=500;
  for(let i=0;i<80;i++){
    run.objects=[];spawnRow(run);
    const hazardLanes = new Set(run.objects.filter(o=>o.kind!=='gift').map(o=>o.lane));
    const giftLanes = new Set(run.objects.filter(o=>o.kind==='gift').map(o=>o.lane));
    assert.equal(run.objects.filter(o=>o.kind==='gift').length,3);
    assert.ok([0,1,2].some(l=>{
      const hazards=run.objects.filter(o=>o.kind!=='gift'&&o.lane===l);
      return giftLanes.has(l) && (hazards.length===0 || (hazards.length===1 && ['crate','arch'].includes(hazards[0].kind)));
    }));
  }
});
test('opening 110 metres always offers a clear lane and readable row spacing',()=>{
  const r=createRun(()=>.15);
  startRun(r);
  assert.equal(r.speed,14,'opening speed must be substantially slower than late game');
  assert.equal(r.spawnIn,5,'opening hazard must have a short approach delay');
  r.distance=0;
  for(let i=0;i<6;i++){
    r.objects=[];spawnRow(r);
    const hazards=r.objects.filter(o=>o.kind!=='gift');
    assert.ok(hazards.length<=2);
    assert.ok(new Set(hazards.map(o=>o.lane)).size<=2,'there is always a clear lane');
    assert.ok(!hazards.some(o=>o.kind==='arch'),'ducking is introduced later');
  }
  r.spawnIn=.001;
  advance(r,.01);
  assert.ok(r.spawnIn>34,'opening rows must be spaced far enough apart to allow reaction time');
  const at150=createRun(()=>.95);at150.distance=150;startRun(at150);advance(at150,.01);
  assert.ok(at150.speed>=18&&at150.speed<19,'speed should increase progressively, not instantly');
});

test('lane changes stay inside the three lanes',()=>{
  const r=createRun(); startRun(r);
  for(let i=0;i<9;i++)steer(r,-1);assert.equal(r.lane,0);
  for(let i=0;i<9;i++)steer(r,1);assert.equal(r.lane,2);
});
test('running earns distance, score and pauses safely',()=>{
  const r=createRun(()=>0);startRun(r);
  advance(r,.04);assert.ok(r.distance>0);
  r.status='paused';let before=r.distance;advance(r,.04);assert.equal(r.distance,before);
});
test('a standing runner collides with an unavoidable snowman in their lane',()=>{
  const r=createRun(()=>0.3);startRun(r);r.spawnIn=999;
  r.objects=[{id:1,kind:'snowman',lane:1,z:4.8,hit:false}];
  assert.equal(advance(r,.03)[0].type,'crash');
  assert.equal(r.status,'over');
});
test('jump clears crate; slide clears arch; incorrect move crashes',()=>{
  for(const [kind,action] of [['crate',jump],['arch',duck]]){
    const r=createRun(()=>0);startRun(r);r.spawnIn=999;
    action(r);if(kind==='crate')for(let t=0;t<3;t++)advance(r,.05);
    r.objects=[{id:1,kind,lane:1,z:4.9,hit:false}];
    assert.equal(advance(r,.03)[0].type,'dodge',kind);
  }
  const r=createRun();startRun(r);r.spawnIn=999;
  r.objects=[{id:1,kind:'arch',lane:1,z:4.9,hit:false}];
  assert.equal(advance(r,.03)[0].type,'crash');
});
test('gifts score only on lane-specific contact',()=>{
  const r=createRun(()=>0.7);startRun(r);r.spawnIn=999;
  r.objects=[{id:1,kind:'gift',lane:1,z:4.8,hit:false},{id:2,kind:'gift',lane:0,z:4.8,hit:false}];
  assert.equal(advance(r,.03)[0].type,'gift');
  assert.equal(r.gifts,1);assert.ok(r.score>=25);
});
test('the first three rows teach steering; obstacle difficulty ramps every 110 metres',()=>{
  const r=createRun(()=>0.2);
  spawnRow(r);
  assert.equal(r.objects.filter(o=>o.kind!=='gift').length,1,'start with a single obstacle and a clear escape');
  assert.ok(r.objects.filter(o=>o.kind!=='gift').every(o=>o.kind==='crate'),'the first encounter must use a simple crate');
  assert.equal(r.objects.filter(o=>o.kind==='arch').length,0,'no compulsory ducking at the start');
  assert.ok(r.objects.every(o=>o.z<=-30),'obstacles have a visible lead-in before reaching the player');
  r.distance=240;
  r.objects=[];
  spawnRow(r);
  assert.ok(r.objects.filter(o=>o.kind!=='gift').length>=2,'midgame must add extra hazards');
  r.distance=480;
  r.objects=[];
  spawnRow(r);
  assert.equal(r.objects.filter(o=>o.kind!=='gift').length,3,'advanced stages occasionally require jumping or ducking');
});
test('pace starts gently and ramps to the existing late-game top speed',()=>{
  const r=createRun(()=>0.99);
  startRun(r);
  r.spawnIn=99999;
  for(let i=0;i<100;i++)advance(r,.02);
  assert.ok(r.distance>=28 && r.distance<30,'first two seconds should cover about 28m');
  r.distance=700;
  advance(r,.02);
  assert.ok(r.speed>31,'late game should be substantially faster');
  r.distance=1300;
  advance(r,.02);
  assert.equal(r.speed,43,'keep the original challenging top speed');
});

test('jump lands in under 0.6 seconds yet comfortably clears a wooden barricade',()=>{
  const r=createRun(()=>0.99);startRun(r);r.spawnIn=9999;
  assert.equal(jump(r),true);
  let time=0,peak=0;
  while(r.jumpY>0&&time<1){
    advance(r,.01);time+=.01;peak=Math.max(peak,r.jumpY);
  }
  assert.ok(time>=.48&&time<.6,'jump lasted '+time.toFixed(2)+' seconds');
  assert.ok(peak>1.2,'elf should clearly rise over the barricade');
  assert.equal(r.jumpY,0);
  assert.equal(jump(r),true,'can jump again immediately on landing');
});
test('Duck is held while pressed, stands quickly when released, and quick taps are playable',()=>{
  const held=createRun(()=>0.99);startRun(held);held.spawnIn=9999;
  duck(held,true);
  for(let i=0;i<25;i++)advance(held,.02);
  assert.equal(held.slide,1,'button held for half a second must still duck');
  releaseDuck(held);
  for(let i=0;i<4;i++)advance(held,.02);
  assert.equal(held.slide,0,'release from long hold must stand in under 0.1 seconds');
  duck(held,true);releaseDuck(held);
  assert.ok(held.slide>=.2,'very short tap should remain playable');
  for(let i=0;i<13;i++)advance(held,.02);
  assert.equal(held.slide,0,'short tap should expire within 0.3 seconds');
  duck(held);
  for(let i=0;i<18;i++)advance(held,.02);
  assert.equal(held.slide,0,'swipe down crouch should end quickly');
});
test('middle of three Christmas presents sits directly on top of the jump barricade',()=>{
  const run=createRun(()=>0.1);run.distance=700;run.rows=7;spawnRow(run);
  const gifts=run.objects.filter(o=>o.kind==='gift');
  const centre=gifts[1];
  const barricade=run.objects.find(o=>o.kind==='crate'&&o.lane===centre.lane);
  assert.ok(barricade,'reward lane must sometimes require jumping');
  assert.equal(gifts.length,3);
  assert.equal(centre.z,barricade.z,'middle present must be directly above the barricade');
  assert.ok(centre.height>=.9,'gift should have a real world-space vertical offset');
  assert.ok(centre.height+.85-.445>1.24,'present bottom must be higher than the top of the barricade');
  assert.ok(gifts[0].z>centre.z&&gifts[2].z<centre.z,'other gifts lead in and out');
  assert.equal(gifts[0].height,0);
  assert.equal(gifts[2].height,0);
});
test('barricade-top present is collected on a successful jump but not on foot',()=>{
  const create=()=>{
    const r=createRun(()=>.99);startRun(r);r.spawnIn=9999;
    r.objects=[
      {id:1,kind:'crate',lane:1,z:4.9,hit:false},
      {id:2,kind:'gift',lane:1,z:4.9,height:1,hit:false}
    ];
    return r;
  };
  const standing=create();
  const fail=advance(standing,.03);
  assert.equal(fail[0].type,'crash');
  assert.equal(standing.gifts,0,'cannot walk through crate to receive its gift');
  const airborne=create();
  airborne.objects=[];
  jump(airborne);
  for(let i=0;i<3;i++)advance(airborne,.05);
  airborne.objects=[{id:1,kind:'crate',lane:1,z:4.9,hit:false},{id:2,kind:'gift',lane:1,z:4.9,height:1,hit:false}];
  const success=advance(airborne,.03);
  assert.deepEqual(success.map(e=>e.type),['dodge','gift']);
  assert.equal(airborne.gifts,1);
});

test('mandatory jumps and ducks ramp in gradually instead of overwhelming beginners',()=>{
  // Fixed-seed sampling keeps the difficulty requirement measurable and repeatable.
  const randomFor=seed=>{
    let state=seed>>>0;
    return ()=>((state=Math.imul(1664525,state)+1013904223|0)>>>0)/4294967296;
  };
  const samples=[];
  for(let stage=0;stage<=6;stage++){
    const run=createRun(randomFor(7907+stage*12317));
    run.distance=25+stage*110;run.rows=4;
    let forcedCount=0,jumps=0,ducks=0,streak=0,maximum=0;
    for(let i=0;i<400;i++){
      run.objects=[];spawnRow(run);
      const obstacles=run.objects.filter(o=>o.kind!=='gift');
      const gifts=run.objects.filter(o=>o.kind==='gift');
      const covered=new Set(obstacles.map(o=>o.lane));
      const forced=covered.size===3;
      if(forced){
        forcedCount++;streak++;maximum=Math.max(maximum,streak);
        const reward=obstacles.filter(o=>o.lane===gifts[0].lane);
        assert.equal(reward.length,1,'every mandatory row has exactly one reward lane hazard');
        assert.ok(['crate','arch'].includes(reward[0].kind),'mandatory lane must be jumpable or duckable');
        if(reward[0].kind==='crate'){
          jumps++;
          assert.equal(gifts[1].z,reward[0].z);
          assert.ok(gifts[1].height>=.9,'centre gift must be above barricade');
        } else ducks++;
      }else{
        streak=0;
      }
      assert.ok(streak<=6,'after six forced sections the player needs breathing room');
    }
    samples.push(forcedCount/400);
    if(stage>=2)assert.ok(jumps>40&&ducks>40,'developed stages need varied jump AND duck challenges');
    if(stage>=2)assert.ok(maximum>1,'back-to-back mandatory moves must occur beyond the introduction');
  }
  assert.equal(samples[0],0,'first 110 metres must never require a mandatory jump or duck');
  assert.ok(samples[1]<.2,'second section introduces forced moves occasionally');
  assert.ok(samples[2]>.2&&samples[2]<.45,'midgame builds up to more mandatory moves');
  assert.ok(samples[5]>.8,'late game must still demand jump or duck in at least 80% of rows');
  assert.ok(samples[6]>.83,'advanced stages must retain high challenge');
  assert.ok(samples[5]>samples[2]+.45,'later stages must be noticeably harder');
});

test('successive mandatory jumps leave enough time to land at the maximum pace',()=>{
  const r=createRun(()=>0);startRun(r);
  r.distance=1300;r.spawnIn=.001;
  const events=advance(r,.01);
  assert.ok(Array.isArray(events));
  assert.equal(r.speed,43);
  const rowSpacing=r.spawnIn + r.speed*.01-.001;
  assert.ok(rowSpacing>=43*.72-1e-5,'spacing should be at least 0.72 seconds at maximum speed');
  const jumpRun=createRun(()=>.99);startRun(jumpRun);jumpRun.spawnIn=99999;
  jump(jumpRun);
  let duration=0;
  while(jumpRun.jumpY>0&&duration<1){
    advance(jumpRun,.01);duration+=.01;
  }
  assert.ok(rowSpacing/43>duration+.1,'allow landing AND a short input window before the next forced barricade');
});

test('impassable snowmen always crash even when jumping or ducking',()=>{
  for(const action of [jump,duck]){
    const r=createRun(()=>0.99);startRun(r);r.spawnIn=9999;
    action(r);
    if(action===jump)for(let i=0;i<3;i++)advance(r,.05);
    r.objects=[{id:998,kind:'snowman',lane:r.lane,z:4.8,hit:false}];
    assert.equal(advance(r,.03)[0].type,'crash','no move may pass through a snowman');
    assert.equal(r.status,'over');
  }
});
test('rewards never overlap an impassable snowman already occupying the gift lane',()=>{
  const r=createRun(()=>0.1);
  // Force an old obstacle into the next selected gift route. All three gifts
  // must disappear rather than form a misleading trail through that snowman.
  r.objects=[{id:999,kind:'snowman',lane:0,z:-45,hit:false}];
  spawnRow(r);
  assert.equal(r.objects.filter(o=>o.kind==='gift').length,0);
  assert.equal(r.rows,1);
  assert.ok(r.objects.some(o=>o.kind==='snowman'&&o.id===999),'do not erase a real obstacle');
});
test('presents and snowmen stay separated across thousands of consecutive sections',()=>{
  const randomFor=seed=>{
    let state=seed>>>0;
    return ()=>((state=Math.imul(1664525,state)+1013904223|0)>>>0)/4294967296;
  };
  let snowmanCount=0, giftCount=0, sections=0;
  for(let seed=1;seed<=48;seed++){
    const r=createRun(randomFor(seed));
    let active=[],distance=0;
    for(let row=0;row<240;row++){
      const speed=Math.min(43,21+distance/57);
      const spacing=Math.max(23,speed*.72)+r.random()*4;
      for(const o of active)o.z+=spacing;
      active=active.filter(o=>o.z<13);
      r.objects=active;r.distance=distance;
      spawnRow(r);
      active=r.objects;
      const snowmen=active.filter(o=>o.kind==='snowman');
      const gifts=active.filter(o=>o.kind==='gift');
      for(const gift of gifts){
        for(const snowman of snowmen){
          assert.ok(
            gift.lane!==snowman.lane||Math.abs(gift.z-snowman.z)>=4,
            'an impassable snowman intersects a present trail at row '+row
          );
        }
      }
      snowmanCount+=snowmen.length;giftCount+=gifts.length;sections++;
      distance+=spacing;
    }
  }
  assert.ok(sections>11000 && snowmanCount>1000 && giftCount>1000,'test needs real snowman and gift coverage');
});
test('snowmen render at a distinct depth from presents in the same encounter',()=>{
  const randomFor=seed=>{
    let state=seed>>>0;
    return ()=>((state=Math.imul(1664525,state)+1013904223|0)>>>0)/4294967296;
  };
  let found=0;
  for(let seed=1;seed<=120;seed++){
    const r=createRun(randomFor(seed));
    r.rows=4;r.distance=240;
    spawnRow(r);
    const snowmen=r.objects.filter(o=>o.kind==='snowman');
    const gifts=r.objects.filter(o=>o.kind==='gift');
    for(const snowman of snowmen){
      found++;
      assert.ok(gifts.every(g=>snowman.lane!==g.lane),'never put present and snowman in the same lane');
      assert.ok(gifts.every(g=>Math.abs(g.z-snowman.z)>7),'snowman should be visually separated from the gift sequence');
    }
  }
  assert.ok(found>10,'random encounters must actually include snowmen');
});
