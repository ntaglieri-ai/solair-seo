import { google } from "googleapis";

export type GscKeywordRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscPageRow = GscKeywordRow;

export type GscTotals = {
  clicks: number;
  impressions: number;
  ctr: number;
};

export type GscData = {
  keywords: GscKeywordRow[];
  pages: GscPageRow[];
  totalsCurrent: GscTotals;
  totalsPrevious: GscTotals;
  period: string;
};

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Credenziali Google mancanti: verificare GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN nelle variabili d'ambiente."
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Recupera dati Google Search Console per gli ultimi 28 giorni,
 * confrontati con i 28 giorni precedenti. Stessa logica di
 * seo_scanner.py (get_gsc_data) ma in TypeScript, per uso server-side
 * in Next.js (API route o Server Component).
 */
export async function getGscData(siteUrl: string): Promise<GscData> {
  const auth = getOAuthClient();
  const searchconsole = google.searchconsole({ version: "v1", auth });

  const today = new Date();
  const endDate = formatDate(today);
  const startDate = formatDate(addDays(today, -28));
  const startPrev = formatDate(addDays(today, -56));
  const endPrev = formatDate(addDays(today, -29));

  async function query(
    start: string,
    end: string,
    dimensions: string[] = ["query"],
    rowLimit = 10
  ): Promise<GscKeywordRow[]> {
    try {
      const res = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions,
          rowLimit,
        },
      });
      const rows = (res.data.rows ?? []) as GscKeywordRow[];
      // L'API non garantisce l'ordinamento via requestBody in questa versione
      // dei tipi: ordiniamo lato client per impressioni decrescenti.
      return rows.sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0));
    } catch (err) {
      console.error("[GSC] Errore query:", err);
      return [];
    }
  }

  const [keywords, pages, dailyCurrent, dailyPrevious] = await Promise.all([
    query(startDate, endDate, ["query"], 10),
    query(startDate, endDate, ["page"], 5),
    query(startDate, endDate, ["date"], 28),
    query(startPrev, endPrev, ["date"], 28),
  ]);

  const totalsCurrent: GscTotals = { clicks: 0, impressions: 0, ctr: 0 };
  const totalsPrevious: GscTotals = { clicks: 0, impressions: 0, ctr: 0 };

  for (const row of dailyCurrent) {
    totalsCurrent.clicks += row.clicks ?? 0;
    totalsCurrent.impressions += row.impressions ?? 0;
  }
  for (const row of dailyPrevious) {
    totalsPrevious.clicks += row.clicks ?? 0;
    totalsPrevious.impressions += row.impressions ?? 0;
  }

  if (totalsCurrent.impressions > 0) {
    totalsCurrent.ctr = Math.round((totalsCurrent.clicks / totalsCurrent.impressions) * 10000) / 100;
  }
  if (totalsPrevious.impressions > 0) {
    totalsPrevious.ctr = Math.round((totalsPrevious.clicks / totalsPrevious.impressions) * 10000) / 100;
  }

  return {
    keywords,
    pages,
    totalsCurrent,
    totalsPrevious,
    period: `${startDate} → ${endDate}`,
  };
}

export type GscRow = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

/**
 * Lettura grezza per il motore dati: a differenza di getGscData gli errori
 * non vengono assorbiti, così la rilevazione viene registrata come fallita.
 * Date in formato YYYY-MM-DD, come le intende Search Console (fuso PT).
 */
export async function queryGsc(
  siteUrl: string,
  options: {
    startDate: string;
    endDate: string;
    dimension: "date" | "query" | "page";
    rowLimit: number;
  }
): Promise<GscRow[]> {
  const searchconsole = google.searchconsole({ version: "v1", auth: getOAuthClient() });
  const res = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: options.startDate,
      endDate: options.endDate,
      dimensions: [options.dimension],
      rowLimit: options.rowLimit,
      dataState: "all",
    },
  });

  return (res.data.rows ?? []).map((row) => ({
    key: row.keys?.[0] ?? "",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}
