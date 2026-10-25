# BlastNexa v32 · bonus interattivo e pulsante RILANCIA

RILANCIA usa ora un pulsante circolare grande come GIRA. La luce neon rossa interna pulsa quando un rilancio è disponibile e almeno un rullo è selezionato; resta ferma quando il comando è disabilitato o sono attivi gli effetti ridotti.

Il super bonus occupa lo schermo con tre pagine da dodici monete. Si possono toccare singolarmente o scoprire una pagina insieme. La pagina successiva si abilita a raccolta completata; il pulsante di uscita resta disponibile. Non esiste più una scadenza automatica di otto secondi. Monete e vite vengono già registrate dalla transazione del giro: i tocchi ne rivelano quote, senza una seconda estrazione o un secondo accredito. Big Win Now accompagna il bonus e si ferma all'uscita o alla perdita del focus.

Lo sfondo della slot copre anche la zona laterale della fotocamera; i controlli rispettano gli inset nativi. La mappa puzzle mantiene l'intestazione e riserva una riga separata al paginatore, senza la precedente doppia paginazione dell'intera schermata. Il tabellone resta quadrato e centrato tra i pannelli laterali.

## Preparazione e verifiche

```sh
python3 tools/prepare_assets.py
node qa/slot_economy_v28.cjs
node qa/coins.cjs
node qa/all_levels.cjs game/index.html
node qa/other_games.cjs
node qa/unlimited_modes.cjs
node qa/fresh_start_v29.cjs
npm install --no-save playwright@1.62.1
npx playwright install chromium
node qa/coin_bonus_v32.cjs
node qa/bonus_banner_v31.cjs
./gradlew assemblePreviewRelease assembleProductionRelease bundleProductionRelease lintProductionRelease
```

Il gate delle slot verifica 10.000 transazioni effettive per mondo con registri indipendenti. I controlli browser verificano tutti i 36 tocchi, uscita/riapertura, doppi tocchi, musica, banner, nove formati con/senza inset, centratura e spazio dei comandi. I nuovi controlli Android t/u/v usano tocchi ricavati dall'albero di accessibilità nativo; vengono eseguiti insieme alla verifica banner s su API 31 e API 36 con notch. Gli esiti vanno letti dal run v32 e dal rapporto allegato ai file: un test incompleto non è un successo.

`python3 tools/package_preview_v32.py` genera un HTML autonomo in `../output`, con profilo temporaneo e senza ranking remoto. Non modifica l'APK.

Versione Android 3201 / 1.0.0-v32, min SDK 24, target SDK 36. La preview usa il package `.preview` e unità pubblicitarie di prova. Per il banner commerciale di produzione serve ancora `BN_BANNER_AD_UNIT` con l'ID reale BlastNexa. Il bundle non viene pubblicato automaticamente su Play Console.
