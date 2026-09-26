import "server-only";

/**
 * Esegue una lettura dal database senza far cadere la pagina: in caso di
 * errore lo registra e restituisce null, così la UI mostra uno stato vuoto.
 */
export async function safeRead<T>(label: string, read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (err) {
    console.error(`[data] Lettura "${label}" non riuscita:`, err);
    return null;
  }
}
