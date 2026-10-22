/* BlastNexa v24 · landscape UI and universal banner. Slot payouts remain unchanged. */
(()=>{
'use strict';
const $id=id=>document.getElementById(id);
function pinCanvas(){
 if(window.innerWidth<=window.innerHeight)return;
 // Compatibility fallback for WebViews predating overflow:clip. Inner panels
 // retain their own scroll positions; only the fixed outer canvas is pinned.
 for(const node of [document.scrollingElement,document.body,$id('app')])if(node&&(node.scrollTop||node.scrollLeft)){node.scrollTop=0;node.scrollLeft=0;}
}
function rearrangeGame(){
 const game=$id('game');if(!game||game.querySelector('.bn-wide-game'))return;
 const top=game.querySelector(':scope > .top');if(!top)return;
 const body=document.createElement('div');body.className='bn-wide-game';
 const left=document.createElement('div');left.className='bn-wide-left';
 const right=document.createElement('div');right.className='bn-wide-right';
 const info=document.createElement('div');info.className='bn-wide-info';
 const actions=document.createElement('div');actions.className='bn-wide-actions';right.append(info,actions);
 body.append(left,right);top.after(body);
 for(const id of ['boardShell']){const el=$id(id);if(el)left.append(el);}
 const under=game.querySelector(':scope > .under-board');if(under)left.append(under);
 for(const selector of ['.bn-play-strip','.scene-strip','#adStatus','#escapeScene','#universeGameStrip','.stats','#missionCard','#bossHud','#resultReview','.power-tools','#tray','#instruction']){
   const el=game.querySelector(':scope > '+selector);if(el)(['.power-tools','#tray','#instruction'].includes(selector)?actions:info).append(el);
 }
 const lives=$id('gameLives');if(lives)top.insertBefore(lives,$id('soundBtn'));
}
function fitPlayAreas(){
 const wide=window.innerWidth>window.innerHeight,body=$id('game')?.querySelector('.bn-wide-game');
 if(wide&&body&&body.clientHeight){
  const under=body.querySelector('.under-board');
  const size=Math.floor(Math.min(body.clientHeight-(under?.getBoundingClientRect().height||24)-7,body.clientWidth*.52));
  if(size>0&&body.style.getPropertyValue('--bn-board-size')!==size+'px')body.style.setProperty('--bn-board-size',size+'px');
 }
 const words=$id('wordsScroll');
 if(wide&&words&&words.clientHeight){
  const size=Math.floor(Math.min(words.clientHeight-6,words.clientWidth*.48));
  if(size>0&&words.style.getPropertyValue('--bn-word-size')!==size+'px')words.style.setProperty('--bn-word-size',size+'px');
 }
}
function rearrangeWords(){
 const scroll=$id('wordsScroll');if(!scroll||scroll.querySelector('.bn-words-details'))return;
 const details=document.createElement('div');details.className='bn-words-details';
 for(const id of ['wordControls','wordClues']){const node=$id(id);if(node)details.append(node);}
 scroll.append(details);
}
function composeSlot(){
 const layout=$id('slotTemple');if(!layout)return;
 const cabinet=$id('slotCabinet'),app=$id('app');
 app.dataset.slotWide=cabinet?'play':'information';
 if(!cabinet){layout.classList.add('bn-slot-information');return;}
 layout.classList.add('bn-slot-wide');if(layout.querySelector('.bn-slot-sidebar'))return;
 const hero=layout.querySelector('.bn-world-topbar'),brand=hero?.querySelector('.bn-world-brand'),wallet=$id('slotWallet');
 const sidebar=document.createElement('aside');sidebar.className='bn-slot-sidebar';sidebar.setAttribute('aria-label','Opzioni della slot');
 const deck=document.createElement('div');deck.className='bn-slot-deck';
 const character=document.createElement('div');character.className='bn-slot-character';character.setAttribute('aria-hidden','true');
 const guardian=document.createElement('img');guardian.src='assets/nexa-guardian.webp';guardian.alt='';guardian.width=1024;guardian.height=1536;guardian.draggable=false;
 const caption=document.createElement('small');caption.textContent='NEXA ODYSSEY';character.append(guardian,caption);
 const panorama=document.createElement('img');panorama.className='bn-slot-panorama';panorama.src=cabinet.querySelector('.bn-world-background').src;panorama.alt='';panorama.draggable=false;
 if(brand)sidebar.append(brand);
 for(const selector of ['.bn-world-machines','.bn-arcade-tabs','.bn-world-feature','.bn-world-xp','button.bn-arcade-auto-button','.bn-slot-audio-panel','.bn-slot-cadence','.bn-world-life-wait','.bn-temple-note']){
  const node=layout.querySelector(':scope > '+selector);if(node)sidebar.append(node);
 }
 const result=$id('slotResult'),auto=layout.querySelector(':scope > .bn-arcade-auto'),controls=layout.querySelector(':scope > .bn-world-controls');
 const spin=$id('slotSpinButton');
 const respin=controls?.querySelector('.bn-world-respin');
 if(respin&&auto){
  // At reactor readiness the two auto buttons are unavailable. Use their
  // space for a full-size relaunch instead of two tiny stacked spin targets.
  auto.replaceChildren(respin);respin.setAttribute('aria-label','Rilancia i rulli');
  if(spin){
   spin.classList.remove('bn-world-normal-spin');
   spin.textContent=spin.textContent.startsWith('CONTINUA')?'CONTINUA':'GIRA';
   const detail=document.createElement('small');detail.textContent='GIRO NORMALE';spin.append(detail);
  }
 }
 if(spin){
  spin.setAttribute('aria-busy',String(typeof slotBusy!=='undefined'&&slotBusy));
  if(typeof slotPhase!=='undefined'&&slotPhase==='celebrating'){
   spin.disabled=false;spin.onclick=()=>finishSlotCelebration();spin.setAttribute('aria-label','Incassa la vincita');spin.setAttribute('aria-busy','false');
   const label=[...spin.childNodes].find(node=>node.nodeType===3);if(label)label.textContent='INCASSA';
   const detail=spin.querySelector('small');if(detail)detail.textContent='VITE GIÀ SALVATE';
  }
 }
 if(spin&&!spin.classList.contains('bn-world-normal-spin')){
  const label=[...spin.childNodes].find(node=>node.nodeType===3);
  if(label){const short={'SCEGLI UN FORZIERE':'BONUS','TORNA AI RULLI':'TORNA','GIRA NELLA CAVERNA':'GIRA','CONTINUA':'AVANTI'};label.textContent=short[label.textContent]||label.textContent;if(label.textContent.length>6)spin.classList.add('bn-long-label');}
 }
 if(wallet)deck.append(wallet);
 if(result)deck.append(result);else{const notice=document.createElement('div');notice.className='bn-world-result';notice.setAttribute('role','status');notice.textContent='Il tuo bonus ti aspetta: scegli un forziere o continua il viaggio.';deck.append(notice);}
 if(auto)deck.append(auto);if(controls)deck.append(controls);
 for(const [id,label] of [['slotAuto5','Avvia 5 giri automatici'],['slotAuto10','Avvia 10 giri automatici'],['slotAutoStop','Ferma i giri automatici']])auto?.querySelector('#'+id)?.setAttribute('aria-label',label);
 hero?.remove();layout.prepend(panorama,sidebar);layout.append(character,deck);
 for(const node of [...layout.children])if(node!==panorama&&node!==sidebar&&node!==cabinet&&node!==character&&node!==deck&&!node.classList.contains('bn-slot-fx-layer'))sidebar.append(node);
}
function installLayout(){
 if(typeof renderLifeSlot==='function'){
  const original=renderLifeSlot;
  renderLifeSlot=function(){
   const side=$id('slotTemple')?.querySelector('.bn-slot-sidebar'),scroll=side?.scrollTop||0;
   const result=original.apply(this,arguments);
   const current=$id('slotTemple')?.querySelector('.bn-slot-sidebar');if(current)current.scrollTop=scroll;
   pinCanvas();return result;
  };
 }
 if(typeof slotPostRender==='function'){const original=slotPostRender;slotPostRender=function(){composeSlot();return original.apply(this,arguments);};}
 if(typeof renderWords==='function'){const original=renderWords;renderWords=function(){const result=original.apply(this,arguments);fitPlayAreas();return result;};}
 const resize=new ResizeObserver(fitPlayAreas);
 for(const id of ['game','wordsScroll']){const el=$id(id);if(el)resize.observe(el);}
 const under=$id('game')?.querySelector('.under-board');if(under)resize.observe(under);
 window.addEventListener('resize',()=>{fitPlayAreas();pinCanvas();});
 $id('app')?.addEventListener('scroll',pinCanvas,{passive:true});
 document.addEventListener('focusin',pinCanvas);fitPlayAreas();pinCanvas();
}
function installBanner(){
 if(typeof gameBannerLayout!=='function'||typeof syncGameBanner!=='function')return;
 gameBannerLayout=function(){
  const r=$id('gameBannerFrame').getBoundingClientRect();
  const width=Math.max(0,Math.min(360,Math.floor(r.width)));
  const inSlot=typeof slotVisible==='function'&&slotVisible();
  const inWords=typeof wordsVisible==='function'&&wordsVisible();
  const inGame=$id('game')?.style.display==='flex';
  const pending=typeof bnPendingAd!=='undefined'&&!!bnPendingAd;
  const valid=n=>Number.isFinite(n)?Math.round(n*10)/10:0;
  return {slot:'landscape_bottom',context:inSlot?'slot':inWords?'words':inGame?'blocks':'other',session:typeof gameSession==='number'?gameSession:0,visible:!document.hidden&&!$id('overlay')?.classList.contains('on')&&!pending&&width>=200,x:valid(r.left),y:valid(r.top),width,height:50,coordinateSpace:'css-pixels',maxHeight:50};
 };
 syncGameBanner=function(force=false){
  const dock=$id('gameBanner'),frame=$id('gameBannerFrame'),app=$id('app');if(!dock||!frame||!app)return;
  dock.hidden=false;app.dataset.banner='on';
  const inSlot=typeof slotVisible==='function'&&slotVisible();
  const inWords=typeof wordsVisible==='function'&&wordsVisible();
  app.dataset.bannerContext=inSlot?'slot':inWords?'words':$id('game')?.style.display==='flex'?'blocks':'other';
  if(!inSlot)delete app.dataset.slotWide;
  if(typeof bnBannerSession!=='undefined'&&bnBannerSession!==gameSession){bnBannerSession=gameSession;bnBannerState='preview';}
  const layout=gameBannerLayout();frame.style.visibility=layout.visible?'visible':'hidden';
  if(typeof bnBannerState!=='undefined'){frame.dataset.state=bnBannerState;$id('gameBannerPreview').hidden=bnBannerState==='loaded';}
  if(typeof bnExpansionReady!=='undefined'&&bnExpansionReady&&typeof slotMediaSync==='function')slotMediaSync();
  const payload=JSON.stringify(layout);
  if(!force&&typeof bnBannerLastPayload!=='undefined'&&payload===bnBannerLastPayload)return;
  if(typeof bnBannerLastPayload!=='undefined')bnBannerLastPayload=payload;
  try{if(typeof window.BlastNexaAds?.bannerLayout==='function')window.BlastNexaAds.bannerLayout(payload);}catch{}
 };
 window.BlastNexaBannerLayout=()=>gameBannerLayout();
 window.BlastNexaBannerReady=()=>syncGameBanner(true);
 let queued=false;
 const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;syncGameBanner();});};
 const observer=new MutationObserver(schedule);
 for(const id of ['menu','map','mapScreen','universeScreen','wordsScreen','game','overlay']){
   const node=$id(id);if(node)observer.observe(node,{attributes:true,attributeFilter:['style','class']});
 }
 window.addEventListener('resize',()=>syncGameBanner(true));
 document.addEventListener('visibilitychange',schedule);
 schedule();
}
function init(){rearrangeGame();rearrangeWords();installLayout();installBanner();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
