import type { EngineSettings } from "./settings";

export const ANALYSIS_VERSION = "rules-3";
export type Period = { from: string; to: string };
export type SearchRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
export type SearchPeriod = {
  pages: SearchRow[];
  queryPages: SearchRow[];
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  pagesComplete: boolean;
  queriesComplete: boolean;
};
export type AnalyticsPeriod = {
  pages: { page: string; sessions: number; engagedSessions: number; contactEvents: number; formSubmissions: number }[];
  reliable: boolean;
  timeZones: string[];
  limitations: string[];
};
export type Evidence = {
  collectedAt: string;
  windows: { current: Period; previous: Period };
  gsc: { current: SearchPeriod; previous: SearchPeriod };
  ga4: { current: AnalyticsPeriod; previous: AnalyticsPeriod } | null;
  sourceErrors?: string[];
};
export type TechnicalEvidence = {
  pages: { url: string; status: number | null; score: number | null; issues: string[]; title: string }[];
  limitations: string[];
  sitemapFound: boolean;
  complete: boolean;
};
export type Opportunity = {
  id: string;
  kind: "ctr" | "near_top10" | "decline" | "growth" | "contact_check" | "technical";
  title: string;
  page: string;
  query?: string;
  priority: "high" | "medium";
  confidence: "high" | "medium";
  evidence: Record<string, string | number | string[]>;
  interpretation: string;
  action: string;
};

/** Join al livello del percorso: non identifica persone né attribuisce lead a keyword. */
export function pagePath(raw: string, domain: string): string | null {
  if (!raw || raw === "(not set)" || !(/^(https?:\/\/|\/)/.test(raw))) return null;
  try {
    const url = new URL(raw, `https://${domain}`);
    if (!["http:", "https:"].includes(url.protocol) || url.hostname.replace(/^www\./, "") !== domain.replace(/^www\./, "")) return null;
    return url.pathname.replace(/\/+$/, "") || "/";
  } catch { return null; }
}

function searchPages(rows: SearchRow[], domain: string) {
  const pages = new Map<string, { clicks: number; impressions: number }>();
  for (const row of rows) {
    const path = pagePath(row.keys[0], domain);
    if (!path) continue;
    const item = pages.get(path) ?? { clicks: 0, impressions: 0 };
    item.clicks += row.clicks;
    item.impressions += row.impressions;
    pages.set(path, item);
  }
  return pages;
}

function queryPageGroups(rows: SearchRow[], domain: string): SearchRow[] {
  const groups = new Map<string, SearchRow>();
  for (const row of rows) {
    const page = pagePath(row.keys[1], domain);
    const query = row.keys[0];
    if (!page || !query) continue;
    const key = JSON.stringify([query, page]);
    const before = groups.get(key);
    const impressions = (before?.impressions ?? 0) + row.impressions;
    const clicks = (before?.clicks ?? 0) + row.clicks;
    groups.set(key, {
      keys: [query, page], impressions, clicks, ctr: impressions ? clicks / impressions : 0,
      position: impressions ? ((before?.position ?? 0) * (before?.impressions ?? 0) + row.position * row.impressions) / impressions : 0,
    });
  }
  return [...groups.values()];
}

export function analyzeEvidence(input: {
  domain: string;
  settings: EngineSettings;
  evidence: Evidence | null;
  technical: TechnicalEvidence | null;
  technicalAt: string | null;
  now: Date;
}) {
  const { domain, settings, evidence, technical, technicalAt, now } = input;
  const limitations: string[] = [
    "Le query anonimizzate da Google non sono disponibili. Non è un monitoraggio SERP indipendente.",
    "La paginazione GSC non garantisce tutte le righe: una pagina assente dalla risposta non equivale a zero clic.",
    "GSC usa date nel fuso Pacifico; GA4 usa il fuso della proprietà. Il confronto per pagina è aggregato, non un’attribuzione keyword-lead né una prova di causalità.",
    "Le interazioni di contatto sono eventi, non persone uniche. Gli invii del configuratore sono conteggiati separatamente dai clic.",
  ];
  const blocked: string[] = [];
  if (!evidence) blocked.push("Nessuna raccolta incrociata disponibile.");
  if (evidence) {
    if (!Number.isFinite(Date.parse(evidence.collectedAt)) || now.getTime() - new Date(evidence.collectedAt).getTime() > (settings.collectionDays + 1) * 86400000) blocked.push("La raccolta incrociata è troppo vecchia o priva di una data valida.");
    const { current, previous } = evidence.windows;
    const days = (p: Period) => (Date.parse(p.to) - Date.parse(p.from)) / 86400000 + 1;
    if (days(current) !== settings.windowDays || days(previous) !== settings.windowDays || Date.parse(previous.to) + 86400000 !== Date.parse(current.from)) {
      blocked.push("Periodi non allineati, sovrapposti o diversi dalla configurazione.");
    }
    if (Date.parse(current.to) > now.getTime() - (settings.lagDays - 1) * 86400000) blocked.push("Periodo troppo recente per un confronto consolidato.");
  }
  if (blocked.length || !evidence) {
    return { version: ANALYSIS_VERSION, status: "blocked" as const, windows: evidence?.windows ?? null, summary: null, opportunities: [] as Opportunity[], limitations: [...blocked, ...limitations] };
  }

  let partial = false;
  const opportunities: Opportunity[] = [];
  const { current, previous } = evidence.gsc;
  limitations.push(...(evidence.sourceErrors ?? []));
  const currentPages = searchPages(current.pages, domain);
  const previousPages = searchPages(previous.pages, domain);
  if (!current.pagesComplete || !previous.pagesComplete || !current.queriesComplete || !previous.queriesComplete) {
    partial = true;
    limitations.push("Una raccolta Search Console ha raggiunto il limite di paginazione: esclusi i confronti che richiedono un elenco completo.");
  }
  if (current.queriesComplete) for (const row of queryPageGroups(current.queryPages, domain)) {
    const query = row.keys[0];
    const page = pagePath(row.keys[1], domain);
    if (!page || !query || row.impressions < settings.minImpressions) continue;
    const facts = { impressions: row.impressions, clicks: row.clicks, ctr: row.ctr, position: row.position };
    if (row.position > 10 && row.position <= 20) opportunities.push({
      id: `near_top10:${page}:${query}`, kind: "near_top10", title: "Query vicina alla prima pagina", page, query,
      priority: "medium", confidence: "medium", evidence: facts,
      interpretation: "La posizione media è tra 10 e 20: la pagina ha già visibilità su questa ricerca.",
      action: "Verificare intento di ricerca, contenuto della pagina e collegamenti interni prima di proporre un intervento.",
    });
    if (row.position >= 1 && row.position <= 10 && row.impressions >= Math.max(100, settings.minImpressions) && row.ctr < 0.02) opportunities.push({
      id: `ctr:${page}:${query}`, kind: "ctr", title: "CTR da verificare", page, query,
      priority: "medium", confidence: "medium", evidence: { ...facts, ruleThresholdCtr: 0.02 },
      interpretation: "CTR inferiore alla soglia operativa del 2% con almeno 100 impressioni e posizione media entro 10. È un segnale da verificare, non una stima di clic persi.",
      action: "Controllare title, snippet e corrispondenza con l’intento; la media può includere dispositivi e risultati diversi.",
    });
  }
  if (current.pagesComplete && previous.pagesComplete) {
    for (const page of new Set([...currentPages.keys(), ...previousPages.keys()])) {
      // L'API GSC non garantisce tutte le righe: assenza non equivale a zero.
      if (!currentPages.has(page) || !previousPages.has(page)) continue;
      const before = previousPages.get(page)?.clicks ?? 0;
      const after = currentPages.get(page)?.clicks ?? 0;
      if (before < 10) continue;
      const delta = (after - before) / before;
      const kind = delta <= -0.2 ? "decline" : delta >= 0.3 && after >= 20 ? "growth" : null;
      if (!kind) continue;
      opportunities.push({
        id: `${kind}:${page}`, kind, title: kind === "decline" ? "Pagina in calo di clic" : "Pagina in crescita", page,
        priority: kind === "decline" ? "high" : "medium", confidence: "high",
        evidence: { previousClicks: before, currentClicks: after, changeRatio: delta },
        interpretation: kind === "decline" ? "I clic sono diminuiti di almeno il 20% tra due periodi di uguale durata." : "I clic sono cresciuti di almeno il 30%, con almeno 20 clic nel periodo attuale.",
        action: kind === "decline" ? "Verificare ricerche associate, contenuti e modifiche tecniche; non attribuire il calo a una causa senza ulteriori evidenze." : "Verificare le query in crescita e valutare quali contenuti consolidare.",
      });
    }
  }
  const analytics = evidence.ga4;
  if (!analytics || !analytics.current.reliable || !analytics.previous.reliable) {
    partial = true;
    limitations.push("Correlazione GA4 esclusa: proprietà assente o dati soggetti a limitazioni.");
  } else {
    const landingPages = new Map<string, { sessions: number; contacts: number; forms: number }>();
    for (const row of analytics.current.pages) {
      const path = pagePath(row.page, domain);
      if (!path) continue;
      const item = landingPages.get(path) ?? { sessions: 0, contacts: 0, forms: 0 };
      item.sessions += row.sessions; item.contacts += row.contactEvents; item.forms += row.formSubmissions;
      landingPages.set(path, item);
    }
    for (const [page, row] of landingPages) {
      if (row.sessions < settings.minSessions || row.contacts !== 0 || !(currentPages.get(page)?.clicks)) continue;
      opportunities.push({
        id: `contact_check:${page}`, kind: "contact_check", title: "Traffico organico senza interazioni di contatto rilevate", page,
        priority: "medium", confidence: "medium",
        evidence: { googleOrganicSessions: row.sessions, contactEvents: row.contacts, formSubmissions: row.forms, gscClicks: currentPages.get(page)!.clicks },
        interpretation: "La pagina riceve sessioni da Google organico ma non registra gli eventi di contatto configurati. Non dimostra che i visitatori non abbiano contattato l’azienda.",
        action: "Validare prima tracciamento e consenso; poi verificare CTA e percorso verso il configuratore.",
      });
    }
  }
  for (const period of analytics ? [analytics.current, analytics.previous] : []) limitations.push(...period.limitations);
  if (!technical || !technicalAt || !Number.isFinite(Date.parse(technicalAt)) || now.getTime() - Date.parse(technicalAt) > (settings.technicalDays + 1) * 86400000) {
    partial = true; limitations.push("Controlli tecnici assenti o non aggiornati: nessuna conclusione tecnica automatica.");
  } else {
    limitations.push(...technical.limitations);
    if (!technical.complete) partial = true;
    for (const row of technical.pages) {
      if (!row.issues.length) continue;
      const page = pagePath(row.url, domain);
      if (!page) continue;
      opportunities.push({
        id: `technical:${page}`, kind: "technical", title: "Criticità tecnica rilevata", page,
        priority: (row.status !== null && row.status >= 400) || (currentPages.get(page)?.clicks ?? 0) > 0 ? "high" : "medium",
        confidence: row.status === null ? "medium" : "high",
        evidence: { httpStatus: row.status ?? "non rilevato", issues: row.issues, onPageScore: row.score ?? "non calcolato" },
        interpretation: "Controlli eseguiti sull’HTML restituito dalla pagina, senza esecuzione JavaScript.",
        action: "Verificare e correggere le criticità elencate; confrontare lo score solo con analisi automatiche della stessa pagina.",
      });
    }
  }
  opportunities.sort((a, b) => Number(b.priority === "high") - Number(a.priority === "high") || a.id.localeCompare(b.id));
  return {
    version: ANALYSIS_VERSION, status: partial ? "partial" as const : "complete" as const,
    windows: evidence.windows,
    summary: { current: current.totals, previous: previous.totals, opportunities: opportunities.length, ga4TimeZones: analytics?.current.timeZones ?? [] },
    opportunities, limitations: [...new Set(limitations)],
  };
}
