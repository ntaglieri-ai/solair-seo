"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ChartNoAxesCombined, Files, LoaderCircle, Settings2 } from "lucide-react";
import styles from "./launch.module.css";

export function HomeOperations() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function generate() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/home-run", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "analysis" }), signal: AbortSignal.timeout(290000),
      });
      const result = await response.json();
      if (!response.ok || typeof result.url !== "string") throw new Error(result.error ?? "Analisi non completata. Riprova tra poco.");
      router.push(result.url + (result.partial ? (result.url.includes("?") ? "&" : "?") + "partial=1" : ""));
    } catch (e) {
      setError(e instanceof Error && e.name !== "TimeoutError" ? e.message : "L’analisi sta richiedendo più tempo del previsto. Consulta l’ultimo report prima di riprovare.");
      setBusy(false);
    }
  }
  return <section id="operazioni" className={styles.tiles} aria-label="Operazioni Solair SEO">
    <article className={`${styles.tile} ${styles.status}`} aria-busy={busy}>
      <div className={styles.tileTop}><span className={styles.icon}><ChartNoAxesCombined size={34} strokeWidth={1.8} aria-hidden="true" /></span><span className={styles.number}>01</span></div>
      <h2>Genera analisi</h2>
      <p className={styles.description}>Aggiorna le fonti disponibili e ottieni un report con risultati, interpretazione e interventi consigliati.</p>
      <button type="button" className={styles.tileButton} disabled={busy} onClick={generate}>{busy ? <><LoaderCircle className={styles.spin} size={23} aria-hidden="true" />Analisi in corso</> : <>Genera il report<ArrowUpRight size={25} aria-hidden="true" /></>}</button>
      <Link className={styles.latest} href="/analisi">Apri l’ultimo report disponibile</Link>
      <div className={styles.feedback} role="status">{busy && <p>Raccolta e analisi in corso. Il report indicherà il periodo effettivamente disponibile.</p>}{error && <p className={styles.error}>{error}</p>}</div>
    </article>
    <Link className={`${styles.tile} ${styles.analysis}`} href="/report">
      <div className={styles.tileTop}><span className={styles.icon}><Files size={34} strokeWidth={1.8} aria-hidden="true" /></span><span className={styles.number}>02</span></div>
      <h2>Report e storico</h2>
      <p className={styles.description}>Consulta l’ultima analisi e ritrova le rilevazioni precedenti, con date, risultati e suggerimenti.</p>
      <span className={styles.tileButton}>Apri i report<ArrowUpRight size={25} aria-hidden="true" /></span><span className={styles.latest}>Un unico archivio per analisi manuali e automatiche</span>
    </Link>
    <Link className={`${styles.tile} ${styles.settings}`} href="/impostazioni">
      <div className={styles.tileTop}><span className={styles.icon}><Settings2 size={34} strokeWidth={1.8} aria-hidden="true" /></span><span className={styles.number}>03</span></div>
      <h2>Impostazioni</h2>
      <p className={styles.description}>Scegli la frequenza dei report automatici e consulta lo stato delle fonti collegate.</p>
      <span className={styles.tileButton}>Configura<ArrowUpRight size={25} aria-hidden="true" /></span><span className={styles.latest}>La stessa analisi, alla frequenza scelta</span>
    </Link>
  </section>;
}
