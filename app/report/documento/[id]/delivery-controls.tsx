"use client";
import { useRef, useState, type FormEvent } from "react";
import type { CrmServices } from "../../../../lib/crm-services";
import type { ReportArchive } from "../../../../lib/report-documents/archive";
import styles from "../../../operazioni.module.css";
export function DeliveryControls({ id, services, archive }: { id: string; services: CrmServices | null; archive: ReportArchive | null }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [savedPath, setSavedPath] = useState(archive?.status === "saved" ? archive.path : null);
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
      if (action === "nextcloud" && typeof data.path === "string") setSavedPath(data.path);
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
  const canSave = Boolean(services?.config.nextcloudPath && services?.status.nextcloudConfigured);
  const canEmail = services?.config.emailEnabled && services?.status.emailConfigured;
  return <section className={styles.panel}>
    <h2>Archivia e invia il report</h2>
    {savedPath ? <p>File salvato su Nextcloud: <strong>{savedPath}</strong></p>
      : archive?.status === "pending" ? <p className={styles.notice}>Il PDF è pronto. Il salvataggio su Nextcloud è in attesa e verrà ritentato automaticamente. Puoi riprovare anche da qui.</p>
      : <p className={styles.note}>Questo report non risulta ancora salvato su Nextcloud.</p>}
    {!savedPath && <button type="button" disabled={busy || !canSave} onClick={() => void deliver("nextcloud")}>{archive?.status === "pending" ? "Riprova salvataggio" : "Salva su Nextcloud"}</button>}
    {!savedPath && !canSave && <p className={styles.note}>Configura la cartella in CRM Settings → AI Features → SolairSEO.</p>}
    {canEmail ? <form className={styles.form} onSubmit={send}>
      <label>Destinatari email<input name="recipients" type="text" required maxLength={5000} placeholder="Indirizzi separati da virgola" disabled={busy} /></label>
      <p className={styles.note}>Mittente: Solair WebSite SEO Report. Comunicazione automatica da un indirizzo no-reply, omesso dal testo ma visibile nei dettagli dell’email. Ogni destinatario riceve il PDF senza vedere gli altri indirizzi.</p>
      <button disabled={busy} type="submit">{busy ? "Operazione in corso…" : "Invia report via email"}</button>
    </form> : <p className={styles.note}>L’invio email non è abilitato o il servizio non è configurato.</p>}
    <p role="status">{message}</p>
  </section>;
}
