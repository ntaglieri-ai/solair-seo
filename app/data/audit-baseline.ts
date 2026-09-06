export type AuditPriority = "Alta" | "Media" | "Bassa" | "Da definire";

export type AuditArea = {
  id: string;
  title: string;
  score: number | null;
  status: string;
  notes: string[];
  criticalIssues: string[];
  opportunities: string[];
  priority: AuditPriority;
  auditDate: string;
};

export type AuditSnapshot = {
  id: string;
  label: string;
  auditDate: string;
  client: string;
  domain: string;
  globalScore: number;
  positioning: string[];
  scores: {
    technicalSeo: number;
    onPage: number;
    offPage: number;
    structure: number;
  };
  areas: AuditArea[];
  geoAiVisibility: AuditArea;
};

export const baselineAudit: AuditSnapshot = {
  id: "baseline-2026-05",
  label: "Audit Baseline",
  auditDate: "Maggio 2026",
  client: "Solair Group S.r.l.",
  domain: "solairgroup.it",
  globalScore: 76,
  positioning: [
    "Brand nazionale nel fotovoltaico",
    "Installazione in tutta Italia",
    "Punti di riferimento territoriali nelle aree presidiate",
  ],
  scores: {
    technicalSeo: 88,
    onPage: 70,
    offPage: 55,
    structure: 82,
  },
  areas: [
    {
      id: "executive-summary",
      title: "Executive Summary",
      score: 76,
      status: "Base SEO positiva con crescita organica da attivare",
      notes: [
        "Solair Group opera nell'installazione di impianti fotovoltaici chiavi in mano per privati e aziende.",
        "Il sito solairgroup.it e' attivo su dominio di produzione da maggio 2026 ed e' in fase di indicizzazione Google.",
        "La base tecnica, i dati strutturati, le recensioni, la CER e il configuratore online sono asset gia' presenti.",
      ],
      criticalIssues: [
        "Il dominio e' nuovo e il profilo backlink e' ancora in costruzione.",
        "La visibilita' organica deve essere misurata e consolidata con audit successivi.",
      ],
      opportunities: [
        "Costruire traffico qualificato nei prossimi 6-12 mesi.",
        "Valorizzare il posizionamento nazionale con presidi territoriali nelle aree operative.",
      ],
      priority: "Alta",
      auditDate: "Maggio 2026",
    },
    {
      id: "technical-seo",
      title: "Technical SEO",
      score: 88,
      status: "Solido",
      notes: [
        "HTTPS e CDN Vercel Edge attivi, con latenza EU ottimale.",
        "Canonical, Open Graph, Twitter Card, meta robots e lang='it' risultano corretti.",
        "Schema WebSite, LocalBusiness, AggregateRating e FAQPage risultano implementati.",
      ],
      criticalIssues: [
        "robots.txt e sitemap.xml sono indicati come elementi da gestire nel monitoraggio continuativo.",
        "Core Web Vitals disponibili tramite monitoraggio puntuale, non ancora integrati in dashboard.",
      ],
      opportunities: [
        "Mantenere crawl tecnico mensile su redirect, canonical, sitemap e performance.",
        "Estendere lo schema LocalBusiness sulle future pagine territoriali.",
      ],
      priority: "Media",
      auditDate: "Maggio 2026",
    },
    {
      id: "on-page",
      title: "On-Page",
      score: 70,
      status: "Buono, con margine contenutistico",
      notes: [
        "Homepage con struttura heading corretta e CTA above the fold.",
        "Volume testuale indicizzabile stimato in circa 650-700 parole.",
        "FAQ con title, meta description, canonical e FAQPage JSON-LD gia' configurati.",
      ],
      criticalIssues: [
        "Homepage da espandere a 1.200+ parole per competere su query piu' forti.",
        "FAQ limitata a 6 domande, da ampliare con keyword long-tail.",
        "Widget recensioni da rendere piu' utile anche come testo indicizzabile.",
      ],
      opportunities: [
        "Espandere FAQ a 12-15 domande.",
        "Rafforzare contenuti homepage senza interventi tecnici aggiuntivi.",
      ],
      priority: "Alta",
      auditDate: "Maggio 2026",
    },
    {
      id: "site-architecture",
      title: "Site Architecture",
      score: 82,
      status: "Pulita e pronta a espandersi",
      notes: [
        "Le pagine attive includono homepage, FAQ, lavora con noi e configuratore.",
        "La struttura URL e' semantica e adatta alla fase iniziale.",
      ],
      criticalIssues: [
        "Mancano pagine dedicate per i punti di riferimento territoriali.",
        "Il blog non e' ancora attivo come area informazionale.",
      ],
      opportunities: [
        "Creare pagine /sedi/catania, /sedi/treviso, /sedi/torino, /sedi/giarre e /sedi/porto-santelpidio.",
        "Preparare /blog per il traffico informazionale sul fotovoltaico.",
      ],
      priority: "Alta",
      auditDate: "Maggio 2026",
    },
    {
      id: "keyword-opportunities",
      title: "Keyword Opportunities",
      score: null,
      status: "Opportunita' chiare, score non assegnato nel report",
      notes: [
        "Il report identifica due cluster: long-tail ad alta conversione e keyword territoriali legate alle cinque sedi.",
        "Le query su impianti fotovoltaici, accumulo, CER e incentivi hanno stagionalita' favorevole tra marzo e luglio.",
      ],
      criticalIssues: [
        "Le opportunita' keyword non sono ancora collegate a un tracciamento dati reale.",
        "Il canale blog e' ancora vergine rispetto alla domanda informazionale.",
      ],
      opportunities: [
        "impianto fotovoltaico 6 kw con accumulo prezzo",
        "detrazione 50% fotovoltaico 2025",
        "comunita' energetica rinnovabile come aderire",
        "fotovoltaico con batteria BYD prezzo",
        "PNRR fotovoltaico aziende 2025",
        "tempo ammortamento impianto fotovoltaico",
      ],
      priority: "Alta",
      auditDate: "Maggio 2026",
    },
    {
      id: "authority-off-page",
      title: "Authority / Off-Page",
      score: 55,
      status: "In fase iniziale",
      notes: [
        "Indicizzazione Google confermata con snippet organico pertinente.",
        "Profili Facebook, Instagram e LinkedIn presenti.",
        "Citazioni CCIAA presenti con dati corretti.",
        "Ahrefs DR rilevato a 0.2, fisiologico per un dominio nuovo.",
      ],
      criticalIssues: [
        "Profilo backlink ancora in costruzione.",
        "Autorita' di dominio da consolidare nei prossimi 6-12 mesi.",
      ],
      opportunities: [
        "Citazioni NAP su 20+ directory italiane di settore.",
        "Crescita backlink naturale tramite contenuti, directory e presidi territoriali.",
      ],
      priority: "Alta",
      auditDate: "Maggio 2026",
    },
    {
      id: "content-strategy",
      title: "Content Strategy",
      score: null,
      status: "Da avviare",
      notes: [
        "Il 60% delle ricerche nel settore fotovoltaico ha intent informazionale.",
        "Il blog e' indicato come canale organico a piu' alto potenziale nel medio-lungo termine.",
        "Il piano editoriale proposto copre incentivi, normative, guide tecniche e contenuti territoriali.",
      ],
      criticalIssues: [
        "Assenza di un blog attivo al momento della baseline.",
        "Contenuti informazionali non ancora usati per supportare configuratore e contatti.",
      ],
      opportunities: [
        "Avviare piano editoriale con 2 articoli al mese.",
        "Collegare ogni articolo a configuratore o contatto.",
        "Aggiornare contenuti su incentivi e normative per mantenere autorevolezza.",
      ],
      priority: "Alta",
      auditDate: "Maggio 2026",
    },
    {
      id: "action-plan",
      title: "Action Plan",
      score: null,
      status: "Prioritizzato",
      notes: [
        "Quick win entro 7 giorni: espandere FAQ e gestire robots.txt/sitemap.xml.",
        "Breve termine 15-30 giorni: creare pagine territoriali, attivare monitoraggio SEO, rafforzare homepage e schema.",
        "Medio termine 1-3 mesi: avviare blog e citazioni NAP su directory italiane di settore.",
      ],
      criticalIssues: [
        "Senza monitoraggio SEO le decisioni restano basate su stime.",
        "Search Console, Analytics e keyword tracking sono indicati come futuri, ma non attivati in questo step.",
      ],
      opportunities: [
        "Creare una dashboard storica con delta tra baseline e audit successivi.",
        "Misurare traffico, keyword, conversioni e benchmark quando le integrazioni saranno autorizzate.",
      ],
      priority: "Alta",
      auditDate: "Maggio 2026",
    },
    {
      id: "historical-comparison",
      title: "Historical Comparison",
      score: null,
      status: "Baseline iniziale registrata",
      notes: [
        "Maggio 2026 e' il primo snapshot disponibile.",
        "La struttura dati e' pronta per aggiungere audit successivi e confrontare score, stato e priorita' nel tempo.",
      ],
      criticalIssues: [
        "Non esistono ancora audit successivi da confrontare.",
      ],
      opportunities: [
        "Calcolare delta tra date future per SEO globale, tecnico, on-page, off-page e struttura.",
        "Associare ogni nuova raccomandazione allo storico degli audit.",
      ],
      priority: "Da definire",
      auditDate: "Maggio 2026",
    },
  ],
  geoAiVisibility: {
    id: "geo-ai-visibility",
    title: "GEO / AI Visibility",
    score: null,
    status: "Predisposta, non valutata",
    notes: [],
    criticalIssues: [],
    opportunities: [],
    priority: "Da definire",
    auditDate: "Maggio 2026",
  },
};
