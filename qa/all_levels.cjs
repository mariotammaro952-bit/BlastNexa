const fs=require('node:fs');
const {createRuntime}=require('./runtime.cjs');
const resolved=require('node:path').resolve(process.argv[2]),r=createRuntime(resolved),started=Date.now();
// Presentation and persistence IO are adapted; all game mechanics stay production.
r.run(`for(const name of ['render','showPlacementFx','showBlastFx','showUniverseImpact','showAdrenalineMoveFX','showVictoryFinish','sPlace','sClear','haptic','adUnlockAudio','syncFlair','refreshUniverseMenu','refreshLivesUI','refreshWordMenu','saveUniverse','storeSession','refreshPlayerUI']){try{eval(name+'=()=>{}')}catch{}};unlocked=2000;lifeData.balance=999999;playerSettings.effects='lite';`);
const failures=[],scenes=['war','ocean','alien','explosive'];let checks=0,placements=0,won=0;
for(const scene of scenes){
 const stats=r.run(`(()=>{setScene(${JSON.stringify(scene)});const results=[];let turns=0;for(let n=1;n<=2000;n++){
  try{if(start('adventure',n)!==true)throw Error('start refused');const proof=LEVELS[n-1].proof;let used=0;
   for(const p of proof){if(roundOutcome)break;if(!pieces[p.slot]||SHAPES.indexOf(pieces[p.slot].shape)!==p.shape)throw Error('tray mismatch at '+used);if(!placePiece(p.slot,p.x,p.y))throw Error('placement refused at '+used);used++;turns++;if(roundOutcome==='lose')throw Error('loss on proof at '+used);}
   if(roundOutcome!=='win'||!roundFinalized||playing||!missionMet()||!hasMove()||moves>mission.moves)throw Error('proof did not finish with a playable win: '+roundOutcome+' moves '+moves);
   const before=score,id=runMeta.id,st=JSON.stringify(stars);if(placePiece(0,0,0)!==false||score!==before)throw Error('input after win');win();if(JSON.stringify(stars)!==st||runMeta.id!==id)throw Error('duplicate win mutated progress');
  }catch(e){results.push({level:n,error:e.message,score,moves,outcome:roundOutcome,goal:mission});}
 }return{results,turns};})()`);
 const f=JSON.parse(JSON.stringify(stats.results));failures.push(...f.map(x=>({scene,...x})));placements+=stats.turns;checks+=2000;won+=2000-f.length;
 console.log(JSON.stringify({scene,checked:2000,failed:f.length,elapsedSeconds:Math.round((Date.now()-started)/1000)}));
}
const result={file:resolved,levelCount:2000,scenes,levelSceneRuns:checks,successful:won,placements,failures,seconds:(Date.now()-started)/1000,scope:'Exact production placement/scoring/goal/result logic; rendering, audio and storage IO adapted. Authored solution replay proves a valid path, not fairness of arbitrary player choices.'};fs.writeFileSync('qa/all_levels_result.json',JSON.stringify(result,null,2));console.log(JSON.stringify({runs:checks,won,failures:failures.slice(0,20)}));process.exitCode=failures.length?1:0;
