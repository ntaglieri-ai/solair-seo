// Applica in ordine i file db/migrations/*.sql non ancora eseguiti.
// Uso: npm run db:migrate  (legge POSTGRES_URL_NON_POOLING da .env.local)

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

process.loadEnvFile?.(".env.local");

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.error("POSTGRES_URL_NON_POOLING mancante: eseguire `vercel env pull`.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
const dir = path.join(process.cwd(), "db", "migrations");

try {
  await sql`
    create table if not exists public.seo_schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `;
  await sql`alter table public.seo_schema_migrations enable row level security`;

  const applied = new Set(
    (await sql`select name from public.seo_schema_migrations`).map((row) => row.name)
  );
  const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const body = await readFile(path.join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into public.seo_schema_migrations (name) values (${file})`;
    });
    console.log(`applicata ${file}`);
  }
  console.log("database aggiornato");
} finally {
  await sql.end();
}
