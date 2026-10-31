-- Configurazione e risultati del motore, separati dalla baseline editoriale.
create table seo.engine_settings (
  site_id text primary key references seo.sites(id),
  enabled boolean not null default true,
  collection_days integer not null default 1 check (collection_days between 1 and 90),
  technical_days integer not null default 7 check (technical_days between 1 and 90),
  analysis_days integer not null default 7 check (analysis_days between 1 and 90),
  window_days integer not null default 28 check (window_days between 7 and 90),
  lag_days integer not null default 3 check (lag_days between 3 and 14),
  max_pages integer not null default 20 check (max_pages between 1 and 50),
  min_impressions integer not null default 50 check (min_impressions between 10 and 100000),
  min_sessions integer not null default 30 check (min_sessions between 10 and 100000),
  updated_at timestamptz not null default now()
);
insert into seo.engine_settings(site_id) select id from seo.sites;

alter table seo.runs drop constraint runs_kind_check;
alter table seo.runs add constraint runs_kind_check
  check (kind in ('baseline','gsc','ga4','onpage','audit','evidence','technical','analysis'));

create table seo.evidence_batches (
  run_id uuid primary key references seo.runs(id),
  site_id text not null references seo.sites(id),
  period_end date not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index evidence_site_created_idx on seo.evidence_batches(site_id, created_at desc);

create table seo.technical_batches (
  run_id uuid primary key references seo.runs(id),
  site_id text not null references seo.sites(id),
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index technical_site_created_idx on seo.technical_batches(site_id, created_at desc);

create table seo.analysis_snapshots (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references seo.runs(id),
  site_id text not null references seo.sites(id),
  fingerprint text not null,
  status text not null check (status in ('complete','partial','blocked')),
  period_end date,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique(site_id, fingerprint)
);
create index analysis_site_created_idx on seo.analysis_snapshots(site_id, created_at desc);

-- Lease atomica: due chiamate simultanee non avviano due raccolte dello stesso sito.
create table seo.engine_leases (
  site_id text primary key references seo.sites(id),
  token uuid not null default gen_random_uuid(),
  expires_at timestamptz not null
);

alter table seo.engine_settings enable row level security;
alter table seo.evidence_batches enable row level security;
alter table seo.technical_batches enable row level security;
alter table seo.analysis_snapshots enable row level security;
alter table seo.engine_leases enable row level security;
