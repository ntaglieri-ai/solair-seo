"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../ricerca/research.module.css";

export function RunAiCheck({ available }: { available: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function run() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/ai-checks", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Verifica non disponibile.");
      setMessage(result.status === "complete" ? "Verifica completata. Le risposte sono archiviate qui sotto." :
        result.status === "partial" ? "Raccolta parziale: alcune domande non sono state misurate. Consulta gli esiti qui sotto." :
          "Il motore non ha completato le risposte. Consulta il motivo nell’ultima rilevazione.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Verifica non disponibile."); }
    finally { setBusy(false); }
  }
  return <div aria-busy={busy}>
    <button type="button" className={styles.button} disabled={busy || !available} onClick={run}>
      {busy ? "Sto raccogliendo le risposte…" : "Verifica le risposte AI"}
    </button>
    <p role="status" aria-live="polite" className={styles.note}>{message || (busy ? "La raccolta può richiedere circa un minuto. Puoi lasciare aperta questa pagina." : "Quattro domande · nuove conversazioni indipendenti · risposte salvate nello storico")}</p>
  </div>;
}
