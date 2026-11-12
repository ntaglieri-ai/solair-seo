import { validCrmReportSignature } from "../../../lib/crm-report-signature";
import { getSql } from "../../../lib/db";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  if (!validCrmReportSignature(request)) return Response.json({ error: "Accesso negato." }, { status: 403, headers });
  const since = new URL(request.url).searchParams.get("scheduledSince");
  if (since !== null && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(since) || !Number.isFinite(Date.parse(since)))) return Response.json({ error: "Data non valida." }, { status: 400, headers });
  try {
    const rows = await getSql()<{ id: string; kind: string; trigger: string; createdAt: Date; from: string | null; to: string | null }[]>`
      select id,kind,trigger,created_at as "createdAt",period_from::text as "from",period_to::text as "to"
      from seo.report_documents where site_id='solairgroup.it'
        and (${since}::timestamptz is null or (trigger='scheduled' and created_at>=${since}::timestamptz))
      order by created_at desc limit ${since ? 501 : 50}`;
    if (rows.length > 500) throw new Error("Troppi report da elaborare.");
    const kinds: Record<string, string> = { startup: "Report iniziale", monthly: "Report mensile", update: "Aggiornamento SEO" };
    const date = (value: string | Date) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome" }).format(new Date(value));
    return Response.json({ reports: rows.map(row => ({
      id: row.id, trigger: row.trigger, createdAt: new Date(row.createdAt).toISOString(),
      label: `${kinds[row.kind] ?? "Report SEO"}${row.from && row.to ? ` · ${date(row.from)} – ${date(row.to)}` : ""} · creato il ${date(row.createdAt)}`,
    })) }, { headers });
  } catch (error) {
    console.error("[crm-reports]", error);
    return Response.json({ error: "Archivio non disponibile." }, { status: 503, headers });
  }
}
