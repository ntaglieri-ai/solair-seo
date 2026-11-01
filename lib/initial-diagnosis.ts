import type { publicPageReport } from "./public-report";

/** An editorial hypothesis grounded in the archived public title and description. */
export function faqTitleOpportunity(pages: ReturnType<typeof publicPageReport>[]) {
  const faq = pages.find(page => page.path === "/faq" && page.readable && !page.noindex);
  if (!faq?.title?.trim() || !faq.description ||
      !/fotovoltaic/i.test(faq.description) ||
      !/^(?:faq|domande frequenti|solair(?: group)?|[\s\-|–—:])+$/i.test(faq.title)) return null;
  return {
    page: faq,
    title: "Rendere riconoscibili le risposte di Solair sul fotovoltaico",
    observation: "La descrizione della pagina parla di fotovoltaico, mentre il titolo presenta soltanto le domande frequenti e il nome dell’azienda. L’argomento può essere espresso più chiaramente già nel titolo.",
    why: "L’obiettivo è far capire subito a chi cerca informazioni sul fotovoltaico che questa pagina può contenere le risposte utili. È una proposta di chiarezza editoriale, da valutare sul contenuto effettivo della pagina.",
    proposedTitle: "Fotovoltaico: risposte alle domande frequenti | Solair Group",
  };
}
