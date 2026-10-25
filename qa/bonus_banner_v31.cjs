const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),tests=[],errors=[],details={};let browser;
async function test(name,fn){await fn();tests.push(name);console.log('PASS',name);}
async function fresh(width=915,height=412){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true});
 await context.addInitScript(()=>{localStorage.setItem('blastnexa_help_seen','true');localStorage.setItem('blastnexa_muted','false');window.__layouts=[];window.BlastNexaAds={bannerLayout:data=>window.__layouts.push(JSON.parse(data))};});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
 await page.goto('file://'+path.join(root,'game/index.html'));
 await page.evaluate(()=>{document.getElementById('overlay').classList.remove('on');openUniverse('slot');playerSettings.effects='full';lifeData.slot.arcade.musicEnabled=true;});
 // A gesture on the cabinet unlocks audio without purchasing a spin.
 await page.locator('#slotCabinet').tap({position:{x:10,y:10}});
 return {page,context};
}
async function song(page,key){await page.waitForFunction(key=>slotMusicKey===key&&!!slotMusicNode,key,{timeout:20000});}
async function start(page,options={}){assert.equal(await page.evaluate(o=>bnSupernovaStart(o),options),true);await song(page,'hype');}
(async()=>{
 browser=await chromium.launch({...(process.env.BN_QA_CHROMIUM?{executablePath:process.env.BN_QA_CHROMIUM}:{}),headless:true,args:['--no-sandbox']});
 const {page:p,context}=await fresh();
 await test('All three ordinary worlds keep their original soundtrack; Big Win Now never plays on entry',async()=>{
  for(const [world,key]of [['temple','music'],['crystal','music_crystal'],['forge','music_forge']]){
   await p.evaluate(world=>setArcadeMachine(world),world);await song(p,key);assert.equal(await p.evaluate(()=>slotMusicProfile().key),'hype'===key?'':key);
   assert.equal(await p.evaluate(()=>!!bnSupernovaRun),false);
  }
 });
 await test('A real mega spin keeps normal music through the reels, then starts Big Win Now with the bonus',async()=>{
  await p.evaluate(()=>{setArcadeMachine('temple');lifeData.slot.wallet.balance=1000;lifeData.balance=20;slotRandomInt=()=>0;});await song(p,'music');
  const before=await p.evaluate(()=>({coins:lifeData.slot.wallet.balance,lives:lifeData.balance,total:lifeData.slot.total}));
  assert.equal(await p.evaluate(()=>spinLifeSlot()),true);assert.equal(await p.evaluate(()=>slotMusicKey),'music');
  await p.waitForTimeout(600);assert.equal(await p.evaluate(()=>slotMusicKey),'music');assert.equal(await p.evaluate(()=>spinLifeSlot()),false);
  await song(p,'hype');assert.equal(await p.evaluate(()=>slotMusicOffset),0);
  const committed=await p.evaluate(()=>({coins:lifeData.slot.wallet.balance,lives:lifeData.balance,total:lifeData.slot.total,last:lifeData.slot.last}));
  assert.equal(committed.total,before.total+1);assert.equal(committed.coins,before.coins-committed.last.coinCost+committed.last.coinsCredited);assert.equal(committed.lives,before.lives+committed.last.credited);
  assert.equal(await p.evaluate(()=>window.BlastNexaBannerLayout().visible),false);assert.equal(await p.evaluate(()=>window.__layouts.at(-1).visible),false);
  await p.locator('#snContinue').tap();await song(p,'music');assert.equal(await p.evaluate(()=>slotBusy),false);assert.equal(await p.evaluate(()=>lifeData.slot.total),committed.total);details.realBonus={before,after:committed};
 });
 await test('Every bonus restarts the supplied song at zero and returns to its previous world on CONTINUA',async()=>{
  for(const [world,key]of [['crystal','music_crystal'],['forge','music_forge']]){
   await p.evaluate(world=>{setArcadeMachine(world);slotMusicOffsets.set('hype',37);},world);await song(p,key);
   await start(p,{title:'MEGA BONUS'});assert.equal(await p.evaluate(()=>slotMusicOffset),0);await p.locator('#snContinue').tap();await song(p,key);
   assert.equal(await p.evaluate(()=>slotMusicOffsets.has('hype')),false);
  }
 });
 await test('A delayed song decode cannot start Big Win Now after the bonus has been skipped',async()=>{
  await p.evaluate(()=>{window.__loadOriginal=slotLoadAudio;slotAudioBuffers.delete('hype');slotLoadAudio=name=>name==='hype'?new Promise(resolve=>setTimeout(()=>window.__loadOriginal(name).then(resolve),450)):window.__loadOriginal(name);bnSupernovaStart({});bnSupernovaFinish();});
  await p.waitForTimeout(1800);assert.notEqual(await p.evaluate(()=>slotMusicKey),'hype');assert.equal(await p.locator('#bnSupernova').count(),0);await p.evaluate(()=>{slotLoadAudio=window.__loadOriginal;});
 });
 await test('Music OFF suppresses the song while bonus effects remain available',async()=>{
  await p.evaluate(()=>{playerSettings.music=false;slotMediaSync();bnSupernovaStart({});});await p.waitForTimeout(250);
  assert.equal(await p.evaluate(()=>slotMusicNode),null);assert.ok(await p.evaluate(()=>bnSupernovaRun.voices.size>0));await p.locator('#snContinue').tap();await p.evaluate(()=>{playerSettings.music=true;slotMediaSync();});
 });
 await test('Mute immediately clears the song and all bonus cues without replaying the prize',async()=>{
  await start(p);const total=await p.evaluate(()=>lifeData.slot.total);
  await p.evaluate(()=>{muted=true;updateAudioMix();slotMediaSync();});assert.equal(await p.evaluate(()=>slotMusicNode),null);assert.equal(await p.evaluate(()=>bnSupernovaRun.voices.size),0);
  await p.locator('#snContinue').tap();assert.equal(await p.evaluate(()=>lifeData.slot.total),total);await p.evaluate(()=>{muted=false;updateAudioMix();slotMediaSync();});
 });
 await test('Losing focus cancels bonus audio, stops auto play and restores the central ad without another award',async()=>{
  await start(p);const coins=await p.evaluate(()=>lifeData.slot.wallet.balance);
  await p.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await p.evaluate(()=>slotMusicNode),null);assert.equal(await p.evaluate(()=>slotAutoLeft),0);assert.equal(await p.evaluate(()=>slotBusy),false);assert.equal(await p.evaluate(()=>lifeData.slot.wallet.balance),coins);
  await p.evaluate(()=>window.dispatchEvent(new Event('focus')));assert.notEqual(await p.evaluate(()=>slotMusicProfile().key),'hype');
 });
 await test('Loaded and unavailable callbacks control only the ad placeholder and ignore stale sessions',async()=>{
  assert.equal(await p.evaluate(()=>window.BlastNexaBannerStatus({session:gameSession-1,status:'loaded'})),false);
  await p.evaluate(()=>window.BlastNexaBannerStatus({session:gameSession,status:'loaded'}));assert.equal(await p.locator('#gameBannerPreview').evaluate(n=>n.hidden),true);
  await p.evaluate(()=>window.BlastNexaBannerStatus({session:gameSession,status:'unavailable'}));assert.equal(await p.locator('#gameBannerPreview').evaluate(n=>n.hidden),false);
  assert.equal(await p.locator('#slotBannerSeat .bn-radiance-note').count(),0);assert.equal(await p.locator('#slotBannerSeat .bn-modern-win').count(),0);
 });
 await context.close();details.layouts=[];
 for(const [w,h]of [[640,360],[720,360],[800,360],[915,412],[1024,600],[1280,720],[1600,720]]){
  await test('The native banner lies entirely inside the requested centre strip at '+w+'×'+h,async()=>{
   const {page,context}=await fresh(w,h);await page.waitForTimeout(150);
   const geometry=await page.evaluate(()=>{syncGameBanner(true);const box=id=>{const r=document.getElementById(id).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};return {seat:box('slotBannerSeat'),frame:box('gameBannerFrame'),spin:box('slotSpinButton'),coins:box('slotCoinWallet'),layout:window.BlastNexaBannerLayout(),scroll:document.documentElement.scrollWidth};});
   const {seat,frame,spin,coins,layout}=geometry;assert.ok(layout.visible,JSON.stringify(geometry));assert.equal(layout.slot,'slot_control_deck');assert.equal(frame.height,50);
   assert.ok(frame.left>=seat.left-1&&frame.right<=seat.right+1&&frame.top>=seat.top-1&&frame.bottom<=seat.bottom+1,JSON.stringify(geometry));
   assert.ok(frame.right<=spin.left-8&&frame.left>=coins.right+4,JSON.stringify(geometry));assert.ok(geometry.scroll<=w+1);
   assert.ok(Math.abs(layout.x-frame.left)<=.11&&Math.abs(layout.y-frame.top)<=.11);assert.ok(layout.width>=200);
   if(w===915)await page.screenshot({path:path.join(root,'qa/v31_centre_banner.png')});details.layouts.push({w,h,...geometry});await context.close();
  });
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(root,'qa/v31_extras_results.json'),JSON.stringify({passed:tests.length,tests,errors,details},null,2));console.log(JSON.stringify({passed:tests.length,errors}));await browser.close();
})().catch(async error=>{console.error(error);fs.writeFileSync(path.join(root,'qa/v31_extras_failure.txt'),error.stack);await browser?.close();process.exit(1);});
