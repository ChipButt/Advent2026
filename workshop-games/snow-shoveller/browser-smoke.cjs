'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright-core');
const exe=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].filter(Boolean).find(fs.existsSync);
if(!exe)throw Error('Chromium is required for Snow Shoveller browser checks');
const url='http://127.0.0.1:8787/';
const saveKey='chipin-snow-shoveller-v1';
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:exe,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const size of [{width:390,height:844},{width:360,height:740}]){
      const page=await browser.newPage({viewport:size,isMobile:true,hasTouch:true,deviceScaleFactor:1});
      const errors=[],missing=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.status()===404&&new URL(r.url()).pathname.startsWith('/snow-shoveller/'))missing.push(r.url());});
      await page.goto(url,{waitUntil:'domcontentloaded'});
      assert.equal(await page.locator('a[href="snow-shoveller/"]').count(),1,'Christmas GameBox tile present');
      const response=await page.goto(url+'snow-shoveller/',{waitUntil:'domcontentloaded'});
      assert.equal(response.status(),200);
      assert.match(await page.title(),/Snow Shoveller/);
      assert.equal(await page.locator('#welcome').isVisible(),true);
      await page.locator('#startBtn').click();
      await page.waitForTimeout(150);
      assert.equal(await page.locator('#welcome').isVisible(),false);
      const box=await page.locator('#world').boundingBox();
      assert(box.width>290&&box.height>310,'Main game board must dominate mobile viewport');
      const startCoins=await page.locator('#coins').innerText();
      await page.mouse.move(box.x+box.width*.40,box.y+box.height*.55);
      await page.mouse.down();
      await page.mouse.move(box.x+box.width*.67,box.y+box.height*.55,{steps:12});
      await page.waitForTimeout(3700);
      await page.mouse.up();
      await page.waitForTimeout(350);
      const bag=Number((await page.locator('#bag').innerText()).split('/')[0].trim());
      assert(bag>0,'Shovelling should collect snow via pointer drag');
      assert.equal(await page.locator('#coins').innerText(),startCoins,'Shovelling cannot mint coins before furnace deposit');
      await page.screenshot({path:'snow-shoveller/playing-'+size.width+'.png'});
      // Return to the furnace using actual player input, not an injected deposit.
      await page.keyboard.down('ArrowLeft');
      await page.waitForTimeout(4400);
      await page.keyboard.up('ArrowLeft');
      await page.keyboard.down('ArrowUp');
      await page.waitForTimeout(650);
      await page.keyboard.up('ArrowUp');
      await page.keyboard.down('ArrowLeft');
      await page.waitForTimeout(900);
      await page.keyboard.up('ArrowLeft');
      await page.waitForTimeout(400);
      await page.screenshot({path:'snow-shoveller/return-'+size.width+'.png'});
      await page.locator('#menuBtn').click();
      const result=await page.evaluate(key=>{
        const s=JSON.parse(localStorage.getItem(key));
        return {x:s.player.x,y:s.player.y,bag:s.player.bag,coins:s.coins};
      },saveKey);
      console.log('Furnace return snapshot',size.width,result);
      await page.locator('#resumeBtn').click();
      const payout=Number((await page.locator('#coins').innerText()).replaceAll(',',''));
      assert(payout>0,'Walking snow to the furnace must award currency (got '+payout+')');
      assert.match(await page.locator('#bag').innerText(),/^0 \/ /,'Furnace empties snow sack');
      await page.addInitScript(key=>{
        const snapshot=sessionStorage.getItem('snow-shoveller-test-fixture');
        if(snapshot){localStorage.setItem(key,snapshot);sessionStorage.removeItem('snow-shoveller-test-fixture');}
      },saveKey);
      await page.locator('#shopBtn').click();
      assert(await page.locator('#shop').isVisible());
      const upgrade=page.locator('#shopGrid .upgrade').first();
      assert(!await upgrade.isDisabled(),'Shovel upgrade should be affordable after deposit');
      await upgrade.click();
      assert.match(await upgrade.innerText(),/LV 2/,'Purchased shovel power increases');
      await page.locator('#shopClose').click();
      await page.evaluate(key=>{
        const s=JSON.parse(localStorage.getItem(key));
        const first=s.ice[0];if(!first)throw Error('Frozen character must be available');
        first.hp=.3;s.player.x=first.id==='Pip'?12.5:23.5;s.player.y=first.id==='Pip'?8.5:10.5;s.player.bag=0;
        sessionStorage.setItem('snow-shoveller-test-fixture',JSON.stringify(s));
      },saveKey);
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('#startBtn').click();
      await page.waitForTimeout(500);
      assert.match(await page.locator('#helpers').innerText(),/^1 \/ 5$/,'Nearby ice must rescue a helper');
      await page.screenshot({path:'snow-shoveller/rescued-'+size.width+'.png'});
      await page.locator('#menuBtn').click();
      assert(await page.locator('#menu').isVisible(),'Pause menu opens');
      await page.locator('#resumeBtn').click();
      assert.equal(await page.locator('#menu').isVisible(),false);
      const dim=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,board:document.querySelector('.stage').getBoundingClientRect().bottom,height:innerHeight}));
      assert(dim.scroll<=dim.width+3,'No horizontal overflow: '+JSON.stringify(dim));
      assert(dim.board<dim.height,'Game board remains on screen: '+JSON.stringify(dim));
      assert.deepEqual(errors,[],'No uncaught browser JavaScript errors');
      assert.deepEqual(missing,[],'No missing resources');
      console.log('PASS Snow Shoveller '+size.width+'x'+size.height+' pointer, economy, gear, rescue, layout');
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
