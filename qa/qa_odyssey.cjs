const assert=require('node:assert/strict'),fs=require('node:fs');
const {createRuntime:runtimeBase}=require('./runtime.cjs');
// Legacy-normalization fixtures represent an already migrated v29 profile.
// fresh_start_v29.cjs separately verifies the intentional upgrade reset.
function createRuntime(file,options={}){
 if(options.initialStorage){const v=options.initialStorage,stored=new Map(v instanceof Map?v:Object.entries(v));stored.set('blastnexa_fresh_campaign_v29','true');options={...options,initialStorage:stored};}
 return runtimeBase(file,options);
}
const FILE='game/index.html',tests=[];
const fresh=()=>{const r=createRuntime(FILE);r.run("lifeData.balance=5;lifeData.slot.wallet.balance=100;saveLives();openUniverse('slot')");return r};
const json=(r,expr)=>JSON.parse(r.run('JSON.stringify('+expr+')'));
const settle=r=>r.clock.advance(6000);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const nodes=root=>[root,...root.children.flatMap(nodes)];
const current=(r,id)=>nodes(r.elements.get('universeBody')).find(n=>n.id===id);
async function test(name,fn){await fn();tests.push(name);console.log('PASS',name)}
function audioMock(r,{delayed=false}={}){
 const tracks=json(r,'SLOT_AUDIO_MEDIA.tracks'),catalog=json(r,'SLOT_AUDIO_MEDIA'),sizes=new Map(),contexts=[],pending=[];
 for(const key of ['bonus',...Object.keys(tracks)])sizes.set(Buffer.from(catalog[key].split(',')[1],'base64').length,{key,duration:tracks[key]?.loopDuration||1.959184});
 class Param{constructor(value=0){this.value=value}setTargetAtTime(v){this.value=v}setValueAtTime(v){this.value=v}linearRampToValueAtTime(v){this.value=v}exponentialRampToValueAtTime(v){this.value=v}}
 class Node{constructor(){this.connections=[];this.gain=new Param(1);this.frequency=new Param(440);this.Q=new Param(1)}connect(to){this.connections.push(to);return to}disconnect(){this.disconnected=true}start(...args){this.started=true;this.args=args}stop(){this.stopped=true;this.onended?.()}}
 class Context{
  constructor(){this.currentTime=0;this.state='running';this.sampleRate=44100;this.destination=new Node();this.sources=[];contexts.push(this)}
  resume(){return Promise.resolve()}createGain(){return new Node()}createBiquadFilter(){return new Node()}createWaveShaper(){return new Node()}createOscillator(){return new Node()}
  createDynamicsCompressor(){const n=new Node();for(const k of ['threshold','knee','ratio','attack','release'])n[k]=new Param();return n}
  createBufferSource(){const n=new Node();this.sources.push(n);return n}
  decodeAudioData(bytes){const buffer=sizes.get(bytes.byteLength);assert.ok(buffer,'known embedded asset');return delayed?new Promise(resolve=>pending.push({key:buffer.key,resolve:()=>resolve(buffer)})):Promise.resolve(buffer)}
 }
 r.context.atob=v=>Buffer.from(v,'base64').toString('binary');r.context.window.AudioContext=Context;r.run('window.__BN_TEST_FAST__=false;muted=false;slotMediaSync()');
 return {contexts,pending,resolve(key){const item=pending.find(p=>p.key===key);assert.ok(item,'pending '+key);item.resolve();}};
}
(async()=>{
 await test('Each mode exposes its own scene, eight illustrated symbol meanings and reel narration',()=>{
  const r=fresh(),scenes=new Set();
  for(const mode of ['temple','crystal','forge']){r.run("setArcadeMachine('"+mode+"')");const machine=current(r,'slotCabinet');scenes.add(machine.children.find(n=>n.tagName==='IMG').src);assert.equal(current(r,'slotReels').children.filter(n=>n.classList.contains('bn-temple-reel')).length,5);assert.equal(nodes(current(r,'slotReels')).filter(n=>n.classList.contains('bn-world-symbol')).length,15);assert.match(current(r,'slotReelDescription').textContent,/Rullo 5/);assert.equal(json(r,'SLOT_WORLDS.'+mode+'.names').length,8);}
  assert.equal(scenes.size,3);
 });
 await test('The Temple replaces the reels with a playable treasure scene, commits once, and acknowledges without a spin',()=>{
  const r=fresh();r.run('lifeData.slot.arcade.treasure=29;slotRandomInt=max=>max===100?31:0;spinLifeSlot()');settle(r);
  assert.equal(current(r,'slotBonusScene').dataset.kind,'temple');assert.equal(current(r,'slotReels'),undefined);assert.equal(current(r,'slotCabinet').children[0].src,r.run('SLOT_WORLD_MEDIA.temple.bonusScene'));
  const prize=r.run('lifeData.slot.arcade.bonus.choices[2]'),balance=r.run('lifeData.balance'),spin=r.run('lifeData.slot.total');current(r,'slotChest2').click();assert.equal(r.run('lifeData.balance'),balance+prize);assert.equal(r.run('claimArcadeChest(2)'),false);assert.equal(current(r,'slotBonusScene').dataset.state,'revealed');
  current(r,'slotSpinButton').click();assert.equal(r.run('lifeData.slot.total'),spin);assert.equal(r.run('lifeData.balance'),balance+prize);assert.ok(current(r,'slotReels'));
  const resumed=createRuntime(FILE,{initialStorage:r.stored});resumed.run("openUniverse('slot')");assert.ok(current(resumed,'slotReels'));assert.equal(current(resumed,'slotBonusScene'),undefined);assert.equal(resumed.run('lifeData.balance'),balance+prize);
 });
 await test('A new Temple chest still opens after a prior treasure scene was acknowledged',()=>{
  const r=fresh();r.run("lifeData.slot.arcade.revealed={id:'chest:1',index:0,choices:[1,2,5],prize:1,credited:1,presented:true};lifeData.slot.arcade.treasure=29;slotRandomInt=max=>max===100?31:0;spinLifeSlot()");settle(r);assert.equal(current(r,'slotBonusScene').dataset.state,'choose');assert.equal(r.run('lifeData.slot.arcade.revealed'),null);
 });
 await test('A Crystal journey resumes mid-bonus and totals only its three awarded spins',()=>{
  const start=fresh();start.run("setArcadeMachine('crystal');slotRandomInt=max=>max===100?98:0;spinLifeSlot()");settle(start);start.run('slotRandomInt=()=>0;spinLifeSlot()');settle(start);
  const r=createRuntime(FILE,{initialStorage:start.stored});r.run("openUniverse('slot');slotRandomInt=()=>0");assert.equal(r.run('lifeData.slot.arcade.freeSpins'),2);assert.equal(r.run('lifeData.slot.arcade.crystalJourney.lives'),5);assert.equal(current(r,'slotCabinet').children[0].src,r.run('SLOT_WORLD_MEDIA.crystal.bonusScene'));
  for(let i=0;i<2;i++){r.run('spinLifeSlot()');settle(r);}assert.equal(current(r,'slotBonusScene').dataset.state,'complete');assert.equal(r.run('lifeData.slot.arcade.crystalJourney.played'),3);assert.equal(r.run('lifeData.slot.arcade.crystalJourney.lives'),15);assert.equal(r.run('lifeData.balance'),20);
  const total=r.run('lifeData.slot.total');current(r,'slotSpinButton').click();assert.equal(r.run('lifeData.slot.total'),total);assert.equal(r.run('lifeData.balance'),20);assert.ok(current(r,'slotReels'));assert.equal(r.run('lifeData.slot.arcade.crystalJourney.dismissed'),true);
  const reloaded=createRuntime(FILE,{initialStorage:r.stored});reloaded.run("openUniverse('slot')");assert.ok(current(reloaded,'slotReels'));assert.equal(current(reloaded,'slotBonusScene'),undefined);
 });
 await test('Pending Crystal spins from v20 migrate into a resumable journey without awarding anything again',()=>{
  const old={stored:JSON.parse(fs.readFileSync('qa/fixtures/legacy-v20.json')).storage};
  const r=createRuntime(FILE,{initialStorage:old.stored});r.run("openUniverse('slot')");assert.deepEqual(json(r,'lifeData.slot.arcade.crystalJourney'),{id:'crystal:0',awarded:3,played:0,lives:0,coins:0,dismissed:false});assert.equal(r.run('lifeData.balance'),20);assert.equal(r.run('lifeData.slot.total'),1);
 });
 await test('The Forge controls block two reels, disable the unselected relaunch, and preserve held columns',()=>{
  const r=fresh();r.run("setArcadeMachine('forge');slotRandomInt=()=>0;spinLifeSlot()");settle(r);r.run('lifeData.slot.arcade.reactor=6;renderLifeSlot($("universeBody"))');assert.equal(current(r,'slotRespinButton').disabled,true);
  current(r,'slotHold0').click();current(r,'slotHold3').click();current(r,'slotHold4').click();assert.deepEqual(json(r,'[...slotHolds]'),[0,3]);r.run('slotRandomInt=max=>max===100?31:0');current(r,'slotRespinButton').click();assert.deepEqual(json(r,'lifeData.slot.last.arcade.held'),[0,3]);assert.deepEqual(json(r,'lifeData.slot.last.arcade.grid[0]'),['♥','♥','♥']);assert.deepEqual(json(r,'lifeData.slot.last.arcade.grid[3]'),['♥','♥','♥']);assert.equal(current(r,'slotReel0').children[0].dataset.spinning,'no');settle(r);assert.equal(r.run('lifeData.slot.arcade.reactor'),0);
 });
 await test('The fifty-spin break preserves a pending bonus journey and does not consume its next free spin',()=>{
  const r=fresh();r.run("setArcadeMachine('crystal');lifeData.slot.sinceAd=49;slotRandomInt=max=>max===100?98:0;spinLifeSlot()");settle(r);const saved=json(r,'lifeData.slot.arcade.crystalJourney');current(r,'slotSpinButton').click();assert.equal(r.run('lifeData.slot.arcade.freeSpins'),3);assert.equal(r.run('lifeData.slot.total'),1);assert.equal(r.run('gameBannerLayout().visible'),false);
  r.run('bnRequestAd=(native,done)=>done()');r.elements.get('dialogPrimary').click();assert.equal(r.run('lifeData.slot.sinceAd'),0);assert.deepEqual(json(r,'lifeData.slot.arcade.crystalJourney'),saved);assert.equal(r.run('gameBannerLayout().visible'),true);
 });
 await test('Forge automatic play stops at reactor readiness and waits for the player to choose reels',()=>{
  const r=fresh();r.run("setArcadeMachine('forge');slotRandomInt=()=>0;startSlotAuto(10)");r.clock.advance(60000);assert.equal(r.run('lifeData.slot.total'),6);assert.equal(r.run('lifeData.slot.arcade.reactor'),6);assert.equal(r.run('slotAutoLeft'),0);assert.equal(r.run('startSlotAuto(5)'),false);assert.equal(current(r,'slotAuto5').disabled,true);assert.equal(current(r,'slotHold0').disabled,false);
 });
 await test('Line, impact, count and transfer stages are presentation only, and skipping cancels future ticks',()=>{
  const r=fresh();r.run('slotRandomInt=()=>0;spinLifeSlot()');const saved=r.run('JSON.stringify(lifeData)');r.clock.advance(2600);assert.equal(current(r,'slotCabinet').dataset.winStage,'line');r.clock.advance(280);assert.equal(current(r,'slotCabinet').dataset.winStage,'impact');r.clock.advance(280);assert.equal(current(r,'slotCabinet').dataset.winStage,'count');r.clock.advance(1040);assert.equal(current(r,'slotCabinet').dataset.winStage,'transfer');assert.equal(r.run('JSON.stringify(lifeData)'),saved);current(r,'slotCollectButton').click();r.clock.advance(10000);assert.equal(r.run('slotPhase'),'idle');assert.equal(current(r,'slotLifeCount').textContent,'10');assert.equal(r.run('JSON.stringify(lifeData)'),saved);
 });
 await test('All six soundtracks are selected by world and bonus state on the music channel',async()=>{
  const r=fresh(),mock=audioMock(r);await flush();await flush();assert.equal(r.run('slotMusicNode.buffer.key'),'music');
  for(const [mode,state,key]of [['temple','lifeData.slot.arcade.bonus={id:"chest:0",choices:[1,2,5]}','bonus_temple'],['crystal','lifeData.slot.arcade.bonus=null','music_crystal'],['crystal','lifeData.slot.arcade.freeSpins=3','bonus_crystal'],['forge','lifeData.slot.arcade.freeSpins=0','music_forge'],['forge','lifeData.slot.arcade.reactor=6','bonus_forge']]){
   r.run(state+";setArcadeMachine('"+mode+"')");await flush();await flush();assert.equal(r.run('slotMusicNode.buffer.key'),key);assert.equal(r.run('slotMusicKey'),key);assert.equal(r.run('slotMusicGain.connections[0]===bnAudioGraph.music'),true);assert.equal(mock.contexts[0].sources.filter(n=>n.started&&!n.stopped).length,1);
  }
  assert.ok(r.run('slotAudioBuffers.size')<=4);r.run("openUniverse('home')");assert.equal(mock.contexts[0].sources.filter(n=>n.started&&!n.stopped).length,0);
 });
 await test('Late decodes from abandoned worlds cannot replace the selected soundtrack',async()=>{
  const r=fresh(),mock=audioMock(r,{delayed:true});await flush();r.run("setArcadeMachine('crystal')");await flush();r.run("setArcadeMachine('forge')");await flush();mock.resolve('music_forge');await flush();await flush();assert.equal(r.run('slotMusicKey'),'music_forge');const source=r.run('slotMusicNode');mock.resolve('music');mock.resolve('music_crystal');await flush();await flush();assert.equal(r.run('slotMusicNode'),source);assert.equal(mock.contexts[0].sources.filter(n=>n.started&&!n.stopped).length,1);
 });
 await test('Leaving during a delayed bonus decode prevents all audio from starting in another screen',async()=>{
  const r=fresh(),mock=audioMock(r,{delayed:true});await flush();r.run("setArcadeMachine('crystal');lifeData.slot.arcade.freeSpins=3;renderLifeSlot($('universeBody'))");await flush();r.run("playSlotBonusSample('delayed-bonus');openUniverse('home')");for(const pending of mock.pending)pending.resolve();await flush();await flush();assert.equal(r.run('slotMusicNode'),null);assert.equal(r.run('slotSampleVoices.size'),0);assert.equal(mock.contexts[0].sources.filter(n=>n.started).length,0);
 });
 await test('A delayed bonus sound cannot start after the player selects another world',async()=>{
  const r=fresh(),mock=audioMock(r,{delayed:true});await flush();r.run("playSlotBonusSample('old-world');setArcadeMachine('forge')");await flush();mock.resolve('bonus');await flush();await flush();assert.equal(r.run('slotSampleVoices.size'),0);assert.equal(mock.contexts[0].sources.filter(n=>n.started).length,0);
 });
 await test('Muting and volume zero stop bonus-state music while preserving its saved progress',async()=>{
  const r=fresh();audioMock(r);await flush();r.run("setArcadeMachine('forge');lifeData.slot.arcade.reactor=6;renderLifeSlot($('universeBody'))");await flush();await flush();assert.equal(r.run('slotMusicKey'),'bonus_forge');const saved=r.run('JSON.stringify(lifeData)');r.run("setAudioVolume('music',0)");assert.equal(r.run('slotMusicNode'),null);assert.equal(r.run('JSON.stringify(lifeData)'),saved);r.run("setAudioVolume('music',85)");await flush();await flush();assert.equal(r.run('slotMusicKey'),'bonus_forge');r.run('muted=true;updateAudioMix()');assert.equal(r.run('slotMusicNode'),null);assert.equal(r.run('JSON.stringify(lifeData)'),saved);
 });
 fs.writeFileSync('qa_odyssey_v22_result.json',JSON.stringify({passed:tests.length,tests,scope:'Exact production JavaScript, current DOM tree, saved-session transitions and mocked Web Audio. No physical audio output, browser geometry or Android execution.'},null,2));
 console.log(JSON.stringify({passed:tests.length}));
})().catch(error=>{console.error(error);process.exitCode=1});
