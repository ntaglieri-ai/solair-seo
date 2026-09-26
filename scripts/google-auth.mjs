// Genera un nuovo GOOGLE_REFRESH_TOKEN con i permessi di lettura di
// Search Console e Analytics, e lo salva in .env.local senza mostrarlo.
// Uso: npm run google:auth
//
// Il client OAuth (GOOGLE_CLIENT_ID/SECRET) deve accettare il redirect
// http://localhost:53682/oauth2callback: automatico per i client "App desktop",
// da aggiungere a mano in Google Cloud per i client "Applicazione web".

import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { exec } from "node:child_process";
import { google } from "googleapis";

const ENV_FILE = ".env.local";
const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
];

process.loadEnvFile(ENV_FILE);
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET devono essere in .env.local.");
  process.exit(1);
}

const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
const authUrl = client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // forza l'emissione di un nuovo refresh token
  scope: SCOPES,
});

const code = await new Promise((resolve, reject) => {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", REDIRECT_URI);
    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404).end();
      return;
    }
    const error = url.searchParams.get("error");
    const value = url.searchParams.get("code");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      error || !value
        ? "<p>Autorizzazione non riuscita. Puoi chiudere questa scheda.</p>"
        : "<p>Autorizzazione completata. Puoi chiudere questa scheda e tornare al terminale.</p>"
    );
    server.close();
    if (error || !value) reject(new Error(error ?? "Codice mancante nella risposta di Google."));
    else resolve(value);
  });
  server.listen(PORT, () => {
    console.log("Si apre il browser per il consenso Google. Se non si apre, visita:\n");
    console.log(authUrl, "\n");
    exec(`open "${authUrl}"`);
  });
});

const { tokens } = await client.getToken(code);
if (!tokens.refresh_token) {
  console.error("Google non ha restituito un refresh token. Riprova.");
  process.exit(1);
}

const granted = (tokens.scope ?? "").split(" ");
const missing = SCOPES.filter((scope) => !granted.includes(scope));
if (missing.length > 0) {
  console.error("Permessi non concessi:", missing.join(", "));
  console.error("Riprova spuntando tutte le caselle nella pagina di consenso.");
  process.exit(1);
}

// Sostituisce la riga GOOGLE_REFRESH_TOKEN mantenendo il resto del file.
const env = await readFile(ENV_FILE, "utf8");
const line = `GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`;
const updated = /^GOOGLE_REFRESH_TOKEN=.*$/m.test(env)
  ? env.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, line)
  : `${env.trimEnd()}\n${line}\n`;
await writeFile(ENV_FILE, updated);
console.log("Nuovo GOOGLE_REFRESH_TOKEN salvato in .env.local (Search Console + Analytics).\n");

// Elenco delle proprietà GA4 accessibili, per scegliere GA4_PROPERTY_ID.
client.setCredentials(tokens);
try {
  const admin = google.analyticsadmin({ version: "v1beta", auth: client });
  const { data } = await admin.accountSummaries.list({ pageSize: 200 });
  console.log("Proprietà GA4 accessibili:");
  for (const account of data.accountSummaries ?? []) {
    for (const property of account.propertySummaries ?? []) {
      const id = property.property?.replace("properties/", "");
      console.log(`  ${id}  ${property.displayName}  (account: ${account.displayName})`);
    }
  }
} catch (err) {
  console.log("Elenco proprietà GA4 non disponibile:", err.message);
  console.log("Serve la \"Google Analytics Admin API\" attiva nel progetto Google Cloud.");
}
