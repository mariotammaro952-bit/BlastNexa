const fs=require('node:fs'),assert=require('node:assert/strict'),{createRuntime}=require('./runtime.cjs');
const r=createRuntime('game/index.html'),started=Date.now();
// Only presentation is adapted: rack, crossings, save/load, rewards and submit are production.
r.run(`for(const n of ['render','renderWords','refreshWordMenu','refreshPlayerUI','refreshUniverseMenu','refreshLivesUI','playSceneCue','haptic','adUnlockAudio','saveRanking','showToast']){try{eval(n+'=()=>{}')}catch{}};lifeData.balance=999999;unlocked=2000;`);
let rounds=0,words=0,letters=0,reloads=0;
for(let batch=0;batch<25;batch++){
 const result=r.run(`(()=>{let words=0,letters=0,reloads=0;
 for(let id=0;id<400;id++){
  if(!startWord(id))throw Error('start '+id);
  while(wordData.active.status==='playing'){
   const before=JSON.stringify(wordData.active);if(putWordLetter(-1)||JSON.stringify(wordData.active)!==before)throw Error('invalid input mutated');
   const answer=wordPuzzle().entries[wordData.active.selected].answer;
   for(let i=0;i<answer.length;i++){
    if(wordData.active.draft[i])continue;
    const at=wordRackLetters().findIndex((c,k)=>c===answer[i]&&!wordData.active.sources.includes(k));
    if(at<0||!putWordLetter(at))throw Error('letter '+id);letters++;
    if(i===1&&id%20===0){const before=wordData.active;wordData=loadWordData();if(Object.keys(before).some(k=>JSON.stringify(before[k])!==JSON.stringify(wordData.active[k])))throw Error('draft reload '+id);reloads++;}
   }
   if(!submitWord())throw Error('submit '+id);words++;
  }
  if(wordData.active.status!=='win'||wordData.active.errors!==0)throw Error('win '+id);
  const balance=JSON.stringify([universe.materials,universe.xp,lifeData.balance]);
  if(submitWord()||JSON.stringify([universe.materials,universe.xp,lifeData.balance])!==balance)throw Error('duplicate reward '+id);
  if(id%20===0){wordData=loadWordData();if(wordData.active.status!=='win'||!wordData.progress[id])throw Error('win reload '+id);reloads++;}
 }return {words,letters,reloads};})()`);
 rounds+=400;words+=result.words;letters+=result.letters;reloads+=result.reloads;
 console.log('PASS crosswords',rounds,'complete rounds');
}
assert.equal(rounds,10000);assert.equal(r.run('Object.values(wordData.progress).filter(Boolean).length'),400);
fs.writeFileSync('qa/crosswords_10000_v39_results.json',JSON.stringify({rounds,words,letters,reloads,failures:[],seconds:(Date.now()-started)/1000,scope:'10000 completed rounds: each of 400 crosswords replayed 25 times, actual production rack/crossing/submit/save/load and duplicate-reward guards; DOM and sound adapted.'},null,2));
