"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity,ArrowUpRight,ChartNoAxesCombined,LoaderCircle,Settings2 } from "lucide-react";
import styles from "./launch.module.css";

export function HomeOperations(){
  const router=useRouter();
  const [busy,setBusy]=useState<"status"|"analysis"|null>(null),[error,setError]=useState<{mode:string;text:string}|null>(null);
  async function run(mode:"status"|"analysis"){
    setBusy(mode);setError(null);
    try{
      const response=await fetch("/api/home-run",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode}),signal:AbortSignal.timeout(290000)});
      const result=await response.json();
      if(!response.ok||typeof result.url!=="string")throw new Error(result.error??"Operazione non completata. Riprova tra poco.");
      router.push(result.url+(result.partial?(result.url.includes("?")?"&":"?")+"partial=1":""));
    }catch(e){setError({mode,text:e instanceof Error&&e.name!=="TimeoutError"?e.message:"L’operazione sta richiedendo più tempo del previsto. Consulta l’ultimo risultato prima di riprovare."});setBusy(null);}
  }
  return <section id="operazioni" className={styles.tiles} aria-label="Operazioni Solair SEO">
    {[{mode:"status" as const,title:"Current Status",number:"01",Icon:Activity,description:"Raccogli i dati disponibili e consulta lo stato aggiornato del sito.",cta:"Aggiorna e apri",latest:"/current-status",latestLabel:"Consulta gli ultimi dati"},
      {mode:"analysis" as const,title:"Analisi SEO/GEO",number:"02",Icon:ChartNoAxesCombined,description:"Avvia l’analisi e leggi i risultati, la loro interpretazione e gli interventi consigliati.",cta:"Avvia analisi",latest:"/analisi",latestLabel:"Consulta l’ultima analisi"}].map(({mode,title,number,Icon,description,cta,latest,latestLabel})=><article className={`${styles.tile} ${styles[mode]}`} key={mode} aria-busy={busy===mode}>
        <div className={styles.tileTop}><span className={styles.icon}><Icon size={34} strokeWidth={1.8} aria-hidden="true"/></span><span className={styles.number}>{number}</span></div>
        <h2>{title}</h2><p className={styles.description}>{description}</p>
        <button type="button" className={styles.tileButton} disabled={busy!==null} onClick={()=>run(mode)}>{busy===mode?<><LoaderCircle className={styles.spin} size={23} aria-hidden="true"/>Elaborazione in corso</>:<>{cta}<ArrowUpRight size={25} aria-hidden="true"/></>}</button>
        <Link className={styles.latest} href={latest}>{latestLabel}</Link>
        <div className={styles.feedback} role="status">{busy===mode&&<p>Attendi il completamento. Le fonti potrebbero restituire gli stessi numeri già disponibili.</p>}{error?.mode===mode&&<p className={styles.error}>{error.text}</p>}</div>
      </article>)}
    <Link className={`${styles.tile} ${styles.settings}`} href="/impostazioni">
      <div className={styles.tileTop}><span className={styles.icon}><Settings2 size={34} strokeWidth={1.8} aria-hidden="true"/></span><span className={styles.number}>03</span></div>
      <h2>Impostazioni</h2><p className={styles.description}>Scegli la frequenza delle analisi automatiche e gestisci la programmazione.</p>
      <span className={styles.tileButton}>Configura<ArrowUpRight size={25} aria-hidden="true"/></span><span className={styles.latest}>La stessa analisi, alla frequenza scelta</span>
    </Link>
  </section>;
}
