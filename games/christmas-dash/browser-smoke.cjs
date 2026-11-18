'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright-core');
const executable=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].filter(Boolean).find(fs.existsSync);
if(!executable)throw Error('Chromium binary unavailable');
(async()=>{
 const browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 try{
  for(const size of [{width:390,height:844},{width:360,height:740},{width:320,height:568}]){
   const page=await browser.newPage({viewport:size,isMobile:true,hasTouch:true,deviceScaleFactor:1});
   const errors=[],missing=[],assets=new Set();
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',e=>{if(e.type()==='warning'&&/model unavailable|tree files could not load/i.test(e.text()))errors.push(e.text());});
   page.on('response',r=>{
     if(r.status()===404)missing.push(r.url());
     if(r.ok()&&/Elf\.gltf|PineTree_Snow_[24]\.fbx/.test(r.url()))assets.add(r.url().split('/').pop());
   });
   try{
    const r=await page.goto('http://127.0.0.1:8787/christmas-dash/',{waitUntil:'domcontentloaded'});
    assert.equal(r.status(),200);
    assert.match(await page.title(),/North Pole Dash/);
    await page.waitForFunction(()=>{const b=document.querySelector('#startBtn');return b&&!b.disabled;},null,{timeout:45000});
    assert.equal(await page.locator('#fatal').isHidden(),true,'No WebGL failure');
    assert.ok(assets.has('Elf.gltf'),'Real Quaternius elf asset did not load');
    assert.ok(assets.has('PineTree_Snow_2.fbx'),'Real snow-covered pine asset did not load');
    assert.ok(Number(await page.locator('#world').getAttribute('data-skin-corrected'))>0,'Actual imported elf Skin material must be recoloured');
    const actionLabels=await page.locator('[data-action]').allTextContents();
    assert.equal(actionLabels.length,2,'There should be only TWO action buttons: Jump and Duck');
    for(const label of ['JUMP','DUCK'])assert.ok(actionLabels.some(text=>text.includes(label)),'Missing '+label+' button');
    assert.equal(await page.locator('[data-action="left"],[data-action="right"],.steerControl').count(),0,
      'Steering must use swipes, not left/right buttons');
    const boxes={};
    for(const action of ['jump','slide'])
      boxes[action]=await page.locator('[data-action="'+action+'"]').boundingBox();
    assert.ok(boxes.jump&&boxes.slide,'Both action buttons must be visible');
    assert.ok(boxes.jump.width>=90&&boxes.jump.height>=90&&boxes.slide.width>=90&&boxes.slide.height>=90,
      'Jump and Duck must be large thumb-friendly targets');
    assert.ok(boxes.jump.x<=30,'Jump must be in the bottom-left corner');
    assert.ok(boxes.slide.x+boxes.slide.width>=size.width-30,'Duck must be in the bottom-right corner');
    assert.ok(Math.abs(boxes.jump.y-boxes.slide.y)<3,'Jump and Duck must share the lower corners');
    assert.ok(boxes.jump.y>size.height-165&&boxes.slide.y>size.height-165,'Both action buttons must be near the bottom');
    assert.ok(boxes.jump.x+boxes.jump.width+35<boxes.slide.x,'Leave the middle of the screen clear for swiping');
    const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,screenWidth:innerWidth,canvas:document.querySelector('canvas').getBoundingClientRect().toJSON()}));
    assert.ok(dimensions.scrollWidth<=dimensions.screenWidth+3,'Horizontal overflow');
    assert.ok(dimensions.canvas.width>=dimensions.screenWidth-3,'Game fills width');
    await page.screenshot({path:'christmas-dash/menu-'+size.width+'.png'});
    await page.locator('#startBtn').click();
    assert.equal(await page.locator('#startOverlay').isVisible(),false);
    await page.waitForFunction(()=>document.querySelector('#world').dataset.lane==='1');
    const drag=async(fromX,toX,fromY,toY)=>{
      await page.mouse.move(fromX,fromY);await page.mouse.down();
      await page.mouse.move(toX,toY,{steps:1});await page.mouse.up();
    };
    await drag(size.width*.68,size.width*.32,size.height*.44,size.height*.44);
    await page.waitForFunction(()=>document.querySelector('#world').dataset.lane==='0',null,{timeout:1500});
    await drag(size.width*.32,size.width*.68,size.height*.44,size.height*.44);
    await page.waitForFunction(()=>document.querySelector('#world').dataset.lane==='1',null,{timeout:1500});
    // A tap or vertical swipe must NOT trigger Jump or Duck.
    await page.mouse.click(size.width*.5,size.height*.44);
    await drag(size.width*.5,size.width*.5,size.height*.3,size.height*.52);
    assert.equal(await page.locator('#world').getAttribute('data-lane'),'1');
    assert.equal(await page.locator('#world').getAttribute('data-pose'),'run');
    // Reset the running distance between independent input tests. Otherwise
    // slow software WebGL may hit a real barricade during test assertions.
    await page.locator('#pauseBtn').click();
    await page.locator('#restartBtn').click();
    await page.waitForFunction(()=>document.querySelector('#world').dataset.status==='running');
    // A held Duck stays down, then returns to RUN immediately on button release.
    await page.mouse.move(boxes.slide.x+boxes.slide.width/2,boxes.slide.y+boxes.slide.height/2);
    await page.mouse.down();
    await page.waitForFunction(()=>document.querySelector('#world').dataset.pose==='duck',null,{timeout:2500});
    await page.waitForTimeout(210);
    assert.equal(await page.locator('#world').getAttribute('data-pose'),'duck','Duck should remain held');
    await page.mouse.up();
    await page.waitForFunction(()=>document.querySelector('#world').dataset.pose==='run',null,{timeout:1200});
    // Jump's prominent LEFT-CORNER button initiates a quick complete jump.
    await page.mouse.move(boxes.jump.x+boxes.jump.width/2,boxes.jump.y+boxes.jump.height/2);
    await page.mouse.down();
    await page.waitForFunction(()=>document.querySelector('#world').dataset.pose==='jump',null,{timeout:1200});
    await page.mouse.up();
    await page.waitForFunction(()=>document.querySelector('#world').dataset.pose==='run',null,{timeout:1500});
    await page.locator('#pauseBtn').click();
    await page.locator('#restartBtn').click();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');
    // The revised game is deliberately much harder. Freeze before the
    // first obstacle rather than letting screenshot latency cause a crash.
    await page.waitForFunction(()=>Number(document.querySelector('#distance').textContent)>15,null,{timeout:10000});
    const d1=Number(await page.locator('#distance').innerText());
    assert.ok(d1>15,'The live metres counter must advance during gameplay');
    assert.ok(parseFloat(await page.locator('#distanceFill').evaluate(e=>e.style.width))>10,'Visible distance progress strip must advance');
    await page.locator('#pauseBtn').click();
    assert.equal(await page.locator('#pauseOverlay').isVisible(),true,'Pause overlay not shown');
    await page.locator('#pauseOverlay').evaluate(el=>el.style.visibility='hidden');
    await page.screenshot({path:'christmas-dash/playing-'+size.width+'.png'});
    await page.locator('#pauseOverlay').evaluate(el=>el.style.visibility='');
    const pausedDistance=Number(await page.locator('#distance').innerText());
    await page.waitForTimeout(350);
    assert.equal(Number(await page.locator('#distance').innerText()),pausedDistance,'Distance advanced while paused');
    await page.locator('#resumeBtn').click();
    assert.equal(await page.locator('#pauseOverlay').isVisible(),false);
    await page.locator('#pauseBtn').click();
    await page.locator('#restartBtn').click();
    assert.equal(await page.locator('#pauseOverlay').isVisible(),false);
    assert.ok(Number(await page.locator('#distance').innerText())<=1,'Restart must reset distance');
    assert.deepEqual(missing,[],'Missing assets');
    assert.deepEqual(errors,[],'Browser runtime errors');
    console.log('PASS: North Pole Dash mobile '+size.width+'x'+size.height+' real 3D models, render, run, pause, replay');
   }catch(err){
    await page.screenshot({path:'christmas-dash/failure-'+size.width+'.png'}).catch(()=>{});
    console.error('Browser failures:',{errors,missing,assets:[...assets]});
    throw err;
   }finally{await page.close();}
  }
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});