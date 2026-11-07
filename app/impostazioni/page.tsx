import { redirect } from "next/navigation";
import { requireSeoPage } from "../../lib/crm-auth";
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  await requireSeoPage();
  const base = process.env.CRM_URL;
  if (!base) return <p>Impostazioni SolairSEO non disponibili.</p>;
  redirect(new URL("/crm-settings/system/solair-seo", base).toString());
}
