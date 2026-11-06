import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { safeRead } from "../../lib/engine/safe";
import { formatDate } from "../../lib/format";
import { readHomeGemini } from "../data/home-geo";
import { baselineAudit } from "../data/audit-baseline";
import styles from "./overview.module.css";

const usd = (microusd: number) => `$${(microusd / 1e6).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function HomeGemini() {
  const data = await safeRead("home Gemini", () => readHomeGemini(baselineAudit.domain));
  const summary = data?.summary, top = data?.sources?.ranked.slice(0, 3) ?? [];
  const max = Math.max(1, ...top.map(s => s.prompts));
  return (
    <section className={styles.card} aria-labelledby="gemini-title">
      <header className={styles.cardHead}>
        <div><h2 id="gemini-title">Presenza su Gemini</h2>
          <p>{data?.scan ? `Scansione del ${formatDate(data.scan.startedAt)} · ${summary?.complete}/${summary?.planned} risposte complete` : "Risposte AI con ricerca web"}</p></div>
        <Link className={styles.link} href="/visibilita-ai">Apri l’analisi <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </header>
      {!data ? <p className={styles.empty}>Dati non disponibili in questo momento.</p>
        : !summary || !data.scan ? <p className={styles.empty}>Nessuna scansione completata. Avviala dall’analisi per vedere se Gemini nomina Solair nelle risposte.</p>
        : <>
          <div className={styles.geoStats}>
            <div><strong data-tone={summary.nonBrandMentioned === 0 ? "alert" : "ok"}>{summary.nonBrandMentioned}/{summary.nonBrandComplete}</strong><span>risposte spontanee che nominano Solair</span></div>
            <div><strong>{summary.brandMentioned}/{summary.brandComplete}</strong><span>risposte sulle domande con il nome Solair</span></div>
          </div>
          {top.length > 0 && <div className={styles.sources}>
            <h3>Siti citati al posto di Solair</h3>
            <ul>{top.map(s => <li key={s.host}><a href={s.url} target="_blank" rel="noreferrer">{s.host}</a>
              <span className={styles.bar} aria-hidden="true"><i style={{ width: `${(s.prompts / max) * 100}%` }} /></span>
              <b>{s.prompts}</b></li>)}</ul>
            <p>Numero di risposte spontanee in cui il sito compare tra le fonti.</p>
          </div>}
        </>}
      <footer className={styles.cardFoot}>
        {data?.settings && <span>Spesa del mese: <b>{usd(data.usage.accountedMicrousd)}</b> su {usd(data.settings.monthlyBudgetMicrousd)}</span>}
        <span>{!data?.settings?.enabled ? "Scansione solo manuale" : data.schedule.scheduled ? `Automatica ${{ weekly: "ogni settimana", biweekly: "ogni due settimane", monthly: "ogni mese", manual: "" }[data.schedule.frequency]}${data.schedule.next ? ` · dal ${formatDate(data.schedule.next)}` : ""}` : "Scansione solo manuale"}</span>
      </footer>
    </section>
  );
}
