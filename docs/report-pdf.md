# Generazione dei report

Il menu **Report** apre `/report`: la stessa pagina contiene **Nuovo report** e **Report precedenti**. Anche **Genera report** in Panoramica porta al modulo di questa pagina, senza avviare operazioni al caricamento.

Scegliere **Report iniziale (Start-up)** per una fotografia degli ultimi 28 giorni disponibili, anche quando esistono documenti di prova. **Aggiornamento** copre i giorni successivi all’ultimo documento e richiede almeno tre giorni nuovi. La scelta viene trasmessa esplicitamente al generatore PDF.

Premere **Genera report** aggiorna le fonti Google, analizza il sito, raccoglie Gemini se abilitato e infine archivia il PDF. Lo stato di avanzamento rimane visibile e il pulsante è disabilitato durante la generazione. Gli errori delle fonti vengono conservati come limiti del documento. La generazione richiede il permesso CRM di scrittura; chi ha sola lettura può aprire e scaricare i documenti.

Il download apre sempre il file archiviato. I dettagli delle analisi e le fonti sono raccolti in sezioni espandibili; la stampa di uno snapshot specifico rimane disponibile nel suo approfondimento.

La programmazione si configura in **Impostazioni**, attivando i report automatici e scegliendo l'intervallo da 1 a 90 giorni. Il dispatcher `/api/cron/reports` è protetto da `CRON_SECRET` e gira ogni giorno alle 06:15 UTC, dopo i dispatcher delle raccolte. Rispetta l'intervallo scelto, il blocco per sito e un'eventuale scansione Gemini in corso. Non avvia chiamate AI: Gemini mantiene la propria cadenza e il proprio budget. Se resta manuale, nei PDF automatici compare la data dell'ultima rilevazione Gemini disponibile.

Manuale e automatico usano `generateReportDocument` e lo stesso formato. La chiave del documento comprende versione del modello PDF, snapshot SEO, scansione Gemini e un eventuale aggiornamento fallito. Fonti identiche riusano lo stesso file. Il PDF include risultati Google, entrambi i periodi di confronto, campione Gemini, interventi SEO, opportunità da verificare e fonti; non include costi dei provider o un nuovo punteggio inventato.

Le migrazioni 014 e 015 archiviano in Postgres il PDF, il contenuto congelato, l'hash SHA-256 e lo stato della sola programmazione PDF. Una generazione manuale non rimanda la prossima automatica. Un errore di generazione non avanza la scadenza; il dispatcher ritenta alla successiva esecuzione. Le date delle fonti restano distinte dalla data di generazione del documento.

Il download restituisce il file archiviato, senza ricalcolarlo. La generazione manuale non invia email: l’invio si avvia con il comando separato nella pagina del documento. I report programmati possono essere inviati dal CRM, solo quando l’invio automatico è abilitato nelle impostazioni. Non vengono introdotti account multi-cliente o nuovi servizi a pagamento.


## Salvataggio automatico Nextcloud

Ogni nuovo PDF, manuale o programmato, viene salvato nella cartella configurata in CRM Settings → AI Features → SolairSEO (attualmente `Solair/Report-SolairSEO`). Il generatore usa il bridge firmato `/api/auth/seo/archive`, che accetta esclusivamente l’identificativo di un report e non può inviare email o scegliere una destinazione diversa. La cartella vuota disattiva l’archiviazione.

La migrazione `20261113072840_report_nextcloud_archive.sql` aggiunge una coda privata: un trigger inserisce la richiesta nella stessa transazione del PDF. Il primo tentativo avviene durante la generazione; gli errori restano in coda, con lease a scadenza e fino a due ritentativi per esecuzione del cron giornaliero. Il caricamento è idempotente: accetta lo stesso PDF già presente, senza sovrascrivere un file diverso. Nessun recupero massivo dei documenti precedenti.

La pagina del documento mostra il percorso solo dopo conferma del salvataggio; in caso di errore mostra lo stato in attesa e permette un nuovo tentativo manuale. Il PDF resta consultabile anche quando Nextcloud è temporaneamente indisponibile.

Le email manuali e automatiche usano il nome **Solair WebSite SEO Report** e il mittente tecnico `no-reply@solairgroup.it`, sul dominio SES già verificato. Il testo invita a non rispondere; l’indirizzo resta visibile nei dettagli del messaggio. Il blocco delle risposte dipende dalla configurazione del server di posta in ingresso e non è garantito dal mittente no-reply.


## Sezioni Google nel modello v4

Il PDF mantiene copertina, colori e componenti grafici precedenti e aggiunge due pagine GSC (andamento giornaliero, query e URL principali, ricerche con/senza nome Solair) e una sezione Analytics dedicata a Google/organic (sessioni, coinvolgimento, clic di contatto e invii del configuratore per pagina di ingresso). Non mostra il bollino di completezza in copertina: gli stati e i limiti restano nel documento e nell’app.

`collectReportMetrics` raccoglie query, pagine, serie giornaliera GSC e pagine di ingresso GA4 sulle date esatte del documento e dell’eventuale confronto. GSC include i dati recenti come la raccolta giornaliera già esistente; conserva e mostra `firstIncompleteDate`. I totali usano la serie giornaliera, non la somma delle query visibili. Le metriche vengono congelate nel payload e partecipano alla chiave del PDF: il download non consulta le API. Le richieste manuali e programmate usano lo stesso percorso e non eseguono nuove chiamate AI durante l’esportazione.

La tabella GSC mostra URL completi per distinguere sottodomini e varianti HTTP/HTTPS della proprietà. GA4 è filtrato per sorgente google e mezzo organic: non equivale a tutti i canali né all’intero canale Organic Search. Gli invii `lead_submit` sono separati dai clic WhatsApp/telefono/email per evitare doppi conteggi. Soglie privacy, campionamento e dati mancanti restano espliciti; non si attribuiscono lead CRM alle query. Le proposte conservano il periodo della loro analisi originaria, indicato nel capitolo interventi.

`prepareReportRevision` prepara una revisione di un PDF esistente mantenendo periodo, snapshot SEO e scansione Gemini. Il salvataggio avviene tramite `persistReportDocument` con trigger manuale, dopo la verifica del file: archivia anche su Nextcloud, senza inviare email.
