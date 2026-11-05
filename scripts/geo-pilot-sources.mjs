import {readFileSync} from 'node:fs';
import {writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
process.loadEnvFile('.env.local');
const require=createRequire(import.meta.url);
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {getSql}=require('../lib/db.ts');
const {getPilotRequests}=require('../lib/geo-pilot/store.ts');
const {checkSource}=require('../lib/geo-pilot/source-check.ts');
const {citesSolair}=require('../lib/geo-pilot/protocol.ts');
const sql=getSql();
try{
 const rows=await getPilotRequests();const urls=[...new Set(rows.flatMap(row=>row.result?.citations.map(c=>c.url)??[]))];
 const checks=new Map();let cursor=0;
 async function worker(){while(cursor<urls.length){const url=urls[cursor++];checks.set(url,await checkSource(url));}}
 await Promise.all(Array.from({length:4},()=>worker()));
 for(const row of rows){if(!row.result)continue;row.result.citations=row.result.citations.map(c=>({...c,...checks.get(c.url)}));row.result.citedSolair=citesSolair(row.result.citations);
   await sql`update seo.geo_pilot_requests set result=${sql.json(row.result)} where id=${row.id}`;
 }
 await mkdir('.geo-pilot',{recursive:true,mode:0o700});
 await writeFile('.geo-pilot/sources.json',JSON.stringify([...checks].map(([url,check])=>({url,...check})),null,2),{mode:0o600});
 console.log(JSON.stringify({sources:urls.length,reachable:[...checks.values()].filter(v=>v.verification==='reachable').length,unreachable:[...checks.values()].filter(v=>v.verification==='unreachable').length,blocked:[...checks.values()].filter(v=>v.verification==='blocked').length}));
}finally{await sql.end();}
