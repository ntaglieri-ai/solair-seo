# Confronto pilota Gemini / OpenAI

Stato: preparazione. Nessuna chiamata a pagamento eseguita; adapter non collegati a route, cron o report. Budget autorizzato di consumo: 5 USD complessivi. Non è un budget mensile e non si rinnova.

## Protocollo

Dieci domande identiche (`lib/geo-pilot/protocol.ts`), italiano, mercato nazionale italiano. Otto domande spontanee e due con il nome Solair: le ultime verificano l’accuratezza sul brand e non vanno sommate alle prime come indice di scoperta spontanea. Una richiesta nuova per domanda e fornitore, senza dati GSC/GA4 o contatti.

Gemini 3.5 Flash-Lite con Google Search grounding; GPT-5 mini con web search, una sola chiamata tool e contesto basso. Stesso limite di 2.400 token generati e nessun retry automatico. Misuriamo risposte API, non repliche delle applicazioni consumer.

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

Nessuna selezione definitiva del motore base prima dei risultati. Nessuna attivazione automatica di entrambi i motori nel livello 2. Nessuna modifica al report cliente in questa fase.

Prezzi di riferimento verificati il 5 novembre 2026: Google https://ai.google.dev/gemini-api/docs/pricing ; OpenAI https://developers.openai.com/api/docs/pricing e https://developers.openai.com/api/docs/models/gpt-5-mini . Ricontrollare prima del pilota.
