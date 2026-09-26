import type { OnPageData } from "./onpage-scan";

export type ScoreResult = {
  score: number;
  deductions: string[];
};

/**
 * Porting diretto di compute_score() da seo_scanner.py.
 * Stessa logica, stessi pesi: mantenere allineate le due versioni
 * se in futuro si modificano le penalità in uno dei due posti.
 */
export function computeSeoScore(onpage: OnPageData, hasGscData: boolean): ScoreResult {
  let score = 100;
  const deductions: string[] = [];

  if (!onpage.title) {
    score -= 15;
    deductions.push("Title mancante (-15)");
  } else if (onpage.titleLength < 30 || onpage.titleLength > 60) {
    score -= 7;
    deductions.push(`Title fuori range (${onpage.titleLength} char) (-7)`);
  }

  if (!onpage.metaDescription) {
    score -= 10;
    deductions.push("Meta description mancante (-10)");
  } else if (onpage.metaDescriptionLength < 120 || onpage.metaDescriptionLength > 160) {
    score -= 5;
    deductions.push(`Meta description fuori range (${onpage.metaDescriptionLength} char) (-5)`);
  }

  if (onpage.h1.length === 0) {
    score -= 10;
    deductions.push("H1 mancante (-10)");
  } else if (onpage.h1.length > 1) {
    score -= 5;
    deductions.push(`Più H1 presenti (${onpage.h1.length}) (-5)`);
  }

  if (!onpage.canonical) {
    score -= 5;
    deductions.push("Canonical mancante (-5)");
  }

  if (onpage.imagesWithoutAlt.length > 0) {
    const penalty = Math.min(onpage.imagesWithoutAlt.length * 2, 10);
    score -= penalty;
    deductions.push(`${onpage.imagesWithoutAlt.length} immagini senza alt (-${penalty})`);
  }

  if (onpage.schemaTypes.length === 0) {
    score -= 5;
    deductions.push("Schema.org assente (-5)");
  }

  if (!hasGscData) {
    score -= 10;
    deductions.push("Nessun dato GSC (-10)");
  }

  return { score: Math.max(score, 0), deductions };
}
