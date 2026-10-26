'use strict';
let bnSupernovaRun=null,bnSupernovaSerial=0;
const BN_SUPERNOVA_HITS=[0,850,1700,2600,3500,4300];
function bnSupernovaStopAudio(keepShots=false){
 const run=bnSupernovaRun;if(!run)return;for(const voice of run.voices){if(keepShots&&voice.shot)continue;try{voice.source.stop()}catch{}try{voice.source.disconnect();voice.gain.disconnect()}catch{}run.voices.delete(voice);}run.audioStopped=true;
}
function bnSupernovaCleanup(){
 const run=bnSupernovaRun;if(!run)return false;
 coinRushEnd(run.round.id,'exit');bnSupernovaStopAudio();if(slotMusicKey==='hype'){slotStopMusic();slotMusicOffsets.delete('hype');}bnSupernovaRun=null;bnSupernovaSerial++;
 clearTimeout(run.clock);cancelAnimationFrame(run.frame);run.timers.forEach(clearTimeout);run.observer?.disconnect();run.layer.remove();document.removeEventListener('keydown',run.onKey);
 for(const {node,inert,hidden}of run.background){if(!inert)node.removeAttribute('inert');if(hidden===null)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden',hidden);}
 delete $('app').dataset.superBonus;if(run.previousFocus?.isConnected)try{run.previousFocus.focus({preventScroll:true})}catch{}return true;
}
function bnSupernovaFinish(){if(!bnSupernovaRun)return false;bnSupernovaCleanup();finishSlotCelebration();syncGameBanner(true);slotMediaSync();return true;}
function bnRushUpdateCounters(run){for(const c of run.counters)c.node.textContent='+'+run.round.collected[c.key].toLocaleString('it-IT');}
function bnRushPaintCoin(run,index,coin){
 const prize=run.parts[index],amount=run.round.receipts[index]||0,major=prize.kind==='coins'&&amount>=200||prize.kind==='respins'&&amount===2||prize.kind==='lives'&&amount>=3;
 coin.disabled=true;coin.classList.add('revealed');coin.dataset.prize=major?'major':'regular';
 const value=prize.kind==='respins'?'↻ ×'+amount:'+'+amount;
 const type=amount===0?'SALDO MASSIMO':prize.kind==='coins'?'MONETE':prize.kind==='lives'?'VITE':'RILANCI GRATIS';
 coin.replaceChildren(uNode('strong','sn-coin-value',value),uNode('small','',type));coin.setAttribute('aria-label',value+' '+type);
}
function bnSupernovaReveal(run,index){
 if(bnSupernovaRun!==run||run.ended||(index!==-1&&Math.floor(index/12)!==run.page))return false;
 if(performance.now()>=run.monoEnd){bnRushComplete(run,'time');return false;}
 const prize=coinRushClaim(run.round.id,index);if(!prize){if(run.round.state==='closed')bnRushComplete(run,run.round.reason);return false;}
 bnRushShotEffect(run);bnRushUpdateAmmo(run);
 if(prize.kind!=='miss'){bnRushPaintCoin(run,index,run.grid.children[index%12]);bnRushUpdateCounters(run);}
 run.progress.textContent=run.round.claimed.length+' PREMI · '+run.round.shots+' / 5 COLPI';
 const type=prize.kind==='coins'?' monete':prize.kind==='lives'?' vite':' rilanci gratis';run.status.textContent=prize.kind==='miss'?'COLPO A VUOTO':'+'+prize.credited+type;
 run.lastImpact=performance.now();if(!run.lite)bnSupernovaBurst(run,run.lastImpact,index<0?0:index);if(!run.frame)run.frame=requestAnimationFrame(t=>bnSupernovaDraw(run,t));
 if(run.round.shots===5)bnRushComplete(run,'ammo');return true;
}
function bnSupernovaPage(run){
 run.grid.replaceChildren();run.pageLabel.textContent='PAGINA '+(run.page+1)+' / 3';run.prev.disabled=run.page===0||run.ended;run.next.disabled=run.page===2||run.ended;
 for(let i=0;i<12;i++){const index=run.page*12+i,coin=uButton('',()=>bnSupernovaReveal(run,index),'sn-coin');coin.id='snCoin'+i;coin.setAttribute('aria-label','Spara alla moneta '+(i+1));coin.append(uNode('strong','','✦'),uNode('small','','MIRA'));if(run.round.claimed.includes(index))bnRushPaintCoin(run,index,coin);if(run.ended)coin.disabled=true;run.grid.append(coin);}
}
function bnRushComplete(run,reason){
 if(bnSupernovaRun!==run||run.ended)return;run.ended=true;clearTimeout(run.clock);coinRushEnd(run.round.id,reason);bnSupernovaStopAudio(true);slotStopMusic();
 cancelAnimationFrame(run.frame);run.frame=0;run.layer.dataset.state='finished';if(reason==='time')run.timerValue.textContent='0,0';run.timer.setAttribute('aria-label',reason==='ammo'?'Cinque colpi esauriti':'Tempo scaduto');run.prev.disabled=run.next.disabled=true;for(const coin of run.grid.children)coin.disabled=true;
 const summary=uNode('section','sn-rush-summary');summary.id='snSummary';summary.setAttribute('role','status');summary.append(uNode('small','',reason==='ammo'?'COLPI ESAURITI':'TEMPO SCADUTO'),uNode('h2','',run.round.claimed.length+(run.round.claimed.length===1?' PREMIO COLPITO':' PREMI COLPITI')));
 const totals=uNode('div','sn-summary-prizes');for(const [key,label]of [['coins','MONETE'],['lives','VITE'],['respins','RILANCI GRATIS']]){const item=uNode('div','');item.append(uNode('strong','','+'+run.round.collected[key]),uNode('small','',label));totals.append(item);}summary.append(totals,uNode('p','','I premi raccolti sono tuoi. I rilanci gratis ti aspettano nella Forgia.'));
 const close=uButton('TORNA ALLA SLOT',bnSupernovaFinish,'sn-continue');close.id='snContinue';summary.append(close);run.layer.append(summary);close.focus({preventScroll:true});
}
function bnRushClock(run){
 if(bnSupernovaRun!==run||run.ended)return;
 const left=Math.max(0,Math.min(run.round.endsAt-Date.now(),run.monoEnd-performance.now()));run.remaining=left;run.timerValue.textContent=(Math.ceil(left/100)/10).toFixed(1).replace('.',',');run.timer.style.setProperty('--rush-left',String(left/5000));run.layer.dataset.urgent=String(left<=2000);
 const second=Math.ceil(left/1000);if(second<=3&&second>0&&second!==run.tickSecond){run.tickSecond=second;slotSound('tick',4-second);haptic([12]);}
 if(left<=0){bnRushComplete(run,'time');return;}run.clock=setTimeout(()=>bnRushClock(run),Math.min(100,left));
}
function bnSupernovaStart(options={}){
 if(window.__BN_TEST_FAST__||bnSupernovaRun||!slotVisible()||document.hidden||!slotPlaybackAllowed())return false;
 const key=options.key||'spin:'+lifeData.slot.last?.spin,round=coinRushBegin(key);if(!round)return false;
 clearSlotSpectacle();stopSlotSample();slotStopMusic();slotMusicOffsets.delete('hype');stopSlotAuto();const ownLock=!slotBusy;slotBusy=true;slotPhase='celebrating';if(ownLock&&arcadeCurrentLast())renderLifeSlot($('universeBody'));
 const layer=uNode('section','sn-collect sn-rush');layer.id='bnSupernova';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-labelledby','snTitle');layer.dataset.motion=reducedFX()?'lite':'full';
 const canvas=uNode('canvas','sn-canvas');canvas.setAttribute('aria-hidden','true');layer.append(canvas);
 const top=uNode('div','sn-top'),exit=uButton('ESCI DAL BONUS',bnSupernovaFinish,'sn-exit');exit.id='snSkip';top.append(uNode('span','','BLASTNEXTA / BONUS MONETE'),exit);layer.append(top);
 const main=uNode('div','sn-collection'),head=uNode('div','sn-collection-head'),copy=uNode('div',''),title=uNode('h2','sn-title','MIRA E SPARA!');title.id='snTitle';copy.append(title,uNode('p','sn-copy','5 SECONDI · 5 COLPI · UN PREMIO PER COLPO'));
 const timer=uNode('div','sn-rush-clock');timer.id='snHourglass';timer.setAttribute('role','timer');timer.setAttribute('aria-live','off');timer.innerHTML='<svg viewBox="0 0 40 60" aria-hidden="true"><path d="M6 4h28M6 56h28M9 6c0 13 1 15 11 24C10 39 9 41 9 54h22c0-13-1-15-11-24C30 21 31 19 31 6Z" fill="none" stroke="currentColor" stroke-width="3"/><path class="rush-sand-top" d="M12 10h16c-1 8-4 11-8 15-4-4-7-7-8-15"/><path class="rush-sand-bottom" d="m12 51 8-11 8 11Z"/><path class="rush-sand-stream" d="M20 29v12" stroke="currentColor" stroke-width="2"/></svg>';
 const timeText=uNode('div',''),timerValue=uNode('strong','','5,0');timerValue.id='snTimer';timeText.append(timerValue,uNode('small','','SECONDI'));timer.append(timeText);head.append(copy,timer);
 const rewards=uNode('div','sn-rewards'),counters=[];rewards.id='snRewards';for(const [key,label]of [['coins','MONETE'],['lives','VITE'],['respins','RILANCI GRATIS']]){const row=uNode('div','sn-reward'),count=uNode('strong','','+0');row.append(count,uNode('small','',label));rewards.append(row);counters.push({key,node:count});}head.append(rewards);
 const grid=uNode('div','sn-coin-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label','Bersagli: mira e rilascia per sparare, massimo cinque colpi in cinque secondi');main.append(head,grid);layer.append(main);
 const bottom=uNode('div','sn-bottom'),info=uNode('div','sn-page-info'),pageLabel=uNode('strong','','PAGINA 1 / 3'),progress=uNode('small','','0 PREMI · 0 / 5 COLPI');info.append(pageLabel,progress);
 const prev=uButton('‹ PAGINA',()=>{const run=bnSupernovaRun;if(run&&!run.ended&&run.page>0){run.page--;bnSupernovaPage(run);}},'sn-rush-nav');prev.id='snPrev';const next=uButton('PAGINA ›',()=>{const run=bnSupernovaRun;if(run&&!run.ended&&run.page<2){run.page++;bnSupernovaPage(run);}},'sn-rush-nav');next.id='snNext';
 const status=uNode('p','sn-live');status.setAttribute('aria-live','polite');bottom.append(prev,info,next,uNode('small','sn-saved','200 / 300 MONETE · VITE · RILANCIA ×1 / ×2'));layer.append(bottom,status);
 const now=performance.now(),run={serial:++bnSupernovaSerial,round,monoEnd:now+5000,ended:false,layer,canvas,title,timer,timerValue,counters,started:now,duration:5000,voices:new Set(),timers:[],frame:0,clock:0,previousFocus:document.activeElement,audioStopped:false,lite:reducedFX(),width:1,height:1,particles:[],rings:[],hit:0,seed:round.seed,collecting:true,parts:coinRushPrizes(round.seed),page:0,grid,pageLabel,progress,next,prev,status,lastImpact:0,background:[]};
 run.onKey=event=>{if(event.key==='Escape'){event.preventDefault();bnSupernovaFinish();return;}if(event.key==='Tab'){const buttons=[...layer.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};
 bnSupernovaRun=run;document.addEventListener('keydown',run.onKey);$('app').append(layer);$('app').dataset.superBonus='on';for(const node of $('app').children)if(node!==layer){run.background.push({node,inert:node.hasAttribute('inert'),hidden:node.getAttribute('aria-hidden')});node.setAttribute('inert','');node.setAttribute('aria-hidden','true');}
 bnRushInstallRifle(run,main);bnSupernovaPage(run);
 const size=()=>{const cell=grid.getBoundingClientRect(),style=getComputedStyle(grid),cols=style.gridTemplateColumns.split(' ').length,rows=12/cols,px=name=>parseFloat(style[name])||0;const diameter=Math.max(44,Math.floor(Math.min(125,(cell.width-px('paddingLeft')-px('paddingRight')-px('borderLeftWidth')-px('borderRightWidth')-px('columnGap')*(cols-1))/cols,(cell.height-px('paddingTop')-px('paddingBottom')-px('borderTopWidth')-px('borderBottomWidth')-px('rowGap')*(rows-1))/rows)-3));grid.style.setProperty('--sn-coin-size',diameter+'px');const rect=layer.getBoundingClientRect(),dpr=Math.min(1.5,devicePixelRatio||1);run.width=Math.max(1,rect.width);run.height=Math.max(1,rect.height);canvas.width=Math.round(run.width*dpr);canvas.height=Math.round(run.height*dpr);run.context=canvas.getContext('2d',{alpha:true});run.context?.setTransform(dpr,0,0,dpr,0,0);if(!run.frame&&!run.ended)run.frame=requestAnimationFrame(t=>bnSupernovaDraw(run,t));};
 size();if(typeof ResizeObserver==='function'){run.observer=new ResizeObserver(size);run.observer.observe(layer);run.observer.observe(grid);}grid.firstElementChild.focus({preventScroll:true});syncGameBanner(true);slotMediaSync();bnSupernovaAudio(run);bnRushClock(run);return true;
}

function bnSupernovaAudio(run){
 const context=slotAudioContext(),levels=audioVolumeSettings();
 if(!context||muted||!levels.master||!levels.effects)return;
 const serial=run.serial,session=gameSession;
 slotLoadAudio('bonus').then(buffer=>{
  if(!buffer||bnSupernovaRun!==run||serial!==run.serial||session!==gameSession||run.audioStopped||!slotPlaybackAllowed()||muted)return;
  // Schedule against the same clock as the visual impacts; late decoding
  // skips elapsed hits instead of piling all of them onto the next frame.
  const elapsed=performance.now()-run.started;
  BN_SUPERNOVA_HITS.forEach((ms,i)=>{
   if(ms<elapsed-140||ms>=run.duration)return;
   const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.playbackRate.value=[1,1.055,1.11,1,1.07,1.14,1.18,1.2,1.25][i];
   const start=context.currentTime+Math.max(0,ms-elapsed)/1000;
   gain.gain.setValueAtTime(.22,start);gain.gain.setTargetAtTime(.001,start+1.35,.12);
   source.connect(gain).connect(audioOutput('effects'));const entry={source,gain};run.voices.add(entry);
   source.onended=()=>{run.voices.delete(entry);try{source.disconnect();gain.disconnect()}catch{}};
   source.start(start);source.stop(start+Math.min(1.85,buffer.duration/source.playbackRate.value));
  });
 }).catch(()=>{});
}

function bnSupernovaRandom(run){run.seed=(Math.imul(run.seed,1664525)+1013904223)>>>0;return run.seed/4294967296;}
function bnSupernovaBurst(run,now,index){
 const palette=['#61ffe5','#fd65df','#90a1ff','#ffe59d','#72d8ff','#c3ff81'];
 run.rings.push({born:now,hue:palette[index%6]});
 const amount=run.width<700?30:46;
 for(let i=0;i<amount;i++){
  const a=bnSupernovaRandom(run)*Math.PI*2,speed=70+bnSupernovaRandom(run)*300;
  run.particles.push({a,speed,born:now,life:1000+bnSupernovaRandom(run)*1500,color:palette[(i+index)%6],size:1+bnSupernovaRandom(run)*2.7});
 }
 // Bound both effects even if a frame stalls and catches up several impacts.
 if(run.particles.length>220)run.particles.splice(0,run.particles.length-220);
 if(run.rings.length>8)run.rings.splice(0,run.rings.length-8);
 run.title.classList.remove('sn-hit');void run.title.offsetWidth;run.title.classList.add('sn-hit');
}
function bnSupernovaDraw(run,now){
 if(bnSupernovaRun!==run)return;run.frame=0;
 if(!slotVisible()||document.hidden){bnSupernovaFinish();return;}
 const t=now-run.started,progress=Math.min(1,t/Math.min(5800,run.duration*.8));
 if(!run.collecting)for(const counter of run.counters)counter.node.textContent='+'+Math.floor(counter.value*(1-Math.pow(1-progress,3))).toLocaleString('it-IT');
 const ctx=run.context,w=run.width,h=run.height,cx=w*.5,cy=h*.49;
 if(ctx){
  ctx.clearRect(0,0,w,h);
  if(!run.lite){
   while(run.hit<BN_SUPERNOVA_HITS.length&&t>=BN_SUPERNOVA_HITS[run.hit]){bnSupernovaBurst(run,run.started+BN_SUPERNOVA_HITS[run.hit],run.hit);run.hit++;}
   ctx.save();ctx.globalCompositeOperation='lighter';
   // Distant stars remain quiet; the larger star tails are animated comets.
   for(let i=0;i<64;i++){const x=((i*137.508+31)%997)/997*w,y=((i*291.73+27)%631)/631*h;ctx.fillStyle=i%3?'#a7d8ff':'#ffc8f2';ctx.globalAlpha=.22+.17*Math.sin(t*.001+i);ctx.fillRect(x,y,i%5===0?2:1,i%5===0?2:1);}
   ctx.globalAlpha=1;
   for(let i=0;i<12;i++){
    const a=i*Math.PI/6+t*.00009,r=Math.hypot(w,h)*.65,gradient=ctx.createLinearGradient(cx,cy,cx+Math.cos(a)*r,cy+Math.sin(a)*r);
    gradient.addColorStop(0,'#b363f500');gradient.addColorStop(.35,i%2?'#bd55ed35':'#4ee8d52b');gradient.addColorStop(1,'#81dfff00');
    ctx.strokeStyle=gradient;ctx.lineWidth=2+i%3*2;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*40,cy+Math.sin(a)*40);ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.stroke();
   }
   // A spiral stream crosses the whole display. Each head carries a long,
   // colored tail, avoiding heavy DOM nodes and expensive per-particle blur.
   for(let i=0;i<14;i++){
    const cycle=(t/2200+i*.137)%1,a=i*2.39996+t*.00016,rad=(1-cycle)*Math.max(w,h)*.7+30;
    const x=cx+Math.cos(a)*rad,y=cy+Math.sin(a)*rad*.6,tail=24+cycle*55,color=['#64ffe3','#ff69dd','#a0a0ff','#ffe19c'][i%4];
    const tx=x+Math.cos(a)*tail,ty=y+Math.sin(a)*tail*.6,g=ctx.createLinearGradient(x,y,tx,ty);g.addColorStop(0,color);g.addColorStop(1,color+'00');
    ctx.strokeStyle=g;ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(x,y);ctx.stroke();
    ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(x,y,1.8,0,Math.PI*2);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke();
   }
   run.rings=run.rings.filter(r=>now-r.born<1700);
   for(const ring of run.rings){const p=(now-ring.born)/1700,r=22+p*Math.max(w,h)*.55;ctx.globalAlpha=(1-p)*.7;ctx.strokeStyle=ring.hue;ctx.lineWidth=2.2*(1-p)+.4;ctx.beginPath();ctx.ellipse(cx,cy,r,r*.68,0,0,Math.PI*2);ctx.stroke();}
   ctx.globalAlpha=1;run.particles=run.particles.filter(p=>now-p.born<p.life);
   for(const particle of run.particles){const age=(now-particle.born)/1000,p=age*1000/particle.life,r=age*particle.speed;const x=cx+Math.cos(particle.a)*r,y=cy+Math.sin(particle.a)*r*.68+age*age*15;ctx.globalAlpha=(1-p)*.85;ctx.fillStyle=particle.color;ctx.beginPath();ctx.arc(x,y,particle.size*(1-p*.5),0,Math.PI*2);ctx.fill();}
   // One short, translucent wash per impact, never a rapid strobe.
   const last=run.hit?run.started+BN_SUPERNOVA_HITS[run.hit-1]:0,flashAge=now-last;
   if(last&&flashAge<180){ctx.globalAlpha=.12*(1-flashAge/180);ctx.fillStyle='#b8faff';ctx.fillRect(0,0,w,h);}
   ctx.restore();
  }else{
   ctx.fillStyle='#bbf8e340';for(let i=0;i<35;i++)ctx.fillRect(((i*137)%797)/797*w,((i*73)%431)/431*h,2,2);
  }
 }
 if(t<run.duration||now-run.lastImpact<1800)run.frame=requestAnimationFrame(time=>bnSupernovaDraw(run,time));
}

// Prime the short horn cue after an actual gesture; the song still obeys
// existing master/music controls and the browser's gesture requirements.
document.addEventListener('pointerdown',()=>{if(slotVisible()&&!muted){slotLoadAudio('bonus');if(slotMusicAllowed())slotLoadAudio('hype');}},{passive:true});
window.addEventListener('blur',()=>{if(bnSupernovaRun)bnSupernovaFinish()});


