/* Visual review only: no wallet, reward, RNG or Android changes. */
(()=>{
'use strict';
const palettes={
 temple:['#64ffc3','#ffd85b','#71ffcd','#a8e9ff','#ffe079','#55f4f4','#e1b5ff','#ffcf68'],
 crystal:['#89edff','#a6d6ff','#9affeb','#c4c3ff','#e8b4ff','#85faff','#e9c5ff','#a2fff2'],
 forge:['#ff7198','#ffc752','#4be6ff','#ffbd60','#ffdc62','#79e2ff','#ffde85','#ffb26a']
};
function part(name){const node=document.createElement('i');node.className=name;node.setAttribute('aria-hidden','true');return node;}
function radiate(machine,moving,evaluation,config){
 machine.classList.add('bn-radiance');
 const reels=[...machine.children].find(node=>node.classList.contains('bn-temple-reels'));if(!reels)return;
 const winners=new Set();
 if(!moving)for(const win of evaluation?.wins||[]){
  for(let col=0;col<win.count;col++)winners.add(col+':'+ARCADE_LINES[win.line][col]);
 }
 const columns=[...reels.children].filter(node=>node.classList.contains('bn-temple-reel'));
 columns.forEach((column,col)=>{
  const strip=column.children[0];if(!strip)return;
  [...strip.children].forEach((cell,row)=>{
   const symbol=[...cell.children].find(node=>node.classList.contains('bn-world-symbol'));if(!symbol)return;
   const color=(palettes[config.id]||palettes.temple)[Number(symbol.dataset.symbol)]||'#b8fff1';
   cell.style.setProperty('--gem-color',color);cell.style.setProperty('--gem-delay',(col*65+row*45)+'ms');
   cell.classList.add('bn-radiant-cell');
   // Moving strips contain 21 rows per reel: keep their DOM and cost unchanged.
   if(moving)return;
   cell.append(part('bn-radiance-aura'));
   if(!winners.has(col+':'+row)&&!cell.classList.contains('bonus-hit'))return;
   cell.classList.add('bn-radiant-match');
   cell.append(part('bn-radiance-ring'),part('bn-radiance-flare'));
   if(!reducedFX())for(let i=0;i<6;i++){
    const spark=part('bn-radiance-spark'),angle=(i*60-30)*Math.PI/180;
    spark.style.setProperty('--spark-x',(Math.cos(angle)*35).toFixed(2)+'px');
    spark.style.setProperty('--spark-y',(Math.sin(angle)*31).toFixed(2)+'px');
    spark.style.setProperty('--spark-delay',(i*115+col*55)+'ms');cell.append(spark);
   }
  });
 });
 machine.dataset.radiantCells=String(winners.size);
}
const render=renderWorldReels;
renderWorldReels=function(machine,grid,last,moving,win,evaluation,config){
 const result=render.apply(this,arguments);radiate(machine,moving,evaluation,config);return result;
};
})();
