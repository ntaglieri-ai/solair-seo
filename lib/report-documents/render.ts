import PDFDocument from "pdfkit";
import { formatDate, formatDateTime, formatDecimal, formatInt, formatPercent } from "../format";
import { formatPeriod } from "../comparison-periods";
import { reportReading, reportText } from "../report-presentation";
import { summarizeScan, suggestOpportunities, citationHost } from "../geo/summary";
import type { GeoAnswer } from "../geo/answer";
import { documentStatus, type ReportPayload } from "./model";

const C = { ink: "#17382B", muted: "#536C61", green: "#25764F", line: "#D7E5DC", pale: "#EDF6F0", blue: "#EDF3FB", warm: "#FFF4E9" };
const clean = (value: unknown) => String(value ?? "").replace(/[\u2010-\u2015\u2212]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u2192/g, " -> ").replace(/\u2022/g, "-").replace(/\u00a0/g, " ");
const change = (a: number, b: number) => b ? `${a > b ? "+" : ""}${((a-b)/b*100).toLocaleString("it-IT", {maximumFractionDigits:1})}%` : a === b ? "Invariato" : "Base nulla";

/** Documento vettoriale generato sul server, senza browser né servizi esterni. */
export function renderReportPdf(payload: ReportPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 46, bufferPages: true, info: { Title: "Report SEO/GEO - Solair Group", Author: "SolairSEO", Subject: "Risultati, interpretazione e proposte di miglioramento", CreationDate: new Date(payload.generatedAt) } });
    const chunks: Buffer[] = [];
    doc.on("data", chunk => chunks.push(Buffer.from(chunk))); doc.on("error", reject); doc.on("end", () => resolve(Buffer.concat(chunks)));
    const width = doc.page.width - 92, bottom = doc.page.height - 62;
    let y = 48;
    function newPage() { doc.addPage(); y = 74; doc.font("Helvetica-Bold").fontSize(10).fillColor(C.green).text("SolairSEO",46,32); doc.font("Helvetica").fontSize(9).fillColor(C.muted).text("Solair Group | Report SEO/GEO",200,32,{width:width-154,align:"right"}); doc.moveTo(46,54).lineTo(46+width,54).strokeColor(C.line).stroke(); }
    function ensure(height: number) { if (y+height>bottom) newPage(); }
    function text(value: unknown, size=10.5, bold=false, color=C.ink, gap=9) {
      doc.font(bold?"Helvetica-Bold":"Helvetica").fontSize(size);
      const content=clean(value), h=doc.heightOfString(content,{width,lineGap:3}); ensure(h+gap);
      doc.fillColor(color).text(content,46,y,{width,lineGap:3}); y+=h+gap;
    }
    function heading(number: string, title: string, subtitle?: string) {
      ensure(92); text(number.toUpperCase(),9,true,C.green,8);text(title,23,true,C.ink,14);if(subtitle)text(subtitle,10.5,false,C.muted,16);
    }
    function card(title: string, body: string, tag?: string, tint=C.pale) {
      doc.font("Helvetica-Bold").fontSize(13);const th=doc.heightOfString(clean(title),{width:width-32,lineGap:2});
      doc.font("Helvetica").fontSize(10.5);const bh=doc.heightOfString(clean(body),{width:width-32,lineGap:3});
      const h=th+bh+(tag?24:0)+43;ensure(h+12);const top=y;
      doc.roundedRect(46,top,width,h,10).fill(tint);
      let cy=top+16;
      if(tag){doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.green).text(clean(tag).toUpperCase(),62,cy,{width:width-32});cy+=23;}
      doc.font("Helvetica-Bold").fontSize(13).fillColor(C.ink).text(clean(title),62,cy,{width:width-32,lineGap:2});cy+=th+10;
      doc.font("Helvetica").fontSize(10.5).fillColor(C.ink).text(clean(body),62,cy,{width:width-32,lineGap:3}); y=top+h+14;
    }
    function row(cells: string[], widths: number[], header=false, compact=false) {
      const fs=header?9:compact?9:10;doc.font(header?"Helvetica-Bold":"Helvetica").fontSize(fs);
      const h=Math.max(...cells.map((c,i)=>doc.heightOfString(clean(c),{width:widths[i]-16,lineGap:2})))+(compact?12:19);ensure(h);
      if(header)doc.rect(46,y,width,h).fill(C.pale);
      let x=46;cells.forEach((cell,i)=>{doc.font(header?"Helvetica-Bold":"Helvetica").fontSize(fs).fillColor(C.ink).text(clean(cell),x+8,y+9,{width:widths[i]-16,lineGap:2});x+=widths[i];});
      doc.moveTo(46,y+h).lineTo(46+width,y+h).strokeColor(C.line).stroke();y+=h;
    }
    function link(label:string,url:string) {
      try { const u=new URL(url);if(!["http:","https:"].includes(u.protocol)||u.username||u.password)return; } catch {return;}
      doc.font("Helvetica").fontSize(9);const h=doc.heightOfString(clean(label),{width,lineGap:2});ensure(h+9);
      doc.fillColor(C.green).text(clean(label),46,y,{width,lineGap:2,link:url,underline:true});y+=h+9;
    }
    try {
      const report=payload.report, data=report.data, windows=data.windows, summary=data.summary;
      const measured=report.status!=="blocked"&&!!summary&&!!windows;
      const answers=(payload.geo?.answers??[]) as GeoAnswer[];
      const geo=payload.geo?summarizeScan(answers,payload.geo.planned):null;
      doc.roundedRect(46,42,width,33,8).fill(C.green);doc.font("Helvetica-Bold").fontSize(14).fillColor("#FFFFFF").text("SolairSEO",60,52);y=101;
      text("REPORT SEO / GEO",10,true,C.green,10);text("Solair Group",31,true,C.ink,12);text("Risultati, presenza su Gemini e prossimi interventi",15,false,C.muted,20);
      text(`Documento generato il ${formatDateTime(new Date(payload.generatedAt))} | ${documentStatus(payload)==="complete"?"Rilevazione completa":"Rilevazione parziale"}`,9,false,C.muted,14);
      if(payload.sourceRefreshFailed)text("Aggiornamento delle fonti Google parziale: questo documento conserva le evidenze archiviate e ne indica il periodo effettivo.",10,true,C.muted,12);
      if(windows){card("I periodi del confronto",`Periodo analizzato: ${formatPeriod(windows.current)}\nPeriodo di confronto: ${formatPeriod(windows.previous)}\nAnalisi SEO archiviata: ${formatDateTime(new Date(report.createdAt))}`,undefined,C.blue);}
      if(measured&&summary){const reading=reportReading(summary.current,summary.previous);card(reading.title,reading.text,"Sintesi dei risultati");
        row(["Indicatore Google","Attuale","Confronto","Variazione"],[200,95,100,width-395],true);
        row(["Clic al sito",formatInt(summary.current.clicks),formatInt(summary.previous.clicks),change(summary.current.clicks,summary.previous.clicks)],[200,95,100,width-395]);
        row(["Impressioni",formatInt(summary.current.impressions),formatInt(summary.previous.impressions),change(summary.current.impressions,summary.previous.impressions)],[200,95,100,width-395]);
        row(["CTR",formatPercent(summary.current.ctr),formatPercent(summary.previous.ctr),`${summary.current.ctr>=summary.previous.ctr?"+":""}${formatDecimal((summary.current.ctr-summary.previous.ctr)*100)} p.p.`],[200,95,100,width-395]);
        row(["Posizione media",formatDecimal(summary.current.position),formatDecimal(summary.previous.position),`${summary.current.position<=summary.previous.position?"Migliore":"Peggiore"}`],[200,95,100,width-395]);y+=16;
      }else card("Risultati Google non misurabili", "Le fonti non consentono un confronto attendibile. I valori mancanti non vengono sostituiti con zero o con stime.",undefined,C.warm);
      if(geo)text(`Gemini: ${geo.nonBrandMentioned}/${geo.nonBrandComplete} risposte senza nome aziendale nominano Solair. ${geo.brandMentioned}/${geo.brandComplete} risposte su Solair la menzionano.`,11,true,C.ink,8);
      text("Le pagine successive distinguono riscontri misurati, interpretazione e opportunità da verificare. Le date delle fonti possono essere diverse da quella di generazione del PDF.",9,false,C.muted);

      newPage();heading("02 / Presenza nelle risposte AI","Come Gemini presenta Solair",payload.geo?`Rilevazione: ${formatDateTime(new Date(payload.geo.startedAt))} | ${payload.geo.model??"modello non disponibile"}`:"Nessuna rilevazione Gemini disponibile per questo report.");
      if(payload.geo&&geo){
        card("Scoperta spontanea e conoscenza del brand",`Senza nome Solair: ${geo.nonBrandMentioned} menzioni su ${geo.nonBrandComplete} risposte complete; ${geo.nonBrandOwnCitations} risposte con citazione del sito ufficiale riconosciuta.\nDomande esplicite su Solair: ${geo.brandMentioned} menzioni su ${geo.brandComplete} risposte complete.\nCopertura complessiva: ${geo.complete} risposte complete su ${geo.planned} domande previste.`);
        row(["Domanda eseguita","Menzione","Fonte Solair"],[width-152,72,80],true,true);
        answers.forEach(a=>row([a.question,!a.complete?"Non misurata":a.mentioned?"Sì":"No",!a.complete?"N/D":a.citedSolair?"Riconosciuta":"Non rilevata"],[width-152,72,80],false,true));
        y+=15;
        if(geo.complete<geo.planned)text(`${geo.planned-geo.complete} domande non misurate: non sono conteggiate come assenze di Solair.`,10,true,C.muted);
        if(geo.competitors.length)text(`Aziende configurate menzionate nel campione senza nome Solair: ${geo.competitors.map(c=>`${c.name} (${c.prompts} risposte)`).join(", ")}. Non è una rilevazione dell'intero mercato.`,9,false,C.muted);
      }
      if(payload.geoRefreshFailed)card("Aggiornamento Gemini non completato","Questo PDF conserva soltanto le rilevazioni archiviate e ne indica la data. L'ultimo avvio non ha completato l'aggiornamento AI.",undefined,C.warm);
      text("Misura: presenza nelle risposte Gemini tramite API con ricerca web. Non replica l'app Gemini e non rappresenta ChatGPT, AI Overviews o tutti i motori AI. Le risposte possono variare; una menzione non equivale a una raccomandazione.",9,false,C.muted);

      newPage();heading("03 / Piano di miglioramento","Gli interventi sostenuti dai dati","Priorità sulle pagine e sui contenuti del sito. Nessuna modifica viene applicata automaticamente.");
      const actions=(data.opportunities??[]).filter(a=>typeof a.action==="string"&&typeof a.page==="string");
      actions.sort((a,b)=>Number(/lavora-con-noi/i.test(a.page))-Number(/lavora-con-noi/i.test(b.page)));
      if(!actions.length)text("Le evidenze disponibili non sostengono interventi prioritari in questa rilevazione. Questo non dimostra l'assenza di opportunità nel sito.");
      actions.forEach((a,index)=>{
        const basis=a.evidence?.basis==="opportunità"?"Opportunità editoriale da validare":`Priorità ${a.priority==="high"?"alta":"media"}`;
        const facts=typeof a.evidence?.impressions==="number"?`\nDati: ${formatInt(a.evidence.impressions)} impressioni, ${formatInt(Number(a.evidence.clicks??0))} clic${a.query?`; ricerca: ${a.query}`:""}.`:"";
        card(`${index+1}. ${a.title}`,`Pagina: ${a.page}\nPerché: ${reportText(a.interpretation)}${facts}\nIntervento: ${reportText(a.action)}\nValore atteso: ${reportText(a.expectedOutcome)}`,basis,index%2?C.blue:C.pale);
      });
      const opportunities=suggestOpportunities(answers).filter(o=>o.kind==="prompt_gap").slice(0,3);
      if(opportunities.length){heading("Da approfondire","Le opportunità emerse da Gemini");opportunities.forEach(o=>card("Opportunità da verificare",`${o.title}\n${o.evidence.join(" ")}\nPrima di intervenire: confrontare i contenuti Solair sul tema con le fonti citate; verificare informazioni mancanti, pertinenza e prove pubbliche. L'assenza nel campione non dimostra da sola un problema SEO.`,undefined,C.warm));}
      text("Per verificare l'esito degli interventi occorrono nuove rilevazioni con periodi e criteri comparabili. Non sono stimati incrementi garantiti di traffico, posizioni, richieste o citazioni AI.",9,false,C.muted);

      newPage();heading("04 / Fonti e metodo","Come leggere questo report");
      text("Search Console",12,true);text(windows?`Proprietà solairgroup.it. Dati dal ${formatPeriod(windows.current)}, confrontati con ${formatPeriod(windows.previous)}. I totali provengono dalle evidenze archiviate dell'analisi SEO indicata.`:"Periodo Google non disponibile.");
      text("Gemini e citazioni",12,true);text(payload.geo?`Campione di ${payload.geo.planned} domande. Sono contate soltanto risposte complete e citazioni native. I collegamenti non raggiunti o non risolti non confermano né smentiscono il contenuto della risposta. Le domande con nome Solair sono separate dalla scoperta spontanea.`:"Non sono presenti risposte Gemini nel documento. La presenza AI resta non misurata.");
      const sources=new Map<string,string>();answers.forEach(a=>a.citations.filter(c=>c.verification==="reachable"&&citationHost(c)).slice(0,2).forEach(c=>{if(c.finalUrl)sources.set(c.finalUrl,c.title||new URL(c.finalUrl).hostname);}));
      if(sources.size){text("Selezione delle fonti citate dal motore",12,true);[...sources].slice(0,8).forEach(([url,title])=>link(`${new URL(url).hostname.replace(/^www\./,"")} - ${title.slice(0,110)}`,url));}
      ensure(60);link("Apri l'analisi SEO archiviata nell'app",`https://solair-seo.vercel.app/analisi?id=${report.id}`);link("Consulta risposte integrali e storico Gemini nell'app","https://solair-seo.vercel.app/visibilita-ai");
      text("Limiti delle fonti",12,true);(data.limitations??[]).forEach(note=>text(`- ${note}`,9,false,C.muted,5));
      text("Le soglie editoriali o tecniche del servizio non sono requisiti imposti da Google. Nessun punteggio globale nuovo viene dedotto automaticamente dai soli risultati di questo documento.",9,false,C.muted);

      const range=doc.bufferedPageRange();for(let i=range.start;i<range.start+range.count;i++){doc.switchToPage(i);const savedBottom=doc.page.margins.bottom;doc.page.margins.bottom=0;doc.moveTo(46,doc.page.height-49).lineTo(46+width,doc.page.height-49).strokeColor(C.line).stroke();doc.font("Helvetica").fontSize(8).fillColor(C.muted).text(`Solair Group | ${formatDate(new Date(payload.generatedAt))}`,46,doc.page.height-35,{lineBreak:false});doc.text(`${i+1} / ${range.count}`,doc.page.width-100,doc.page.height-35,{width:54,align:"right",lineBreak:false});doc.page.margins.bottom=savedBottom;}
      doc.end();
    } catch(error) { doc.destroy(); reject(error); }
  });
}
