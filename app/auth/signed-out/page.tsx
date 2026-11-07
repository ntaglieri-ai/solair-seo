import { AuthShell, authStyles } from "../auth-shell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sei uscito | Solair SEO" };
export default function SignedOutPage() {
  return <AuthShell title="Sei uscito">
    <p>La sessione nell’app è terminata. Puoi rientrare quando vuoi con il tuo account CRM.</p>
    <a className={authStyles.cta} href="/auth/login">Accedi di nuovo <span aria-hidden="true">→</span></a>
    <p className={authStyles.note}>Se sei già connesso al CRM, l’accesso riprende con lo stesso account. Per usare un altro account, esci anche dal CRM.</p>
  </AuthShell>;
}
