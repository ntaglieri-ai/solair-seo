"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./geo.module.css";
import { collectGeo } from "../../lib/geo/client";

export function GeoRunButton({ available, running, questions, estimateUsd }: { available: boolean; running: boolean; questions: number; estimateUsd: number }) {
  const router = useRouter();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function run() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage("Raccolta delle risposte e verifica delle fonti in corso…");
    try {
      await collectGeo(message => { setMessage(message); router.refresh(); });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Analisi non disponibile. I progressi già salvati restano nello storico."); }
    finally { lock.current = false; setBusy(false); router.refresh(); }
  }
  return <div aria-busy={busy}><button className={styles.primary} disabled={!available || busy} onClick={run} type="button">{busy ? "Analisi in corso…" : running ? "Riprendi analisi" : "Analizza la presenza su Gemini"}<span aria-hidden="true"> ↗</span></button><p className={styles.note} role="status" aria-live="polite">{message || `${questions} domande · risposte e fonti archiviate · costo stimato circa ${estimateUsd.toLocaleString("it-IT", { style: "currency", currency: "USD" })}, nei budget configurati.`}</p></div>;
}
