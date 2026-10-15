# BlastNexa Beta 3 — integrazione AdMob di test

Base: commit 5944728, Beta 2 / versionCode 12. L'HTML nell'APK fornito è identico al sorgente di quella revisione. Il laboratorio GrowthLab resta separato; nessuna sostituzione del gameplay con la demo.

Nuova versione: 1.0.0-beta3-admob-test, versionCode 13, minSdk 24, targetSdk 36.

## Comportamento

- Classica: alla prima sconfitta si può scegliere un annuncio con premio per liberare il quadrato centrale 3×3 e ricevere tre pezzi singoli, senza punti aggiuntivi. Una continuazione per partita, salvata con la sessione. Si può sempre terminare senza pubblicità.
- Il premio viene assegnato solo dopo il callback nativo di ricompensa e la chiusura dell'annuncio. Errori, annuncio non pronto o chiusura anticipata non assegnano premi.
- Interstitial al pulsante di nuova partita/prossimo livello sulla schermata risultati: non prima di tre transizioni, almeno 180 secondi dall'avvio e dall'ultimo annuncio. Nessuna attesa se l'annuncio non è già disponibile.
- UMP aggiornato a ogni avvio; nessuna inizializzazione Ads prima di canRequestAds(). Preferenze privacy accessibili quando richieste.
- WebView limitata al gioco incorporato; navigazione esterna e risorse remote bloccate.
- Nessun banner o annuncio all'apertura.

## Configurazione

App: ca-app-pub-7428534984744854~6791579488
Rewarded produzione: ca-app-pub-7428534984744854/7070781083
Interstitial produzione: ca-app-pub-7428534984744854/2281488833

LIVE_ADS=false sia per debug sia per release: si usano gli ID di test Google. Non genera ricavi. Il flag non cambia automaticamente con la firma.

SDK: GMA Next-Gen 1.5.0 e UMP 4.0.0, secondo documentazione Google consultata il 15 ottobre 2026.

## Verifica e prossimi passi

Superati: sintassi script, catalogo identico di 2000 livelli, flusso premio riuscito/fallito/duplicato, callback di vecchia partita ignorato, limite di una continuazione, ripartenza offline, attesa di chiusura interstitial prima della partita.

Da completare: compilazione Android in GitHub Actions e test su dispositivo dei callback SDK, consenso, audio e ripresa dell'app. Non è ancora un APK verificato.

Il workflow sul branch codex/admob-beta3 genera APK debug e AAB NON firmato. L'AAB non firmato non va caricato in Play Console. Per firmare un aggiornamento serve la stessa upload key già usata, tramite i secret BN_* o firma offline; nessuna chiave è stata recuperata dai bundle.

Prima di annunci reali: configurare il messaggio per regolamenti europei in AdMob → Privacy e messaggi; confermare il pubblico per età; rivedere informativa e dichiarazioni Play per gli SDK aggiunti; completare test reali. I file privacy modificati in questo branch non sono ancora pubblicati sul sito.
