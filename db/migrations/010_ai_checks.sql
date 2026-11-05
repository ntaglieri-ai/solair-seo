-- Risposte API distinte dalle osservazioni manuali e dagli snapshot SEO.
create table seo.ai_check_batches (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references seo.sites(id),
  model text not null,
  protocol text not null,
  trigger text not null check (trigger in ('manual','cron')),
  status text not null check (status in ('running','complete','partial','failed')),
  questions jsonb not null,
  results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index ai_check_batches_site_date on seo.ai_check_batches(site_id,created_at desc);
alter table seo.ai_check_batches enable row level security;
