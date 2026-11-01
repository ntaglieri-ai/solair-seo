import type { Metadata } from "next";
import { SiteHeader } from "../components/site-header";
import { fontVariables } from "../fonts";
import { clientConfig } from "../../lib/client-config";
import styles from "./visibilita.module.css";
import { HeroPhoto } from "../components/hero-photo";
import { getObservations,researchAccess } from "../../lib/research-store";
import { safeRead } from "../../lib/engine/safe";
import { AI_QUESTIONS } from "../../lib/free-research";
import { formatDate } from "../../lib/format";
import { OperatorAccess } from "../interventi/checklist";
import { ResearchForm } from "../ricerca/forms";
import { ResearchTabs } from "../ricerca/shell";
import researchStyles from "../ricerca/research.module.css";
export const dynamic="force-dynamic";

export const metadata: Metadata = {
  title: `Visibilità AI · ${clientConfig.productName}`,
};

export default async function VisibilitaAi() {
  const [observations,editable]=await Promise.all([safeRead("visibilità AI",()=>getObservations("solairgroup.it")),researchAccess()]);
  return (
    <main className={`${styles.page} ${fontVariables}`}>
      <section className={styles.hero} aria-labelledby="page-title">
        <HeroPhoto className={styles.heroPhoto} />
        <SiteHeader current="/visibilita-ai" />
        <div className={styles.heroBody}>
          <div className={styles.heroText}>
            <span className={styles.eyebrow}>GEO · Generative Engine Optimization</span>
            <h1 id="page-title">Visibilità AI</h1>
            <p>Risposte documentate, fonti e verifiche nel tempo</p>
          </div>
        </div>
      </section>
      <section className="content-section">
        <div className="section-inner">
          <ResearchTabs current="/visibilita-ai"/>
          <p className={researchStyles.notice}>Verifiche manuali sui motori accessibili, archiviate dall’operatore con domanda, risposta e data. Nessuna chiamata a modelli a consumo. I controlli tecnici del sito non misurano la sua presenza nelle risposte AI.</p>
          <OperatorAccess authenticated={editable} label="Gestione fonti"/>
          <details className={researchStyles.panel}><summary>Le domande da verificare</summary><ol className={researchStyles.sourceList}>{AI_QUESTIONS.map(q=><li key={q}>{q}</li>)}</ol><p className={researchStyles.note}>Ripeti la stessa domanda e lo stesso contesto in una nuova conversazione, poi archivia l’intera risposta. Per confrontare prove successive, conserva motore, lingua e contesto. Le risposte possono cambiare tra utenti e sessioni.</p><div className={researchStyles.inline}>{[{name:"ChatGPT",url:"https://chatgpt.com/"},{name:"Gemini",url:"https://gemini.google.com/"},{name:"Perplexity",url:"https://www.perplexity.ai/"},{name:"Copilot",url:"https://copilot.microsoft.com/"}].map(e=><a className={researchStyles.back} key={e.name} href={e.url} target="_blank" rel="noreferrer">Apri {e.name} ↗</a>)}</div></details>
          {editable&&<details className={researchStyles.panel}><summary>Archivia una verifica AI</summary><ResearchForm kind="ai" today={new Date().toISOString().slice(0,10)}/></details>}
          {!observations?.length?<div className={researchStyles.empty}><h2>{observations?"Nessuna rilevazione ancora archiviata":"Archivio temporaneamente non disponibile"}</h2><p>La presenza di Solair nei motori AI resta non misurata. L’assenza di verifiche non è un risultato negativo.</p></div>:<>
            <section className={researchStyles.panel}><h2>Le risposte raccolte</h2><div className={researchStyles.metrics}><span><strong>{observations.length}</strong>risposte archiviate</span><span><strong>{observations.filter(o=>o.mentionsBrand).length}</strong>menzionano Solair</span><span><strong>{observations.filter(o=>o.citesSite).length}</strong>riportano una fonte Solair</span></div><p className={researchStyles.note}>Conteggi del campione archiviato, fino alle ultime 200 verifiche; non sono un indice di visibilità generale. Una menzione include anche risposte critiche o negative. Le fonti sono dichiarate dall’operatore, non convalidate automaticamente dal motore.</p></section>
            {observations.map((o,index)=>{
              const previous=observations.slice(index+1).find(p=>p.engine===o.engine&&p.question===o.question&&p.context===o.context);
              return <section className={researchStyles.panel} key={o.id}><h2>{o.engine} · {formatDate(o.date)}</h2><h3>{o.question}</h3><p className={researchStyles.note}>{o.context}</p><p><span className={researchStyles.tag}>{o.mentionsBrand?"Solair menzionata":"Solair non menzionata"}</span> <span className={researchStyles.tag}>{o.citesSite?"Fonte solairgroup.it riportata":"Fonte Solair non riportata"}</span></p>
                {previous&&<p className={researchStyles.note}>Prova precedente con stessa domanda e contesto: {formatDate(previous.date)} · {previous.mentionsBrand?"Solair menzionata":"Solair non menzionata"}. Il confronto riguarda soltanto queste due risposte.</p>}
                <details><summary>Leggi risposta e fonti archiviate</summary><div className={researchStyles.answer}>{o.answer}</div>{o.evidenceUrl&&<p><a className={researchStyles.back} href={o.evidenceUrl} target="_blank" rel="noreferrer">Risposta condivisa ↗</a></p>}<ul className={researchStyles.sourceList}>{o.sources.map(url=><li key={url}><a href={url} target="_blank" rel="noreferrer">{url}</a></li>)}</ul></details></section>;
            })}
          </>}
        </div>
      </section>
    </main>
  );
}
