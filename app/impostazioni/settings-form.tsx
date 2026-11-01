"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../operazioni.module.css";
export function ReportSettingsForm({enabled,analysisDays,editable}:{enabled:boolean;analysisDays:number;editable:boolean}){
  const router=useRouter();const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function save(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setMessage("");try{const r=await fetch("/api/report-settings",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({enabled:data.get("enabled")==="on",analysisDays:Number(data.get("analysisDays"))})}),j=await r.json();if(!r.ok)throw new Error(j.error);setMessage("Programmazione salvata.");router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"Salvataggio non riuscito.");}finally{setBusy(false);}}
  return <form className={styles.form} onSubmit={save}><label><input type="checkbox" name="enabled" defaultChecked={enabled} disabled={!editable||busy}/>Elaborazione automatica attiva</label><label>Genera un’analisi ogni <input type="number" name="analysisDays" min={1} max={90} required defaultValue={analysisDays} disabled={!editable||busy}/> giorni</label><p className={styles.note}>L’elaborazione automatica produce gli stessi risultati e suggerimenti del run manuale. Con l’automazione disattivata puoi continuare a elaborare su richiesta.</p>{editable?<button disabled={busy}>{busy?"Salvataggio…":"Salva programmazione"}</button>:<p className={styles.note}>Accedi qui sopra per modificare la programmazione.</p>}<p role="status">{message}</p></form>;
}
