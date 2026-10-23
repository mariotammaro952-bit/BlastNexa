from pathlib import Path
import hashlib
import json
import re

root = Path(__file__).resolve().parents[1]
source = (root / 'game/index.html').read_bytes()
assert source == (root / 'app/src/main/assets/index.html').read_bytes(), 'Run tools/prepare_assets.py before building'
html = source.decode('utf-8')
def catalog(name):
    match = re.search(r'<script id="' + name + r'" type="application/json">(.*?)</script>', html, re.S)
    assert match, 'Missing catalog: ' + name
    return json.loads(match.group(1))
levels = catalog('levelCatalog')['levels']
assert len(levels) == 2000, 'Expected 2,000 Adventure levels'
config = catalog('onlineConfig')
assert config == json.loads((root / 'app/src/main/assets/online-config.json').read_text())
assert config['url'] == 'https://blastnexa-online.mariotammaro952.chatgpt.site/api/ranking'
assert 'BlastNexaSave' in html and 'BlastNexaBack' in html
build = (root / 'app/build.gradle.kts').read_text()
for setting in ('compileSdk = 36', 'targetSdk = 36', 'minSdk = 24', 'com.blastnexa.blockpuzzle'):
    assert setting in build, 'Missing Android setting: ' + setting
version = int(re.search(r'versionCode\s*=\s*(\d+)', build).group(1))
assert version >= 2301, 'Do not downgrade the published v23 version code'
icons = json.loads((root / 'artwork/launcher-v26.json').read_text())
assert hashlib.sha256((root/icons['source']).read_bytes()).hexdigest() == icons['source_sha256']
for item in icons['files']:
    assert hashlib.sha256((root/item['path']).read_bytes()).hexdigest() == item['sha256'], 'Stale launcher artwork: '+item['path']
assert 'android:icon="@mipmap/ic_launcher"' in (root/'app/src/main/AndroidManifest.xml').read_text()
print(f'PASS: complete game, 2,000 levels, active HTTPS ranking, API 24/36, version {version}, SHA256 {hashlib.sha256(source).hexdigest()}')
