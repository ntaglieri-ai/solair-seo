import Link from "next/link";
import { FileText, History, Settings2 } from "lucide-react";
import { safeRead } from "../../lib/engine/safe";
import { getDocumentArchive } from "../../lib/report-documents/store";
import { formatDateTime } from "../../lib/format";
import styles from "./overview.module.css";

export async function HomeLatest() {
  const docs = await safeRead("home ultimo report", () => getDocumentArchive(1));
  const doc = docs?.[0];
  return (
    <section id="operazioni" className={styles.strip} aria-label="Report e impostazioni">
      <div className={styles.stripMain}>
        <span className={styles.stripIcon}><FileText size={22} aria-hidden="true" /></span>
        <div>
          <strong>{doc ? `Ultimo report PDF · ${formatDateTime(new Date(doc.createdAt))}` : "Nessun report PDF generato"}</strong>
          <span>{doc ? `${doc.status === "complete" ? "Rilevazione completa" : "Rilevazione parziale"} · ${doc.trigger === "scheduled" ? "programmato" : "manuale"}` : "Usa “Genera Report” in alto per crearne uno."}</span>
        </div>
      </div>
      <nav className={styles.stripLinks} aria-label="Collegamenti">
        {doc && <Link href="/report/ultimo"><FileText size={17} aria-hidden="true" />Apri il PDF</Link>}
        <Link href="/report"><History size={17} aria-hidden="true" />Archivio</Link>
        <Link href="/impostazioni"><Settings2 size={17} aria-hidden="true" />Impostazioni</Link>
      </nav>
    </section>
  );
}
