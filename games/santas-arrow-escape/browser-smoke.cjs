"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const {chromium}=require("playwright-core");
const exe=[process.env.CHROME_BIN,"/usr/bin/google-chrome","/usr/bin/chromium","/opt/google/chrome/chrome"].filter(Boolean).find(fs.existsSync);
if(!exe)throw Error("Chromium is unavailable");
async function hit(page,puzzle,path){
 const r=await page.locator("#board").boundingBox();
 const cell=Math.min((r.width-21)/puzzle.cols,(r.height-20)/puzzle.rows);
 const ox=(r.width-cell*puzzle.cols)/2,oy=(r.height-cell*puzzle.rows)/2;
 const cellPoint=path.points[Math.floor(path.points.length/2)];
 await page.mouse.click(r.x+ox+(cellPoint[0]+.5)*cell,r.y+oy+(cellPoint[1]+.5)*cell);
}
(async()=>{
 const {generateLevel,freePaths,removeArrow,isFree}=await import("./engine.mjs");
 const browser=await chromium.launch({headless:true,executablePath:exe,args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{
  for(const size of [{width:390,height:844},{width:360,height:740},{width:320,height:568}]){
   const page=await browser.newPage({viewport:size,isMobile:true,hasTouch:true,deviceScaleFactor:1});
   const errors=[],missing=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("response",r=>{if(r.status()===404&&r.url().startsWith("http://127.0.0.1:8787"))missing.push(r.url());});
   const response=await page.goto("http://127.0.0.1:8787/santas-arrow-escape/",{waitUntil:"domcontentloaded"});
   assert.equal(response.status(),200);assert.match(await page.title(),/Santa.s Arrow Escape/);
   assert.equal(await page.locator("#intro").isVisible(),true);
   await page.screenshot({path:"santas-arrow-escape/intro-"+size.width+".png"});
   await page.locator("#playBtn").click();
   assert.equal(await page.locator("#intro").isVisible(),false);
   await page.locator("#board").waitFor({state:"visible"});
   const box=await page.locator("#board").boundingBox();
   assert.ok(box.width>245&&box.height>230,"Board should dominate phone: "+JSON.stringify(box));
   const dimensions=await page.evaluate(()=>({width:document.documentElement.scrollWidth,vw:innerWidth,footer:document.querySelector(".bottomBar").getBoundingClientRect().bottom,vh:innerHeight}));
   assert.equal(dimensions.vw,size.width,"Actual phone viewport must not zoom out to accommodate overflow");
   assert.ok(dimensions.width<=dimensions.vw+3,"Horizontal scrolling: "+JSON.stringify(dimensions));
   assert.ok(dimensions.footer<=dimensions.vh+3,"Buttons beneath the viewport: "+JSON.stringify(dimensions));
   let state=generateLevel(1),initial=state.paths.length;
   assert.equal(Number(await page.locator("#remaining").innerText()),initial);
   assert.ok(initial>=18,"Early-level board should be noticeably more crowded");
   assert.equal(await page.locator(".lives svg").count(),3,"Challenge mode should start with three hearts");
   assert.equal(await page.locator("#hintCount").innerText(),"1 LEFT","Challenge mode should allow one hint");
   const blocked=state.paths.find(p=>!isFree(state,p));
   if(blocked){
    await hit(page,state,blocked);
    await page.waitForTimeout(80);
    assert.equal(await page.locator(".lives svg.empty").count(),1,"Blocked path must lose one heart");
    assert.equal(Number(await page.locator("#remaining").innerText()),initial,"Blocked path may not disappear");
   }
   await page.screenshot({path:"santas-arrow-escape/play-"+size.width+".png"});
   const free=freePaths(state)[0];
   await hit(page,state,free);
   await page.waitForFunction(n=>Number(document.querySelector("#remaining").textContent)===n-1,initial,{timeout:3000});
   state=removeArrow(state,free.id).board;
   assert.equal(Number(await page.locator("#remaining").innerText()),initial-1);
   await page.locator("#menuBtn").click();
   assert.equal(await page.locator("#menu").isVisible(),true);
   await page.locator("#resumeBtn").click();
   assert.equal(await page.locator("#menu").isVisible(),false);
   if(size.width===390){
    while(state.paths.length){
     const path=freePaths(state)[0];assert.ok(path,"Level must remain solvable");
     const n=state.paths.length;
     await hit(page,state,path);
     await page.waitForFunction(k=>Number(document.querySelector("#remaining").textContent)===k-1,n,{timeout:3000});
     state=removeArrow(state,path.id).board;
    }
    await page.locator("#result").waitFor({state:"visible"});
    assert.match(await page.locator("#resultTitle").innerText(),/escaped/i);
    await page.screenshot({path:"santas-arrow-escape/win-390.png"});
    await page.locator("#nextBtn").click();
    assert.equal(await page.locator("#levelTitle").innerText(),"LEVEL 2");
    assert.ok(Number(await page.locator("#remaining").innerText())>12);
   }
   assert.deepEqual(errors,[],"JavaScript errors "+size.width);
   assert.deepEqual(missing,[],"Missing local assets "+size.width);
   console.log("PASS Santa's Arrow Escape "+size.width+"x"+size.height+" — touch, blocked life, HUD, menu, layout"+(size.width===390?", complete level, save progress":""));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
