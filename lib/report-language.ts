import type { Opportunity } from "./engine/analyze";
import type { PublicFinding } from "./public-report";

const pages: Record<string, { name: string; role: string }> = {
  "/": { name: "Presentazione di Solair", role: "Presenta l’azienda e la sua offerta a chi visita il sito." },
  "/configuratore": { name: "Configuratore fotovoltaico", role: "Offre un percorso dedicato a chi vuole configurare il proprio impianto." },
  "/faq": { name: "Domande frequenti", role: "Raccoglie le risposte per chi cerca chiarimenti prima di approfondire l’offerta." },
  "/lavora-con-noi": { name: "Lavora con noi", role: "Si rivolge a chi è interessato a opportunità professionali con Solair." },
};
export function pageName(path: string) { return pages[path]?.name ?? path; }
export function pageRole(path: string) { return pages[path]?.role ?? "Una pagina del percorso di presentazione dell’azienda."; }

export function clientOpportunity(action: Opportunity) {
  const facts = action.evidence;
  const observed = typeof facts?.impressions === "number" && typeof facts?.clicks === "number"
    ? `Per ${action.query ? `la ricerca «${action.query}»` : "la ricerca osservata"}, la pagina è apparsa ${new Intl.NumberFormat("it-IT").format(facts.impressions)} volte su Google e ha ricevuto ${new Intl.NumberFormat("it-IT").format(facts.clicks)} clic.`
    : "I dati delle ricerche segnalano un’opportunità da approfondire su questa pagina.";
  return action.kind === "ctr" ? {
    title: "Invogliare più persone a visitare la pagina", observed,
    work: "Rivedere il titolo e la breve presentazione della pagina nei risultati Google, per comunicare meglio cosa troverà chi la apre. Il testo deve restare fedele ai contenuti del sito.",
    goal: "Rendere più chiaro il motivo per scegliere questo risultato. Dopo la modifica, verificare se aumentano i clic rispetto alle volte in cui la pagina viene mostrata.",
  } : {
    title: "Rafforzare la risposta a chi cerca queste informazioni", observed,
    work: `Integrare i contenuti per rispondere meglio ${action.query ? `alla ricerca «${action.query}»` : "alla ricerca osservata"} e collegare la pagina dagli altri contenuti pertinenti del sito.`,
    goal: "Aiutare chi cerca a trovare una risposta più utile. Verificare poi l’andamento dei clic e della posizione per la stessa ricerca.",
  };
}

export function clientFinding(finding: PublicFinding) {
  const copies: Record<string, { title: string; work: string }> = {
    "Titolo della pagina assente": { title: "Rendere riconoscibile la pagina su Google", work: "Dare alla pagina un titolo chiaro e specifico, che faccia capire subito il suo contenuto." },
    "Descrizione della pagina assente": { title: "Presentare meglio il contenuto nei risultati", work: "Aggiungere una breve presentazione che spieghi cosa offre la pagina e perché vale la pena aprirla." },
    "Titolo principale assente nell’HTML": { title: "Chiarire subito l’argomento della pagina", work: "Inserire un titolo principale visibile che orienti il visitatore sul contenuto." },
    "Direttiva noindex rilevata": { title: "Verificare se la pagina deve comparire su Google", work: "Il sito segnala ai motori di non includere questa pagina. Confermare se è una scelta voluta prima di modificarla." },
    "Titolo condiviso con altre pagine": { title: "Distinguere meglio le pagine tra loro", work: "Usare titoli specifici per pagine che presentano contenuti o servizi differenti." },
    "Pagina da verificare": { title: "Verificare l’accesso alla pagina", work: "Il controllo non ha potuto leggere correttamente questa pagina. Verificarne l’accesso prima di valutare modifiche ai contenuti." },
  };
  return copies[finding.title] ?? { title: finding.title, work: finding.action };
}
