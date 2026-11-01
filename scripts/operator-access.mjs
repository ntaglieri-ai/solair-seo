// Crea istruzioni private sul Mac. Il codice non viene stampato né incluso nel repository.
import {createHmac} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
process.loadEnvFile?.('.env.local');
if(!process.env.CRON_SECRET)throw new Error('Configurazione operatore mancante.');
const key=createHmac('sha256',process.env.CRON_SECRET).update('solair:interventions:access:v1').digest('hex').slice(0,40);
const dir=path.join(homedir(),'.codex','private');await mkdir(dir,{recursive:true,mode:0o700});
const file=path.join(dir,'solair-seo-accesso.txt');
await writeFile(file,`Gestione interventi Solair SEO\n\n1. Apri https://solair-seo.vercel.app/interventi\n2. Apri «Gestione interventi».\n3. Inserisci questo codice operatore:\n\n${key}\n\nL’accesso dura 8 ore. Le spunte vengono salvate nel database e sono visibili agli altri dispositivi.\nIl codice consente di approvare e aggiornare il piano: conservalo per il responsabile del servizio.\n`,{mode:0o600});
console.log(`Istruzioni private salvate in ${file}`);
