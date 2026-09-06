export type AuditPriority = "Alta" | "Media" | "Bassa" | "Da definire";
export type AuditMode = "on-demand";

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

export type TrackingSetupItem = {
  id: string;
  title: string;
  status: "Attivo" | "Da validare" | "Da configurare";
  source: string;
  details: string[];
  nextActions: string[];
};

export type PerformanceStatus = "OK" | "In attesa" | "Da validare";

export type PerformanceItem = {
  id: string;
  title: string;
  status: PerformanceStatus;
  value: string;
  meaning: string;
  action: string;
};

export type AuditSnapshot = {
  id: string;
  label: string;
  auditDate: string;
  mode: AuditMode;
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
  trackingSetup: {
    verifiedAt: string;
    items: TrackingSetupItem[];
  };
  performance: {
    updatedAt: string;
    summary: string;
    items: PerformanceItem[];
  };
  geoAiVisibility: AuditArea;
};

export const baselineAudit: AuditSnapshot = {
  id: "baseline-2026-05",
  label: "Audit Baseline",
  auditDate: "Maggio 2026",
  mode: "on-demand",
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
        "La visibilita' organica sara' rivalutata solo con audit richiesti on demand.",
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
        "robots.txt e sitemap.xml sono elementi da verificare quando viene richiesto un nuovo audit.",
        "Core Web Vitals disponibili tramite misurazione puntuale, non ancora integrati in dashboard.",
      ],
      opportunities: [
        "Eseguire crawl tecnico on demand su redirect, canonical, sitemap e performance.",
        "Estendere lo schema LocalBusiness sulle pagine territoriali quando saranno commissionate.",
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
        "Avviare il piano editoriale per lotti di contenuti commissionati.",
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
        "Breve termine 15-30 giorni: creare pagine territoriali, rafforzare homepage e schema.",
        "Medio termine 1-3 mesi: avviare blog e citazioni NAP su directory italiane di settore.",
      ],
      criticalIssues: [
        "Senza audit on demand o dati reali aggiunti manualmente, le decisioni restano basate sulla baseline.",
        "L'import automatico via API di Search Console, Analytics e keyword tracking resta fuori scope in questo step.",
      ],
      opportunities: [
        "Creare una dashboard storica con delta tra baseline e audit commissionati.",
        "Misurare traffico, keyword, conversioni e benchmark solo quando le integrazioni saranno richieste.",
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
        "La struttura dati e' pronta per aggiungere audit on demand e confrontare score, stato e priorita' nel tempo.",
      ],
      criticalIssues: [
        "Non esistono ancora altri audit commissionati da confrontare.",
      ],
      opportunities: [
        "Calcolare delta tra la baseline e ogni nuovo audit on demand.",
        "Associare ogni nuova raccomandazione allo storico degli audit commissionati.",
      ],
      priority: "Da definire",
      auditDate: "Maggio 2026",
    },
  ],
  trackingSetup: {
    verifiedAt: "6 settembre 2026",
    items: [
      {
        id: "ga4",
        title: "Google Analytics 4",
        status: "Attivo",
        source: "Validato dal tuo account Google Analytics",
        details: [
          "Proprieta' GA4: Solair Group - Sito Web.",
          "Stream web: Solair Group Website.",
          "Stream URL: https://solairgroup.it.",
          "Stream ID: 15446409725.",
          "Measurement ID: G-3TGS369NW5.",
          "Il tag GA4 e' presente nell'HTML pubblico della homepage.",
          "Il tag GA4 e' presente anche nel configuratore.",
          "Analytics segnala traffico ricevuto nelle ultime 48 ore.",
          "Eventi configuratore rilevati: lead_submit e complete_configurator.",
        ],
        nextActions: [
          "Eseguire un test controllato in Realtime per page_view e sessione utente.",
          "Validare click telefono, email, WhatsApp, CTA e avvio configuratore durante il test.",
          "Marcare come conversioni solo gli eventi concordati commercialmente.",
        ],
      },
      {
        id: "gsc",
        title: "Google Search Console",
        status: "Attivo",
        source: "Validato dal tuo account Google Search Console",
        details: [
          "Proprieta' Search Console: solairgroup.it.",
          "Sitemap inviata: https://solairgroup.it/sitemap.xml.",
          "Stato sitemap: Riuscita.",
          "Sitemap inviata il 16 agosto 2026, ultima lettura il 30 agosto 2026.",
          "Pagine rilevate nella sitemap: 4.",
          "Video rilevati nella sitemap: 0.",
          "Indicizzazione aggiornata al 28 agosto 2026: 1 pagina indicizzata e 12 non indicizzate.",
          "Motivi principali di esclusione: 404, reindirizzamenti, rilevate ma non indicizzate, scansionate ma non indicizzate.",
          "Dettaglio 404: 3 URL legacy blog rilevati, primo rilevamento 29 marzo 2025.",
          "URL 404 rilevati: /blog/2025/03/11/hello-world/, /blog/author/vito-ragaglia/, /blog/category/uncategorized/.",
          "Ultime scansioni 404: 11 luglio 2026, 29 giugno 2026 e 10 giugno 2026.",
          "Dettaglio reindirizzamenti: 3 varianti homepage rilevate, primo rilevamento 29 marzo 2025.",
          "URL con redirect: http://www.solairgroup.it/, https://www.solairgroup.it/, http://solairgroup.it/.",
          "Le varianti redirect portano correttamente alla canonica https://solairgroup.it/ con risposta finale 200.",
          "Dettaglio rilevate non indicizzate: /configuratore, /faq e /lavora-con-noi, primo rilevamento 18 agosto 2026.",
          "FAQ e Lavora con noi rispondono 200, hanno robots index/follow e canonical coerente.",
          "Configuratore corretto il 6 settembre 2026: /configuratore ora risponde 200 direttamente senza redirect visibile.",
          "Indicizzazione richiesta il 6 settembre 2026 per /configuratore, /faq e /lavora-con-noi.",
          "robots.txt pubblico disponibile su https://solairgroup.it/robots.txt.",
        ],
        nextActions: [
          "Trattare i 404 legacy blog come bassa priorita' se non hanno traffico o backlink utili.",
          "Creare redirect 301 solo se emergono backlink, impression o traffico storico verso questi URL.",
          "Nessuna azione richiesta sui redirect homepage: sono canonici e corretti.",
          "Attendere la nuova scansione Google per /configuratore, /faq e /lavora-con-noi.",
          "Aprire il dettaglio di scansionate non indicizzate solo dopo questo passaggio.",
          "Usare questi dati come primo punto reale per il prossimo audit on demand.",
        ],
      },
      {
        id: "measurement-api",
        title: "Import dati in dashboard",
        status: "Da configurare",
        source: "Fuori scope finche' non decidiamo storage e credenziali",
        details: [
          "La dashboard non legge ancora dati GA4 o GSC via API.",
          "Gli audit restano on demand: i dati possono essere inseriti manualmente o importati dopo autorizzazione.",
        ],
        nextActions: [
          "Decidere se usare import manuale per i primi audit.",
          "Introdurre database e API solo quando serve storicizzare dati reali.",
        ],
      },
    ],
  },
  performance: {
    updatedAt: "6 settembre 2026",
    summary:
      "Snapshot operativo: misurazione attiva, copertura Google in consolidamento e baseline SEO registrata per i confronti futuri.",
    items: [
      {
        id: "traffic",
        title: "Acquisizione traffico",
        status: "OK",
        value: "Misurazione attiva",
        meaning:
          "Analytics è collegato e registra traffico reale dal sito Solair Group.",
        action: "Mantenere il presidio e leggere i dati al prossimo audit on demand.",
      },
      {
        id: "indexing",
        title: "Copertura Google",
        status: "In attesa",
        value: "3 URL inviati",
        meaning:
          "Configuratore, FAQ e Lavora con noi sono stati inviati a Google per indicizzazione.",
        action: "Attendere la nuova scansione e verificare l’esito nel prossimo controllo.",
      },
      {
        id: "conversions",
        title: "Misurazione lead",
        status: "Da validare",
        value: "Eventi presenti",
        meaning:
          "Gli eventi del configuratore sono rilevati, ma vanno qualificati come obiettivi commerciali.",
        action:
          "Concordare quali eventi diventano conversioni di riferimento.",
      },
      {
        id: "seo-baseline",
        title: "Baseline SEO",
        status: "OK",
        value: "76/100",
        meaning:
          "La base tecnica e contenutistica è buona, con crescita organica da costruire.",
        action:
          "Usare lo score come riferimento per audit e interventi futuri.",
      },
    ],
  },
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

export const audits: AuditSnapshot[] = [baselineAudit];
