import { AI_ERRORS, AI_MODEL, aiSample, comparableAiBatch, type AiCheckBatch } from "../../lib/ai-checks";
import { AI_QUESTIONS } from "../../lib/free-research";
import { formatDateTime } from "../../lib/format";
import { RunAiCheck } from "./run-ai-check";
import styles from "./ai-checks.module.css";
import shared from "../ricerca/research.module.css";

const states = { complete: "Completata", partial: "Parziale", failed: "Non completata", running: "In corso" };
export function AiChecksPanel({ batches, configured, editable, cadence }: {
  batches: AiCheckBatch[] | null; configured: boolean; editable: boolean;
  cadence: { enabled: boolean; analysisDays: number } | null;
}) {
  const latest = batches?.[0];
  const sample = latest ? aiSample(latest) : null;
  const previous = latest ? batches?.slice(1).find(batch => comparableAiBatch(latest, batch)) : null;
  return <>
    <section className={styles.overview} aria-labelledby="ai-check-title">
      <div className={styles.intro}>
        <span className={styles.eyebrow}>Verifica automatica · Gemini API</span>
        <h2 id="ai-check-title">Solair compare nelle risposte?</h2>
        <p>Interroghiamo Gemini su quattro domande relative al fotovoltaico in Italia, senza suggerire il nome di Solair. Puoi leggere ogni risposta e confrontare le rilevazioni nel tempo.</p>
        {editable ? <RunAiCheck available={configured} /> : <p className={shared.note}>Per avviare una nuova verifica accedi alla gestione fonti qui sopra. Le risposte già raccolte sono consultabili qui sotto.</p>}
        {!configured && <p className={shared.notice}>La precedente raccolta senza ricerca web è sospesa. I risultati già archiviati restano disponibili.</p>}
      </div>
      <div className={styles.method}>
        <h3>Cosa stiamo misurando</h3>
        <p>Le risposte del modello <strong>{AI_MODEL}</strong> tramite API, in italiano e senza ricerca web. Non sono le risposte dell’app Gemini, di Google AI Overviews, ChatGPT o Perplexity.</p>
        <p>Le menzioni possono essere positive, negative o inesatte. Eventuali link scritti dal modello non sono fonti verificate: questa prova non misura le citazioni web.</p>
        <p className={shared.note}>{cadence ? cadence.enabled ? `Raccolta automatica ogni ${cadence.analysisDays} giorni, secondo la frequenza impostata per il servizio.` : "Automazione disattivata. Puoi avviare le verifiche manualmente." : "Stato della programmazione non disponibile."} Limite del servizio: sei raccolte al giorno, almeno 15 minuti tra due avvii. Nessun passaggio automatico al piano a pagamento.</p>
      </div>
    </section>
    {batches === null ? <p className={shared.notice}>Archivio AI temporaneamente non disponibile. Riprova tra poco.</p> : !latest ?
      <section className={shared.panel}><h2>La prima rilevazione</h2><p>Avvia la verifica per costruire il punto di partenza. Senza risposte raccolte, la presenza di Solair resta non misurata.</p></section> :
      <section className={shared.panel}>
        <div className={styles.batchHeading}><div><h2>Ultima rilevazione</h2><p className={shared.note}>{formatDateTime(new Date(latest.createdAt))} · {latest.trigger === "cron" ? "Programmata" : "Avviata manualmente"}</p></div>
          <span className={shared.tag}>{states[latest.status]}</span></div>
        <div className={styles.metrics}>
          <div><span>Risposte complete</span><strong>{sample!.measured}<small> / {sample!.expected}</small></strong></div>
          <div><span>Risposte che menzionano Solair</span><strong>{sample!.measured ? sample!.mentioned : "—"}</strong><span>{sample!.measured ? `su ${sample!.measured} risposte misurate` : "Non misurato"}</span></div>
          <div><span>Confronto precedente</span><strong>{previous ? `${aiSample(previous).mentioned} → ${sample!.mentioned}` : "—"}</strong><span>{previous ? `Attuale: ${formatDateTime(new Date(latest.createdAt))} · confronto: ${formatDateTime(new Date(previous.createdAt))}` : "Nessuna rilevazione completa confrontabile"}</span></div>
        </div>
        <p className={shared.note}>È un campione di risposte, non un punteggio GEO. I confronti richiedono stesso modello, stesse domande e stesso protocollo; un cambiamento non dimostra l’effetto di un intervento sul sito.</p>
        {AI_QUESTIONS.map(question => {
          const answer = latest.results.find(result => result.question === question);
          return <article className={styles.answerCard} key={question}><h3>{question}</h3>
            {answer?.status === "ok" ? <><span className={shared.tag}>{answer.mentionsBrand ? "Solair menzionata" : "Solair non menzionata"}</span>
              {answer.mentionedCompetitors.length > 0 && <p className={shared.note}>Benchmark menzionati: {answer.mentionedCompetitors.join(", ")}. Il conteggio riguarda solo le aziende seguite nell’app.</p>}
              <details><summary>Leggi la risposta completa</summary><div className={shared.answer}>{answer.answer}</div><p className={shared.note}>Raccolta: {formatDateTime(new Date(answer.observedAt))} · {latest.model} · risposta API senza ricerca web.</p></details></> :
              <p className={shared.note}>{answer?.error ? AI_ERRORS[answer.error] : latest.status === "running" ? "Verifica in attesa. Aggiorna la pagina per vedere l’esito." : "Risposta non acquisita: questa domanda non è misurata."}</p>}
          </article>;
        })}
      </section>}
    {batches && batches.length > 1 && <details className={shared.panel}><summary>Rilevazioni precedenti ({batches.length - 1})</summary>
      {batches.slice(1).map(batch => <article className={styles.answerCard} key={batch.id}><h3>{formatDateTime(new Date(batch.createdAt))} · {states[batch.status]}</h3><p className={shared.note}>{batch.model} · {batch.protocol} · {aiSample(batch).measured} risposte complete</p>
        {batch.results.map(result => <details key={result.question}><summary>{result.question}</summary>{result.status === "ok" ? <><p>{result.mentionsBrand ? "Solair menzionata" : "Solair non menzionata"}</p><div className={shared.answer}>{result.answer}</div></> : <p>{result.error ? AI_ERRORS[result.error] : "Non misurata"}</p>}</details>)}
      </article>)}<p className={shared.note}>Sono mostrate le ultime venti raccolte; le precedenti restano conservate nell’archivio del servizio.</p>
    </details>}
  </>;
}
