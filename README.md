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
