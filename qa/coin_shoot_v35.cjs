'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{createRuntime}=require('./runtime.cjs');
const tests=[],read=(r,s)=>JSON.parse(r.run('JSON.stringify('+s+')'));
function test(name,fn){fn();tests.push(name);console.log('PASS',name);}
function fresh(initialStorage=null){const r=createRuntime('game/index.html',{initialStorage});r.run("playerSettings.effects='lite';openUniverse('slot');window.now=1800000000000;Date.now=()=>window.now");if(!initialStorage)r.run('lifeData.balance=50;lifeData.slot.wallet.balance=50000;saveLives()');return r;}
function trigger(r){r.run("coinRushEnd(lifeData.slot.rush.active?.id,'exit');dismissTempleScene();dismissCrystalScene();lifeData.slot.arcade.bonus=null;lifeData.slot.arcade.freeSpins=0;slotRandomInt=()=>0;spinLifeSlot()");r.clock.advance(6000);assert.equal(r.run("!!coinRushBegin('spin:'+lifeData.slot.last.spin)"),true);}
const state=r=>read(r,'[lifeData.slot.wallet.balance,lifeData.balance,coinRushTokens(),lifeData.slot.wallet.won,lifeData.slot.rush.wonCoins,lifeData.slot.rush.wonLives,lifeData.slot.rush.wonRespins]');
test('The 36 hidden targets retain 200/300 coins, varied lives and relaunch x1/x2',()=>{
 const r=fresh();for(let seed=0;seed<1000;seed++){const p=read(r,'coinRushPrizes('+seed+')');assert.equal(p.length,36);assert.deepEqual(p,read(r,'coinRushPrizes('+seed+')'));for(const [kind,values]of [['coins',[25,50,75,100,150,200,300]],['lives',[1,2,3]],['respins',[1,2]]])for(const amount of values)assert.ok(p.some(p=>p.kind===kind&&p.amount===amount));}
});
test('Five hits credit only the five hit prizes; every sixth shot is blocked',()=>{
 const r=fresh();trigger(r);const expected=state(r),pool=read(r,'coinRushPrizes(lifeData.slot.rush.active.seed)');
 for(let i=0;i<5;i++){const p=pool[i],hit=read(r,`coinRushClaim(lifeData.slot.rush.active.id,${i})`);assert.equal(hit.credited,p.amount);if(p.kind==='coins'){expected[0]+=p.amount;expected[3]+=p.amount;expected[4]+=p.amount;}if(p.kind==='lives'){expected[1]+=p.amount;expected[5]+=p.amount;}if(p.kind==='respins'){expected[2]+=p.amount;expected[6]+=p.amount;}assert.deepEqual(state(r),expected);}
 assert.equal(r.run('lifeData.slot.rush.active.shots'),5);assert.equal(r.run('lifeData.slot.rush.active.reason'),'ammo');assert.equal(r.run('lifeData.slot.rush.active.claimed.length'),5);for(let i=5;i<36;i++)assert.equal(r.run(`coinRushClaim(lifeData.slot.rush.active.id,${i})`),null);assert.deepEqual(state(r),expected);
});
test('Five misses spend all ammunition without any coin, life or relaunch award',()=>{
 const r=fresh();trigger(r);const before=state(r);for(let i=0;i<5;i++)assert.equal(r.run('coinRushClaim(lifeData.slot.rush.active.id,-1).kind'),'miss');assert.equal(r.run('lifeData.slot.rush.active.shots'),5);assert.equal(r.run('lifeData.slot.rush.active.claimed.length'),0);assert.equal(r.run('coinRushClaim(lifeData.slot.rush.active.id,0)'),null);assert.deepEqual(state(r),before);
});
test('Hits and misses share one five-shot budget; duplicate prizes cannot be credited',()=>{
 const r=fresh();trigger(r);r.run('coinRushClaim(lifeData.slot.rush.active.id,0)');const before=state(r);assert.equal(r.run('coinRushClaim(lifeData.slot.rush.active.id,0)'),null);assert.deepEqual(state(r),before);assert.equal(r.run('lifeData.slot.rush.active.shots'),1);for(const i of [-1,1,-1,2])assert.ok(r.run(`coinRushClaim(lifeData.slot.rush.active.id,${i})`));assert.equal(r.run('lifeData.slot.rush.active.shots'),5);assert.equal(r.run('lifeData.slot.rush.active.claimed.length'),3);
});
test('The hard deadline accepts 4,999 ms and rejects 5,000 ms',()=>{
 const r=fresh();trigger(r);assert.equal(r.run('lifeData.slot.rush.active.endsAt-lifeData.slot.rush.active.startedAt'),5000);r.run('window.now+=4999');assert.ok(r.run('coinRushClaim(lifeData.slot.rush.active.id,0)'));const before=state(r);r.run('window.now++');assert.equal(r.run('coinRushClaim(lifeData.slot.rush.active.id,1)'),null);assert.deepEqual(state(r),before);assert.equal(r.run('lifeData.slot.rush.active.reason'),'time');
});
test('Reload preserves prizes and spent ammunition; it never restarts the same bonus',()=>{
 const r=fresh();trigger(r);r.run('coinRushClaim(lifeData.slot.rush.active.id,0);coinRushClaim(lifeData.slot.rush.active.id,-1)');const before=state(r),id=r.run('lifeData.slot.rush.active.id'),s=fresh(r.stored);assert.deepEqual(state(s),before);assert.equal(s.run('lifeData.slot.rush.active.shots'),2);assert.equal(s.run('lifeData.slot.rush.active.state'),'closed');assert.equal(s.run('coinRushBegin('+JSON.stringify(id)+')'),null);assert.equal(s.run('coinRushClaim('+JSON.stringify(id)+',1)'),null);
});
test('Exit, hidden document and clock rollback stop collection without another reward',()=>{
 for(const mode of ['exit','hidden','rollback']){const r=fresh();trigger(r);r.run('coinRushClaim(lifeData.slot.rush.active.id,0)');const before=state(r);if(mode==='exit')r.run("coinRushEnd(lifeData.slot.rush.active.id,'exit')");if(mode==='hidden')r.context.document.hidden=true;if(mode==='rollback')r.run('window.now--');assert.equal(r.run('coinRushClaim(lifeData.slot.rush.active.id,1)'),null);assert.deepEqual(state(r),before);assert.equal(r.run('lifeData.slot.rush.active.state'),'closed');}
});
test('Invalid indices and trigger IDs cannot spend ammunition or produce rewards',()=>{
 const r=fresh();trigger(r);const before=state(r);for(const v of ['-2','36','0.5','NaN','Infinity','"0"'])assert.equal(r.run('coinRushClaim(lifeData.slot.rush.active.id,'+v+')'),null);assert.equal(r.run("coinRushClaim('wrong',0)"),null);assert.equal(r.run("coinRushBegin('spin:999')"),null);assert.equal(r.run('lifeData.slot.rush.active.shots'),0);assert.deepEqual(state(r),before);
});
test('Relaunch x2 still gives two free Forge relaunches with protected held reels',()=>{
 let r=fresh();trigger(r);r.run("window.idx=coinRushPrizes(lifeData.slot.rush.active.seed).findIndex(p=>p.kind==='respins'&&p.amount===2);coinRushClaim(lifeData.slot.rush.active.id,window.idx);coinRushEnd(lifeData.slot.rush.active.id,'exit');setArcadeMachine('forge');spinLifeSlot()");r.clock.advance(6000);assert.equal(r.run('coinRushTokens()'),2);
 for(let n=2;n>0;n--){r.run('lifeData.slot.arcade.reactor=0;lifeData.slot.wallet.balance=0;saveLives()');assert.equal(r.run('toggleSlotHold(0)'),true);const grid=read(r,'lifeData.slot.last.arcade.grid');assert.equal(r.run("spinLifeSlot('respin')"),true);assert.equal(r.run("spinLifeSlot('respin')"),false);assert.equal(r.run('lifeData.slot.last.coinCost'),0);assert.equal(r.run('coinRushTokens()'),n-1);assert.deepEqual(read(r,'lifeData.slot.last.arcade.grid[0]'),grid[0]);r=fresh(r.stored);r.clock.advance(6000);assert.equal(r.run('coinRushTokens()'),n-1);}
});
test('Wallet, life and relaunch caps record only the actual credited amounts',()=>{
 const r=fresh();trigger(r);r.run('lifeData.slot.wallet.balance=999998;lifeData.balance=999998;lifeData.slot.rush.tokens=9998');const before=state(r);r.run("for(const kind of ['coins','lives','respins'])coinRushClaim(lifeData.slot.rush.active.id,coinRushPrizes(lifeData.slot.rush.active.seed).findIndex(p=>p.kind===kind))");const after=state(r);assert.deepEqual(after.slice(0,3),[999999,999999,9999]);for(let i=3;i<7;i++)assert.equal(after[i]-before[i],1);
});
test('Old ten-second rounds restore closed with their rewards and watermark preserved',()=>{
 const r=fresh();trigger(r);r.run('coinRushClaim(lifeData.slot.rush.active.id,0);lifeData.slot.rush.active.endsAt=lifeData.slot.rush.active.startedAt+10000;delete lifeData.slot.rush.active.shots;saveLives()');const before=state(r),s=fresh(r.stored);assert.deepEqual(state(s),before);assert.equal(s.run('lifeData.slot.rush.active.shots'),1);assert.equal(s.run('lifeData.slot.rush.active.state'),'closed');assert.equal(s.run('coinRushBegin(lifeData.slot.rush.active.id)'),null);
});
fs.writeFileSync('qa/v35_shoot_engine_results.json',JSON.stringify({passed:tests.length,tests,scope:'Prepared production engine with DOM, clock and persistence adapters.'},null,2));
