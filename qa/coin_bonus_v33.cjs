// Browser UI checks use the actual prepared game and tap the rendered buttons.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),tests=[],errors=[],geometry=[];let browser;
const out=path.join(root,'qa/v33-browser');fs.mkdirSync(out,{recursive:true});
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
 await test('Tapping each of the 36 varied coins and revisiting buttons reveals the exact saved prize once',async()=>{
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
 await test('The casino pages show different actual coin/life values and mark empty coins honestly',async()=>{
  await p.evaluate(()=>bnSupernovaStart({key:'review:250',coins:250,lives:5}));
  const values=await p.evaluate(()=>bnSupernovaRun.parts.map(p=>p.coins));assert.ok(new Set(values).size>=5);
  for(let page=0;page<3;page++){
   await p.locator('#snRevealAll').tap();
   const text=await p.locator('.sn-coin-prize').allTextContents();assert.ok(new Set(text).size>1);
   await p.screenshot({path:path.join(out,'varied-prizes-page-'+(page+1)+'.png')});
   await p.locator('#snContinue').tap();
  }
  assert.deepEqual(await ledger(p),committed);
  await p.evaluate(()=>bnSupernovaStart({key:'small-lives',lives:5}));
  const lifeValues=await p.evaluate(()=>bnSupernovaRun.parts.filter(p=>p.lives).map(p=>p.lives));assert.ok(new Set(lifeValues).size>1);
  for(let page=0;page<3;page++){await p.locator('#snRevealAll').tap();assert.equal(await p.locator('.sn-coin').filter({hasText:'ENERGIA NEXA'}).count(),0);await p.locator('#snContinue').tap();}
  assert.deepEqual(await ledger(p),committed);
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
 for(const [w,h,safe]of [[640,360,0],[720,360,0],[768,345,40],[800,360,0],[915,412,0],[1024,600,0],[1280,720,0],[1600,720,0],[800,360,35],[915,412,45],[740,320,36]]){
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
  await test('The entire world and all ten levels fit between header, world pager and banner at '+w+'x'+h+' safe '+safe,async()=>{
   await page.evaluate(()=>{displayMenu();openAdventureMap();});await page.waitForTimeout(250);
   const g=await page.evaluate(()=>{const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};return {app:box(document.getElementById('app')),screen:box(document.getElementById('adventureMap')),header:box(document.querySelector('#adventureMap>.map-header')),scroll:box(document.getElementById('mapScroll')),card:box(document.getElementById('mapCurrentWorld')),levels:[...document.querySelectorAll('#worlds .level-node')].map(box),heading:box(document.querySelector('.bn-world-heading')),levelPager:box(document.querySelector('.world-pagebar')),pager:box(document.getElementById('bnPages_mapScroll')),ad:box(document.getElementById('gameBanner')),extra:!!document.getElementById('bnPages_adventureMap'),outer:document.scrollingElement.scrollWidth};});
   assert.equal(g.extra,false);assert.equal(g.levels.length,10);assert.equal(await page.locator('#worlds>.world-card').count(),1);
   assert.ok(Math.abs(g.screen.x+g.screen.w/2-w/2)<1,JSON.stringify(g));assert.ok(g.scroll.bottom<=g.pager.y+1&&g.pager.bottom<=g.ad.y+1,JSON.stringify(g));assert.ok(g.outer<=w);
   for(const box of [g.card,g.heading,g.levelPager,...g.levels])assert.ok(box.x>=g.scroll.x&&box.right<=g.scroll.right+1&&box.y>=g.header.bottom&&box.bottom<=g.scroll.bottom+1,JSON.stringify({box,g}));
   for(const level of g.levels)assert.ok(level.w>=38&&level.h>=40,JSON.stringify(level));
   assert.ok(g.levels.at(-1).bottom<=g.card.bottom,JSON.stringify(g));
   await page.locator('#bnPageNext_mapScroll').tap();assert.equal(await page.evaluate(()=>BlastNexaWorldPage().world),1);await page.locator('#bnPagePrev_mapScroll').tap();assert.equal(await page.evaluate(()=>BlastNexaWorldPage().world),0);
   await page.locator('#mapLevelsNext').tap();assert.equal(await page.evaluate(()=>BlastNexaWorldPage().first),11);await page.locator('#mapLevelsPrev').tap();assert.equal(await page.evaluate(()=>BlastNexaWorldPage().first),1);
   assert.equal(await page.locator('#mapLevel1').isEnabled(),true);assert.equal(await page.locator('#mapLevel2').isDisabled(),true);
   await page.screenshot({path:path.join(out,'map-'+w+'-'+h+'-'+safe+'.png')});
  });
  await test('Puzzle board stays square and centred between equal side panels at '+w+'x'+h+' safe '+safe,async()=>{
   await page.evaluate(()=>{start('adventure',1);});await page.waitForTimeout(150);
   const g=await page.evaluate(()=>{const b=document.getElementById('boardShell').getBoundingClientRect(),a=document.querySelector('#game .bn-wide-game').getBoundingClientRect();return {centre:b.x+b.width/2,expected:a.x+a.width/2,w:b.width,h:b.height,top:b.top,bottom:b.bottom};});assert.ok(Math.abs(g.centre-w/2)<1&&Math.abs(g.centre-g.expected)<1&&Math.abs(g.w-g.h)<1&&g.top>=0&&g.bottom<=h,JSON.stringify(g));
   await page.screenshot({path:path.join(out,'puzzle-'+w+'-'+h+'-'+safe+'.png')});
  });
  await context.close();
 }
 await test('All twenty worlds and their two thousand level buttons remain reachable with the original lock rules',async()=>{
  const {page,context}=await fresh();await page.evaluate(()=>{displayMenu();openAdventureMap();});
  const result=await page.evaluate(()=>{let count=0;const seen=new Set();for(let world=0;world<20;world++)for(let levelPage=0;levelPage<10;levelPage++){mapWorld=world;mapPage=levelPage;renderAdventureMap();const nodes=[...document.querySelectorAll('#worlds .level-node')];if(nodes.length!==10)throw Error('Missing level page');for(const node of nodes){const n=Number(node.id.replace('mapLevel',''));if(node.disabled!==(n>unlocked))throw Error('Unlock rule changed');seen.add(n);count++;}}return{count,unique:seen.size,min:Math.min(...seen),max:Math.max(...seen)};});assert.deepEqual(result,{count:2000,unique:2000,min:1,max:2000});await context.close();
 });
 await test('The self-contained HTML preview opens its actual coin bonus and puzzle map',async()=>{
  const context=await browser.newContext({viewport:{width:1100,height:650},hasTouch:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  await page.goto('file://'+path.join(root,'../output/BlastNexa_v33_Anteprima.html'));await page.locator('[data-action=mega]').waitFor();await page.waitForFunction(()=>!document.querySelector('[data-action=mega]').disabled);
  await page.locator('[data-action=mega]').tap();const frame=page.frameLocator('#game');await frame.locator('#bnSupernova').waitFor();assert.equal(await frame.locator('.sn-coin').count(),12);await frame.locator('#snRevealAll').tap();await frame.locator('#snSkip').tap();await page.locator('[data-action=map]').tap();await frame.locator('#adventureMap').waitFor();await context.close();
 });
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:tests.length,tests,errors,geometry},null,2));console.log(JSON.stringify({passed:tests.length,errors}));await browser.close();
})().catch(async e=>{console.error(e);fs.writeFileSync(path.join(out,'failure.txt'),e.stack);await browser?.close();process.exit(1);});
