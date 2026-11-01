export type AuditScore = { id: string; date: string; score: number; methodology: string; source: string; service: boolean; startsService: boolean };

/** All'avvio del servizio maggio scompare dalla vista e dal trend, senza cancellare l'archivio. */
export function auditTrend(rows: AuditScore[]) {
  const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const start = ordered.find((row) => row.service && row.startsService);
  const visible = start ? ordered.filter((row) => row.service && row.date >= start.date) : ordered.filter((row) => !row.service);
  const latest = visible.at(-1) ?? null;
  const comparable = latest ? visible.filter((row) => row.methodology === latest.methodology) : [];
  const previous = comparable.at(-2);
  return { latest, points: comparable, serviceStarted: !!start, difference: latest && previous ? latest.score - previous.score : null };
}

export function validateAudit(value: unknown, today: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Audit non valido.");
  const row = value as Record<string, unknown>;
  if (!Number.isInteger(row.score) || Number(row.score) < 0 || Number(row.score) > 100 ||
      typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(Date.parse(row.date)) || new Date(row.date).toISOString().slice(0,10) !== row.date || row.date > today ||
      typeof row.methodology !== "string" || row.methodology.trim().length < 5 || row.methodology.length > 200 ||
      typeof row.source !== "string" || row.source.trim().length < 10 || row.source.length > 2000 ||
      typeof row.startsService !== "boolean") throw new Error("Servono data valida, punteggio 0–100, metodo e fonte dell’audit.");
  return { date: row.date, score: Number(row.score), methodology: row.methodology.trim(), source: row.source.trim(), startsService: row.startsService };
}
