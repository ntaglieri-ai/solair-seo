import { AuthShell, authStyles } from "../auth-shell";

export const metadata = { title: "Accesso non disponibile | Solair SEO" };
export default function AuthError() {
  return <AuthShell title="Accesso non disponibile">
    <p>Non siamo riusciti a completare l’accesso. Riprova con il tuo account CRM.</p>
    <a className={authStyles.cta} href="/auth/login">Riprova l’accesso <span aria-hidden="true">→</span></a>
    <p className={authStyles.note}>Se l’accesso risulta negato, chiedi all’amministratore di verificare il permesso Solair SEO nel tuo gruppo o profilo personale.</p>
  </AuthShell>;
}
