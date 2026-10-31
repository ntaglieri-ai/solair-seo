import Link from "next/link";
import { getLatestAttempts } from "../../lib/engine/read";
import { safeRead } from "../../lib/engine/safe";

export async function CollectionNotice({ siteId }: { siteId: string }) {
  const attempts = await safeRead("aggiornamento fonti", () => getLatestAttempts(siteId));
  const failed = attempts?.filter((run) => ["gsc", "ga4"].includes(run.kind) && run.status === "error");
  const missing = ["gsc", "ga4"].some((kind) => !attempts?.some((run) => run.kind === kind));
  const stale = attempts?.some((run) =>
    ["gsc", "ga4"].includes(run.kind) && run.stale,
  );
  if (attempts && !missing && !stale && !failed?.length) return null;

  const needsAuth = failed?.some((run) => run.error?.includes("invalid_grant"));
  return (
    <aside className="source-notice" role="status">
      <strong>{needsAuth ? "Autorizzazione Google da rinnovare" : "Aggiornamento dati da verificare"}</strong>
      <p>
        {failed?.length
          ? "L’ultima raccolta non è riuscita. Restano visibili i dati archiviati, con la loro data di riferimento."
          : stale
            ? "Le ultime raccolte risalgono a più di quattro giorni fa. I dati archiviati non rappresentano una rilevazione aggiornata."
            : "Lo stato della raccolta non è disponibile. Verificare le fonti prima di interpretare i risultati."}
      </p>
      <Link href="/sezioni/tracking-setup">Stato delle fonti</Link>
    </aside>
  );
}
