-- Livello 2 GEO: impostazioni per sito, budget per periodo, scansioni e richieste.
-- Le tabelle del pilota (geo_pilot_*) restano invariate come archivio storico.

-- Nessun consumo a pagamento parte finché `enabled` non viene attivato a mano.
create table seo.geo_settings (
  site_id                   text primary key references seo.sites(id),
  enabled                   boolean not null default false,
  engine                    text not null default 'gemini' check (engine in ('gemini','openai')),
  frequency                 text not null default 'manual' check (frequency in ('manual','weekly','biweekly','monthly')),
  prompt_set_version        text not null default 'solair-grounded-comparison-v1',
  monthly_budget_microusd   bigint not null default 3000000 check (monthly_budget_microusd >= 0),
  scan_budget_microusd      bigint not null default 1500000 check (scan_budget_microusd >= 0),
  request_reserve_microusd  bigint not null default 250000 check (request_reserve_microusd > 0),
  next_run_at               timestamptz,
  updated_at                timestamptz not null default now()
);

-- Un budget per sito e per mese di calendario. `stop_microusd` lascia margine
-- per la richiesta in corso: non è un tetto garantito dal fornitore.
create table seo.geo_budgets (
  id            text primary key,
  site_id       text not null references seo.sites(id),
  period_start  date not null,
  period_end    date not null,
  limit_microusd bigint not null check (limit_microusd > 0),
  stop_microusd  bigint not null check (stop_microusd > 0 and stop_microusd <= limit_microusd),
  created_at    timestamptz not null default now(),
  unique (site_id, period_start)
);

create table seo.geo_scans (
  id                 uuid primary key default gen_random_uuid(),
  site_id            text not null references seo.sites(id),
  trigger            text not null check (trigger in ('manual','scheduled')),
  status             text not null default 'running' check (status in ('running','done','partial','failed')),
  engine             text not null check (engine in ('gemini','openai')),
  model              text,
  prompt_set_version text not null,
  planned_prompts    int  not null check (planned_prompts > 0),
  completed_prompts  int  not null default 0,
  scan_budget_microusd bigint not null,
  stop_reason        text,
  started_at         timestamptz not null default now(),
  finished_at        timestamptz
);
create index geo_scans_site_started on seo.geo_scans (site_id, started_at desc);

create table seo.geo_scan_requests (
  id                  uuid primary key default gen_random_uuid(),
  scan_id             uuid not null references seo.geo_scans(id),
  budget_id           text not null references seo.geo_budgets(id),
  prompt_id           text not null,
  engine              text not null check (engine in ('gemini','openai')),
  state               text not null check (state in ('reserved','settled','uncertain')),
  reserved_microusd   bigint not null check (reserved_microusd > 0),
  accounted_microusd  bigint not null check (accounted_microusd >= 0),
  result              jsonb,
  error_code          text,
  created_at          timestamptz not null default now(),
  finished_at         timestamptz,
  unique (scan_id, prompt_id, engine)
);
create index geo_scan_requests_budget on seo.geo_scan_requests (budget_id);

alter table seo.geo_settings enable row level security;
alter table seo.geo_budgets enable row level security;
alter table seo.geo_scans enable row level security;
alter table seo.geo_scan_requests enable row level security;
