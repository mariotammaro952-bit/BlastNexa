'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa/v35-browser'),tests=[],errors=[],geometry=[];let browser,lastPage;
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
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.BN_QA_CHROMIUM});
 const {page:p,context}=await fresh();
 await quickBonus(p);
 await p.locator('#snCoin0').tap();assert.equal(await p.evaluate(()=>lifeData.slot.rush.active.shots),0);
 await p.locator('#snRifle').tap();assert.equal(await p.evaluate(()=>lifeData.slot.rush.active.shots),1);
 await p.waitForTimeout(170);assert.equal(await p.locator('.revealed').count(),1);
 await p.screenshot({path:path.join(out,'fps-v36.png')});
 for(let i=1;i<5;i++){await p.locator('#snCoin'+i).tap();await p.locator('#snRifle').tap();}
 await p.waitForSelector('#snSummary');assert.equal(await p.evaluate(()=>lifeData.slot.rush.active.shots),5);assert.equal(await p.evaluate(()=>lifeData.slot.rush.active.claimed.length),5);
 await quickBonus(p);await p.locator('#snCoin0').tap();const g=await p.locator('#snRifle').boundingBox();await p.mouse.move(g.x+g.width/2,g.y+g.height/2);await p.mouse.down();await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>lifeData.slot.rush.active.shots),0);await p.mouse.up();assert.equal(await p.evaluate(()=>lifeData.slot.rush.active.shots),1);
 await p.locator('#snRifle').tap();assert.equal(await p.evaluate(()=>lifeData.slot.rush.active.shots),2);assert.equal(await p.evaluate(()=>lifeData.slot.rush.active.claimed.length),1);
 await p.waitForSelector('#snSummary');assert.equal(await p.evaluate(()=>lifeData.slot.rush.active.state),'closed');
 for(const [w,h] of [[640,360],[740,320],[915,412],[1600,720],[390,844]]){await p.setViewportSize({width:w,height:h});await quickBonus(p);const bounds=await p.locator('#snRifle,.sn-coin').evaluateAll(ns=>ns.sort((a,b)=>a.id==='snRifle'?-1:b.id==='snRifle'?1:0).map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}));for(const b of bounds){inside(b,w,h);assert.ok(b.width>=44&&b.height>=44);}assert.ok(bounds.slice(1).every(b=>b.right<=bounds[0].x||b.x>=bounds[0].right));await p.screenshot({path:path.join(out,'fps-'+w+'-'+h+'.png')});}
 assert.deepEqual(errors,[]);console.log('PASS v36 aim-only, weapon trigger, single shot, 5 shot limit, misses, timeout, 5 responsive layouts');await browser.close();
})().catch(async e=>{console.error(e);if(lastPage)await lastPage.screenshot({path:path.join(out,'v36-failure.png')});await browser?.close();process.exitCode=1;});
