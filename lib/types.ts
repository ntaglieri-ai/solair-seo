// Tipi condivisi tra i moduli di scansione, roadmap e storage.
// Punto unico di verita' per i contratti tra front-end e back-end.

import type { OnPageData } from "./onpage-scan";
import type { GscData } from "./gsc";

// ── SEO (reale) ────────────────────────────────────────────────────────────

export type SeoScanResult = {
  score: number;
  deductions: string[];
  onpage: OnPageData;
  gsc: GscData;
};

// ── GEO / AI Visibility (mock per ora) ──────────────────────────────────────

export type GeoEngine = "chatgpt" | "claude" | "gemini" | "grok" | "deepseek";

export type GeoMention = {
  engine: GeoEngine;
  prompt: string;
  mentioned: boolean;
  position: number | null; // posizione nella risposta (1 = primo brand citato), null se non menzionato
  snippet: string | null; // estratto della risposta dove compare la menzione
};

export type GeoScanResult = {
  score: number; // 0-100, quota di prompt in cui il brand viene citato
  mentions: GeoMention[];
  enginesCovered: GeoEngine[];
  promptsTested: number;
  isMock: boolean; // true finche' non e' collegato a chiamate LLM reali
};

export type BusinessContext = {
  name: string;
  domain: string;
  sector?: string;
  location?: string;
};

// ── Roadmap ──────────────────────────────────────────────────────────────

export type RoadmapItem = {
  id: string;
  category: "seo" | "geo";
  priority: "alta" | "media" | "bassa";
  title: string;
  description: string;
};

// ── Scan persistita ──────────────────────────────────────────────────────

export type Scan = {
  id: string;
  url: string;
  domain: string;
  createdAt: string;
  seo: SeoScanResult;
  geo: GeoScanResult;
  roadmap: RoadmapItem[];
  clientSlug?: string;
};
