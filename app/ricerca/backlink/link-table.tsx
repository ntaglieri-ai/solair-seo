"use client";
import { useState } from "react";
import type { Backlink } from "../../../lib/free-research";
import styles from "../research.module.css";
export function LinkTable({links}:{links:Backlink[]}){
  const [filter,setFilter]=useState(""),[page,setPage]=useState(0);
  const rows=links.filter(l=>`${l.source} ${l.target??""}`.toLowerCase().includes(filter.toLowerCase()));const count=Math.max(1,Math.ceil(rows.length/50)),current=Math.min(page,count-1);
  return <><label>Filtra domini e pagine<br/><input className={styles.search} value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}}/></label><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Pagina con link</th><th>Destinazione</th></tr></thead><tbody>{rows.slice(current*50,current*50+50).map(l=><tr key={JSON.stringify([l.source,l.target])}><td><a href={l.source} target="_blank" rel="noreferrer">{l.source}</a></td><td>{l.target?<a href={l.target} target="_blank" rel="noreferrer">{l.target}</a>:"Non indicata nell’esportazione"}</td></tr>)}</tbody></table></div><div className={styles.pager}><button className={styles.button} disabled={!current} onClick={()=>setPage(current-1)}>Precedenti</button><span>{rows.length} link · pagina {current+1} / {count}</span><button className={styles.button} disabled={current===count-1} onClick={()=>setPage(current+1)}>Successive</button></div></>;
}
