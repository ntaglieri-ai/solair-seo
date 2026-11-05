import Link from "next/link";
import { Sparkles, TrendingUp, SearchCheck } from "lucide-react";
import { relatedGeoGaps } from "../../lib/geo/seo-context";
import type { GeoAnswer } from "../../lib/geo/answer";
import type { getGeoDashboard } from "../../lib/geo/read";
import { comparableAnswers, SCAN_STATES, STOP_MESSAGES } from "../../lib/geo/comparison";
import { citationHost, summarizeScan, suggestOpportunities } from "../../lib/geo/summary";
import { MEASURE_NAME, getPromptSet } from "../../lib/geo/prompts";
import { formatDateTime } from "../../lib/format";
import { GeoRunButton } from "./geo-controls";
import styles from "./geo.module.css";

type Dashboard = Awaited<ReturnType<typeof getGeoDashboard>>;
const money = (micro: number) => (micro / 1e6).toLocaleString("it-IT", { style: "currency", currency: "USD", maximumFractionDigits: 3 });
const answersOf = (entry: Dashboard["history"][number]) => entry.requests.flatMap(row => row.result ? [row.result] : []);
const THEMES: Record<string, string> = {
  national: "Farsi trovare per le installazioni in tutta Italia", home: "Rendere riconoscibile l’offerta per le abitazioni",
  business: "Rafforzare la proposta per le imprese", configurator: "Far conoscere il configuratore fotovoltaico",
  support: "Valorizzare assistenza e monitoraggio", cer: "Dare visibilità alla proposta sulle comunità energetiche",
  selection: "Rendere confrontabili i punti di forza di Solair", roof: "Intercettare le esigenze delle piccole imprese",
};

function AnswerDetails({ answer }: { answer: GeoAnswer }) {
  const unresolved = answer.citations.some(c => c.verification === "not_verified" || (!citationHost(c) && c.url.includes("vertexaisearch.cloud.google.com")));
  return <article id={`geo-answer-${answer.promptId}`} className={styles.card}>
    <span className={styles.tag}>{answer.intent === "brand" ? "Conoscenza del brand" : "Ricerca senza nome Solair"}</span>
    <h3>{answer.question}</h3>
    <p>{!answer.complete ? "Risposta incompleta: domanda non misurata." : answer.mentioned ? "Solair viene menzionata nella risposta." : "Solair non viene nominata nel testo."} {answer.citedSolair ? "Il sito ufficiale compare tra le fonti." : unresolved ? "Attribuzione delle fonti ancora incompleta." : "Nessuna citazione del sito ufficiale riconosciuta nelle fonti disponibili."}</p>
    {!!answer.competitorsMentioned.length && <p className={styles.note}>Aziende seguite menzionate: {answer.competitorsMentioned.join(", ")}.</p>}
    <details><summary>Leggi risposta e fonti</summary><div className={styles.answer}>{answer.answer}</div>
      <ul className={styles.sources}>{answer.citations.map(c => <li key={c.url}><a href={c.finalUrl || c.url} target="_blank" rel="noreferrer">{citationHost(c) || c.title || "Fonte citata"}</a> · {c.verification === "reachable" ? "Link raggiunto" : c.verification === "not_verified" ? "In verifica" : "Destinazione non verificata"}{c.excerpt && <details><summary>Estratto della fonte</summary><p>{c.excerpt}</p></details>}</li>)}</ul>
      {!answer.citations.length && <p className={styles.note}>Il motore non ha fornito citazioni native per questa risposta.</p>}
      {!!answer.searchQueries?.length && <details><summary>Ricerche effettuate dal motore</summary><ul className={styles.sources}>{answer.searchQueries.map((query, i) => <li key={i}>{query}</li>)}</ul></details>}
      <p className={styles.note}>{answer.model} · {formatDateTime(new Date(answer.collectedAt))}. Una menzione non equivale a una raccomandazione. La raggiungibilità di una fonte non conferma la correttezza della risposta.</p>
    </details>
  </article>;
}

export function GeoPanel({ data, editable, configured }: { data: Dashboard | null; editable: boolean; configured: boolean }) {
  const latest = data?.history[0];
  const answers = latest ? answersOf(latest) : [];
  const sample = latest ? summarizeScan(answers, latest.scan.plannedPrompts) : null;
  const previous = latest?.scan.status === "done" ? data?.history.slice(1).find(entry => entry.scan.status === "done" && comparableAnswers(answers, answersOf(entry), latest.scan.plannedPrompts)) : null;
  const before = previous ? summarizeScan(answersOf(previous), previous.scan.plannedPrompts) : null;
  const opportunities = suggestOpportunities(answers);
  const gaps = opportunities.filter(o => o.kind === "prompt_gap");
  const seoContext = latest?.scan.seoContext;
  const sourceOpportunities = opportunities.filter(o => o.kind === "source_domain");
  const settings = data?.settings;
  return <div className={styles.surface}>
    <section className={styles.intro} aria-labelledby="geo-title"><div><span className={styles.eyebrow}>Solair · Presenza nelle risposte AI</span><h2 id="geo-title">Quando cercano il fotovoltaico, trovano anche Solair?</h2><p>Verifichiamo come Gemini risponde a chi cerca installatori, servizi e configuratori in Italia. Scopri dove compare Solair, quali fonti vengono citate e quali temi meritano attenzione.</p>
      {editable ? <GeoRunButton available={Boolean(settings?.enabled && configured)} running={latest?.scan.status === "running"} reserveUsd={(settings?.requestReserveMicrousd ?? 250000) / 1e6}/> : <p className={styles.note}>I risultati sono consultabili qui sotto. Accedi alla gestione per avviare una nuova analisi.</p>}
      {!settings?.enabled && data && <p className={styles.note}>Raccolta disattivata. Puoi abilitarla nelle <Link href="/impostazioni#gemini">impostazioni AI</Link>.</p>}
      {!configured && <p className={styles.notice}>Collegamento Gemini da attivare nelle impostazioni del servizio. I risultati archiviati restano disponibili.</p>}
    </div><aside><SearchCheck size={34} aria-hidden="true"/><h3>Una base concreta per decidere</h3><p>Otto domande senza il nome dell’azienda misurano la scoperta spontanea. Due domande su Solair verificano come viene descritta.</p><p className={styles.note}>{MEASURE_NAME}. Le risposte possono differire dall’app Gemini; questa misura non rappresenta ChatGPT o tutti i motori AI.</p></aside></section>
    {!data ? <p className={styles.notice}>Archivio Gemini temporaneamente non disponibile. Nessun dato è stato sostituito con valori dimostrativi.</p> : !latest ? <section className={styles.panel}><Sparkles size={28} aria-hidden="true"/><h2>Costruiamo il primo punto di confronto</h2><p>La prima analisi salverà risposte, fonti e presenza di Solair. Le analisi successive mostreranno come cambia il campione, usando le stesse domande.</p><p className={styles.note}>Le prove del pilota restano nell’archivio tecnico e non vengono presentate come una nuova rilevazione.</p></section> : <>
      <section className={styles.panel}><div className={styles.heading}><div><span className={styles.eyebrow}>Ultima rilevazione · {formatDateTime(new Date(latest.scan.startedAt))}</span><h2>{sample!.nonBrandComplete ? `${sample!.nonBrandMentioned} risposte su ${sample!.nonBrandComplete} nominano Solair` : "Presenza ancora da misurare"}</h2></div><span className={styles.tag}>{SCAN_STATES[latest.scan.status]}</span></div>
        <p>{sample!.nonBrandComplete ? sample!.nonBrandMentioned ? "Solair compare in una parte delle ricerche del campione. Le risposte permettono di capire per quali esigenze viene riconosciuta e quali temi restano da presidiare." : "Nelle risposte complete alle domande senza nome aziendale, Solair non viene menzionata. È un’indicazione su questo campione, utile per individuare i temi da approfondire." : "Le domande senza nome aziendale non hanno ancora prodotto risposte complete. Non possiamo dedurre che Solair sia assente."}</p>
        <div className={styles.metrics}>
          <div className={styles.metric}><span>Scoperta spontanea</span><strong>{sample!.nonBrandComplete ? `${sample!.nonBrandMentioned}/${sample!.nonBrandComplete}` : "—"}</strong><span>risposte senza nome Solair che la menzionano</span></div>
          <div className={styles.metric}><span>Citazioni del sito ufficiale</span><strong>{sample!.nonBrandComplete ? `${sample!.nonBrandOwnCitations}/${sample!.nonBrandComplete}` : "—"}</strong><span>risposte senza nome Solair con fonte riconosciuta</span></div>
          <div className={styles.metric}><span>Conoscenza del brand</span><strong>{sample!.brandComplete ? `${sample!.brandMentioned}/${sample!.brandComplete}` : "—"}</strong><span>risposte su Solair che la menzionano</span></div>
        </div>
        <p className={styles.note}>{sample!.complete} di {sample!.planned} domande complete. Le risposte mancanti non sono conteggiate come assenze. {latest.scan.stopReason && (STOP_MESSAGES[latest.scan.stopReason] || "Raccolta interrotta: consulta gli esiti delle singole domande.")}</p>
        {answers.some(a => a.citations.some(c => !citationHost(c))) && <p className={styles.notice}>Alcune fonti non sono state risolte: le citazioni riconosciute possono essere inferiori a quelle effettive. Le opportunità di assenza escludono le risposte con redirect Google irrisolti.</p>}
        {!!sample!.competitors.length && <p>Aziende seguite presenti nelle ricerche senza nome Solair: <strong>{sample!.competitors.map(c => `${c.name} (${c.prompts} risposte)`).join(" · ")}</strong>. È il confronto con le aziende configurate, non l’intero mercato.</p>}
      </section>
      <section className={styles.panel}><TrendingUp size={28} aria-hidden="true"/><h2>Come evolve la presenza di Solair</h2>{before ? <p>Scoperta spontanea: <strong>{before.nonBrandMentioned}/{before.nonBrandComplete} → {sample!.nonBrandMentioned}/{sample!.nonBrandComplete}</strong> rispetto al {formatDateTime(new Date(previous!.scan.startedAt))}. Stesse domande, stesso modello e protocollo.</p> : <p>Il confronto si attiva con due analisi complete e compatibili. Domande, modello o protocollo diversi vengono tenuti separati.</p>}<p className={styles.note}>Le risposte AI variano nel tempo: una variazione non dimostra, da sola, l’effetto di una modifica al sito.</p></section>
      {seoContext && <section className={styles.panel}><span className={styles.eyebrow}>SEO e Gemini · Una lettura congiunta</span><h2>Gli interventi già sostenuti dai dati del sito</h2><p>Queste proposte derivano dall’analisi SEO archiviata al {formatDateTime(new Date(seoContext.capturedAt))}{seoContext.windows ? `, con dati Google dal ${seoContext.windows.current.from} al ${seoContext.windows.current.to}` : ""}. Il contesto è salvato insieme a questa rilevazione Gemini.</p>
        {seoContext.opportunities.length ? <div className={styles.cards}>{seoContext.opportunities.filter(o => !/lavora-con-noi|carriere|careers/i.test(o.page)).slice(0, 3).map(opportunity => {
          const related = relatedGeoGaps(opportunity, answers);
          return <article className={styles.card} key={opportunity.id}><span className={styles.tag}>{opportunity.priority === "high" ? "Priorità alta" : "Priorità media"} · Riscontro SEO</span><h3>{opportunity.title}</h3><p><strong>Intervento proposto:</strong> {opportunity.action}</p><p className={styles.note}>Pagina: {opportunity.page}{opportunity.query ? ` · Ricerca: ${opportunity.query}` : ""}</p>{!!related.length && <p className={styles.notice}>Anche Gemini segnala un’area da approfondire sullo stesso tema: {related.join(" · ")}. È un’affinità di argomento, non la prova che questo intervento produrrà nuove citazioni.</p>}<details><summary>Motivazione, valore atteso e dati</summary><p><strong>Perché intervenire:</strong> {opportunity.interpretation}</p><p><strong>Valore atteso:</strong> {opportunity.expectedOutcome}</p><ul className={styles.sources}>{Object.entries(opportunity.evidence).map(([key, value]) => <li key={key}>{key}: {Array.isArray(value) ? value.join("; ") : value}</li>)}</ul></details></article>;
        })}</div> : <p>Nel contesto SEO disponibile non risultano interventi già motivati. Le opportunità Gemini qui sotto restano approfondimenti da verificare.</p>}
        <p><Link href={`/analisi?id=${seoContext.snapshotId}`}>Consulta l’analisi SEO di riferimento →</Link></p>
      </section>}
      <section className={styles.panel}><span className={styles.eyebrow}>Dai risultati alle opportunità</span><h2>Dove concentrare il prossimo approfondimento</h2><p>Ogni opportunità nasce da una domanda realmente eseguita. Prima di proporre un intervento, va collegata ai contenuti del sito e ai dati Google: una semplice assenza non dimostra un problema SEO.</p>
        {!gaps.length && !sourceOpportunities.length ? <p className={styles.note}>Non ci sono opportunità di assenza documentabili nel campione disponibile. Consulta le risposte per valutarne accuratezza e contesto.</p> : <div className={styles.cards}>{gaps.slice(0, 3).map(opportunity => {
          const answer = answers.find(a => opportunity.title.includes(a.question));
          return <article className={styles.card} key={opportunity.title}><span className={styles.tag}>Opportunità da verificare</span><h3>{THEMES[answer?.promptId ?? ""] || "Rendere più riconoscibile l’offerta di Solair"}</h3><p>{answer?.question}</p><p><strong>Il segnale:</strong> Solair non compare nel testo né tra le citazioni riconosciute per questa domanda.</p><details><summary>Prossimo passo e fonti a supporto</summary><p><strong>Il passo utile:</strong> confrontare i contenuti Solair su questo tema con le fonti effettivamente citate. Valutare informazioni mancanti, prove pubbliche e collegamenti alle pagine pertinenti.</p><ul className={styles.sources}>{opportunity.evidence.map(e => <li key={e}>{e}</li>)}</ul>{answer && <ul className={styles.sources}>{answer.citations.map(c => <li key={c.url}><a href={c.finalUrl || c.url} target="_blank" rel="noreferrer">{citationHost(c) || c.title}</a></li>)}</ul>}<p className={styles.note}>Non è ancora un intervento approvato. Il beneficio atteso è una comunicazione più pertinente e verificabile; non una garanzia di citazione da parte del motore.</p></details></article>;
        })}</div>}
        {gaps.length > 3 && <details><summary>Altri {gaps.length - 3} temi da approfondire</summary><ul className={styles.sources}>{gaps.slice(3).map(opportunity => {
          const answer = answers.find(a => opportunity.title.includes(a.question));
          return <li key={opportunity.title}><a href={`#geo-answer-${answer?.promptId}`}>{THEMES[answer?.promptId ?? ""] || opportunity.title}</a> · {answer?.question}</li>;
        })}</ul></details>}
        {!!sourceOpportunities.length && <details><summary>Fonti ricorrenti da approfondire ({sourceOpportunities.length})</summary>{sourceOpportunities.map(o => <div className={styles.card} key={o.title}><h3>{o.title}</h3><p className={styles.note}>{o.evidence.join(" ")}</p><p>Valutare la pertinenza editoriale e le condizioni della fonte prima di proporre collaborazioni o presenza aziendale. Una citazione non giustifica automaticamente iscrizioni o acquisizione di link.</p></div>)}</details>}
        <p><Link href="/analisi">Confronta con risultati Google e interventi SEO →</Link></p>
      </section>
      <details className={styles.panel}><summary>Risposte e fonti · Tutte le 10 domande</summary><p>Apri una domanda per leggere cosa ha risposto il motore e controllare le fonti. Le domande non misurate restano visibili.</p><div className={styles.cards}>{getPromptSet(latest.scan.promptSetVersion).prompts.map(prompt => {
        const answer = answers.find(a => a.promptId === prompt.id);
        return answer ? <AnswerDetails key={prompt.id} answer={answer}/> : <article className={styles.card} key={prompt.id}><span className={styles.tag}>Non misurata</span><h3>{prompt.text}</h3><p>Risposta non acquisita o richiesta interrotta. Questa domanda non viene conteggiata come un’assenza di Solair.</p></article>;
      })}</div></details>
      <details className={styles.panel}><summary>Storico delle analisi Gemini</summary><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Data</th><th>Esito</th><th>Risposte complete</th><th>Scoperta spontanea</th></tr></thead><tbody>{data.history.map(entry => { const summary = summarizeScan(answersOf(entry), entry.scan.plannedPrompts); return <tr key={entry.scan.id}><td>{formatDateTime(new Date(entry.scan.startedAt))}<br/><small>{entry.scan.trigger === "manual" ? "Su richiesta" : "Programmata"}</small></td><td>{SCAN_STATES[entry.scan.status]}</td><td>{summary.complete}/{summary.planned}</td><td>{summary.nonBrandComplete ? `${summary.nonBrandMentioned}/${summary.nonBrandComplete}` : "Non misurata"}</td></tr>; })}</tbody></table></div>
        <details><summary>Consulta risposte e fonti delle analisi precedenti</summary>{data.history.slice(1).map(entry => <details key={entry.scan.id}><summary>{formatDateTime(new Date(entry.scan.startedAt))} · {SCAN_STATES[entry.scan.status]}</summary><p className={styles.note}>{entry.scan.model} · {entry.scan.promptSetVersion}</p><div className={styles.cards}>{answersOf(entry).map(answer => <AnswerDetails key={answer.promptId} answer={answer}/>)}</div></details>)}</details><p className={styles.note}>Ultime 20 analisi. I dati precedenti restano conservati nel servizio.</p>
      </details>
    </>}
    {editable && data && <details className={styles.panel}><summary>Gestione dei consumi</summary><p>Contabilizzato nel mese: <strong>{money(data.usage.accountedMicrousd)}</strong> su {money(settings?.monthlyBudgetMicrousd ?? 0)} configurati.</p><p className={styles.note}>Comprende le stime delle risposte ricevute e le riserve delle richieste dal costo ancora incerto. Il saldo del provider può differire. OpenAI resta un’estensione separata, disattivata per impostazione predefinita.</p><Link href="/impostazioni#gemini">Imposta frequenza e budget →</Link></details>}
  </div>;
}
