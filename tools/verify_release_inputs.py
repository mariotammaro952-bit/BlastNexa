from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[1]
html = (root / 'app/src/main/assets/index.html').read_text(encoding='utf-8')
pack = json.loads((root / 'levels/levels.json').read_text(encoding='utf-8'))
match = re.search(r'<script id="levelCatalog" type="application/json">(.*?)</script>', html, re.S)
assert match, "Embedded level catalog is missing"
embedded = json.loads(match.group(1))
assert len(embedded['levels']) == len(pack['levels']) == 2000, "Expected 2,000 levels"
assert embedded == pack, "Embedded and standalone level catalogs do not match"
assert 'BlastNexaSave' in html and 'BlastNexaBack' in html
assert 'Nexa Circuit' in html or 'NEXA CIRCUIT' in html
build = (root / 'app/build.gradle.kts').read_text()
assert 'compileSdk = 36' in build and 'targetSdk = 36' in build
assert 'com.blastnexa.blockpuzzle' in build
assert 'minSdk = 24' in build, 'Play automatic protection requires API 24 or higher'
assert 'versionCode = 14' in build, 'Version must increase for the Play Store'
print("PASS: BlastNexa v1.0 Beta4 War/Ocean TEST, 2000 levels, minSdk24/targetSdk36, versionCode14")
