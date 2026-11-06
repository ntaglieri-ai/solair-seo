"use client";
import { useRef,useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../operazioni.module.css";
export function GeneratePdf({snapshotId,label="Genera PDF",latest=false}:{snapshotId?:string;label?:string;latest?:boolean}){
  const router=useRouter(),lock=useRef(false);const[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function generate(){if(lock.current)return;lock.current=true;setBusy(true);setError("");try{
    const response=await fetch("/api/reports/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(latest?{}:{snapshotId})});const result=await response.json();
    if(!response.ok||typeof result.url!=="string")throw new Error(result.error||"PDF non disponibile.");router.push(result.url);
  }catch(e){setError(e instanceof Error?e.message:"PDF non disponibile.");setBusy(false);lock.current=false;}}
  return <div><button className={styles.primaryLink} type="button" disabled={busy} onClick={generate}>{busy?"Preparazione PDF…":label}</button><p role="status" className={styles.note}>{error}</p></div>;
}
