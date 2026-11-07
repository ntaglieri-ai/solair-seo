import styles from "./signed-out.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sei uscito | Solair SEO" };
export default function SignedOutPage() {
  return <main className={styles.page}><section className={styles.card} aria-labelledby="signed-out-title">
    <p className={styles.brand}>Solair SEO</p>
    <h1 id="signed-out-title">Sei uscito da Solair SEO</h1>
    <p>La sessione nell’app è terminata. Puoi rientrare con il tuo account CRM.</p>
    <a className={styles.login} href="/auth/login">Accedi tramite CRM</a>
    <p className={styles.note}>Se sei già connesso al CRM, l’accesso riprende con lo stesso account. Per usare un altro account, esci anche dal CRM.</p>
  </section></main>;
}
