const assert=require('node:assert/strict'),fs=require('node:fs');
const {createRuntime}=require('./runtime.cjs');
const tests=[],fresh=()=>{const r=createRuntime('game/index.html');r.run("openUniverse('slot');slotRandomInt=()=>0");return r;};
const json=(r,s)=>JSON.parse(r.run('JSON.stringify('+s+')')),settle=r=>r.clock.advance(6000);
function test(name,fn){fn();tests.push(name);console.log('PASS',name);}
test('New, v25 and v26 wallets start the daily economy at 100 while lives and recorded prizes survive',()=>{
 const r=fresh();assert.equal(r.run('lifeData.slot.wallet.balance'),100);assert.equal(r.run('lifeData.balance'),5);
 r.run('lifeData.balance=37;lifeData.slot.wallet={version:26,balance:5000,spent:100,rewarded:1000};saveLives()');const loaded=createRuntime('game/index.html',{initialStorage:r.stored});
 assert.equal(loaded.run('lifeData.balance'),37);assert.equal(loaded.run('lifeData.slot.wallet.balance'),100);assert.equal(loaded.run('lifeData.slot.wallet.spent'),100);
});
test('x1 costs exactly 1, 5 or 10 coins, changes only while idle, and reload cannot replay a debit or life prize',()=>{
 for(const lines of [1,5,10]){const r=fresh();assert.equal(r.run('setSlotLineCount('+lines+')'),true);let accepted=0;for(let n=0;n<8;n++)accepted+=Number(r.run('spinLifeSlot()'));assert.equal(accepted,1);assert.equal(r.run('setSlotLineCount(10)'),false);assert.equal(r.run('lifeData.slot.wallet.balance'),100-lines);assert.equal(r.run('lifeData.slot.wallet.spent'),lines);assert.equal(r.run('lifeData.slot.last.arcade.lineCount'),lines);assert.equal(r.run('lifeData.balance'),10);
 const loaded=createRuntime('game/index.html',{initialStorage:r.stored});loaded.run("openUniverse('slot')");settle(loaded);assert.equal(loaded.run('lifeData.slot.wallet.balance'),100-lines);assert.equal(loaded.run('lifeData.slot.last.coinCost'),lines);assert.equal(loaded.run('lifeData.balance'),10);assert.equal(loaded.run('lifeData.slot.archive.history[0].coinCost'),lines);}
});
test('Daily grant occurs once on a new local calendar day, accumulates remaining coins, and never refills by minutes or clock rollback',()=>{
 const r=fresh();assert.equal(r.run(`(()=>{const today=new Date(2026,5,10,12).getTime(),tomorrow=new Date(2026,5,11,0).getTime(),w=lifeData.slot.wallet;w.dailyDay=slotDayKey(today);w.balance=23;return !syncSlotCoins(today+60000)&&w.balance===23&&syncSlotCoins(tomorrow)&&w.balance===123&&!syncSlotCoins(tomorrow+3600000)&&!syncSlotCoins(today)&&w.balance===123;})()`),true);
 r.run('lifeData.slot.wallet.dailyDay=slotDayKey();lifeData.slot.wallet.balance=76;saveLives()');const loaded=createRuntime('game/index.html',{initialStorage:r.stored});loaded.run('syncLives()');assert.equal(loaded.run('lifeData.slot.wallet.balance'),76);
});
test('A month of absence grants one daily allowance, bounded at the safe balance ceiling',()=>{
 const r=fresh();assert.equal(r.run(`(()=>{const d=new Date(2026,5,10),w=lifeData.slot.wallet;w.dailyDay=slotDayKey(d);w.balance=999950;return syncSlotCoins(new Date(2026,6,10).getTime())&&w.balance===999999;})()`),true);
});
test('Insufficient coins cannot draw symbols or change lives and remaining coins offer the one-line option',()=>{
 const r=fresh();r.run('setSlotLineCount(5);lifeData.slot.wallet.balance=2');const seed=r.run('lifeData.slot.seed');assert.equal(r.run('spinLifeSlot()'),false);assert.equal(r.run('lifeData.slot.total'),0);assert.equal(r.run('lifeData.balance'),5);assert.equal(r.run('lifeData.slot.seed'),seed);assert.equal(r.elements.get('dialogPrimary').textContent,'USA 1 LINEA · 1 MONETA');r.elements.get('dialogPrimary').click();assert.equal(r.run('slotLineCount()'),1);assert.equal(r.run('spinLifeSlot()'),true);assert.equal(r.run('lifeData.slot.wallet.balance'),1);
});
test('Rewarded video is available at zero only and grants 100 once after earned=true; skipped/missing videos grant zero',()=>{
 for(const earned of [false,true]){const r=fresh();let token;r.context.window.BlastNexaAds={rewarded:t=>{token=t;}};r.run('lifeData.slot.wallet.balance=0;openSlotCoinRefill()');r.elements.get('dialogPrimary').click();assert.equal(r.run('lifeData.slot.wallet.balance'),0);r.context.window.BlastNexaAdResult(token,earned);r.context.window.BlastNexaAdResult(token,true);assert.equal(r.run('lifeData.slot.wallet.balance'),earned?100:0);assert.equal(r.run('lifeData.slot.total'),0);}
 const r=fresh();let calls=0;r.context.window.BlastNexaAds={rewarded:()=>calls++};r.run('lifeData.slot.wallet.balance=3;openSlotCoinRefill()');r.elements.get('dialogPrimary').click();assert.equal(calls,0);delete r.context.window.BlastNexaAds;r.run('lifeData.slot.wallet.balance=0;openSlotCoinRefill()');r.elements.get('dialogPrimary').click();assert.equal(r.run('lifeData.slot.wallet.balance'),0);
});
test('The chosen paid lines are saved for Crystal bonus spins and cannot be increased mid-bonus',()=>{
 const r=fresh();r.run("setArcadeMachine('crystal');setSlotLineCount(5);slotRandomInt=max=>max===100?98:0;spinLifeSlot()");settle(r);assert.equal(r.run('lifeData.slot.arcade.freeLineCount'),5);assert.equal(r.run('setSlotLineCount(10)'),false);r.run('lifeData.slot.wallet.balance=0;slotRandomInt=()=>0');for(let n=0;n<3;n++){assert.equal(r.run('spinLifeSlot()'),true);assert.equal(r.run('lifeData.slot.last.coinCost'),0);assert.equal(r.run('lifeData.slot.last.arcade.lineCount'),5);settle(r);}assert.equal(r.run('lifeData.slot.wallet.balance'),0);assert.equal(r.run('lifeData.slot.wallet.spent'),5);
});
test('Forge relaunch spends the selected number of coins once and retains held columns',()=>{
 const r=fresh();r.run("setArcadeMachine('forge');setSlotLineCount(10);spinLifeSlot()");settle(r);r.run('lifeData.slot.arcade.reactor=6;toggleSlotHold(0);toggleSlotHold(3)');const before=json(r,'lifeData.slot.last.arcade.grid');assert.equal(r.run("spinLifeSlot('respin')"),true);assert.equal(r.run('lifeData.slot.wallet.balance'),80);const after=json(r,'lifeData.slot.last.arcade.grid');for(const col of [0,3])assert.deepEqual(before[col],after[col]);assert.equal(r.run('lifeData.slot.wallet.spent'),20);
});
test('Only selected lines can win: a top-row match cannot pay on the one-line center setting',()=>{
 const r=fresh(),grid=Array.from({length:5},(_,i)=>['♥',['◆','✦','☾','✹','❄'][i],['❄','☾','✹','◆','✦'][i]]),evaluate=r.run('evaluateArcadeGrid');assert.equal(evaluate(grid,'temple',1).prize,0);assert.equal(evaluate(grid,'temple',5).prize,5);assert.equal(evaluate(grid,'forge',10).prize,5);
});
test('AUTO stops at the last affordable selected wager without negative coins or a third transaction',()=>{
 const r=fresh();r.run("setArcadeMachine('crystal');setSlotLineCount(10);lifeData.slot.wallet.balance=25;startSlotAuto(5)");r.clock.advance(20000);assert.equal(r.run('lifeData.slot.total'),2);assert.equal(r.run('lifeData.slot.wallet.balance'),5);assert.equal(r.run('slotAutoLeft'),0);assert.equal(r.run('slotAutoTimer'),null);assert.equal(r.run('lifeData.slot.wallet.spent'),20);
});
test('Page navigation and chest rewards cannot debit coins',()=>{
 const r=fresh();for(const view of ['missions','rules','collection','play'])r.run(`setArcadeView('${view}')`);r.run("lifeData.slot.arcade.bonus={id:'chest:1',choices:[1,2,5]};claimArcadeChest(1)");assert.equal(r.run('lifeData.slot.wallet.balance'),100);assert.equal(r.run('lifeData.slot.wallet.spent'),0);
});
test('Invites are automatic and the game exposes no invitation switch or opt-in control',()=>{
 const r=fresh();assert.equal(r.run('typeof openPlayReminders'), 'undefined');assert.equal(r.elements.has('settingReminders'),false);assert.equal(r.elements.has('slotReminderOpen'),false);assert.match(r.html,/Inviti automatici a giocare · 09:00 · 14:00 · 20:30/);
});
test('Malformed wallet and line fields restore bounded usable state',()=>{
 for(const value of [null,[],{},-1,1e99,'bad',true,{version:27,balance:-4,dailyDay:'bad'}]){const r=fresh();r.run('lifeData.slot.wallet='+JSON.stringify(value)+';lifeData.slot.arcade.lineCount=900;saveLives()');const loaded=createRuntime('game/index.html',{initialStorage:r.stored});assert.equal(loaded.run('Number.isSafeInteger(lifeData.slot.wallet.balance)&&lifeData.slot.wallet.balance>=0&&lifeData.slot.wallet.balance<=999999'),true);assert.equal(loaded.run('slotLineCount()'),1);}
});
fs.writeFileSync('qa/coins_v27_result.json',JSON.stringify({passed:tests.length,tests,costPerLine:1,lineChoices:[1,5,10],dailyCoins:100,rewardedCoinsAtZero:100,scope:'Production wallet, line evaluation and automatic-invite UI with DOM/clock/rewarded adapters. No Android notification delivery or real ads are claimed.'},null,2)+'\n');
