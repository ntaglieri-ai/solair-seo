/** Esaurisce le pagine disponibili; il limite di sicurezza resta esplicito. */
export async function readAllRows<T>(
  fetchPage: (offset: number, limit: number) => Promise<{ rows: T[]; total?: number }>,
  pageSize: number,
  maxRows = 50000,
): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  while (rows.length < maxRows) {
    const limit = Math.min(pageSize, maxRows - rows.length);
    const page = await fetchPage(rows.length, limit);
    if (page.rows.length > limit) throw new Error("Risposta API oltre il limite richiesto.");
    rows.push(...page.rows);
    if (page.total !== undefined && rows.length >= page.total) return { rows, truncated: false };
    if (page.rows.length < limit) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}
