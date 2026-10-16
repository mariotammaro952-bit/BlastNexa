const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:393,height:852}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+path.resolve('app/src/main/assets/index.html'));await page.evaluate(()=>{muted=true;playerSettings.haptics=false;playerSettings.effects='full'});
for(const scene of ['war','ocean']){
 await page.evaluate(s=>{setScene(s);start('adventure',1)},scene);
 for(const [i,x]of [[0,0],[1,3]]){assert.equal(await page.evaluate(([i,x])=>placePiece(i,x,6),[i,x]),true);await page.waitForFunction(()=>!fxBusy);}
 assert.equal(await page.evaluate(()=>placePiece(2,6,6)),true);
 assert.equal(await page.evaluate(()=>playing),false);assert.equal(await page.locator('#roundNotice').textContent(),'✓ LIVELLO COMPLETATO');
 const snapshot=await page.evaluate(()=>JSON.stringify({board,moves,score}));assert.equal(await page.evaluate(()=>placePiece(0,0,0)),false);assert.equal(await page.evaluate(()=>JSON.stringify({board,moves,score})),snapshot);
 await page.waitForFunction(()=>$('overlay').classList.contains('on'));
 assert.equal(await page.locator('#dialogTitle').textContent(),'LIVELLO SUPERATO!');assert.equal(await page.evaluate(()=>moves),3);
 await page.evaluate(()=>{const next=$('dialogPrimary').onclick;next();next();});assert.equal(await page.evaluate(()=>level),2);
 await page.waitForTimeout(1500);assert.equal(await page.evaluate(()=>playing&&moves===0&&!$('overlay').classList.contains('on')),true);
 await page.evaluate(()=>{start('adventure',1);placePiece(0,0,6);start('adventure',2)});await page.waitForTimeout(1400);assert.equal(await page.evaluate(()=>playing&&level===2&&moves===0),true);
}
assert.deepEqual(errors,[]);fs.mkdirSync('qa-output',{recursive:true});fs.writeFileSync('qa-output/real-timing.json',JSON.stringify({passed:true,scenes:['war','ocean'],realTimers:true,cases:['immediate-input-lock','result-after-fx','single-next','stale-callback-cancellation']}));console.log('PASS: real browser timers, both environments, immediate lock, result, double Next, stale callbacks');await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
