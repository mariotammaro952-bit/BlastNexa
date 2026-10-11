from pathlib import Path
import re
game=Path("app/src/main/assets/index.html").read_text(encoding="utf8")
playable=Path("experiments/playable/index.html").read_text(encoding="utf8")
assert 'const BNMetrics=' in game and "enabled:false" in game
assert "BNMetrics.record('start'" in game and "BNMetrics.record('lose'" in game
assert 'id="bnMetricsPanel"' in game
assert "BNMetrics.record('win'" in game
assert '<meta name="ad.orientation" content="portrait">' in playable
assert 'ExitApi.exit()' in playable
assert not re.search(r'(fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|localStorage)',playable)
assert "https://" not in playable
assert 'minSdk = 24' in Path("app/build.gradle.kts").read_text()
print("PASS: Growth Lab static checks")
