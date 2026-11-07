import { baselineAudit } from "../data/audit-baseline";
import { readHomePerformance } from "../data/home-performance";
import { getGscWeekly } from "../../lib/engine/read";
import { safeRead } from "../../lib/engine/safe";
import { formatDate, formatInt, formatShortDate } from "../../lib/format";
import { CollectionNotice } from "./collection-notice";
import { WeeklyBars } from "./weekly-bars";
import styles from "./overview.module.css";

/** Solo valori e spiegazioni: nessun confronto con altri periodi. I confronti vivono nel report mensile. */
export async function HomeNow() {
  const siteId = baselineAudit.domain;
  const { gsc } = await readHomePerformance(siteId);
  // Settimane complete (lun-dom) e con dati: una settimana in corso o senza archivio non è "zero clic".
  let weeks = (await safeRead("home settimane", () => getGscWeekly(siteId, 14))) ?? [];
  while (weeks.length && weeks[0].clicks === 0 && weeks[0].impressions === 0) weeks = weeks.slice(1);
  if (gsc?.lastDate && new Date(`${gsc.lastDate}T12:00:00Z`).getUTCDay() !== 0) weeks = weeks.slice(0, -1);
  weeks = weeks.slice(-12);
  return (
    <section id="google" className={`${styles.card} ${styles.panel} ${styles.first}`} aria-labelledby="now-title">
      <CollectionNotice siteId={siteId} />
      <header className={styles.bigHead}>
        <h2 id="now-title">Ora su Google, dove sei</h2>
        <p>Ogni barra è una settimana, dal lunedì alla domenica. Passa sopra una barra per leggere il valore esatto.{gsc?.lastDate ? <> Dati aggiornati al <b>{formatDate(gsc.lastDate)}</b>.</> : null}</p>
      </header>
      {weeks.length < 4 ? <p className={styles.empty}>Servono almeno quattro settimane complete di dati per mostrare l’andamento. Le prime settimane si completano in automatico.</p> : <>
        <div className={styles.block}>
          <h3>Quante persone arrivano al sito da Google</h3>
          <p className={styles.bigText}>Sono i <b>clic</b>: persone che hanno trovato Solair su Google e hanno aperto il sito.</p>
          <WeeklyBars valueLabel="clic" points={weeks.map(w => ({ start: w.start, label: `Settimana del ${formatShortDate(w.start)}`, value: w.clicks, detail: `${formatInt(w.impressions)} impressioni` }))} />
        </div>
        <div className={styles.block}>
          <h3>Quante volte Solair compare su Google</h3>
          <p className={styles.bigText}>Sono le <b>impressioni</b>: ogni volta che il sito appare nei risultati di una ricerca, anche se nessuno lo apre.</p>
          <WeeklyBars valueLabel="impressioni" points={weeks.map(w => ({ start: w.start, label: `Settimana del ${formatShortDate(w.start)}`, value: w.impressions, detail: `${formatInt(w.clicks)} clic` }))} />
        </div>
      </>}
    </section>
  );
}
