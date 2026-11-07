import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { safeRead } from "../../lib/engine/safe";
import { formatDate } from "../../lib/format";
import { readHomeGemini } from "../data/home-geo";
import { baselineAudit } from "../data/audit-baseline";
import styles from "./overview.module.css";

export async function HomeAi() {
  const data = await safeRead("home Gemini", () => readHomeGemini(baselineAudit.domain));
  const summary = data?.summary, top = data?.sources?.ranked.slice(0, 3) ?? [];
  const max = Math.max(1, ...top.map(s => s.prompts));
  return (
    <section id="ai" className={`${styles.card} ${styles.panel}`} aria-labelledby="ai-title">
      <header className={styles.bigHead}>
        <h2 id="ai-title">L’AI come ti conosce</h2>
        <p>Facciamo a Gemini le domande che un cliente potrebbe fare prima di scegliere un installatore, senza nominare Solair, e vediamo chi cita nelle risposte.</p>
      </header>
      {!data ? <p className={styles.empty}>Dati non disponibili in questo momento.</p>
        : !summary || !data.scan ? <p className={styles.empty}>La prima rilevazione sulle risposte AI non è ancora disponibile.</p>
        : <>
          <div className={styles.block}>
            <p className={styles.bigNumber}><b data-tone={summary.nonBrandMentioned === 0 ? "alert" : "ok"}>{summary.nonBrandMentioned}</b> su {summary.nonBrandComplete}</p>
            <p className={styles.bigText}>risposte in cui Gemini nomina Solair, quando il cliente non la conosce ancora. Rilevazione del {formatDate(data.scan.startedAt)}.</p>
            <p className={styles.bigText}>Quando la domanda cita Solair per nome, Gemini la riconosce in <b>{summary.brandMentioned} risposte su {summary.brandComplete}</b>.</p>
          </div>
          {top.length > 0 && <div className={styles.block}>
            <h3>I siti che Gemini cita più spesso</h3>
            <ul className={styles.bigSources}>{top.map(s => <li key={s.host}><a href={s.url} target="_blank" rel="noreferrer">{s.host}</a>
              <span className={styles.bar} aria-hidden="true"><i style={{ width: `${(s.prompts / max) * 100}%` }} /></span>
              <b>{s.prompts}</b></li>)}</ul>
            <p className={styles.bigNote}>Numero di risposte in cui il sito compare tra le fonti, al posto di Solair.</p>
          </div>}
          <div className={styles.block}><Link className={styles.link} href="/visibilita-ai">Leggi tutte le risposte <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
        </>}
    </section>
  );
}
