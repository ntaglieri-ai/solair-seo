import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { getSql } from "../db";
import { UUID } from "./model";

export type ReportArchive = { status: "pending" | "saved" | "skipped"; path: string | null };
const endpoint = "/api/auth/seo/archive";

export async function readReportArchiveStatus(id: string): Promise<ReportArchive | null> {
  if (!UUID.test(id)) return null;
  const [row] = await getSql()<ReportArchive[]>`select status,path from seo.report_archives where document_id=${id}`;
  return row ?? null;
}

/** Also used by manual retries: records only a confirmed CRM upload. */
export async function recordReportArchive(id: string, path: string) {
  await getSql()`insert into seo.report_archives(document_id,status,path,saved_at) values(${id},'saved',${path},now())
    on conflict(document_id) do update set status='saved',path=excluded.path,saved_at=now(),lease_token=null,lease_until=null`;
}

/** Durable queue + expiring lease; the CRM upload is idempotent and never sends email. */
export async function archiveReportDocument(id: string): Promise<ReportArchive> {
  if (!UUID.test(id)) throw new Error("Report non valido.");
  const sql = getSql();
  await sql`insert into seo.report_archives(document_id) values(${id}) on conflict do nothing`;
  const token = randomUUID();
  const [claimed] = await sql`update seo.report_archives set lease_token=${token},lease_until=now()+interval '2 minutes',attempted_at=now()
    where document_id=${id} and status='pending' and (lease_until is null or lease_until<now()) returning document_id`;
  if (!claimed) return await readReportArchiveStatus(id) ?? { status: "pending", path: null };
  try {
    const secret = process.env.SOLAIR_SEO_SETTINGS_SECRET, base = process.env.CRM_URL;
    if (!secret || !base) throw new Error("Collegamento CRM non configurato.");
    const body = JSON.stringify({ reportId: id }), timestamp = String(Date.now());
    const signature = createHmac("sha256", secret).update(`${timestamp}\nPOST\n${endpoint}\n${body}`).digest("hex");
    const response = await fetch(new URL(endpoint, base), {
      method: "POST", body, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(45000),
      headers: { "content-type": "application/json", "x-crm-time": timestamp, "x-crm-signature": signature },
    });
    const result = await response.json();
    if (!response.ok || !["saved", "skipped"].includes(result.status) ||
      (result.status === "saved" && (typeof result.path !== "string" || !result.path.trim()))) throw new Error("Salvataggio non confermato.");
    const path = result.status === "saved" ? result.path as string : null;
    await sql`update seo.report_archives set status=${result.status},path=${path},saved_at=${path ? new Date() : null},lease_token=null,lease_until=null
      where document_id=${id} and lease_token=${token}`;
    return { status: result.status, path };
  } catch {
    await sql`update seo.report_archives set lease_token=null,lease_until=null,next_attempt_at=now()+interval '1 hour'
      where document_id=${id} and lease_token=${token}`;
    console.error("[report-archive] Salvataggio Nextcloud in attesa di un nuovo tentativo.");
    return { status: "pending", path: null };
  }
}

export async function retryPendingReportArchives() {
  const rows = await getSql()<{ id: string }[]>`select document_id as id from seo.report_archives
    where status='pending' and next_attempt_at<=now() and (lease_until is null or lease_until<now()) order by next_attempt_at limit 2`;
  const results = [];
  for (const row of rows) results.push({ id: row.id, ...await archiveReportDocument(row.id) });
  return results;
}
