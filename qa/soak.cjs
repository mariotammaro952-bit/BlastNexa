const fs=require('node:fs'),assert=require('node:assert/strict'),{createRuntime}=require('./runtime.cjs');let r=createRuntime('game/index.html');const started=Date.now(),counts={spin:0,free:0,respin:0,chests:0,breaks:0,reloads:0},tests=[];let expected=50,maxTimers=0;
function init(){r.run(`lifeData.balance=Math.max(50,lifeData.balance);playerSettings.effects='lite';openUniverse('slot')`);}init();
for(let i=0;i<10000;i++){
 if(r.run('lifeData.slot.arcade.bonus!==null')){const before=r.run('lifeData.balance');assert.equal(r.run(`claimArcadeChest(${i%3})`),true);expected+=r.run('lifeData.balance')-before;counts.chests++;assert.equal(r.run(`claimArcadeChest(${i%3})`),false);}
 r.run('dismissTempleScene();dismissCrystalScene()');
 if(r.run('lifeData.slot.sinceAd>=SLOT_AD_INTERVAL')){assert.equal(r.run('openSlotBreak()'),true);r.elements.get('dialogPrimary').click();assert.equal(r.run('lifeData.slot.sinceAd'),0);counts.breaks++;}
 if(i%100===0&&!r.run('lifeData.slot.arcade.freeSpins'))r.run(`setArcadeMachine(${JSON.stringify(['temple','crystal','forge'][Math.floor(i/100)%3])})`);
 let kind='spin';if(r.run(`lifeData.slot.arcade.machine==='forge'&&lifeData.slot.arcade.reactor>=6&&arcadeCurrentLast()?.arcade?.machine==='forge'`)){r.run('toggleSlotHold(0);toggleSlotHold(2)');kind='respin';}
 const before=r.run('lifeData.slot.total'),prior=JSON.parse(r.run('JSON.stringify(arcadeCurrentLast())'));
 assert.equal(r.run(`spinLifeSlot(${JSON.stringify(kind)})`),true,'spin '+i);const last=JSON.parse(r.run('JSON.stringify(lifeData.slot.last)'));assert.equal(r.run('lifeData.slot.total'),before+1);expected+=last.credited;counts[last.arcade.kind]++;
 if(kind==='respin')for(const col of [0,2])assert.deepEqual(last.arcade.grid[col],prior.arcade.grid[col]);
 if(i%97===0){const stored=r.stored;r=createRuntime('game/index.html',{initialStorage:stored});r.run(`playerSettings.effects='lite';openUniverse('slot')`);counts.reloads++;}else r.clock.advance(6000);
 assert.equal(r.run('lifeData.balance'),expected,'balance '+i);assert.equal(r.run('slotBusy'),false);assert.equal(r.run('lifeData.slot.archive.history.length'),Math.min(10,i+1));maxTimers=Math.max(maxTimers,r.clock.timers.size);assert.ok(maxTimers<=80);
 if(i%1000===999)console.log('spins',i+1,'lives',expected,'seconds',Math.round((Date.now()-started)/1000));
}
assert.equal(r.run('lifeData.slot.total'),10000);tests.push('10,000 actual slot commits: all modes, bonus/free/respin/hold, ad breaks and history conservation');tests.push('104 reloads during a committed spin preserve the exact balance and never repeat a reward');
const values=[null,'bad',[],{},-1,1e99,true],keys=['blastnexa_stars_v041','blastnexa_unlocked_v041','blastnexa_best','blastnexa_stats_v07','blastnexa_player_v22','blastnexa_ranking_v22'];let cases=0;
for(const key of keys)for(const value of values){const n=createRuntime('game/index.html',{initialStorage:{[key]:JSON.stringify(value)}});assert.equal(n.run('Number.isInteger(unlocked)&&unlocked>=1&&unlocked<=2000'),true);assert.equal(n.run('typeof stars==="object"&&stars!==null&&!Array.isArray(stars)'),true);assert.equal(n.run('Number.isSafeInteger(best)&&best>=0'),true);assert.equal(n.run('Object.values(trophyStats()).every(x=>Number.isSafeInteger(x)&&x>=0)'),true);n.run('openPlayer();openAdventureMap();start("adventure",1);openTrophyRoom()');cases++;}
tests.push('42 malformed saved-state cases restore bounded, usable progress without exceptions');
fs.writeFileSync('qa/soak_result.json',JSON.stringify({spins:10000,counts,exactExpectedBalance:expected,maxPendingTimers:maxTimers,malformedStorageCases:cases,seconds:(Date.now()-started)/1000,tests,scope:'Exact production transactions and state with DOM/clock adapters; physical-device thermal/ANR profiling is not represented.'},null,2));
