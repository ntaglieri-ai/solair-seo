import type { Evidence, SearchRow } from "./engine/analyze";
export const AI_ENGINES=["ChatGPT","Gemini","Perplexity","Copilot","Google AI Overviews"] as const;
export const AI_QUESTIONS=[
  "Quali aziende installano impianti fotovoltaici chiavi in mano in tutta Italia?",
  "Come scegliere un installatore di fotovoltaico con accumulo per un’abitazione in Italia?",
  "Quali aziende offrono impianti fotovoltaici per imprese in Italia?",
  "Quali configuratori online aiutano a valutare un impianto fotovoltaico in Italia?",
];
export const normalizeQuery=(s:string)=>s.trim().replace(/\s+/g," ").toLocaleLowerCase("it-IT");
export function validDate(value:unknown,today:string):value is string {
  return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value&&value<=today;
}
export function publicUrl(value:string) {
  const u=new URL(value.trim());
  if(!["http:","https:"].includes(u.protocol)||u.username||u.password||u.port||!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(u.hostname)||/(?:^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname))throw new Error("Serve un URL pubblico HTTP o HTTPS.");
  u.hash="";return u;
}
export const siteHost=(u:URL)=>u.hostname.replace(/^www\./,"");
const solairHost=(host:string)=>host==="solairgroup.it"||host.endsWith(".solairgroup.it");
export type KeywordRow={query:string;current:SearchRow|null;previous:SearchRow|null;pages:string[];watched:boolean};
export function keywordRows(e:Evidence,watched:string[]):KeywordRow[]{
  const current=new Map((e.gsc.current.queries??[]).map((r)=>[normalizeQuery(r.keys[0]),r]));
  const previous=new Map((e.gsc.previous.queries??[]).map((r)=>[normalizeQuery(r.keys[0]),r]));
  const chosen=new Set(watched.map(normalizeQuery));
  return [...new Set([...chosen,...current.keys(),...previous.keys()])].map((query)=>({query,current:current.get(query)??null,previous:previous.get(query)??null,
    pages:[...new Set(e.gsc.current.queryPages.filter((r)=>normalizeQuery(r.keys[0])===query).map((r)=>r.keys[1]))],watched:chosen.has(query),
  })).sort((a,b)=>Number(b.watched)-Number(a.watched)||(b.current?.impressions??0)-(a.current?.impressions??0)||a.query.localeCompare(b.query));
}

/** Parser CSV con virgolette e righe multilinea; nessuna esecuzione di formule. */
export function parseCsv(text:string):string[][] {
  if(text.length>1_000_000)throw new Error("CSV troppo grande: massimo 1 MB.");
  text=text.replace(/^\uFEFF/,"");
  const first=text.split(/\r?\n/)[0]??"";
  const delimiter=first.includes(";")&&!first.includes(",")?";":",";
  const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted||!cell)quoted=!quoted;else throw new Error("Virgolette CSV non valide.");}
    else if(c===delimiter&&!quoted){row.push(cell.trim());cell="";}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell="";}
    else cell+=c;
    if(rows.length>5001)throw new Error("Massimo 5.000 righe per esportazione.");
  }
  if(quoted)throw new Error("CSV incompleto: virgolette non chiuse.");
  row.push(cell.trim());if(row.some(Boolean))rows.push(row);
  return rows;
}
export type Backlink={source:string;target:string|null;domain:string};
export function backlinkRows(csv:string):Backlink[]{
  const rows=parseCsv(csv);const header=rows.shift()?.map((h)=>h.toLowerCase().replace(/[_\s]+/g," ").trim())??[];
  const source=header.findIndex((h)=>["source url","linking page","pagina con link","pagina di origine","pagina di provenienza"].includes(h));
  const target=header.findIndex((h)=>["target url","target page","pagina di destinazione","pagina collegata"].includes(h));
  if(source<0)throw new Error("Serve l’esportazione delle pagine con link, con colonna Linking page o Pagina con link (oppure source_url). Non l’elenco aggregato dei domini.");
  if(rows.length>5000)throw new Error("Massimo 5.000 righe.");
  const links=new Map<string,Backlink>();
  for(const [i,row]of rows.entries()){
    if(row.length!==header.length)throw new Error(`Riga ${i+2}: numero di colonne non valido.`);
    let from:URL,to:URL|null;try{from=publicUrl(row[source]);to=target>=0&&row[target]?publicUrl(row[target]):null;}catch{throw new Error(`Riga ${i+2}: URL non valido.`);}
    if(solairHost(siteHost(from))||(to&&!solairHost(siteHost(to))))throw new Error(`Riga ${i+2}: non è un link esterno verso Solair.`);
    const link={source:from.href,target:to?.href??null,domain:siteHost(from)};
    links.set(JSON.stringify([link.source,link.target]),link);
  }
  return [...links.values()].sort((a,b)=>a.source.localeCompare(b.source)||(a.target??"").localeCompare(b.target??""));
}
export function backlinkChanges(current:Backlink[],previous:Backlink[]|null){
  const key=(r:Backlink)=>JSON.stringify([r.source,r.target]);
  if(!previous||current.some(r=>!!r.target)!==previous.some(r=>!!r.target))return {comparable:false,added:[] as Backlink[],missing:[] as Backlink[]};
  const a=new Set(current.map(key)),b=new Set(previous.map(key));
  return {comparable:true,added:current.filter(r=>!b.has(key(r))),missing:previous.filter(r=>!a.has(key(r)))};
}
export function validateObservation(raw:unknown,today:string){
  if(!raw||typeof raw!=="object")throw new Error("Rilevazione non valida.");
  const v=raw as Record<string,unknown>;
  if(!AI_ENGINES.includes(v.engine as typeof AI_ENGINES[number])||!validDate(v.date,today)||typeof v.question!=="string"||v.question.trim().length<15||v.question.length>1000||
    typeof v.context!=="string"||v.context.trim().length<5||v.context.length>500||typeof v.answer!=="string"||v.answer.trim().length<30||v.answer.length>20000||typeof v.sources!=="string")throw new Error("Servono motore, data, domanda, contesto e risposta completa.");
  const sources=[...new Set(v.sources.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(s=>publicUrl(s).href))];
  if(sources.length>30)throw new Error("Massimo 30 fonti citate.");
  const evidenceUrl=typeof v.evidenceUrl==="string"&&v.evidenceUrl.trim()?publicUrl(v.evidenceUrl).href:null;
  return {engine:v.engine as string,date:v.date,question:v.question.trim().replace(/\s+/g," "),context:v.context.trim(),answer:v.answer.trim(),sources,evidenceUrl,
    mentionsBrand:/\bsolair(?:\s+group)?\b|solairgroup\.it/i.test(v.answer),citesSite:sources.some(s=>solairHost(siteHost(new URL(s))))};
}
