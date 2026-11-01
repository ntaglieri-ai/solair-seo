import type { Opportunity } from "./engine/analyze";
export type ChecklistTask = { id: string; label: string; done: boolean };
export type Measurement = { from: string; to: string; clicks: number; impressions: number; days: number; sessions: number; analyticsDays: number };
export type WorkItem = {
  actionId: string; proposal: Opportunity; tasks: ChecklistTask[]; approvedAt: string | null;
  completedAt: string | null; verifiedAt: string | null; verificationNote: string;
  measurement: Measurement | null; revision: number;
};
export function tasksFor(item: Opportunity): ChecklistTask[] {
  if (item.id.startsWith("public_url:")) return [{ id: "site-work", label: item.action, done: false }];
  const tasks = item.kind === "ctr" ? [
    ["title", "Rivedere il title della pagina rispetto alla ricerca indicata."],
    ["description", "Rivedere la descrizione del risultato e la promessa della pagina."],
    ["publish", "Pubblicare e controllare title e descrizione nella pagina."],
  ] : item.kind === "near_top10" ? [
    ["content", "Integrare contenuti utili che rispondano alla ricerca indicata."],
    ["links", "Aggiungere collegamenti interni pertinenti verso la pagina."],
    ["publish", "Pubblicare e verificare la pagina aggiornata."],
  ] : (Array.isArray(item.evidence.issues) ? item.evidence.issues : []).flatMap((issue) => {
    if (/^\d+ immagini senza alt/.test(issue)) return [["alt", "Aggiungere testi alternativi alle immagini informative; alt vuoto per quelle decorative."]];
    if (issue.startsWith("Title mancante")) return [["title", "Inserire un title specifico e descrittivo."]];
    if (issue.startsWith("Meta description mancante")) return [["description", "Inserire una meta description specifica."]];
    if (issue.startsWith("H1 mancante")) return [["h1", "Inserire il titolo principale visibile della pagina."]];
    return [];
  });
  return [...new Map(tasks.map(([id,label])=>[id,{ id,label,done:false }])).values()];
}
export function workStatus(item: WorkItem) {
  return item.verifiedAt ? "Verificato" : item.completedAt ? "Completato" : item.approvedAt ? "Da fare" : "Da approvare";
}
export function newWorkItem(proposal: Opportunity): WorkItem {
  return { actionId: workIdentity(proposal), proposal, tasks: tasksFor(proposal), approvedAt: null, completedAt: null, verifiedAt: null, verificationNote: "", measurement: null, revision: 0 };
}
export function workIdentity(proposal: Opportunity) {
  // Nuovi problemi sulla stessa pagina diventano un nuovo incarico, senza ereditare vecchie spunte.
  return proposal.kind === "technical" ? `${proposal.id}#${tasksFor(proposal).map((t)=>t.id).sort().join("+")}` : proposal.id;
}
export function transitionWork(before: WorkItem, input: unknown, now: string): WorkItem {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Aggiornamento non valido.");
  const p = input as Record<string, unknown>;
  if (!Number.isInteger(p.revision) || p.revision !== before.revision) throw new Error("Il piano è cambiato. Ricarica la pagina.");
  const next = structuredClone(before);
  if (p.operation === "approve") {
    if (next.approvedAt) throw new Error("Intervento già approvato.");
    next.approvedAt = now;
  } else if (p.operation === "task") {
    if (!next.approvedAt || next.completedAt) throw new Error("La checklist è modificabile solo prima del completamento e dopo l’approvazione.");
    const task = next.tasks.find((t)=>t.id === p.taskId);
    if (!task || typeof p.done !== "boolean") throw new Error("Attività non valida.");
    task.done = p.done;
  } else if (p.operation === "complete") {
    if (!next.approvedAt || next.completedAt || !next.tasks.length || !next.tasks.every((t)=>t.done)) throw new Error("Completa prima tutte le attività approvate.");
    next.completedAt = now;
  } else if (p.operation === "verify") {
    if (!next.completedAt || next.verifiedAt || typeof p.note !== "string" || p.note.trim().length < 15 || p.note.length > 2000) throw new Error("La verifica richiede un intervento completato e una nota con l’esito osservato.");
    next.verifiedAt = now; next.verificationNote = p.note.trim();
  } else if (p.operation === "reopen") {
    if (!next.completedAt) throw new Error("L’intervento non è completato.");
    next.completedAt = null; next.verifiedAt = null; next.verificationNote = ""; next.measurement = null;
  } else throw new Error("Operazione non valida.");
  next.revision++;
  return next;
}

export function comparisonWindow(completedAt: string) {
  // Primo giorno intero successivo all'applicazione, evitando la giornata mista.
  const first = new Date(completedAt); first.setUTCDate(first.getUTCDate()+1);
  const from = first.toISOString().slice(0,10);
  first.setUTCDate(first.getUTCDate()+27);
  return { from, to: first.toISOString().slice(0,10) };
}
