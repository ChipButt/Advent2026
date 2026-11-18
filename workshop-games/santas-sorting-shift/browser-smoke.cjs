/* Browser smoke test: node santas-sorting-shift/browser-smoke.cjs
   Playwright-core with local Chromium; does not require a running production site. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright-core");
const fs=require("node:fs");
const PORT=process.env.PORT||8787;
const possible=[process.env.CHROME_BIN,"/usr/bin/google-chrome","/usr/bin/chromium", "/opt/google/chrome/chrome"].filter(Boolean);
const executablePath=possible.find(p=>fs.existsSync(p));
if(!executablePath)throw Error("Chromium/Chrome executable not found");
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath,args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.addInitScript(()=>{Math.random=()=>.32;});
  const response=await page.goto("http://127.0.0.1:"+PORT+"/santas-sorting-shift/",{waitUntil:"domcontentloaded"});
  assert.equal(response.status(),200);
  await page.locator("#world").waitFor({state:"visible"});
  assert.match(await page.title(),/Sorting Shift/);
  assert.equal(await page.locator("#overlay").isVisible(),true);
  assert.ok(!(await page.locator(".scorebar").innerText()).includes("undefined"),"Title-screen HUD should contain actual values");
  assert.ok(!(await page.locator(".statusfoot").innerText()).includes("undefined"),"Title-screen progress should contain actual values");
  await page.screenshot({path:"santas-sorting-shift/preview-menu.png",fullPage:true});
  await page.locator("#primaryButton").click();
  assert.equal(await page.locator("#overlay").isVisible(),false);
  const firstParcel=await (await page.waitForFunction(()=>{
    const q=window.__sortingShiftTest?.();
    return q?.speed>=100&&q.items.find(i=>i.type==="gift"&&i.x>55&&i.x<245);
  },null,{timeout:5000})).jsonValue();
  const box=await page.locator("#world").boundingBox();
  assert.ok(box&&box.width>260);
  const x=n=>box.x+n*box.width/360,y=n=>box.y+n*box.height/540;
  // Acquire the real moving parcel centre instead of depending on animation timing.
  await page.mouse.move(x(firstParcel.x),y(firstParcel.y));
  await page.mouse.down();
  await page.mouse.move(x(70),y(405),{steps:13});
  await page.mouse.up();
  await page.waitForTimeout(180);
  const after=Number((await page.locator("#score").innerText()).replace(/\D/g,""));
  assert.ok(after>=100,"Expected a correct gift drop to score >= 100, got "+after);
  assert.match(await page.locator("#progressLabel").innerText(),/1 \/ 11/);
  await page.screenshot({path:"santas-sorting-shift/preview-playing.png",fullPage:true});
  await page.locator("#pauseButton").click();
  assert.equal(await page.locator("#overlay").isVisible(),true);
  assert.match(await page.locator("#overlayTitle").innerText(),/PAUSED/);
  const beforePause=await page.locator("#timer").innerText();
  await page.waitForTimeout(400);
  assert.equal(await page.locator("#timer").innerText(),beforePause);
  await page.locator("#primaryButton").click();
  assert.equal(await page.locator("#overlay").isVisible(),false);
  assert.deepEqual(errors,[],"No uncaught browser errors");
  const layout=await page.evaluate(()=>({
    width:document.documentElement.scrollWidth,
    viewport:window.innerWidth,
    stageBottom:document.querySelector(".playboard").getBoundingClientRect().bottom,
    screenHeight:window.innerHeight
  }));
  assert.ok(layout.width<=layout.viewport+2,"Unexpected horizontal scrolling");
  assert.ok(layout.stageBottom<=layout.screenHeight,"The main playfield should fit on screen");
  console.log("PASS: launched mobile viewport, visible GameBox art, drag gift to bin, score, pause, resume, no page errors",layout);
  // A fresh Shift 1 must already produce Express specials and accept the gold crate.
  const expressPage=await context.newPage();
  await expressPage.addInitScript(()=>{Math.random=()=>.05;});
  await expressPage.goto("http://127.0.0.1:"+PORT+"/santas-sorting-shift/",{waitUntil:"domcontentloaded"});
  await expressPage.locator("#primaryButton").click();
  const expressParcel=await (await expressPage.waitForFunction(()=>{
    const q=window.__sortingShiftTest?.();
    return q?.level===1&&q.items.find(i=>i.type==="express"&&i.x>55&&i.x<245);
  },null,{timeout:5000})).jsonValue();
  const expressBox=await expressPage.locator("#world").boundingBox();
  const ex=n=>expressBox.x+n*expressBox.width/360, ey=n=>expressBox.y+n*expressBox.height/540;
  await expressPage.mouse.move(ex(expressParcel.x),ey(expressParcel.y));
  await expressPage.mouse.down();
  await expressPage.mouse.move(ex(290),ey(407),{steps:13});
  await expressPage.mouse.up();
  const expressScore=Number((await expressPage.locator("#score").innerText()).replace(/\D/g,""));
  assert.ok(expressScore>=160,"Shift 1 Express must sort into the gold crate, got "+expressScore);
  await expressPage.screenshot({path:"santas-sorting-shift/preview-express.png",fullPage:true});
  await expressPage.close();
  // Desktop regression: an off-centre mouse grab must drop successfully when
  // the cursor is released over the visible crate, even above its midpoint.
  for(const {width,height,dropY} of [
    {width:1366,height:768,dropY:362},
    {width:1440,height:900,dropY:458}
  ]){
    const desktopContext=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
    const desktopPage=await desktopContext.newPage();
    const desktopErrors=[];
    desktopPage.on("pageerror",error=>desktopErrors.push(error.message));
    await desktopPage.addInitScript(()=>{Math.random=()=>.32;});
    const desktopResponse=await desktopPage.goto("http://127.0.0.1:"+PORT+"/santas-sorting-shift/",{waitUntil:"domcontentloaded"});
    assert.equal(desktopResponse.status(),200);
    await desktopPage.locator("#primaryButton").click();
    const present=await (await desktopPage.waitForFunction(()=>{
      const state=window.__sortingShiftTest?.();
      return state?.items.find(item=>item.type==="gift"&&item.x>75&&item.x<170);
    },null,{timeout:5000})).jsonValue();
    const bounds=await desktopPage.locator("#world").boundingBox();
    assert.ok(bounds&&bounds.width>350,"Desktop game canvas should be visible at "+width+"x"+height);
    const cx=n=>bounds.x+n*bounds.width/360,cy=n=>bounds.y+n*bounds.height/540;
    // Pick up the gift by its lower-right corner (not its centre).
    await desktopPage.mouse.move(cx(present.x+14),cy(present.y+19));
    await desktopPage.mouse.down();
    if(width===1440){
      // Reproduce the desktop failure mode: Chrome/Safari can lose pointer capture
      // in the middle of an otherwise ordinary mouse drag.
      const captureDropped=await desktopPage.evaluate(()=>{
        const canvas=document.getElementById("world");
        if(!canvas.hasPointerCapture(1))return false;
        canvas.releasePointerCapture(1);
        return true;
      });
      assert.ok(captureDropped,"Expected an active mouse pointer capture before the regression case");
      await desktopPage.waitForTimeout(40);
      const heldAfterLoss=await desktopPage.evaluate(()=>window.__sortingShiftTest?.()?.items.some(item=>item.held));
      assert.equal(heldAfterLoss,true,"Losing desktop pointer capture must NOT return the present to the belt");
      await desktopPage.evaluate(()=>{
        document.getElementById("world").dispatchEvent(
          new PointerEvent("pointercancel",{bubbles:true,pointerId:1,pointerType:"mouse"})
        );
      });
      const heldAfterCancel=await desktopPage.evaluate(()=>window.__sortingShiftTest?.()?.items.some(item=>item.held));
      assert.equal(heldAfterCancel,true,"Desktop pointercancel must retain the drag until mouseup");
    }
    await desktopPage.mouse.move(cx(70),cy(dropY),{steps:15});
    await desktopPage.mouse.up();
    await desktopPage.waitForTimeout(90);
    assert.match(await desktopPage.locator("#progressLabel").innerText(),/1 \/ 11/,"Desktop mouse drop did not enter PRESENTS at "+width+"x"+height);
    const desktopScore=Number((await desktopPage.locator("#score").innerText()).replace(/\D/g,""));
    assert.ok(desktopScore>=100,"Desktop mouse drop should score for a gift at "+width+"x"+height);
    assert.deepEqual(desktopErrors,[],"No desktop browser errors at "+width+"x"+height);
    if(width===1366)await desktopPage.screenshot({path:"santas-sorting-shift/preview-desktop.png",fullPage:true});
    await desktopContext.close();
  }
  console.log("PASS: desktop mouse drag and release into visible PRESENTS crate at 1366x768 and 1440x900");
  await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
