/* Fixed app canvas, centered boards and explicit page controls. */
(()=>{
'use strict';
const id=n=>document.getElementById(n),states=new Map();
const selectors=['#menu>.menu-buttons','.bn-home-sidebar','.bn-wide-info','#wordClues','#wordControls','#universeBody','.bn-slot-details','.collect-scroll','.map-scroll','.settings-scroll','#adventureMap','#trophiesScreen','#mosaicGallery','#themeStudio','.dialog'];
let queued=false,pagerSerial=0;
function arrange(){
 const body=document.querySelector('#game .bn-wide-game'),info=body?.querySelector('.bn-wide-info'),right=body?.querySelector('.bn-wide-right'),actions=right?.querySelector('.bn-wide-actions');
 if(body&&info&&info.parentElement!==body)body.prepend(info);
 if(actions&&!id('puzzleBannerSeat')){const seat=document.createElement('div');seat.id='puzzleBannerSeat';seat.className='bn-side-ad-seat';seat.setAttribute('aria-hidden','true');actions.append(seat);}
 const words=id('wordsScroll'),details=words?.querySelector('.bn-words-details'),clues=id('wordClues');
 if(words&&clues&&clues.parentElement!==words)words.prepend(clues);
 if(details&&!id('wordsBannerSeat')){const seat=document.createElement('div');seat.id='wordsBannerSeat';seat.className='bn-side-ad-seat';seat.setAttribute('aria-hidden','true');details.append(seat);}
}
function universeNavigation(){
 const nav=id('universeTabs'),host=id('universeBody');if(!nav||!host||typeof U_TABS==='undefined')return;
 host.dataset.page=universeTab;nav.replaceChildren();nav.classList.add('bn-fixed-section-nav');
 const label=document.createElement('label');label.textContent='ESPLORA';label.htmlFor='universeSectionSelect';
 const select=document.createElement('select');select.id='universeSectionSelect';select.setAttribute('aria-label','Sezione Universo NEXA');
 for(const [key,icon,title]of U_TABS){const o=document.createElement('option');o.value=key;o.textContent=icon+' '+title;select.append(o);}
 select.value=universeTab;select.onchange=()=>renderUniverse(select.value);nav.append(label,select);
 for(const [key,text]of [['home','✦ PANORAMICA'],['words','A CRUCIVERBA'],['slot','♥ VITE & SLOT']]){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-pressed',String(universeTab===key));b.onclick=()=>renderUniverse(key);nav.append(b);}
}
function resetWindow(){
 for(const n of [document.scrollingElement,document.body,id('app')])if(n&&(n.scrollTop||n.scrollLeft)){n.scrollTop=0;n.scrollLeft=0;}
}
function barFor(host,state){
 if(state.bar?.isConnected)return state.bar;
 const bar=document.createElement('nav');bar.className='bn-static-pager';bar.setAttribute('aria-label','Pagine della schermata');const key=host.id||'panel'+(++pagerSerial);bar.id='bnPages_'+key;
 for(const [delta,label,text]of [[-1,'Pagina precedente','‹'],[1,'Pagina successiva','›']]){
  const b=document.createElement('button');b.type='button';b.id=(delta<0?'bnPagePrev_':'bnPageNext_')+key;b.setAttribute('aria-label',label);b.textContent=text;b.onclick=()=>page(host,state,state.index+delta);delta<0?state.prev=b:state.next=b;
 }
 state.caption=document.createElement('span');state.caption.setAttribute('aria-live','polite');bar.append(state.prev,state.caption,state.next);
 (host.closest('#overlay')?id('overlay'):id('app')).append(bar);state.bar=bar;return bar;
}
function page(host,state,index){
 state.index=Math.max(0,Math.min(state.anchors.length-1,index));state.top=state.anchors[state.index]||0;host.scrollTop=state.top;host.scrollLeft=0;
 state.prev.disabled=state.index===0;state.next.disabled=state.index===state.anchors.length-1;state.caption.textContent=(state.index+1)+' / '+state.anchors.length;
}
function update(host){
 let state=states.get(host);if(!state){state={index:0,top:0,anchors:[0],bar:null};states.set(host,state);
  host.addEventListener('scroll',()=>{if(Math.abs(host.scrollTop-state.top)>1)host.scrollTop=state.top;if(host.scrollLeft)host.scrollLeft=0;},{passive:true});
 }
 const r=host.getBoundingClientRect(),visible=r.width>0&&r.height>0&&!!host.getClientRects().length;
 if(!visible){if(state.bar)state.bar.hidden=true;return;}
 const padding=host.classList.contains('bn-static-paged')?32:0;
 if(host.scrollHeight-padding<=host.clientHeight+2){host.classList.remove('bn-static-paged');state.top=0;state.index=0;host.scrollTop=0;host.scrollLeft=0;if(state.bar)state.bar.hidden=true;return;}
 if(!host.classList.contains('bn-static-paged')){host.style.setProperty('--bn-page-padding',getComputedStyle(host).paddingBottom);host.classList.add('bn-static-paged');}
 const h=Math.max(40,host.clientHeight-36),max=Math.max(0,host.scrollHeight-host.clientHeight),top=host.scrollTop;
 const starts=[...host.querySelectorAll(':scope>*,.u-card,.u-dashboard-card,.world-card,.bn-style-card,.bn-word-level,.setting-row,.audio-volume,.trophy-card')].map(n=>n.getBoundingClientRect().top-r.top+top).filter(v=>v>=0).sort((a,b)=>a-b);
 const anchors=[0];for(let n=0;n<500&&anchors[anchors.length-1]<max-1;n++){
  const current=anchors[anchors.length-1],limit=current+h,candidates=starts.filter(v=>v>current+h*.55&&v<=limit);
  const next=Math.min(max,candidates.length?candidates[candidates.length-1]:limit);if(next<=current+1)break;anchors.push(next);
 }
 state.anchors=anchors;const bar=barFor(host,state);bar.hidden=anchors.length<2;
 const container=bar.parentElement.getBoundingClientRect();
 Object.assign(bar.style,{left:(r.left-container.left+3)+'px',top:(r.bottom-container.top-30)+'px',width:Math.max(40,r.width-6)+'px'});
 page(host,state,state.index);
}
function refresh(){
 queued=false;arrange();resetWindow();
 for(const [host,state]of states)if(!host.isConnected){state.bar?.remove();states.delete(host);}
 for(const host of document.querySelectorAll(selectors.join(','))){
  if(host.id==='universeBody'&&(host.dataset.page==='words'||id('app').dataset.slotWide==='play')){const state=states.get(host);host.classList.remove('bn-static-paged');host.scrollTop=0;if(state){state.top=0;state.index=0;if(state.bar)state.bar.hidden=true;}continue;}
  update(host);
 }
 window.BlastNexaBannerReady?.();
}
function schedule(){if(!queued){queued=true;requestAnimationFrame(refresh);}}
function init(){
 arrange();
 for(const name of ['renderTray','renderBoard'])if(typeof window[name]==='function'){const original=window[name];window[name]=function(){const result=original.apply(this,arguments);for(const n of document.querySelectorAll(name==='renderTray'?'#tray>.piece-slot':'#board>.cell')){const piece=name==='renderTray';n.setAttribute('role','button');n.setAttribute('aria-label',piece?'Pezzo '+(Number(n.dataset.index)+1):'Riga '+(Number(n.dataset.y)+1)+', colonna '+(Number(n.dataset.x)+1));n.tabIndex=0;const activate=()=>{if(piece){const i=Number(n.dataset.index);if(pieces[i]){selected=i;renderTray();}}else if(selected>=0)placePiece(selected,Number(n.dataset.x),Number(n.dataset.y));};n.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}};n.onclick=e=>{if(e.detail===0)activate();};}return result;};}
 if(typeof renderUniverse==='function'){const original=renderUniverse;renderUniverse=function(){const result=original.apply(this,arguments);universeNavigation();schedule();return result;};}
 universeNavigation();
 new MutationObserver(records=>{if(records.some(m=>{
  const n=m.target;if(n.nodeType!==1||n.closest('.bn-static-pager'))return false;
  return ['app','menu','game','universeScreen','universeBody','wordsScreen','wordsScroll','wordClues','wordControls','wordLevelGrid','adventureMap','worlds','trophiesScreen','mosaicGallery','themeStudio','settingsScreen','overlay'].includes(n.id);
 }))schedule();}).observe(id('app'),{childList:true,subtree:true});
 const visibility=new MutationObserver(schedule);for(const n of document.querySelectorAll('#app>section,#overlay'))visibility.observe(n,{attributes:true,attributeFilter:['style','class']});
 const size=new ResizeObserver(schedule);for(const n of document.querySelectorAll(selectors.join(',')))size.observe(n);
 document.addEventListener('wheel',e=>e.preventDefault(),{passive:false,capture:true});
 window.addEventListener('resize',schedule);document.addEventListener('focusin',resetWindow);id('app').addEventListener('scroll',resetWindow,{passive:true});
 window.BlastNexaStaticPages={refresh:schedule,panels:()=>[...states].filter(([h,s])=>h.isConnected&&s.bar&&!s.bar.hidden).map(([h,s])=>({host:h.id||h.className,page:s.index+1,pages:s.anchors.length,top:s.top}))};
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
