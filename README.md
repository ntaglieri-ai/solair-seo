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
- `lib/engine/collect.ts` — raccolta: Search Console (serie giornaliera, query e
  pagine principali) e analisi on-page con score. Ogni raccolta è una riga di `seo.runs`.
- `lib/engine/read.ts` — lettura per le pagine.
- `/api/cron/collect` — raccolta automatica ogni giorno alle 05:00 UTC (`vercel.json`),
  protetta da `CRON_SECRET`. On-page al massimo una volta a settimana.
  Recupero storico: `/api/cron/collect?backfill=486` (16 mesi, il massimo di Search Console).
- `/api/scan` — audit live; il risultato viene archiviato se il dominio è monitorato.

Variabili necessarie: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`,
`CRON_SECRET` e quelle `POSTGRES_*` create dall'integrazione Supabase.
