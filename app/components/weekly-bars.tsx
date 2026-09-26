"use client";

import { useState } from "react";
import styles from "./weekly-bars.module.css";

const numberFormat = new Intl.NumberFormat("it-IT");
const formatValue = (value: number) => numberFormat.format(value);

export type WeeklyPoint = {
  start: string;
  label: string;
  value: number;
  detail: string;
};

/** Arrotonda il massimo a un valore "tondo" per l'asse (1, 2, 2.5, 5 × 10^n). */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

/**
 * Barre verticali per una sola serie settimanale. Un'unica serie, quindi
 * niente legenda: il titolo della sezione la nomina.
 */
export function WeeklyBars({
  points,
  valueLabel,
}: {
  points: WeeklyPoint[];
  valueLabel: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((p) => p.value), 0));
  const ticks = [max, max / 2, 0];
  const hovered = active === null ? null : points[active];

  return (
    <figure className={styles.chart}>
      <div className={styles.plot}>
        <div className={styles.axis} aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick}>{formatValue(tick)}</span>
          ))}
        </div>
        <div className={styles.area} onMouseLeave={() => setActive(null)}>
          <div className={styles.grid} aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} />
            ))}
          </div>
          <div className={styles.bars}>
            {points.map((point, index) => (
              <button
                type="button"
                key={point.start}
                className={styles.hit}
                data-active={active === index || undefined}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                aria-label={`${point.label}: ${formatValue(point.value)} ${valueLabel}, ${point.detail}`}
              >
                <span
                  className={styles.bar}
                  style={{ height: `${(point.value / max) * 100}%` }}
                />
              </button>
            ))}
          </div>
          {hovered && active !== null && (
            <div
              className={styles.tooltip}
              role="status"
              style={{
                left: `${((active + 0.5) / points.length) * 100}%`,
                transform: `translateX(${active > points.length / 2 ? "-100%" : "0"})`,
              }}
            >
              <strong>{hovered.label}</strong>
              <span>
                {formatValue(hovered.value)} {valueLabel}
              </span>
              <span>{hovered.detail}</span>
            </div>
          )}
        </div>
      </div>
      <div className={styles.xLabels} aria-hidden="true">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>

      <table className={styles.srOnly}>
        <caption>{valueLabel} per settimana</caption>
        <thead>
          <tr>
            <th scope="col">Settimana</th>
            <th scope="col">{valueLabel}</th>
            <th scope="col">Dettaglio</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.start}>
              <th scope="row">{point.label}</th>
              <td>{formatValue(point.value)}</td>
              <td>{point.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
