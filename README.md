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

`/visibilita-ai` conserva verifiche manuali con motore, domanda, contesto, data, risposta completa, link condiviso facoltativo e fonti dichiarate. Menzione del nome e fonte Solair sono misure separate: nessuna interpretazione automatica come raccomandazione. Sono confrontate solo prove con lo stesso motore, domanda e contesto. Le verifiche mancanti restano non misurate. L’archivio manuale rimane distinto dalle nuove verifiche API descritte sotto.

### Risposte AI automatiche (livello iniziale)

**Aggiornamento 5 novembre 2026:** la raccolta iniziale senza web è sospesa in produzione (`AI_FREE_TIER_CONFIRMED=false`) dopo il passaggio al piano Gemini a pagamento. Il pilota manuale con ricerca web è documentato in [docs/geo-pilot.md](docs/geo-pilot.md); i venti risultati reali, le fonti e le stime di costo sono consultabili in `/visibilita-ai/confronto`. Nessun cron o pulsante pubblico avvia chiamate del pilota. Il budget cumulativo e le prenotazioni persistono nel database; ricaricare una pagina o rilanciare lo script non ripete le coppie domanda/motore già tentate.

La pagina `/visibilita-ai` interroga `gemini-3.5-flash-lite` con quattro domande pubbliche fisse sul fotovoltaico nazionale, senza suggerire Solair e senza inviare metriche GSC/GA4 o dati dei contatti. Ogni domanda usa una nuova richiesta senza storia; il protocollo `solair-api-no-web-v1` conserva modello, prompt versionato, domanda, risposta, data ed esito in `seo.ai_check_batches` (migrazione 010). Le risposte sono testo semplice, senza esecuzione di HTML o link generati. I nomi dei benchmark sono cercati solo nelle risposte, non inviati al modello.

Configurazione server: `GEMINI_API_KEY` segreta e `AI_FREE_TIER_CONFIRMED=true`, dopo aver verificato in AI Studio che il progetto non abbia fatturazione attiva. Il flag è una conferma operativa, non un controllo via API del piano: non attivare in seguito la fatturazione del progetto senza rivedere la configurazione. La chiave locale dedicata può restare in `.env.ai.local` (ignorato); per gli avvii locali caricarla esplicitamente insieme a `.env.local`. Mai usare un prefisso `NEXT_PUBLIC_`.

Nessuna ricerca Google, tool a pagamento, fallback, retry automatico, scraping di applicazioni o abbonamento aggiunto. Per i nuovi account il piano gratuito dei modelli disponibili non include grounding web: questi sono test di risposte del modello tramite API, **non misure di citazioni web, AI Overviews o presenza nelle applicazioni Gemini/ChatGPT/Perplexity**. Eventuali URL scritti dal modello non sono fonti verificate. Le menzioni possono anche essere negative o inesatte; non sono un punteggio GEO. Risposte fallite, bloccate o troncate restano non misurate. Confronti solo fra campioni completi con stesso modello/protocollo/domande.

`POST /api/ai-checks` richiede sessione operatore con origine valida o credenziali del motore; corpo vuoto `{}`, sito fisso. Usa il lease del sito, massimo sei tentativi di raccolta al giorno italiano e almeno 15 minuti fra avvii. Due richieste alla volta, timeout di 35 secondi ciascuna; quota esaurita o credenziali rifiutate fermano le domande successive. Gli errori del provider non sono salvati in chiaro. `/api/cron/ai` è autenticato e viene controllato quotidianamente alle 05:30 UTC: segue `enabled` e `analysisDays` delle impostazioni del servizio. Un intervallo già coperto non produce nuove chiamate. Il cron esistente SEO e gli snapshot/report SEO restano indipendenti; nessun contenuto AI è stato aggiunto al report in questo step.

Le nuove scritture sono protette dalla sessione operatore e dal controllo dell’origine; le tabelle restano nello schema privato `seo` con RLS. Nessuna nuova dipendenza, credenziale o servizio a pagamento.

## Home operativa precedente

La home `/` presenta tre accessi: Current Status, Analisi SEO/GEO, Impostazioni. La precedente home completa è conservata in `/home2`, con gli stessi componenti, dati e stile; tutte le altre pagine restano disponibili.

Current Status invia un POST esplicito a `/api/home-run` con `mode: "status"`: forza GSC, GA4 ed evidenze, quindi apre `/current-status` con le date delle raccolte e dei dati. Non esegue scansioni dei concorrenti o l’analisi delle opportunità. Analisi SEO/GEO usa `mode: "analysis"`, forza la normale elaborazione completa e apre `/analisi?id=...` sullo snapshot archiviato. La pagina legge risultati e suggerimenti direttamente dallo snapshot, senza checklist o stato dei lavori; i limiti GEO restano espliciti. `/analisi` senza ID legge l’ultimo snapshot validato, prodotto dallo stesso motore in modalità manuale o programmata.

Il run dalla home è disponibile ai visitatori del portale per il solo sito Solair, senza esporre CRON_SECRET: controllo dell’origine, operazioni e parametri fissi, lease esistente e limite persistente di una richiesta ogni cinque minuti per operazione. Gli errori non vengono presentati come aggiornamenti riusciti; i risultati parziali sono indicati. Nessuna operazione è avviata tramite GET o prefetch.

`/impostazioni` mostra frequenza e stato dell’automazione. Solo la sessione operatore può salvare `enabled` e `analysisDays` (1–90 giorni); il resto delle impostazioni del motore resta invariato. L’automazione disattivata ferma i run programmati, ma permette i run manuali espliciti. I report programmati sono consultabili in app; non sono state aggiunte email o API a pagamento.

## Percorso attuale centrato sul report

La home conserva hero e riepilogo dinamico. I tre accessi sono **Genera analisi**, **Report e storico**, **Impostazioni**. Solo il primo avvia un’elaborazione (`mode: analysis`); il secondo apre `/report` senza raccogliere o generare dati. La precedente funzione Current Status resta disponibile negli approfondimenti delle statistiche, con le sue rotte e il suo endpoint, ma non costituisce un prodotto distinto nel percorso principale.

Il menu principale contiene soltanto Panoramica, Report e Impostazioni. `/report` elenca gli snapshot reali di `seo.analysis_snapshots`, con stato, date, periodo e origine, venti per pagina. Ogni voce apre `/analisi?id=...`; la pagina organizza gli stessi dati del motore in sintesi, risultati, interventi prioritari, fonte GEO non misurata e approfondimenti. Le rilevazioni più vecchie restano consultabili anche se alcuni campi editoriali mancavano. Il pulsante PDF usa la stampa del browser, come il documento storico esistente.

Statistiche, ricerca SEO, verifiche AI, baseline e documenti storici sono raggiungibili dal contesto Report. Programmazione e stato delle fonti Google sono in Impostazioni; la gestione delle checklist è raggiungibile negli strumenti interni dopo l’accesso operatore. `/home2` e tutte le pagine precedenti rimangono disponibili. Nessuna funzione SaaS, iscrizione, audit pubblico per URL o nuova configurazione OAuth è stata implementata in questo refactoring.

## Analisi pubblica e confronto con le fonti Google

Il primo livello usa ora il motore `public-url-2`: estrae testi principali, titoli di sezione, domande visibili, collegamenti e contenuti incorporati. Segue anche link interni non elencati nella sitemap, con lo stesso limite, controllo del dominio e protezioni di rete del crawler. Salva documenti, provenienza e valutazione versionata in `seo.technical_batches`; non riscrive i batch storici.

`POST /api/public-audit` raccoglie solo `https://solairgroup.it/`, richiede il permesso CRM Solair SEO in scrittura e non chiama GSC/GA4. Usa il lease del sito e riapre la stessa scansione entro cinque minuti. La UI in `/report/sito` apre il risultato con `?audit=<runId>`; senza parametri legge l’ultima raccolta pubblica. `?id=<snapshotId>` continua a leggere esclusivamente la fonte collegata al report dettagliato. Non c’è ancora un ingresso SaaS per domini arbitrari.

La valutazione separa riscontri documentati (ad esempio destinazioni di contatto con errore HTTP o cifre differenti sulla CER in pagine diverse) e opportunità editoriali nel campione. Le informazioni economiche sono confrontate come affermazioni del sito, non validate come agevolazioni o ritorni reali. Non vengono stimati traffico, keyword, ranking o citazioni AI; i tempi di download HTML non sono Core Web Vitals. Il report completo `rules-5` conserva anche questi rilievi, insieme alle proprie evidenze Google.

Da Report sono disponibili `/report/sito` (ultima raccolta pubblica) e `/report/confronto` (ultimo report dettagliato). Entrambe accettano `?id=` per mantenere il riferimento allo stesso snapshot dettagliato; il sito pubblico accetta anche `?audit=` per le raccolte indipendenti. «Pubblico» descrive la fonte, non un nuovo portale pubblico o una nuova regola di accesso. Nessun nuovo servizio a pagamento, onboarding SaaS o invio esterno.

Quando è richiesto uno snapshot dettagliato, la valutazione pubblica legge esclusivamente la scansione collegata attraverso `sourceRunIds.technical`; non la sostituisce con dati di un’altra data. Non usa metriche degli account né espone il vecchio punteggio euristico. Le scansioni salvano anche H1, tipi JSON-LD, parole HTML e collegamenti interni. Velocità nel browser/Core Web Vitals e citazioni AI restano esplicitamente non misurati.

Il confronto legge esclusivamente il batch `sourceRunIds.evidence` dello stesso report e ne verifica il periodo; non ripiega su dati più recenti. Collega le pagine per percorso normalizzato, mostrando clic, impressioni e sessioni Google/organic attendibili. Righe assenti rimangono non rilevate, distinte dagli zeri restituiti dalla fonte. Osservazioni e performance non sono presentate come prova di causalità o come risultato prima/dopo un intervento. Le vecchie analisi prive di riferimenti alle fonti mostrano uno stato non disponibile. Le viste mantengono il pulsante di stampa/PDF esistente.

## Accesso tramite CRM

Pagine, API e PDF richiedono l’identità del CRM e il permesso autonomo Solair SEO. Il codice operatore precedente è disabilitato. Configurazione, livelli di accesso e procedura di rilascio: [Accesso CRM](docs/crm-access.md).
