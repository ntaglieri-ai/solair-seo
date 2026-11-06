"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { workStatus, type WorkItem, type Measurement } from "../../lib/interventions";
import { formatDate,formatInt,formatPercent } from "../../lib/format";
import styles from "./interventi.module.css";

export function OperatorAccess({ authenticated,label="Gestione interventi" }: { authenticated:boolean;label?:string }) {
  const router=useRouter();const [key,setKey]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function access(event:React.FormEvent) { event.preventDefault();setBusy(true);setError("");
    try{const r=await fetch("/api/operator",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({key})});const j=await r.json();if(!r.ok)throw new Error(j.error);setKey("");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Accesso non disponibile.");}finally{setBusy(false);}
  }
  if(authenticated)return <div className={styles.operator}><span>{label} attiva</span><button type="button" disabled={busy} onClick={async()=>{setBusy(true);try{const r=await fetch("/api/operator",{method:"DELETE"});if(!r.ok)throw new Error();router.refresh();}catch{setError("Impossibile uscire. Riprova.");}finally{setBusy(false);}}}>Esci dalla gestione</button><span role="status">{error}</span></div>;
  return <details className={styles.operator}><summary>{label}</summary><form onSubmit={access}><label htmlFor="operator-code">Codice operatore</label><input id="operator-code" type="password" value={key} onChange={(e)=>setKey(e.target.value)} required autoComplete="current-password"/><button disabled={busy}>{busy?"Accesso…":"Accedi"}</button><p role="status">{error}</p></form></details>;
}

export function Checklist({ item: initialItem, editable, after }: {item:WorkItem;editable:boolean;after?:Measurement}) {
  const [item,setItem]=useState(initialItem);
  const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [note,setNote]=useState("");
  if(initialItem.revision>item.revision&&!busy)setItem(initialItem);
  async function update(patch:Record<string,unknown>){const before=item;setBusy(true);setError("");
    if(patch.operation==="task")setItem({...item,tasks:item.tasks.map((t)=>t.id===patch.taskId?{...t,done:patch.done===true}:t)});
    try{
    const r=await fetch("/api/interventions",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({actionId:item.actionId,revision:item.revision,...patch})});
    const j=await r.json();if(!r.ok)throw new Error(j.error);setItem(j.item);router.refresh();
  }catch(e){setItem(before);setError(e instanceof Error?e.message:"Salvataggio non riuscito.");router.refresh();}finally{setBusy(false);}}
  const before=item.measurement;
  const completeComparison=!!before&&before.days===28&&!!after&&after.days===28;
  const analyticsComparable=completeComparison&&before.analyticsDays===28&&after.analyticsDays===28;
  return <section className={styles.checklist} aria-label={`Checklist ${item.proposal.page}`}>
    <div className={styles.workHeading}><h3>Il lavoro da svolgere</h3><span className={styles.workStatus}>{workStatus(item)}</span></div>
    {item.approvedAt&&<p className={styles.workDate}>Approvato il {formatDate(new Date(item.approvedAt))}</p>}
    <ul>{item.tasks.map((task)=><li key={task.id}><label><input type="checkbox" checked={task.done} disabled={!editable||busy||!item.approvedAt||!!item.completedAt} onChange={(e)=>update({operation:"task",taskId:task.id,done:e.target.checked})}/><span>{task.label}</span></label></li>)}</ul>
    {editable&&!item.approvedAt&&<button className={styles.workButton} disabled={busy} onClick={()=>update({operation:"approve"})}>Approva intervento</button>}
    {editable&&item.approvedAt&&!item.completedAt&&<button className={styles.workButton} disabled={busy||!item.tasks.length||!item.tasks.every((t)=>t.done)} onClick={()=>update({operation:"complete"})}>Registra completamento</button>}
    {!editable&&<p className={styles.workDate}>Le attività vengono aggiornate dal responsabile del servizio.</p>}
    {item.completedAt&&<div className={styles.outcome}><h3>Risultati dopo l’intervento</h3><p>Completato il {formatDate(new Date(item.completedAt))}. Confronto sul sito: 28 giorni di riferimento precedenti e 28 giorni interi dopo l’applicazione, con tre giorni di attesa per il consolidamento dei dati.</p>
      {before&&<p>Periodo di confronto: {formatDate(before.from)} – {formatDate(before.to)}{before.days<28?" · copertura incompleta":""}.</p>}
      {after && <p>Periodo dopo l’intervento: {formatDate(after.from)} – {formatDate(after.to)}{after.days<28?" · copertura incompleta":""}.</p>}
      {completeComparison?<div className={styles.resultGrid}><span>Clic Google<strong>{formatInt(before.clicks)} → {formatInt(after.clicks)}</strong></span><span>CTR Google<strong>{formatPercent(before.impressions?before.clicks/before.impressions:0)} → {formatPercent(after.impressions?after.clicks/after.impressions:0)}</strong></span>{analyticsComparable&&<span>Sessioni da ricerca organica<strong>{formatInt(before.sessions)} → {formatInt(after.sessions)}</strong></span>}</div>:<p>Confronto non ancora disponibile: servono due periodi completi di dati. Nessun risultato viene anticipato.</p>}
      <p>È il contesto del sito nel suo insieme: le variazioni non dimostrano da sole l’effetto di questa singola modifica.</p>
      {item.verifiedAt?<p><strong>Verifica dell’operatore · {formatDate(new Date(item.verifiedAt))}</strong><br/>{item.verificationNote}</p>:editable&&<form onSubmit={(e)=>{e.preventDefault();update({operation:"verify",note});}}><label>Esito della verifica<textarea value={note} onChange={(e)=>setNote(e.target.value)} required minLength={15} maxLength={2000} placeholder="Cosa hai verificato e con quale evidenza"/></label><button className={styles.workButton} disabled={busy}>Registra verifica</button></form>}
      {editable&&<button className={styles.reopen} disabled={busy} onClick={()=>update({operation:"reopen"})}>Riapri intervento</button>}
    </div>}
    <p role="status" className={styles.workError}>{error}</p>
  </section>;
}
