import type { OnPageData } from "./onpage-scan";

/**
 * Traduce il risultato on-page in frasi comprensibili per il cliente: niente
 * gergo da scanner ("fuori range", "(-7)") e niente termini inglesi senza
 * spiegazione. Le stesse soglie di lib/seo-score.ts, ma per leggere, non per
 * calcolare un punteggio.
 */
export function explainOnPage(data: OnPageData): string[] {
  const notes: string[] = [];

  if (!data.title) {
    notes.push("Manca il title, il titolo che Google mostra nei risultati di ricerca.");
  } else if (data.titleLength < 30 || data.titleLength > 60) {
    notes.push(
      `Il title è lungo ${data.titleLength} caratteri: tra 30 e 60 è la misura consigliata, altrimenti Google può tagliarlo o riscriverlo nei risultati.`
    );
  }

  if (!data.metaDescription) {
    notes.push("Manca la meta description, il testo che Google mostra sotto il titolo nei risultati.");
  } else if (data.metaDescriptionLength < 120 || data.metaDescriptionLength > 160) {
    notes.push(
      `La meta description è lunga ${data.metaDescriptionLength} caratteri: tra 120 e 160 è la misura consigliata.`
    );
  }

  if (data.h1.length === 0) {
    notes.push("Manca il titolo principale della pagina (tag H1).");
  } else if (data.h1.length > 1) {
    notes.push(`Ci sono ${data.h1.length} titoli principali (H1) sulla stessa pagina: dovrebbe essercene uno solo.`);
  }

  if (!data.canonical) {
    notes.push("Manca il tag canonical, che indica a Google quale sia la versione ufficiale di questa pagina.");
  }

  if (data.imagesWithoutAlt.length > 0) {
    const n = data.imagesWithoutAlt.length;
    notes.push(
      `${n} ${n === 1 ? "immagine priva" : "immagini prive"} di testo alternativo (utile per l'accessibilità e per comparire nella ricerca immagini).`
    );
  }

  if (data.schemaTypes.length === 0) {
    notes.push("Non sono presenti dati strutturati (schema.org), che aiutano Google a capire di cosa parla la pagina.");
  }

  return notes;
}
