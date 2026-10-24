/* Interactive HTML review only. This file is never loaded by the Android game. */
window.addEventListener('DOMContentLoaded',()=>{
 const finishVideo=(overlay,token,earned)=>{clearInterval(overlay.__clock);overlay.remove();document.getElementById('app').inert=false;window.BlastNexaAdResult(token,earned);};
 const video=(token,rewarded)=>{
  const overlay=document.createElement('section');overlay.id='bnDemoVideo';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Video dimostrativo');
  overlay.innerHTML='<div class="bn-demo-video-card"><small>ANTEPRIMA HTML · NESSUN ANNUNCIO REALE</small><div class="bn-demo-play">▶</div><h2>La tua prossima avventura</h2><p>'+(rewarded?'Completa il video dimostrativo e ricevi altre <b>100 monete</b>.':'Pausa dimostrativa prima di tornare ai rulli.')+'</p><div class="bn-demo-progress"><i></i></div><strong id="bnDemoCountdown">4 secondi</strong><button id="bnDemoVideoCancel" type="button">INTERROMPI</button></div>';
  document.body.append(overlay);document.getElementById('app').inert=true;let remaining=4;
  overlay.querySelector('#bnDemoVideoCancel').onclick=()=>finishVideo(overlay,token,false);overlay.querySelector('#bnDemoVideoCancel').focus();
  overlay.__clock=setInterval(()=>{remaining--;overlay.querySelector('#bnDemoCountdown').textContent=remaining>0?remaining+' secondi':'COMPLETATO';if(remaining<=0)finishVideo(overlay,token,true);},1000);
 };
 window.BlastNexaAds={rewarded:token=>video(token,true),interstitial:token=>video(token,false),bannerLayout(){}};
 window.addEventListener('message',event=>{
  if(event.source!==parent||event.data?.type!=='bn-v27-review')return;
  if(slotBusy||bnPendingAd){showToast('Attendi che il giro o il video sia terminato.');return;}
  const action=event.data.action;
  if(action==='invites'){showToast('Inviti automatici · 09:00 · 14:00 · 20:30');return;}
  if(!['win','empty','reset'].includes(action))return;
  document.getElementById('overlay').classList.remove('on');cancelSlotAnimation();openUniverse('slot');slotView='play';
  if(action==='reset'){lifeData.slot.wallet.balance=100;lifeData.slot.wallet.dailyDay=slotDayKey();saveLives();renderLifeSlot($('universeBody'));refreshLivesUI();showToast('Anteprima: saldo riportato a 100 monete');return;}
  if(action==='empty'){lifeData.slot.wallet.balance=0;saveLives();renderLifeSlot($('universeBody'));openSlotCoinRefill();return;}
  Object.assign(lifeData.slot.arcade,{machine:'temple',bonus:null,revealed:null,treasure:0,freeSpins:0,crystalJourney:null});lifeData.slot.sinceAd=0;
  if(lifeData.slot.wallet.balance<slotSpinCoinCost())lifeData.slot.wallet.balance=100;
  renderLifeSlot($('universeBody'));const random=slotRandomInt;try{slotRandomInt=()=>0;spinLifeSlot();}finally{slotRandomInt=random;}
 });
 try{localStorage.setItem('blastnexa_help_seen','true');}catch{}
 document.getElementById('overlay').classList.remove('on');openUniverse('slot');
 parent.postMessage({type:'bn-v27-ready'},'*');
});
