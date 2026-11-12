# Generazione dei report

Il menu **Report** apre `/report`: la stessa pagina contiene **Nuovo report** e **Report precedenti**. Anche **Genera report** in Panoramica porta al modulo di questa pagina, senza avviare operazioni al caricamento.

Scegliere **Report iniziale (Start-up)** per una fotografia degli ultimi 28 giorni disponibili, anche quando esistono documenti di prova. **Aggiornamento** copre i giorni successivi all’ultimo documento e richiede almeno tre giorni nuovi. La scelta viene trasmessa esplicitamente al generatore PDF.

Premere **Genera report** aggiorna le fonti Google, analizza il sito, raccoglie Gemini se abilitato e infine archivia il PDF. Lo stato di avanzamento rimane visibile e il pulsante è disabilitato durante la generazione. Gli errori delle fonti vengono conservati come limiti del documento. La generazione richiede il permesso CRM di scrittura; chi ha sola lettura può aprire e scaricare i documenti.

Il download apre sempre il file archiviato. I dettagli delle analisi e le fonti sono raccolti in sezioni espandibili; la stampa di uno snapshot specifico rimane disponibile nel suo approfondimento.

La programmazione si configura in **Impostazioni**, attivando i report automatici e scegliendo l'intervallo da 1 a 90 giorni. Il dispatcher `/api/cron/reports` è protetto da `CRON_SECRET` e gira ogni giorno alle 06:15 UTC, dopo i dispatcher delle raccolte. Rispetta l'intervallo scelto, il blocco per sito e un'eventuale scansione Gemini in corso. Non avvia chiamate AI: Gemini mantiene la propria cadenza e il proprio budget. Se resta manuale, nei PDF automatici compare la data dell'ultima rilevazione Gemini disponibile.

Manuale e automatico usano `generateReportDocument` e lo stesso formato. La chiave del documento comprende versione del modello PDF, snapshot SEO, scansione Gemini e un eventuale aggiornamento fallito. Fonti identiche riusano lo stesso file. Il PDF include risultati Google, entrambi i periodi di confronto, campione Gemini, interventi SEO, opportunità da verificare e fonti; non include costi dei provider o un nuovo punteggio inventato.

Le migrazioni 014 e 015 archiviano in Postgres il PDF, il contenuto congelato, l'hash SHA-256 e lo stato della sola programmazione PDF. Una generazione manuale non rimanda la prossima automatica. Un errore di generazione non avanza la scadenza; il dispatcher ritenta alla successiva esecuzione. Le date delle fonti restano distinte dalla data di generazione del documento.

Il download restituisce il file archiviato, senza ricalcolarlo. I documenti non vengono inviati per email: sono consultabili e scaricabili dall'app, con gli stessi confini di accesso già presenti. Non vengono introdotti account multi-cliente o nuovi servizi a pagamento.
