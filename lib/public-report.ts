import type { CrawlPage } from "./engine/crawl";
import type { Evidence } from "./engine/analyze";

export type PublicFinding = { title: string; action: string };
export function publicPath(raw: string): string | null {
  try {
    const url = new URL(raw, "https://solairgroup.it");
    if (!/^https?:$/.test(url.protocol) || url.hostname.replace(/^www\./, "") !== "solairgroup.it") return null;
    return url.pathname.replace(/\/$/, "") || "/";
  } catch { return null; }
}

/** Only public HTML enters this projection: no account data, score or ranking estimates. */
export function publicPageReport(page: CrawlPage) {
  const readable = page.status === 200 && page.score !== null;
  const findings: PublicFinding[] = [];
  if (!readable) findings.push({ title: "Pagina da verificare", action: "Verificare la risposta della pagina prima di valutarne contenuti e metadati. Non impostare redirect senza conoscere la destinazione corretta." });
  else {
    if (!page.title.trim()) findings.push({ title: "Titolo della pagina assente", action: "Aggiungere un title specifico che descriva la pagina e il servizio offerto." });
    if (!page.description.trim()) findings.push({ title: "Descrizione della pagina assente", action: "Scrivere una descrizione specifica del contenuto e del motivo per visitare la pagina." });
    if (page.content?.h1.length === 0 || page.issues.some(issue => issue.startsWith("H1 mancante"))) findings.push({ title: "Titolo principale assente nell’HTML", action: "Inserire un titolo principale visibile che chiarisca l’argomento della pagina." });
    if (page.noindex) findings.push({ title: "Direttiva noindex rilevata", action: "Confermare se l’esclusione dai risultati è intenzionale prima di modificare la direttiva." });
    if (page.issues.some(issue => issue.startsWith("Title duplicato"))) findings.push({ title: "Titolo condiviso con altre pagine", action: "Valutare titoli distinti per pagine con contenuti e finalità differenti." });
  }
  return {
    url: page.url, path: publicPath(page.url), status: page.status, readable,
    title: readable ? page.title : null, description: readable ? page.description : null,
    canonical: readable ? page.canonical : null, noindex: readable ? page.noindex : null,
    content: readable ? page.content ?? null : null, findings,
  };
}

/** A missing Google row is unknown, not zero. Path joins do not imply causation. */
export function comparePublicPage(page: ReturnType<typeof publicPageReport>, evidence: Evidence | null) {
  const rows = evidence?.gsc.current.pages.filter(row => page.path !== null && publicPath(row.keys[0]) === page.path) ?? [];
  const gsc = rows.length ? rows.reduce((sum, row) => ({ clicks: sum.clicks + row.clicks, impressions: sum.impressions + row.impressions }), { clicks: 0, impressions: 0 }) : null;
  const ga = evidence?.ga4?.current;
  const sessions = ga?.reliable ? ga.pages.filter(row => page.path !== null && publicPath(row.page) === page.path) : [];
  const organicSessions = sessions.length ? sessions.reduce((sum, row) => sum + row.sessions, 0) : null;
  let reading = "I dati disponibili non consentono di collegare questa pagina alle performance Google.";
  if (gsc) {
    if (page.findings.length && gsc.impressions > 0) reading = "La pagina compare su Google e presenta elementi da verificare nel sito. I dati aiutano a valutarne la priorità, ma non dimostrano che questi elementi causino le performance osservate.";
    else if (gsc.impressions > 0) reading = "La pagina compare su Google. L’assenza dei rilievi HTML controllati non esclude opportunità sulle query e sui contenuti.";
    else reading = "La fonte restituisce questa pagina senza impressioni nel periodo. Il dato non dimostra un problema di indicizzazione.";
  }
  return { gsc, organicSessions, reading };
}
