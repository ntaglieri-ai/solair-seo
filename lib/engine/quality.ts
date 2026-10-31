/** Conserva le fonti indipendenti: GA4 mancante non cancella evidenze GSC valide. */
export async function gatherSources<G, A>(gsc: () => Promise<G>, ga4: (() => Promise<A>) | null) {
  const [search, analytics] = await Promise.allSettled([gsc(), ga4 ? ga4() : Promise.resolve(null)]);
  if (search.status === "rejected") throw search.reason;
  return {
    gsc: search.value,
    ga4: analytics.status === "fulfilled" ? analytics.value : null,
    sourceErrors: analytics.status === "rejected" ? [`ga4: ${analytics.reason instanceof Error ? analytics.reason.message : "fonte non disponibile"}`] : [],
  };
}
