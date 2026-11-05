-- Un unico budget cumulativo per il pilota; nessun rinnovo mensile implicito.
create table seo.geo_pilot_budgets (
  id text primary key,
  site_id text not null references seo.sites(id),
  limit_microusd bigint not null check (limit_microusd = 5000000),
  created_at timestamptz not null default now()
);
create table seo.geo_pilot_requests (
  id uuid primary key default gen_random_uuid(),
  budget_id text not null references seo.geo_pilot_budgets(id),
  prompt_id text not null,
  engine text not null check (engine in ('gemini','openai')),
  state text not null check (state in ('reserved','settled','uncertain')),
  reserved_microusd bigint not null check (reserved_microusd > 0),
  accounted_microusd bigint not null check (accounted_microusd >= 0),
  result jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique(budget_id,prompt_id,engine)
);
alter table seo.geo_pilot_budgets enable row level security;
alter table seo.geo_pilot_requests enable row level security;
