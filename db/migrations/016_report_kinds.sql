-- Tipi di report: avvio del servizio, mensile a finestra fissa, aggiornamento on demand.
-- I documenti già presenti sono prove precedenti al lancio e restano classificati come aggiornamenti.
alter table seo.report_documents
  add column kind text not null default 'update' check (kind in ('startup','monthly','update')),
  add column period_from date,
  add column period_to date;
create index report_documents_site_kind_period on seo.report_documents(site_id,kind,period_to desc);
