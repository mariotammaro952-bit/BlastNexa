// Runs the exact prepared production engine. No browser or device claims.
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {createRuntime}=require('./runtime.cjs');
const tests=[],read=(r,s)=>JSON.parse(r.run('JSON.stringify('+s+')'));
function test(name,fn){fn();tests.push(name);console.log('PASS',name);}
function fresh(initialStorage=null){const r=createRuntime('game/index.html',{initialStorage});r.run("playerSettings.effects='lite';openUniverse('slot');window.now=1800000000000;Date.now=()=>window.now");if(!initialStorage)r.run('lifeData.balance=50;lifeData.slot.wallet.balance=50000;saveLives()');return r;}
function trigger(r){r.run("coinRushEnd(lifeData.slot.rush.active?.id,'exit');dismissTempleScene();dismissCrystalScene();lifeData.slot.arcade.bonus=null;lifeData.slot.arcade.freeSpins=0;slotRandomInt=()=>0;spinLifeSlot();");r.clock.advance(6000);assert.equal(r.run("!!coinRushBegin('spin:'+lifeData.slot.last.spin)"),true);return r.run('lifeData.slot.rush.active.id');}
const state=r=>read(r,'[lifeData.slot.wallet.balance,lifeData.balance,lifeData.slot.rush.tokens,lifeData.slot.wallet.won,lifeData.slot.rush.wonCoins,lifeData.slot.rush.wonLives,lifeData.slot.rush.wonRespins]');
test('All 36 positive prizes include 200/300 coins, different lives and one/two free relaunches',()=>{
 const r=fresh();for(let seed=0;seed<1000;seed++){const p=read(r,'coinRushPrizes('+seed+')');assert.equal(p.length,36);assert.equal(p.filter(p=>p.kind==='coins').length,24);assert.equal(p.filter(p=>p.kind==='lives').length,8);assert.equal(p.filter(p=>p.kind==='respins').length,4);for(const pz of p)assert.ok(pz.amount>0);for(const n of [200,300])assert.ok(p.some(x=>x.kind==='coins'&&x.amount===n));for(const n of [1,2])assert.ok(p.some(x=>x.kind==='respins'&&x.amount===n));assert.deepEqual(p,read(r,'coinRushPrizes('+seed+')'));}
});
test('Only touched rewards are credited, once, independently of the already committed spin',()=>{
 const r=fresh();trigger(r);const before=state(r),round=read(r,'lifeData.slot.rush.active'),prizes=read(r,'coinRushPrizes(lifeData.slot.rush.active.seed)');assert.deepEqual(round.collected,{coins:0,lives:0,respins:0});
 const expected=[...before];for(let i=0;i<36;i++){const p=prizes[i],claim=read(r,`coinRushClaim(lifeData.slot.rush.active.id,${i})`);assert.equal(claim.credited,p.amount);assert.equal(r.run(`coinRushClaim(lifeData.slot.rush.active.id,${i})`),null);if(p.kind==='coins'){expected[0]+=p.amount;expected[3]+=p.amount;expected[4]+=p.amount;}if(p.kind==='lives'){expected[1]+=p.amount;expected[5]+=p.amount;}if(p.kind==='respins'){expected[2]+=p.amount;expected[6]+=p.amount;}assert.deepEqual(state(r),expected);}
 assert.equal(r.run('lifeData.slot.rush.active.claimed.length'),36);assert.equal(r.run("coinRushBegin(lifeData.slot.rush.active.id)"),null);
});
test('A ten-second hard deadline rejects awards at 10,000 ms and does not reset on page changes',()=>{
 const r=fresh();trigger(r);r.run('window.now+=9999');assert.ok(r.run('coinRushClaim(lifeData.slot.rush.active.id,0)'));const before=state(r);r.run('window.now++');assert.equal(r.run('coinRushClaim(lifeData.slot.rush.active.id,1)'),null);assert.deepEqual(state(r),before);assert.equal(r.run('lifeData.slot.rush.active.state'),'closed');
});
test('Reload keeps collected awards and relaunches, closes the timer, and cannot replay a trigger',()=>{
 const r=fresh();const id=trigger(r);r.run('for(let i=0;i<9;i++)coinRushClaim(lifeData.slot.rush.active.id,i)');const before=state(r),s=fresh(r.stored);assert.deepEqual(state(s),before);assert.equal(s.run('lifeData.slot.rush.active.state'),'closed');assert.equal(s.run('lifeData.slot.rush.active.reason'),'interrupted');assert.equal(s.run('coinRushBegin('+JSON.stringify(id)+')'),null);assert.equal(s.run('coinRushClaim('+JSON.stringify(id)+',20)'),null);assert.notEqual(trigger(s),id);
});
test('Early exit, hidden document, clock rollback and invalid inputs award nothing further',()=>{
 for(const mode of ['exit','hidden','rollback']){const r=fresh();trigger(r);r.run('coinRushClaim(lifeData.slot.rush.active.id,0)');const before=state(r);if(mode==='exit')r.run("coinRushEnd(lifeData.slot.rush.active.id,'exit')");if(mode==='hidden')r.context.document.hidden=true;if(mode==='rollback')r.run('window.now--');assert.equal(r.run('coinRushClaim(lifeData.slot.rush.active.id,1)'),null);assert.deepEqual(state(r),before);assert.equal(r.run('lifeData.slot.rush.active.state'),'closed');}
 const r=fresh();trigger(r);for(const input of ['-1','36','0.5','NaN','Infinity','"0"'])assert.equal(r.run('coinRushClaim(lifeData.slot.rush.active.id,'+input+')'),null);assert.equal(r.run("coinRushBegin('spin:999')"),null);assert.equal(r.run("coinRushClaim('wrong',0)"),null);
});
test('Earned relaunch x2 gives two free Forge spins with held reels and duplicate-spend protection',()=>{
 let r=fresh();trigger(r);r.run("window.idx=coinRushPrizes(lifeData.slot.rush.active.seed).findIndex(p=>p.kind==='respins'&&p.amount===2);coinRushClaim(lifeData.slot.rush.active.id,window.idx);coinRushEnd(lifeData.slot.rush.active.id,'exit');setArcadeMachine('forge');spinLifeSlot();");r.clock.advance(6000);assert.equal(r.run('coinRushTokens()'),2); // A paid spin never consumes a token.
 for(let n=2;n>0;n--){r.run('lifeData.slot.arcade.reactor=0;lifeData.slot.wallet.balance=0;saveLives()');assert.equal(r.run('toggleSlotHold(0)'),true);assert.equal(r.run('toggleSlotHold(2)'),true);const prior=read(r,'lifeData.slot.last.arcade.grid'),won=r.run('lifeData.slot.wallet.won');assert.equal(r.run("spinLifeSlot('respin')"),true);assert.equal(r.run("spinLifeSlot('respin')"),false);assert.equal(r.run('coinRushTokens()'),n-1);assert.equal(r.run('lifeData.slot.last.coinCost'),0);assert.equal(r.run('lifeData.slot.wallet.balance'),r.run('lifeData.slot.wallet.won')-won);for(const col of [0,2])assert.deepEqual(read(r,'lifeData.slot.last.arcade.grid['+col+']'),prior[col]);r=fresh(r.stored);r.clock.advance(6000);assert.equal(r.run('coinRushTokens()'),n-1);assert.equal(r.run('lifeData.slot.last.coinCost'),0);}
 assert.equal(r.run('lifeData.slot.rush.spentRespins'),2);assert.equal(r.run("spinLifeSlot('respin')"),false);
});
test('Relauch tokens require a prior Forge result and one or two selected reels',()=>{
 const r=fresh();r.run('lifeData.slot.rush.tokens=2');assert.equal(r.run("spinLifeSlot('respin')"),false);r.run("setArcadeMachine('forge')");assert.equal(r.run('toggleSlotHold(0)'),false);assert.equal(r.run("spinLifeSlot('respin')"),false);assert.equal(r.run('coinRushTokens()'),2);r.run('spinLifeSlot()');r.clock.advance(6000);assert.equal(r.run("spinLifeSlot('respin')"),false);assert.equal(r.run('coinRushTokens()'),2);
});
test('Caps record actual awards and neither wallet, lives nor relaunches can overflow',()=>{
 const r=fresh();trigger(r);r.run('lifeData.slot.wallet.balance=999998;lifeData.balance=999998;lifeData.slot.rush.tokens=9998');const before=state(r);r.run('for(let i=0;i<36;i++)coinRushClaim(lifeData.slot.rush.active.id,i)');const after=state(r);assert.deepEqual(after.slice(0,3),[999999,999999,9999]);for(let i=3;i<7;i++)assert.equal(after[i]-before[i],1);
});
test('Existing v33 profiles migrate with no reset, retroactive prizes or gifted relaunches',()=>{
 const r=fresh();r.run("slotRandomInt=()=>0;spinLifeSlot()");r.clock.advance(6000);const before=state(r).slice(0,2),last=read(r,'lifeData.slot.last');r.run('delete lifeData.slot.rush;saveLives()');const s=fresh(r.stored);assert.deepEqual(state(s).slice(0,2),before);assert.equal(s.run('coinRushTokens()'),0);assert.equal(s.run('lifeData.slot.rush.wonCoins'),0);assert.deepEqual(read(s,'lifeData.slot.last'),last);
});
test('Interrupted and malformed saved rounds normalize without recreating spendable awards',()=>{
 const r=fresh();for(const raw of [null,{},[],{version:34,tokens:-1},{version:34,tokens:Infinity,active:{id:'spin:2',startedAt:1,endsAt:10001,claimed:[-1,36,1,1,2.2],state:'active',receipts:{1:9999}}}]){const s=read(r,'coinRushLoad('+JSON.stringify(raw)+')');assert.ok(s.tokens>=0&&s.tokens<=9999);if(s.active){assert.equal(s.active.state,'closed');assert.deepEqual(s.active.claimed,[1]);assert.equal(s.active.receipts[1],300);}}
});
fs.writeFileSync('qa/v34_rush_engine_results.json',JSON.stringify({passed:tests.length,tests,scope:'Exact prepared JavaScript game engine with save/reload, clock and DOM adapters.'},null,2));
