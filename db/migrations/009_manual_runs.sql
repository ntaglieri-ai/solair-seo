-- Limite alle richieste dalla home pubblica; sito e operazioni restano fissi sul server.
create table seo.manual_requests (
  site_id text not null references seo.sites(id),
  mode text not null check(mode in ('status','analysis')),
  next_allowed_at timestamptz not null,
  primary key(site_id,mode)
);
alter table seo.manual_requests enable row level security;
