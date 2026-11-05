# Livello 2: SEO e presenza nelle risposte Gemini

## Uso nell’app

- Con accesso operatore e Gemini attivo, “Genera il report” dalla home aggiorna prima SEO/Google e poi Gemini, mostrando la lettura congiunta.
- Home → “Analizza la presenza di Solair su Gemini” → `/visibilita-ai`.
- Consultazione libera degli esiti archiviati; accesso operatore richiesto per consumi e preferenze.
- “Analizza” avvia dieci domande; “Riprendi” completa lo stesso lavoro, anche dopo la chiusura della pagina.
- Risultati: scoperta spontanea (8 domande), conoscenza del brand (2), citazioni, concorrenti configurati, risposte integrali, fonti e ricerche effettuate.
- Gli interventi SEO derivano dallo snapshot SEO congelato all’avvio. Gli incroci per tema con Gemini non sono una prova causale.
- Le opportunità AI restano distinte dagli interventi già sostenuti dai dati. I redirect irrisolti non diventano prove di assenza.
- Impostazioni → Presenza su Gemini: attivazione, solo manuale / 7 / 14 / 30 giorni, budget mensile e per analisi in USD.
- Nessuna modifica al contenuto o all’export dei report SEO esistenti. Il pilota e la precedente raccolta senza web restano in archivio separato.

## Attivazione ambiente

1. Applicare `npm run db:migrate` (012 e 013, additive).
2. Configurare `GEMINI_API_KEY` lato server e `GEO_LEVEL2_ENABLED=true` nell’ambiente desiderato. Mai usare prefissi NEXT_PUBLIC.
3. Conservare `AI_FREE_TIER_CONFIRMED=false`: il vecchio collector senza web non deve riattivarsi dopo il passaggio a pagamento.
4. Abilitare il sito nelle impostazioni. Frequenza iniziale su richiesta; la scelta di una frequenza automatica è esplicita.
5. `CRON_SECRET` protegge `/api/cron/geo`, controllato ogni giorno alle 05:45 UTC. La modalità manuale restituisce sempre `not_due`, anche in presenza di una scansione aperta.

OpenAI resta escluso dal livello base: serve un’attivazione separata `GEO_OPENAI_ENABLED=true` oltre alla configurazione del relativo sito. Non abilitarlo per il cliente base.

## Budget e ripresa

Prenotazione atomica sul mese e sulla scansione prima di ogni chiamata. Margine applicativo del 20%; riserva standard di 0,25 USD. I costi sono calcolati dai metadati secondo il listino, senza assumere franchigie; non sono una fattura né un limite imposto dal provider. Consumo ignoto mantiene la riserva intera. Nessun retry automatico delle richieste AI.

Il lease condiviso con il motore SEO impedisce avvii concorrenti sul sito. Ogni invocazione aspetta tutte le richieste attive prima di liberarlo. Le scansioni aperte non scadono al passaggio giornaliero. Il Cron completa più lotti entro un tempo massimo prudenziale; se necessario continua il giorno successivo. Le fonti già raccolte vengono elaborate anche dopo uno stop di budget.

I confronti richiedono due scansioni complete con identiche domande, intenti, motore, modello e protocollo. La variabilità delle risposte non dimostra l’effetto di un intervento sul sito.

## Verifiche

`npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
Le prove automatiche non effettuano chiamate AI. Due verifiche reali hanno raccolto 20 risposte Gemini complete, con costo stimato complessivo 0,573926 USD. La seconda ha verificato il percorso dalla home: aggiornamento Google/SEO, raccolta Gemini e confronto storico. Questi campioni sono separati dal pilota.

Verificati anche prenotazione, idempotenza, riduzione del budget e disattivazione durante la scansione sul database reale, all’interno di una transazione annullata senza chiamate al provider.
