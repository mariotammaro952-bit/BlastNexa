// Browser UI checks use the actual prepared game and tap the rendered buttons.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),tests=[],errors=[],geometry=[];let browser;
const out=path.join(root,'qa/v32-browser');fs.mkdirSync(out,{recursive:true});
async function test(name,fn){await fn();tests.push(name);console.log('PASS',name);}
async function fresh(w=915,h=412,safe=0){
 const context=await browser.newContext({viewport:{width:w,height:h},hasTouch:true});
 await context.addInitScript(()=>{localStorage.setItem('blastnexa_help_seen','true');localStorage.setItem('blastnexa_muted','true');window.BlastNexaAds={bannerLayout:()=>{}};});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());await page.goto('file://'+path.join(root,'game/index.html'));
 await page.evaluate(safe=>{document.getElementById('overlay').classList.remove('on');document.documentElement.style.setProperty('--bn-safe-left',safe+'px');openUniverse('slot');playerSettings.effects='full';applyPlayerSettings();},safe);
 return {page,context};
}
const ledger=page=>page.evaluate(()=>({coins:lifeData.slot.wallet.balance,lives:lifeData.balance,spins:lifeData.slot.total,won:lifeData.slot.wallet.won}));
(async()=>{
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.BN_QA_CHROMIUM?{executablePath:process.env.BN_QA_CHROMIUM}:{})});
 const {page:p,context}=await fresh();
 await test('A real mega spin opens gold coin pages and remains interactive after the former timeout',async()=>{
  await p.evaluate(()=>{slotRandomInt=()=>0;lifeData.slot.wallet.balance=1000;window.__beforeCoins=lifeData.slot.wallet.balance;});
  await p.locator('#slotSpinButton').tap();await p.waitForSelector('#bnSupernova');
  assert.equal(await p.locator('.sn-coin').count(),12);assert.ok(await p.locator('#snContinue').isDisabled());
  assert.equal(await p.evaluate(()=>slotBusy&&slotPhase==='celebrating'&&!window.BlastNexaBannerLayout().visible),true);
  assert.equal(await p.evaluate(()=>document.getElementById('universeScreen').hasAttribute('inert')),true);
  await p.waitForTimeout(8600);assert.equal(await p.locator('#bnSupernova').count(),1);
  assert.equal(await p.evaluate(()=>spinLifeSlot()),false);
 });
 const committed=await ledger(p);
 await test('Tapping each of the 36 coins and revisiting buttons reveals the exact saved prize once',async()=>{
  const total=await p.evaluate(()=>({coins:bnSupernovaRun.counters.find(c=>c.key==='coins').value,lives:bnSupernovaRun.counters.find(c=>c.key==='lives').value}));
  for(let page=0;page<3;page++){
   assert.equal(await p.locator('.sn-page-info>strong').textContent(),'PAGINA '+(page+1)+' / 3');
   for(let i=0;i<12;i++){await p.locator('#snCoin'+i).tap();assert.equal(await p.evaluate(index=>bnSupernovaReveal(bnSupernovaRun,index),page*12+i),false);}
   assert.equal(await p.locator('.sn-coin.revealed').count(),12);assert.equal(await p.locator('#snContinue').isEnabled(),true);
   if(page===2){assert.equal(await p.evaluate(()=>bnSupernovaRun.counters.find(c=>c.key==='coins').collected),total.coins);assert.equal(await p.evaluate(()=>bnSupernovaRun.counters.find(c=>c.key==='lives').collected),total.lives);}
   await p.screenshot({path:path.join(out,'bonus-page-'+(page+1)+'.png')});await p.locator('#snContinue').tap();
  }
  assert.equal(await p.locator('#bnSupernova').count(),0);assert.deepEqual(await ledger(p),committed);assert.equal(await p.evaluate(()=>slotBusy),false);
  assert.equal(await p.evaluate(()=>document.getElementById('universeScreen').hasAttribute('inert')),false);
 });
 await test('Collect-page shortcut and early exit preserve the ledger and restore ads',async()=>{
  await p.evaluate(()=>bnSupernovaStart({coins:37,lives:5}));await p.locator('#snRevealAll').tap();assert.equal(await p.locator('.sn-coin.revealed').count(),12);
  await p.locator('#snContinue').tap();await p.locator('#snSkip').tap();assert.deepEqual(await ledger(p),committed);assert.equal(await p.evaluate(()=>window.BlastNexaBannerLayout().visible),true);
 });
 await test('Free-spin and zero-coin bonuses, blur, reload and Escape never credit another reward',async()=>{
  await p.evaluate(()=>bnSupernovaStart({copy:'+3 GIRI BONUS'}));
  for(let i=0;i<3;i++){await p.locator('#snRevealAll').tap();if(i===2)assert.equal(await p.evaluate(()=>bnSupernovaRun.counters[0].collected),3);await p.locator('#snContinue').tap();}
  assert.deepEqual(await ledger(p),committed);await p.evaluate(()=>bnSupernovaStart({}));await p.keyboard.press('Escape');assert.equal(await p.locator('#bnSupernova').count(),0);
  await p.evaluate(()=>bnSupernovaStart({coins:250}));await p.locator('#snCoin0').tap();await p.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await p.locator('#bnSupernova').count(),0);assert.deepEqual(await ledger(p),committed);
  await p.evaluate(()=>{saveLives();bnSupernovaStart({coins:250});});await p.reload();assert.deepEqual(await ledger(p),committed);assert.equal(await p.locator('#bnSupernova').count(),0);
 });
 await context.close();
 for(const [w,h,safe]of [[640,360,0],[720,360,0],[800,360,0],[915,412,0],[1024,600,0],[1280,720,0],[1600,720,0],[800,360,35],[915,412,45]]){
  const {page,context}=await fresh(w,h,safe);
  await test('Forge relaunch matches GIRA and flashes only when usable at '+w+'x'+h+' safe '+safe,async()=>{
   await page.evaluate(()=>{setArcadeMachine('forge');lifeData.slot.last=chooseSlotResult('spin');lifeData.slot.arcade.reactor=6;slotHolds.clear();renderLifeSlot(document.getElementById('universeBody'));});
   const before=await page.locator('#slotRespinButton').evaluate(n=>({disabled:n.disabled,ready:n.dataset.ready,animation:getComputedStyle(n,'::after').animationName}));assert.equal(before.disabled,true);assert.equal(before.ready,'false');assert.equal(before.animation,'none');
   await page.locator('#slotHold0').tap();
   const g=await page.evaluate(()=>{const box=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};const button=document.getElementById('slotRespinButton');return {spin:box('slotSpinButton'),respin:box('slotRespinButton'),ad:box('gameBannerFrame'),seat:box('slotBannerSeat'),wallet:box('slotCoinWallet'),disabled:button.disabled,animation:getComputedStyle(button,'::after').animationName};});
   assert.equal(g.disabled,false);assert.equal(g.animation,'bnRedRelaunch');assert.ok(Math.abs(g.spin.w-g.respin.w)<1&&Math.abs(g.spin.h-g.respin.h)<1,JSON.stringify(g));
   assert.ok(g.respin.x>=safe&&g.respin.y>=0&&g.respin.bottom<=h&&g.respin.right<=g.ad.x,JSON.stringify(g));
   assert.ok(g.ad.h===50&&g.ad.x>=g.seat.x&&g.ad.right<=g.seat.right+1&&g.ad.bottom<=g.seat.bottom+1,JSON.stringify(g));
   await page.screenshot({path:path.join(out,'forge-'+w+'-'+h+'-'+safe+'.png')});geometry.push({w,h,safe,forge:g});
   await page.locator('#slotHold0').tap();assert.equal(await page.locator('#slotRespinButton').isDisabled(),true);
  });
  await test('Coin touch targets fit and fill the bonus at '+w+'x'+h+' safe '+safe,async()=>{
   await page.evaluate(()=>bnSupernovaStart({coins:250,lives:5}));
   const g=await page.locator('.sn-coin').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};}));
   for(const c of g){assert.ok(c.x>=safe&&c.y>=0&&c.right<=w+1&&c.bottom<=h+1&&c.w>=44&&c.h>=44,JSON.stringify(c));assert.ok(Math.abs(c.w-c.h)<2,JSON.stringify(c));}
   await page.locator('#snCoin0').tap();await page.locator('#snSkip').tap();
  });
  await test('Adventure map is centred; its pager and banner occupy separate rows at '+w+'x'+h+' safe '+safe,async()=>{
   await page.evaluate(()=>{displayMenu();openAdventureMap();});await page.waitForTimeout(250);
   const g=await page.evaluate(()=>{const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};return {app:box(document.getElementById('app')),screen:box(document.getElementById('adventureMap')),scroll:box(document.getElementById('mapScroll')),hero:box(document.querySelector('.map-hero')),pager:box(document.getElementById('bnPages_mapScroll')),ad:box(document.getElementById('gameBanner')),extra:!!document.getElementById('bnPages_adventureMap'),outer:document.scrollingElement.scrollWidth};});
   assert.equal(g.extra,false);assert.ok(g.hero.x>=g.scroll.x&&g.hero.right<=g.scroll.right+1);assert.ok(Math.abs((g.hero.x+g.hero.w/2)-(g.screen.x+g.screen.w/2))<1,JSON.stringify(g));assert.ok(g.scroll.bottom<=g.pager.y+1&&g.pager.bottom<=g.ad.y+1,JSON.stringify(g));assert.ok(g.outer<=w);
   await page.locator('#bnPageNext_mapScroll').tap();assert.ok(await page.evaluate(()=>document.getElementById('mapScroll').scrollTop)>0);await page.locator('#bnPagePrev_mapScroll').tap();assert.equal(await page.evaluate(()=>document.getElementById('mapScroll').scrollTop),0);
   await page.screenshot({path:path.join(out,'map-'+w+'-'+h+'-'+safe+'.png')});
  });
  await test('Puzzle board stays square and centred between equal side panels at '+w+'x'+h+' safe '+safe,async()=>{
   await page.evaluate(()=>{start('adventure',1);});await page.waitForTimeout(150);
   const g=await page.evaluate(()=>{const b=document.getElementById('boardShell').getBoundingClientRect(),a=document.querySelector('#game .bn-wide-game').getBoundingClientRect();return {centre:b.x+b.width/2,expected:a.x+a.width/2,w:b.width,h:b.height,top:b.top,bottom:b.bottom};});assert.ok(Math.abs(g.centre-g.expected)<1&&Math.abs(g.w-g.h)<1&&g.top>=0&&g.bottom<=h,JSON.stringify(g));
   await page.screenshot({path:path.join(out,'puzzle-'+w+'-'+h+'-'+safe+'.png')});
  });
  await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:tests.length,tests,errors,geometry},null,2));console.log(JSON.stringify({passed:tests.length,errors}));await browser.close();
})().catch(async e=>{console.error(e);fs.writeFileSync(path.join(out,'failure.txt'),e.stack);await browser?.close();process.exit(1);});
