import "server-only";
import { getSql } from "../db";
import { collectGa4, collectGsc, collectOnPage, withRun, type Site, type Trigger } from "./collect";
import { collectEvidence } from "./evidence";
import { PUBLIC_CRAWL_VERSION } from "./crawl";
import { collectPublicSite } from "../public-collection";
import { analyzeEvidence, ANALYSIS_VERSION } from "./analyze";
import { acquireLease, getEngineInputs, getEngineSettings, getLastSnapshot, releaseLease } from "./store";
import { isDue } from "./settings";
import { getLatestRuns } from "./read";
import { analysisFingerprint } from "./fingerprint";
import { collectMarket } from "../research-store";

export async function runEngine(site: Site, options: { force?: boolean; backfillDays?: number; trigger: Trigger; mode?: "status" | "analysis" }) {
  const settings = await getEngineSettings(site.id);
  if (!settings.enabled && options.trigger !== "manual") return { site: site.id, ok: true, skipped: "disabled" };
  const lease = await acquireLease(site.id);
  if (!lease) return { site: site.id, ok: true, skipped: "already_running" };
  const sql = getSql();
  const now = new Date();
  const steps: Record<string, unknown> = {};
  const errors: string[] = [];
  let collectionFailed = false;
  let evidenceFailed = false;
  try {
    await sql`
      update seo.runs set status='error', finished_at=now(), error='Esecuzione interrotta o scaduta'
      where site_id=${site.id} and status='running' and started_at < now() - interval '10 minutes'
    `;
    const [lastRuns, initial, lastSnapshot] = await Promise.all([
      getLatestRuns(site.id), getEngineInputs(site.id), getLastSnapshot(site.id),
    ]);
    const sourceDue = (kind: "gsc" | "ga4") => options.force || isDue(lastRuns[kind]?.startedAt ?? null, settings.collectionDays, now);
    const lookback = (kind: "gsc" | "ga4") => options.backfillDays ?? Math.min(486, Math.max(
      10, initial.evidence ? 0 : settings.windowDays * 2 + settings.lagDays,
      lastRuns[kind]?.finishedAt ? Math.ceil((now.getTime() - new Date(lastRuns[kind]!.finishedAt!).getTime()) / 86400000) + 3 : 60,
    ));
    await Promise.all((["gsc", "ga4"] as const).map(async (kind) => {
      if (kind === "ga4" && !site.ga4_property) { steps[kind] = "not_configured"; return; }
      if (!sourceDue(kind)) { steps[kind] = "not_due"; return; }
      try {
        const run = kind === "gsc" ? await collectGsc(site, options.trigger, lookback(kind)) : await collectGa4(site, options.trigger, lookback(kind));
        steps[kind] = run?.result;
      } catch (error) {
        collectionFailed = true;
        errors.push(`${kind}: ${error instanceof Error ? error.message : "raccolta fallita"}`);
      }
    }));

    const evidenceWindow = initial.evidence?.data.windows.current;
    const windowChanged = !evidenceWindow ||
      (Date.parse(evidenceWindow.to) - Date.parse(evidenceWindow.from)) / 86400000 + 1 !== settings.windowDays ||
      lastSnapshot?.data.settings?.lagDays !== settings.lagDays;
    const evidenceNeedsRetry = !!initial.evidence?.data.sourceErrors?.length || (!!site.ga4_property && !initial.evidence?.data.ga4);
    if (options.force || collectionFailed || evidenceNeedsRetry || windowChanged || isDue(lastRuns.evidence?.startedAt ?? null, settings.collectionDays, now)) {
      try {
        const result = (await collectEvidence(site, settings, options.trigger, now)).result;
        steps.evidence = result;
        if (result.sourceErrors.length) { collectionFailed = true; errors.push(...result.sourceErrors); }
      }
      catch (error) { collectionFailed = true; evidenceFailed = true; errors.push(`evidence: ${error instanceof Error ? error.message : "raccolta fallita"}`); }
    } else steps.evidence = "not_due";

    if (options.mode === "status") return { site: site.id, ok: !errors.length, steps, errors };

    if (options.force || initial.technical?.data.version !== PUBLIC_CRAWL_VERSION || initial.technical?.data.maxPages !== settings.maxPages || isDue(lastRuns.technical?.startedAt ?? null, settings.technicalDays, now)) {
      try {
        steps.technical = (await collectPublicSite(site, settings.maxPages, options.trigger)).result;
        // Mantiene lo storico on-page esistente senza mescolarlo alla baseline manuale.
        if (isDue(lastRuns.onpage?.startedAt ?? null, settings.technicalDays, now)) {
          steps.onpage = (await collectOnPage(site, options.trigger)).result;
        }
      } catch (error) { errors.push(`technical: ${error instanceof Error ? error.message : "scansione fallita"}`); }
    } else steps.technical = "not_due";

    try { steps.competitors=await collectMarket(site.id,settings.technicalDays,options.force); }
    catch { steps.competitors={status:"unavailable"}; console.error("[engine] Confronto concorrenti non disponibile."); }

    const settingsChanged = !lastSnapshot || lastSnapshot.data.version !== ANALYSIS_VERSION || Object.entries(settings).some(([key, value]) => lastSnapshot.data.settings?.[key] !== value);
    if (options.force || errors.length || settingsChanged || lastSnapshot?.status !== "complete" || isDue(lastSnapshot?.validatedAt ?? lastRuns.analysis?.startedAt ?? null, settings.analysisDays, now)) {
      const inputs = await getEngineInputs(site.id);
      const measured = analyzeEvidence({
        domain: site.id, settings, now,
        evidence: evidenceFailed ? null : inputs.evidence?.data ?? null,
        technical: inputs.technical?.data ?? null,
        technicalAt: inputs.technical?.createdAt.toISOString() ?? null,
      });
      const evaluated = measured.status === "complete" && errors.length ? { ...measured, status: "partial" as const } : measured;
      const analysis = { ...evaluated,
        limitations: [...new Set([...measured.limitations, ...errors])],
      };
      if (analysis.status === "blocked" && !errors.length) errors.push("analysis: dati insufficienti o non confrontabili; snapshot bloccato.");
      const fingerprint = analysisFingerprint({
        settings, analysis,
        evidence: evidenceFailed ? null : inputs.evidence?.data ?? null,
        technical: inputs.technical?.data ?? null,
        errors, day: now.toISOString().slice(0, 10),
      });
      const [existing] = await sql<{ id: string }[]>`select id from seo.analysis_snapshots where site_id=${site.id} and fingerprint=${fingerprint}`;
      if (existing) {
        await sql`insert into seo.engine_state(site_id, snapshot_id) values (${site.id}, ${existing.id})
          on conflict(site_id) do update set snapshot_id=excluded.snapshot_id, validated_at=now()`;
        steps.analysis = { snapshotId: existing.id, reused: true, status: analysis.status };
      }
      else {
        steps.analysis = (await withRun(site.id, "analysis", options.trigger, async (runId, tx) => {
          const data = { ...analysis, settings, collectedAt: now.toISOString(), sourceRunIds: {
            evidence: evidenceFailed ? null : inputs.evidence?.runId ?? null, technical: inputs.technical?.runId ?? null,
          } };
          const snapshot = await tx.begin(async (transaction) => {
            const [saved] = await transaction<{ id: string }[]>`
              insert into seo.analysis_snapshots(run_id, site_id, fingerprint, status, period_end, data)
              values (${runId}, ${site.id}, ${fingerprint}, ${analysis.status}, ${analysis.windows?.current.to ?? null}, ${transaction.json(data)})
              returning id
            `;
            await transaction`insert into seo.engine_state(site_id, snapshot_id) values (${site.id}, ${saved.id})
              on conflict(site_id) do update set snapshot_id=excluded.snapshot_id, validated_at=now()`;
            return saved;
          });
          return { result: { snapshotId: snapshot.id, status: analysis.status, opportunities: analysis.opportunities.length, checks: analysis.checks.length }, raw: { snapshotId: snapshot.id } };
        })).result;
      }
    } else steps.analysis = "not_due";

    if (errors.length) console.error("[engine] Raccolta parziale", { site: site.id, errors });
    return { site: site.id, ok: !errors.length, steps, errors };
  } finally {
    await releaseLease(site.id, lease);
  }
}
