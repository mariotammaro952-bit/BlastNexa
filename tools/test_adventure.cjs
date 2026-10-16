const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/src/main/assets/index.html','utf8');
const pack=JSON.parse(fs.readFileSync(__dirname+'/../levels/levels.json','utf8'));
function fn(name){const a=html.indexOf('function '+name+'(');assert.ok(a>=0,name);const line=html.indexOf('\n',a);return html.slice(a,html.slice(a,line).endsWith('}')?line:html.indexOf('\n}',a)+2);}
const dummy=()=>{};
const c={console,Set,Math,window:{__BN_TEST_FAST__:true},COLORS:Array(7).fill('#fff'),LEVELS:pack.levels,
 storage:{set:dummy},clearTimeout:dummy,sPlace:dummy,render:dummy,showPlacementFx:dummy,showBlastFx:dummy,cinematicBegin:()=>({}),cinematicSettle:dummy,
 findBestPulse:()=>null,findBestDrill:()=>null,roundDecision:null,mode:'adventure',fxBusy:false,playing:true,hintTimer:null,hintPreview:null,
 dailySeed:0,runBestCombo:0,activeMosaic:0,mosaicSaved:{},circuitCells:[],circuitCharged:new Set(),best:0};
vm.createContext(c);
const shapes=html.match(/const SHAPES=(.*?);/s);assert.ok(shapes);vm.runInContext('var SHAPES='+shapes[1],c);
for(const name of ['missionFor','canPlace','hasMove','missionMet','adventureOutcome','scriptedTray','freshTray','placePiece','undoMove'])vm.runInContext(fn(name),c);

function load(l){Object.assign(c,{level:l.id,levelSpec:l,mission:c.missionFor(l.id),moves:0,placedCount:0,score:0,combo:0,pulse:0,totalLines:0,totalTiles:0,totalRelics:0,totalLocks:0,
 relics:new Set(l.relics),locks:new Set(l.locks),prisms:new Set(l.prisms),trayIndex:0,recentTurns:[],undoSnapshot:null,undoCharges:1,drillCharges:0,
 board:Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>{const v=l.board[y*8+x];return v==='.'?-1:v==='#'?-2:Number(v)}))});vm.runInContext('pieces=scriptedTray()',c);}
let maxUsed=0;
for(const l of pack.levels){load(l);for(const step of l.proof){if(c.adventureOutcome()==='win')break;assert.equal(c.adventureOutcome(),'continue',`premature end ${l.id}`);assert.equal(c.pieces[step.slot].shape,c.SHAPES[step.shape]);assert.equal(c.placePiece(step.slot,step.x,step.y),true,`illegal proof ${l.id}`);}
 assert.equal(c.missionMet(),true,`unsolved ${l.id}`);assert.ok(c.moves<=c.mission.moves,`over budget ${l.id}`);assert.equal(c.adventureOutcome(),'win');maxUsed=Math.max(maxUsed,c.moves);
}
load(pack.levels[0]);c.score=c.mission.target;c.totalLines=c.mission.minLines;assert.equal(c.adventureOutcome(),'win','Completed playable target wins immediately');c.pieces=[null,null,null];assert.equal(c.adventureOutcome(),'lose','Blocked completed target must lose');
load(pack.levels[0]);c.moves=c.mission.moves;assert.equal(c.adventureOutcome(),'lose');c.score=c.mission.target;c.totalLines=c.mission.minLines;assert.equal(c.adventureOutcome(),'win','Last allowed placement can win');
load(pack.levels[0]);assert.equal(c.placePiece(0,-1,-1),false);assert.equal(c.moves,0);
c.mode='classic';c.moves=10000;assert.equal(c.adventureOutcome(),'continue');c.mode='adventure';
load(pack.levels[0]);const step=pack.levels[0].proof[0];c.placePiece(step.slot,step.x,step.y);assert.equal(c.moves,1);
Object.assign(c,{$:()=>({replaceChildren:dummy,classList:{remove:dummy}}),showToast:dummy,gameSession:1});c.undoMove();assert.equal(c.moves,0);assert.equal(c.placedCount,0);
console.log(`PASS: all 2000 target solutions within their move limits (max ${maxUsed} placements), final-move victory, cutoff, invalid placement, undo, infinite Classic`);
