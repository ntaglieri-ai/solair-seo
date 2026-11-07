import Link from "next/link";
import { safeRead } from "../../lib/engine/safe";
import { getDocumentArchive } from "../../lib/report-documents/store";
import base from "../home.module.css";

/** La home non genera report: li apre. La generazione è nella funzione Report. */
export async function HeroActions() {
  const docs = await safeRead("hero ultimo report", () => getDocumentArchive(1));
  return <div className={base.heroActions}>
    <Link className={base.primary} href={docs?.length ? "/report/ultimo" : "/report"}>{docs?.length ? "Apri l’ultimo report" : "Vai ai report"}<span aria-hidden="true">↗</span></Link>
    <Link className={base.secondary} href="#stato">Vedi i risultati<span aria-hidden="true">↓</span></Link>
  </div>;
}
