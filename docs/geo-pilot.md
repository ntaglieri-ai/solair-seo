# Confronto pilota Gemini / OpenAI

Stato: pilota manuale eseguito il 5 novembre 2026. Venti risposte complete (dieci per motore), conservate in `seo.geo_pilot_requests`. Adapter non collegati a route di avvio, cron o report cliente. Budget autorizzato di consumo: 5 USD complessivi. Non è un budget mensile e non si rinnova.

Stima prudenziale senza franchigie: Gemini 0,3010502 USD; OpenAI 0,16895625 USD; totale 0,47000645 USD. Sono stime basate sui token e sulle operazioni native restituite, non la fattura definitiva. Tutte le richieste hanno dati di consumo; nessuna riserva incerta al termine. Non usare questo campione come preventivo garantito per tutti gli utilizzi.

Su otto domande non-brand, zero menzioni spontanee per entrambi i motori. Le due domande esplicite sul brand hanno prodotto descrizioni e citazioni Solair: non vanno presentate come scoperta spontanea. Verifica tecnica delle 153 destinazioni distinte: 143 raggiunte e 10 non raggiunte. Questo controllo non certifica la verità o il supporto di ogni affermazione nella risposta.

Pagina di consultazione: `/visibilita-ai/confronto`, senza pulsante di avvio e senza nuove chiamate AI alla lettura. Riferimenti e testi sono separati dai report SEO già pubblicati.

## Protocollo

Dieci domande identiche (`lib/geo-pilot/protocol.ts`), italiano, mercato nazionale italiano. Otto domande spontanee e due con il nome Solair: le ultime verificano l’accuratezza sul brand e non vanno sommate alle prime come indice di scoperta spontanea. Una richiesta nuova per domanda e fornitore, senza dati GSC/GA4 o contatti.

Gemini 3.5 Flash-Lite con Google Search grounding; GPT-5 mini con web search e contesto basso. L’adapter richiede `maxToolCalls: 1`, ma in alcune risposte il provider ha restituito due operazioni native: la stima le include entrambe. Non trattare il parametro come garanzia di una singola operazione fatturabile. Stesso limite di 2.400 token generati e nessun retry automatico. Misuriamo risposte API, non repliche delle applicazioni consumer.

## Cosa confrontare

- Completezza ed effettivo uso della ricerca, tenendo distinti errori, quota e risposte troncate.
- Menzione di Solair nel testo; non equivale a raccomandazione.
- Citazioni native dei provider, distinte dai link semplicemente scritti dal modello e dalle pagine recuperate ma non citate.
- Verifica dei link citati: raggiungibilità, pagina di destinazione e riscontro del contenuto citato. La sola presenza di una citazione nativa NON certifica una fonte vera o il supporto all’affermazione. I Google redirect possono richiedere la verifica della destinazione prima di attribuirli a un dominio.
- Token, ricerche e costo per risposta. Le tariffe producono una stima prudenziale senza franchigie, non un costo fatturato definitivo. Usage mancante resta sconosciuto, non zero.

## Condizioni prima dell’avvio

1. Confermare fatturazione Gemini e disponibilità del grounding sull’account attuale.
2. Configurare una chiave API OpenAI separata dall’abbonamento ChatGPT e verificarne credito e modello disponibile.
3. Completare il registro persistente delle prenotazioni di spesa prima di ogni chiamata. Errori e timeout con esito economico ignoto mantengono la prenotazione; nessun retry o nuovo pilota ripristina il budget.
4. Verificare i controlli dei fornitori. Un alert non è un tetto rigido. Gemini può eseguire più query in una richiesta: il costo di una chiamata già in corso non si può bloccare dopo averlo osservato. Non dichiarare garantito un tetto assoluto di 5 USD con un semplice contatore applicativo. Se il vincolo non è applicabile con i controlli disponibili, chiarirlo prima di attivare i consumi.
5. Solo dopo: impostare il consenso tecnico `GEO_PAID_PILOT_ENABLED=true` sul processo del pilota, non sul cron o sulle route della produzione.

## Registro e ripetizioni

La migrazione 011 conserva il budget cumulativo, le prenotazioni e gli esiti. Prima di ogni chiamata `reservePilotRequest` blocca la riga budget in transazione, verifica quanto contabilizzato e prenota 0,25 USD. Non avvia nuove richieste oltre la soglia prudenziale di 4 USD, lasciando margine rispetto ai 5 USD autorizzati. Al termine usa la stima arrotondata per eccesso al microdollaro; consumo ignoto o errori mantengono la prenotazione. Una chiave unica (budget, domanda, motore) impedisce di ripetere automaticamente una chiamata dopo errori, timeout o riavvii. Questa guardia non può annullare un costo di provider già in corso.

`npm run geo:pilot` esporta soltanto gli esiti in `.geo-pilot/results.json`, ignorato da Git. `npm run geo:pilot -- --run` tenta solo le coppie non ancora presenti: dopo il pilota completato non esegue nuove richieste. Non creare un nuovo ID budget per ripetere il test senza nuova autorizzazione. `node --conditions=react-server scripts/geo-pilot-sources.mjs` verifica soltanto le pagine citate, senza chiamate AI a pagamento; limiti di dimensione, timeout, redirect e DNS fissato alla connessione proteggono la raccolta. Raggiungibilità e verifica fattuale restano distinte.

Nessuna selezione definitiva del motore base prima dei risultati. Nessuna attivazione automatica di entrambi i motori nel livello 2. Nessuna modifica al report cliente in questa fase.

Prezzi di riferimento verificati il 5 novembre 2026: Google https://ai.google.dev/gemini-api/docs/pricing ; OpenAI https://developers.openai.com/api/docs/pricing e https://developers.openai.com/api/docs/models/gpt-5-mini . Ricontrollare prima del pilota.
