"use client";
import { useState } from "react";
import { type KeywordRow, normalizeQuery } from "../../lib/free-research";
import { formatDate,formatDecimal,formatInt,formatPercent,shortPath } from "../../lib/format";
import { ResearchButton } from "./forms";
import styles from "./research.module.css";
type History={from:string;date:string;queries:{keys:string[];clicks:number;impressions:number;position:number;ctr:number}[]}[];
export function KeywordTable({rows,history,editable,comparable}:{rows:KeywordRow[];history:History;editable:boolean;comparable:boolean}){
  const [search,setSearch]=useState(""),[page,setPage]=useState(0),[watchedOnly,setWatchedOnly]=useState(false);
  const filtered=rows.filter(r=>(!watchedOnly||r.watched)&&r.query.includes(normalizeQuery(search)));const pages=Math.max(1,Math.ceil(filtered.length/25)),current=Math.min(page,pages-1);
  return <><label>Filtra le ricerche<br/><input className={styles.search} value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="Cerca una query"/></label><p className={styles.note}><label><input type="checkbox" checked={watchedOnly} onChange={e=>{setWatchedOnly(e.target.checked);setPage(0);}}/> Solo query seguite</label> · {filtered.length} query</p>
    <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Query</th><th>Clic</th><th>Impressioni</th><th>CTR</th><th>Posizione media</th><th>Variazione posizione</th></tr></thead><tbody>{filtered.slice(current*25,current*25+25).map(row=>{
      const delta=comparable&&row.current&&row.previous?row.previous.position-row.current.position:null;
      return <tr key={row.query}><td><details><summary>{row.query}{row.watched&&" ★"}</summary><h3>Pagine rilevate</h3>{row.pages.length?<ul className={styles.sourceList}>{row.pages.map(p=><li key={p}>{shortPath(p)}</li>)}</ul>:<p>Nessuna pagina rilevata nel campione corrente.</p>}
        <h3>Rilevazioni archiviate</h3><p className={styles.note}>Finestre mobili, parzialmente sovrapposte: non sono giorni indipendenti.</p>{history.map(h=>{const r=h.queries.find(r=>normalizeQuery(r.keys[0])===row.query);return <p key={h.date} className={styles.note}>{formatDate(h.from)} – {formatDate(h.date)}: {r?`${formatInt(r.clicks)} clic · posizione ${formatDecimal(r.position)}`:"Non rilevata nel campione"}</p>;})}
        {editable&&<ResearchButton body={{operation:row.watched?"unwatch":"watch",query:row.query}}>{row.watched?"Non seguire più":"Segui query"}</ResearchButton>}
      </details></td><td>{row.current?formatInt(row.current.clicks):"N/D"}</td><td>{row.current?formatInt(row.current.impressions):"N/D"}</td><td>{row.current?formatPercent(row.current.ctr):"N/D"}</td><td>{row.current?formatDecimal(row.current.position):"Non rilevata"}</td><td>{delta===null?"Non confrontabile":Math.abs(delta)<0.05?"Stabile":`${delta>0?"↑ +":"↓ −"}${formatDecimal(Math.abs(delta))}`}</td></tr>;
    })}</tbody></table></div>{!filtered.length&&<p className={styles.empty}>Nessuna query corrisponde al filtro.</p>}<div className={styles.pager}><button className={styles.button} disabled={current===0} onClick={()=>setPage(current-1)}>Precedenti</button><span>{current+1} / {pages}</span><button className={styles.button} disabled={current===pages-1} onClick={()=>setPage(current+1)}>Successive</button></div></>;
}
