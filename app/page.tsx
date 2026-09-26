import Link from "next/link";
import { IBM_Plex_Sans, Sora } from "next/font/google";
import { baselineAudit } from "./data/audit-baseline";
import styles from "./home.module.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-sora",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
});

const currentReportUrl = "/report/2026-09-06";

const statusItems = [
  { label: "Analytics 4", value: "Tracciamento attivo", tone: "ok" },
  { label: "Search Console", value: "Proprietà verificata", tone: "ok" },
  {
    label: "Ultima rilevazione",
    prefix: "Baseline · ",
    value: baselineAudit.performance.updatedAt,
    tone: "pending",
  },
] as const;

const tools = [
  {
    title: "Report",
    description: "Sintesi periodica da condividere con il team.",
    href: currentReportUrl,
  },
  {
    title: "Performance",
    description: "Clic, impressioni e posizioni da Search Console.",
    href: "/sezioni/performance",
  },
  {
    title: "Nuovo audit live",
    description: "Analisi tecnica on demand di qualsiasi URL.",
    href: "/audit",
  },
  {
    title: "Tracking",
    description: "Query e pagine monitorate nel tempo.",
    href: "/sezioni/tracking-setup",
  },
  {
    title: "Action plan",
    description: "Interventi prioritizzati, pronti da approvare.",
    href: "/sezioni/action-plan",
  },
  {
    title: "Storico",
    description: "Baseline e audit precedenti a confronto.",
    href: "/sezioni/historical-comparison",
  },
];

export default function Home() {
  return (
    <main className={`${styles.home} ${sora.variable} ${plexSans.variable}`}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroInner}>
          <header className={styles.topbar}>
            <div className={styles.brand}>
              <span className={styles.brandMark} aria-hidden="true" />
              <div>
                <strong>SolairSEO</strong>
                <span>by Solair Group</span>
              </div>
            </div>
            <nav className={styles.topnav} aria-label="Navigazione">
              <a href="#strumenti">Strumenti</a>
            </nav>
          </header>

          <div className={styles.heroBody}>
            <span className={styles.eyebrow}>
              <span className={styles.dot} aria-hidden="true" />
              SEO &amp; GEO per il fotovoltaico
            </span>
            <h1 id="home-title">Visibilità su Google e AI</h1>
            <p className={styles.lead}>
              SolairSEO misura la visibilità di {baselineAudit.domain} su
              ricerca organica e risposte generative, e ti dice dove
              intervenire.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primary} href={currentReportUrl}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                  <path d="M14 3v5h5" />
                  <path d="M9 13h6M9 17h4" />
                </svg>
                Apri report
              </Link>
              <a
                className={styles.secondary}
                href={`https://${baselineAudit.domain}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.visitVerb}>Visita </span>
                {baselineAudit.domain}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 17L17 7" />
                  <path d="M8 7h9v9" />
                </svg>
              </a>
            </div>
          </div>

          <ul className={styles.status} aria-label="Stato sistema">
            {statusItems.map((item) => (
              <li key={item.label}>
                <span
                  className={`${styles.dot} ${item.tone === "pending" ? styles.dotPending : ""}`}
                  aria-hidden="true"
                />
                <div>
                  <span>{item.label}</span>
                  <strong>
                    {"prefix" in item && (
                      <span className={styles.statusPrefix}>{item.prefix}</span>
                    )}
                    {item.value}
                  </strong>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="strumenti" className={styles.tools} aria-labelledby="tools-title">
        <div className={styles.toolsHeading}>
          <h2 id="tools-title">Strumenti</h2>
          <span className={styles.toolsSubtitle}>Audit, tracking e storico</span>
        </div>
        <nav className={styles.toolGrid} aria-label="Strumenti">
          {tools.map((tool) => (
            <Link className={styles.toolCard} href={tool.href} key={tool.title}>
              <strong>{tool.title}</strong>
              <span>{tool.description}</span>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
