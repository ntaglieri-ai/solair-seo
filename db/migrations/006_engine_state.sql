-- Uno snapshot è immutabile; il riferimento corrente può avanzare o recuperare
-- uno snapshot già validato dopo un errore temporaneo delle fonti.
create table seo.engine_state (
  site_id text primary key references seo.sites(id),
  snapshot_id uuid not null references seo.analysis_snapshots(id),
  validated_at timestamptz not null default now()
);
insert into seo.engine_state(site_id, snapshot_id)
select distinct on(site_id) site_id, id from seo.analysis_snapshots order by site_id, created_at desc;
alter table seo.engine_state enable row level security;
