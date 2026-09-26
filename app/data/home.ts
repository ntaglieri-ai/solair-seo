// Contenuti della home che non arrivano ancora dal motore dati.

/** Report di riferimento: i numeri della home si confrontano con questa data. */
export const baselineDate = "2026-09-06";
export const currentReportUrl = `/report/${baselineDate}`;

export type WorkTag = "SEO" | "GEO";

export type WorkPriority = {
  title: string;
  description: string;
  tags: WorkTag[];
  priority: "alta" | "media";
};

/** "Su cosa stiamo lavorando": in ordine di priorità. */
export const workPriorities: WorkPriority[] = [
  {
    title: "Hub Comunità Energetiche (CER)",
    description: "Nuova pagina di riferimento sul tema",
    tags: ["SEO", "GEO"],
    priority: "alta",
  },
  {
    title: "Incentivi fotovoltaico",
    description: "Guida aggiornata a bonus e detrazioni",
    tags: ["SEO", "GEO"],
    priority: "alta",
  },
  {
    title: "Sistemi di accumulo",
    description: "Pagina dedicata a batterie e storage",
    tags: ["SEO", "GEO"],
    priority: "media",
  },
  {
    title: "Guide regionali",
    description: "Contenuti per le regioni servite",
    tags: ["SEO", "GEO"],
    priority: "media",
  },
];
