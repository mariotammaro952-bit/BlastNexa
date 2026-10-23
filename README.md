# BlastNexa: Block Puzzle — v27

Android API 24–36. 2.000 livelli Avventura in quattro ambientazioni, 400 cruciverba, modalità extra, slot a tre mondi con premi virtuali e profilo giocatore. Classifica online facoltativa con replay delle mosse sul server, coda offline, codice di recupero, segnalazioni, blocchi ed eliminazione del profilo.

## Novità v27 — monete giornaliere e inviti automatici (23 ottobre 2026)

- Slot a schermo intero: scena più ampia, cornice dorata e personaggio a destra; la fascia blu inferiore è eliminata e il banner occupa una sede nel pannello dei comandi.
- **100 monete virtuali ogni nuovo giorno**, conservando quelle rimaste. Puntata x1: una moneta per linea; 1, 5 o 10 linee colorate costano 1, 5 o 10 monete per giro o rilancio. A saldo zero un video completato aggiunge altre 100 monete. Premi in **vite** per il puzzle. I giri bonus Cristallo sono gratuiti. Nessun acquisto o valore in denaro reale.
- Tre inviti nativi **automatici**, alle 09:00, 14:00 e 20:30 locali, dopo la prima apertura. Nessun selettore nel gioco. Android 13+ richiede il permesso notifiche; il programma viene ripristinato dopo riavvio, aggiornamento, cambio di orario o fuso. Gli allarmi rispettano i ritardi imposti dal risparmio energetico Android.
- Monete, risultato e vite vinte sono salvati insieme prima degli effetti. Migrazione dei vecchi salvataggi senza azzerare vite, progressi o premi.
- Nuova icona originale con blocchi lime, ciano e fucsia su fondo viola acceso: risorse adattive e legacy, con sorgente in `artwork/` e generatore `tools/prepare_icons.py`.
- GIRA, monete, VITE VINTE, vite totali e AUTO sono visibili sui telefoni compatti. Le opzioni secondarie scorrono nella colonna sinistra.
- Avvio orizzontale, tre mondi e motore **5 rulli × 3 righe**, bonus e pausa ogni 50 giri; puzzle e cruciverba conservano la disposizione orizzontale.
- Versione Android **1.0.0-v27 / 2701**. Eseguire `python3 tools/prepare_assets.py` prima della compilazione. La firma usa la chiave di caricamento già in uso.

## Compilazione

Richiede JDK 17 e Android SDK 36. Il wrapper fissa Gradle 8.11.1 e il suo SHA256; AGP 8.10.1. `python3 tools/prepare_assets.py` prepara le risorse dal sorgente completo `game/index.html`.

```
./gradlew assemblePreviewRelease bundleProductionRelease
./gradlew connectedPreviewDebugAndroidTest
```

`preview` usa solo unità pubblicitarie di test e pacchetto `com.blastnexa.blockpuzzle.preview`. `production` usa il pacchetto Play esistente `com.blastnexa.blockpuzzle`, codice versione 2701 e le unità interstitial/rewarded autorizzate. La frequenza slot resta 50 giri complessivi, inclusi giri bonus e respin.

Il banner di produzione è disattivato se manca `BN_BANNER_AD_UNIT`: non viene usato un ID di prova nella release. Impostare un’unità banner dell’account `ca-app-pub-7428534984744854` prima della compilazione per monetizzare lo spazio già presente.

Per firmare: variabili `BN_KEYSTORE_PATH`, `BN_STORE_PASSWORD`, `BN_KEY_ALIAS`, `BN_KEY_PASSWORD`. La chiave privata resta fuori dal repository. In CI nessuna chiave di caricamento viene trasferita: gli AAB non firmati prodotti dai runner sono solo verifiche di compilazione. Usare per Play l’AAB finale firmato consegnato.

## Servizio online

- Privacy: https://blastnexa-online.mariotammaro952.chatgpt.site/privacy
- Assistenza privata: https://blastnexa-online.mariotammaro952.chatgpt.site/assistenza
- Eliminazione: https://blastnexa-online.mariotammaro952.chatgpt.site/elimina-profilo
- Regole: https://blastnexa-online.mariotammaro952.chatgpt.site/regole
- Moderazione: `/moderazione`, accessibile solo all’account proprietario del sito tramite identità verificata da Sites.

Il client non contiene segreti server. Codici profilo 256 bit, memorizzati come hash sul server; solo il miglior risultato per livello può contribuire alla classifica. `server/` contiene il verificatore, l’API e lo schema SQLite del servizio. Il sito distribuito e il suo database sono gestiti nel progetto Sites dedicato.

## Verifiche riproducibili

```
node qa/coins.cjs
node qa/all_levels.cjs game/index.html
node qa/qa_arcade.cjs
node qa/qa_spectra.cjs
node qa/qa_odyssey.cjs
node qa/other_games.cjs
node qa/unlimited_modes.cjs
node qa/soak.cjs
node --experimental-sqlite qa/d1.mjs
```

I test JavaScript usano il codice di produzione con adattatori DOM/clock. I test strumentali verificano Android WebView, ciclo di vita, richiesta HTTPS nativa e recupero del renderer. L’opzione Intent `bn_qa_no_ads` è accettata solo quando `BuildConfig.DEBUG` è vero. Nessun annuncio reale viene richiesto o cliccato durante i test.

Il catalogo, le illustrazioni e la musica del gioco precedente sono conservati. Il breve effetto `faaah.mp3` è stato fornito dal titolare; i diritti di distribuzione devono essere confermati da lui prima della pubblicazione. Nessun asset o codice dell’APK di slot usato come riferimento è stato importato.


## Anteprima e compatibilità v27

`npm run dev -- --host 0.0.0.0 --port 4173 --strictPort` prepara i file generati e avvia l’anteprima; `/device` offre cinque dimensioni di controllo. Il CSS e il JS esterni sono copiati nella WebView da `prepare_assets.py`, insieme al personaggio originale in `game/assets/`. Il generatore applica i collegamenti e la versione al catalogo HTML, scrivendo soltanto file cambiati e tramite sostituzione atomica.

La nuova composizione usa rulli centrali, opzioni scorrevoli laterali e comandi in basso. Puzzle e cruciverba sfruttano l’altezza disponibile; il rack delle parole e le definizioni scorrono nella colonna destra. La resa dei blocchi include un fallback per WebView senza `color-mix`, e i test nativi verificano che griglia e pezzi abbiano una superficie colorata. `design-qa.md` documenta il confronto visivo e i formati verificati.
