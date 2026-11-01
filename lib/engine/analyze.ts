import type { EngineSettings } from "./settings";
import type { UrlAudit } from "../url-audit";

export const ANALYSIS_VERSION = "rules-5";
export type Period = { from: string; to: string };
export type SearchRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
export type SearchPeriod = {
  /** Query aggregate direttamente da Google, senza sommare le righe query/pagina. */
  queries?: SearchRow[];
  keywordRowsComplete?: boolean;
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
  version?: string;
  publicAnalysis?: UrlAudit;
  pages: { url: string; status: number | null; score: number | null; issues: string[]; title: string }[];
  limitations: string[];
  sitemapFound: boolean;
  complete: boolean;
};
export type ReviewCheck = {
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

export type Opportunity = ReviewCheck & { expectedOutcome: string };

function technicalWork(issues: string[]) {
  const tasks: string[] = [];
  const supported: string[] = [];
  for (const issue of issues) {
    let task: string | undefined;
    if (issue.startsWith("Title mancante")) task = "Aggiungere un title univoco e descrittivo del contenuto della pagina, senza ripetizioni di keyword.";
    if (issue.startsWith("Meta description mancante")) task = "Scrivere una meta description specifica che riassuma il contenuto e chiarisca il motivo per visitare la pagina.";
    if (issue.startsWith("H1 mancante")) task = "Inserire un titolo principale visibile che descriva il contenuto della pagina.";
    if (/^\d+ immagini senza alt/.test(issue)) task = "Aggiungere testi alternativi descrittivi alle immagini informative; usare alt vuoto per quelle puramente decorative.";
    if (task) { tasks.push(task); supported.push(issue); }
  }
  return { tasks, supported, pending: issues.filter((issue) => !supported.includes(issue)) };
}

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
    return { version: ANALYSIS_VERSION, status: "blocked" as const, windows: evidence?.windows ?? null, summary: null, opportunities: [] as Opportunity[], checks: [] as ReviewCheck[], limitations: [...blocked, ...limitations] };
  }

  let partial = false;
  const opportunities: Opportunity[] = [];
  const checks: ReviewCheck[] = [];
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
      id: `near_top10:${page}:${query}`, kind: "near_top10", title: "Rafforzamento della pagina sulla query", page, query,
      priority: "medium", confidence: "medium", evidence: facts,
      interpretation: "La posizione media è tra 10 e 20: la pagina ha già visibilità su questa ricerca.",
      action: `Integrare la pagina ${page} con una risposta utile e documentata alla ricerca «${query}» e collegarla dalle pagine pertinenti gia' esistenti. La proposta va adattata al contenuto attuale prima della pubblicazione.`,
      expectedOutcome: "Rafforzare pertinenza del contenuto e collegamenti interni per la ricerca osservata; misurare successivamente clic e posizione sulla stessa query/pagina, senza garanzie di crescita.",
    });
    if (row.position >= 1 && row.position <= 10 && row.impressions >= Math.max(100, settings.minImpressions) && row.ctr < 0.02) opportunities.push({
      id: `ctr:${page}:${query}`, kind: "ctr", title: "Ottimizzazione del risultato di ricerca", page, query,
      priority: "medium", confidence: "medium", evidence: { ...facts, ruleThresholdCtr: 0.02 },
      interpretation: "CTR inferiore alla soglia operativa del 2% con almeno 100 impressioni e posizione media entro 10. È un segnale da verificare, non una stima di clic persi.",
      action: `Preparare una variante del title e della meta description della pagina ${page}, specifica per l'intento della ricerca «${query}» e fedele al contenuto effettivo, da approvare e pubblicare come intervento sullo snippet.`,
      expectedOutcome: "Migliorare la chiarezza del risultato e verificare un possibile aumento del CTR su query e pagina comparabili. Google puo' riscrivere title e snippet; nessun aumento di posizione e' garantito.",
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
      checks.push({
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
      checks.push({
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
    for (const finding of technical.publicAnalysis?.findings ?? []) {
      const page = pagePath(finding.evidence[0]?.url ?? "", domain);
      if (!page) continue;
      opportunities.push({ id: `public_url:${finding.id}`, kind: "technical", title: finding.title, page,
        priority: finding.priority === "alta" ? "high" : "medium", confidence: "medium",
        evidence: { publicSources: finding.evidence.map(item => `${item.url}: ${item.detail}`), publicAuditVersion: technical.publicAnalysis!.version, basis: finding.basis },
        interpretation: `${finding.observation} ${finding.impact}`, action: finding.action,
        expectedOutcome: "Verificare sul sito la correzione o il contenuto pubblicato e leggere i risultati delle rilevazioni successive. La proposta non stima incrementi di traffico o ritorni economici.",
      });
    }
    if (!technical.complete) partial = true;
    for (const row of technical.pages) {
      if (!row.issues.length) continue;
      const page = pagePath(row.url, domain);
      if (!page) continue;
      const work = technicalWork(row.issues);
      if (work.tasks.length) opportunities.push({
        id: `technical:${page}`, kind: "technical", title: "Completamento degli elementi on-page", page,
        priority: work.supported.some((issue) => issue.startsWith("Title mancante")) && (currentPages.get(page)?.clicks ?? 0) > 0 ? "high" : "medium",
        confidence: row.status === null ? "medium" : "high",
        evidence: { httpStatus: row.status ?? "non rilevato", issues: work.supported, onPageScore: row.score ?? "non calcolato" },
        interpretation: "Controlli eseguiti sull’HTML restituito dalla pagina, senza esecuzione JavaScript.",
        action: work.tasks.join(" "),
        expectedOutcome: "Rendere i contenuti della pagina piu' comprensibili agli utenti e ai motori di ricerca; verificare la correzione nel successivo controllo HTML, senza equipararla a un aumento garantito del ranking o a una citazione AI.",
      });
      if (work.pending.length) checks.push({
        id: `technical_review:${page}`, kind: "technical", title: "Verifica tecnica preliminare", page,
        priority: row.status !== null && row.status >= 400 ? "high" : "medium", confidence: "medium",
        evidence: { httpStatus: row.status ?? "non rilevato", issues: work.pending },
        interpretation: "Anomalia o euristica da approfondire: non e' ancora una modifica al sito giustificata dalle evidenze. Le soglie di lunghezza del tool non sono limiti imposti da Google; l'assenza di schema non prova un problema di ranking o di visibilita' AI.",
        action: "Verificare contenuto, destinazione e requisiti applicabili alla pagina prima di definire un intervento specifico; non applicare redirect, dati strutturati o modifiche ai contenuti in modo automatico.",
      });
    }
  }
  opportunities.sort((a, b) => Number(b.priority === "high") - Number(a.priority === "high") || a.id.localeCompare(b.id));
  checks.sort((a, b) => Number(b.priority === "high") - Number(a.priority === "high") || a.id.localeCompare(b.id));
  return {
    version: ANALYSIS_VERSION, status: partial ? "partial" as const : "complete" as const,
    windows: evidence.windows,
    summary: { current: current.totals, previous: previous.totals, opportunities: opportunities.length, checks: checks.length, ga4TimeZones: analytics?.current.timeZones ?? [] },
    opportunities, checks, limitations: [...new Set(limitations)],
  };
}
