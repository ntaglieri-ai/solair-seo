# Solair SEO

Minimal Next.js project ready for Vercel.

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Motore dati

I dati SEO vengono archiviati in Supabase (Postgres), schema privato `seo`,
collegato al progetto Vercel tramite il Marketplace.

- `db/migrations/*.sql` — schema del database. Applicare con `npm run db:migrate`
  (legge `POSTGRES_URL_NON_POOLING` da `.env.local`; aggiornarlo con `vercel env pull`).
- `lib/engine/collect.ts` — serie giornaliere Search Console e GA4, eventi e score
  on-page. Le serie vengono sostituite per intervallo in transazioni, così le
  rettifiche delle fonti non lasciano righe obsolete. Ogni raccolta è una riga di `seo.runs`.
- `lib/engine/read.ts` — lettura per le pagine.
- `/api/cron/collect` — raccolta automatica ogni giorno alle 05:00 UTC (`vercel.json`),
  protetta da `CRON_SECRET`. Esegue solo i lavori giunti a scadenza.
  Recupero storico: `/api/cron/collect?backfill=486` (16 mesi, il massimo di Search Console).
- `/api/scan` — audit live; il risultato viene archiviato se il dominio è monitorato.

Variabili necessarie: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`,
`CRON_SECRET` e quelle `POSTGRES_*` create dall'integrazione Supabase.

## Raccolta, Analisi E Opportunità

Il motore non richiede inserimenti manuali o una chat aperta. Il controllo
giornaliero Vercel legge la configurazione persistente del sito. Valori iniziali:

| Impostazione | Valore |
| --- | --- |
| Raccolta GSC e GA4 | ogni giorno |
| Controllo tecnico | ogni 7 giorni, massimo 20 pagine |
| Analisi e opportunità | ogni 7 giorni |
| Confronto | ultimi 28 giorni consolidati contro i 28 precedenti |
| Ritardo di consolidamento | 3 giorni |
| Campione minimo query / sessioni | 50 impression / 30 sessioni |

Gli intervalli sono giorni di calendario UTC, non mesi di consulenza. Errori,
configurazioni modificate o analisi incomplete anticipano la rivalutazione.
Una lease sul database impedisce esecuzioni concorrenti; scade in 10 minuti.

- `lib/engine/evidence.ts`: GSC finalizzato per pagina e query/pagina, con paginazione;
  GA4 per pagina di ingresso, limitato a sessioni Google / organic. I limiti di
  soglia, campionamento e fuso orario vengono salvati insieme alle misure.
- `lib/engine/crawl.ts`: HTML e sitemap del dominio, con limiti di tempo, numero di
  pagine e dimensioni; non esegue JavaScript e non è un audit tecnico completo.
- `lib/engine/analyze.ts`: regole deterministiche per CTR, posizioni 11–20,
  variazioni dei clic, verifica del tracciamento contatti e anomalie tecniche.
  `opportunities` contiene solo proposte di intervento sul sito, con evidenze,
  azione concreta ed effetto atteso da verificare (non una promessa di ranking).
  Cali/crescite da interpretare, tracciamento e anomalie tecniche non diagnosticate
  sono invece `checks`: verifiche aperte, escluse dal conteggio degli interventi.
  Attivazione API, report e sviluppo della piattaforma non sono raccomandazioni SEO.
- `seo.analysis_snapshots`: versioni immutabili con periodi, configurazione,
  fonti e limiti. `seo.engine_state` indica la versione corrente validata, anche
  dopo il recupero da un errore. Nessun aggiornamento modifica la baseline 76/100.

GA4 non disponibile rende l'analisi parziale, senza perdere GSC; GSC assente,
obsoleto o non confrontabile blocca le conclusioni. Una riga assente da GSC non
equivale a zero clic. Eventi contatto non equivalgono a lead qualificati e non
vengono attribuiti alle singole keyword. Un'analisi completa indica che le fonti
previste sono utilizzabili, non che il sito sia privo di problemi.

Le soglie di lunghezza del vecchio score restano euristiche, non prescrizioni di
Google. La sola assenza di schema non giustifica un intervento SEO/GEO. Riferimenti:
[titoli](https://developers.google.com/search/docs/appearance/title-link),
[snippet](https://developers.google.com/search/docs/appearance/snippet),
[fondamenti SEO](https://developers.google.com/search/docs/essentials),
[funzionalita AI di Google](https://developers.google.com/search/docs/appearance/ai-features).
Senza evidenze dedicate non vengono generate raccomandazioni GEO validate.

### Amministrazione

`/api/engine`: GET stato, PATCH configurazione, POST esecuzione. Tutte le operazioni
richiedono `Authorization: Bearer CRON_SECRET`; le risposte non sono memorizzabili.
Il comando locale legge il segreto da `.env.local`, senza inserirlo negli argomenti:

```bash
npm run engine -- status
npm run engine -- configure '{"analysisDays":14,"technicalDays":14}'
npm run engine -- run
npm run engine -- run --force
```

`ENGINE_BASE_URL=http://localhost:3002` seleziona un server locale; senza questa
variabile il comando usa la produzione. `enabled:false` sospende le elaborazioni.
Il backfill manuale resta limitato a 486 giorni e al tempo massimo della funzione:
per storici estesi suddividere il recupero in intervalli ragionevoli.

Verifiche: `npm test`, `npm run lint`, `npm run build`.

Restano separati da questa fase: impaginazione/export dei report, invio email,
monitoraggio SERP indipendente, backlink/competitor da provider esterni e GEO/AI
Visibility. Il motore non inventa questi dati e non modifica automaticamente il sito.

# Misurazione SEO e gestione del servizio

La home e le performance usano GA4 `Organic Search`: non il totale di tutti i canali e non soltanto Google. Search Console conserva la propria definizione di clic. Il configuratore è raccolto nelle esecuzioni GA4 in due periodi chiusi di 28 giorni, con tre giorni di attesa; eventi ripetuti non equivalgono a utenti unici. `start_configurator` è ambiguo (link e primo passo); `lead_submit` e `complete_configurator` non vanno sommati. Un errore API o una limitazione di qualità non diventa uno zero attendibile. Nessun invio commerciale di prova viene fatto automaticamente.

Le checklist di `/interventi` sono conservate nel database con revisione e registro delle modifiche. Gli aggiornamenti automatici non cancellano il piano già approvato. I problemi tecnici con attività diverse generano un nuovo incarico. L’accesso di scrittura usa un codice operatore distinto dal segreto del motore e una sessione HttpOnly di otto ore, controllo dell’origine e limite ai tentativi. Per ottenere le istruzioni private sul Mac: `node scripts/operator-access.mjs`. Nessun codice viene aggiunto al repository.

Al completamento viene congelato un riferimento di 28 giorni di dati consolidati del sito. I 28 giorni interi successivi vengono confrontati solo a copertura completa e dopo il consolidamento. Il confronto è un contesto a livello di sito, non una prova causale sulla singola modifica. La verifica è registrata dall’operatore con una nota; non è una promessa di miglioramento automatico.

Il punteggio globale provvisorio di maggio resta distinto dagli score automatici on-page. Alla consegna, pubblicare il primo audit completo validato con `node scripts/audit-score.mjs /percorso/audit.json --publish`. Il JSON deve contenere `date` (YYYY-MM-DD), `score` (0–100), `methodology` (versione dei criteri), `source` (riferimento verificabile all’audit), `startsService: true`. Per i successivi usare `startsService: false`. Il primo audit di servizio esclude maggio dalla vista e avvia il trend. Il grafico collega solo audit con lo stesso metodo; non viene inventato un punteggio globale a partire dalla sola homepage.

## Fonti gratuite: ricerca SEO e visibilità AI

`/ricerca` legge le query aggregate direttamente da Search Console (`dimensions: ["query"]`), aggiornate con le evidenze del motore. Non somma le righe query/pagina. Le assenze restano non rilevate, non zero; privacy, limiti e posizione media sono espliciti. Le rilevazioni rolling sono archiviate con la loro finestra; non sono un rank tracker indipendente. L’operatore può seguire fino a 100 query.

`/ricerca/concorrenti` confronta titoli e descrizioni dell’HTML pubblico di massimo cinque benchmark, massimo tre pagine ciascuno, usando il crawler già protetto contro URL e indirizzi privati. La frequenza segue `technicalDays`; cambiare la selezione attiva richiede una nuova lettura al prossimo giro del motore. Enpal e Otovo sono benchmark dichiarati, con fonti ufficiali, non concorrenti classificati da volumi o SERP. Le coperture parziali restano visibili. Il confronto non genera automaticamente incarichi per differenze che non sono state valutate.

`/ricerca/backlink` importa CSV del report Link di Search Console (max 1 MB / 5.000 righe), tramite “Gestione fonti” e lo stesso accesso operatore delle checklist. Supporta intestazioni inglesi/italiane e `source_url,target_url`; la destinazione può mancare. Deduplica le coppie URL e conserva origine, data e file. Il confronto descrive cambiamenti del campione, non backlink certamente acquisiti o persi. Cambiamenti nella disponibilità delle destinazioni disattivano il confronto. Il report Link non è esposto dalle API Search Console: non esiste un import automatico di questi CSV.

`/visibilita-ai` conserva verifiche manuali con motore, domanda, contesto, data, risposta completa, link condiviso facoltativo e fonti dichiarate. Menzione del nome e fonte Solair sono misure separate: nessuna interpretazione automatica come raccomandazione. Sono confrontate solo prove con lo stesso motore, domanda e contesto. Le verifiche mancanti restano non misurate. Non sono usati file di esempio, API LLM, crediti, abbonamenti, scraping di risposte protette o servizi a consumo.

Le nuove scritture sono protette dalla sessione operatore e dal controllo dell’origine; le tabelle restano nello schema privato `seo` con RLS. Nessuna nuova dipendenza, credenziale o servizio a pagamento.

## Home operativa

La home `/` presenta tre accessi: Current Status, Analisi SEO/GEO, Impostazioni. La precedente home completa è conservata in `/home2`, con gli stessi componenti, dati e stile; tutte le altre pagine restano disponibili.

Current Status invia un POST esplicito a `/api/home-run` con `mode: "status"`: forza GSC, GA4 ed evidenze, quindi apre `/current-status` con le date delle raccolte e dei dati. Non esegue scansioni dei concorrenti o l’analisi delle opportunità. Analisi SEO/GEO usa `mode: "analysis"`, forza la normale elaborazione completa e apre `/analisi?id=...` sullo snapshot archiviato. La pagina legge risultati e suggerimenti direttamente dallo snapshot, senza checklist o stato dei lavori; i limiti GEO restano espliciti. `/analisi` senza ID legge l’ultimo snapshot validato, prodotto dallo stesso motore in modalità manuale o programmata.

Il run dalla home è disponibile ai visitatori del portale per il solo sito Solair, senza esporre CRON_SECRET: controllo dell’origine, operazioni e parametri fissi, lease esistente e limite persistente di una richiesta ogni cinque minuti per operazione. Gli errori non vengono presentati come aggiornamenti riusciti; i risultati parziali sono indicati. Nessuna operazione è avviata tramite GET o prefetch.

`/impostazioni` mostra frequenza e stato dell’automazione. Solo la sessione operatore può salvare `enabled` e `analysisDays` (1–90 giorni); il resto delle impostazioni del motore resta invariato. L’automazione disattivata ferma i run programmati, ma permette i run manuali espliciti. I report programmati sono consultabili in app; non sono state aggiunte email o API a pagamento.
