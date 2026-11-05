"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./geo.module.css";
import { collectGeo } from "../../lib/geo/client";

export function GeoRunButton({ available, running, reserveUsd }: { available: boolean; running: boolean; reserveUsd: number }) {
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
  return <div aria-busy={busy}><button className={styles.primary} disabled={!available || busy} onClick={run} type="button">{busy ? "Analisi in corso…" : running ? "Riprendi analisi" : "Analizza la presenza su Gemini"}<span aria-hidden="true"> ↗</span></button><p className={styles.note} role="status" aria-live="polite">{message || `10 domande · risposte e fonti archiviate · prenotazione di ${reserveUsd.toLocaleString("it-IT", { style: "currency", currency: "USD" })} per richiesta, nei budget configurati.`}</p></div>;
}

export function GeoSettingsForm({ enabled, frequency, monthly, perScan, editable, configured }: {
  enabled: boolean; frequency: string; monthly: number; perScan: number; editable: boolean; configured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/geo/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: data.get("enabled") === "on", frequency: data.get("frequency"), monthlyBudgetUsd: Number(data.get("monthly")), scanBudgetUsd: Number(data.get("perScan")) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage("Preferenze salvate. La programmazione viene controllata ogni giorno."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Salvataggio non riuscito."); }
    finally { setBusy(false); }
  }
  return <form className={styles.form} onSubmit={save}>
    <fieldset disabled={!editable || busy}><legend>Raccolta Gemini con ricerca web</legend>
      <label className={styles.check}><input type="checkbox" name="enabled" defaultChecked={enabled}/>Abilita le analisi Gemini</label>
      <label>Quando eseguire l’analisi<select name="frequency" defaultValue={frequency}><option value="manual">Solo su richiesta</option><option value="weekly">Ogni settimana</option><option value="biweekly">Ogni due settimane</option><option value="monthly">Ogni 30 giorni</option></select></label>
      <div className={styles.fields}><label>Budget mensile (USD)<input name="monthly" type="number" min="0" max="100" step="0.01" required defaultValue={monthly}/></label><label>Budget per analisi (USD)<input name="perScan" type="number" min="0" max="100" step="0.01" required defaultValue={perScan}/></label></div>
      {editable && <button className={styles.primary} disabled={busy}>Salva preferenze AI</button>}
    </fieldset>
    <p className={styles.note}>Il motore riserva il costo prima di ogni richiesta e lascia un margine del 20%. Se il budget non basta, conserva un’analisi parziale. Gli importi sono stime di listino, non la fattura del provider.</p>
    {!configured && <p className={styles.notice}>Il collegamento Gemini con ricerca web deve essere attivato nell’ambiente del servizio prima di poter eseguire le analisi.</p>}
    {!editable && <p className={styles.note}>Accedi alla gestione per modificare queste preferenze.</p>}
    <p role="status">{message}</p>
  </form>;
}
