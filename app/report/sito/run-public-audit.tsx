"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../../operazioni.module.css";

export function RunPublicAudit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function run() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/public-audit", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const result = await response.json();
      if (!response.ok || typeof result.url !== "string" || !/^\/report\/sito\?audit=[\da-f-]+$/i.test(result.url)) throw new Error(result.error || "Analisi non disponibile.");
      router.push(result.url); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Analisi non disponibile."); }
    finally { setBusy(false); }
  }
  return <div className={styles.noPrint}><button className={styles.auditRun} onClick={run} disabled={busy}>{busy ? "Lettura del sito in corso…" : "Analizza solairgroup.it"}</button><span role="status" aria-live="polite">{busy ? " Stiamo leggendo contenuti e collegamenti pubblici." : ""}</span><p className={styles.note}>Entro cinque minuti, una richiesta ripetuta riapre la stessa analisi.</p>{error && <p className={styles.error} role="alert">{error}</p>}</div>;
}
