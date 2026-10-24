const assert=require('node:assert/strict'),fs=require('node:fs');
const {createRuntime}=require('./runtime.cjs');
const file='game/index.html',tests=[];
function test(name,fn){fn();tests.push(name);console.log('PASS',name);}
test('New profile starts at level one with exactly 20 lives and 1000 coins, including its first daily allowance',()=>{
 const r=createRuntime(file);assert.equal(r.run('unlocked'),1);assert.equal(r.run('Object.keys(stars).length'),0);
 assert.equal(r.run('lifeData.balance'),20);assert.equal(r.run('lifeData.slot.wallet.balance'),1000);
 r.run('syncLives();syncSlotCoins();refreshLivesUI()');assert.equal(r.run('lifeData.slot.wallet.balance'),1000);
 assert.equal(r.run('WORD_CATALOG.length'),400);assert.equal(r.run('LEVELS.length'),2000);
});
test('The one-time upgrade clears all local campaign completions and old rewards while retaining identity and settings',()=>{
 const seed=createRuntime(file);seed.run("playerProfile.name='Nome conservato';savePlayer();playerSettings.effects='lite';storage.set(BN_SETTINGS_KEY,playerSettings)");
 const stored=new Map(seed.stored);stored.delete('blastnexa_fresh_campaign_v29');
 for(const key of ['blastnexa_unlocked_v041','blastnexa_stars_v041','blastnexa_best','blastnexa_circuit_best_v09','blastnexa_daily_v07','blastnexa_last_result_v1','blastnexa_session_v09','blastnexa_stats_v07','blastnexa_mosaic_v08','blastnexa_universe_v9','blastnexa_adrenaline_v10','blastnexa_words_v13','blastnexa_lives_v13'])stored.set(key,JSON.stringify(key.includes('unlocked')?1800:{balance:90000,progress:{0:true,1:true},active:{id:1},materials:12345,xp:5000}));
 stored.set('blastnexa_stars_v041',JSON.stringify({1:3,2:3,1700:2}));
 const r=createRuntime(file,{initialStorage:stored});
 assert.equal(r.run('unlocked'),1);assert.equal(r.run('Object.keys(stars).length'),0);assert.equal(r.run('Object.keys(wordData.progress).length'),0);assert.equal(r.run('wordData.active'),null);
 assert.equal(r.run('universe.materials'),0);assert.equal(r.run('universe.xp'),0);assert.equal(r.run('lifeData.slot.total'),0);
 assert.equal(r.run('lifeData.balance'),20);assert.equal(r.run('lifeData.slot.wallet.balance'),1000);assert.equal(r.run('playerProfile.name'),'Nome conservato');assert.equal(r.run('playerSettings.effects'),'lite');
});
test('New progress and both balances survive reopening without another reset or starter gift',()=>{
 const r=createRuntime(file);r.run("unlocked=2;stars={1:3};storage.set('blastnexa_unlocked_v041',unlocked);storage.set('blastnexa_stars_v041',stars);lifeData.balance=17;lifeData.slot.wallet.balance=876;wordData.progress[0]=true;storage.set(WORD_KEY,{catalogVersion:15,progress:wordData.progress,active:null});saveLives()");
 const loaded=createRuntime(file,{initialStorage:r.stored});assert.equal(loaded.run('unlocked'),2);assert.equal(loaded.run('stars[1]'),3);assert.equal(loaded.run('wordData.progress[0]'),true);assert.equal(loaded.run('lifeData.balance'),17);assert.equal(loaded.run('lifeData.slot.wallet.balance'),876);
});
test('Each new local calendar day adds 100 coins once and preserves unspent coins',()=>{
 const r=createRuntime(file);r.run("lifeData.slot.wallet.balance=876;window.nextDay=new Date();window.nextDay.setHours(0,0,0,0);window.nextDay.setDate(window.nextDay.getDate()+1);syncSlotCoins(window.nextDay.getTime());syncSlotCoins(window.nextDay.getTime()+3600000);saveLives()");
 assert.equal(r.run('lifeData.slot.wallet.balance'),976);const loaded=createRuntime(file,{initialStorage:r.stored});assert.equal(loaded.run('lifeData.slot.wallet.balance'),976);
});
test('All 400 crossword levels remain reachable in fixed pages of two, including filtered results',()=>{
 const r=createRuntime(file);r.run("openUniverse('words')");assert.equal(r.run('WORD_PAGE_SIZE'),2);assert.equal(r.elements.get('wordLevelGrid').children.length,2);
 r.run('changeWordPage(199)');assert.equal(r.run('wordHubState.page'),199);assert.match(r.elements.get('wordListSummary').textContent,/399–400 DI 400/);
 r.run("setWordHubFilter('difficulty','esperto')");assert.equal(r.run('wordHubState.page'),0);assert.ok(r.elements.get('wordLevelGrid').children.length<=2);
});
fs.writeFileSync('qa/fresh_start_v29_result.json',JSON.stringify({passed:tests.length,tests,initialLives:20,initialCoins:1000,dailyCoins:100,resetOnce:true,scope:'Production save migration, profile initialization, daily allowance and catalog pagination. Native sizing and swipe behavior are separate Android checks.'},null,2)+'\n');
