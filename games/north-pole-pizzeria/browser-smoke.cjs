'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright-core');
const exe=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);
if(!exe)throw Error('Chromium unavailable');
(async()=>{
  const {makeOrder,ORDERS_PER_DAY,requiredCuts}=await import('./engine.mjs');
  const browser=await chromium.launch({headless:true,executablePath:exe,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
  try {
    for(const size of [{width:390,height:844},{width:360,height:740},{width:320,height:568},{width:1280,height:900}]){
      const page=await browser.newPage({viewport:size,isMobile:size.width<500,hasTouch:size.width<500,deviceScaleFactor:1});
      const errors=[],missing=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.status()===404&&r.url().startsWith('http://127.0.0.1'))missing.push(r.url())});
      try {
        const res=await page.goto('http://127.0.0.1:8787/north-pole-pizzeria/',{waitUntil:'domcontentloaded'});
        assert.equal(res.status(),200);
        assert.match(await page.title(),/North Pole Pizzeria/);
        assert.equal(await page.locator('#welcome').isVisible(),true);
        await page.screenshot({path:'north-pole-pizzeria/welcome-'+size.width+'.png'});
        await page.locator('#playBtn').click();
        assert.equal(await page.locator('#welcome').isVisible(),false);
        const box=await page.locator('#pizzaCanvas').boundingBox();
        assert.ok(box.width>=(size.width===320?165:260),'Visible pizza board should be large enough: '+JSON.stringify(box));
        assert.ok(Math.abs(box.height-box.width)<6,'Pizza must remain circular, not stretched: '+JSON.stringify(box));
        assert.equal(await page.locator('#dayLabel').innerText(),'01');
        async function assertOneScreen(stage){
          const measurements=await page.evaluate(()=>{
            const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
            return {vw:innerWidth,vh:innerHeight,scrollHeight:document.documentElement.scrollHeight,bodyHeight:document.body.scrollHeight,scrollWidth:document.documentElement.scrollWidth,scrollY:window.scrollY,
              title:rect('.brand'),header:rect('.topbar'),pizza:rect('#pizzaCanvas'),customer:rect('.orderTicket'),ingredients:rect('#ingredients'),oven:rect('#ovenPanel'),slice:rect('#slicePanel'),main:rect('#mainBtn'),cut:rect('#cutBtn'),lastIngredient:(()=>{const el=document.querySelector('.ingredientBtn:last-child');if(!el)return null;const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom};})()};
          });
          assert.ok(measurements.scrollWidth<=measurements.vw+2,'Page must not scroll sideways '+stage+' '+JSON.stringify(measurements));
          assert.ok(measurements.scrollHeight<=measurements.vh+2,'Page must not scroll vertically '+stage+' '+JSON.stringify(measurements));
          assert.ok(measurements.bodyHeight<=measurements.vh+2,'Body must not grow beyond screen '+stage+' '+JSON.stringify(measurements));
          assert.ok(measurements.title.top>=measurements.header.top-2&&measurements.title.bottom<=measurements.header.bottom+2,'Full pizzeria title must fit the header '+stage+' '+JSON.stringify(measurements));
          assert.ok(measurements.main.top>=0&&measurements.main.bottom<=measurements.vh+1,'Main cook/serve button must stay on-screen '+stage+' '+JSON.stringify(measurements));
          assert.ok(measurements.customer.top>=0&&measurements.customer.bottom<=measurements.vh+1,'Customer order must remain on-screen '+stage);
          assert.ok(measurements.pizza.top>=0&&measurements.pizza.bottom<=measurements.vh+1,'Whole pizza must remain on-screen '+stage+' '+JSON.stringify(measurements));
          if(stage==='prep')assert.ok(measurements.lastIngredient?.bottom<=measurements.vh+1,'All ingredients must remain visible '+JSON.stringify(measurements));
          if(stage==='slice')assert.ok(measurements.cut.top>=0&&measurements.cut.bottom<=measurements.vh+1,'Cut button must remain on-screen');
          return measurements;
        }
        await assertOneScreen('prep');
        // Move the physical mouse/finger across the canvas as a human would.
        // Choosing sauce or cheese alone must not magically fill the pizza.
        const brush=async ingredient=>{
          await page.locator('[data-ingredient="'+ingredient+'"]').click();
          const rect=await page.locator('#pizzaCanvas').boundingBox();
          for(const [y,a,b] of [[.27,.34,.66],[.36,.26,.74],[.46,.24,.76],[.56,.24,.76],[.65,.27,.73]]){
            await page.mouse.move(rect.x+rect.width*a,rect.y+rect.height*y);
            await page.mouse.down();
            await page.mouse.move(rect.x+rect.width*b,rect.y+rect.height*y,{steps:18});
            await page.mouse.up();
          }
          await page.waitForFunction(ingredient=>Number(document.querySelector('#pizzaCanvas').dataset[ingredient+'Coverage'])>=74,ingredient,{timeout:3000});
        };
        const rounds=size.width===390?ORDERS_PER_DAY:1;
        for(let i=0;i<rounds;i++){
          const o=makeOrder(1,i);
          assert.equal(await page.locator('#customerName').innerText(),o.customer.toUpperCase());
          if(i===0){
            const startCost=await page.locator('#ingredientCost').innerText();
            await page.locator('[data-ingredient="sauce"]').click();
            await page.locator('[data-ingredient="cheese"]').click();
            assert.equal(await page.locator('#ingredientCost').innerText(),startCost,'Selecting a base ingredient must not auto-apply it');
            // A full drag is a single undoable action rather than many
            // disconnected dabs; check before preparing the real order.
            await page.locator('[data-ingredient="sauce"]').click();
            const dough=await page.locator('#pizzaCanvas').boundingBox();
            await page.mouse.move(dough.x+dough.width*.30,dough.y+dough.height*.5);
            await page.mouse.down();
            await page.mouse.move(dough.x+dough.width*.70,dough.y+dough.height*.5,{steps:16});
            await page.mouse.up();
            assert.ok(Number(await page.locator('#pizzaCanvas').getAttribute('data-sauce-coverage'))>10,'Manual spreading should cover the drawn track');
            await page.locator('#undoBtn').click();
            assert.equal(await page.locator('#pizzaCanvas').getAttribute('data-sauce-coverage'),'0','One undo should clear one entire sauce stroke');
            assert.equal(await page.locator('#ingredientCost').innerText(),startCost,'Undo should refund used sauce');
          }
          if(o.needed.sauce)await brush('sauce');
          if(o.needed.cheese)await brush('cheese');
          for(const kind of o.needed.toppings){
            await page.locator('[data-ingredient="'+kind+'"]').click();
            const canvasBox=await page.locator('#pizzaCanvas').boundingBox();
            for(let j=0;j<(o.needed.side==='all'?6:3);j++){
              const x=o.needed.side==='left'?.23:o.needed.side==='right'?.77:j%2?.67:.33;
              const y=.37+(j%3)*.13;
              await page.mouse.click(canvasBox.x+canvasBox.width*x,canvasBox.y+canvasBox.height*y);
            }
          }
          await page.screenshot({path:'north-pole-pizzeria/prep-'+size.width+'.png'});
          await page.locator('#mainBtn').click();
          assert.equal(await page.locator('#ovenPanel').isVisible(),true);
          await assertOneScreen('oven');
          await page.waitForFunction(()=>parseInt(document.querySelector('#bakePercent').textContent,10)>=86,null,{timeout:17000});
          await page.locator('#mainBtn').click();
          assert.equal(await page.locator('#slicePanel').isVisible(),true);
          await assertOneScreen('slice');
          for(let cut=0;cut<requiredCuts(o.needed.slices);cut++)await page.locator('#cutBtn').click();
          assert.equal(Number(await page.locator('#slicesDone').innerText()),requiredCuts(o.needed.slices));
          await page.locator('#mainBtn').click();
          assert.equal(await page.locator('#orderResult').isVisible(),true);
          const rating=await page.locator('#reviewStars').innerText();
          assert.equal(rating,'★★★','Perfect order should earn 3 stars '+i+' '+rating);
          await page.screenshot({path:'north-pole-pizzeria/result-'+size.width+'.png'});
          await page.locator('#nextOrderBtn').click();
          if(i<rounds-1)await assertOneScreen('prep');
        }
        if(size.width===320){
          // Late-game six-ingredient tray must also fit without scrolling.
          await page.evaluate(()=>{
            const p=JSON.parse(localStorage.getItem('gamebox.north-pole-pizzeria.v1')||'{}');p.day=4;p.unlocked=4;
            localStorage.setItem('gamebox.north-pole-pizzeria.v1',JSON.stringify(p));
          });
          await page.reload({waitUntil:'domcontentloaded'});
          await page.locator('#playBtn').click();
          assert.equal(await page.locator('.ingredientBtn').count(),6);
          await assertOneScreen('prep');
          await page.screenshot({path:'north-pole-pizzeria/compact-320.png'});
        }
        if(size.width===390){
          assert.equal(await page.locator('#endDay').isVisible(),true);
          assert.equal(await page.locator('#ordersServed').innerText(),'4');
          await page.screenshot({path:'north-pole-pizzeria/shop-390.png'});
          await page.locator('#nextDayBtn').click();
          assert.equal(await page.locator('#dayLabel').innerText(),'02');
          assert.equal(await page.locator('[data-ingredient="mushroom"]').count(),1,'Mushrooms unlock on day two');
          assert.ok(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('gamebox.north-pole-pizzeria.v1'))?.day),'Progress should be saved');
        }
        assert.deepEqual(errors,[],'Browser runtime errors');
        assert.deepEqual(missing,[],'Missing local files');
        console.log('PASS North Pole Pizzeria '+size.width+'x'+size.height+' — full kitchen'+(rounds>1?', four orders, shift and saved progression':'')+', pizza UI and layout');
      }catch(e){await page.screenshot({path:'north-pole-pizzeria/failure-'+size.width+'.png'}).catch(()=>{});console.error('Browser debug',{errors,missing});throw e;}
      finally{await page.close();}
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
