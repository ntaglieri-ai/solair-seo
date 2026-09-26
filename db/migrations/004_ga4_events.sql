-- Conteggio giornaliero degli eventi GA4 per nome. Serve a misurare i
-- contatti con una definizione esplicita (vedi lib/engine/contacts.ts)
-- invece del totale "eventi chiave", che dipende dalla configurazione GA4.

create table seo.ga4_events (
  site_id      text not null references seo.sites (id),
  date         date not null,
  event_name   text not null,
  event_count  integer not null,
  users        integer not null,
  updated_at   timestamptz not null default now(),
  primary key (site_id, date, event_name)
);

alter table seo.ga4_events enable row level security;
