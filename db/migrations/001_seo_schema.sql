-- Motore dati SolairSEO: schema privato `seo`, non esposto dalla Data API di
-- Supabase. Vi accede solo il server Next.js con la connessione Postgres.

create schema if not exists seo;
revoke all on schema seo from public;
revoke all on schema seo from anon, authenticated;

-- Siti monitorati (oggi solo solairgroup.it, pronto per altri clienti).
create table seo.sites (
  id            text primary key,              -- dominio, es. "solairgroup.it"
  home_url      text not null,
  gsc_property  text not null,                 -- es. "sc-domain:solairgroup.it"
  created_at    timestamptz not null default now()
);

-- Ogni raccolta (cron, audit manuale, baseline) è una rilevazione.
create table seo.runs (
  id            uuid primary key default gen_random_uuid(),
  site_id       text not null references seo.sites (id),
  kind          text not null check (kind in ('baseline', 'gsc', 'onpage', 'audit')),
  trigger       text not null check (trigger in ('seed', 'cron', 'manual')),
  status        text not null default 'running' check (status in ('running', 'ok', 'error')),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  error         text,
  raw           jsonb                          -- risposta completa, per ricalcoli futuri
);
create index runs_site_kind_started_idx on seo.runs (site_id, kind, started_at desc);

-- Serie giornaliera Search Console per sito (una riga per giorno, aggiornata
-- a ogni raccolta: Google rivede gli ultimi giorni per un po').
create table seo.gsc_daily (
  site_id       text not null references seo.sites (id),
  date          date not null,
  clicks        integer not null,
  impressions   integer not null,
  ctr           double precision not null,
  position      double precision not null,
  updated_at    timestamptz not null default now(),
  primary key (site_id, date)
);

-- Query e pagine principali, fotografate a ogni raccolta GSC.
create table seo.gsc_top (
  run_id        uuid not null references seo.runs (id) on delete cascade,
  dimension     text not null check (dimension in ('query', 'page')),
  key           text not null,
  period_start  date not null,
  period_end    date not null,
  clicks        integer not null,
  impressions   integer not null,
  ctr           double precision not null,
  position      double precision not null,
  primary key (run_id, dimension, key)
);

-- Risultato di un'analisi on-page (cron settimanale o audit live).
create table seo.onpage_scans (
  run_id        uuid primary key references seo.runs (id) on delete cascade,
  url           text not null,
  score         integer not null,
  deductions    jsonb not null,
  data          jsonb not null
);

-- Difesa in profondità: RLS attiva e nessuna policy, quindi nessun accesso
-- tramite i ruoli pubblici anche se lo schema venisse esposto per errore.
alter table seo.sites enable row level security;
alter table seo.runs enable row level security;
alter table seo.gsc_daily enable row level security;
alter table seo.gsc_top enable row level security;
alter table seo.onpage_scans enable row level security;

-- Sito iniziale e baseline di maggio 2026 come prima rilevazione.
insert into seo.sites (id, home_url, gsc_property)
values ('solairgroup.it', 'https://solairgroup.it/', 'sc-domain:solairgroup.it');

insert into seo.runs (site_id, kind, trigger, status, started_at, finished_at, raw)
values (
  'solairgroup.it', 'baseline', 'seed', 'ok',
  '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z',
  '{"label": "Audit Baseline", "auditDate": "Maggio 2026", "globalScore": 76,
    "scores": {"technicalSeo": 88, "onPage": 70, "offPage": 55, "structure": 82}}'
);
