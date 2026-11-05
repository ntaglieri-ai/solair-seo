import "server-only";
import { acquireLease, releaseLease } from "../engine/store";
import { askGeminiWithSearch } from "../geo-pilot/adapters/gemini";
import { askOpenaiWithSearch } from "../geo-pilot/adapters/openai";
import { checkSource } from "../geo-pilot/source-check";
import type { PilotCitation } from "../geo-pilot/protocol";
import { buildGeoAnswer, errorCode, pendingVerification, withVerifiedCitations, type GeoAnswer } from "./answer";
import { getPromptSet } from "./prompts";
import {
  FREQUENCY_DAYS, finishRequest, getCompetitorNames, getGeoRequests, getGeoScans, getGeoSettings,
  openOrCreateScan, reserveRequest, saveVerifiedResult, updateScan,
} from "./store";

export type GeoScanOutcome =
  | { status: "disabled" | "not_configured" | "not_due" | "already_running" }
  | { status: "in_progress" | "done" | "partial" | "failed"; scanId: string; completed: number; planned: number; stopReason: string | null };

const CONCURRENCY = 3;
const NEW_REQUESTS_UNTIL_MS = 90_000; // oltre questo tempo non si avviano nuovi prompt: la scansione si riprende alla chiamata successiva
const VERIFY_UNTIL_MS = 150_000;
const VERIFY_MAX_URLS = 60;

export function geoConfigured(engine: "gemini" | "openai") {
  const key = engine === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
  return process.env.GEO_LEVEL2_ENABLED === "true" && Boolean(key?.trim()) &&
    (engine !== "openai" || process.env.GEO_OPENAI_ENABLED === "true");
}

/** Una scansione programmata parte solo se la frequenza del sito è scaduta. */
export function scanDue(frequency: string, lastStartedAt: Date | null, now = new Date()) {
  if (!(frequency in FREQUENCY_DAYS)) return false;
  return !lastStartedAt || now.getTime() - lastStartedAt.getTime() >= FREQUENCY_DAYS[frequency as keyof typeof FREQUENCY_DAYS] * 86_400_000;
}

export async function runGeoScan(siteId: string, trigger: "manual" | "scheduled", options: { deadline?: number } = {}): Promise<GeoScanOutcome> {
  const settings = await getGeoSettings(siteId);
  if (!settings?.enabled) return { status: "disabled" };
  if (!geoConfigured(settings.engine)) return { status: "not_configured" };
  if (trigger === "scheduled" && settings.frequency === "manual") return { status: "not_due" };
  const lease = await acquireLease(siteId);
  if (!lease) return { status: "already_running" };
  const startedAt = Date.now();
  const deadline = options.deadline ?? startedAt + 170_000;
  try {
    // Verifica sotto lease: due avvii simultanei non devono creare scansioni duplicate.
    if (trigger === "scheduled") {
      const [last] = await getGeoScans(siteId, 1);
      if (last?.status !== "running" && !scanDue(settings.frequency, last?.startedAt ?? null)) return { status: "not_due" };
    }
    const { prompts } = getPromptSet(settings.promptSetVersion);
    const { scan } = await openOrCreateScan(settings, trigger, prompts.length);
    const competitors = await getCompetitorNames(siteId);
    const ask = settings.engine === "gemini" ? askGeminiWithSearch : askOpenaiWithSearch;
    let stopReason: string | null = scan.stopReason && scan.stopReason !== "time" ? scan.stopReason : null;
    const existing = await getGeoRequests(scan.id);
    const done = new Set(existing.map(row => row.promptId));
    const queue = prompts.filter(prompt => !done.has(prompt.id));
    let model: string | null = null;

    // Pochi prompt in parallelo; la prenotazione atomica regge anche così.
    for (let offset = 0; offset < queue.length && !stopReason; offset += CONCURRENCY) {
      if (Date.now() - startedAt > NEW_REQUESTS_UNTIL_MS || Date.now() > deadline - 70_000) { stopReason = "time"; break; }
      const batch = await Promise.allSettled(queue.slice(offset, offset + CONCURRENCY).map(async prompt => {
        if (stopReason && stopReason !== "time") return;
        const reservation = await reserveRequest(settings, scan, prompt.id);
        if (reservation.status === "existing") return;
        if (reservation.status === "blocked") { stopReason ??= reservation.reason; return; }
        try {
          const raw = await ask(prompt.text);
          model = raw.actualModel;
          const answer = buildGeoAnswer(settings.engine, prompt, raw, settings.promptSetVersion, competitors);
          await finishRequest(reservation.id, answer, reservation.reserve, answer.complete ? null : `incomplete_${raw.finishReason}`);
        } catch (error) {
          // Nessun retry automatico di una chiamata potenzialmente già fatturata; il primo errore ferma la scansione.
          await finishRequest(reservation.id, null, reservation.reserve, errorCode(error));
          stopReason ??= "provider_error";
        }
      }));
      // Attendi ogni chiamata prima di liberare il lease anche se il database fallisce.
      if (batch.some(result => result.status === "rejected")) throw new Error("GEO storage unavailable");
    }

    let rows = await getGeoRequests(scan.id);
    const allPromptsDone = prompts.every(prompt => rows.some(row => row.promptId === prompt.id));
    // Le fonti già acquisite vengono risolte anche dopo uno stop di budget/provider.
    await verifySources(rows, startedAt, deadline);
    rows = await getGeoRequests(scan.id);
    const answers = rows.map(row => row.result).filter((answer): answer is GeoAnswer => answer !== null);
    const completeCount = answers.filter(answer => answer.complete).length;
    const unverified = pendingVerification(answers).length;
    const finished = allPromptsDone && unverified === 0 && (!stopReason || stopReason === "time");
    // "time": la scansione resta aperta e riprende dallo stesso punto, senza duplicare richieste.
    const status = finished ? (completeCount === prompts.length ? "done" : "partial")
      : unverified === 0 && stopReason && stopReason !== "time" ? "partial" : "running";
    if (finished && stopReason === "time") stopReason = null;
    await updateScan(scan.id, { completedPrompts: completeCount, status, stopReason, model });
    return { status: status === "running" ? "in_progress" : status, scanId: scan.id, completed: completeCount, planned: prompts.length, stopReason };
  } finally { await releaseLease(siteId, lease); }
}

/** Raggiungibilità delle fonti citate: nessun costo AI. Non certifica che la fonte sostenga l'affermazione. */
async function verifySources(rows: Awaited<ReturnType<typeof getGeoRequests>>, startedAt: number, deadline: number) {
  const answers = rows.flatMap(row => row.result ? [{ row, answer: row.result as GeoAnswer }] : []);
  const urls = pendingVerification(answers.map(item => item.answer)).slice(0, VERIFY_MAX_URLS);
  const verified = new Map<string, Partial<PilotCitation>>();
  for (let offset = 0; offset < urls.length && Date.now() - startedAt < VERIFY_UNTIL_MS && Date.now() < deadline - 15_000; offset += 4) {
    await Promise.all(urls.slice(offset, offset + 4).map(async url => {
      const check = await checkSource(url);
      verified.set(url, { verification: check.verification, finalUrl: check.finalUrl, httpStatus: check.httpStatus,
        pageTitle: check.pageTitle, excerpt: check.excerpt, checkedAt: check.checkedAt });
    }));
  }
  if (!verified.size) return;
  await Promise.all(answers.filter(item => item.answer.citations.some(citation => verified.has(citation.url)))
    .map(item => saveVerifiedResult(item.row.id, withVerifiedCitations(item.answer, verified))));
}
