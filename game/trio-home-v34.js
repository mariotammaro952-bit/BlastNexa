/* Three primary games, in the requested order. Existing secondary actions stay available. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);let moreOpen=false,morePage=0,extraButtons=[];
function init(){
 const menu=$('menu'),oldSide=menu.querySelector('.bn-home-sidebar'),oldCards=menu.querySelector('.menu-buttons');if(!oldSide||!oldCards)return;
 menu.classList.add('bn-trio-home');
 const header=document.createElement('header');header.className='bn-trio-header';const brand=oldSide.querySelector('.brand').parentElement;brand.classList.add('bn-trio-brand');brand.querySelector('.brand').innerHTML='BLAST<span>NEXTA</span><small>3 IN 1</small>';brand.querySelector('.kicker').textContent='SLOT · PUZZLE · CRUCIVERBA';header.append(brand);
 const profile=oldSide.querySelector('.bn-player-menu');if(profile)header.append(profile);
 const primary=document.createElement('nav');primary.id='bnPrimaryGames';primary.setAttribute('aria-label','Scegli il tuo gioco');
 const slot=$('openLifeSlot'),words=$('openWords');slot.classList.add('bn-trio-card','bn-trio-slot');words.classList.add('bn-trio-card','bn-trio-words');
 for(const [node,number,title,copy]of [[slot,'01','SLOT','Tre mondi · Bonus monete · Rilanci'],[words,'03','CRUCIVERBA','400 schemi · Incrocia le parole']]){const text=node.querySelector('.bn-words-feature-copy');text.querySelector('small').textContent=number+' / SCEGLI E GIOCA';text.querySelector('strong').textContent=title;text.querySelector('span').textContent=copy;node.setAttribute('aria-label','Apri '+title.toLowerCase());}
 const puzzle=document.createElement('button');puzzle.id='openPuzzle';puzzle.type='button';puzzle.className='bn-trio-card bn-trio-puzzle';puzzle.setAttribute('aria-label','Apri puzzle');puzzle.onclick=()=>openAdventureMap();puzzle.innerHTML='<span class="bn-words-feature-copy"><small>02 / SCEGLI E GIOCA</small><strong>PUZZLE</strong><span>2.000 livelli · Quattro temi</span><small>Avventura, combo e nuovi mondi</small></span><span class="bn-trio-block-art" aria-hidden="true">'+Array.from({length:16},(_,i)=>'<i style="--block:'+i%5+'"></i>').join('')+'</span>';
 primary.append(slot,puzzle,words);
 const utility=document.createElement('div');utility.className='bn-trio-utility';const resume=$('resumeGame');utility.append(resume);
 for(const id of ['openSettings','openGuide']){const b=$(id);if(b)utility.append(b);}
 const more=document.createElement('button');more.id='bnMoreGames';more.type='button';more.textContent='ALTRI GIOCHI E TEMI ›';more.onclick=()=>showMore(true);utility.append(more);
 const seat=$('menuBannerSeat');seat.classList.add('bn-trio-ad');
 const panel=document.createElement('section');panel.id='bnMorePanel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','bnMoreTitle');
 const top=document.createElement('header');top.innerHTML='<h2 id="bnMoreTitle">ALTRI GIOCHI E TEMI</h2>';const close=document.createElement('button');close.id='bnMoreClose';close.textContent='TORNA AI 3 GIOCHI';close.onclick=()=>showMore(false);top.append(close);
 const grid=document.createElement('div');grid.className='bn-more-grid';
 for(const n of [...oldCards.children]){if(n.classList.contains('scene-modes'))extraButtons.push(...n.querySelectorAll('button'));else if(n.tagName==='BUTTON')extraButtons.push(n);}
 const classic=$('startClassic');if(classic){classic.textContent='∞ PUZZLE CLASSICO';extraButtons.push(classic);}
 for(const n of extraButtons)grid.append(n);
 const pager=document.createElement('nav');pager.className='bn-more-pager';const prev=document.createElement('button'),next=document.createElement('button'),caption=document.createElement('span');prev.textContent='‹ PRECEDENTI';prev.id='bnMorePrev';next.textContent='SUCCESSIVI ›';next.id='bnMoreNext';caption.id='bnMoreCount';prev.onclick=()=>{morePage--;renderMore();};next.onclick=()=>{morePage++;renderMore();};pager.append(prev,caption,next);panel.append(top,grid,pager);
 oldSide.remove();oldCards.remove();menu.replaceChildren(header,primary,utility,seat,panel);
 function renderMore(){morePage=Math.max(0,Math.min(Math.ceil(extraButtons.length/4)-1,morePage));extraButtons.forEach((n,i)=>n.hidden=Math.floor(i/4)!==morePage);caption.textContent=(morePage+1)+' / '+Math.ceil(extraButtons.length/4);prev.disabled=morePage===0;next.disabled=morePage===Math.ceil(extraButtons.length/4)-1;}
 function showMore(open){moreOpen=open;panel.hidden=!open;menu.dataset.more=String(open);for(const n of [header,primary,utility,seat])n.inert=open;renderMore();(open?close:more).focus({preventScroll:true});syncGameBanner(true);}
 const prior=gameBannerLayout;gameBannerLayout=function(){const result=prior.apply(this,arguments);if(moreOpen&&$('menu').style.display!=='none')result.visible=false;return result;};window.BlastNexaBannerLayout=()=>gameBannerLayout();
 const back=window.BlastNexaBack;window.BlastNexaBack=function(){if(moreOpen){showMore(false);return 'handled';}return back?.apply(this,arguments)||'exit';};
 menu.addEventListener('keydown',e=>{if(moreOpen&&e.key==='Escape'){e.preventDefault();showMore(false);}if(moreOpen&&e.key==='Tab'){const buttons=[...panel.querySelectorAll('button:not(:disabled):not([hidden])')].filter(n=>n.getClientRects().length),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 // Returning from a secondary mode always brings the three big cards forward.
 const display=displayMenu;displayMenu=function(){if(moreOpen)showMore(false);return display.apply(this,arguments);};
 syncGameBanner(true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
