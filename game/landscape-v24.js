/* BlastNexa v24 · landscape UI and universal banner. Slot payouts remain unchanged. */
(()=>{
'use strict';
const $id=id=>document.getElementById(id);
function rearrangeGame(){
 const game=$id('game');if(!game||game.querySelector('.bn-wide-game'))return;
 const top=game.querySelector(':scope > .top');if(!top)return;
 const body=document.createElement('div');body.className='bn-wide-game';
 const left=document.createElement('div');left.className='bn-wide-left';
 const right=document.createElement('div');right.className='bn-wide-right';
 body.append(left,right);top.after(body);
 for(const id of ['boardShell']){const el=$id(id);if(el)left.append(el);}
 const under=game.querySelector(':scope > .under-board');if(under)left.append(under);
 for(const selector of ['.bn-play-strip','.scene-strip','#adStatus','#escapeScene','#universeGameStrip','.stats','#missionCard','#bossHud','#resultReview','.power-tools','#tray','#instruction']){
   const el=game.querySelector(':scope > '+selector);if(el)right.append(el);
 }
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
function init(){rearrangeGame();installBanner();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();