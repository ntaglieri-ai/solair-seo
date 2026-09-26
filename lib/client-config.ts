// Configurazione whitelabel per questa istanza dell'Audit Hub.
// Per un nuovo cliente: duplicare questo file (o i suoi valori) e collegare
// i propri dati in app/data/audit-baseline.ts.

export type ThemeConfig = {
  background: string;
  foreground: string;
  muted: string;
  panel: string;
  panelSoft: string;
  border: string;
  accent: string;
  accentDark: string;
  warning: string;
  blue: string;
  inkSoft: string;
};

export type ClientConfig = {
  /** Nome prodotto mostrato in topbar e nel <title> del browser. */
  productName: string;
  /** Sottotitolo accanto al nome prodotto in topbar (es. "Audit Hub"). */
  productTagline: string;
  /** Etichetta breve mostrata come "eyebrow" sopra il titolo della dashboard. */
  brandEyebrow: string;
  /** Descrizione usata nei metadata <head>. */
  metaDescription: string;
  /** Palette colori: sovrascrive le CSS variable definite in globals.css. */
  theme: ThemeConfig;
};

const defaultTheme: ThemeConfig = {
  background: "#f4f6f5",
  foreground: "#172033",
  muted: "#69778a",
  panel: "#ffffff",
  panelSoft: "#eef4f1",
  border: "#dce3e8",
  accent: "#18b76a",
  accentDark: "#0e7f4b",
  warning: "#b87a0d",
  blue: "#315f9f",
  inkSoft: "#233146",
};

export const clientConfig: ClientConfig = {
  productName: "Solair SEO",
  productTagline: "Audit Hub",
  brandEyebrow: "Solair Group",
  metaDescription: "Quadro operativo SEO e GEO per Solair Group",
  theme: defaultTheme,
};

/** Converte il tema in variabili CSS da iniettare in un tag <style> globale. */
export function themeToCssVariables(theme: ThemeConfig): string {
  return `
    --background: ${theme.background};
    --foreground: ${theme.foreground};
    --muted: ${theme.muted};
    --panel: ${theme.panel};
    --panel-soft: ${theme.panelSoft};
    --border: ${theme.border};
    --accent: ${theme.accent};
    --accent-dark: ${theme.accentDark};
    --warning: ${theme.warning};
    --blue: ${theme.blue};
    --ink-soft: ${theme.inkSoft};
  `;
}
