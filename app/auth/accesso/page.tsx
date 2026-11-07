import { AuthShell, authStyles } from "../auth-shell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accedi | Solair SEO" };
export default async function AccessPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const href = `/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return <AuthShell title="Accedi">
    <p>Entra con il tuo account del CRM Solair. Non servono password nuove.</p>
    <a className={authStyles.cta} href={href}>Accedi con il CRM <span aria-hidden="true">→</span></a>
    <p className={authStyles.note}>L’accesso è riservato agli utenti Solair abilitati. Se non riesci a entrare, chiedi all’amministratore di verificare il permesso Solair SEO.</p>
  </AuthShell>;
}
