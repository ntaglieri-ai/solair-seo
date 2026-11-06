-- Stato della sola consegna PDF: le generazioni manuali non spostano la cadenza automatica.
create table seo.report_pdf_schedule (
  site_id text primary key references seo.sites(id),
  last_generated_at timestamptz not null,
  document_id uuid not null references seo.report_documents(id)
);
alter table seo.report_pdf_schedule enable row level security;
