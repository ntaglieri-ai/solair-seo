"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AI_ENGINES,AI_QUESTIONS } from "../../lib/free-research";
import styles from "./research.module.css";
export function ResearchButton({body,children}:{body:Record<string,unknown>;children:React.ReactNode}){
  const router=useRouter();const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function save(){setBusy(true);setMessage("");try{const r=await fetch("/api/research",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.error);router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"Errore di salvataggio.");}finally{setBusy(false);}}
  return <><button type="button" className={`${styles.button} ${styles.mutedButton}`} disabled={busy} onClick={save}>{children}</button><span role="status" className={styles.error}>{message}</span></>;
}
export function ResearchForm({kind,today}:{kind:"watch"|"rival"|"backlinks"|"ai";today:string}){
  const router=useRouter();const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[failed,setFailed]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;setBusy(true);setMessage("");setFailed(false);
    try{const data=new FormData(form);const values:Record<string,unknown>={operation:kind};
      for(const [key,value]of data.entries())if(typeof value==="string")values[key]=value;
      if(kind==="rival")values.enabled=true;
      if(kind==="backlinks"){const file=data.get("file");if(!(file instanceof File)||!file.size||file.size>1_000_000)throw new Error("Scegli un CSV fino a 1 MB.");values.csv=await file.text();values.filename=file.name;}
      const r=await fetch("/api/research",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(values)}),j=await r.json();if(!r.ok)throw new Error(j.error);
      setMessage("Salvato nell’archivio.");form.reset();router.refresh();
    }catch(e){setFailed(true);setMessage(e instanceof Error?e.message:"Salvataggio non riuscito.");}finally{setBusy(false);}
  }
  return <form className={styles.form} onSubmit={submit}>
    {kind==="watch"&&<label>Ricerca da seguire<input name="query" required minLength={2} maxLength={200} placeholder="Una ricerca strategica per Solair"/></label>}
    {kind==="rival"&&<><label>Nome azienda<input name="name" required maxLength={100}/></label><label>Dominio<input name="domain" required maxLength={250} placeholder="azienda.it"/></label><label>Motivo del confronto<textarea name="reason" required minLength={10} maxLength={1000}/></label></>}
    {kind==="backlinks"&&<><label>Data dell’esportazione<input type="date" name="date" required defaultValue={today} max={today}/></label><label>Esportazione CSV di Search Console<input type="file" name="file" required accept=".csv,text/csv"/></label><p>Massimo 5.000 righe e 1 MB. Usa l’esportazione delle pagine con link, con colonna “Linking page” o “Pagina con link”. È accettato anche source_url,target_url. La destinazione può mancare nell’export: resterà non disponibile.</p></>}
    {kind==="ai"&&<><label>Motore<select name="engine">{AI_ENGINES.map(e=><option key={e}>{e}</option>)}</select></label><label>Data della verifica<input name="date" type="date" required defaultValue={today} max={today}/></label><label>Domanda verificata<input name="question" list="ai-questions" required minLength={15} maxLength={1000}/><datalist id="ai-questions">{AI_QUESTIONS.map(q=><option value={q} key={q}/>)}</datalist></label><label>Contesto della prova<input name="context" required defaultValue="Italia · italiano · nuova conversazione" minLength={5} maxLength={500}/></label><label>Risposta completa, copiata dal motore<textarea name="answer" required minLength={30} maxLength={20000}/></label><label>Link condiviso della risposta, se disponibile<input name="evidenceUrl" type="url"/></label><label>URL delle fonti citate, uno per riga<textarea name="sources" maxLength={10000}/></label><p>Registra la risposta reale, anche se Solair non compare. Una menzione del nome non equivale a una raccomandazione. Nessuna risposta verrà generata o acquistata dall’app.</p></>}
    <button disabled={busy}>{busy?"Salvataggio…":kind==="watch"?"Segui questa query":kind==="rival"?"Aggiungi benchmark":kind==="backlinks"?"Importa esportazione":"Archivia verifica AI"}</button><p role="status" className={failed?styles.error:styles.success}>{message}</p>
  </form>;
}
