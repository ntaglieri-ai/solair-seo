/** Prosegue la scansione aperta senza ripetere richieste già inviate al provider. */
export async function collectGeo(onProgress: (message: string) => void) {
  for (let step = 0; step < 12; step++) {
    const response = await fetch("/api/geo/scan", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Analisi Gemini non disponibile.");
    onProgress(`${result.completed} di ${result.planned} risposte complete. ${result.status === "in_progress" ? "Verifica delle fonti e completamento in corso…" : "Risultati salvati nello storico."}`);
    if (result.status !== "in_progress") return result.status as "done" | "partial";
  }
  throw new Error("I progressi sono salvati. Apri Presenza su Gemini e premi Riprendi analisi per completare le verifiche restanti.");
}
