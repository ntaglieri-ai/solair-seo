-- PDF generati dal servizio: contenuto e file immutabili, comuni ai flussi manuale e automatico.
create table seo.report_documents (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references seo.sites(id),
  snapshot_id uuid not null references seo.analysis_snapshots(id),
  geo_scan_id uuid references seo.geo_scans(id),
  trigger text not null check (trigger in ('manual','scheduled')),
  status text not null check (status in ('complete','partial')),
  fingerprint text not null,
  template_version text not null,
  payload jsonb not null,
  pdf bytea not null,
  sha256 text not null,
  created_at timestamptz not null default now(),
  unique(site_id,fingerprint),
  check(octet_length(pdf)>0 and octet_length(pdf)<=5000000)
);
create index report_documents_site_created on seo.report_documents(site_id,created_at desc);
alter table seo.report_documents enable row level security;
