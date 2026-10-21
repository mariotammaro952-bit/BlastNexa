// The server derives the score by replaying legal placements against its catalog.
// This module never reads a client-provided score or star award.
export function verifyAdventure(run,catalog){
 const fail=reason=>({ok:false,reason});
 if(!run||!Number.isInteger(run.level)||run.level<1||run.level>catalog.levels.length||!['war','ocean','alien','explosive'].includes(run.scene))return fail('level');
 if(typeof run.id!=='string'||!/^[-a-zA-Z0-9:]{1,96}$/.test(run.id))return fail('id');
 const spec=catalog.levels[run.level-1],actions=run.actions;
 if(!Array.isArray(actions)||!actions.length||actions.length>spec.mission.moves||actions.length>32)return fail('actions');
 const board=[...spec.board].map(c=>c==='.'?-1:c==='#'?-2:Number(c)),relics=new Set(spec.relics),locks=new Set(spec.locks||[]),prisms=new Set(spec.prisms||[]);
 let tray=0,pieces=spec.trays[tray++].map(p=>p[0]),score=0,combo=0,lines=0,tiles=0,found=0,broken=0,rowsTotal=0,colsTotal=0,multi=0,maxCombo=0,unknownTray=false;
 const fits=(shape,x,y)=>shape.every(([dx,dy])=>x+dx>=0&&x+dx<8&&y+dy>=0&&y+dy<8&&board[(y+dy)*8+x+dx]===-1);
 const playable=()=>unknownTray?board.includes(-1):pieces.some(id=>id!==null&&Array.from({length:64},(_,k)=>k).some(k=>fits(catalog.shapes[id],k%8,Math.floor(k/8))));
 const shield=()=>{if(run.level%25!==0)return true;const b=catalog.bossStats[run.level-1];if(run.scene==='war')return b.rows&&b.cols?rowsTotal>0&&colsTotal>0:lines>=Math.min(2,b.rows+b.cols);if(run.scene==='ocean')return tiles>=Math.min(16,spec.verified.tiles);if(run.scene==='alien')return multi>=Math.min(3,b.multi);return maxCombo>=Math.min(2,b.combo);};
 const met=()=>{const m=spec.mission;return(m.type==='score'?score>=m.target&&lines>=(m.minLines||0):m.type==='lines'?lines>=m.target:m.type==='tiles'?tiles>=m.target:m.type==='relics'?found>=m.target:broken>=m.target)&&shield();};
 let boss=null;
 const arm=turn=>{const candidates=[];for(let n=0;n<8;n++){for(const[axis,line]of [['row',board.slice(n*8,n*8+8)],['col',Array.from({length:8},(_,y)=>board[y*8+n])]])if(!line.includes(-2))candidates.push({axis,index:n,filled:line.filter(v=>v>=0).length});}candidates.sort((a,b)=>b.filled-a.filled||a.index-b.index);const t=candidates[0]||{axis:'row',index:turn%8};boss={axis:t.axis,index:t.index,due:turn+3,cooldown:false};};
 if(run.level%25===0)arm(0);
 for(let step=0;step<actions.length;step++){
  const a=actions[step];if(!a||!Number.isInteger(a.slot)||a.slot<0||a.slot>2||!Number.isInteger(a.x)||!Number.isInteger(a.y)||a.x<0||a.x>7||a.y<0||a.y>7||unknownTray)return fail('placement');
  const id=pieces[a.slot];if(id===null||!catalog.shapes[id]||!fits(catalog.shapes[id],a.x,a.y))return fail('overlap');
  for(const[dx,dy]of catalog.shapes[id])board[(a.y+dy)*8+a.x+dx]=0;pieces[a.slot]=null;score+=catalog.shapes[id].length*8;
  const rows=[],cols=[];for(let y=0;y<8;y++)if(board.slice(y*8,y*8+8).every(c=>c>=0))rows.push(y);for(let x=0;x<8;x++)if(Array.from({length:8},(_,y)=>board[y*8+x]).every(c=>c>=0))cols.push(x);
  const cleared=rows.length+cols.length;if(cleared){combo++;maxCombo=Math.max(maxCombo,combo);multi=Math.max(multi,cleared);lines+=cleared;rowsTotal+=rows.length;colsTotal+=cols.length;score+=cleared*110*combo;const cells=new Set([...rows.flatMap(y=>Array.from({length:8},(_,x)=>y*8+x)),...cols.flatMap(x=>Array.from({length:8},(_,y)=>y*8+x))]);tiles+=cells.size;for(const c of cells){board[c]=-1;if(relics.delete(c))found++;if(locks.delete(c))broken++;if(prisms.delete(c))score+=60;}}else combo=0;
  if(pieces.every(id=>id===null)){if(spec.trays[tray])pieces=spec.trays[tray++].map(p=>p[0]);else unknownTray=true;}
  if(boss){if(boss.cooldown){if(!met())arm(step+1);}else if((boss.axis==='row'?rows:cols).includes(boss.index)||cleared>=3){score+=160;boss.cooldown=true;}else if(step+1>=boss.due&&!met()){boss.cooldown=true;}}
  if(!playable())return fail('blocked');
  if(met()){
   if(step!==actions.length-1)return fail('after_win');
   const m=spec.mission,base=m.type==='score'?m.target:m.type==='lines'?Math.max(180,m.target*210):m.type==='tiles'?Math.max(180,m.target*22):Math.max(180,m.target*160),stars=1+Number(score>=base*1.5)+Number(score>=base*2.3);
   return{ok:true,id:run.id,level:run.level,points:100+25*stars,stars,score,moves:actions.length,scene:run.scene};
  }
 }
 return fail('unfinished');
}
