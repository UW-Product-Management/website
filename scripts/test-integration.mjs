// Integration tests need the Edge Function served. Start it if nothing is
// serving it yet, run the suite, then stop only what this script started.
import { spawn } from 'node:child_process';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/send-application-received`;
const STARTUP_TIMEOUT_MS = 90_000;

const isFunctionServed = async () => {
  try {
    const res = await fetch(FUNCTION_URL, { method: 'OPTIONS' });
    return res.ok;
  } catch {
    return false;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntilServed() {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isFunctionServed()) return true;
    await sleep(1000);
  }
  return false;
}

let server = null;
if (!(await isFunctionServed())) {
  console.log('Serving Edge Functions for the integration run...');
  server = spawn('npx', ['supabase', 'functions', 'serve'], {
    stdio: 'ignore',
  });
  if (!(await waitUntilServed())) {
    server.kill('SIGTERM');
    console.error(
      'Edge Functions did not start. Is the local stack running (npm run db:start)?',
    );
    process.exit(1);
  }
}

const tests = spawn('node', ['--test', 'tests/integration/*.test.mjs'], {
  stdio: 'inherit',
});
tests.on('exit', (code) => {
  server?.kill('SIGTERM');
  process.exit(code ?? 1);
});
