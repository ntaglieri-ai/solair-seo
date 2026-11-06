import type { Period } from "../../lib/engine/analyze";
import { formatPeriod } from "../../lib/comparison-periods";
import styles from "./comparison-periods.module.css";
export function ComparisonPeriods({ current, previous }: { current: Period; previous: Period }) {
  return <div className={styles.periods} aria-label="Periodi del confronto"><div><strong>Periodo analizzato</strong><span>{formatPeriod(current)}</span></div><div><strong>Periodo di confronto</strong><span>{formatPeriod(previous)}</span></div></div>;
}
