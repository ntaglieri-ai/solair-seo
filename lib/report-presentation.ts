type Totals={clicks:number;impressions:number;ctr:number;position:number};
/** Variazioni dei clic entro questa fascia (±5%) non sono un aumento o un calo: sono rumore normale tra periodi. */
export const STABLE_CLICKS_BAND=0.05;
export function reportReading(current:Totals,previous:Totals){
  if(previous.clicks>0&&current.clicks>0&&Math.abs(current.clicks-previous.clicks)/previous.clicks<STABLE_CLICKS_BAND)
    return {title:"I clic da Google sono stabili.",text:"La variazione dei clic rispetto al periodo precedente è contenuta e rientra nella normale oscillazione. Impressioni e singole query indicano dove intervenire."};
  if(current.clicks>previous.clicks){
    if(current.impressions<previous.impressions)return {title:"Più clic da Google, con meno impressioni.",text:"Il sito ha ricevuto più clic pur comparendo meno volte nei risultati. Il confronto delle singole query aiuta a capire quali pagine hanno contribuito al cambiamento."};
    return {title:"Da Google arrivano più clic al sito.",text:"Il volume dei clic è cresciuto rispetto al periodo precedente. Le proposte sotto indicano dove intervenire sulla base delle evidenze disponibili."};
  }
  if(current.clicks<previous.clicks)return {title:"I clic da Google sono diminuiti.",text:"Il sito ha ricevuto meno clic rispetto al periodo precedente. Il calo va letto insieme a impressioni, query e pagine: da solo non ne identifica la causa."};
  return {title:current.clicks?"I clic da Google sono stabili.":"Nessun clic da Google nei due periodi.",text:"Il confronto non mostra una variazione nel volume dei clic. Impressioni e singole query restano utili per individuare opportunità concrete."};
}
export function reportPage(value:unknown){
  return typeof value==="string"&&/^[1-9]\d{0,5}$/.test(value)?Number(value):1;
}
export function reportText(value:unknown){
  return typeof value==="string"?value.replace(/\bpuo'/g,"può").replace(/\bpiu'/g,"più").replace(/\be'/g,"è").replace(/\bgia'/g,"già"):"Non specificato in questa rilevazione.";
}

/** Ordine degli interventi nei report e nella home: prima le pagine di contenuto, poi le ricerche sul marchio, per ultima la pagina lavoro. */
export function rankActions<T extends{page:string;query?:string}>(items:T[]):T[]{
  const brand=(query:unknown)=>typeof query==="string"&&/solair/i.test(query);
  return items.map((a,index)=>({a,index,rank:/lavora-con-noi/i.test(a.page)?2:brand(a.query)?1:0}))
    .sort((x,y)=>x.rank-y.rank||x.index-y.index).map(item=>item.a);
}
