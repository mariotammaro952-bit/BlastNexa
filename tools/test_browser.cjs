const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const FROM=Number(process.env.BN_QA_FROM||1),TO=Number(process.env.BN_QA_TO||2000);
(async()=>{
 fs.mkdirSync('qa-output',{recursive:true});
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:393,height:852}}),errors=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 // Keep the complete production code, DOM, animation locks and result callbacks.
 // Virtualize only the clock so 4,000 games do not wait hours for FX to finish.
 await page.addInitScript(()=>{
  let now=0,id=0;const pending=new Map();
  window.setTimeout=(fn,ms=0,...args)=>{const token=++id;pending.set(token,{at:now+Math.max(0,Number(ms)||0),fn:()=>fn(...args)});return token};
  window.clearTimeout=token=>pending.delete(token);
  window.__advance=ms=>{const end=now+ms;let count=0;while(true){const task=[...pending.entries()].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!task)break;if(++count>10000)throw Error('Timer loop');now=task[1].at;pending.delete(task[0]);task[1].fn();}now=end;};
 });
 await page.goto('file://'+path.resolve('app/src/main/assets/index.html'));
 await page.evaluate(()=>{muted=true;playerSettings.haptics=false;});
 // Decorative CSS is checked with normal timing separately; avoid accumulating
 // compositor animations during thousands of accelerated logical rounds.
 const bulkStyle=await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;box-shadow:none!important;filter:none!important;text-shadow:none!important;background-image:none!important}'});
 const report={winningGames:0,placements:0,exhaustedMoves:0,blockedBoards:0,zeroMovesWins:0,lateCallbacks:0,randomGames:0,randomPlacements:0,scenes:[]};
 for(const scene of ['war','ocean']){
  await page.evaluate(()=>displayMenu());await page.locator(scene==='war'?'#startWar':'#startOcean').click();
  assert.equal(await page.locator('#app').getAttribute('data-scene'),scene);
  report.scenes.push(scene);
  for(let begin=FROM;begin<=TO;begin+=50){
   const counts=await page.evaluate(({begin,end})=>{
    const counts={winningGames:0,placements:0,exhaustedMoves:0,blockedBoards:0,zeroMovesWins:0,lateCallbacks:0};
    const check=(v,message)=>{if(!v)throw Error('Level '+level+': '+message)};
    const state=()=>JSON.stringify({board,pieces,moves,score,level,gameSession});
    const targetReached=()=>{switch(mission.type){case 'score':return score>=mission.target&&totalLines>=mission.minLines;case 'lines':return totalLines>=mission.target;case 'tiles':return totalTiles>=mission.target;case 'relics':return totalRelics>=mission.target;case 'locks':return totalLocks>=mission.target;}};
    for(let n=begin;n<Math.min(end+1,begin+50);n++){
     start('adventure',n);playerSettings.effects=n%2?'full':'lite';
     check(window.__BN_TEST_FAST__!==true,'Fast-test bypass must stay disabled');
     for(const step of LEVELS[n-1].proof){
      check(playing&&!fxBusy,'Playable before placement');
      check(placePiece(step.slot,step.x,step.y),'Authored placement is legal');counts.placements++;
      const reached=targetReached(),snapshot=state(),expectedRemaining=String(mission.moves-moves);
      check($('best').textContent===expectedRemaining,'Visible move count');
      check(placePiece(step.slot,step.x,step.y)===false,'Second input during FX rejected');check(state()===snapshot,'Second input did not alter state');
      if(reached){
       check(!playing&&fxBusy,'Victory must lock immediately');check($('roundNotice').textContent.includes('COMPLETATO'),'Immediate visible completion');
       check(!$('overlay').classList.contains('on'),'Result waits only for final FX');
       __advance(playerSettings.effects==='lite'?84:649);check(!$('overlay').classList.contains('on'),'Result not duplicated or premature');
       __advance(1);check($('overlay').classList.contains('on'),'Result appears at final FX boundary');
       check($('dialogTitle').textContent==='LIVELLO SUPERATO!','Correct result title');check(!playing,'Cannot continue after victory');
       const savedStars=JSON.stringify(stars);win();__advance(10000);check(JSON.stringify(stars)===savedStars,'Duplicate completion has no extra awards');check(level===n,'Does not auto-advance');
       const next=$('dialogPrimary').onclick;next();next();
       if(n<2000)check(level===n+1&&moves===0&&playing,'One Next action advances exactly one level');
       else check($('adventureMap').style.display==='flex','Last level returns to map');
       __advance(5000);if(n<2000)check(playing&&moves===0&&!$('overlay').classList.contains('on'),'Old callbacks do not end next level');
       counts.winningGames++;break;
      }
      check(playing&&fxBusy,'Ordinary move waits for FX');__advance(1500);check(playing&&!fxBusy,'Ordinary FX unlocks');
     }
     check(counts.winningGames===n-begin+1,'Every authored path won');
     // The same level must lose if its move allowance expires without its target.
     start('adventure',n);score=0;totalLines=0;totalTiles=0;totalRelics=0;totalLocks=0;moves=mission.moves;render();
     check(adventureOutcome()==='lose','Exhausted incomplete target is loss');
     let ref=cinematicBegin();cinematicSettle(ref,'lose','Mosse esaurite',false);check(!playing,'Loss locks immediately');__advance(1500);
     check($('dialogTitle').textContent==='PARTITA FINITA','No Next Level on loss');counts.exhaustedMoves++;
     // Completing a counter cannot turn a truly blocked board into a victory.
     start('adventure',n);board=board.map(r=>r.map(()=>0));pulse=0;drillCharges=0;score=1e8;totalLines=1e8;totalTiles=1e8;totalRelics=1e8;totalLocks=1e8;
     check(adventureOutcome()==='lose','Blocked target must not win');ref=cinematicBegin();cinematicSettle(ref,'lose','Griglia bloccata',false);__advance(1500);
     check($('dialogTitle').textContent==='PARTITA FINITA','Blocked board shows loss');counts.blockedBoards++;
     // Expiring FX from an abandoned session must not touch a new one.
     start('adventure',n);const first=LEVELS[n-1].proof[0];placePiece(first.slot,first.x,first.y);start('adventure',n);__advance(2000);
     check(playing&&moves===0&&!$('overlay').classList.contains('on'),'Restart cancels old FX');counts.lateCallbacks++;
    }
    return counts;
   },{begin,end:TO});
   for(const [key,value]of Object.entries(counts))report[key]+=value;
   fs.writeFileSync(`qa-output/partial-${FROM}-${TO}.json`,JSON.stringify(report));
   console.log(scene,'verified through',Math.min(begin+49,TO));
  }
 }
 console.log('Authored paths and systematic losses complete',FROM,TO);
 // End-to-end resume, undo, terminal saves, final-move wins, both Pulse effects.
 const extra=await page.evaluate(()=>{
  const check=(v,s)=>{if(!v)throw Error(s)};
  start('adventure',1);playerSettings.effects='lite';placePiece(0,0,6);__advance(100);storeSession();resumeSession();
  check(moves===1&&playing,'Resume move count');undoMove();check(moves===0,'Undo returns move');
  for(const scene of ['war','ocean']){
   setScene(scene);start('classic');playerSettings.effects='full';board[2][2]=1;board[2][3]=2;board[3][2]=3;pulse=100;render();
   check(activateBestPulse(),'Pulse runs');check(fxBusy,'Pulse locks');check(document.querySelectorAll('.pulse-actor').length===3,'All actors visible');__advance(1500);check(!fxBusy&&playing,'Pulse finishes');
  }
  start('adventure',1);playerSettings.effects='lite';placePiece(0,0,6);__advance(100);placePiece(1,3,6);__advance(100);moves=mission.moves-1;placePiece(2,6,6);
  check(!playing,'Final-move win immediately locks');__advance(100);check($('dialogTitle').textContent==='LIVELLO SUPERATO!','Final-move win');
  return {zeroMovesWins:1};
 });report.zeroMovesWins+=extra.zeroMovesWins;
 console.log('Resume, undo and Pulse checks complete',FROM,TO);
 // Deterministic legal but unplanned play: check UI outcome against actual counters.
 report.randomPlacements=await page.evaluate(({from,to})=>{
  let turns=0,seed=812371;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  for(let n=from;n<=to;n++){
   start('adventure',n);playerSettings.effects='lite';
   let guard=0;
   while(playing){
    if(++guard>32||level!==n)throw Error('Non-terminating or auto-advanced random round '+n);
    const options=[];for(let i=0;i<3;i++)if(pieces[i])for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(canPlace(pieces[i],x,y))options.push([i,x,y]);
    if(!options.length)break;
    const [i,x,y]=options[Math.floor(rnd()*options.length)];if(!placePiece(i,x,y))throw Error('Random legal move rejected');turns++;
    const shouldWin=hasMove()&&missionMet(),shouldLose=!shouldWin&&moves>=mission.moves;
    __advance(1500);
    if(shouldWin&&$('dialogTitle').textContent!=='LIVELLO SUPERATO!')throw Error('Random completed goal not recognized '+n);
    if(shouldLose&&$('dialogTitle').textContent!=='PARTITA FINITA')throw Error('Random expired goal misclassified '+n);
    if(!playing)break;
   }
  }return turns;
 },{from:FROM,to:TO});report.randomGames=TO-FROM+1;
 await bulkStyle.evaluate(el=>el.remove());
 for(const scene of ['war','ocean']){
  await page.evaluate(scene=>{setScene(scene);start('adventure',1);playerSettings.effects='full';},scene);
  await page.screenshot({path:`qa-output/${scene}-v4-game.png`});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`qa-output/simulations-${FROM}-${TO}.json`,JSON.stringify(report,null,2));console.log('PASS',JSON.stringify(report));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
