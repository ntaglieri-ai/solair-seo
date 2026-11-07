# Accesso Solair SEO tramite CRM

Solair SEO usa lo stesso Supabase OAuth server già utilizzato da Nextcloud. La pagina di consenso CRM distingue i due client registrati; il flusso Nextcloud mantiene il proprio handler. Solair SEO usa authorization code con PKCE S256 e state legato al browser. Non riceve la password CRM e non usa più il codice operatore.

## Permesso

`solair_seo` è una pagina autonoma in CRM Settings → Permessi, configurabile sui gruppi e con eccezioni personali:

- Niente: nessun accesso a pagine, API o PDF.
- Lettura: consultazione dei dati e download dei report già esistenti.
- Scrittura: anche analisi manuali, generazione di nuovi report, fonti, checklist e impostazioni.

Root mantiene accesso completo. La migrazione `2026110701_solair_seo_permissions.sql` aggiunge una regola esplicita a tutti i gruppi esistenti, senza sovrascrivere quelle già configurate. I gruppi diversi da Root partono senza accesso; quelli nuovi usano il catalogo aggiornato e partono senza accesso salvo scelta esplicita.

Il collegamento “Solair SEO” nella navigazione CRM appare secondo lo stesso permesso delle altre pagine e apre l’app tramite `/auth/login`.

## Configurazione

Dal repository CRM, con le credenziali amministrative già presenti:

```sh
node --env-file=.env.local scripts/auth/setup-solair-seo.mjs
```

Lo script registra, se manca, il client pubblico PKCE “Solair SEO”, inizializza il permesso senza sovrascrivere concessioni esistenti e aggiorna esclusivamente i file locali `.env.local` dei due repository. Non pubblica e non configura le variabili sull’hosting.

Il client autorizza esclusivamente il callback `https://solair-seo.vercel.app/auth/callback`. Per un altro dominio impostare `SOLAIR_SEO_URL` prima dell’esecuzione. Per prove locali usare un client separato con callback locale; non sostituire il dominio di produzione del provider OAuth.

Variabili server del CRM:

- `SOLAIR_SEO_URL`: origine dell’app SEO.
- `SUPABASE_OAUTH_SEO_CLIENT_ID`: identificativo del client OAuth registrato.

Variabili server di Solair SEO:

- `SOLAIR_SEO_URL`: URL pubblico dell’app SEO, usato per il callback.
- `CRM_URL`: URL pubblico del CRM, attualmente `https://crm.solairgroup.it`.
- `CRM_SUPABASE_URL`: URL del progetto Supabase del CRM, non del database SEO se differente.
- `CRM_OAUTH_CLIENT_ID`: stesso client configurato sul CRM.

Il client pubblico registrato usa `token_endpoint_auth_method=none`. Il callback supporta anche un client riservato con `CRM_OAUTH_CLIENT_SECRET` (metodo Basic), se configurato separatamente. Non serve trasferire a Solair SEO la chiave amministrativa Supabase del CRM.

Prima del rilascio configurare queste variabili sull’hosting delle rispettive app. Pubblicare prima il CRM e poi Solair SEO. Seguire la regola Git di pubblicazione del repository: fetch, integrazione senza perdita di commit remoti, allineamento di develop e main e verifica della produzione.

## Sessione e revoche

Il token SEO è conservato in un cookie HttpOnly, Secure in produzione, SameSite=Lax e con durata massima di un’ora o inferiore se il provider impone una scadenza più breve. Non viene conservato il refresh token: alla scadenza si ripassa dal CRM, che deve avere una sessione browser valida secondo le proprie regole.

Ogni pagina e ogni API interattiva verificano il token tramite `/api/auth/seo/permissions` del CRM. L’endpoint verifica firma, client OAuth, identità Supabase e account CRM attivo, poi riutilizza il motore dei permessi esistente tramite un contesto isolato per richiesta. Se i permessi v2 sono abilitati ma non caricabili, l’accesso fallisce senza ripiegare sui default legacy. Le cache dei permessi mantengono i tempi di aggiornamento del CRM; lo stato attivo viene verificato a ogni richiesta.

Il logout del CRM e quello dell’app sono sessioni OAuth separate: un token SEO già emesso può durare fino alla sua scadenza. La disattivazione dell’account e il ritiro del permesso vengono invece controllati sul CRM. Il token non viene esposto in URL o risposte applicative.

Le mutazioni richiedono anche origine corrispondente. I cron e gli endpoint macchina mantengono l’autenticazione `CRON_SECRET`, senza trasformarla in una sessione utente. Il precedente endpoint operatore non accetta più codici (410).

## Verifica

Controlli automatici: isolamento dei contesti bearer, account disattivati, client OAuth errato, mancanza/revoca dei permessi, sola lettura, eccezioni personali, errore del motore permessi, state e PKCE, destinazioni di ritorno, compatibilità del consenso Nextcloud e copertura delle guardie su tutte le pagine/API SEO. Verificare inoltre un login reale dopo la pubblicazione coordinata delle due app.

Riferimento protocollo: [Supabase OAuth 2.1 flows](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows).

## Stato della preparazione — 7 novembre 2026

Client OAuth registrato sul progetto Supabase CRM; permesso inizializzato sui gruppi esistenti; file locali dei due repository configurati. Le sei variabili di collegamento sono state create e verificate su Vercel negli ambienti Production e Preview. Il codice delle due app non è stato pubblicato: il login reale online richiede il rilascio coordinato sopra descritto.
