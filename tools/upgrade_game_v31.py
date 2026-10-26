"""Build the v30 assets from the existing v29 APK; never changes reward odds."""
from pathlib import Path
import base64
import json
import re

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'game/index.html'
page = source.read_text()
if 'ODYSSEY SUPERNOVA v31' in page or 'ODYSSEY COIN BONUS v32' in page or 'ODYSSEY MONDI v33' in page or 'ODYSSEY RUSH v34' in page:
    raise SystemExit(0)

def replace(old, new, count=1):
    global page
    assert page.count(old) == count, (old[:100], page.count(old))
    page = page.replace(old, new)

replace('sinceAd:integer(slot.sinceAd,0,SLOT_AD_INTERVAL)', 'sinceAd:0')
replace('||lifeData.slot.sinceAd>=SLOT_AD_INTERVAL', '')
replace(" if(lifeData.slot.sinceAd>=SLOT_AD_INTERVAL){stopSlotAuto();openSlotBreak();return false;}\n", '')
replace('lifeData.slot.sinceAd++;', 'lifeData.slot.sinceAd=0;')
replace(' Una pausa pubblicitaria è prevista dopo 50 giri, contando anche giri bonus e rilanci.', ' Puoi continuare a girare senza pause pubblicitarie ogni 50 giri.')
replace('const SLOT_AD_INTERVAL=50;\n', '')
replace("const pending=!!a.bonus,progress=Math.min(SLOT_AD_INTERVAL,lifeData.slot.sinceAd),free=", "const pending=!!a.bonus,free=")
replace("progress===SLOT_AD_INTERVAL?'CONTINUA':", '')
replace("let action=()=>progress===SLOT_AD_INTERVAL?openSlotBreak():spinLifeSlot();", "let action=()=>spinLifeSlot();")
replace("progress===SLOT_AD_INTERVAL?'PAUSA PUBBLICITARIA':", '')
replace('||progress===SLOT_AD_INTERVAL', '', count=2)
replace("progress===SLOT_AD_INTERVAL?'CONTINUA · PAUSA PUBBLICITARIA':'GIRO NORMALE'", "'GIRO NORMALE'")
replace(" const cadence=uNode('div','bn-slot-cadence');cadence.append(uNode('span','',progress+'/'+SLOT_AD_INTERVAL+' GIRI'),uNode('small','',progress===SLOT_AD_INTERVAL?'Pausa prima del prossimo giro':(SLOT_AD_INTERVAL-progress)+' prima della pausa pubblicitaria'));cadence.append(uMeter(progress/SLOT_AD_INTERVAL*100));layout.append(cadence);\n", '')
start = page.index('function openSlotBreak(){')
end = page.index("for(const id of ['menuLives','gameLives','wordsLives'])", start)
page = page[:start] + page[end:]
assert 'SLOT_AD_INTERVAL' not in page
assert 'openSlotBreak' not in page

# The long sequence is presentation only. Existing debits and awards still
# commit atomically before animation, including chest and crystal rewards.
replace(" if(chest||crystal){\n  stopSlotAudio();showSlotSpectacle('bonus',crystal?'+3 GIRI BONUS':'IL FORZIERE È TUO',crystal?'Cristallo si accende':'Scegli uno dei tre tesori',last.spin);playSlotBonusSample('spin:'+last.spin);haptic([25,40,35]);",
        " if(chest||crystal||last.prize===5){\n  stopSlotAudio();if(typeof bnSupernovaStart==='function')bnSupernovaStart({key:'spin:'+last.spin,spin:last.spin,title:crystal?'GIRI DI CRISTALLO':chest?'TESORO SBLOCCATO':'MEGA BONUS',copy:crystal?'+3 GIRI BONUS':chest?'SCEGLI IL TUO FORZIERE':'ESPLOSIONE NEXA',coins:last.coinsCredited||0,lives:slotCredited(last),duration:8000});haptic([25,40,35]);")
replace("function slotCelebrationDuration(last){return last.arcade?.freeAward||lifeData.slot.arcade.bonus?.id==='chest:'+last.spin?2800:last.prize===5?2500:last.prize===2?2000:1450;}",
        "function slotCelebrationDuration(last){return last.arcade?.freeAward||lifeData.slot.arcade.bonus?.id==='chest:'+last.spin||last.prize===5?8200:last.prize===2?2000:1450;}")
replace("function finishSlotCelebration(){\n if(slotPhase!=='celebrating')return false;", "function finishSlotCelebration(){\n if(typeof bnSupernovaCleanup==='function')bnSupernovaCleanup();\n if(slotPhase!=='celebrating')return false;")
replace("function clearSlotSpectacle(){\n", "function clearSlotSpectacle(){\n if(typeof bnSupernovaCleanup==='function')bnSupernovaCleanup();\n")
replace("function stopSlotMedia(){slotMediaEpoch++;slotStopMusic();stopSlotSample();clearSlotSpectacle();refreshSlotAudioUI();}",
        "function stopSlotMedia(){slotMediaEpoch++;if(typeof bnSupernovaRun!=='undefined'&&bnSupernovaRun){bnSupernovaFinish();stopSlotAuto();}slotStopMusic();stopSlotSample();clearSlotSpectacle();refreshSlotAudioUI();}")
replace("saveLives();renderLifeSlot($('universeBody'));refreshLivesUI();slotSound('win',prize);haptic([20,30,35]);return true;",
        "saveLives();renderLifeSlot($('universeBody'));refreshLivesUI();slotSound('win',prize);haptic([20,30,35]);if(prize===5&&typeof bnSupernovaStart==='function')bnSupernovaStart({key:'chest:'+b.id,title:'MEGA TESORO',copy:'IL CUSTODE TI HA PREMIATO',coins,lives:lifeData.balance-before,duration:8000});return true;")
replace("visible:!!shown&&", "visible:!document.getElementById('bnSupernova')&&!!shown&&")
replace("if(!slotPlaybackAllowed()||muted){if(slotMusicNode||slotSampleVoices.size)stopSlotMedia();refreshSlotAudioUI();return;}",
        "if(!slotPlaybackAllowed()){if(slotMusicNode||slotSampleVoices.size)stopSlotMedia();refreshSlotAudioUI();return;}\n  if(muted){slotStopMusic();stopSlotSample();if(typeof bnSupernovaStopAudio==='function')bnSupernovaStopAudio();refreshSlotAudioUI();return;}")


# Keep every world's original soundtrack. Big Win Now belongs to bonus presentation.
catalog = re.search(r'(<script[^>]*id="slotAudioCatalog"[^>]*>)(.*?)(</script>)', page, re.S)
data = json.loads(catalog.group(2))
data['hype'] = 'data:audio/mpeg;base64,' + base64.b64encode((ROOT/'game/assets/big-win-now.mp3').read_bytes()).decode()
data['tracks']['hype'] = {'title':'Big Win Now','loopDuration':100,'source':'user-supplied'}
page = page[:catalog.start(2)] + json.dumps(data, separators=(',', ':')) + page[catalog.end(2):]
start=page.index('function slotMusicProfile(){')
end=page.index('function slotWorldName(',start)
page=page[:start]+"""function slotMusicProfile(){
 if(typeof bnSupernovaRun!=='undefined'&&bnSupernovaRun)return {key:'hype',...SLOT_AUDIO_MEDIA.tracks.hype};
 const id=lifeData.slot.arcade.machine,world=SLOT_WORLDS[id],visual=slotPhase==='spinning'&&slotArcadeBefore?slotArcadeBefore:lifeData.slot.arcade;
 const key=slotWorldState(visual)==='normal'?world.music:world.bonus;
 return {key,...SLOT_AUDIO_MEDIA.tracks[key]};
}
"""+page[end:]
replace("function slotMusicTarget(){return performance.now()<slotDuckUntil ? .035 : slotPhase==='spinning' ? .18 : .14;}",
        "function slotMusicTarget(){return typeof bnSupernovaRun!=='undefined'&&bnSupernovaRun?.45:performance.now()<slotDuckUntil?.08:slotPhase==='spinning'?.18:.14;}")
# Do not resume an old point in the bonus song: each trigger has a fresh opening.
replace("slotMusicOffset=(slotMusicOffsets.get(profile.key)||0)%slotMusicLoopDuration;", "slotMusicOffset=profile.key==='hype'?0:(slotMusicOffsets.get(profile.key)||0)%slotMusicLoopDuration;")
replace("profile.title.toUpperCase()+' · '+profile.bpm+' BPM'", "profile.title.toUpperCase()+(profile.key==='hype'?' · MEGA BONUS':' · '+profile.bpm+' BPM')")
page=page.replace('ODYSSEY LANDSCAPE v29','ODYSSEY SUPERNOVA v31').replace('NEXA WORDS · v29','NEXA WORDS · v31')
replace('</head>', '<link rel="stylesheet" href="radiance-v30.css"><link rel="stylesheet" href="supernova-v30.css"><link rel="stylesheet" href="bonus-banner-v31.css"></head>')
replace('</body>', '<script defer src="radiance-v30.js"></script><script defer src="supernova-v30.js"></script></body>')
source.write_text(page)
print('Prepared v31 bonus-only song, uninterrupted spins and supernova presentation')

