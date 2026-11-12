"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateFreshReport, type ManualReportKind } from "../../lib/report-generation";
import styles from "../operazioni.module.css";
import form from "./report-runner.module.css";

export function ReportGenerator({ hasReports }: { hasReports: boolean }) {
  const router = useRouter();
  const lock = useRef(false);
  const [kind, setKind] = useState<ManualReportKind>(hasReports ? "update" : "startup");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function generate() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const url = await generateFreshReport(kind, setProgress);
      router.push(url);
    } catch (error) {
      setError(error instanceof Error && error.name !== "TimeoutError"
        ? error.message
        : "L’aggiornamento sta richiedendo più tempo del previsto. Attendi qualche minuto prima di riprovare.");
      lock.current = false;
      setBusy(false);
    }
  }

  return <div aria-busy={busy}>
    <div className={form.controls}>
      <label className={form.field}>Tipo di report
        <select value={kind} disabled={busy} onChange={event => setKind(event.target.value as ManualReportKind)} aria-describedby="report-kind-description">
          <option value="startup">Report iniziale (Start-up)</option>
          {hasReports && <option value="update">Aggiornamento</option>}
        </select>
      </label>
      <button type="button" className={styles.auditRun} disabled={busy} onClick={generate}>
        {busy ? "Generazione in corso…" : "Genera report"}
      </button>
    </div>
    <p id="report-kind-description" className={styles.note}>{kind === "startup"
      ? "Fotografia iniziale degli ultimi 28 giorni disponibili, prima degli interventi. Puoi crearla anche se ci sono report di prova."
      : "Risultati successivi all’ultimo report. Servono almeno 3 giorni di dati nuovi."}</p>
    {busy && <p className={styles.note}>L’operazione può richiedere alcuni minuti. Lascia aperta questa pagina.</p>}
    <p role="status" aria-live="polite" className={error ? styles.error : styles.note}>{error || (busy ? progress : "")}</p>
  </div>;
}
