"use client";
import Link from "next/link";
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { collectGeo } from "../../lib/geo/client";
import base from "../home.module.css";
import styles from "./hero-report.module.css";

type RunState = { busy: boolean; progress: string; error: string; generate: () => Promise<void> };
const Context = createContext<RunState | null>(null);
export function useReportRun() {
  const value = useContext(Context);
  if (!value) throw new Error("ReportRunProvider mancante");
  return value;
}
export function ReportRunProvider({ children }: { children: ReactNode }) {
  const router = useRouter(), lock = useRef(false);
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState(""), [error, setError] = useState("");
  async function generate() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setProgress("Aggiornamento delle fonti Google e analisi SEO in corso…");
    try {
      const response = await fetch("/api/home-run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "analysis" }), signal: AbortSignal.timeout(290000) });
      const result = await response.json();
      if (!response.ok || typeof result.url !== "string") throw new Error(result.error ?? "Analisi non completata. Riprova tra poco.");
      let geoScanId: string | undefined;
      let geoRefreshFailed = false;
      if (result.geoAvailable) {
        setProgress("Risultati SEO salvati. Raccolta delle risposte Gemini e verifica delle fonti…");
        try { geoScanId = (await collectGeo(setProgress)).scanId; }
        catch { geoRefreshFailed = true; }
      }
      setProgress("Preparazione del PDF e salvataggio nello storico…");
      const pdf = await fetch("/api/reports/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ snapshotId: result.snapshotId, geoScanId, geoRefreshFailed, sourceRefreshFailed: result.partial === true }) });
      const document = await pdf.json();
      if (!pdf.ok || typeof document.url !== "string") throw new Error(document.error || "Analisi salvata, ma il PDF non è stato generato. Puoi riprovare dall’archivio.");
      router.push(document.url);
    } catch (e) {
      setError(e instanceof Error && e.name !== "TimeoutError" ? e.message : "L’analisi sta richiedendo più tempo del previsto. Consulta l’ultimo report prima di riprovare.");
      lock.current = false; setBusy(false);
    }
  }
  return <Context value={{ busy, progress, error, generate }}>{children}</Context>;
}
export function HeroReportControls({ children }: { children: ReactNode }) {
  const { busy, progress, error, generate } = useReportRun();
  return <div className={styles.controls}>
    <div className={base.heroActions}><button type="button" className={`${base.primary} ${styles.generate}`} disabled={busy} onClick={generate}>{busy ? "Generazione in corso…" : "Genera Report"}<span aria-hidden="true">↗</span></button><Link className={base.secondary} href="/report/ultimo">Consulta ultimo report <span aria-hidden="true">→</span></Link></div>
    {children}<p className={styles.feedback} role="status" aria-live="polite">{error || (busy ? progress : "")}</p>
  </div>;
}
