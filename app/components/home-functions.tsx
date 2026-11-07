import Link from "next/link";
import { FileText, History, Settings2 } from "lucide-react";
import { safeRead } from "../../lib/engine/safe";
import { getDocumentArchive } from "../../lib/report-documents/store";
import { KIND_LABEL } from "../../lib/report-documents/windows";
import { formatDate } from "../../lib/format";
import styles from "./overview.module.css";

export async function HomeFunctions() {
  const docs = await safeRead("home ultimo report", () => getDocumentArchive(1));
  const doc = docs?.[0];
  return (
    <section className={styles.fnSection} aria-labelledby="fn-title">
      <h2 id="fn-title">Le funzioni dell’app</h2>
      <div className={styles.fnGrid}>
        <Link className={styles.fnCard} href={doc ? "/report/ultimo" : "/report"}>
          <span className={styles.stripIcon}><FileText size={24} aria-hidden="true" /></span>
          <strong>Report</strong>
          <p>{doc ? `L’ultimo report è un ${KIND_LABEL[doc.kind].toLowerCase()} del ${formatDate(doc.createdAt)}. Aprilo o scaricalo in PDF: contiene i risultati e le azioni per migliorare.` : "Il report riassume i risultati e le azioni per migliorare. Il primo è in preparazione."}</p>
          <span className={styles.fnGo}>Apri il report →</span>
        </Link>
        <Link className={styles.fnCard} href="/report">
          <span className={styles.stripIcon}><History size={24} aria-hidden="true" /></span>
          <strong>Storico</strong>
          <p>Tutti i report passati, ordinati per data. Il report mensile viene preparato dal 4 di ogni mese.</p>
          <span className={styles.fnGo}>Vai allo storico →</span>
        </Link>
        <Link className={styles.fnCard} href="/impostazioni">
          <span className={styles.stripIcon}><Settings2 size={24} aria-hidden="true" /></span>
          <strong>Impostazioni</strong>
          <p>Quando vengono preparati i report e lo stato delle fonti collegate: Search Console, Analytics e Gemini.</p>
          <span className={styles.fnGo}>Apri le impostazioni →</span>
        </Link>
      </div>
    </section>
  );
}
