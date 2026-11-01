type Totals={clicks:number;impressions:number;ctr:number;position:number};
export function reportReading(current:Totals,previous:Totals){
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
