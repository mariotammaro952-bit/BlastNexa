'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa/v34-browser'),tests=[],errors=[],geometry=[];let browser,lastPage;
fs.mkdirSync(out,{recursive:true});
async function test(name,fn){await fn();tests.push(name);console.log('PASS',name);}
async function fresh(w=915,h=412,safe=0){
 const context=await browser.newContext({viewport:{width:w,height:h},hasTouch:true});
 await context.addInitScript(()=>{localStorage.setItem('blastnexa_help_seen','true');localStorage.setItem('blastnexa_muted','true');window.__layouts=[];window.BlastNexaAds={bannerLayout:data=>window.__layouts.push(JSON.parse(data))};});
 const page=await context.newPage();lastPage=page;page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());await page.goto('file://'+path.join(root,'game/index.html'));
 await page.evaluate(safe=>{document.getElementById('overlay').classList.remove('on');document.documentElement.style.setProperty('--bn-safe-left',safe+'px');playerSettings.effects='full';applyPlayerSettings();displayMenu();},safe);await page.waitForTimeout(120);return {page,context};
}
const ledger=p=>p.evaluate(()=>({coins:lifeData.slot.wallet.balance,lives:lifeData.balance,tokens:coinRushTokens(),won:lifeData.slot.wallet.won,total:lifeData.slot.total}));
// Geometry/lifecycle fixtures commit a real spin, cancel only the reel animation,
// then open its valid bonus. The full reel-to-bonus path is checked separately.
async function quickBonus(p){assert.equal(await p.evaluate(()=>{if(bnSupernovaRun)bnSupernovaFinish();cancelSlotAnimation();document.getElementById('overlay').classList.remove('on');if(!slotVisible())openUniverse('slot');lifeData.slot.arcade.bonus=null;lifeData.slot.arcade.revealed=null;lifeData.slot.arcade.freeSpins=0;setArcadeMachine('temple');lifeData.slot.wallet.balance=50000;const random=slotRandomInt;slotRandomInt=()=>0;try{if(!spinLifeSlot())return false;}finally{slotRandomInt=random;}cancelSlotAnimation();return bnSupernovaStart({key:'spin:'+lifeData.slot.last.spin});}),true);}
function inside(b,w,h,safe=0){assert.ok(b.x>=safe-1&&b.y>=-1&&b.right<=w+1&&b.bottom<=h+1,JSON.stringify({b,w,h,safe}));}
(async()=>{
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.BN_QA_CHROMIUM?{executablePath:process.env.BN_QA_CHROMIUM}:{})});
 const {page:p,context}=await fresh();
 await test('The home opens with exactly three large games in the requested order and new branding',async()=>{
  assert.deepEqual(await p.locator('#bnPrimaryGames>button').evaluateAll(ns=>ns.map(n=>n.id)),['openLifeSlot','openPuzzle','openWords']);assert.ok((await p.title()).includes('BlastNexta 3 in 1'));assert.equal(await p.locator('#menu .brand').textContent(),'BLASTNEXTA3 IN 1');
  await p.screenshot({path:path.join(out,'home-915-412.png')});await p.locator('#openPuzzle').tap();assert.equal(await p.locator('#adventureMap').isVisible(),true);await p.locator('#mapBack').tap();assert.equal(await p.locator('#bnPrimaryGames').isVisible(),true);await p.locator('#openWords').tap();assert.equal(await p.evaluate(()=>universeTab),'words');await p.evaluate(()=>displayMenu());
 });
 await test('Secondary games and themes remain reachable and their panel hides and restores the ad',async()=>{
  await p.locator('#bnMoreGames').tap();assert.equal(await p.locator('#bnMorePanel').isVisible(),true);assert.equal(await p.evaluate(()=>BlastNexaBannerLayout().visible),false);
  const seen=new Set();for(let i=0;i<10;i++){for(const id of await p.locator('.bn-more-grid>button:visible').evaluateAll(ns=>ns.map(n=>n.id)))seen.add(id);if(await p.locator('#bnMoreNext').isDisabled())break;await p.locator('#bnMoreNext').tap();}
  for(const id of ['startWar','startOcean','startAlien','startExplosive','startClassic','openMosaics','startDaily','startCircuit','openTrophies','openThemes','openBlockStyles','openUniverse'])assert.ok(seen.has(id),id);
  await p.keyboard.press('Escape');assert.equal(await p.locator('#bnMorePanel').isVisible(),false);assert.equal(await p.evaluate(()=>BlastNexaBannerLayout().visible),true);
 });
 await test('A real spin starts the song only when the bonus appears and gives no untapped bonus awards',async()=>{
  await p.locator('#openLifeSlot').tap();await p.locator('#slotCabinet').tap({position:{x:10,y:10}});
  await p.evaluate(()=>{muted=false;updateAudioMix();lifeData.slot.arcade.musicEnabled=true;slotMediaSync();slotRandomInt=()=>0;lifeData.slot.wallet.balance=50000;});
  await p.waitForFunction(()=>slotMusicKey==='music'&&!!slotMusicNode);await p.locator('#slotSpinButton').tap();await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>slotMusicKey),'music');assert.equal(await p.locator('#bnSupernova').count(),0);
  await p.waitForSelector('#bnSupernova');await p.waitForFunction(()=>slotMusicKey==='hype'&&!!slotMusicNode);assert.equal(await p.evaluate(()=>slotMusicOffset),0);
  assert.equal(await p.locator('.sn-coin').count(),12);assert.equal(await p.locator('#snRevealAll').count(),0);assert.equal(await p.locator('#snHourglass svg').count(),1);assert.ok(await p.locator('#snTimer').textContent());
  assert.deepEqual(await p.evaluate(()=>lifeData.slot.rush.active.collected),{coins:0,lives:0,respins:0});assert.equal(await p.evaluate(()=>BlastNexaBannerLayout().visible),false);assert.equal(await p.evaluate(()=>document.getElementById('universeScreen').inert),true);await p.locator('#snSkip').tap();
 });
 await test('300/200 coins, lives and relaunch x2 are visibly collected, while page changes share one 10-second clock',async()=>{
  await quickBonus(p);const before=await ledger(p),deadline=await p.evaluate(()=>lifeData.slot.rush.active.endsAt);
  const indices=await p.evaluate(()=>['coins:300','coins:200','lives:3','respins:2'].map(w=>coinRushPrizes(lifeData.slot.rush.active.seed).findIndex(p=>p.kind+':'+p.amount===w)));
  for(const index of indices){const desired=Math.floor(index/12);while(await p.evaluate(()=>bnSupernovaRun.page)<desired)await p.locator('#snNext').tap();while(await p.evaluate(()=>bnSupernovaRun.page)>desired)await p.locator('#snPrev').tap();await p.locator('#snCoin'+index%12).tap();assert.equal(await p.locator('#snCoin'+index%12).isDisabled(),true);}
  const after=await ledger(p);assert.equal(after.coins,before.coins+500);assert.equal(after.lives,before.lives+3);assert.equal(after.tokens,before.tokens+2);assert.equal(await p.evaluate(()=>lifeData.slot.rush.active.endsAt),deadline);
  assert.equal(await p.evaluate(()=>coinRushClaim(lifeData.slot.rush.active.id,lifeData.slot.rush.active.claimed[0])),null);await p.screenshot({path:path.join(out,'bonus-collected.png')});
  await p.waitForSelector('#snSummary',{timeout:11000});const elapsed=await p.evaluate(()=>Date.now()-lifeData.slot.rush.active.startedAt);assert.ok(elapsed>=10000&&elapsed<11600,elapsed);
  assert.equal(await p.locator('#snSummary h2').textContent(),'4 MONETE RACCOLTE');assert.deepEqual(await ledger(p),after);assert.equal(await p.evaluate(()=>coinRushClaim(lifeData.slot.rush.active.id,35)),null);await p.screenshot({path:path.join(out,'bonus-summary.png')});await p.locator('#snContinue').tap();assert.equal(await p.evaluate(()=>slotBusy),false);assert.equal(await p.evaluate(()=>BlastNexaBannerLayout().visible),true);
 });
 await test('An earned relaunch works at reactor zero, spends one token and costs zero coins',async()=>{
  await p.evaluate(()=>{setArcadeMachine('forge');lifeData.slot.arcade.reactor=0;slotRandomInt=max=>max-1;spinLifeSlot();cancelSlotAnimation();renderLifeSlot(document.getElementById('universeBody'));});
  const before=await ledger(p);await p.locator('#slotHold0').tap();assert.equal(await p.locator('#slotRespinButton').isEnabled(),true);assert.equal(await p.locator('#slotRespinButton').evaluate(n=>getComputedStyle(n,'::after').animationName),'bnRedRelaunch');
  await p.locator('#slotRespinButton').tap();assert.equal(await p.evaluate(()=>lifeData.slot.last.coinCost),0);assert.equal(await p.evaluate(()=>coinRushTokens()),before.tokens-1);assert.equal(await p.evaluate(()=>spinLifeSlot('respin')),false);await p.evaluate(()=>cancelSlotAnimation());
 });
 await test('Blur and reload stop the round without losing touched prizes or restarting the same bonus',async()=>{
  await quickBonus(p);await p.locator('#snCoin0').tap();const before=await ledger(p),id=await p.evaluate(()=>lifeData.slot.rush.active.id);await p.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await p.locator('#bnSupernova').count(),0);assert.deepEqual(await ledger(p),before);assert.equal(await p.evaluate(id=>coinRushBegin(id),id),null);await p.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await quickBonus(p);await p.locator('#snCoin1').tap();const collected=await ledger(p);await p.reload();assert.deepEqual(await ledger(p),collected);assert.equal(await p.locator('#bnSupernova').count(),0);assert.equal(await p.evaluate(()=>lifeData.slot.rush.active.state),'closed');
 });
 await context.close();
 for(const [w,h,safe]of [[640,360,0],[720,360,0],[768,345,40],[800,360,0],[915,412,0],[1024,600,0],[1280,720,0],[1600,720,0],[800,360,35],[915,412,45],[740,320,36],[390,844,0]]){
  const {page,context}=await fresh(w,h,safe);
  await test('The three primary games fit and can be tapped at '+w+'x'+h+' safe '+safe,async()=>{
   const g=await page.locator('#bnPrimaryGames>button').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};}));for(const b of g){inside(b,w,h,safe);assert.ok(b.w>=100&&b.h>=90,JSON.stringify(b));}if(w>h)assert.ok(g[0].right<=g[1].x+1&&g[1].right<=g[2].x+1);else assert.ok(g[0].bottom<=g[1].y+1&&g[1].bottom<=g[2].y+1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));geometry.push({w,h,safe,home:g});await page.screenshot({path:path.join(out,'home-'+w+'-'+h+'-'+safe+'.png')});await page.locator('#openLifeSlot').tap();assert.equal(await page.locator('#slotSpinButton').isVisible(),true);
  });
  await test('Twelve circular bonus touch targets, timer and navigation fit at '+w+'x'+h+' safe '+safe,async()=>{
   await quickBonus(page);const boxes=await page.locator('.sn-coin,#snHourglass,#snPrev,#snNext').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {id:n.id,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};}));for(const b of boxes)inside(b,w,h,safe);for(const b of boxes.slice(0,12)){assert.ok(b.w>=44&&b.h>=44&&Math.abs(b.w-b.h)<2,JSON.stringify(b));}
   await page.locator('#snCoin0').tap();await page.screenshot({path:path.join(out,'rush-'+w+'-'+h+'-'+safe+'.png')});await page.locator('#snSkip').tap();
  });
  if(w>h)await test('The centred puzzle map and board retain their full visible layout at '+w+'x'+h+' safe '+safe,async()=>{
   await page.evaluate(()=>{displayMenu();openAdventureMap();});await page.waitForTimeout(120);
   const g=await page.evaluate(()=>{const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};return{screen:box(document.getElementById('adventureMap')),scroll:box(document.getElementById('mapScroll')),pager:box(document.getElementById('bnPages_mapScroll')),ad:box(document.getElementById('gameBanner')),levels:[...document.querySelectorAll('#worlds .level-node')].map(box)};});assert.ok(Math.abs(g.screen.x+g.screen.w/2-w/2)<1);assert.equal(g.levels.length,10);assert.ok(g.scroll.bottom<=g.pager.y+1&&g.pager.bottom<=g.ad.y+1);for(const b of g.levels){inside(b,w,h,safe);assert.ok(b.bottom<=g.scroll.bottom+1);}
   await page.locator('#mapLevel1').tap();await page.waitForTimeout(120);const board=await page.locator('#boardShell').boundingBox();assert.ok(Math.abs(board.x+board.width/2-w/2)<1&&Math.abs(board.width-board.height)<1);assert.ok(board.y>=0&&board.y+board.height<=h);
  });
  await context.close();
 }
 await test('The self-contained HTML opens the new home and its real ten-second bonus',async()=>{
  const context=await browser.newContext({viewport:{width:1100,height:650},hasTouch:true}),page=await context.newPage();lastPage=page;page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());await page.goto('file://'+path.join(root,'../output/BlastNexta_3_in_1_v34_Anteprima.html'));await page.waitForFunction(()=>!document.querySelector('[data-action=mega]').disabled);const frame=page.frameLocator('#game');assert.equal(await frame.locator('#bnPrimaryGames>button').count(),3);await page.locator('[data-action=mega]').tap();await frame.locator('#bnSupernova').waitFor();assert.equal(await frame.locator('#snHourglass').count(),1);await frame.locator('#snCoin0').tap();await frame.locator('#snSkip').tap();await page.locator('[data-action=home]').tap();assert.equal(await frame.locator('#bnPrimaryGames').isVisible(),true);await page.locator('[data-action=map]').tap();assert.equal(await frame.locator('#mapLevel1').isVisible(),true);await context.close();
 });
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:tests.length,tests,errors,geometry},null,2));console.log(JSON.stringify({passed:tests.length,errors}));await browser.close();
})().catch(async e=>{console.error(e);fs.writeFileSync(path.join(out,'failure.txt'),e.stack);try{await lastPage?.screenshot({path:path.join(out,'failure.png')});}catch{}await browser?.close();process.exit(1);});
