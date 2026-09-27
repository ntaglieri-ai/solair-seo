import * as cheerio from "cheerio";

/**
 * Controlli GEO (Generative Engine Optimization) su una pagina: quanto è
 * facile per i motori AI leggerla, capirla e citarla. Lavora sull'HTML
 * servito dal server, come i crawler AI che non eseguono JavaScript.
 */

export type GeoStatus = "ok" | "warn" | "fail";

export type GeoCheck = {
  id: "ai-crawlers" | "structured-data" | "server-text" | "llms-txt";
  label: string;
  status: GeoStatus;
  /** Spiegazione breve del risultato. */
  detail: string;
  points: number;
  maxPoints: number;
};

export type AiCrawlerAccess = { bot: string; owner: string; allowed: boolean };

export type GeoData = {
  score: number;
  checks: GeoCheck[];
  robots: { found: boolean; crawlers: AiCrawlerAccess[] };
  structuredData: { faq: boolean; organization: boolean; localBusiness: boolean; types: string[] };
  serverText: { words: number };
  llmsTxt: { found: boolean; url: string };
};

/** Crawler dei principali motori AI, per addestramento e per le risposte. */
const AI_CRAWLERS: { bot: string; owner: string }[] = [
  { bot: "GPTBot", owner: "OpenAI" },
  { bot: "OAI-SearchBot", owner: "OpenAI" },
  { bot: "ChatGPT-User", owner: "OpenAI" },
  { bot: "ClaudeBot", owner: "Anthropic" },
  { bot: "Claude-SearchBot", owner: "Anthropic" },
  { bot: "PerplexityBot", owner: "Perplexity" },
  { bot: "Google-Extended", owner: "Google (Gemini)" },
  { bot: "CCBot", owner: "Common Crawl" },
];

/** Tipi schema.org che contano come LocalBusiness (il tipo o i sottotipi più comuni nel settore). */
const LOCAL_BUSINESS_TYPES = new Set([
  "LocalBusiness",
  "HomeAndConstructionBusiness",
  "Electrician",
  "GeneralContractor",
  "HVACBusiness",
  "RoofingContractor",
  "ProfessionalService",
  "Store",
]);

/** Sotto questa soglia di parole la pagina probabilmente dipende da JavaScript. */
const MIN_WORDS_OK = 200;
const MIN_WORDS_WARN = 50;

const FETCH_TIMEOUT_MS = 8_000;
const USER_AGENT = "Mozilla/5.0 (compatible; MosTagAuditBot/1.0)";

async function fetchText(url: string): Promise<{ status: number; type: string; body: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    return { status: res.status, type: res.headers.get("content-type") ?? "", body: await res.text() };
  } catch {
    return null;
  }
}

// robots.txt

type RobotsGroup = { agents: string[]; rules: { allow: boolean; path: string }[] };

function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    const match = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const field = match[1].toLowerCase();
    const value = match[2].trim();

    if (field === "user-agent") {
      // User-agent consecutivi condividono lo stesso gruppo di regole.
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((field === "allow" || field === "disallow") && current) {
      // "Disallow:" vuoto non vieta nulla.
      if (value) current.rules.push({ allow: field === "allow", path: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

function ruleMatches(rulePath: string, path: string): boolean {
  const anchored = rulePath.endsWith("$");
  const pattern = (anchored ? rulePath.slice(0, -1) : rulePath)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${pattern}${anchored ? "$" : ""}`).test(path);
}

/**
 * Regole di Google/RFC 9309: vale il gruppo del bot (altrimenti "*"), e tra
 * le regole che combaciano vince la più lunga; a parità, Allow.
 */
function isAllowed(groups: RobotsGroup[], bot: string, path: string): boolean {
  const name = bot.toLowerCase();
  const own = groups.filter((g) => g.agents.includes(name));
  const applicable = own.length ? own : groups.filter((g) => g.agents.includes("*"));
  let best: { allow: boolean; length: number } | null = null;
  for (const rule of applicable.flatMap((g) => g.rules)) {
    if (!ruleMatches(rule.path, path)) continue;
    const length = rule.path.length;
    if (!best || length > best.length || (length === best.length && rule.allow)) {
      best = { allow: rule.allow, length };
    }
  }
  return best?.allow ?? true;
}

// Dati strutturati

/** Tutti i @type presenti nei blocchi JSON-LD, anche dentro @graph e negli oggetti annidati. */
export function collectJsonLdTypes(html: string): string[] {
  const $ = cheerio.load(html);
  const types = new Set<string>();
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const type = record["@type"];
    for (const t of Array.isArray(type) ? type : [type]) {
      if (typeof t === "string") types.add(t.replace(/^https?:\/\/schema\.org\//, ""));
    }
    Object.values(record).forEach(walk);
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      walk(JSON.parse($(el).contents().text()));
    } catch {
      // JSON-LD malformato: ignorato.
    }
  });
  return [...types];
}

// Testo nell'HTML

function countServerWords(html: string): number {
  const $ = cheerio.load(html);
  $("script, style, noscript, template, svg, iframe").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text ? text.split(" ").filter((word) => /[\p{L}\p{N}]/u.test(word)).length : 0;
}

/** Esegue i controlli GEO su `url`, usando l'HTML della pagina già scaricato. */
export async function scanGeo(url: string, html: string): Promise<GeoData> {
  const target = new URL(url);
  const llmsUrl = `${target.origin}/llms.txt`;

  const [robotsRes, llmsRes] = await Promise.all([fetchText(`${target.origin}/robots.txt`), fetchText(llmsUrl)]);

  // robots.txt: senza file (404) tutto è permesso; altri errori li trattiamo come assenza.
  const robotsFound = robotsRes !== null && robotsRes.status === 200 && !/html/i.test(robotsRes.type);
  const groups = robotsFound ? parseRobots(robotsRes.body) : [];
  const path = `${target.pathname}${target.search}` || "/";
  const crawlers = AI_CRAWLERS.map((c) => ({ ...c, allowed: isAllowed(groups, c.bot, path) }));
  const allowedCount = crawlers.filter((c) => c.allowed).length;
  const blocked = crawlers.filter((c) => !c.allowed).map((c) => c.bot);

  // Dati strutturati
  const types = collectJsonLdTypes(html);
  const structuredData = {
    faq: types.includes("FAQPage"),
    organization: types.includes("Organization") || types.includes("Corporation"),
    localBusiness: types.some((t) => LOCAL_BUSINESS_TYPES.has(t)),
    types,
  };
  const presentSd = [
    structuredData.faq && "FAQ",
    structuredData.organization && "Organization",
    structuredData.localBusiness && "LocalBusiness",
  ].filter(Boolean) as string[];
  const missingSd = ["FAQ", "Organization", "LocalBusiness"].filter((t) => !presentSd.includes(t));

  // Testo senza JavaScript
  const words = countServerWords(html);

  // llms.txt: deve esistere ed essere testo, non una pagina HTML di errore servita con 200.
  const llmsFound =
    llmsRes !== null &&
    llmsRes.status === 200 &&
    !/html/i.test(llmsRes.type) &&
    !/^\s*<(!doctype|html)/i.test(llmsRes.body) &&
    llmsRes.body.trim().length > 0;

  const checks: GeoCheck[] = [
    {
      id: "ai-crawlers",
      label: "Crawler AI ammessi nel robots.txt",
      status: allowedCount === crawlers.length ? "ok" : allowedCount === 0 ? "fail" : "warn",
      detail: !robotsFound
        ? "robots.txt assente: tutti i crawler sono ammessi."
        : blocked.length
          ? `Bloccati: ${blocked.join(", ")}.`
          : `Tutti ammessi (${crawlers.length} crawler controllati).`,
      points: Math.round((30 * allowedCount) / crawlers.length),
      maxPoints: 30,
    },
    {
      id: "structured-data",
      label: "Dati strutturati (FAQ, Organization, LocalBusiness)",
      status: missingSd.length === 0 ? "ok" : presentSd.length === 0 ? "fail" : "warn",
      detail: presentSd.length
        ? `Presenti: ${presentSd.join(", ")}.${missingSd.length ? ` Mancano: ${missingSd.join(", ")}.` : ""}`
        : "Nessuno dei tre tipi presente nel JSON-LD.",
      points: presentSd.length * 10,
      maxPoints: 30,
    },
    {
      id: "server-text",
      label: "Testo leggibile senza JavaScript",
      status: words >= MIN_WORDS_OK ? "ok" : words >= MIN_WORDS_WARN ? "warn" : "fail",
      detail:
        words >= MIN_WORDS_OK
          ? `${words} parole già nell'HTML.`
          : `Solo ${words} parole nell'HTML: il contenuto probabilmente arriva via JavaScript e i crawler AI non lo vedono.`,
      points: words >= MIN_WORDS_OK ? 30 : words >= MIN_WORDS_WARN ? 15 : 0,
      maxPoints: 30,
    },
    {
      id: "llms-txt",
      label: "File llms.txt",
      status: llmsFound ? "ok" : "fail",
      detail: llmsFound ? `Presente su ${llmsUrl}.` : `Non trovato su ${llmsUrl}.`,
      points: llmsFound ? 10 : 0,
      maxPoints: 10,
    },
  ];

  return {
    score: checks.reduce((sum, check) => sum + check.points, 0),
    checks,
    robots: { found: robotsFound, crawlers },
    structuredData,
    serverText: { words },
    llmsTxt: { found: llmsFound, url: llmsUrl },
  };
}
