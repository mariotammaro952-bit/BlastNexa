"""Apply the v32 presentation changes to the prepared v31 source, idempotently."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / 'game/index.html'
page = source.read_text()
page = page.replace('Un universo<br>da liberare', 'Un universo<br> da liberare')
if 'ODYSSEY COIN BONUS v32' in page or 'ODYSSEY MONDI v33' in page or 'ODYSSEY RUSH v34' in page:
    source.write_text(page)
    raise SystemExit(0)
assert 'ODYSSEY SUPERNOVA v31' in page
old = 'guarded(slotCelebrationDuration(last),finishSlotCelebration);'
assert page.count(old) == 1
# Interactive collection owns its lifetime. The committed result is unchanged.
page = page.replace(old, "guarded(slotCelebrationDuration(last),()=>{if(typeof bnSupernovaRun==='undefined'||!bnSupernovaRun)finishSlotCelebration();});")
page = page.replace('ODYSSEY SUPERNOVA v31', 'ODYSSEY COIN BONUS v32').replace('NEXA WORDS · v31', 'NEXA WORDS · v32')
page = page.replace('</head>', '<link rel="stylesheet" href="coin-bonus-v32.css"></head>', 1)
source.write_text(page)
print('Prepared v32 interactive coin bonus and responsive controls')
