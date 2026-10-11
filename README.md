# BlastNexa — Block Puzzle
Versione 1.0 Beta (11 ottobre 2026)

Gioco puzzle Android originale, offline, basato su un motore HTML5 incorporato in una WebView Android.

## Novità della Beta
- **Generazione dei pezzi più equa:** esamina due posizionamenti in sequenza (ricerca limitata) prima di consegnare i nuovi tre pezzi nelle modalità non guidate, senza impedire il Game Over.
- **Nexa Coach:** nuovo pulsante AIUTO che evidenzia una mossa valida. Non consuma pezzi, non altera il punteggio e non gioca al posto dell'utente.
- **Annulla persistente:** riaprendo una partita, l'ultima mossa resta annullabile quando erano disponibili cariche.
- **Miglioramenti ergonomici:** adattamento dei tre poteri a schermi compatti, anteprima con contrasto e rispetto della preferenza vibrazione.
- **Conservazione completa:** Classic, Adventure (2.000 livelli/20 mondi), Daily, Mosaic, Circuit, Trofei e Studio.

## Build Android
Il workflow GitHub Actions `.github/workflows/android-debug.yml` produce automaticamente:
1. `BlastNexa-v1.0-Beta-debug-apk` da installare su Android per le prove.
2. `BlastNexa-v1.0-Beta-UNSIGNED-aab` **NON caricabile su Play Console senza firma**.

La firma release richiede una chiave di caricamento privata, che **non deve essere caricata su GitHub**. Per aggiornare un'app già pubblicata usare la stessa upload key della versione precedente. `versionCode=11`, `targetSdk=36`.

La privacy policy pubblica è in `docs/privacy.html` e disponibile offline nelle Impostazioni del gioco.

## Test
Il catalogo dei 2.000 livelli è immutato e validato. I test Playwright nel progetto di sviluppo includono rendering a 650/730/852 px, controlli Game Over e salvataggi, Nexa Coach, quattordici prove Avventura e partite simulate. Queste prove **non sostituiscono i test fisici su Android**.

## Controlli prima della pubblicazione
Aprire l'APK su smartphone, verificare trascinamento e precisione touch, performance, Annulla dopo chiusura, interruzioni e audio, poi firmare l'AAB e inviare a un test chiuso di Google Play.
