// Carica le credenziali locali solo nel processo server; non le copia nel repository.
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
for (const file of ['.env.local', '.env.ai.local', '.env.openai.local']) {
  if (existsSync(file)) process.loadEnvFile(file);
}
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit', env: process.env,
});
child.on('exit', code => process.exit(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
