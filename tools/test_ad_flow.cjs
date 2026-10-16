const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/src/main/assets/index.html','utf8');
// Parse every executable inline script before exercising the production ad flow.
for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) if(!m[1].includes('application/json')) new vm.Script(m[2]);
const code=html.slice(html.indexOf('let bnAdToken='),html.indexOf('function win('));
function setup(){
 const elements=new Map(); const calls=[];
 const c={window:{BlastNexaAds:{rewarded:t=>calls.push(['rewarded',t]),betweenRounds:t=>calls.push(['between',t])}},
  $:id=>{if(!elements.has(id))elements.set(id,{disabled:false,style:{},classList:{remove(){}}});return elements.get(id);},
  roundDecision:{outcome:'lose',resolved:false},gameSession:1,mode:'classic',rewardedContinueUsed:false,playing:true,board:Array.from({length:8},()=>Array(8).fill(2)),
  pieces:[],SHAPES:[[[0,0]],[[0,0],[1,0]]],undoSnapshot:{},selected:0,combo:4,score:123,
  render(){},storeSession(){c.saved=true;},showToast(m){c.toast=m;},clearSession(){},commitRunStats(){},
  dialog(...args){c.dialogArgs=args;},level:1,start(){c.started=true;}};
 vm.createContext(c);vm.runInContext(code,c);return {c,calls,run:s=>vm.runInContext(s,c)};
}
{
 const {c,calls,run}=setup();run("lose('stuck')");assert.equal(c.dialogArgs[1],'VUOI CONTINUARE?');
 c.dialogArgs[4]();assert.equal(calls.length,1);c.dialogArgs[4]();assert.equal(calls.length,1);
 c.window.BlastNexaAdResult(calls[0][1],false);assert.equal(c.rewardedContinueUsed,false);assert.equal(c.board[2][2],2);assert.ok(c.toast);
 c.dialogArgs[4]();const token=calls[1][1];c.window.BlastNexaAdResult(token,true);
 assert.equal(c.rewardedContinueUsed,true);assert.equal(c.roundDecision,null);assert.equal(c.playing,true);assert.equal(c.saved,true);
 assert.equal(c.board.flat().filter(x=>x===-1).length,9);assert.equal(c.pieces.length,3);assert.ok(c.pieces.every(p=>p.shape.length===1));assert.equal(c.score,123);
 c.board[2][2]=5;c.window.BlastNexaAdResult(token,true);assert.equal(c.board[2][2],5);
 run("lose('again')");assert.equal(c.dialogArgs[1],'PARTITA FINITA');
}
{
 const {c,calls,run}=setup();run("lose('stuck')");c.dialogArgs[4]();c.gameSession++;
 c.window.BlastNexaAdResult(calls[0][1],true);assert.equal(c.rewardedContinueUsed,false);
}
{
 const {c,run}=setup();delete c.window.BlastNexaAds;run("lose('stuck')");assert.equal(c.dialogArgs[1],'PARTITA FINITA');
 c.dialogArgs[4]();assert.equal(c.started,true);
}
{
 const {c,calls,run}=setup();run("bnTransition(()=>{playing=true});playing=false");
 assert.equal(c.playing,false);assert.equal(calls[0][0],'between');
 c.window.BlastNexaAdResult(calls[0][1],false);assert.equal(c.playing,true);
}
console.log('PASS: script syntax, reward success/failure/duplicate/stale callbacks, one continuation, offline fallback, interstitial sequencing');
