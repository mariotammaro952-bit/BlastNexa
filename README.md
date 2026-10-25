# BlastNexa v31 — musica bonus e banner centrale

Gioco Android orizzontale, con 2.000 livelli Avventura, quattro temi, 400 cruciverba e tre slot Tempio, Cristallo e Forgia. Il saldo è virtuale: monete e vite.

La v31 conserva la sequenza SUPERNOVA, il tasto GIRA neon e i giri senza la precedente pausa video ogni 50. Big Win Now parte quando si apre il bonus, riparte dall’inizio a ogni evento e si ferma con CONTINUA, uscita o perdita di focus. La musica originale di ogni mondo riprende dopo il bonus. Il banner occupa la fascia centrale sotto i rulli e viene nascosto durante la sequenza a tutto schermo. Lo stile della vecchia anteprima che nascondeva tutti i banner è stato rimosso.

## Preparare e compilare

Eseguire sempre la preparazione: il file di base viene aggiornato in modo ripetibile dalla ricetta `tools/upgrade_game_v31.py`, inclusa la musica fornita dall’utente. L’operazione è idempotente.

```bash
python3 tools/prepare_assets.py
python3 tools/verify_release_inputs.py
./gradlew assemblePreviewRelease assembleProductionRelease bundleProductionRelease lintProductionRelease
```

La versione Android è 3101 / 1.0.0-v31, SDK minimo 24 e target 36. I pacchetti sono `com.blastnexa.blockpuzzle.preview` per le prove e `com.blastnexa.blockpuzzle` per la produzione. Usare la chiave di upload già esistente per firmare; non è inclusa nel repository.

Le build preview usano unità Google di prova. Per il banner commerciale occorre impostare `BN_BANNER_AD_UNIT` con l’unità di BlastNexa prima della compilazione. Se manca, la produzione non carica un banner commerciale; interstitial e rewarded mantengono gli ID già configurati. La generazione di una build non la pubblica su Play Console.

## Verifiche ripetibili

```bash
node qa/slot_economy_v28.cjs
node qa/coins.cjs
node qa/all_levels.cjs game/index.html
node qa/other_games.cjs
node qa/unlimited_modes.cjs
node qa/fresh_start_v29.cjs
node qa/soak.cjs
```

Il controllo dell’economia richiede 10.000 transazioni reali del motore per ciascun mondo, con registri indipendenti di monete e vite, bonus, rilanci, addebiti, riaperture e doppi tocchi. Le simulazioni del motore non equivalgono a prove su dispositivo.

Per il collaudo browser di musica e banner installare Playwright e Chromium, poi eseguire `node qa/bonus_banner_v31.cjs`. `BN_QA_CHROMIUM` permette di scegliere un eseguibile Chromium già disponibile. Il controllo usa clic reali, riproduzione WebAudio, stati dei bonus e geometria in sette formati.

Il workflow `v31-bonus-banner.yml` compila e verifica i pacchetti completi. `v31-native-confirmation.yml` confronta gli asset dei binari già compilati ed esegue 17 controlli nativi su Android 31 e 36, telefoni, notch e tablet. Le prove native usano emulatori da 4 GB dopo la disconnessione dei precedenti emulatori da 2 GB. I risultati effettivi e le eventuali interruzioni sono nei log del singolo run; non dedurre un esito dal solo avvio del workflow.

La consegna v31 comprende APK di prova aggiornabile dalla v30, APK release e AAB firmato per Play Store. Il rapporto di consegna indica le verifiche completate e quelle rimaste aperte.
