from pathlib import Path
import json,hashlib,re
root=Path(__file__).resolve().parents[1]
def write_changed(path,data):
    if path.exists() and path.read_bytes()==data:return
    temporary=path.with_name(path.name+'.prepare-tmp')
    temporary.write_bytes(data)
    temporary.replace(path)
source=root/'game/index.html';h=source.read_text(encoding='utf-8')
# Package the landscape UI alongside the complete embedded game catalogs.
# The source game owns the preserved v27 wallet and v28 paired coin/life awards.
landscape_css=root/'game/landscape-v24.css'
landscape_js=root/'game/landscape-v24.js'
fixed_assets=(root/'game/static-v29.css',root/'game/static-v29.js')
for f in (landscape_css,landscape_js,*fixed_assets):
    assert f.exists() and f.stat().st_size>100, 'Missing v24 layout asset: '+str(f)
css_link='<link rel="stylesheet" href="landscape-v24.css">'
js_link='<script defer src="landscape-v24.js"></script>'
if css_link not in h:
    assert h.count('</head>')==1
    h=h.replace('</head>',css_link+'</head>',1)
if js_link not in h:
    assert h.count('</body>')==1
    h=h.replace('</body>',js_link+'</body>',1)
h=h.replace('ODYSSEY GIOCATORI v23','ODYSSEY LANDSCAPE v24').replace('ODYSSEY v23 · PROFILO & CLASSIFICA','ODYSSEY v24 · AVVENTURE ORIZZONTALI').replace('NEXA WORDS · v23','NEXA WORDS · v24')
h=h.replace('ODYSSEY LANDSCAPE v24','ODYSSEY LANDSCAPE v25').replace('ODYSSEY v24 · AVVENTURE ORIZZONTALI','ODYSSEY v25 · AVVENTURE ORIZZONTALI').replace('NEXA WORDS · v24','NEXA WORDS · v25')
h=h.replace('ODYSSEY LANDSCAPE v25','ODYSSEY LANDSCAPE v26').replace('ODYSSEY v25 · AVVENTURE ORIZZONTALI','ODYSSEY v26 · AVVENTURE ORIZZONTALI').replace('NEXA WORDS · v25','NEXA WORDS · v26')
h=h.replace('ODYSSEY LANDSCAPE v26','ODYSSEY LANDSCAPE v27').replace('ODYSSEY v26 · AVVENTURE ORIZZONTALI','ODYSSEY v27 · AVVENTURE ORIZZONTALI').replace('NEXA WORDS · v26','NEXA WORDS · v27')
h=h.replace('ODYSSEY LANDSCAPE v27','ODYSSEY LANDSCAPE v28').replace('ODYSSEY v27 · AVVENTURE ORIZZONTALI','ODYSSEY v28 · AVVENTURE ORIZZONTALI').replace('NEXA WORDS · v27','NEXA WORDS · v28')
h=h.replace('ODYSSEY LANDSCAPE v28','ODYSSEY LANDSCAPE v29').replace('ODYSSEY v28 · AVVENTURE ORIZZONTALI','ODYSSEY v29 · AVVENTURE ORIZZONTALI').replace('NEXA WORDS · v28','NEXA WORDS · v29')
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
write_changed(source,h.encode('utf-8'))
config=json.loads(re.search(r'<script id="onlineConfig" type="application/json">(.*?)</script>',h,re.S)[1]);assert config['url']=='https://blastnexa-online.mariotammaro952.chatgpt.site/api/ranking'
assets=root/'app/src/main/assets';assets.mkdir(parents=True,exist_ok=True)
write_changed(assets/'index.html',h.encode('utf-8'))
write_changed(assets/'online-config.json',json.dumps(config).encode())
for f in (landscape_css,landscape_js,*fixed_assets):
    (assets/f.name).write_bytes(f.read_bytes())
import shutil
if (root/'game/assets').exists():
    shutil.copytree(root/'game/assets',assets/'assets',dirs_exist_ok=True)
print('Game SHA256',hashlib.sha256(h.encode()).hexdigest())
