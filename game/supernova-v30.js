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
function bnSupernovaStart(options={}){
 if(window.__BN_TEST_FAST__||!slotVisible()||document.hidden||!slotPlaybackAllowed())return false;
 bnSupernovaCleanup();clearSlotSpectacle();stopSlotSample();slotStopMusic();slotMusicOffsets.delete('hype');
 // A bonus can arrive without a line win. Lock that presentation too, and
 // use the same finish path as a normal saved win.
 const ownLock=!slotBusy;
 slotBusy=true;slotPhase='celebrating';if(ownLock&&arcadeCurrentLast())renderLifeSlot($('universeBody'));
 const layer=uNode('section','');layer.id='bnSupernova';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-labelledby','snTitle');layer.setAttribute('aria-describedby','snRewards');
 const duration=Math.max(1200,Math.min(10000,Number(options.duration)||8000));layer.style.setProperty('--sn-duration',duration+'ms');layer.dataset.motion=reducedFX()?'lite':'full';
 const canvas=uNode('canvas','sn-canvas');canvas.setAttribute('aria-hidden','true');layer.append(canvas);
 const top=uNode('div','sn-top');top.append(uNode('span','','BLASTNEXA / NEXA LUCK'),uNode('span','','S U P E R N O V A'));layer.append(top);
 for(const cls of ['sn-orbit','sn-orbit sn-orbit-two']){const orbit=uNode('i',cls);orbit.setAttribute('aria-hidden','true');layer.append(orbit);}
 const core=uNode('div','sn-core');core.append(uNode('small','sn-eyebrow','NEXA ENERGY · MAXIMUM'));
 const title=uNode('h2','sn-title',options.title||'MEGA BONUS');title.id='snTitle';
 const copy=uNode('p','sn-copy',options.copy||'ESPLOSIONE DI ENERGIA');core.append(title,copy);
 const rewards=uNode('div','sn-rewards');rewards.id='snRewards';rewards.setAttribute('aria-live','off');
 const coins=Math.max(0,Math.floor(Number(options.coins)||0)),lives=Math.max(0,Math.floor(Number(options.lives)||0)),counters=[];
 for(const [icon,value,label,cls]of [['◉',coins,'MONETE\nVIRTUALI','sn-coins'],['♥',lives,'VITE\nEXTRA','sn-lives']]){
  if(!value)continue;const row=uNode('div','sn-reward '+cls),count=uNode('strong','','+0');row.append(uNode('i','',icon),count,uNode('small','',label));rewards.append(row);counters.push({node:count,value});
 }
 if(!counters.length){const row=uNode('div','sn-reward sn-free');row.append(uNode('i','','✦'),uNode('strong','',options.copy?.includes('+3')?'+3':'✦'),uNode('small','',options.copy?.includes('+3')?'GIRI\nBONUS':'NUOVO\nBONUS'));rewards.append(row);}
 core.append(rewards);layer.append(core);
 const bottom=uNode('div','sn-bottom'),button=uButton('CONTINUA',bnSupernovaFinish,'sn-continue');button.id='snContinue';
 bottom.append(button,uNode('small','sn-saved','PREMI SALVATI · SOLO MONETE VIRTUALI E VITE'));layer.append(bottom,uNode('div','sn-timeline'));
 const run={serial:++bnSupernovaSerial,layer,canvas,title,duration,counters,started:performance.now(),voices:new Set(),timers:[],frame:0,previousFocus:document.activeElement,audioStopped:false,lite:reducedFX(),width:1,height:1,particles:[],rings:[],hit:0,seed:(Number(options.spin)||13)*971+1};
 run.onKey=event=>{
  if(event.key==='Escape'){event.preventDefault();bnSupernovaFinish();}
  if(event.key==='Tab'){event.preventDefault();button.focus({preventScroll:true});}
 };
 bnSupernovaRun=run;document.addEventListener('keydown',run.onKey);$('app').append(layer);
 const size=()=>{const rect=layer.getBoundingClientRect(),dpr=Math.min(1.5,devicePixelRatio||1);run.width=Math.max(1,rect.width);run.height=Math.max(1,rect.height);canvas.width=Math.round(run.width*dpr);canvas.height=Math.round(run.height*dpr);run.context=canvas.getContext('2d',{alpha:true});run.context?.setTransform(dpr,0,0,dpr,0,0);};
 size();if(typeof ResizeObserver==='function'){run.observer=new ResizeObserver(size);run.observer.observe(layer);}
 button.focus({preventScroll:true});syncGameBanner(true);slotMediaSync();
 bnSupernovaAudio(run);bnSupernovaDraw(run,run.started);
 run.timers.push(setTimeout(()=>{if(bnSupernovaRun===run)bnSupernovaFinish()},duration));return true;
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
 if(bnSupernovaRun!==run)return;
 if(!slotVisible()||document.hidden){bnSupernovaCleanup();return;}
 const t=now-run.started,progress=Math.min(1,t/Math.min(5800,run.duration*.8));
 for(const counter of run.counters)counter.node.textContent='+'+Math.floor(counter.value*(1-Math.pow(1-progress,3))).toLocaleString('it-IT');
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
 run.frame=requestAnimationFrame(time=>bnSupernovaDraw(run,time));
}

// Prime the short horn cue after an actual gesture; the song still obeys
// existing master/music controls and the browser's gesture requirements.
document.addEventListener('pointerdown',()=>{if(slotVisible()&&!muted){slotLoadAudio('bonus');if(slotMusicAllowed())slotLoadAudio('hype');}},{passive:true});
window.addEventListener('blur',()=>{if(bnSupernovaRun)bnSupernovaFinish()});
