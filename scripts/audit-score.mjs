// Pubblica un audit globale validato: non usa il punteggio automatico della sola homepage.
import {readFile} from 'node:fs/promises';
process.loadEnvFile?.('.env.local');
const [file,confirmation]=process.argv.slice(2);
if(!file||confirmation!=='--publish')throw new Error('Uso: node scripts/audit-score.mjs /percorso/audit.json --publish');
const audit=JSON.parse(await readFile(file,'utf8'));
const response=await fetch(`${process.env.ENGINE_BASE_URL??'https://solair-seo.vercel.app'}/api/audit-scores`,{
  method:'POST',headers:{authorization:`Bearer ${process.env.CRON_SECRET}`,'content-type':'application/json'},body:JSON.stringify(audit),
});
console.log(JSON.stringify(await response.json()));if(!response.ok)process.exitCode=1;
