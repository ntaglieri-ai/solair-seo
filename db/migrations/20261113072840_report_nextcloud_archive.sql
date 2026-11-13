-- Durable Nextcloud queue, separate from immutable PDF contents and email deliveries.
create table seo.report_archives (
  document_id uuid primary key references seo.report_documents(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','saved','skipped')),
  path text,
  saved_at timestamptz,
  attempted_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  check (status <> 'saved' or (path is not null and saved_at is not null))
);
alter table seo.report_archives enable row level security;
revoke all on seo.report_archives from public, anon, authenticated;
create index report_archives_pending on seo.report_archives(next_attempt_at) where status='pending';

create function seo.queue_report_archive() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  insert into seo.report_archives(document_id) values(new.id) on conflict do nothing;
  return new;
end;
$$;
revoke all on function seo.queue_report_archive() from public, anon, authenticated;
create trigger queue_report_archive after insert on seo.report_documents
for each row execute function seo.queue_report_archive();
