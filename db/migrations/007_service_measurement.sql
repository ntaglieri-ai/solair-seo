-- Evidenze configuratore distinte dagli eventi generici e dai contatti aggregati.
create table seo.configurator_batches (
  run_id uuid primary key references seo.runs(id),
  site_id text not null references seo.sites(id),
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index configurator_site_created_idx on seo.configurator_batches(site_id, created_at desc);

-- Il piano approvato sopravvive alle successive analisi automatiche.
create table seo.interventions (
  site_id text not null references seo.sites(id),
  action_id text not null,
  proposal jsonb not null,
  tasks jsonb not null,
  approved_at timestamptz,
  completed_at timestamptz,
  verified_at timestamptz,
  verification_note text not null default '',
  measurement jsonb,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key(site_id, action_id)
);
create table seo.intervention_log (
  id uuid primary key default gen_random_uuid(),
  site_id text not null,
  action_id text not null,
  revision integer not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  foreign key(site_id, action_id) references seo.interventions(site_id, action_id),
  unique(site_id, action_id, revision)
);

-- Audit globali pubblicati: mai mescolare punteggi di singole pagine al trend.
create table seo.audit_scores (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references seo.sites(id),
  assessed_on date not null,
  score integer not null check(score between 0 and 100),
  methodology text not null,
  source text not null,
  service boolean not null default false,
  starts_service boolean not null default false,
  created_at timestamptz not null default now(),
  check(not starts_service or service)
);
create unique index audit_first_service_idx on seo.audit_scores(site_id) where starts_service;
insert into seo.audit_scores(site_id, assessed_on, score, methodology, source)
values ('solairgroup.it', '2026-05-01', 76, 'pdf-maggio-2026', 'SEO_RPT_001 · PDF maggio 2026');

alter table seo.configurator_batches enable row level security;
alter table seo.interventions enable row level security;
alter table seo.intervention_log enable row level security;
alter table seo.audit_scores enable row level security;
create table seo.operator_attempts(identity text primary key, attempts integer not null, window_start timestamptz not null);
alter table seo.operator_attempts enable row level security;
