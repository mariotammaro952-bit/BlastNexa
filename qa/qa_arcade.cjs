const assert=require('node:assert/strict'),fs=require('node:fs');
const {createRuntime}=require('./runtime.cjs');
const FILE='game/index.html',tests=[];
const fresh=()=>{const r=createRuntime(FILE);r.run("openUniverse('slot')");return r};
function test(name,fn){fn();tests.push(name);console.log('PASS',name)}
function settle(r){r.clock.advance(6000);assert.equal(r.run('slotBusy'),false);}
function snapshot(r,code){return JSON.parse(r.run('JSON.stringify('+code+')'));}
test('All eight symbols have their documented exact weight on the 100-point draw',()=>{
 const r=fresh(),counts={};for(let i=0;i<100;i++){r.run(`slotRandomInt=max=>max===100?${i}:0`);const symbol=r.run('arcadeDrawSymbol()');counts[symbol]=(counts[symbol]||0)+1;}
 assert.deepEqual(counts,{'♥':14,'◆':17,'✦':16,'☾':16,'✹':16,'❄':16,W:3,B:2});
});
test('6,000 generated matrices agree with an independent prefix-matching oracle in all three modes',()=>{
 const r=fresh(),evaluate=r.run('evaluateArcadeGrid'),lines=snapshot(r,'ARCADE_LINES'),symbols=['♥','◆','✦','☾','✹','❄','W','B'],seen=new Set();let seed=71839;
 for(const [machine,n]of [['temple',10],['crystal',15],['forge',5]])for(let t=0;t<2000;t++){
  const grid=Array.from({length:5},()=>Array.from({length:3},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return symbols[(seed>>>16)%8]}));seen.add(JSON.stringify(grid));let best=0,countWins=0;
  for(const row of lines.slice(0,n)){const line=row.map((y,x)=>grid[x][y]);let length=0;for(let k=3;k<=5;k++)if(symbols.slice(0,6).some(s=>line.slice(0,k).every(c=>c===s||c==='W')))length=k;if(length){countWins++;best=Math.max(best,length===5?5:length===4?2:1);}}
  const result=evaluate(grid,machine);assert.equal(result.prize,best);assert.equal(result.wins.length,countWins);
 }assert.equal(seen.size,6000);
});
test('A Wild substitutes normal symbols, Bonus never substitutes, and lines must begin on the first reel',()=>{
 const r=fresh(),evaluate=r.run('evaluateArcadeGrid'),grid=line=>line.map((symbol,i)=>[['❄','☾','✹','◆','✦'][i],symbol,['◆','✦','❄','☾','✹'][i]]);
 assert.equal(evaluate(grid(['♥','W','♥','☾','✹']),'forge').wins.find(w=>w.line===0).count,3);
 assert.equal(evaluate(grid(['♥','B','♥','♥','♥']),'forge').wins.some(w=>w.line===0),false);
 assert.equal(evaluate(grid(['☾','♥','♥','♥','♥']),'forge').wins.some(w=>w.line===0),false);
 assert.equal(evaluate(grid(['W','W','W','W','W']),'forge').prize,5);
});
test('Only the best payline awards lives even when all 15 lines win, with one atomic result per spin',()=>{
 const r=fresh();r.run("setArcadeMachine('crystal');slotRandomInt=()=>0");assert.equal(r.run('spinLifeSlot()'),true);assert.equal(r.run('spinLifeSlot()'),false);
 assert.equal(r.run('lifeData.balance'),10);assert.equal(r.run('lifeData.slot.total'),1);assert.equal(r.run('lifeData.slot.arcade.lines'),15);assert.equal(r.run('lifeData.slot.archive.lives'),5);settle(r);assert.equal(r.run('lifeData.balance'),10);assert.equal(r.run('finishSlotCelebration()'),false);
});
test('A pending chest survives reload, blocks spins, and can be claimed exactly once',()=>{
 const r=fresh();r.run('lifeData.slot.arcade.treasure=29;slotRandomInt=max=>max===100?31:0;spinLifeSlot()');settle(r);assert.ok(r.run('lifeData.slot.arcade.bonus'));assert.equal(r.run('lifeData.slot.arcade.treasure'),14);
 const reloaded=createRuntime(FILE,{initialStorage:r.stored});reloaded.run("openUniverse('slot')");const prize=reloaded.run('lifeData.slot.arcade.bonus.choices[1]'),before=reloaded.run('lifeData.balance');assert.equal(reloaded.run('spinLifeSlot()'),false);assert.equal(reloaded.run('claimArcadeChest(1)'),true);assert.equal(reloaded.run('claimArcadeChest(1)'),false);assert.equal(reloaded.run('lifeData.balance'),before+prize);
 const again=createRuntime(FILE,{initialStorage:reloaded.stored});assert.equal(again.run('lifeData.balance'),before+prize);assert.equal(again.run('lifeData.slot.arcade.chests'),1);assert.equal(again.run('lifeData.slot.arcade.bonus'),null);
});
test('Crystal awards three saved bonus spins, consumes one per spin and never retriggers within bonus spins',()=>{
 const r=fresh();r.run("setArcadeMachine('crystal');slotRandomInt=max=>max===100?98:0;spinLifeSlot()");settle(r);assert.equal(r.run('lifeData.slot.arcade.freeSpins'),3);assert.equal(r.run('lifeData.balance'),5);
 const resumed=createRuntime(FILE,{initialStorage:r.stored});resumed.run("openUniverse('slot');slotRandomInt=max=>max===100?98:0");
 for(let i=2;i>=0;i--){assert.equal(resumed.run('spinLifeSlot()'),true);settle(resumed);assert.equal(resumed.run('lifeData.slot.arcade.freeSpins'),i);assert.equal(resumed.run('lifeData.slot.last.arcade.freeAward'),0);}
 assert.equal(resumed.run('lifeData.slot.arcade.freePlayed'),3);assert.equal(resumed.run('lifeData.slot.total'),4);assert.equal(resumed.run('lifeData.slot.sinceAd'),4);
});
test('Forge keeps both selected reel columns stationary and redraws only the other three',()=>{
 const r=fresh();r.run("setArcadeMachine('forge');slotRandomInt=()=>0;spinLifeSlot()");settle(r);r.run('lifeData.slot.arcade.reactor=6');assert.equal(r.run('toggleSlotHold(0)'),true);assert.equal(r.run('toggleSlotHold(1)'),true);assert.equal(r.run('toggleSlotHold(2)'),false);
 r.run('slotRandomInt=max=>max===100?31:0');assert.equal(r.run("spinLifeSlot('respin')"),true);assert.deepEqual(snapshot(r,'lifeData.slot.last.arcade.grid'),[['♥','♥','♥'],['♥','♥','♥'],['✦','✦','✦'],['✦','✦','✦'],['✦','✦','✦']]);
 for(const i of [0,1]){assert.equal(r.elements.get('slotReel'+i).children[0].dataset.spinning,'no');assert.ok(r.elements.get('slotReel'+i).classList.contains('held'));}assert.equal(r.elements.get('slotReel2').children[0].dataset.spinning,'yes');settle(r);assert.equal(r.run('lifeData.slot.arcade.reactor'),0);assert.equal(r.run('lifeData.slot.arcade.respins'),1);assert.equal(r.run('lifeData.slot.total'),2);
 const loaded=createRuntime(FILE,{initialStorage:r.stored});assert.deepEqual(snapshot(loaded,'lifeData.slot.last.arcade.held'),[0,1]);
});
test('Mission claims survive reload without duplicate rewards and respect the balance ceiling',()=>{
 const r=fresh();r.run('lifeData.slot.arcade.spins=5;saveLives()');assert.equal(r.run("claimArcadeMission('first')"),true);assert.equal(r.run('lifeData.balance'),7);assert.equal(r.run("claimArcadeMission('first')"),false);
 const resumed=createRuntime(FILE,{initialStorage:r.stored});resumed.run("openUniverse('slot')");assert.equal(resumed.run("claimArcadeMission('first')"),false);resumed.run("lifeData.slot.arcade.lines=10;lifeData.balance=999998");assert.equal(resumed.run("claimArcadeMission('lines')"),true);assert.equal(resumed.run('lifeData.balance'),999999);assert.equal(resumed.run('lifeData.slot.arcade.missionLives'),3);
});
test('Automatic runs are finite and stop after exactly five or ten committed spins',()=>{
 for(const n of [5,10]){const r=fresh();r.run('slotRandomInt=()=>0');assert.equal(r.run(`startSlotAuto(${n})`),true);r.clock.advance(60000);assert.equal(r.run('lifeData.slot.total'),n);assert.equal(r.run('slotAutoLeft'),0);assert.equal(r.run('slotBusy'),false);assert.equal(r.run('lifeData.balance'),5+5*n);}
});
test('Stopping automatic play preserves the current result and prevents further spins',()=>{
 const r=fresh();r.run('slotRandomInt=()=>0;startSlotAuto(10)');const strip=r.elements.get('slotReel0').children[0];r.elements.get('slotAutoStop').click();assert.equal(r.elements.get('slotReel0').children[0],strip);r.clock.advance(60000);assert.equal(r.run('lifeData.slot.total'),1);assert.equal(r.run('lifeData.balance'),10);
});
test('An automatic run stops before spin 51 and resumes only after the ad-break callback',()=>{
 const r=fresh();r.run('slotRandomInt=()=>0;lifeData.slot.sinceAd=49;startSlotAuto(10)');r.clock.advance(60000);assert.equal(r.run('lifeData.slot.total'),1);assert.equal(r.run('lifeData.slot.sinceAd'),50);assert.equal(r.run('slotAutoLeft'),0);assert.equal(r.run('spinLifeSlot()'),false);
 r.run('bnRequestAd=(native,done)=>done()');r.elements.get('dialogPrimary').click();assert.equal(r.run('lifeData.slot.sinceAd'),0);assert.equal(r.run('spinLifeSlot()'),true);settle(r);assert.equal(r.run('lifeData.slot.total'),2);
});
test('New bonus features stop an automatic sequence before another result is committed',()=>{
 for(const feature of ['chest','free']){const r=fresh();r.run(feature==='chest'?'lifeData.slot.arcade.treasure=29;slotRandomInt=max=>max===100?31:0':"setArcadeMachine('crystal');slotRandomInt=max=>max===100?98:0");r.run('startSlotAuto(10)');r.clock.advance(60000);assert.equal(r.run('lifeData.slot.total'),1);assert.equal(r.run('slotAutoLeft'),0);}
});
test('Leaving or hiding the screen cancels pending animation and auto callbacks without losing a prize',()=>{
 for(const leave of ['home','hidden']){const r=fresh();r.run('slotRandomInt=()=>0;startSlotAuto(10)');if(leave==='home')r.run("openUniverse('home')");else{r.context.document.hidden=true;for(const fn of r.documentListeners.visibilitychange||[])fn();}r.clock.advance(60000);assert.equal(r.run('lifeData.slot.total'),1);assert.equal(r.run('lifeData.balance'),10);assert.equal(r.run('slotAutoLeft'),0);}
});
test('Mode and page switches are blocked during a spin, and result presentation never changes saved state',()=>{
 const r=fresh();r.run('slotRandomInt=()=>0;spinLifeSlot()');assert.equal(r.run("setArcadeMachine('forge')"),false);assert.equal(r.run("setArcadeView('missions')"),false);settle(r);const saved=snapshot(r,'lifeData');for(const view of ['missions','collection','rules','play'])assert.equal(r.run(`setArcadeView('${view}')`),true);assert.deepEqual(snapshot(r,'lifeData'),saved);
});
test('Legacy slot statistics, lives and in-progress crosswords migrate without replaying a prize',()=>{
 const old=createRuntime('../blastnexa_v18/BlastNexa_Cruciverba_Color_PC_v18.html');old.run("openUniverse('slot');slotRandomInt=()=>0;spinLifeSlot()");old.clock.advance(6000);old.run('startWord(2)');old.elements.get('wordRack').children.find(n=>!n.disabled).click();const word=snapshot(old,'wordData.active');
 const r=createRuntime(FILE,{initialStorage:old.stored});assert.equal(r.run('lifeData.balance'),10);assert.equal(r.run('lifeData.slot.total'),1);assert.equal(r.run('lifeData.slot.archive.lives'),5);assert.equal(r.run('lifeData.slot.last.prize'),5);assert.equal(r.run('lifeData.slot.arcade.spins'),0);assert.deepEqual(snapshot(r,'wordData.active'),word);r.run("openUniverse('slot')");assert.equal(r.run('lifeData.balance'),10);
});
test('New result matrices and all history entries survive a saved-session round trip',()=>{
 const r=fresh();for(const m of ['temple','crystal','forge']){r.run(`setArcadeMachine('${m}')`);for(let i=0;i<3;i++){assert.equal(r.run('spinLifeSlot()'),true);settle(r);}}
 const loaded=createRuntime(FILE,{initialStorage:r.stored});assert.deepEqual(snapshot(loaded,'lifeData.slot'),snapshot(r,'lifeData.slot'));assert.equal(loaded.run('lifeData.slot.archive.history.length'),9);
});
fs.writeFileSync('qa_arcade_v22_result.json',JSON.stringify({passed:tests.length,tests,randomGridComparisons:6000,scope:'Exact production script with DOM/event adapters. No browser geometry or device audio is simulated.'},null,2));
console.log(JSON.stringify({passed:tests.length}));
