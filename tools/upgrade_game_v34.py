"""Timed coin rush, spendable free relaunches, trio home and visible branding."""
from pathlib import Path
root=Path(__file__).resolve().parents[1];source=root/'game/index.html';page=source.read_text()
if 'ODYSSEY RUSH v34' in page:raise SystemExit(0)
assert 'ODYSSEY MONDI v33' in page
def replace(old,new,count=1):
 global page
 assert page.count(old)==count,(old[:100],page.count(old))
 page=page.replace(old,new)
replace('function loadLives(){',(root/'game/coin-rush-core-v34.js').read_text()+'\nfunction loadLives(){')
replace('arcade:loadArcade(null),wallet:loadSlotCoinWallet(null,now)','arcade:loadArcade(null),wallet:loadSlotCoinWallet(null,now),rush:coinRushLoad(null)')
replace('arcade:loadArcade(slot.arcade),wallet:loadSlotCoinWallet(slot.wallet,now)','arcade:loadArcade(slot.arcade),wallet:loadSlotCoinWallet(slot.wallet,now),rush:coinRushLoad(slot.rush)')
replace("a.machine!=='forge'||a.reactor<6||!last?.arcade","a.machine!=='forge'||(a.reactor<6&&!coinRushTokens())||!last?.arcade")
replace("a.machine!=='forge'||a.reactor<6||slotHolds.size<1","a.machine!=='forge'||(a.reactor<6&&!coinRushTokens())||slotHolds.size<1")
replace("syncLives();const coinCost=kind==='free'?0:slotSpinCoinCost(),wallet=lifeData.slot.wallet;","syncLives();const rushRespin=kind==='respin'&&coinRushTokens()>0,coinCost=kind==='free'||rushRespin?0:slotSpinCoinCost(),wallet=lifeData.slot.wallet;")
replace('last.coinCost=coinCost;last.beforeCoins=wallet.balance;wallet.balance-=coinCost;',"if(rushRespin){lifeData.slot.rush.tokens--;lifeData.slot.rush.spentRespins=Math.min(1e12,lifeData.slot.rush.spentRespins+1);}last.coinCost=coinCost;last.beforeCoins=wallet.balance;wallet.balance-=coinCost;")
replace("ready=!moving&&!slotBusy&&a.reactor===6&&last?.arcade?.machine==='forge'","ready=!moving&&!slotBusy&&(a.reactor===6||coinRushTokens()>0)&&last?.arcade?.machine==='forge'",2)
replace("if(config.id==='forge'&&visual.reactor>=6)renderWorldForgeHolds(machine,moving);","if(config.id==='forge'&&(visual.reactor>=6||coinRushTokens()>0)&&last?.arcade?.machine==='forge')renderWorldForgeHolds(machine,moving);")
replace("readyForge=config.id==='forge'&&visual.reactor>=6&&!pending;","readyForge=config.id==='forge'&&(visual.reactor>=6||coinRushTokens()>0)&&last?.arcade?.machine==='forge'&&!pending;")
replace("slotHolds.size?slotHolds.size+' RULLI BLOCCATI':'SCEGLI 1 O 2 RULLI'","coinRushTokens()?coinRushTokens()+' RILANCI GRATIS':slotHolds.size?slotHolds.size+' RULLI BLOCCATI':'SCEGLI 1 O 2 RULLI'")
old="copy.append(uNode('small','',title),uNode('strong','',text));"
replace(old,"if(id==='forge'&&coinRushTokens()){title='RILANCI GRATIS · '+coinRushTokens();text=lastForgeReady()?'Tieni 1 o 2 rulli e rilancia gratis':'Fai un giro nella Forgia per scegliere i rulli';}\n "+old)
replace('function renderWorldFeature(layout,visual,moving){',"function lastForgeReady(){return arcadeCurrentLast()?.arcade?.machine==='forge';}\nfunction renderWorldFeature(layout,visual,moving){")
page=page.replace('ODYSSEY MONDI v33','ODYSSEY RUSH v34').replace('NEXA WORDS · v33','NEXA WORDS · v34')
page=page.replace('BlastNexa: Block Puzzle • ODYSSEY RUSH v34 · 2000 livelli','BlastNexta 3 in 1 • ODYSSEY RUSH v34')
page=page.replace('PERSONALIZZA BLASTNEXA','PERSONALIZZA BLASTNEXTA 3 IN 1').replace('<p>BlastNexa salva','<p>BlastNexta 3 in 1 salva')
page=page.replace('BLAST<span>NEXA</span>','BLAST<span>NEXTA</span>')
page=page.replace('<div class="kicker">BLOCK PUZZLE</div>','<div class="kicker">3 IN 1 · SLOT · PUZZLE · CRUCIVERBA</div>')
page=page.replace('BLASTNEXA · ODYSSEY v29 · AVVENTURE ORIZZONTALI','BLASTNEXTA 3 IN 1 · TRE GIOCHI, UNA SOLA AVVENTURA')
page=page.replace('</head>','<link rel="stylesheet" href="rush-home-v34.css"></head>',1)
page=page.replace('</body>','<script defer src="trio-home-v34.js"></script></body>',1)
source.write_text(page)
print('Prepared BlastNexta 3 in 1 v34: timed collection and free relaunches')
