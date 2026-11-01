import "server-only";
import { getSql } from "./db";
import { auditTrend, type AuditScore } from "./audit-trend";
import type { ConfiguratorReport } from "./configurator";

export async function getAuditTrend(siteId: string) {
  const rows = await getSql()<AuditScore[]>`select id, to_char(assessed_on,'YYYY-MM-DD') as date, score, methodology, source,
    service, starts_service as "startsService" from seo.audit_scores where site_id=${siteId} order by assessed_on, created_at`;
  return auditTrend(rows);
}

export async function getConfigurator(siteId: string) {
  const [row] = await getSql()<{ data: { current: ConfiguratorReport | null; previous: ConfiguratorReport | null; error: string | null }; collectedAt: Date }[]>`
    select c.data, c.created_at as "collectedAt" from seo.configurator_batches c join seo.runs r on r.id=c.run_id
    where c.site_id=${siteId} and r.status='ok' order by c.created_at desc limit 1`;
  return row ?? null;
}
