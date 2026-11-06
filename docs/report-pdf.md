# Report PDF manuali e automatici

Dalla home, **Genera Report** aggiorna le fonti Google e analizza il sito. Quando l'operatore è autenticato e Gemini è abilitato, prosegue con la scansione Gemini già prevista e soggetta ai budget esistenti. Infine crea il PDF e apre il documento archiviato. Se l'aggiornamento Gemini fallisce, il documento è parziale e mostra le date delle evidenze disponibili.

Da **Report e storico**, **Genera PDF dai risultati disponibili** esporta le ultime evidenze archiviate senza ulteriori richieste ai provider. Dall'analisi SEO si può esportare uno specifico snapshot storico. **Consulta ultimo report** nella hero apre l'ultimo documento PDF.

La programmazione si configura in **Impostazioni**, attivando i report automatici e scegliendo l'intervallo da 1 a 90 giorni. Il dispatcher `/api/cron/reports` è protetto da `CRON_SECRET` e gira ogni giorno alle 06:15 UTC, dopo i dispatcher delle raccolte. Rispetta l'intervallo scelto, il blocco per sito e un'eventuale scansione Gemini in corso. Non avvia chiamate AI: Gemini mantiene la propria cadenza e il proprio budget. Se resta manuale, nei PDF automatici compare la data dell'ultima rilevazione Gemini disponibile.

Manuale e automatico usano `generateReportDocument` e lo stesso formato. La chiave del documento comprende versione del modello PDF, snapshot SEO, scansione Gemini e un eventuale aggiornamento fallito. Fonti identiche riusano lo stesso file. Il PDF include risultati Google, entrambi i periodi di confronto, campione Gemini, interventi SEO, opportunità da verificare e fonti; non include costi dei provider o un nuovo punteggio inventato.

Le migrazioni 014 e 015 archiviano in Postgres il PDF, il contenuto congelato, l'hash SHA-256 e lo stato della sola programmazione PDF. Una generazione manuale non rimanda la prossima automatica. Un errore di generazione non avanza la scadenza; il dispatcher ritenta alla successiva esecuzione. Le date delle fonti restano distinte dalla data di generazione del documento.

Il download restituisce il file archiviato, senza ricalcolarlo. I documenti non vengono inviati per email: sono consultabili e scaricabili dall'app, con gli stessi confini di accesso già presenti. Non vengono introdotti account multi-cliente o nuovi servizi a pagamento.
