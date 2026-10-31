import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy e dati Google | MosTag Audit Suite" };

export default function PrivacyPage() {
  return (
    <main className="dashboard section-page">
      <header className="detail-hero">
        <div className="section-inner">
          <Link className="back-link" href="/">Torna alla dashboard</Link>
          <p className="eyebrow">MosTag Audit Suite · Solair SEO</p>
          <h1>Privacy e dati Google</h1>
          <p className="hero-copy">Informativa sull’accesso e sull’utilizzo dei dati Google nell’applicazione. Aggiornata al 31 ottobre 2026.</p>
        </div>
      </header>
      <section className="content-section">
        <div className="section-inner privacy-content">
          <h2>Referente dell’applicazione</h2>
          <p>MosTag Audit Suite è gestita da Nando Taglieri. Per assistenza, chiarimenti o richieste relative ai dati: <a href="mailto:n.taglieri@gmail.com">n.taglieri@gmail.com</a>.</p>
          <h2>Finalità e autorizzazione</h2>
          <p>L’applicazione analizza la visibilità organica e il traffico dei siti per i quali il titolare dell’account Google concede l’accesso. L’istanza Solair SEO presenta i dati del progetto solairgroup.it. L’accesso alle API avviene tramite consenso Google OAuth, con permessi di sola lettura per Search Console e Analytics.</p>
          <h2>Dati consultati e archiviati</h2>
          <p>Da Search Console vengono letti proprietà accessibili, clic, impressioni, CTR, posizione media, query e pagine. Da Analytics vengono letti identificativi delle proprietà e metriche aggregate: utenti, sessioni, canali, coinvolgimento ed eventi, compresi i conteggi delle interazioni di contatto. Durante la configurazione possono essere consultati i nomi degli account e delle proprietà Analytics accessibili.</p>
          <p>L’applicazione conserva inoltre date ed esiti delle raccolte, analisi tecniche delle pagine pubbliche e credenziali OAuth necessarie a rinnovare l’accesso. Non legge Gmail, messaggi, documenti Drive o contatti dell’account Google; non modifica le proprietà Search Console o Analytics.</p>
          <h2>Utilizzo e visualizzazione</h2>
          <p>I dati servono a mostrare andamento, confronti e report SEO. Le pagine della dashboard espongono metriche aggregate e query delle proprietà autorizzate; non espongono i token OAuth né schede dei singoli visitatori. L’autorizzazione Google riguarda l’importazione dei dati e non costituisce un sistema di accesso alla dashboard.</p>
          <p>I dati Google non vengono venduti, utilizzati per pubblicità personalizzata o impiegati per addestrare modelli di intelligenza artificiale. La sezione Visibilità AI non invia a motori AI i dati raccolti da Google.</p>
          <h2>Fornitori e sicurezza</h2>
          <p>Vercel ospita l’applicazione e le credenziali server; il database PostgreSQL su Supabase conserva lo storico. Google fornisce le API autorizzate. Questi servizi trattano i dati necessari al funzionamento tecnico secondo le rispettive condizioni. Le comunicazioni avvengono tramite HTTPS e le credenziali rimangono sul server.</p>
          <h2>Conservazione e cancellazione</h2>
          <p>Lo storico è conservato per consentire il confronto tra audit; attualmente non è prevista una cancellazione automatica a scadenza. Il referente della proprietà può richiedere la cancellazione dei dati e delle credenziali scrivendo all’indirizzo indicato sopra. La gestione delle eventuali copie di backup segue i tempi tecnici dei fornitori.</p>
          <h2>Revoca dell’accesso</h2>
          <p>Puoi revocare l’autorizzazione dalla pagina <a href="https://myaccount.google.com/connections">Connessioni del tuo account Google</a>. La revoca interrompe le raccolte future ma non cancella automaticamente lo storico già importato: per eliminarlo occorre inviare una richiesta al referente dell’applicazione.</p>
          <h2>Norme sui dati Google</h2>
          <p>L’utilizzo e l’eventuale trasferimento delle informazioni ricevute dalle API Google rispettano la <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, inclusi i requisiti Limited Use. Eventuali nuove finalità o permessi richiederanno l’aggiornamento dell’informativa e, quando necessario, un nuovo consenso.</p>
        </div>
      </section>
    </main>
  );
}
