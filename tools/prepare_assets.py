from pathlib import Path
import json,hashlib,re
root=Path(__file__).resolve().parents[1]
source=root/'game/index.html';h=source.read_text()
# Some Android WebViews do not resolve aspect-ratio on an auto-height CSS grid.
# A measured border-box height keeps the same square cells on those versions.
if 'function syncWordBoardSquare()' not in h:
 old='function renderWords(){';assert h.count(old)==1
 fix="""function syncWordBoardSquare(){
 const host=$('wordBoard');if(!host)return;const width=host.getBoundingClientRect().width;
 if(width>0){host.style.boxSizing='border-box';host.style.height=width+'px';}
}
window.addEventListener('resize',()=>{if(wordsVisible())syncWordBoardSquare();});
function renderWords(){"""
 h=h.replace(old,fix,1)
 old="host.style.gridTemplateRows='repeat('+p.size+',minmax(0,1fr))';";assert h.count(old)==1;h=h.replace(old,old+'syncWordBoardSquare();',1)
 old='La classifica usa un profilo anonimo salvato su questo dispositivo.'
 h=h.replace(old,'La classifica usa un profilo senza email, salvato su questo dispositivo. Premendo PARTECIPA accetti le Regole della classifica, consultabili qui sotto.')
 source.write_text(h)
config=json.loads(re.search(r'<script id="onlineConfig" type="application/json">(.*?)</script>',h,re.S)[1]);assert config['url']=='https://blastnexa-online.mariotammaro952.chatgpt.site/api/ranking'
assets=root/'app/src/main/assets';assets.mkdir(parents=True,exist_ok=True);(assets/'index.html').write_text(h);(assets/'online-config.json').write_text(json.dumps(config))
print('Game SHA256',hashlib.sha256(h.encode()).hexdigest())
