# BlastNexa — Piano operativo di crescita e monetizzazione (fase laboratorio)

## Guardrail

- La release di Test chiuso sul ramo `main` resta **senza annunci e senza analytics online**.
- Il ramo sperimentale non va caricato su Google Play prima di revisione privacy, Data safety, consenso e test Android reali.
- Le statistiche locali opzionali non forniscono DAU, D1 e D7 globali: i report valgono un singolo dispositivo, e ogni tester deve scegliere volontariamente se attivarle.
- Pubblicità: niente annunci nel mezzo di una mossa. Priorità a rewarded solo dopo azione dell'utente e premio correttamente confermato. Non promettere una vita aggiuntiva se il codice non la assegna.
- Non inserire identificativi AdMob reali finché l'app non è creata in AdMob, UMP configurato e verifica privacy completata. In debug usare solo ID di test ufficiali.

## Fase 1 — Chiusura test (14+ giorni)
- Eseguire il test chiuso con la versione Play Console tecnicamente accettata e stabile.
- Chiedere al servizio di test cinque percorsi minimi: tutorial/prima partita; 10 partite classiche; 15 livelli Avventura; mosaic/circuit; uscita e rientro/annulla.
- Raccogliere per ciascun problema: modello telefono, versione Android, build, modalità, passi per riprodurre, risultato atteso/ottenuto, screenshot/video.
- Osservare crash e risultati dei test pre-lancio. Non confondere test automatici con DAU.

## Fase 2 — Diagnostica retention
- Scopo: D1 = utenti che tornano nel giorno di calendario dopo l'installazione; D7 = utenti che tornano 7 giorni dopo. Sono misure aggregate per coorte, non misure per singolo telefono.
- Eventi proposti: app_first_open, session_start, game_start, move, line_clear, game_over, level_complete, rewarded_offer, rewarded_start, rewarded_earned, ad_impression; senza inviare la griglia o dati personali.
- La versione Growth Lab integra *solo contatori locali opzionali* (off di default). Se si vuole telemetria aggregata serve un provider, il suo consenso laddove richiesto, privacy aggiornata e app aggiornata.
- Obiettivi **sperimentali**, non garanzie: D1 >=25%, D7 >=7%, sessione media >=6 minuti; definire campioni statisticamente significativi prima di decidere.

## Fase 3 — Monetizzazione graduale (ordine)
1. Rewarded opt-in per un bonus che il motore concede **solo dopo `onUserEarnedReward`**; una sola continuazione per partita e niente obbligo di guardare.
2. Interstitial solo dopo la schermata risultato: non alla prima sessione, max 1 ogni 3 partite e almeno 180 secondi fra annunci; validare la frequenza con la retention.
3. Banner solo in menu/risultato se non ruba spazio a griglia o tocchi. Mai forzare refresh a 5 s.
4. No-Ads IAP facoltativo *solo dopo* l'integrazione di Google Play Billing e un controllo dei costi.
5. Mediazione multi-network solo oltre un volume stabile di impression; prima AdMob semplice.

## Fase 4 — Acquisizione
- Tre varianti video organico: soluzione di una griglia quasi impossibile (senza soluzione artefatta); doppia linea combo; Circuit con quattro nodi.
- Playable HTML5 standalone in `playable/index.html` → ZIP. **Non è ancora convalidato dal validatore Google Ads**; CTA usa `ExitApi.exit()` solo quando nell'ambiente pubblicitario.
- Eseguire esperimento scheda Play Store: originale icona vs alternativa A; primo screenshot Classica vs Circuit. Una sola variabile modificata per esperimento, almeno 7 giorni e analisi significatività.
- Budget test iniziale solo dopo stabilità e retention; non presumere redditività dalle installazioni.

## Fase 5 — Dati economici e go/no-go
- `ARPDAU = revenue / utenti attivi giornalieri`
- `LTV >= CPI` è criterio minimo (aggiungere rischio, commissioni e costi operativi): se LTV <= CPI fermare o correggere creatività/segmentazione.
- Escludere dal modello qualsiasi ricavo non misurato. Monitorare retention con e senza annunci: se cala sensibilmente, ridurre gli ad break.

## Gate prima di monetizzare
- [ ] AdMob app e unit ID configurati nell'account dello sviluppatore
- [ ] UMP e CMP configurati e verificati per SEE/UK/Svizzera
- [ ] Scheda Play Store, privacy policy e modulo Sicurezza dei dati aggiornati
- [ ] Classificazione fascia d'età e norme famiglie verificate
- [ ] app-ads.txt sull'host che corrisponde al sito sviluppatore del Play Store
- [ ] SDK integrata solo con ID test nel debug, nessuna impression reale durante sviluppo
- [ ] QA fisico Android, ANR, crash, prestazioni, frequency caps e premi
- [ ] Nuova build AAB firmata con chiave esistente e versione incrementata