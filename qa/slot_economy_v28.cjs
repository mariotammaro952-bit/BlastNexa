// Repeatable release gate: 10,000 committed spins per world with an independent ledger.
// Uses the exact bundled engine; DOM, time and ad transport are adapters, not a device claim.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {createRuntime}=require('./runtime.cjs');
const file='game/index.html',tests=[],worlds=[],started=Date.now();
const read=(r,s)=>JSON.parse(r.run('JSON.stringify('+s+')'));
const settle=r=>r.clock.advance(6000);
function fresh(machine='temple',initialStorage=null){
 const r=createRuntime(file,{initialStorage});
 r.run(`playerSettings.effects='lite';openUniverse('slot');setArcadeMachine(${JSON.stringify(machine)})`);return r;
}
function test(name,fn){fn();tests.push(name);console.log('PASS',name);}
// Enumerate routes and evaluate a run length independently from the production scorer.
const routes=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0]];
function oracle(grid,lineCount){
 let coins=0,lives=0,lines=0;
 for(const route of routes.slice(0,lineCount)){
  const line=route.map((row,col)=>grid[col][row]),normal=line.find(s=>s!=='W');
  const target=!normal||normal==='B'?'♥':normal;let length=0;
  for(const s of line){if(s===target||s==='W')length++;else break;}
  const award=length===5?5:length===4?2:length===3?1:0;
  coins+=award*5;lives=Math.max(lives,award);if(award)lines++;
 }
 return {coins,lives,lines};
}
test('3/4/5 matching symbols award the published coin and life pair, once across restart',()=>{
 for(const [matches,coins,lives]of [[3,5,1],[4,10,2],[5,25,5]]){
  const r=fresh();r.run(`window.draw=0;slotRandomInt=max=>max===100?(Math.floor(window.draw++/3)<${matches}?0:14):0`);
  assert.equal(r.run('spinLifeSlot()'),true);assert.equal(r.run('spinLifeSlot()'),false);
  assert.equal(r.run('lifeData.slot.wallet.balance'),99+coins);assert.equal(r.run('lifeData.slot.wallet.won'),coins);
  assert.equal(r.run('lifeData.balance'),5+lives);assert.equal(r.run('lifeData.slot.last.coinsCredited'),coins);
  const loaded=fresh('temple',r.stored);settle(loaded);
  assert.equal(loaded.run('lifeData.slot.wallet.balance'),99+coins);assert.equal(loaded.run('lifeData.balance'),5+lives);
  assert.equal(loaded.run('lifeData.slot.archive.coins'),coins);assert.equal(loaded.run('lifeData.slot.archive.history[0].coinsCredited'),coins);
 }
});
test('All selected winning lines add coins, while the best line alone awards lives',()=>{
 const r=fresh();r.run('slotRandomInt=()=>0;setSlotLineCount(10);spinLifeSlot()');settle(r);
 assert.equal(r.run('lifeData.slot.last.coinPrize'),250);assert.equal(r.run('lifeData.slot.wallet.balance'),340);
 assert.equal(r.run('lifeData.balance'),10);assert.equal(r.run('lifeData.slot.archive.coins'),250);
 assert.equal(r.elements.get('slotWinCoinCount').textContent,'+250');assert.equal(r.elements.get('slotWinCount').textContent,'+5');
});
test('Chests and earned missions credit paired rewards once, including after reload',()=>{
 const r=fresh();r.run("lifeData.slot.arcade.bonus={id:'chest:1',choices:[1,2,5]};claimArcadeChest(2)");
 assert.equal(r.run('lifeData.slot.wallet.balance'),125);assert.equal(r.run('lifeData.balance'),10);
 assert.equal(r.run('claimArcadeChest(2)'),false);assert.equal(r.run('lifeData.slot.arcade.bonusCoins'),25);
 r.run('dismissTempleScene();lifeData.slot.arcade.spins=5');assert.equal(r.run("claimArcadeMission('first')"),true);
 assert.equal(r.run('lifeData.slot.wallet.balance'),135);assert.equal(r.run('lifeData.balance'),12);
 const loaded=fresh('temple',r.stored);assert.equal(loaded.run("claimArcadeMission('first')"),false);
 assert.equal(loaded.run('claimArcadeChest(2)'),false);assert.equal(loaded.run('lifeData.slot.wallet.balance'),135);
 assert.equal(loaded.run('lifeData.slot.wallet.won'),35);
});
test('v27 wallet, lives, last result and history survive without retroactive coin awards',()=>{
 const r=fresh();r.run(`slotRandomInt=()=>0;spinLifeSlot();cancelSlotAnimation();lifeData.slot.wallet.balance=38;
 delete lifeData.slot.wallet.won;delete lifeData.slot.archive.coins;
 for(const last of [lifeData.slot.last,...lifeData.slot.archive.history]){delete last.payoutVersion;delete last.coinPrize;delete last.coinsCredited;}saveLives()`);
 const loaded=fresh('temple',r.stored);settle(loaded);loaded.run("setArcadeView('collection');setArcadeView('play');refreshLivesUI()");
 assert.equal(loaded.run('lifeData.slot.wallet.balance'),38);assert.equal(loaded.run('lifeData.slot.wallet.won'),0);
 assert.equal(loaded.run('lifeData.balance'),10);assert.equal(loaded.run('lifeData.slot.last.coinsCredited'),0);
 assert.equal(loaded.run('lifeData.slot.archive.history[0].coinsCredited'),0);
});
test('Balance ceilings record the actual credited coins and lives without overflow',()=>{
 const r=fresh();r.run('lifeData.slot.wallet.balance=999998;lifeData.balance=999998;slotRandomInt=()=>0;spinLifeSlot()');settle(r);
 assert.equal(r.run('lifeData.slot.wallet.balance'),999999);assert.equal(r.run('lifeData.slot.last.coinsCredited'),2);
 assert.equal(r.run('lifeData.balance'),999999);assert.equal(r.run('lifeData.slot.last.credited'),1);
 assert.equal(r.run('lifeData.slot.wallet.won'),2);assert.equal(r.run('lifeData.slot.archive.coins'),2);
});
test('Full animation counts both saved awards and cancellation cannot replay either reward',()=>{
 const r=fresh();r.run("window.__BN_TEST_FAST__=false;playerSettings.effects='full';slotRandomInt=()=>0;spinLifeSlot()");
 assert.equal(r.run('lifeData.slot.wallet.balance'),124);assert.equal(r.run('displayedSlotCoins()'),99);
 r.clock.advance(3200);assert.equal(r.run('slotPhase'),'celebrating');
 const before=read(r,'[lifeData.slot.wallet.balance,lifeData.balance,lifeData.slot.wallet.won]');
 r.run('finishSlotCelebration();finishSlotCelebration();cancelSlotAnimation()');settle(r);
 assert.deepEqual(read(r,'[lifeData.slot.wallet.balance,lifeData.balance,lifeData.slot.wallet.won]'),before);
 assert.equal(r.run('displayedSlotCoins()'),124);assert.equal(r.elements.get('slotWinCoinCount').textContent,'+25');
});
for(const [worldIndex,machine]of ['temple','crystal','forge'].entries()){
 let r=fresh(machine);r.run(`lifeData.balance=100;lifeData.slot.wallet.balance=500000;lifeData.slot.seed=${921371+worldIndex*19777};saveLives()`);
 let expectedCoins=500000,expectedLives=100,spent=0,won=0,reelCoins=0,reelLives=0,maxTimers=0;
 const counts={spin:0,free:0,respin:0,chests:0,missions:0,breaks:0,reloads:0},lineCounts={1:0,5:0,10:0};
 for(let i=0;i<10000;i++){
  if(r.run('lifeData.slot.arcade.bonus!==null')){
   const choices=read(r,'lifeData.slot.arcade.bonus.choices'),prize=choices[i%3];
   assert.equal(r.run(`claimArcadeChest(${i%3})`),true);expectedCoins+=prize*5;expectedLives+=prize;won+=prize*5;counts.chests++;
   assert.equal(r.run(`claimArcadeChest(${i%3})`),false);
  }
  r.run('dismissTempleScene();dismissCrystalScene()');
  if(r.run('lifeData.slot.sinceAd>=SLOT_AD_INTERVAL')){
   assert.equal(r.run('openSlotBreak()'),true);r.elements.get('dialogPrimary').click();
   assert.equal(r.run('lifeData.slot.sinceAd'),0);counts.breaks++;
  }
  if(!r.run('lifeData.slot.arcade.freeSpins'))r.run(`setSlotLineCount(${[1,5,10][Math.floor(i/103)%3]})`);
  let kind='spin',prior=null;
  if(machine==='forge'&&r.run('lifeData.slot.arcade.reactor>=6&&!!arcadeCurrentLast()?.arcade')){
   assert.equal(r.run('toggleSlotHold(0)'),true);assert.equal(r.run('toggleSlotHold(2)'),true);
   prior=read(r,'lifeData.slot.last.arcade.grid');kind='respin';
  }
  assert.equal(r.run(`spinLifeSlot('${kind}')`),true,machine+' spin '+i);
  assert.equal(r.run('spinLifeSlot()'),false,'double tap during '+machine+' spin '+i);
  const last=read(r,'lifeData.slot.last'),check=oracle(last.arcade.grid,last.arcade.lineCount);
  assert.equal(last.coinPrize,check.coins);assert.equal(last.prize,check.lives);
  assert.equal(last.coinCost,last.arcade.kind==='free'?0:last.arcade.lineCount);
  expectedCoins=expectedCoins-last.coinCost+check.coins;expectedLives+=check.lives;spent+=last.coinCost;won+=check.coins;reelCoins+=check.coins;reelLives+=check.lives;
  assert.equal(last.coinsCredited,check.coins);lineCounts[last.arcade.lineCount]++;counts[last.arcade.kind]++;
  if(kind==='respin')for(const col of [0,2])assert.deepEqual(last.arcade.grid[col],prior[col]);
  if(i%97===0){r=fresh(machine,r.stored);counts.reloads++;}else settle(r);
  assert.equal(r.run('slotBusy'),false);assert.equal(r.run('lifeData.slot.total'),i+1);
  assert.equal(r.run('lifeData.slot.wallet.balance'),expectedCoins,machine+' coin ledger '+i);
  assert.equal(r.run('lifeData.balance'),expectedLives,machine+' life ledger '+i);
  assert.equal(r.run('lifeData.slot.wallet.spent'),spent);assert.equal(r.run('lifeData.slot.wallet.won'),won);
  assert.equal(r.run('lifeData.slot.archive.coins'),reelCoins);assert.equal(r.run('lifeData.slot.archive.lives'),reelLives);
  assert.equal(r.run('lifeData.slot.archive.history.length'),Math.min(10,i+1));
  maxTimers=Math.max(maxTimers,r.clock.timers.size);assert.ok(maxTimers<=2,'Unbounded pending timers');
  if(i%2000===1999){
   for(const q of read(r,'ARCADE_MISSIONS')){
    if(!r.run(`lifeData.slot.arcade.claimed.includes('${q.id}')`)&&r.run(`arcadeMetric(ARCADE_MISSIONS.find(q=>q.id==='${q.id}'))>=${q.goal}`)){
     assert.equal(r.run(`claimArcadeMission('${q.id}')`),true);assert.equal(r.run(`claimArcadeMission('${q.id}')`),false);
     expectedCoins+=q.reward*5;expectedLives+=q.reward;won+=q.reward*5;counts.missions++;
    }
   }
  }
  if(i%1000===999)console.log(machine,i+1,'commits; ledger balanced');
 }
 assert.equal(Object.values(counts).slice(0,3).reduce((a,b)=>a+b,0),10000);
 assert.ok(lineCounts[1]&&lineCounts[5]&&lineCounts[10]);assert.ok(counts.reloads>100);
 if(machine==='temple')assert.ok(counts.chests>0);if(machine==='crystal')assert.ok(counts.free>0);if(machine==='forge')assert.ok(counts.respin>0);
 worlds.push({machine,spins:10000,counts,lineCounts,spent,won,finalCoins:expectedCoins,finalLives:expectedLives,maxPendingTimers:maxTimers});
 console.log('PASS',machine,'10000 actual committed spins against independent coin and life ledgers');
}
const result={version:28,passed:tests.length+worlds.length,totalSpins:30000,tests,worlds,seconds:(Date.now()-started)/1000,scope:'Exact bundled game engine and save/reload transactions with DOM, clock and ad adapters. Native geometry, real ads and device stability are separate checks.'};
fs.writeFileSync('qa/slot_economy_v28_result.json',JSON.stringify(result,null,2)+'\n');
console.log('PASS 30000 spins, all three worlds and all line choices');
