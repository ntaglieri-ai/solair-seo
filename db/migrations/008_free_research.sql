-- Fonti gratuite: query GSC nel motore esistente, benchmark HTML, export e rilevazioni documentate.
create table seo.watched_keywords (
  site_id text not null references seo.sites(id), query text not null,
  created_at timestamptz not null default now(), primary key(site_id,query)
);
create table seo.competitors (
  site_id text not null references seo.sites(id), domain text not null,
  name text not null, reason text not null, enabled boolean not null default true,
  created_at timestamptz not null default now(), primary key(site_id,domain)
);
insert into seo.competitors(site_id,domain,name,reason) values
('solairgroup.it','enpal.it','Enpal','Benchmark selezionato: offerta pubblica di fotovoltaico chiavi in mano. Fonte: https://www.enpal.it/'),
('solairgroup.it','otovo.it','Otovo','Benchmark selezionato: contenuti pubblici su fotovoltaico, installazione e assistenza. Fonte: https://www.otovo.it/');
create table seo.competitor_batches (
  id uuid primary key default gen_random_uuid(), site_id text not null references seo.sites(id),
  data jsonb not null, created_at timestamptz not null default now()
);
create table seo.backlink_imports (
  id uuid primary key default gen_random_uuid(), site_id text not null references seo.sites(id),
  observed_on date not null, filename text not null, fingerprint text not null,
  data jsonb not null, created_at timestamptz not null default now(), unique(site_id,observed_on,fingerprint)
);
create table seo.ai_observations (
  id uuid primary key default gen_random_uuid(), site_id text not null references seo.sites(id),
  engine text not null, question text not null, context text not null,
  observed_on date not null, answer text not null, evidence_url text,
  sources jsonb not null, mentions_brand boolean not null, cites_site boolean not null,
  created_at timestamptz not null default now(), fingerprint text not null,
  unique(site_id,observed_on,fingerprint)
);
alter table seo.watched_keywords enable row level security;
alter table seo.competitors enable row level security;
alter table seo.competitor_batches enable row level security;
alter table seo.backlink_imports enable row level security;
alter table seo.ai_observations enable row level security;
