"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require("playwright-core");
const exe=[process.env.CHROME_BIN,"/usr/bin/google-chrome","/usr/bin/chromium","/opt/google/chrome/chrome"].filter(Boolean).find(fs.existsSync);
if(!exe)throw Error("Chromium binary missing");
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:exe,args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{
  for(const size of [{width:390,height:844},{width:360,height:740}]){
   const page=await browser.newPage({viewport:size,isMobile:true,hasTouch:true,deviceScaleFactor:1});
   const errors=[],missing=[];page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()===404)missing.push(r.url());});
   const response=await page.goto("http://127.0.0.1:8787/snowball-knockdown/",{waitUntil:"networkidle"});
   assert.equal(response.status(),200);assert.match(await page.title(),/Snowball Knockdown/);
   assert.equal(await page.locator("#overlay").isVisible(),true);
   assert.match(await page.locator("#overlayText").innerText(),/present/i);
   await page.screenshot({path:"snowball-knockdown/menu-"+size.width+".png"});
   await page.locator("#secondBtn").click();assert.match(await page.locator("#overlayTitle").innerText(),/READY, AIM/);
   await page.locator("#playBtn").click();
   assert.equal(await page.locator("#overlay").isVisible(),false);
   const box=await page.locator("#game").boundingBox();assert.ok(box.width>280&&box.height>340);
   const pos=(wx,wy)=>{const s=Math.min(box.width/420,box.height/640);return{x:box.x+(box.width-s*420)/2+wx*s,y:box.y+(box.height-s*640)/2+wy*s};};
   const start=await page.locator("#balls").innerText();
   const xy=pos(210,389);await page.mouse.click(xy.x,xy.y);await page.waitForTimeout(450);
   const end=await page.locator("#balls").innerText();assert.notEqual(end,start,"Shot should expend one snowball");
   await page.waitForFunction(()=>Number(document.querySelector("#score").textContent.replaceAll(",",""))>0,{timeout:4000});
   assert.equal(await page.locator("#gifts").innerText(),"02","A single shot must remove only one of three presents");
   await page.screenshot({path:"snowball-knockdown/playing-"+size.width+".png"});
   await page.locator("#menuBtn").click();assert.equal(await page.locator("#overlay").isVisible(),true);
   assert.match(await page.locator("#overlayTitle").innerText(),/PAUSED/);
   await page.locator("#playBtn").click();assert.equal(await page.locator("#overlay").isVisible(),false);
   await page.locator("#restartBtn").click();assert.match(await page.locator("#level").innerText(),/01/);
   assert.equal(await page.locator("#gifts").innerText(),"03");
   const dim=await page.evaluate(()=>({w:document.documentElement.scrollWidth,viewport:innerWidth,bottom:document.querySelector(".stage").getBoundingClientRect().bottom,h:innerHeight}));
   assert.ok(dim.w<=dim.viewport+3,"Horizontal overflow "+JSON.stringify(dim));
   assert.ok(dim.bottom<dim.h,"Game stage below fold "+JSON.stringify(dim));
   assert.deepEqual(errors,[],"JavaScript errors");assert.deepEqual(missing,[],"Missing assets");
   console.log("PASS snowball touch play, hit, pause, restart, layout "+size.width+"x"+size.height,dim);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
