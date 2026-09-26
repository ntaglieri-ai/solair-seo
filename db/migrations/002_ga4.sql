-- GA4 nel motore dati: proprietà per sito e serie giornaliera per canale.

alter table seo.sites add column ga4_property text;  -- ID numerico, es. "123456789"

alter table seo.runs drop constraint runs_kind_check;
alter table seo.runs add constraint runs_kind_check
  check (kind in ('baseline', 'gsc', 'ga4', 'onpage', 'audit'));

-- Una riga per giorno e canale. `channel` = 'all' per il totale del sito,
-- altrimenti il Default Channel Group di GA4 (es. "Organic Search").
create table seo.ga4_daily (
  site_id           text not null references seo.sites (id),
  date              date not null,
  channel           text not null,
  sessions          integer not null,
  users             integer not null,
  new_users         integer not null,
  engaged_sessions  integer not null,
  key_events        double precision not null,
  updated_at        timestamptz not null default now(),
  primary key (site_id, date, channel)
);

alter table seo.ga4_daily enable row level security;
