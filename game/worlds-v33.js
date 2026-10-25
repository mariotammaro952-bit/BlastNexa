/* One complete world per screen. The authored levels and unlock rules stay in the engine. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),original=window.renderAdventureMap;
function worldPage(delta){
 mapWorld=Math.max(0,Math.min(WORLD_DATA.length-1,mapWorld+delta));
 mapPage=Math.floor(Math.max(0,Math.min(99,unlocked-1-mapWorld*100))/10);
 renderAdventureMap();
}
function worldNavigation(){
 let bar=$('bnPages_mapScroll');
 if(!bar){
  bar=document.createElement('nav');bar.id='bnPages_mapScroll';bar.className='bn-static-pager bn-map-pager bn-world-pager';bar.setAttribute('aria-label','Scegli un mondo');
  const prev=document.createElement('button');prev.type='button';prev.id='bnPagePrev_mapScroll';prev.textContent='‹';prev.setAttribute('aria-label','Mondo precedente');prev.onclick=()=>worldPage(-1);
  const select=document.createElement('select');select.id='mapWorldSelect';select.setAttribute('aria-label','Mondo da esplorare');
  WORLD_DATA.forEach((world,index)=>{const o=document.createElement('option');o.value=index;o.textContent=(index+1)+' / '+WORLD_DATA.length+' · '+world.name;select.append(o);});
  select.onchange=()=>{worldPage(Number(select.value)-mapWorld);};
  const next=document.createElement('button');next.type='button';next.id='bnPageNext_mapScroll';next.textContent='›';next.setAttribute('aria-label','Mondo successivo');next.onclick=()=>worldPage(1);
  bar.append(prev,select,next);$('adventureMap').append(bar);
 }
 $('bnPagePrev_mapScroll').disabled=mapWorld===0;$('bnPageNext_mapScroll').disabled=mapWorld===WORLD_DATA.length-1;$('mapWorldSelect').value=String(mapWorld);
 bar.hidden=false;
}
window.renderAdventureMap=function(){
 mapWorld=Math.max(0,Math.min(WORLD_DATA.length-1,Number(mapWorld)||0));mapPage=Math.max(0,Math.min(9,Number(mapPage)||0));
 original.apply(this,arguments);
 const screen=$('adventureMap'),scroll=$('mapScroll');screen.classList.add('bn-world-screen');
 let overview=$('mapOverview');
 if(!overview){overview=document.createElement('aside');overview.id='mapOverview';overview.className='bn-map-overview';overview.setAttribute('aria-label','La tua avventura');scroll.prepend(overview);overview.append(scroll.querySelector('.map-hero'),scroll.querySelector('.map-progress'));}
 const hero=overview.querySelector('.map-hero');hero.querySelector('h2').textContent='Un universo da liberare';
 const cards=[...$('worlds').children];cards.forEach((card,index)=>{if(index!==mapWorld)card.remove();});
 const card=$('worlds').firstElementChild;card.id='mapCurrentWorld';card.dataset.world=String(mapWorld);card.setAttribute('aria-label','Mondo '+(mapWorld+1)+': '+WORLD_DATA[mapWorld].name);
 // A world is always expanded, so there is no folding button with a hidden grid.
 const toggle=card.querySelector('.world-toggle'),heading=document.createElement('div');heading.className='world-toggle bn-world-heading';heading.replaceChildren(...toggle.childNodes);toggle.replaceWith(heading);
 card.querySelector('.world-summary')?.remove();
 const nav=card.querySelector('.world-pagebar'),buttons=nav.querySelectorAll('button');buttons[0].id='mapLevelsPrev';buttons[0].type='button';buttons[0].setAttribute('aria-label','Livelli precedenti');buttons[1].id='mapLevelsNext';buttons[1].type='button';buttons[1].setAttribute('aria-label','Livelli successivi');
 nav.querySelector('span').textContent='LIVELLI '+(mapWorld*100+mapPage*10+1)+'–'+(mapWorld*100+mapPage*10+10);
 card.querySelectorAll('.level-node').forEach((node,index)=>{node.id='mapLevel'+(mapWorld*100+mapPage*10+index+1);});
 scroll.querySelector('.map-tip')?.remove();scroll.scrollTop=0;scroll.scrollLeft=0;scroll.dataset.world=String(mapWorld);scroll.dataset.levelPage=String(mapPage);
 worldNavigation();
};
window.BlastNexaWorldPage=()=>({world:mapWorld,levelPage:mapPage,first:mapWorld*100+mapPage*10+1,last:mapWorld*100+mapPage*10+10});
})();
