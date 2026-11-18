const assert=require("node:assert/strict");
const {chromium}=require("playwright-core"),fs=require("node:fs");
const candidates=[process.env.CHROME_BIN,"/usr/bin/google-chrome","/usr/bin/chromium","/opt/google/chrome/chrome"].filter(Boolean);
const executablePath=candidates.find(f=>fs.existsSync(f));
if(!executablePath)throw Error("Chrome/Chromium executable missing");
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath,args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{
  for(const size of [{width:390,height:844},{width:360,height:740}]){
   const page=await browser.newPage({viewport:size,deviceScaleFactor:1,hasTouch:true,isMobile:true});
   const errors=[],badImages=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("response",r=>{if(r.status()===404)badImages.push(r.url());});
   const response=await page.goto("http://127.0.0.1:8787/chimney-drop-in/",{waitUntil:"networkidle"});
   assert.equal(response.status(),200);
   assert.match(await page.title(),/Chimney Drop-In/);
   const guidance=page.locator(".risk-legend");
   assert.equal(await guidance.isVisible(),true,"Green/Red guidance must always be visible");
   assert.match(await guidance.innerText(),/COLLECT/);
   assert.match(await guidance.innerText(),/AVOID/);
   assert.equal(await page.locator("#overlay").isVisible(),true);
   await page.screenshot({path:"chimney-drop-in/preview-menu-"+size.width+".png",fullPage:true});
   // The opening How To guide must show actual game-art sprites on two distinct pages.
   await page.locator("#secondaryButton").click();
   assert.equal(await page.locator("#helpGallery").isVisible(),true);
   assert.match(await page.locator("#overlayTitle").innerText(),/COLLECT/);
   assert.equal(await page.locator(".guide-card.collect").count(),3);
   for(const name of ["COOKIE","MILK","PRESENT"])assert.ok((await page.locator("#helpGallery").innerText()).includes(name));
   await page.waitForFunction(()=>Array.from(document.querySelectorAll(".guide-sprite")).every(c=>{
     const x=c.getContext("2d").getImageData(0,0,64,64).data;
     return Array.from(x).some((v,i)=>i%4===3&&v>0);
   }));
   await page.screenshot({path:"chimney-drop-in/preview-help-collect-"+size.width+".png",fullPage:true});
   await page.locator("#primaryButton").click();
   assert.match(await page.locator("#overlayTitle").innerText(),/AVOID/);
   assert.equal(await page.locator(".guide-card.avoid").count(),5);
   for(const name of ["EMBERS","BRICKS","WREATH","BAUBLE","EMBER SHOWER"])assert.ok((await page.locator("#helpGallery").innerText()).includes(name));
   await page.screenshot({path:"chimney-drop-in/preview-help-avoid-"+size.width+".png",fullPage:true});
   await page.locator("#secondaryButton").click();
   assert.match(await page.locator("#overlayTitle").innerText(),/COLLECT/);
   await page.locator("#primaryButton").click();
   await page.locator("#primaryButton").click();
   assert.equal(await page.locator("#helpGallery").isVisible(),false);
   assert.match(await page.locator("#overlayTitle").innerText(),/CHIMNEY/);
   await page.locator("#primaryButton").click();
   assert.equal(await page.locator("#overlay").isVisible(),false);
   assert.equal(await guidance.isVisible(),true);
   await page.waitForTimeout(1300);
   const depth=await page.locator("#depth").innerText();
   assert.ok(parseInt(depth,10)>4,"Descent should advance: "+depth);
   const area=await page.locator("#world").boundingBox();
   assert.ok(area&&area.width>245);
   // Hold RIGHT with touch. The canvas steering is direct, but the button is also supported.
   await page.locator("#moveRight").dispatchEvent("pointerdown",{pointerId:15});
   await page.waitForTimeout(170);
   await page.locator("#moveRight").dispatchEvent("pointerup",{pointerId:15});
   // Drag from the centre of playfield to the left.
   const x=v=>area.x+v*area.width/360,y=v=>area.y+v*area.height/560;
   await page.mouse.move(x(180),y(180));await page.mouse.down();
   await page.mouse.move(x(120),y(178),{steps:8});await page.mouse.up();
   await page.waitForTimeout(120);
   await page.screenshot({path:"chimney-drop-in/preview-playing-"+size.width+".png",fullPage:true});
   await page.locator("#pauseBtn").click();
   assert.equal(await page.locator("#overlay").isVisible(),true);
   assert.match(await page.locator("#overlayTitle").innerText(),/PAUSED/);
   const d=await page.locator("#depth").innerText();
   await page.waitForTimeout(260);
   assert.equal(await page.locator("#depth").innerText(),d);
   await page.locator("#primaryButton").click();
   assert.equal(await page.locator("#overlay").isVisible(),false);
   const dim=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth,stageBottom:document.querySelector(".gameframe").getBoundingClientRect().bottom,height:innerHeight,fonts:document.fonts.status}));
   assert.ok(dim.document<=dim.viewport+3,"Horizontal overflow "+JSON.stringify(dim));
   assert.ok(dim.stageBottom<dim.height,"Stage below fold "+JSON.stringify(dim));
   assert.deepEqual(errors,[],"Unexpected JavaScript errors");
   assert.deepEqual(badImages,[],"Missing game assets");
   console.log("PASS mobile "+size.width+"×"+size.height+" procedural drop, buttons/drag, pause/resume, visuals and fit",dim);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
