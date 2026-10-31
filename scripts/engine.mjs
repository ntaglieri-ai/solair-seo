// Amministrazione locale: il segreto viene letto dall'ambiente, mai passato negli argomenti.
process.loadEnvFile?.(".env.local");
const [command = "status", value] = process.argv.slice(2);
if (!["status", "run", "configure"].includes(command)) throw new Error("Usa status, run o configure.");
const base = process.env.ENGINE_BASE_URL ?? "https://solair-seo.vercel.app";
if (!process.env.CRON_SECRET) throw new Error("CRON_SECRET mancante.");
const method = command === "status" ? "GET" : command === "configure" ? "PATCH" : "POST";
const body = command === "configure" ? { settings: JSON.parse(value ?? "{}") } : { force: value === "--force" };
const response = await fetch(`${base}/api/engine`, {
  method, headers: { authorization: `Bearer ${process.env.CRON_SECRET}`, "content-type": "application/json" },
  body: method === "GET" ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(310000),
});
const result = await response.json();
console.log(JSON.stringify(result, null, 2));
if (!response.ok) process.exitCode = 1;
