// Pulizia dei report di test prima del lancio.
// Uso:  node scripts/purge-test-reports.mjs          -> ELENCA soltanto (nessuna modifica)
//       node scripts/purge-test-reports.mjs --yes    -> cancella i report elencati
// Opzionale: --keep <id>[,<id>] per conservare alcuni documenti.
import postgres from "postgres";
process.loadEnvFile?.(".env.local");
const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) { console.error("POSTGRES_URL_NON_POOLING mancante: eseguire `vercel env pull`."); process.exit(1); }
const args = process.argv.slice(2), yes = args.includes("--yes");
const keepIdx = args.indexOf("--keep"), keep = keepIdx >= 0 ? (args[keepIdx + 1] ?? "").split(",").filter(Boolean) : [];
const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  const docs = await sql`select id, created_at, trigger, status, kind, period_from, period_to, octet_length(pdf) as bytes
    from seo.report_documents where site_id='solairgroup.it' and not (id::text = any(${keep})) order by created_at`;
  console.log(`Report nello storico: ${docs.length}`);
  for (const d of docs) console.log(`- ${d.id}  ${new Date(d.created_at).toISOString()}  ${d.trigger}/${d.status}  ${d.kind}  ${d.period_from ?? "-"}..${d.period_to ?? "-"}  ${Math.round(d.bytes / 1024)} KB`);
  if (!yes) { console.log("\nNessuna modifica. Rilancia con --yes per cancellare."); process.exit(0); }
  const ids = docs.map((d) => d.id);
  if (!ids.length) process.exit(0);
  await sql.begin(async (tx) => {
    await tx`delete from seo.report_pdf_schedule where document_id = any(${ids})`;
    await tx`delete from seo.report_documents where id = any(${ids})`;
  });
  console.log(`Cancellati ${ids.length} report.`);
} finally { await sql.end(); }
