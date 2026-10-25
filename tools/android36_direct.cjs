// Native WebView checks without ActivityScenario's global-idle launch wait.
// CDP prepares fixtures/reads state; every tested activation uses adb input
// coordinates from a fresh Android accessibility XML snapshot.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const dir='android-evidence',pkg='com.blastnexa.blockpuzzle.preview';fs.mkdirSync(dir,{recursive:true});
const adb=(...args)=>cp.execFileSync('adb',args,{encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024});
const pause=ms=>new Promise(r=>setTimeout(r,ms));let ws,serial=0,snapshot=0,logcat;const pending=new Map(),errors=[],checks=[];
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++serial,t=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},20000);pending.set(id,{resolve:v=>{clearTimeout(t);resolve(v);},reject:e=>{clearTimeout(t);reject(e);}});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function wait(expression,timeout=45000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{if(await evaluate(expression))return;}catch(e){last=e.message;}await pause(250);}throw Error('Condition timed out: '+expression+' '+(last||''));}
async function attach(){
 const end=Date.now()+45000;let pages,last;
 while(Date.now()<end){try{const pid=adb('shell','pidof','-s',pkg).trim();assert.match(pid,/^\d+$/);adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+pid);pages=await(await fetch('http://127.0.0.1:9222/json/list',{signal:AbortSignal.timeout(3000)})).json();if(pages.some(p=>p.type==='page'&&p.url==='file:///android_asset/index.html'))break;}catch(e){last=e.message;}await pause(500);}
 const page=pages?.find(p=>p.type==='page'&&p.url==='file:///android_asset/index.html');assert.ok(page,'No game WebView debug target: '+last);
 ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('WebView socket did not connect')),15000);ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});ws.addEventListener('error',e=>{clearTimeout(timer);reject(e);},{once:true});});
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);});
 await send('Runtime.enable');await wait("typeof playerTotals==='function' && !!document.getElementById('openLifeSlot')");
}
function launch(){adb('shell','am','start','-W','-n',pkg+'/com.blastnexa.blockpuzzle.OdysseyActivity','--ez','bn_qa_no_ads','true');}
function capture(name){const p=cp.execFileSync('adb',['exec-out','screencap','-p'],{timeout:20000,maxBuffer:8*1024*1024});fs.writeFileSync(dir+'/'+name+'.png',p);}
async function tree(allowSystemDialog=false){
 if(!allowSystemDialog)await wait('document.hasFocus()',15000);
 for(let attempt=0;attempt<4;attempt++){
  if(attempt)await pause(700);
  await evaluate("(()=>{document.getElementById('bnQaSnapshotFreeze')?.remove();const s=document.createElement('style');s.id='bnQaSnapshotFreeze';s.textContent='*,*::before,*::after{animation-play-state:paused!important;transition:none!important}';document.head.append(s);return true;})()");
  try{
   const path='/sdcard/bn-direct-'+(++snapshot)+'.xml';adb('shell','uiautomator','dump','--compressed',path);const xml=adb('exec-out','cat',path);
   if(xml.includes('<hierarchy')){fs.writeFileSync(dir+'/ui-'+snapshot+'.xml',xml);return xml;}
   console.log('ACCESSIBILITY_ROOT_RETRY '+(attempt+1));
  }finally{await evaluate("document.getElementById('bnQaSnapshotFreeze')?.remove();true");}
 }
 throw Error('Android accessibility root did not become available after the screen change');
}
async function tap(label,optional=false){
 const xml=await tree(optional),script="import sys,re,json,xml.etree.ElementTree as E\ns=sys.stdin.read();s=s[s.index('<hierarchy'):s.index('</hierarchy>')+12];key=sys.argv[1]\nfor n in E.fromstring(s).iter('node'):\n a=n.attrib;r=a.get('resource-id','')\n if a.get('enabled')!='false' and (r==key or r.endswith('/'+key) or a.get('text')==key or a.get('content-desc')==key):\n  b=list(map(int,re.findall(r'-?\\d+',a.get('bounds',''))))\n  if len(b)==4 and b[2]>b[0] and b[3]>b[1]:print(json.dumps([(b[0]+b[2])//2,(b[1]+b[3])//2]));break\n";
 const result=cp.execFileSync('python3',['-c',script,label],{input:xml,encoding:'utf8',timeout:10000}).trim();
 if(!result){if(optional)return false;throw Error('Native accessibility target missing: '+label);}
 const [x,y]=JSON.parse(result);adb('shell','input','tap',String(x),String(y));await pause(200);return true;
}
async function fixture(machine,effects='lite'){
 await evaluate(`cancelSlotAnimation();document.getElementById('overlay').classList.remove('on');openUniverse('slot');muted=true;Object.assign(lifeData.slot.arcade,{bonus:null,revealed:null,freeSpins:0,crystalJourney:null,reactor:0,treasure:0});lifeData.slot.wallet.balance=50000;setArcadeMachine('${machine}');slotRandomInt=()=>0;playerSettings.effects='${effects}';applyPlayerSettings();saveLives();renderLifeSlot(document.getElementById('universeBody'));true`);await pause(1000);
}
async function test(name,fn){await fn();checks.push(name);console.log('DIRECT_PASS '+name);fs.writeFileSync(dir+'/direct-results.json',JSON.stringify({passed:checks.length,expected:4,checks,errors},null,2));}
async function main(){
 adb('install','-r','imported-artifacts/preview/debug/app-preview-debug.apk');adb('logcat','-c');
 const fd=fs.openSync(dir+'/direct-logcat.txt','w');logcat=cp.spawn('adb',['logcat','-v','threadtime'],{stdio:['ignore',fd,fd]});
 fs.writeFileSync(dir+'/webview-provider-direct.txt',adb('shell','dumpsys','webviewupdate'));launch();await attach();console.log('DIRECT_APP_READY');capture('direct-started');
 await tap('Got it',true);await pause(1200);
 if(process.env.BN_QA_BOOTSTRAP_ONLY==='1'){
  adb('shell','input','keyevent','61');await pause(700);capture('fullscreen-education-dismissed');console.log('FULLSCREEN_EDUCATION_HANDLED_BEFORE_INSTRUMENTATION');
  adb('shell','am','force-stop',pkg);return;
 }
 await wait('document.hasFocus()',15000);await evaluate("localStorage.setItem('blastnexa_help_seen','true');document.getElementById('overlay').classList.remove('on');muted=true;displayMenu();true");
 await test('Large red relaunch with native hold and relaunch touches',async()=>{
  await fixture('forge','full');await evaluate("lifeData.slot.last=chooseSlotResult('spin');lifeData.slot.arcade.reactor=6;slotHolds.clear();saveLives();renderLifeSlot(document.getElementById('universeBody'));true");
  assert.equal(await evaluate("document.getElementById('slotRespinButton').disabled"),true);await tap('slotHold0');
  assert.equal(await evaluate("(()=>{const a=document.getElementById('slotRespinButton'),b=document.getElementById('slotSpinButton'),x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return !a.disabled&&getComputedStyle(a,'::after').animationName==='bnRedRelaunch'&&Math.abs(x.width-y.width)<1&&Math.abs(x.height-y.height)<1;})()"),true);capture('direct-red-relaunch');
  const before=await evaluate("({total:lifeData.slot.total,coins:lifeData.slot.wallet.balance})");await tap('slotRespinButton');
  const after=await evaluate("({total:lifeData.slot.total,coins:lifeData.slot.wallet.balance,last:lifeData.slot.last,duplicate:spinLifeSlot('respin')})");assert.equal(after.total,before.total+1);assert.equal(after.last.arcade.kind,'respin');assert.deepEqual(after.last.arcade.held,[0]);assert.equal(after.coins,before.coins-after.last.coinCost+after.last.coinsCredited);assert.equal(after.duplicate,false);
  await wait('!!bnSupernovaRun');await pause(8500);await tap('snSkip');await wait('!slotBusy');
 });
 await test('Three coin pages, single saved award, process restart persistence',async()=>{
  await fixture('temple');const before=await evaluate('lifeData.slot.total');await tap('slotSpinButton');await wait('!!bnSupernovaRun');await pause(8500);
  const committed=await evaluate('({coins:lifeData.slot.wallet.balance,lives:lifeData.balance,total:lifeData.slot.total})');assert.equal(committed.total,before+1);assert.equal(await evaluate('slotBusy&&!window.BlastNexaBannerLayout().visible'),true);capture('direct-coin-bonus');
  for(let page=0;page<3;page++){assert.equal(await evaluate('bnSupernovaRun.page'),page);await tap('snCoin0');await tap('snRevealAll');if(page===2)assert.equal(await evaluate('bnSupernovaRun.counters.every(c=>c.collected===c.value)'),true);await tap('snContinue');}
  assert.equal(await evaluate('!bnSupernovaRun&&!slotBusy'),true);assert.deepEqual(await evaluate('({coins:lifeData.slot.wallet.balance,lives:lifeData.balance,total:lifeData.slot.total})'),committed);
  await evaluate('saveLives();true');ws.close();adb('shell','am','force-stop',pkg);launch();await attach();assert.deepEqual(await evaluate('({coins:lifeData.slot.wallet.balance,lives:lifeData.balance,total:lifeData.slot.total})'),committed);
 });
 await test('Centred adventure map and board with native map page touches',async()=>{
  await evaluate("displayMenu();openAdventureMap();true");await wait("!!document.getElementById('bnPages_mapScroll')");
  assert.equal(await evaluate("(()=>{const a=document.getElementById('adventureMap').getBoundingClientRect(),s=document.getElementById('mapScroll').getBoundingClientRect(),h=document.querySelector('.map-hero').getBoundingClientRect(),p=document.getElementById('bnPages_mapScroll').getBoundingClientRect(),ad=document.getElementById('gameBanner').getBoundingClientRect();return !document.getElementById('bnPages_adventureMap')&&Math.abs(h.left+h.width/2-a.left-a.width/2)<2&&s.bottom<=p.top+1&&p.bottom<=ad.top+1;})()"),true);capture('direct-map');
  await tap('bnPageNext_mapScroll');assert.equal(await evaluate("document.getElementById('mapScroll').scrollTop>0"),true);await tap('bnPagePrev_mapScroll');
  await evaluate("start('adventure',1);true");await pause(400);assert.equal(await evaluate("(()=>{const b=document.getElementById('boardShell').getBoundingClientRect(),a=document.querySelector('#game .bn-wide-game').getBoundingClientRect();return Math.abs(b.left+b.width/2-a.left-a.width/2)<2&&Math.abs(b.width-b.height)<2&&b.top>=0&&b.bottom<=innerHeight;})()"),true);capture('direct-puzzle');
 });
 await test('Central banner geometry and current-session status callbacks',async()=>{
  await fixture('temple');assert.equal(await evaluate("(()=>{const seat=document.getElementById('slotBannerSeat').getBoundingClientRect(),frame=document.getElementById('gameBannerFrame').getBoundingClientRect(),spin=document.getElementById('slotSpinButton').getBoundingClientRect(),b=window.BlastNexaBannerLayout();return b.visible&&b.slot==='slot_control_deck'&&frame.height===50&&frame.left>=seat.left&&frame.right<=seat.right&&frame.bottom<=seat.bottom&&frame.right<spin.left;})()"),true);
  await evaluate("window.BlastNexaBannerStatus({session:gameSession,status:'loaded'});true");assert.equal(await evaluate("document.getElementById('gameBannerPreview').hidden"),true);await evaluate("window.BlastNexaBannerStatus({session:gameSession,status:'unavailable'});true");assert.equal(await evaluate("!document.getElementById('gameBannerPreview').hidden"),true);capture('direct-banner');
 });
 assert.deepEqual(errors,[]);assert.equal(checks.length,4);console.log('DIRECT_VALIDATION_SUMMARY expected=4 passed=4');
}
main().catch(e=>{console.error(e);fs.writeFileSync(dir+'/direct-failure.txt',e.stack);try{capture('direct-failure');}catch{}process.exitCode=1;}).finally(()=>{ws?.close();logcat?.kill();});
