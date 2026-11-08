"use client";
import { useRef, useState, type FormEvent } from "react";
import type { CrmServices } from "../../../../lib/crm-services";
import styles from "../../../operazioni.module.css";
export function DeliveryControls({ id, services }: { id: string; services: CrmServices | null }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const emailOperation = useRef<{ id: string; key: string } | null>(null);
  async function deliver(action: "nextcloud" | "email", recipients: string[] = []) {
    if (busy) return;
    setBusy(true); setMessage("");
    const recipientKey = [...new Set(recipients.map(value => value.trim().toLowerCase()))].sort().join(",");
    if (action === "email" && emailOperation.current?.key !== recipientKey) emailOperation.current = { id: crypto.randomUUID(), key: recipientKey };
    try {
      const response = await fetch(`/api/reports/${id}/delivery`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, recipients, operationId: action === "email" ? emailOperation.current?.id : crypto.randomUUID() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage(data.message);
      // Keep the operation ID for this document and recipient list: a double click or uncertain
      // connection must never send the same report a second time.
    } catch (error) { setMessage(error instanceof Error ? error.message : "Operazione non riuscita."); }
    finally { setBusy(false); }
  }
  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("recipients") ?? "");
    void deliver("email", value.split(/[;,\s]+/).filter(Boolean));
  }
  if (!services) return <p className={styles.note}>Servizi CRM non disponibili. Riprova tra poco.</p>;
  const canSave = Boolean(services.config.nextcloudPath && services.status.nextcloudConfigured);
  const canEmail = services.config.emailEnabled && services.status.emailConfigured;
  return <section className={styles.panel}>
    <h2>Archivia e invia il report</h2>
    <button type="button" disabled={busy || !canSave} onClick={() => void deliver("nextcloud")}>Salva su Nextcloud</button>
    {!canSave && <p className={styles.note}>Configura la cartella in CRM Settings → AI Features → SolairSEO.</p>}
    {canEmail ? <form className={styles.form} onSubmit={send}>
      <label>Destinatari email<input name="recipients" type="text" required maxLength={5000} placeholder="Indirizzi separati da virgola" disabled={busy} /></label>
      <p className={styles.note}>Mittente: SEO Report. L’indirizzo mittente non viene inserito nel testo del messaggio. Ogni destinatario riceve il PDF senza vedere gli altri indirizzi.</p>
      <button disabled={busy} type="submit">{busy ? "Operazione in corso…" : "Invia report via email"}</button>
    </form> : <p className={styles.note}>L’invio email non è abilitato o il servizio non è configurato.</p>}
    <p role="status">{message}</p>
  </section>;
}
