/* Presentation has no authority to draw a result, spend coins or award lives. */
'use strict';
let bnSupernovaRun=null,bnSupernovaSerial=0;
const BN_SUPERNOVA_HITS=[0,960,1920,3200,4480,5760,6800];

function bnSupernovaStopAudio(){
 const run=bnSupernovaRun;if(!run)return;
 for(const voice of run.voices){try{voice.source.stop()}catch{}try{voice.source.disconnect();voice.gain.disconnect()}catch{}}
 run.voices.clear();run.audioStopped=true;
}
function bnSupernovaCleanup(){
 const run=bnSupernovaRun;if(!run)return false;
 bnSupernovaStopAudio();if(slotMusicKey==='hype'){slotStopMusic();slotMusicOffsets.delete('hype');}bnSupernovaRun=null;bnSupernovaSerial++;
 cancelAnimationFrame(run.frame);run.timers.forEach(clearTimeout);run.observer?.disconnect();run.layer.remove();
 document.removeEventListener('keydown',run.onKey);
 for(const {node,inert,hidden}of run.background||[]){if(!inert)node.removeAttribute('inert');if(hidden===null)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden',hidden);}
 delete $('app').dataset.superBonus;
 if(run.previousFocus?.isConnected)try{run.previousFocus.focus({preventScroll:true})}catch{}
 return true;
}
function bnSupernovaFinish(){
 if(!bnSupernovaRun)return false;
 bnSupernovaCleanup();finishSlotCelebration();syncGameBanner(true);slotMediaSync();return true;
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
   const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.playbackRate.value=[1,1.055,1.11,1,1.07,1.14,1.18][i];
   const start=context.currentTime+Math.max(0,ms-elapsed)/1000;
   gain.gain.setValueAtTime(.22,start);gain.gain.setTargetAtTime(.001,start+1.35,.12);
   source.connect(gain).connect(audioOutput('effects'));const entry={source,gain};run.voices.add(entry);
   source.onended=()=>{run.voices.delete(entry);try{source.disconnect();gain.disconnect()}catch{}};
   source.start(start);source.stop(start+Math.min(1.85,buffer.duration/source.playbackRate.value));
  });
 }).catch(()=>{});
}
// The coins reveal portions of the already committed result. They never draw
// odds, spend currency, grant a second reward, or save a second transaction.
function bnSupernovaReveal(run,index){
 if(bnSupernovaRun!==run||run.revealed.has(index)||Math.floor(index/12)!==run.page)return false;
 run.revealed.add(index);const coin=run.grid.children[index%12];coin.disabled=true;coin.classList.add('revealed');
 const part=run.parts[index],labels=[];
 if(part.coins)labels.push('+'+part.coins+' ◉');if(part.lives)labels.push('+'+part.lives+' ♥');if(part.free)labels.push('+'+part.free+' GIRI');
 coin.replaceChildren(uNode('strong','',labels.join(' · ')||'✦'),uNode('small','',labels.length?'SCOPERTO':'ENERGIA NEXA'));
 coin.setAttribute('aria-label','Moneta '+(index%12+1)+': '+(labels.join(', ')||'energia Nexa'));
 for(const c of run.counters){c.collected+=part[c.key]||0;c.node.textContent='+'+c.collected.toLocaleString('it-IT');}
 const found=[...run.revealed].filter(i=>Math.floor(i/12)===run.page).length;
 run.progress.textContent=found+' / 12 MONETE';run.next.disabled=found<12;run.all.disabled=found===12;
 if(found===12){run.status.textContent=run.page===2?'Tutte le monete scoperte. Il premio è salvo.':'Pagina completata. Puoi passare alla prossima.';haptic([12,25,20]);}
 else {run.status.textContent=labels.length?'Scoperto '+labels.join(', '):'Moneta scoperta';haptic([8]);}
 slotSound('tick',index%5+1);run.lastImpact=performance.now();
 if(!run.lite)bnSupernovaBurst(run,run.lastImpact,index);
 if(!run.frame)run.frame=requestAnimationFrame(t=>bnSupernovaDraw(run,t));
 return true;
}
function bnSupernovaPage(run){
 run.grid.replaceChildren();run.next.disabled=true;run.all.disabled=false;
 run.pageLabel.textContent='PAGINA '+(run.page+1)+' / 3';run.progress.textContent='0 / 12 MONETE';
 run.next.textContent=run.page===2?'TORNA ALLA SLOT':'PAGINA SUCCESSIVA';
 for(let i=0;i<12;i++){
  const index=run.page*12+i,coin=uButton('',()=>bnSupernovaReveal(run,index),'sn-coin');coin.id='snCoin'+i;
  coin.setAttribute('aria-label','Scopri moneta '+(i+1));coin.append(uNode('strong','','✦'),uNode('small','','TOCCA'));run.grid.append(coin);
 }
}
function bnSupernovaStart(options={}){
 if(window.__BN_TEST_FAST__||!slotVisible()||document.hidden||!slotPlaybackAllowed())return false;
 bnSupernovaCleanup();clearSlotSpectacle();stopSlotSample();slotStopMusic();slotMusicOffsets.delete('hype');stopSlotAuto();
 const ownLock=!slotBusy;slotBusy=true;slotPhase='celebrating';if(ownLock&&arcadeCurrentLast())renderLifeSlot($('universeBody'));
 const layer=uNode('section','sn-collect');layer.id='bnSupernova';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-labelledby','snTitle');layer.setAttribute('aria-describedby','snInstructions');
 layer.dataset.motion=reducedFX()?'lite':'full';
 const canvas=uNode('canvas','sn-canvas');canvas.setAttribute('aria-hidden','true');layer.append(canvas);
 const top=uNode('div','sn-top'),exit=uButton('TORNA ALLA SLOT',bnSupernovaFinish,'sn-exit');exit.id='snSkip';
 top.append(uNode('span','','NEXA LUCK / SUPER BONUS'),exit);layer.append(top);
 const main=uNode('div','sn-collection'),head=uNode('div','sn-collection-head'),copy=uNode('div','');
 const title=uNode('h2','sn-title','SUPER BONUS');title.id='snTitle';const instructions=uNode('p','sn-copy','TOCCA LE MONETE E SCOPRI IL TUO PREMIO');instructions.id='snInstructions';copy.append(title,instructions);head.append(copy);
 const rewards=uNode('div','sn-rewards');rewards.id='snRewards';const counters=[];
 const coins=Math.max(0,Math.floor(Number(options.coins)||0)),lives=Math.max(0,Math.floor(Number(options.lives)||0)),free=String(options.copy||'').includes('+3')?3:0;
 for(const [key,value,label]of [['coins',coins,'MONETE VIRTUALI'],['lives',lives,'VITE EXTRA'],['free',free,'GIRI BONUS']]){
  if(!value)continue;const row=uNode('div','sn-reward'),count=uNode('strong','','+0');row.append(count,uNode('small','',label));rewards.append(row);counters.push({key,node:count,value,collected:0});
 }
 if(!counters.length)rewards.append(uNode('small','sn-copy',String(options.copy||'ENERGIA NEXA')));
 head.append(rewards);const grid=uNode('div','sn-coin-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label','Monete del super bonus');main.append(head,grid);layer.append(main);
 const bottom=uNode('div','sn-bottom'),info=uNode('div','sn-page-info'),pageLabel=uNode('strong','','PAGINA 1 / 3'),progress=uNode('small','','0 / 12 MONETE');info.append(pageLabel,progress);
 const all=uButton('SCOPRI QUESTA PAGINA',()=>{const run=bnSupernovaRun;if(run)for(let i=0;i<12;i++)bnSupernovaReveal(run,run.page*12+i);},'sn-reveal-all');all.id='snRevealAll';
 const next=uButton('PAGINA SUCCESSIVA',()=>{const run=bnSupernovaRun;if(!run||run.next.disabled)return;if(run.page===2){bnSupernovaFinish();return;}run.page++;bnSupernovaPage(run);run.grid.firstElementChild.focus({preventScroll:true});},'sn-continue');next.id='snContinue';
 const status=uNode('p','sn-live');status.setAttribute('aria-live','polite');status.setAttribute('role','status');
 bottom.append(info,all,next,uNode('small','sn-saved','PREMIO GIÀ SALVATO · MONETE VIRTUALI E VITE'));layer.append(bottom,status);
 const parts=Array.from({length:36},(_,i)=>Object.fromEntries([['coins',coins],['lives',lives],['free',free]].map(([key,total])=>[key,Math.floor(total*(i+1)/36)-Math.floor(total*i/36)])));
 const run={serial:++bnSupernovaSerial,layer,canvas,title,duration:8000,counters,started:performance.now(),voices:new Set(),timers:[],frame:0,previousFocus:document.activeElement,audioStopped:false,lite:reducedFX(),width:1,height:1,particles:[],rings:[],hit:0,seed:(Number(options.spin)||13)*971+1,collecting:true,parts,revealed:new Set(),page:0,grid,pageLabel,progress,next,all,status,lastImpact:0,background:[]};
 run.onKey=event=>{
  if(event.key==='Escape'){event.preventDefault();bnSupernovaFinish();return;}
  if(event.key==='Tab'){
   const buttons=[...layer.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
 };
 bnSupernovaRun=run;document.addEventListener('keydown',run.onKey);$('app').append(layer);$('app').dataset.superBonus='on';
 for(const node of $('app').children)if(node!==layer){run.background.push({node,inert:node.hasAttribute('inert'),hidden:node.getAttribute('aria-hidden')});node.setAttribute('inert','');node.setAttribute('aria-hidden','true');}
 bnSupernovaPage(run);
 const size=()=>{const rect=layer.getBoundingClientRect(),dpr=Math.min(1.5,devicePixelRatio||1);run.width=Math.max(1,rect.width);run.height=Math.max(1,rect.height);canvas.width=Math.round(run.width*dpr);canvas.height=Math.round(run.height*dpr);run.context=canvas.getContext('2d',{alpha:true});run.context?.setTransform(dpr,0,0,dpr,0,0);if(!run.frame)run.frame=requestAnimationFrame(t=>bnSupernovaDraw(run,t));};
 size();if(typeof ResizeObserver==='function'){run.observer=new ResizeObserver(size);run.observer.observe(layer);}
 grid.firstElementChild.focus({preventScroll:true});syncGameBanner(true);slotMediaSync();bnSupernovaAudio(run);
 return true;
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
 if(!slotVisible()||document.hidden){bnSupernovaCleanup();return;}
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

