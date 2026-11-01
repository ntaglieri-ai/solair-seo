import type { CrawlPage } from "./engine/crawl";

export const URL_AUDIT_VERSION = "public-url-2";
export type AuditEvidence = { url: string; detail: string };
export type UrlFinding = { id: string; title: string; priority: "alta" | "media"; basis: "riscontro" | "opportunità"; observation: string; impact: string; action: string; evidence: AuditEvidence[] };
export type UrlAudit = {
  version: string; headline: string; summary: string; scope: { scanned: number; readable: number; complete: boolean };
  areas: { title: string; assessment: string; evidence: AuditEvidence[] }[];
  findings: UrlFinding[];
  limits: string[];
};
const path = (raw: string) => { try { return new URL(raw).pathname.replace(/\/$/, "") || "/"; } catch { return ""; } };
const excerpt = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 190);

/** A deterministic reading of public documents. No GSC, GA4, traffic estimates or paid models. */
export function analyzePublicUrl(input: { pages: CrawlPage[]; complete: boolean; sitemapFound: boolean }): UrlAudit {
  const readable = input.pages.filter(page => page.status === 200 && page.profile);
  const home = readable.find(page => page.url === input.pages[0]?.url);
  const homeText = home?.profile?.text ?? "";
  const homeHeading = home?.content?.h1[0] ?? home?.title ?? "";
  const national = /tutta italia|nazionale/i.test(homeText);
  const residential = /privati|abitazion|residenzial|\bcasa\b/i.test(homeHeading);
  const business = /aziend|impres|industr/i.test(homeHeading);
  const headings = home?.profile?.headings.filter(item => item.level > 1).map(item => item.text) ?? [];
  const findings: UrlFinding[] = [];
  const broken = input.pages.filter(page => page.status !== null && page.status >= 400);
  for (const target of broken) {
    const origins = readable.flatMap(page => (page.profile?.links ?? []).filter(link => path(link.url) === path(target.url) && /contatt|preventiv|configur|cer\b|consulent/i.test(link.label)).map(link => ({ url: page.url, detail: `Pulsante «${excerpt(link.label)}» → ${target.url} (HTTP ${target.status})` })));
    if (origins.length) findings.push({ id: `contact:${path(target.url)}`, title: "Ripristinare un percorso di contatto interrotto", priority: "alta", basis: "riscontro", observation: "Un collegamento che invita a proseguire verso un contatto o un servizio porta a una pagina che risponde con errore.", impact: "Chi segue quel collegamento può interrompere il percorso prima di raggiungere le informazioni o il contatto desiderato.", action: "Collegare il pulsante alla destinazione corretta e verificare il percorso completo, da telefono e computer. La modifica va applicata al sito dopo aver confermato la destinazione commerciale.", evidence: origins.slice(0, 3) });
  }
  // Compare the site's own CER statements; this is not validation of subsidies or financial returns.
  const rates = readable.flatMap(page => {
    const text = page.profile!.text;
    return [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*cent(?:esimi)?\s*\/\s*kwh/gi)].flatMap(match => {
      const context = text.slice(Math.max(0, match.index! - 230), match.index! + 150);
      return /cer\b|comunit|condivis/i.test(context) ? [{ value: Number(match[1].replace(",", ".")), url: page.url, detail: `${match[1]} cent/kWh dichiarati nel contenuto sulla condivisione dell’energia.` }] : [];
    });
  });
  if (new Set(rates.map(rate => rate.value)).size > 1 && new Set(rates.map(rate => rate.url)).size > 1) findings.push({ id: "cer-consistency", title: "Chiarire il beneficio economico della comunità energetica", priority: "alta", basis: "riscontro", observation: "Le pagine esaminate riportano cifre diverse per l’energia condivisa nella CER. Il sito non consente, con questi soli passaggi, di stabilire se descrivano condizioni o componenti del beneficio differenti.", impact: "Un visitatore che confronta le pagine deve poter ricostruire quale informazione si applica al proprio caso.", action: "Verificare le cifre con il responsabile del servizio, allineare i testi oppure spiegare le diverse condizioni. Aggiungere riferimenti ufficiali e data di aggiornamento alle informazioni economiche.", evidence: rates.filter((rate, index) => rates.findIndex(other => other.url === rate.url && other.value === rate.value) === index).map(({ url, detail }) => ({ url, detail })).slice(0, 4) });
  const dedicated = readable.filter(page => path(page.url) !== "/" && !/faq|configuratore|lavora|privacy|cookie|contatt|termini|condizioni/i.test(path(page.url))).filter(page => /privati|abitazion|residenzial|aziend|impres|industr/i.test(`${page.title} ${page.content?.h1.join(" ")}`));
  if (home && residential && business && dedicated.length === 0) findings.push({ id: "audience-content", title: "Distinguere il percorso per abitazioni da quello per imprese", priority: "media", basis: "opportunità", observation: "La pagina principale si rivolge a privati e aziende. Nelle pagine analizzate non sono stati individuati approfondimenti dedicati separatamente a queste due esigenze.", impact: "Le esigenze di chi valuta un impianto per casa e di chi lo valuta per un’attività possono richiedere spiegazioni e criteri di scelta differenti.", action: "Valutare due contenuti dedicati, con informazioni specifiche e un collegamento coerente al configuratore o alla consulenza. Definire il contenuto con i tecnici Solair; validare la priorità con le ricerche effettive quando disponibili.", evidence: [{ url: home.url, detail: excerpt(homeHeading) }] });
  const questions = readable.flatMap(page => page.profile!.questions.map(question => ({ url: page.url, detail: excerpt(question) })));
  const configurator = readable.find(page => /configuratore/i.test(path(page.url)));
  const contactLinks = readable.flatMap(page => page.profile!.links.filter(link => /contatt|configur|preventiv|consulent/i.test(link.label)).map(link => ({ url: page.url, detail: `«${excerpt(link.label)}» → ${link.url}` })));
  const corpus = readable.map(page => page.profile!.text).join(" ");
  const topics = [{ label: "installazione", pattern: /installazion/i }, { label: "monitoraggio", pattern: /monitoraggio/i }, { label: "accumulo", pattern: /accumulo/i }, { label: "garanzie", pattern: /garanzi/i }, { label: "incentivi", pattern: /incentiv/i }, { label: "comunità energetica", pattern: /comunit[àa] energetic|\bcer\b/i }].filter(topic => topic.pattern.test(corpus)).map(topic => topic.label);
  const areas: UrlAudit["areas"] = [
    { title: "Offerta e posizionamento", assessment: home ? `${national ? "L’offerta viene presentata su scala nazionale." : "Il sito presenta la propria offerta nella pagina principale."} ${residential && business ? "Il messaggio si rivolge sia a privati sia ad aziende: la proposta di due percorsi dedicati nasce da questa doppia destinazione." : "Il messaggio principale è riportato nelle evidenze."}` : "Non sono stati raccolti testi sufficienti per valutare l’offerta.", evidence: [{ url: home?.url ?? input.pages[0]?.url ?? "", detail: excerpt(homeHeading) }].filter(item => item.detail) },
    { title: "Contenuti e domande del cliente", assessment: `${topics.length ? `Le pagine fanno riferimento a ${topics.join(", ")}.` : "Non sono stati riconosciuti temi sufficienti per valutare i contenuti."} ${dedicated.length ? "Sono presenti percorsi dedicati a specifiche esigenze." : "Nel campione l’offerta si concentra nella pagina principale e nelle pagine di supporto."} I temi citati non equivalgono, da soli, ad approfondimenti completi.`, evidence: [...(home ? headings.slice(0, 3).map(heading => ({ url: home.url, detail: heading })) : []), ...questions.filter(item => /faq/i.test(item.url)).slice(0, 3)] },
    { title: "Percorsi verso configuratore e contatti", assessment: `${configurator ? "Il configuratore è presente tra le pagine raggiunte." : "Nelle pagine raggiunte non è stato identificato un configuratore."} ${contactLinks.length ? "Il sito invita a proseguire verso la configurazione o un contatto." : "Non sono stati riconosciuti inviti testuali a proseguire verso un contatto."} ${broken.length ? `Destinazioni con errore HTTP: ${broken.length}. Il percorso interessato va corretto prima di portare altre persone verso quella destinazione.` : "Le destinazioni raggiunte non hanno restituito errori HTTP."}`, evidence: contactLinks.slice(0, 3) },
    { title: "Accessibilità tecnica", assessment: `${readable.length} pagine con contenuto HTML leggibile su ${input.pages.length} destinazioni verificate. ${input.sitemapFound ? "La sitemap è stata letta; sono stati seguiti anche i collegamenti nei contenuti." : "La lettura usa anche i collegamenti pubblici: la sitemap non è stata confermata."} L’accessibilità non dimostra l’indicizzazione.`, evidence: input.pages.filter(page => page.status !== 200 || page.noindex).slice(0, 4).map(page => ({ url: page.url, detail: `HTTP ${page.status ?? "non rilevato"}${page.noindex ? "; noindex rilevato" : ""}` })) },
    { title: "Leggibilità dei contenuti per i motori AI", assessment: `Testo e titoli sono disponibili nell’HTML di ${readable.length} pagine. ${questions.length ? "Sono riconoscibili anche domande in forma esplicita." : "Non sono state riconosciute domande esplicite dal lettore automatico."} Questi segnali descrivono l’accesso ai contenuti, non la presenza di Solair nelle risposte AI.`, evidence: readable.filter(page => page.content?.schemaTypes.length).slice(0, 3).map(page => ({ url: page.url, detail: `Tipi di dati strutturati rilevati: ${page.content!.schemaTypes.join(", ")}. Correttezza e corrispondenza ai contenuti non certificate.` })) },
  ];
  if (!readable.length) for (const area of areas) if (area.title !== "Accessibilità tecnica") { area.assessment = "La raccolta non ha restituito contenuti sufficienti per valutare quest’area."; area.evidence = []; }
  return {
    version: URL_AUDIT_VERSION,
    headline: !home ? "La raccolta non consente ancora una valutazione complessiva." : broken.length ? "Consolidare i percorsi del cliente e la coerenza delle informazioni." : findings.some(item => item.id === "cer-consistency") ? "Rafforzare la coerenza dell’offerta e i contenuti che accompagnano la scelta." : "Sviluppare la profondità dei contenuti a partire dall’offerta del sito.",
    summary: home ? `${national ? "Solair presenta un’offerta nazionale" : "Il sito presenta la propria offerta"}${residential && business ? " rivolta a privati e aziende" : ""}${configurator ? ", con un percorso verso il configuratore" : ""}. La lettura delle pagine e dei collegamenti mette in evidenza ${findings.length} proposte da valutare: prima i riscontri sui percorsi e sulle informazioni pubblicate, poi le opportunità di sviluppo dei contenuti.` : "La raccolta non ha restituito contenuti sufficienti per una valutazione dell’offerta. I problemi di accesso sono riportati senza sostituirli con una sintesi inventata.",
    scope: { scanned: input.pages.length, readable: readable.length, complete: input.complete && !!home }, areas, findings,
    limits: ["Analisi deterministica di testi, titoli, domande e link nell’HTML pubblico; non è una valutazione generata da un modello AI.", "La copertura riguarda solo le pagine raggiunte entro il limite di scansione. L’assenza nel campione non dimostra l’assenza nel sito.", "Nessuna stima di traffico, volumi delle keyword, posizione, backlink o citazioni AI. Le affermazioni economiche e le recensioni del sito non sono verificate come vere.", "I tempi di download dell’HTML sono misure della raccolta dal server: non sono Core Web Vitals o un test della velocità nel browser.", "Nessun modulo viene inviato e nessuna modifica viene applicata al sito. Le priorità sono editoriali e tecniche, non stime del ritorno economico."],
  };
}
