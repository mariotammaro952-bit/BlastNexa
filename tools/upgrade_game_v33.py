"""Prepare the HTML review: complete world pages and varied saved bonus shares."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'game/index.html'
page=source.read_text()
if 'ODYSSEY MONDI v33' in page or 'ODYSSEY RUSH v34' in page:
    raise SystemExit(0)
assert 'ODYSSEY COIN BONUS v32' in page
page=page.replace('ODYSSEY COIN BONUS v32','ODYSSEY MONDI v33').replace('NEXA WORDS · v32','NEXA WORDS · v33')
page=page.replace('</head>','<link rel="stylesheet" href="worlds-v33.css"></head>',1)
page=page.replace('</body>','<script defer src="worlds-v33.js"></script></body>',1)
source.write_text(page)
print('Prepared v33 HTML review: one complete world and varied bonus shares')
