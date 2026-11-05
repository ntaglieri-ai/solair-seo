import { OperationFrame } from "../../components/operation-frame";
import { getPilotRequests } from "../../../lib/geo-pilot/store";
import { PILOT_PROMPTS, PILOT_MODELS, PILOT_VERSION } from "../../../lib/geo-pilot/protocol";
import { safeRead } from "../../../lib/engine/safe";
import { formatDateTime } from "../../../lib/format";
import styles from "../../operazioni.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Confronto pilota AI | SolairSEO", robots: { index: false, follow: false } };
const money = (value: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "USD", minimumFractionDigits: 4 }).format(value);
export default async function PilotComparison() {
  const rows = await safeRead("confronto pilota AI", getPilotRequests);
  const accounted = rows?.reduce((sum, row) => sum + row.accountedMicrousd, 0) ?? 0;
  return <OperationFrame title="Confronto pilota AI" intro="Dieci domande identiche a Gemini e OpenAI con ricerca web. Una prova separata per scegliere il motore del servizio Solair." current="/visibilita-ai">
    <section className={styles.panel}><h2>Metodo e budget</h2><p>Otto domande spontanee, senza nominare Solair, e due domande sul brand. Le misure restano separate. Il test riguarda le API con ricerca, non replica le rispettive applicazioni consumer.</p>
      <p><strong>Budget di prova: 5 USD complessivi, senza rinnovo.</strong> Importo contabilizzato o prudenzialmente accantonato: {money(accounted / 1e6)}.</p>
      <p className={styles.note}>Costi stimati dal consumo restituito e dai prezzi di listino, senza sottrarre franchigie: non sono importi fatturati. Richieste fallite o con consumo ignoto mantengono una riserva di 0,25 USD; il controllo interrompe nuovi avvii prima di 4 USD, lasciando margine. Non può annullare il costo di una richiesta già in corso. Le verifiche programmate AI sono sospese.</p>
    </section>
    {rows?.some(row => row.result?.reviewNotes?.length) && <section className={styles.panel}><h2>Riscontri della verifica delle fonti</h2><p>Una fonte può esistere ed essere raggiungibile, ma riferirsi a un’altra azienda o non confermare più l’informazione citata. Questi riscontri sono stati controllati separatamente dal modello.</p>{rows.filter(row => row.result?.reviewNotes?.length).map(row => <article className={styles.recommendation} key={row.id}><h3>{row.engine === "openai" ? "OpenAI" : "Gemini"} · {row.result!.question}</h3>{row.result!.reviewNotes!.map((note, index) => <div key={index}><p>{note.note}</p><p className={styles.note}>{formatDateTime(new Date(note.checkedAt))} · {note.urls.map(url => <a key={url} href={url} target="_blank" rel="noreferrer">Fonte verificata ↗ </a>)}</p></div>)}</article>)}</section>}
    {rows === null ? <section className={styles.panel}><p>Risultati temporaneamente non disponibili.</p></section> : <>
      {(["gemini", "openai"] as const).map(engine => {
        const attempts = rows.filter(row => row.engine === engine);
        const valid = attempts.filter(row => row.result?.complete);
        const spontaneous = valid.filter(row => row.result!.intent === "non-brand");
        const branded = valid.filter(row => row.result!.intent === "brand");
        const estimated = attempts.reduce((sum, row) => sum + (row.result?.estimatedUsd ?? 0), 0);
        const uncertain = attempts.some(row => row.state !== "settled");
        return <section className={styles.panel} key={engine}><h2>{engine === "gemini" ? "Gemini con Google Search" : "OpenAI con ricerca web"}</h2><p>{PILOT_MODELS[engine]} · {valid.length} risposte complete su 10 · {attempts.length} richieste avviate</p>
          <p><strong>Domande spontanee:</strong> {spontaneous.length ? `${spontaneous.filter(row => row.result!.mentioned).length} menzioni su ${spontaneous.length} risposte misurate` : "non misurate"}. Citazioni dirette del dominio Solair: {spontaneous.length ? spontaneous.filter(row => row.result!.citedSolair).length : "non misurate"}.</p>
          <p><strong>Domande sul brand:</strong> {branded.length} risposte complete su 2; non incluse nel conteggio delle menzioni spontanee.</p>
          <p><strong>Costo stimato delle risposte con consumo noto:</strong> {attempts.length ? money(estimated) : "non misurato"}{uncertain ? ". Sono presenti richieste con costo non determinato: la stima non rappresenta il totale." : ""}</p>
          {attempts.some(row => row.result?.citations.some(citation => /vertexaisearch\.cloud\.google\.com/.test(new URL(citation.url).hostname))) && <p className={styles.note}>Google restituisce anche link di reindirizzamento: non sono attribuiti al dominio Solair prima di verificarne la destinazione.</p>}
        </section>;
      })}
      <section className={styles.panel}><h2>Risposte e fonti, domanda per domanda</h2><p className={styles.note}>Le citazioni native attestano che il motore ha collegato una fonte alla risposta. Raggiungibilità e supporto all’affermazione vanno verificati separatamente; non chiamiamo “verificato” un link solo perché è stato citato.</p>
        {PILOT_PROMPTS.map(prompt => <article className={styles.recommendation} key={prompt.id}><h3>{prompt.text}</h3><p className={styles.note}>{prompt.intent === "brand" ? "Domanda esplicita sul brand" : "Domanda spontanea"}</p>
          {(["gemini", "openai"] as const).map(engine => {
            const row = rows.find(item => item.engine === engine && item.promptId === prompt.id);
            const answer = row?.result;
            return <details key={engine}><summary>{engine === "gemini" ? "Gemini" : "OpenAI"} · {!row ? "In attesa" : answer?.complete ? answer.mentioned ? "Solair menzionata" : "Solair non menzionata" : row.state === "reserved" ? "Raccolta in corso o interrotta" : "Risposta non misurabile"}</summary>
              {answer ? <><p className={styles.note}>{formatDateTime(new Date(answer.collectedAt))} · {answer.model} · {answer.searches ?? "numero di ricerche non disponibile"} ricerche</p><div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{answer.answer}</div><h4>Citazioni native ({answer.citations.length})</h4><ul>{answer.citations.map(citation => <li key={citation.url}><a href={citation.verification === "reachable" && citation.finalUrl ? citation.finalUrl : citation.url} target="_blank" rel="noreferrer">{citation.pageTitle || citation.title || citation.url}</a><span className={styles.note}> · {citation.verification === "reachable" ? "Pagina raggiunta" : citation.verification === "unreachable" ? "Pagina non raggiunta in questa verifica" : citation.verification === "blocked" ? "Destinazione non consentita" : "Pagina da verificare"}</span></li>)}</ul>{!answer.complete && <p className={styles.note}>Risposta incompleta o ricerca non attestata: esclusa dalle misure di presenza.</p>}</> : <p>{row?.errorCode ? `Richiesta non completata (${row.errorCode}). Nessun esito negativo attribuito al brand.` : "Risposta non ancora disponibile."}</p>}
            </details>;
          })}
        </article>)}<p className={styles.note}>Protocollo {PILOT_VERSION}. La scelta del motore avverrà dopo il confronto; nessun punteggio GEO generale viene ricavato da questa prova.</p>
      </section>
    </>}
  </OperationFrame>;
}
