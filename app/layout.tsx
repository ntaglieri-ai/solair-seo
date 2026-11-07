import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { AppShell } from "./components/app-shell";
import { baselineAudit } from "./data/audit-baseline";
import { readHomePerformance } from "./data/home-performance";
import { SEO_SESSION_COOKIE } from "../lib/crm-auth";

/** Data dell'ultimo dato Search Console, solo per chi ha una sessione: le pagine di accesso non leggono il database. */
async function lastDataDate() {
  try {
    if (!(await cookies()).get(SEO_SESSION_COOKIE)?.value) return null;
    const last = (await readHomePerformance(baselineAudit.domain)).gsc?.lastDate;
    return last ? new Date(`${last}T12:00:00Z`).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).replace(".", "") : null;
  } catch { return null; }
}
import { clientConfig, themeToCssVariables } from "../lib/client-config";

export const metadata: Metadata = {
  title: clientConfig.productName,
  description: clientConfig.metaDescription,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const dataDate = await lastDataDate();
  return (
    <html lang="it">
      <head>
        <style>{`:root { ${themeToCssVariables(clientConfig.theme)} }`}</style>
      </head>
      <body><AppShell dataDate={dataDate}>{children}</AppShell></body>
    </html>
  );
}
