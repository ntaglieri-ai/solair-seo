import { NextRequest, NextResponse } from "next/server";
import { validSettingsSignature } from "../../../lib/crm-settings-signature";
import { getEngineSettings } from "../../../lib/engine/store";
import { getGeoSettings } from "../../../lib/geo/store";
import { parseGeoSettings } from "../../../lib/geo/settings";
import { getSql } from "../../../lib/db";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
async function read() {
  const [report, geo] = await Promise.all([getEngineSettings("solairgroup.it"), getGeoSettings("solairgroup.it")]);
  return { report: { enabled: report.enabled, analysisDays: report.analysisDays },
    geo: { enabled: geo?.enabled ?? false, frequency: geo?.frequency ?? "manual",
      monthlyBudgetUsd: (geo?.monthlyBudgetMicrousd ?? 3000000) / 1e6, scanBudgetUsd: (geo?.scanBudgetMicrousd ?? 1500000) / 1e6 },
    geminiConfigured: process.env.GEO_LEVEL2_ENABLED === "true" && Boolean(process.env.GEMINI_API_KEY?.trim()) };
}
export async function GET(request: NextRequest) {
  if (!validSettingsSignature(request.headers, "GET", "", process.env.SOLAIR_SEO_SETTINGS_SECRET))
    return NextResponse.json({ error: "Accesso negato." }, { status: 403, headers });
  try { return NextResponse.json(await read(), { headers }); }
  catch { return NextResponse.json({ error: "Impostazioni non disponibili." }, { status: 503, headers }); }
}
export async function PATCH(request: NextRequest) {
  const body = await request.text();
  if (body.length > 2000) return NextResponse.json({ error: "Richiesta troppo grande." }, { status: 400, headers });
  if (!validSettingsSignature(request.headers, "PATCH", body, process.env.SOLAIR_SEO_SETTINGS_SECRET))
    return NextResponse.json({ error: "Accesso negato." }, { status: 403, headers });
  let report: { enabled: boolean; analysisDays: number }, geo;
  try {
    const value = JSON.parse(body);
    if (!value || Object.keys(value).some(k => !["report", "geo"].includes(k))) throw new Error();
    report = value.report;
    if (!report || typeof report.enabled !== "boolean" || !Number.isInteger(report.analysisDays) || report.analysisDays < 1 || report.analysisDays > 90 || Object.keys(report).some(k => !["enabled", "analysisDays"].includes(k))) throw new Error();
    geo = parseGeoSettings(value.geo);
  } catch { return NextResponse.json({ error: "Impostazioni non valide." }, { status: 400, headers }); }
  try {
    await getSql().begin(async sql => {
      const rows = await sql`update seo.engine_settings set enabled=${report.enabled}, analysis_days=${report.analysisDays}, updated_at=now() where site_id='solairgroup.it' returning site_id`;
      if (!rows.length) throw new Error("Sito assente");
      await sql`insert into seo.geo_settings(site_id,enabled,frequency,monthly_budget_microusd,scan_budget_microusd)
        values('solairgroup.it',${geo.enabled},${geo.frequency},${geo.monthlyBudgetMicrousd},${geo.scanBudgetMicrousd})
        on conflict(site_id) do update set enabled=excluded.enabled, frequency=excluded.frequency, monthly_budget_microusd=excluded.monthly_budget_microusd, scan_budget_microusd=excluded.scan_budget_microusd, updated_at=now()`;
    });
    return NextResponse.json(await read(), { headers });
  } catch { return NextResponse.json({ error: "Salvataggio non riuscito." }, { status: 503, headers }); }
}
