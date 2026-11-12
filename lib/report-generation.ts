import { collectGeo } from "./geo/client";

export type ManualReportKind = "startup" | "update";

/** Run only after the user's click. The PDF keeps the exact sources collected here. */
export async function generateFreshReport(kind: ManualReportKind, onProgress: (message: string) => void) {
  onProgress("Aggiornamento delle fonti Google e analisi del sito…");
  const response = await fetch("/api/home-run", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "analysis" }), signal: AbortSignal.timeout(290000),
  });
  const result = await response.json();
  if (!response.ok || typeof result.snapshotId !== "string") {
    throw new Error(result.error || "Analisi non completata. Riprova tra poco.");
  }
  let geoScanId: string | undefined;
  let geoRefreshFailed = false;
  if (result.geoAvailable) {
    onProgress("Analisi del sito salvata. Aggiornamento delle risposte Gemini…");
    try { geoScanId = (await collectGeo(onProgress)).scanId; }
    catch { geoRefreshFailed = true; }
  }
  onProgress("Preparazione del PDF e salvataggio del report…");
  const pdf = await fetch("/api/reports/generate", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, snapshotId: result.snapshotId, geoScanId, geoRefreshFailed, sourceRefreshFailed: result.partial === true }),
  });
  const document = await pdf.json();
  if (!pdf.ok || typeof document.url !== "string") {
    throw new Error(document.error || "I dati sono stati salvati, ma il PDF non è stato generato. Riprova tra poco.");
  }
  return document.url as string;
}
