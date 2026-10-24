const assert=require('node:assert/strict'),fs=require('node:fs');
const {createRuntime:runtimeBase}=require('./runtime.cjs');
// Legacy-normalization fixtures represent an already migrated v29 profile.
// fresh_start_v29.cjs separately verifies the intentional upgrade reset.
function createRuntime(file,options={}){
 if(options.initialStorage){const v=options.initialStorage,stored=new Map(v instanceof Map?v:Object.entries(v));stored.set('blastnexa_fresh_campaign_v29','true');options={...options,initialStorage:stored};}
 return runtimeBase(file,options);
}
const FILE='game/index.html',tests=[];
process.on('exit',()=>{if(tests.length!==10)process.exitCode=1;});
const fresh=()=>{const r=createRuntime(FILE);r.run("lifeData.balance=5;lifeData.slot.wallet.balance=100;saveLives();openUniverse('slot')");return r};
async function test(name,fn){await fn();tests.push(name);console.log('PASS',name)}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function audioMock(r){
 const contexts=[];
 class Param{constructor(value=0){this.value=value;this.targets=[];}setTargetAtTime(v){this.value=v;this.targets.push(v)}setValueAtTime(v){this.value=v}linearRampToValueAtTime(v){this.value=v}exponentialRampToValueAtTime(v){this.value=v}}
 class Node{constructor(){this.connections=[];this.gain=new Param(1);this.frequency=new Param(440);this.Q=new Param(1);this.started=false;this.stopped=false;}connect(to){this.connections.push(to);return to}disconnect(){this.disconnected=true}start(...args){this.started=true;this.startArgs=args}stop(){this.stopped=true;this.onended?.()}}
 class Context{constructor(){this.currentTime=0;this.state='running';this.sampleRate=44100;this.destination=new Node();this.sources=[];contexts.push(this)}resume(){this.state='running';return Promise.resolve()}createGain(){return new Node()}createBiquadFilter(){return new Node()}createWaveShaper(){return new Node()}createDynamicsCompressor(){const n=new Node();for(const k of ['threshold','knee','ratio','attack','release'])n[k]=new Param();return n}createBufferSource(){const n=new Node();this.sources.push(n);return n}createOscillator(){return new Node()}decodeAudioData(bytes){return Promise.resolve({duration:bytes.byteLength<100000?1.959184:33.10344671201814,bytes:bytes.byteLength})}}
 r.context.atob=value=>Buffer.from(value,'base64').toString('binary');r.context.window.AudioContext=Context;r.run('window.__BN_TEST_FAST__=false;muted=false;slotMediaSync()');return contexts;
}
(async()=>{
 await test('The banner is visible in all four slot pages and leaves immediately with the slot',()=>{
  const r=fresh();assert.equal(r.run('gameBannerLayout().visible'),true);assert.equal(r.run('gameBannerLayout().context'),'slot');assert.equal(r.run('gameBannerLayout().height'),50);assert.equal(r.elements.get('app').dataset.bannerContext,'slot');
  for(const view of ['missions','collection','rules','play']){r.run(`setArcadeView('${view}')`);assert.equal(r.run('gameBannerLayout().visible'),true);}
  r.run("renderUniverse('home')");assert.equal(r.run('gameBannerLayout().visible'),false);assert.equal(r.elements.get('gameBanner').hidden,true);
 });
 await test('A missing or failing banner bridge cannot stop a spin or alter its prize',()=>{
  const r=fresh();r.context.window.BlastNexaAds={bannerLayout(){throw Error('unavailable')}};r.run("syncGameBanner(true);slotRandomInt=()=>0;spinLifeSlot()");r.clock.advance(6000);assert.equal(r.run('lifeData.balance'),10);assert.equal(r.run('slotBusy'),false);
 });
 await test('The fifteenth spin continues normally and the fiftieth blocks only the next spin',()=>{
  const r=fresh();r.run("playerSettings.effects='lite';slotRandomInt=()=>0");for(let i=1;i<=50;i++){assert.equal(r.run('spinLifeSlot()'),true);r.clock.advance(20);assert.equal(r.run('lifeData.slot.total'),i);if(i===15){assert.equal(r.run('lifeData.slot.sinceAd'),15);assert.equal(r.elements.get('overlay').classList.contains('on'),false);}}
  assert.equal(r.run('lifeData.slot.sinceAd'),50);assert.equal(r.run('spinLifeSlot()'),false);assert.equal(r.elements.get('dialogTitle').textContent,'50 GIRI COMPLETATI');assert.equal(r.run('gameBannerLayout().visible'),false);
  const loaded=createRuntime(FILE,{initialStorage:r.stored});loaded.run("openUniverse('slot')");assert.equal(loaded.run('lifeData.slot.sinceAd'),50);assert.equal(loaded.run('spinLifeSlot()'),false);
 });
 await test('The former fifteen-spin threshold migrates as 15/50 without resetting lives or history',()=>{
  const old={stored:JSON.parse(fs.readFileSync('qa/fixtures/legacy-v19.json')).storage};
  const r=createRuntime(FILE,{initialStorage:old.stored});r.run("openUniverse('slot');playerSettings.effects='lite';slotRandomInt=()=>0");assert.equal(r.run('lifeData.slot.sinceAd'),15);assert.equal(r.run('lifeData.balance'),80);assert.equal(r.run('spinLifeSlot()'),true);r.clock.advance(20);assert.equal(r.run('lifeData.slot.sinceAd'),16);
 });
 await test('Crystal and Temple emit one supplied-audio cue per earned feature and never replay it on rerender',()=>{
  for(const mode of ['crystal','temple']){const r=fresh();r.run("window.cues=[];playSlotBonusSample=key=>window.cues.push(key);playerSettings.effects='lite'");r.run(mode==='crystal'?"setArcadeMachine('crystal');slotRandomInt=max=>max===100?98:0":"lifeData.slot.arcade.treasure=29;slotRandomInt=max=>max===100?31:0");r.run('spinLifeSlot()');r.clock.advance(20);assert.equal(r.run('window.cues.length'),1);assert.equal(r.elements.get('slotSpectacle').dataset.kind,'bonus');assert.equal(r.elements.get('slotSpectacle').dataset.motion,'lite');r.run('renderLifeSlot($("universeBody"));slotOnSettled(lifeData.slot.last,null,slotEpoch,gameSession)');assert.equal(r.run('window.cues.length'),1);}
 });
 await test('The new spectacle never changes the committed result and cleans up on leaving',()=>{
  const r=fresh();r.run("slotRandomInt=()=>0;spinLifeSlot()");r.clock.advance(2650);assert.ok(r.elements.get('slotSpectacle'));const state=r.run('JSON.stringify(lifeData)');r.run("openUniverse('home')");r.clock.advance(10000);assert.equal(r.run('JSON.stringify(lifeData)'),state);assert.equal(r.elements.has('slotSpectacle'),false);
 });
 await test('Music is a genuine looping buffer on the music mixer channel and ducks under the supplied cue',async()=>{
  const r=fresh(),contexts=audioMock(r);await flush();await flush();assert.equal(contexts.length,1);assert.equal(r.run('slotMusicNode!==null'),true);const source=r.run('slotMusicNode'),gain=r.run('slotMusicGain');assert.equal(source.loop,true);assert.equal(source.loopEnd,33.10344671201814);assert.equal(gain.connections[0],r.run('bnAudioGraph.music'));assert.equal(gain.gain.value,.14);
  const saved=r.run('JSON.stringify(lifeData)');assert.equal(r.run("playSlotBonusSample('test')"),true);await flush();await flush();assert.equal(r.run("playSlotBonusSample('test')"),false);assert.equal(r.run('slotSampleVoices.size'),1);assert.equal(r.run('slotMusicNode'),source);assert.equal(gain.gain.value,.035);r.clock.advance(2200);assert.equal(gain.gain.value,.14);assert.equal(r.run('JSON.stringify(lifeData)'),saved);
 });
 await test('Mute, music volume zero, and leaving the slot stop the correct audio sources',async()=>{
  const r=fresh();audioMock(r);await flush();await flush();const music=r.run('slotMusicNode');r.run("setAudioVolume('music',0)");assert.equal(music.stopped,true);assert.equal(r.run('slotMusicNode'),null);r.run("setAudioVolume('music',85)");await flush();await flush();assert.ok(r.run('slotMusicNode'));
  r.run("playSlotBonusSample('mute-test')");await flush();await flush();r.run('muted=true;updateAudioMix()');assert.equal(r.run('slotMusicNode'),null);assert.equal(r.run('slotSampleVoices.size'),0);r.run('muted=false;updateAudioMix()');await flush();await flush();const resumed=r.run('slotMusicNode');assert.ok(resumed);r.run("openUniverse('home')");assert.equal(resumed.stopped,true);assert.equal(r.run('slotMusicNode'),null);
 });
 await test('A delayed decoder cannot play a stale bonus after leaving the slot',async()=>{
  const r=fresh();audioMock(r);r.run("playSlotBonusSample('stale');openUniverse('home')");await flush();await flush();assert.equal(r.run('slotSampleVoices.size'),0);assert.equal(r.run('slotMusicNode'),null);
 });
 await test('The dedicated music switch persists independently from game progression',()=>{
  const r=fresh();assert.equal(r.run('toggleSlotMusic()'),false);const loaded=createRuntime(FILE,{initialStorage:r.stored});assert.equal(loaded.run('lifeData.slot.arcade.musicEnabled'),false);assert.equal(loaded.run('lifeData.slot.total'),0);assert.equal(loaded.run('lifeData.balance'),5);
 });
 fs.writeFileSync('qa_spectra_v22_result.json',JSON.stringify({passed:tests.length,tests,scope:'Production logic, events and mocked Web Audio routing/lifecycle. No real speaker output, browser geometry or device performance is inferred.'},null,2));console.log(JSON.stringify({passed:tests.length}));
})().catch(error=>{console.error(error);process.exitCode=1});
