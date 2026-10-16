const {chromium}=require('playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
(async()=>{
 fs.mkdirSync('qa-output',{recursive:true});
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.resolve('app/src/main/assets/index.html'));
 await page.evaluate(()=>{muted=true;playerSettings.effects='lite';});
 for(const scene of ['war','ocean']){
  await page.evaluate(()=>displayMenu());await page.locator(`[data-choice="${scene}"]`).click();
  assert.equal(await page.locator('#app').getAttribute('data-scene'),scene);
  await page.screenshot({path:`qa-output/${scene}-menu.png`});
  await page.evaluate(()=>start('adventure',1));
  assert.match(await page.locator('#missionMoves').textContent(),/7 MOSSE/);
  await page.screenshot({path:`qa-output/${scene}-game.png`});
  await page.evaluate(()=>placePiece(0,0,6));await page.waitForTimeout(120);
  await page.reload();await page.evaluate(()=>{muted=true;playerSettings.effects='lite';resumeSession();});
  assert.equal(await page.evaluate(()=>moves),1);
  assert.equal(await page.locator('#app').getAttribute('data-scene'),scene);
  await page.evaluate(()=>undoMove());assert.equal(await page.evaluate(()=>moves),0);
  await page.evaluate(()=>start('adventure',1));
  for(const step of [{i:0,x:0,y:6},{i:1,x:3,y:6},{i:2,x:6,y:6}]){
   await page.evaluate(s=>placePiece(s.i,s.x,s.y),step);await page.waitForTimeout(130);
  }
  await page.waitForFunction(()=>$('dialogTitle').textContent==='LIVELLO SUPERATO!'&&$('overlay').classList.contains('on'));
  await page.evaluate(()=>{start('adventure',1);moves=mission.moves-1;placePiece(0,0,0);});await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>playing),false);assert.match(await page.locator('#dialogDesc').textContent(),/Mosse esaurite/);
  await page.evaluate(()=>{start('classic');board[2][2]=1;board[2][3]=2;board[3][2]=3;pulse=100;playerSettings.effects='full';render();activateBestPulse();});
  assert.equal(await page.evaluate(()=>fxBusy),true);assert.equal(await page.locator('.pulse-actor').count(),3);
  await page.waitForTimeout(280);await page.screenshot({path:`qa-output/${scene}-pulse.png`});
  await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>fxBusy),false);
  // A new session cancels old scene animation callbacks.
  await page.evaluate(()=>{board[2][2]=1;pulse=100;activateBestPulse();start('adventure',1);});
  await page.waitForTimeout(1300);assert.equal(await page.evaluate(()=>moves),0);assert.equal(await page.evaluate(()=>playing),true);
 }
 for(const size of [{width:360,height:640},{width:412,height:915}]){
  await page.setViewportSize(size);await page.evaluate(()=>start('adventure',2000));
  const fits=await page.locator('.minigrid').evaluateAll(grids=>grids.every(g=>{const r=g.getBoundingClientRect(),s=g.parentElement.getBoundingClientRect();return r.left>=s.left&&r.right<=s.right&&r.top>=s.top&&r.bottom<=s.bottom;}));assert.ok(fits,'All tray pieces fit their slots');
  const r=await page.locator('#board').boundingBox();assert.ok(r.x>=0&&r.x+r.width<=size.width);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`qa-output/layout-${size.width}.png`,fullPage:true});
 }
 assert.deepEqual(errors,[]);console.log('PASS: phone layouts, both scenes, persistence, undo, wins, move cutoff, both animated Pulse effects, stale callback cancellation');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
