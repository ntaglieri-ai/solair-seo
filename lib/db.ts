import "server-only";
import postgres from "postgres";

let client: postgres.Sql | null = null;

/**
 * Connessione al database SEO (Supabase, pooler in transaction mode).
 * Inizializzata alla prima chiamata, così `next build` non richiede le
 * variabili d'ambiente. `prepare: false` è obbligatorio con il pooler.
 */
export function getSql(): postgres.Sql {
  if (!client) {
    const url = process.env.POSTGRES_URL;
    if (!url) {
      throw new Error("POSTGRES_URL mancante: collegare il database Supabase al progetto.");
    }
    client = postgres(url, { prepare: false, max: 5 });
  }
  return client;
}
