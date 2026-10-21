# BlastNexa: Block Puzzle — v23

Android API 24–36. 2.000 livelli Avventura in quattro ambientazioni, 400 cruciverba, modalità extra, slot a tre mondi con premi virtuali e profilo giocatore. Classifica online facoltativa con replay delle mosse sul server, coda offline, codice di recupero, segnalazioni, blocchi ed eliminazione del profilo.

## Compilazione

Richiede JDK 17 e Android SDK 36. Il wrapper fissa Gradle 8.11.1 e il suo SHA256; AGP 8.10.1. `python3 tools/prepare_assets.py` prepara le risorse dal sorgente completo `game/index.html`.

```
./gradlew assemblePreviewRelease bundleProductionRelease
./gradlew connectedPreviewDebugAndroidTest
```

`preview` usa solo unità pubblicitarie di test e pacchetto `com.blastnexa.blockpuzzle.preview`. `production` usa il pacchetto Play esistente `com.blastnexa.blockpuzzle`, codice versione 2301 e le unità interstitial/rewarded autorizzate. La frequenza slot resta 50 giri complessivi, inclusi giri bonus e respin.

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
