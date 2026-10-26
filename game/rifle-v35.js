// Original arcade rifle: aim while pressing, one shot on release. Never auto-fire.
function bnRushUpdateAmmo(run){
 run.ammoCount.textContent=(5-run.round.shots)+' / 5';
 [...run.ammo.children].forEach((n,i)=>n.dataset.spent=String(i<run.round.shots));
 run.ammoBox.setAttribute('aria-label',(5-run.round.shots)+' colpi rimasti');
}
function bnRushAim(run,x,y){
 if(run.ended)return;const r=run.layer.getBoundingClientRect(),g=run.gun.getBoundingClientRect();
 run.crosshair.style.left=(x-r.left)+'px';run.crosshair.style.top=(y-r.top)+'px';run.crosshair.hidden=false;
 const angle=Math.max(-62,Math.min(62,Math.atan2(x-(g.left+g.width/2),Math.max(20,g.bottom-y))*180/Math.PI));
 run.gun.style.setProperty('--aim-angle',angle+'deg');
}
function bnRushShotEffect(run){
 run.gun.classList.remove('sn-fired');run.crosshair.classList.remove('sn-shot');void run.gun.offsetWidth;run.gun.classList.add('sn-fired');run.crosshair.classList.add('sn-shot');
 run.timers.push(setTimeout(()=>{if(bnSupernovaRun===run){run.gun.classList.remove('sn-fired');run.crosshair.classList.remove('sn-shot');}},150));
 haptic([18]);
 const context=slotAudioContext(),levels=audioVolumeSettings();if(!context||muted||!levels.master||!levels.effects)return;
 const buffer=context.createBuffer(1,Math.floor(context.sampleRate*.12),context.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<data.length;i++){const t=i/context.sampleRate;data[i]=((bnSupernovaRandom(run)*2-1)*.55+Math.sin(t*2*Math.PI*(135-420*t))*.45)*Math.exp(-t*45);}
 const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=.48;source.connect(gain).connect(audioOutput('effects'));const entry={source,gain,shot:true};run.voices.add(entry);
 source.onended=()=>{run.voices.delete(entry);try{source.disconnect();gain.disconnect();}catch{}};source.start();
}
function bnRushInstallRifle(run,main){
 const deck=uNode('div','sn-rifle-deck');deck.id='snRifleDeck';
 const ammoBox=uNode('div','sn-ammo-box'),ammoCount=uNode('strong','','5 / 5'),ammo=uNode('span','sn-ammo');ammoCount.id='snAmmoCount';ammo.setAttribute('aria-hidden','true');
 for(let i=0;i<5;i++)ammo.append(uNode('i',''));ammoBox.append(uNode('small','','COLPI RIMASTI'),ammoCount,ammo);
 const gun=uNode('div','sn-rifle');gun.id='snRifle';gun.setAttribute('aria-hidden','true');
 gun.innerHTML='<svg viewBox="0 0 160 160"><defs><linearGradient id="snGunSteel" x2="1" y2="1"><stop stop-color="#b9dbed"/><stop offset=".35" stop-color="#34495e"/><stop offset=".7" stop-color="#0a1728"/><stop offset="1" stop-color="#5c8b9f"/></linearGradient><linearGradient id="snGunWood" x2="1" y2="1"><stop stop-color="#cd8c43"/><stop offset="1" stop-color="#533025"/></linearGradient></defs><path class="sn-muzzle" d="m80 0 5 15 14-8-8 15 14 6-18 3-7 15-6-16-17 4 13-14-8-12 15 8Z" fill="#fff2a3"/><path d="M74 15h12v70H74Z" fill="url(#snGunSteel)" stroke="#86cad8" stroke-width="2"/><path d="M70 36h20v46H70Z" fill="url(#snGunWood)" stroke="#e9bf72"/><path d="M66 77h29l9 45-15 18H68l-8-30Z" fill="url(#snGunSteel)" stroke="#8fc7cf" stroke-width="2"/><path d="M80 113h15l5 18H86Z" fill="none" stroke="#e6b873" stroke-width="4"/><path d="m69 112-17 43 52 4-13-45Z" fill="url(#snGunWood)" stroke="#e7b36c" stroke-width="2"/><path d="M76 47v23m10 13v23m-14 20-8 24" stroke="#ffdf91" stroke-width="3"/><circle cx="80" cy="17" r="5" fill="#132333" stroke="#76ffe3" stroke-width="2"/><path d="M73 88h19" stroke="#69ffe1" stroke-width="3"/></svg>';
 const hint=uNode('div','sn-rifle-hint');hint.append(uNode('strong','','MIRA E RILASCIA'),uNode('small','','Un colpo singolo · Anche i colpi a vuoto contano'));
 deck.append(ammoBox,gun,hint);main.append(deck);
 const crosshair=uNode('span','sn-crosshair');crosshair.id='snCrosshair';crosshair.hidden=true;crosshair.setAttribute('aria-hidden','true');run.layer.append(crosshair);
 Object.assign(run,{gun,crosshair,ammo,ammoCount,ammoBox,aimPointer:null});bnRushUpdateAmmo(run);
 run.grid.addEventListener('pointerdown',e=>{if(run.ended||e.isPrimary===false||e.button!==0||run.aimPointer!==null)return;e.preventDefault();run.aimPointer=e.pointerId;bnRushAim(run,e.clientX,e.clientY);try{run.grid.setPointerCapture(e.pointerId);}catch{}});
 run.grid.addEventListener('pointermove',e=>{if(e.isPrimary!==false&&(run.aimPointer===e.pointerId||e.pointerType==='mouse'))bnRushAim(run,e.clientX,e.clientY);});
 run.grid.addEventListener('pointerup',e=>{if(run.aimPointer!==e.pointerId)return;run.aimPointer=null;e.preventDefault();if(run.ended)return;bnRushAim(run,e.clientX,e.clientY);const coin=document.elementFromPoint(e.clientX,e.clientY)?.closest('.sn-coin');const index=coin&&run.grid.contains(coin)&&!coin.disabled?run.page*12+Number(coin.id.slice(6)):-1;bnSupernovaReveal(run,index);});
 run.grid.addEventListener('pointercancel',()=>{run.aimPointer=null;});
 // Pointer releases already fired. Keep the native button click only for
 // keyboard and accessibility activation (detail zero), avoiding duplicate shots.
 run.grid.addEventListener('keydown',e=>{if(e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopImmediatePropagation();}},true);
 run.grid.addEventListener('click',e=>{if(e.detail!==0){e.preventDefault();e.stopImmediatePropagation();}},true);
}
