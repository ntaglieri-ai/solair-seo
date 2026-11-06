import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { safeRead } from "../../lib/engine/safe";
import { readReport } from "../../lib/report-read";
import { rankActions, reportText } from "../../lib/report-presentation";
import styles from "./overview.module.css";

/** Gli interventi arrivano dall'ultima analisi validata: la home non ne inventa di propri. */
export async function HomeActions() {
  const report = await safeRead("home interventi", () => readReport());
  const items = rankActions((report?.data.opportunities ?? []).filter(a => typeof a.action === "string" && typeof a.page === "string")).slice(0, 3);
  return (
    <section className={styles.card} aria-labelledby="actions-title">
      <header className={styles.cardHead}>
        <div><h2 id="actions-title">Cosa fare ora</h2><p>Dall’ultima analisi · nessuna modifica è applicata in automatico</p></div>
        <Link className={styles.link} href="/interventi">Tutti gli interventi <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </header>
      {!items.length ? <p className={styles.empty}>{report ? "L’ultima analisi non indica interventi prioritari. Non dimostra l’assenza di opportunità." : "Genera un report per vedere gli interventi consigliati."}</p>
        : <ol className={styles.actions}>{items.map((a, i) => (
          <li key={a.id}><span className={styles.ordinal}>{i + 1}</span>
            <div><strong>{reportText(a.title)}</strong><span>{a.page}</span></div>
            <em data-priority={a.priority}>{a.priority === "high" ? "Priorità alta" : "Priorità media"}</em></li>))}</ol>}
    </section>
  );
}
