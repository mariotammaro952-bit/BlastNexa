// v37: drag the foreground weapon to aim; a short tap fires one shot.
function bnRushUpdateAmmo(run){
 run.ammoCount.textContent=(5-run.round.shots)+' / 5';
 [...run.ammo.children].forEach((n,i)=>n.dataset.spent=String(i<run.round.shots));
 run.ammoBox.setAttribute('aria-label',(5-run.round.shots)+' colpi rimasti');
}
// v39: cache static target geometry; pointer movement only schedules one paint.
function bnRushGeometry(run){
 if(!run.aimGeometry||run.aimDirty){
  const layer=run.layer.getBoundingClientRect(),main=run.gun.parentElement.getBoundingClientRect(),grid=run.grid.getBoundingClientRect();
  run.aimGeometry={layer,main,grid,size:run.gun.offsetWidth,coins:[...run.grid.children].map((node,i)=>({node,index:run.page*12+i,rect:node.getBoundingClientRect()}))};run.aimDirty=false;
 }return run.aimGeometry;
}
function bnRushAim(run,x,y){
 if(run.ended)return;run.aimClient={x,y};
 if(!run.aimFrame)run.aimFrame=requestAnimationFrame(()=>{run.aimFrame=0;bnRushRenderAim(run);});
}
function bnRushRenderAim(run){
 if(bnSupernovaRun!==run||run.ended||!run.aimClient)return;
 const g=bnRushGeometry(run),{layer,main,size,grid}=g;let {x,y}=run.aimClient;
 let candidate=null,distance=Infinity;
 for(const c of g.coins){const r=c.rect,d=Math.hypot((x-r.left-r.width/2)/r.width,(y-r.top-r.height/2)/r.height);if(d<distance){distance=d;candidate=c;}}
 const target=candidate&&!candidate.node.disabled&&distance<=.85?candidate:null;
 run.aimIndex=target?target.index:-1;
 // Gentle magnetic aiming inside and just around each coin, with visible feedback.
 if(target){x=target.rect.left+target.rect.width/2;y=target.rect.top+target.rect.height/2;}
 run.aimPoint={x:x-layer.left,y:y-layer.top};
 if(run.targetCoin!==target?.node){run.targetCoin?.classList.remove('sn-targeted');run.targetCoin=target?.node;run.targetCoin?.classList.add('sn-targeted');}
 const dx=(x-layer.left-layer.width*.5)*.45,dy=Math.max(-18,Math.min(18,(y-layer.top-layer.height*.36)*.12));
 const pivotX=main.left+main.width*.5+dx+size*.25,pivotY=main.bottom+34+dy;
 const angle=Math.atan2(y-pivotY,x-pivotX)*180/Math.PI-Math.atan2(-.82,-.49)*180/Math.PI;
 run.gun.style.setProperty('--gun-x',dx+'px');run.gun.style.setProperty('--gun-y',dy+'px');run.gun.style.setProperty('--aim-angle',Math.max(-55,Math.min(70,angle))+'deg');
}
function bnRushAimCoin(run,index){
 if(run.ended)return;const c=run.grid.children[index%12],r=c.getBoundingClientRect();bnRushAim(run,r.left+r.width/2,r.top+r.height/2);
}
function bnRushFire(run){
 if(run.ended||!run.ready)return false;bnRushRenderAim(run);
 const i=run.aimIndex;if(i<0||Math.floor(i/12)!==run.page||run.round.claimed.includes(i))return false;
 return bnSupernovaReveal(run,i);
}
function bnRushCoinActivate(run,index){
 if(performance.now()<run.suppressClickUntil)return;bnRushAimCoin(run,index);bnRushFire(run);
}
function bnRushGunSound(run,impact=false){
 const context=slotAudioContext(),levels=audioVolumeSettings();if(!context||muted||!levels.master||!levels.effects)return;
 // Layered transient, low report, mechanical click and short reflected tail.
 const duration=impact?.19:.48,buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<data.length;i++){const t=i/context.sampleRate,n=bnSupernovaRandom(run)*2-1;
 data[i]=impact?(Math.sin(2*Math.PI*1850*t)*.35+Math.sin(2*Math.PI*2710*t)*.18+n*.12)*Math.exp(-t*27):
 n*.55*Math.exp(-t*95)+Math.sin(2*Math.PI*(110*t-75*t*t))*.38*Math.exp(-t*19)+n*.16*Math.exp(-t*9)+(t>.065?n*.12*Math.exp(-(t-.065)*90):0)+(t>.13?n*.08*Math.exp(-(t-.13)*25):0);}
 const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=impact?.3:.7;source.connect(gain).connect(audioOutput('effects'));const entry={source,gain,shot:true};run.voices.add(entry);
 source.onended=()=>{run.voices.delete(entry);try{source.disconnect();gain.disconnect();}catch{}};source.start();
}
function bnRushShotEffect(run,index,onImpact){
 run.gun.classList.remove('sn-fired');void run.gun.offsetWidth;run.gun.classList.add('sn-fired');haptic([18]);bnRushGunSound(run);
 const layer=run.layer.getBoundingClientRect(),g=run.gun.getBoundingClientRect(),point=run.aimPoint||{x:layer.width*.5,y:layer.height*.45};
 const side=Math.min(g.width,g.height),ox=g.width*.75,oy=g.height,theta=(parseFloat(run.gun.style.getPropertyValue('--aim-angle'))||0)*Math.PI/180;
 const mx=(g.width-side)/2+side*.26-ox,my=g.height-side+side*.18-oy;
 const from={x:g.left-layer.left+ox+mx*Math.cos(theta)-my*Math.sin(theta),y:g.top-layer.top+oy+mx*Math.sin(theta)+my*Math.cos(theta)};
 const flash=uNode('i','sn-fps-flash');flash.style.left=from.x+'px';flash.style.top=from.y+'px';run.layer.append(flash);
 const bullet=uNode('i','sn-projectile');bullet.style.left=from.x+'px';bullet.style.top=from.y+'px';
 const dx=point.x-from.x,dy=point.y-from.y,angle=Math.atan2(dy,dx)*180/Math.PI;
 bullet.style.transform='rotate('+angle+'deg)';run.layer.append(bullet);
 const flight=bullet.animate([{transform:'translate(0px,0px) rotate('+angle+'deg)'},{transform:'translate('+dx+'px,'+dy+'px) rotate('+angle+'deg)'}],{duration:110,easing:'linear',fill:'forwards'});
 run.timers.push(setTimeout(()=>{flash.remove();run.gun.classList.remove('sn-fired');},90));
 run.timers.push(setTimeout(()=>{flight.cancel();bullet.remove();if(bnSupernovaRun!==run)return;
 const hit=uNode('i','sn-fps-impact');hit.style.left=point.x+'px';hit.style.top=point.y+'px';run.layer.append(hit);bnRushGunSound(run,true);onImpact();run.timers.push(setTimeout(()=>hit.remove(),280));},110));
}
function bnRushInstallRifle(run,main){
 const deck=uNode('div','sn-rifle-deck');deck.id='snRifleDeck';
 const ammoBox=uNode('div','sn-ammo-box'),ammoCount=uNode('strong','','5 / 5'),ammo=uNode('span','sn-ammo');ammoCount.id='snAmmoCount';ammo.setAttribute('aria-hidden','true');
 for(let i=0;i<5;i++)ammo.append(uNode('i',''));ammoBox.append(uNode('small','','COLPI RIMASTI'),ammoCount,ammo);
 const gun=uNode('div','sn-rifle');gun.id='snRifle';gun.setAttribute('aria-hidden','true');
 gun.innerHTML='<img src="assets/rifle-fps-v36.webp" alt="" draggable="false">';
 const pad=uNode('button','sn-aim-pad','MIRA · RILASCIA');pad.id='snAimPad';pad.type='button';pad.setAttribute('aria-label','Trascina per mirare e rilascia per sparare');
 const hint=uNode('div','sn-rifle-hint');hint.append(uNode('strong','','PUNTA E RILASCIA'),uNode('small','','Oppure tocca una moneta'));
 deck.append(ammoBox,pad,hint);main.append(deck,gun);
 Object.assign(run,{gun,pad,ammo,ammoCount,ammoBox,aimIndex:-1,aimPoint:null,aimDirty:true,suppressClickUntil:0});bnRushUpdateAmmo(run);
 const bind=(surface,relative)=>{
  const point=(e,d)=>{const b=bnRushGeometry(run).grid;
   return relative?{x:Math.max(b.left+2,Math.min(b.right-2,d.aimX+(e.clientX-d.x)*d.gainX)),y:Math.max(b.top+2,Math.min(b.bottom-2,d.aimY+(e.clientY-d.y)*d.gainY))}:{x:e.clientX,y:e.clientY};};
  surface.addEventListener('pointerdown',e=>{
   if(run.ended||!run.ready||e.isPrimary===false||e.button!==0||run.weaponDrag)return;
   e.preventDefault();const g=bnRushGeometry(run),b=g.grid;
   run.weaponDrag={id:e.pointerId,surface,x:e.clientX,y:e.clientY,aimX:run.aimClient?.x??b.left+b.width/2,aimY:run.aimClient?.y??b.top+b.height/2,gainX:b.width/Math.max(140,g.layer.width*.45),gainY:b.height/Math.max(70,g.layer.height*.3)};
   const p=point(e,run.weaponDrag);bnRushAim(run,p.x,p.y);try{surface.setPointerCapture(e.pointerId);}catch{}
  });
  surface.addEventListener('pointermove',e=>{
   const d=run.weaponDrag;if(!d||d.id!==e.pointerId||d.surface!==surface||run.ended)return;e.preventDefault();
   const latest=e.getCoalescedEvents?.().at(-1)||e,p=point(latest,d);bnRushAim(run,p.x,p.y);
  });
  surface.addEventListener('pointerup',e=>{
   const d=run.weaponDrag;if(!d||d.id!==e.pointerId||d.surface!==surface)return;e.preventDefault();
   run.weaponDrag=null;run.suppressClickUntil=performance.now()+750;
   const p=point(e,d);bnRushAim(run,p.x,p.y);bnRushFire(run);
   try{surface.releasePointerCapture(e.pointerId);}catch{}
  });
  const cancel=e=>{if(run.weaponDrag?.id===e.pointerId){run.weaponDrag=null;run.suppressClickUntil=performance.now()+750;}};
  surface.addEventListener('pointercancel',cancel);surface.addEventListener('lostpointercapture',cancel);
 };
 bind(run.grid,false);bind(pad,true);
 pad.addEventListener('click',e=>{e.preventDefault();if(performance.now()>=run.suppressClickUntil)bnRushFire(run);});
 pad.addEventListener('keydown',e=>{if(e.repeat&&(e.key==='Enter'||e.key===' '))e.preventDefault();});
 run.timers.push(setTimeout(()=>{if(bnSupernovaRun===run&&!run.ended){const b=run.grid.getBoundingClientRect();bnRushAim(run,b.left+b.width/2,b.top+b.height/2);}},0));
}
