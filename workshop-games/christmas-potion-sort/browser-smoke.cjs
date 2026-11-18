"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const {chromium}=require("playwright-core");
const executablePath=[process.env.CHROME_BIN,"/usr/bin/google-chrome","/usr/bin/chromium"].filter(Boolean).find(fs.existsSync);
if(!executablePath)throw Error("No Chromium executable");
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath,args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{
  for(const viewport of [{width:390,height:844},{width:360,height:740},{width:320,height:568}]){
   const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});
   const errors=[],missing=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("response",r=>{if(r.status()===404&&r.url().includes("127.0.0.1:8787"))missing.push(r.url())});
   const response=await page.goto("http://127.0.0.1:8787/christmas-potion-sort/",{waitUntil:"networkidle"});
   assert.equal(response.status(),200);
   assert.match(await page.title(),/Santa.s Potion Sort/);
   assert.ok(await page.locator(".dialog .gifts img").count()===3,"Local Kenney gifts on intro");
   await page.screenshot({path:"christmas-potion-sort/intro-"+viewport.width+".png"});
   await page.locator('[data-act="play"]').click();
   assert.equal(await page.locator("#overlay").isVisible(),false);
   assert.equal(await page.locator(".bottle").count(),9,"seven colours and two spare bottles from the first level");
   assert.equal(await page.locator(".bottle canvas").count(),9,"Glossy liquid rendered through dedicated canvases");
   const painted=await page.locator(".bottle canvas").first().evaluate(canvas=>{const ctx=canvas.getContext("2d");const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let visible=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>30)visible++;return visible;});
   assert.ok(painted>100,"Bottles must contain actual drawn artwork");
   const bounds=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,buttons:document.querySelector(".tools").getBoundingClientRect().bottom,height:innerHeight,scene:document.querySelector(".scene").getBoundingClientRect().height}));
   assert.ok(bounds.width<=bounds.viewport+2,"Horizontal overflow "+JSON.stringify(bounds));
   assert.ok(bounds.buttons<=bounds.height+2,"Tools outside viewport "+JSON.stringify(bounds));
   assert.ok(bounds.scene>220,"Puzzle too small "+JSON.stringify(bounds));
   const overlap=await page.evaluate(()=>{const bottle=[...document.querySelectorAll(".bottle")].at(-1).getBoundingClientRect(),tip=document.querySelector("#tip").getBoundingClientRect();return bottle.bottom-tip.top;});
   assert.ok(overlap<=1,"Last row overlaps instructions by "+overlap+"px on "+viewport.width);
   await page.locator("#menu").click();
   await page.locator('[data-act="patterns"]').click();
   assert.equal(await page.locator(".bottles.patterns").count(),1);
   await page.locator('[data-act="patterns"]').click();
   assert.equal(await page.locator(".bottles.patterns").count(),0,"Label mode can be disabled for clean glass graphics");
   await page.locator('[data-act="resume"]').click();
   await page.screenshot({path:"christmas-potion-sort/play-"+viewport.width+".png"});
   if(viewport.width===390){
    const proof=await page.evaluate(async()=>{const m=await import("./engine.mjs");return m.makeLevel(1).proof});
    assert.ok(proof.length>0);
    const first=proof[0];
    assert.ok(proof.length>=20,"Level 1 should take at least 20 planned moves");
    await page.locator('[data-index="'+first.from+'"]').click();
    assert.equal(await page.locator(".bottle.selected").count(),1);
    await page.locator('[data-index="'+first.to+'"]').click();
    await page.locator("#pourCanvas").waitFor({state:"visible",timeout:1500});
    const streaming=await page.locator("#pourCanvas").evaluate(c=>c.width>0&&c.height>0);
    assert.ok(streaming,"Liquid must pour across a dedicated screen canvas");
    await page.waitForTimeout(375);
    const animatedPixels=await page.locator("#pourCanvas").evaluate(c=>{const pixels=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>30)n++;return n;});
    assert.ok(animatedPixels>1000,"Moving flask and flowing liquid are painted onscreen");
    await page.screenshot({path:"christmas-potion-sort/pouring-"+viewport.width+".png"});
    await page.waitForFunction(()=>Number(document.querySelector("#moves").textContent)===1);
    await page.locator("#undo").click();
    assert.equal(Number(await page.locator("#moves").innerText()),0,"Undo restores moves");
    for(const step of proof){
     await page.locator('[data-index="'+step.from+'"]').click();
     await page.locator('[data-index="'+step.to+'"]').click();
     await page.waitForFunction(n=>Number(document.querySelector("#moves").textContent)===n,proof.indexOf(step)+1);
    }
    await page.locator(".dialog .trophy").waitFor({state:"visible"});
    assert.match(await page.locator(".dialog h2").innerText(),/POTION/);
    await page.screenshot({path:"christmas-potion-sort/win-390.png"});
    await page.locator('[data-act="next"]').click();
    assert.equal(await page.locator("#level").innerText(),"02");
    await page.reload({waitUntil:"networkidle"});
    await page.locator('[data-act="play"]').click();
    assert.equal(await page.locator("#level").innerText(),"02","level progress survives reload");
   }
   assert.deepEqual(errors,[],"Page errors "+viewport.width);
   assert.deepEqual(missing,[],"Missing local artwork "+viewport.width);
   console.log("PASS Potion Sort mobile "+viewport.width+"x"+viewport.height);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
