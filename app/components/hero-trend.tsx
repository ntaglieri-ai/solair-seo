import { readHomePerformance } from "../data/home-performance";
import { hasComparableCoverage, googleClickDirection } from "../data/home-overview";
import { comparisonPeriods, formatPeriod } from "../../lib/comparison-periods";
import { formatDelta, formatInt } from "../../lib/format";
import styles from "./hero-report.module.css";
export async function HeroTrend({ siteId }: { siteId: string }) {
  const { gsc } = await readHomePerformance(siteId);
  const comparable = hasComparableCoverage(gsc, 28);
  const direction = googleClickDirection(gsc);
  const label = { up: "In miglioramento", down: "In calo", flat: "Stabile", unavailable: "Confronto non disponibile" }[direction];
  const windows = gsc?.lastDate ? comparisonPeriods(gsc.lastDate) : null;
  const delta = comparable && gsc ? formatDelta(gsc.current.clicks, gsc.previous.clicks) : null;
  return <aside className={styles.trend} data-direction={direction} aria-label="Andamento dei clic da Google"><span className={styles.symbol} aria-hidden="true">{{ up: "↑", down: "↓", flat: "＝", unavailable: "—" }[direction]}</span><div><strong>{label}{delta && delta.trend !== "flat" ? ` · ${delta.text}` : ""}</strong><span>Clic da Google{comparable && gsc ? ` · ${formatInt(gsc.previous.clicks)} → ${formatInt(gsc.current.clicks)}` : " · servono due periodi completi"}</span>{windows && <><p><b>Periodo analizzato:</b> {formatPeriod(windows.current)}</p><p><b>Periodo di confronto:</b> {formatPeriod(windows.previous)}</p></>}</div></aside>;
}
