"""One-file review of the actual v36 UI, with an isolated in-memory profile."""
from pathlib import Path
import base64, re

root = Path(__file__).resolve().parents[1]
page = (root / 'game/index.html').read_text()
for match in list(re.finditer(r'<link rel="stylesheet" href="([^"/]+\.css)">', page)):
    page = page.replace(match[0], '<style>' + (root / 'game' / match[1]).read_text() + '</style>')
for match in list(re.finditer(r'<script defer src="([^"/]+\.js)"></script>', page)):
    page = page.replace(match[0], '<script>' + (root / 'game' / match[1]).read_text() + '</script>')
image = 'data:image/webp;base64,' + base64.b64encode((root / 'game/assets/nexa-guardian.webp').read_bytes()).decode()
page = page.replace('assets/nexa-guardian.webp', image)
page = page.replace('assets/rifle-fps-v36.webp', 'data:image/webp;base64,' + base64.b64encode((root / 'game/assets/rifle-fps-v36.webp').read_bytes()).decode())
def memory_script(match):
    return match[0] if 'application/json' in match[1] else '<script' + match[1] + '>' + match[2].replace('localStorage', 'window.__BN_PREVIEW_STORAGE__') + '</script>'
page = re.sub(r'<script([^>]*)>(.*?)</script>', memory_script, page, flags=re.S)
bootstrap = """<script>window.__BN_HTML_PREVIEW__=true;window.__BN_PREVIEW_STORAGE__=(()=>{const data=new Map([['blastnexa_help_seen','true']]);return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),clear:()=>data.clear()}})();</script>"""
page = page.replace('<head>', '<head>' + bootstrap, 1)
# Ranking is intentionally unavailable in the temporary preview profile.
page = page.replace('https://blastnexa-online.mariotammaro952.chatgpt.site/api/ranking', 'https://offline-preview.invalid/api/ranking')
demo = """<script>
window.addEventListener('DOMContentLoaded',()=>{
 function reset(){if(bnSupernovaRun)bnSupernovaFinish();cancelSlotAnimation();document.getElementById('overlay').classList.remove('on');}
 function ready(){reset();if(!slotVisible())openUniverse('slot');slotView='play';Object.assign(lifeData.slot.arcade,{bonus:null,revealed:null,freeSpins:0,crystalJourney:null,reactor:0,treasure:0});slotHolds.clear();if(lifeData.slot.wallet.balance<slotSpinCoinCost())lifeData.slot.wallet.balance=1000;}
 window.addEventListener('message',event=>{
  if(event.source!==parent||event.data?.type!=='bn-v36-review')return;
  const action=event.data.action;
  if(action==='home'){reset();displayMenu();return;}
  if(action==='map'){reset();displayMenu();openAdventureMap();return;}
  if(action==='words'){reset();displayMenu();openUniverse('words');return;}
  if(action==='motion'){playerSettings.effects=playerSettings.effects==='lite'?'full':'lite';applyPlayerSettings();return;}
  ready();
  if(action==='mega'){setArcadeMachine('temple');const random=slotRandomInt;try{slotRandomInt=()=>0;spinLifeSlot();}finally{slotRandomInt=random;}return;}
  if(['temple','crystal','forge'].includes(action)){setArcadeMachine(action);return;}
 });
 lifeData.slot.arcade.lineCount=10;slotShowLines=false;reset();displayMenu();parent.postMessage({type:'bn-v36-ready'},'*');
});
</script>"""
page = page.replace('</body>', demo + '</body>')
payload = base64.b64encode(page.encode()).decode()
outer = '''<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BlastNexta 3 in 1 · Anteprima v36</title><style>
*{box-sizing:border-box}body{margin:0;background:#080e1c;color:#f6e6bd;font-family:system-ui,sans-serif;min-height:100dvh;display:flex;flex-direction:column}header{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;border-bottom:1px solid #e1bd6540;background:#141526}header strong{font-size:15px;letter-spacing:.1em}header small{font-size:10px;color:#bdc4d3}nav{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:7px;padding:10px}button{min-height:34px;border:1px solid #b7adcb66;border-radius:8px;padding:7px 13px;background:#25213b;color:#e4e2ee;font:800 10px system-ui;cursor:pointer}button[data-action="mega"]{background:#f2ce7d;color:#43260d;border-color:#ffe9ae}button[data-action="respin"]{border-color:#ff5a73;color:#ffb0b8;box-shadow:inset 0 0 10px #ff244c22}button:disabled{opacity:.4}#viewer{display:grid;place-items:center;flex:1;min-height:190px;overflow:hidden}#stage{overflow:hidden;background:#0c1b26;box-shadow:0 0 0 1px #a2bcb333;border-radius:8px}iframe{display:block;border:0;width:800px;height:360px;transform-origin:top left}footer{padding:10px 18px;text-align:center;font-size:11px;color:#bac9cf;line-height:1.5}footer strong{color:#ffe1a2}@media(orientation:landscape) and (max-height:500px){header{padding:5px 14px}header strong{font-size:11px}nav{padding:5px;gap:5px}button{min-height:25px;padding:4px 9px;font-size:9px}footer{padding:5px 12px;font-size:9px}}
</style></head><body><header><strong>BLASTNEXTA 3 IN 1 / v36</strong><small>Anteprima interattiva</small></header><nav aria-label="Prove del gioco"><button data-action="home" disabled>HOME</button><button data-action="mega" disabled>PROVA BONUS 5s</button><button data-action="temple" disabled>SLOT</button><button data-action="map" disabled>PUZZLE</button><button data-action="words" disabled>CRUCIVERBA</button><button data-action="forge" disabled>FORGIA / RILANCI</button><button data-action="motion" disabled>EFFETTI ON / RIDOTTI</button><button id="fullscreen">SCHERMO INTERO</button></nav><main id="viewer"><div id="stage"><iframe id="game" title="BlastNexta 3 in 1 · Slot, Puzzle e Cruciverba"></iframe></div></main><footer><strong>Hai 5 secondi e 5 colpi: tocca la moneta per mirare, poi tocca l’arma per sparare.</strong><br>Monete da 25 a 300, vite e rilanci gratis ×1 / ×2. I rilanci si usano nella Forgia. Profilo temporaneo per questa anteprima.</footer>'''
outer += '<script type="application/octet-stream" id="gamePayload">' + payload + '</script>'
outer += '''<script>
const frame=document.getElementById('game'),stage=document.getElementById('stage'),viewer=document.getElementById('viewer');frame.srcdoc=new TextDecoder().decode(Uint8Array.from(atob(document.getElementById('gamePayload').textContent.trim()),c=>c.charCodeAt(0)));
function fit(){const full=!!document.fullscreenElement,w=full?innerWidth:viewer.clientWidth-16,h=full?innerHeight:Math.max(190,innerHeight-document.querySelector('header').offsetHeight-document.querySelector('nav').offsetHeight-document.querySelector('footer').offsetHeight-12);const s=Math.max(.1,Math.min(w/800,h/360));frame.style.transform='scale('+s+')';stage.style.width=800*s+'px';stage.style.height=360*s+'px';}window.addEventListener('resize',fit);document.addEventListener('fullscreenchange',fit);fit();
window.addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.data?.type==='bn-v36-ready')document.querySelectorAll('[data-action]').forEach(b=>b.disabled=false);});document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{frame.contentWindow.focus();frame.contentWindow.postMessage({type:'bn-v36-review',action:b.dataset.action},'*')});document.getElementById('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen();}catch{}};
</script></body></html>'''
output = root.parent / 'output/BlastNexta_3_in_1_v36_Anteprima.html'
output.parent.mkdir(exist_ok=True)
output.write_text(outer)
print(output, output.stat().st_size)

