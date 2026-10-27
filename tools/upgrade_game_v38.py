from pathlib import Path
root=Path(__file__).resolve().parents[1];path=root/'game/index.html';s=path.read_text()
if '// SLOT LEVERAGE v38' in s:raise SystemExit(0)
def replace(a,b):
 global s
 assert a in s,a
 s=s.replace(a,b)
extra='''// SLOT LEVERAGE v38
function slotValidWager(n){return [1,5,10,50,100].includes(n)?n:1;}
function slotWager(kind='spin'){
 const a=lifeData.slot.arcade;
 return slotValidWager(kind==='respin'?arcadeCurrentLast()?.arcade?.wager:a.machine==='crystal'&&a.freeSpins>0?a.freeWager:a.wager);
}
function setSlotWager(n){
 const a=lifeData.slot.arcade;if(![1,5,10,50,100].includes(n)||!slotVisible()||slotBusy||bnPendingAd||a.freeSpins>0||a.bonus||$('overlay').classList.contains('on'))return false;
 stopSlotAuto();a.wager=n;slotHolds.clear();saveLives();renderLifeSlot($('universeBody'));return true;
}
'''
replace('function slotSpinCoinCost(){return SLOT_COIN_COST*slotLineCount();}',extra+"function slotSpinCoinCost(kind='spin'){return SLOT_COIN_COST*slotLineCount()*slotWager(kind);}")
replace("coinCost=kind==='free'||rushRespin?0:slotSpinCoinCost()", "coinCost=kind==='free'||rushRespin?0:slotSpinCoinCost(kind)")
replace("return {version:19,lineCount:SLOT_LINE_CHOICES", "return {version:19,wager:slotValidWager(s.wager),freeWager:slotValidWager(s.freeWager),lineCount:SLOT_LINE_CHOICES")
replace("const x=uNode('div','bn-slot-unit');x.append(uNode('strong','','x1'),uNode('small','','MONETA / LINEA'));bar.append(x);", """const x=uNode('label','bn-slot-leverage'),pick=uNode('select','');pick.id='slotLeverage';pick.setAttribute('aria-label','Leva: moltiplica costo, monete e vite vinte');
 for(const n of [1,5,10,50,100]){const option=uNode('option','','×'+n);option.value=String(n);option.selected=n===slotWager();pick.append(option);}
 pick.disabled=moving||slotBusy||!!bnPendingAd||lifeData.slot.arcade.freeSpins>0||!!lifeData.slot.arcade.bonus;pick.onchange=()=>setSlotWager(Number(pick.value));x.append(uNode('small','','LEVA'),pick);bar.append(x);""")
replace("count+' monete per giro'", "count*slotWager()+' monete per giro'")
replace("' linea, 1 moneta per giro'", "' linea, '+slotWager()+' monete per giro'")
replace('coinPrize:result.coins,', 'coinPrize:result.coins*slotWager(kind),')
replace('arcade:{version:19,lineCount,machine:a.machine,kind,', 'arcade:{version:19,wager:slotWager(kind),lineCount,machine:a.machine,kind,')
replace('arcade={version:19,lineCount:a.lineCount', 'arcade={version:19,wager:slotValidWager(a.wager),lineCount:a.lineCount')
replace('if([0,1,5,10,100].includes(raw.coinCost))last.coinCost=raw.coinCost;', 'if(Number.isInteger(raw.coinCost)&&raw.coinCost>=0&&raw.coinCost<=1000)last.coinCost=raw.coinCost;')
replace('last.credited=Math.min(raw.prize,arcadeInt(raw.credited,raw.prize));','last.credited=Math.min(raw.prize*slotValidWager(arcade?.wager),arcadeInt(raw.credited,raw.prize*slotValidWager(arcade?.wager)));')
replace('evaluateArcadeGrid(arcade.grid,arcade.machine,arcade.lineCount).coins:0;', 'evaluateArcadeGrid(arcade.grid,arcade.machine,arcade.lineCount).coins*slotValidWager(arcade.wager):0;')
replace('lifeData.balance+last.prize)', 'lifeData.balance+last.prize*slotValidWager(last.arcade?.wager))')
replace('valid(a.lives,0,a.spins*5)&&valid(a.best,0,5)', 'valid(a.lives,0,a.spins*500)&&valid(a.best,0,500)')
a=s.index('function slotCredited(last){');b=s.index('\nfunction ',a+1);s=s[:a]+'''function slotCredited(last){
 if(!last)return 0;const prize=last.prize*slotValidWager(last.arcade?.wager);
 if(Number.isInteger(last.beforeBalance)&&last.beforeBalance>=0)return Math.min(prize,Math.max(0,999999-last.beforeBalance));
 return Number.isInteger(last.credited)?Math.max(0,Math.min(prize,last.credited)):prize;
}
'''+s[b:]
replace('a.freeLineCount=meta.lineCount;', 'a.freeLineCount=meta.lineCount;a.freeWager=slotValidWager(meta.wager);')
replace('a.bonus={id:\'chest:\'+last.spin,choices}', 'a.bonus={id:\'chest:\'+last.spin,wager:slotValidWager(meta.wager),choices}')
replace('bonus:validBonus?{id:bonus.id,choices:', 'bonus:validBonus?{id:bonus.id,wager:slotValidWager(bonus.wager),choices:')
replace('{...s.revealed,credited:Math.min(s.revealed.prize,arcadeInt(s.revealed.credited,s.revealed.prize)),coinsCredited:arcadeInt(s.revealed.coinsCredited,0,s.revealed.prize*SLOT_COINS_PER_LIFE)}', '{...s.revealed,wager:slotValidWager(s.revealed.wager),credited:Math.min(s.revealed.prize*slotValidWager(s.revealed.wager),arcadeInt(s.revealed.credited,s.revealed.prize)),coinsCredited:arcadeInt(s.revealed.coinsCredited,0,s.revealed.prize*SLOT_COINS_PER_LIFE*slotValidWager(s.revealed.wager))}')
replace('const prize=b.choices[index],before=lifeData.balance;lifeData.balance=Math.min(999999,before+prize);const coins=creditSlotCoins(prize*SLOT_COINS_PER_LIFE);', 'const prize=b.choices[index],wager=slotValidWager(b.wager),before=lifeData.balance;lifeData.balance=Math.min(999999,before+prize*wager);const coins=creditSlotCoins(prize*SLOT_COINS_PER_LIFE*wager);')
replace('a.revealed={id:b.id,index,choices:', 'a.revealed={id:b.id,wager,index,choices:')
replace("key:'chest:'+b.id", 'key:b.id')
replace('arcadeInt(raw.lives,0,60)', 'arcadeInt(raw.lives,0,6000)')
replace('arcadeInt(raw.coins,0,4500)', 'arcadeInt(raw.coins,0,450000)')
replace('Math.min(60,j.lives+slotCredited(last))','Math.min(6000,j.lives+slotCredited(last))')
replace('Math.min(4500,(j.coins||0)+(last.coinsCredited||0))','Math.min(450000,(j.coins||0)+(last.coinsCredited||0))')
# Explain wager separately from the number of paylines.
replace("['01 · Tre, quattro, cinque',", "['00 · Leva ×1, ×5, ×10, ×50, ×100','La leva moltiplica il costo del giro e le monete e vite vinte. Costo = linee × leva. Esempio: 10 linee con leva ×50 costano 500 monete. I giri gratuiti, i forzieri e il bonus monete mantengono la leva del giro che li ha attivati. I rilanci usano la leva del risultato precedente. Le ricompense delle missioni e il numero di giri gratis non vengono moltiplicati.'],\n  ['01 · Tre, quattro, cinque',")
path.write_text(s)
print('Applied leverage v38')
