/* BlastNexa landscape UI: embedded home banner and paired coin/life rewards. */
(()=>{
'use strict';
const $id=id=>document.getElementById(id);
function rearrangeMenu(){
 const menu=$id('menu');if(!menu||menu.querySelector('.bn-home-sidebar'))return;
 const cards=menu.querySelector(':scope > .menu-buttons');if(!cards)return;
 const side=document.createElement('aside');side.className='bn-home-sidebar';side.setAttribute('aria-label','Profilo e comandi principali');
 for(const child of [...menu.children])if(child!==cards)side.append(child);
 const seat=document.createElement('div');seat.id='menuBannerSeat';seat.className='bn-menu-ad-seat';seat.setAttribute('aria-hidden','true');
 const note=side.querySelector('.footer-note');if(note)side.insertBefore(seat,note);else side.append(seat);
 menu.prepend(side);
}
function pinCanvas(){
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
  const size=Math.floor(Math.min(body.clientHeight-(under?.getBoundingClientRect().height||18)-7,body.clientWidth-326));
  if(size>0&&body.style.getPropertyValue('--bn-board-size')!==size+'px')body.style.setProperty('--bn-board-size',size+'px');
 }
 const words=$id('wordsScroll');
 if(wide&&words&&words.clientHeight){
  const size=Math.floor(Math.min(words.clientHeight-6,words.clientWidth-326));
  if(size>0&&words.style.getPropertyValue('--bn-word-size')!==size+'px')words.style.setProperty('--bn-word-size',size+'px');
 }
}
function rearrangeWords(){
 const scroll=$id('wordsScroll');if(!scroll||scroll.querySelector('.bn-words-details'))return;
 const details=document.createElement('div');details.className='bn-words-details';
 for(const id of ['wordControls','wordClues']){const node=$id(id);if(node)details.append(node);}
 scroll.append(details);
}
function installModal(){
 const app=$id('app'),overlay=$id('overlay'),dialog=overlay?.querySelector('.dialog');
 if(!app||!overlay||!dialog)return;
 const previous=new Map();let opened=false,lastFocus=null;
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 dialog.setAttribute('aria-labelledby','dialogTitle');dialog.setAttribute('aria-describedby','dialogDesc');dialog.tabIndex=-1;
 const sync=()=>{
  const active=overlay.classList.contains('on');app.dataset.modal=active?'on':'off';
  if(active){
   overlay.setAttribute('aria-hidden','false');
   if(!opened){lastFocus=document.activeElement;dialog.scrollTop=0;dialog.focus({preventScroll:true});pinCanvas();}
   for(const node of app.children){
    if(node===overlay)continue;
    if(!previous.has(node))previous.set(node,{hidden:node.getAttribute('aria-hidden'),inert:node.hasAttribute('inert')});
    node.setAttribute('aria-hidden','true');node.setAttribute('inert','');
   }
  }else{
   for(const [node,state] of previous){
    if(state.hidden===null)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden',state.hidden);
    if(!state.inert)node.removeAttribute('inert');
   }
   previous.clear();
   if(overlay.contains(document.activeElement))document.activeElement.blur();
   if(opened&&lastFocus?.isConnected&&lastFocus.getClientRects().length)lastFocus.focus({preventScroll:true});
   overlay.setAttribute('aria-hidden','true');
  }
  opened=active;
 };
 new MutationObserver(sync).observe(overlay,{attributes:true,attributeFilter:['class']});sync();
}
function composeSlot(){
 const layout=$id('slotTemple');if(!layout)return;
 const cabinet=$id('slotCabinet'),app=$id('app');
 app.dataset.slotWide=cabinet?'play':'information';
 if(!cabinet){layout.classList.add('bn-slot-information');return;}
 layout.classList.add('bn-slot-wide');if(layout.querySelector('.bn-slot-sidebar'))return;
 const hero=layout.querySelector('.bn-world-topbar'),brand=hero?.querySelector('.bn-world-brand'),wallet=$id('slotWallet'),coins=$id('slotCoinWallet');
 const sidebar=document.createElement('aside');sidebar.className='bn-slot-sidebar';sidebar.setAttribute('aria-label','Opzioni della slot');
 const deck=document.createElement('div');deck.className='bn-slot-deck';
 const character=document.createElement('div');character.className='bn-slot-character';character.setAttribute('aria-hidden','true');
 const guardian=document.createElement('img');guardian.src='assets/nexa-guardian.webp';guardian.alt='';guardian.width=1024;guardian.height=1536;guardian.draggable=false;
 const caption=document.createElement('small');caption.textContent='NEXA ODYSSEY';character.append(guardian,caption);
 const panorama=document.createElement('img');panorama.className='bn-slot-panorama';panorama.src=cabinet.querySelector('.bn-world-background').src;panorama.alt='';panorama.draggable=false;
 if(brand){brand.querySelector('small').textContent='NEXA LUCK';brand.querySelector('strong').textContent='SLOT AVVENTURA';sidebar.append(brand);}
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
   const detail=document.createElement('small');detail.textContent=slotSpinCoinCost()+' '+(slotSpinCoinCost()===1?'MONETA':'MONETE');spin.append(detail);
  }
 }
 if(spin){
  spin.setAttribute('aria-busy',String(typeof slotBusy!=='undefined'&&slotBusy));
  if(typeof slotPhase!=='undefined'&&slotPhase==='celebrating'){
   spin.disabled=false;spin.onclick=()=>finishSlotCelebration();spin.setAttribute('aria-label','Incassa la vincita');spin.setAttribute('aria-busy','false');
   const label=[...spin.childNodes].find(node=>node.nodeType===3);if(label)label.textContent='INCASSA';
   const detail=spin.querySelector('small');if(detail)detail.textContent='PREMI GIÀ SALVATI';
  }
 }
 if(spin&&!spin.classList.contains('bn-world-normal-spin')){
  const label=[...spin.childNodes].find(node=>node.nodeType===3);
  if(label){const short={'SCEGLI UN FORZIERE':'BONUS','TORNA AI RULLI':'TORNA','GIRA NELLA CAVERNA':'GIRA','CONTINUA':'AVANTI'};label.textContent=short[label.textContent]||label.textContent;if(label.textContent.length>6)spin.classList.add('bn-long-label');}
 }
 const primaryAnchor=sidebar.querySelector('.bn-world-feature')||sidebar.querySelector('.bn-world-xp');
 if(wallet)sidebar.insertBefore(wallet,primaryAnchor);
 if(coins)deck.append(coins);
 const adSeat=document.createElement('div');adSeat.id='slotBannerSeat';adSeat.className='bn-slot-ad-seat';adSeat.setAttribute('aria-hidden','true');deck.append(adSeat);
 if(result){result.querySelector('#slotCollectButton')?.remove();deck.append(result);}else{const notice=document.createElement('div');notice.className='bn-world-result';notice.setAttribute('role','status');notice.textContent='MONETE + VITE';deck.append(notice);}
 if(auto)sidebar.insertBefore(auto,primaryAnchor);if(controls)deck.append(controls);
 for(const [id,label,text] of [['slotAuto5','Avvia 5 giri automatici','AUTO 5'],['slotAuto10','Avvia 10 giri automatici','AUTO 10'],['slotAutoStop','Ferma i giri automatici','STOP AUTO']]){const node=auto?.querySelector('#'+id);if(node){node.setAttribute('aria-label',label);node.textContent=text;}}
 hero?.remove();layout.prepend(panorama,sidebar);layout.append(character,deck);
 for(const node of [...layout.children])if(node!==panorama&&node!==sidebar&&node!==cabinet&&node!==character&&node!==deck&&!node.classList.contains('bn-slot-fx-layer'))sidebar.append(node);
}
function installLayout(){
 installModal();
 if(typeof renderLifeSlot==='function'){
  let slotFocusId='',focusEpoch=0,pointerFocusPending=false;
  // Rebuilding a cabinet removes the focused native accessibility target.
  // Keep the user's control selected across the replacement and publish the
  // focus only after the new frame and modal inert state are ready.
  document.addEventListener('pointerdown',event=>{
   const slot=$id('slotTemple'),button=event.target.closest?.('button[id]');
   slotFocusId=slot&&button&&slot.contains(button)?button.id:'';pointerFocusPending=!!slotFocusId;focusEpoch++;
  },true);
  const original=renderLifeSlot;
  renderLifeSlot=function(){
   const before=$id('slotTemple'),active=document.activeElement;
   if(!pointerFocusPending&&before?.contains(active)&&active.id)slotFocusId=active.id;
   pointerFocusPending=false;
   const side=before?.querySelector('.bn-slot-sidebar'),scroll=side?.scrollTop||0;
   const result=original.apply(this,arguments);
   const current=$id('slotTemple')?.querySelector('.bn-slot-sidebar');if(current)current.scrollTop=scroll;
   if(['slotAuto5','slotAuto10'].includes(slotFocusId)&&$id('slotAutoStop'))slotFocusId='slotAutoStop';
   else if(slotFocusId==='slotAutoStop'&&!$id('slotAutoStop'))slotFocusId='slotAuto5';
   const epoch=++focusEpoch,id=slotFocusId;
   if(id)requestAnimationFrame(()=>{
    const control=$id(id);
    if(epoch!==focusEpoch||!slotVisible()||$id('overlay')?.classList.contains('on')||!control||control.disabled||control.closest('[inert]')||!control.getClientRects().length)return;
    control.focus({preventScroll:true});pinCanvas();
   });
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
  const width=Math.max(0,Math.min(320,Math.floor(r.width)));
  const inSlot=typeof slotVisible==='function'&&slotVisible();
  const inWords=typeof wordsVisible==='function'&&wordsVisible();
  const inGame=$id('game')?.style.display==='flex';
  const inMenu=$id('menu')?.style.display!=='none';
  const pending=typeof bnPendingAd!=='undefined'&&!!bnPendingAd;
  const valid=n=>Number.isFinite(n)?Math.round(n*10)/10:0;
  const homeAvailable=(!inMenu&&!inGame&&!inWords)||typeof bnBannerState==='undefined'||bnBannerState!=='unavailable';
  const fits=r.left>=-1&&r.top>=0&&r.right<=window.innerWidth+1&&r.bottom<=window.innerHeight+1;
  return {slot:inSlot&&$id('slotBannerSeat')?'slot_control_deck':inMenu?'home_sidebar':inGame?'puzzle_sidepanel':inWords?'words_sidepanel':'landscape_bottom',context:inSlot?'slot':inWords?'words':inGame?'blocks':inMenu?'home':'other',session:typeof gameSession==='number'?gameSession:0,visible:homeAvailable&&fits&&!document.hidden&&!$id('overlay')?.classList.contains('on')&&!pending&&width>=200,x:valid(r.left),y:valid(r.top),width,height:50,coordinateSpace:'css-pixels',maxHeight:50};
 };
 syncGameBanner=function(force=false){
  const dock=$id('gameBanner'),frame=$id('gameBannerFrame'),app=$id('app');if(!dock||!frame||!app)return;
  dock.hidden=false;app.dataset.banner='on';
  const inSlot=typeof slotVisible==='function'&&slotVisible();
  const inWords=typeof wordsVisible==='function'&&wordsVisible();
  const inMenu=$id('menu')?.style.display!=='none';
  if(typeof bnBannerSession!=='undefined'&&bnBannerSession!==gameSession){bnBannerSession=gameSession;bnBannerState='preview';}
  app.dataset.bannerContext=inSlot?'slot':inWords?'words':$id('game')?.style.display==='flex'?'blocks':inMenu?'home':'other';
  app.dataset.bannerState=typeof bnBannerState==='undefined'?'preview':bnBannerState;
  if(!inSlot)delete app.dataset.slotWide;
  const seat=inSlot?$id('slotBannerSeat'):inMenu?$id('menuBannerSeat'):inWords?$id('wordsBannerSeat'):$id('game')?.style.display==='flex'?$id('puzzleBannerSeat'):null;
  if(seat){const r=seat.getBoundingClientRect(),parent=app.getBoundingClientRect();Object.assign(dock.style,{top:(r.top-parent.top)+'px',left:(r.left-parent.left)+'px',right:'auto',bottom:'auto',width:r.width+'px',height:r.height+'px'});}
  else for(const prop of ['top','left','right','bottom','width','height'])dock.style.removeProperty(prop);
  const layout=gameBannerLayout();frame.style.visibility=layout.visible?'visible':'hidden';
  if(typeof bnBannerState!=='undefined'){frame.dataset.state=bnBannerState;dock.dataset.state=bnBannerState;$id('gameBannerPreview').hidden=bnBannerState==='loaded';}
  const preview=$id('gameBannerPreview');
  if(preview){const labels=preview.querySelectorAll('strong,small,span');if(labels.length>=2){labels[0].textContent=inSlot?'MONETE + VITE':'Spazio pubblicitario';labels[1].textContent=inSlot?'3: 5 ◉ + 1 ♥ · 4: 10 ◉ + 2 ♥ · 5: 25 ◉ + 5 ♥':'ANTEPRIMA BANNER';}}
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
 const homeResize=new ResizeObserver(schedule);
 for(const node of [$id('menuBannerSeat'),$id('menu')?.querySelector('.bn-home-sidebar')])if(node)homeResize.observe(node);
 $id('menu')?.querySelector('.bn-home-sidebar')?.addEventListener('scroll',schedule,{passive:true});
 $id('menu')?.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',()=>syncGameBanner(true));
 document.addEventListener('visibilitychange',schedule);
 schedule();
}
function init(){rearrangeMenu();rearrangeGame();rearrangeWords();installLayout();installBanner();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
