// Original arcade rifle: aim while pressing, one shot on release. Never auto-fire.
function bnRushUpdateAmmo(run){
 run.ammoCount.textContent=(5-run.round.shots)+' / 5';
 [...run.ammo.children].forEach((n,i)=>n.dataset.spent=String(i<run.round.shots));
 run.ammoBox.setAttribute('aria-label',(5-run.round.shots)+' colpi rimasti');
}
// v36: aiming never fires. The weapon's native click is the only trigger.
function bnRushAim(run,x,y){
 if(run.ended)return;const r=run.layer.getBoundingClientRect();
 run.aimPoint={x:x-r.left,y:y-r.top};
 run.crosshair.style.left=run.aimPoint.x+'px';run.crosshair.style.top=run.aimPoint.y+'px';run.crosshair.hidden=false;
 const coin=document.elementFromPoint(x,y)?.closest('.sn-coin');
 run.aimIndex=coin&&run.grid.contains(coin)&&!coin.disabled?run.page*12+Number(coin.id.slice(6)):-1;
 for(const n of run.grid.children)n.classList.toggle('sn-targeted',n===coin&&!n.disabled);
 run.gun.style.setProperty('--aim-angle',Math.max(-8,Math.min(8,(x-r.left-r.width/2)/r.width*16))+'deg');
}
function bnRushAimCoin(run,index){
 if(run.ended)return;const c=run.grid.children[index%12],r=c.getBoundingClientRect();bnRushAim(run,r.left+r.width/2,r.top+r.height/2);
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
 const gun=uNode('button','sn-rifle');gun.type='button';gun.id='snRifle';gun.setAttribute('aria-label','Spara con il fucile alla moneta mirata');
 gun.innerHTML='<img src="assets/rifle-fps-v36.webp" alt="" draggable="false"><span>TOCCA L’ARMA · SPARA</span>';
 const hint=uNode('div','sn-rifle-hint');hint.append(uNode('strong','','1. MIRA ALLA MONETA'),uNode('small','','2. Tocca l’arma per sparare · Un tocco, un colpo'));
 deck.append(ammoBox,hint);main.append(deck);main.append(gun);
 const crosshair=uNode('span','sn-crosshair');crosshair.id='snCrosshair';crosshair.hidden=true;crosshair.setAttribute('aria-hidden','true');run.layer.append(crosshair);
 Object.assign(run,{gun,crosshair,ammo,ammoCount,ammoBox,aimPointer:null,aimIndex:-1,aimPoint:null});bnRushUpdateAmmo(run);
 gun.addEventListener('click',()=>{if(run.ended)return;const i=run.aimIndex;bnSupernovaReveal(run,i>=0&&Math.floor(i/12)===run.page&&!run.round.claimed.includes(i)?i:-1);});
 gun.addEventListener('keydown',e=>{if(e.repeat&&(e.key==='Enter'||e.key===' '))e.preventDefault();});
 run.grid.addEventListener('pointerdown',e=>{if(run.ended||e.isPrimary===false||e.button!==0)return;run.aimPointer=e.pointerId;bnRushAim(run,e.clientX,e.clientY);});
 run.grid.addEventListener('pointermove',e=>{if(e.isPrimary!==false&&(run.aimPointer===e.pointerId||e.pointerType==='mouse'))bnRushAim(run,e.clientX,e.clientY);});
 run.grid.addEventListener('pointerup',e=>{if(run.aimPointer===e.pointerId){run.aimPointer=null;bnRushAim(run,e.clientX,e.clientY);}});
 run.grid.addEventListener('pointercancel',()=>{run.aimPointer=null;});
}
