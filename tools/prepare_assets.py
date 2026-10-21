from pathlib import Path
import json,hashlib,re
root=Path(__file__).resolve().parents[1]
source=root/'game/index.html';h=source.read_text();config=json.loads(re.search(r'<script id="onlineConfig" type="application/json">(.*?)</script>',h,re.S)[1]);assert config['url']=='https://blastnexa-online.mariotammaro952.chatgpt.site/api/ranking'
assets=root/'app/src/main/assets';assets.mkdir(parents=True,exist_ok=True);(assets/'index.html').write_text(h);(assets/'online-config.json').write_text(json.dumps(config))
print('Game SHA256',hashlib.sha256(h.encode()).hexdigest())
