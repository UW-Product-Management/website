// One command for a safe local portal: Docker Supabase, the Edge Function
// (emails go to Mailpit) and the React dev server, all pinned to local.
import { execFileSync, spawn } from 'node:child_process';

const run = (command, args, options = {}) =>
  execFileSync(command, args, { encoding: 'utf8', ...options });

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

try {
  run('docker', ['info'], { stdio: 'ignore' });
} catch {
  fail('Docker is not running. Start Docker Desktop and try again.');
}

function readStatus() {
  try {
    return JSON.parse(
      run('npx', ['supabase', 'status', '-o', 'json'], {
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
    );
  } catch {
    return null;
  }
}

let status = readStatus();
if (!status?.API_URL) {
  console.log('Starting the local Supabase stack...');
  try {
    run('npx', ['supabase', 'start'], { stdio: 'inherit' });
  } catch {
    fail('supabase start failed. Check the output above.');
  }
  status = readStatus();
}
if (!status?.API_URL) fail('Could not read the local Supabase status.');

const publishableKey = status.PUBLISHABLE_KEY || status.ANON_KEY;
const children = [
  spawn('npx', ['supabase', 'functions', 'serve'], { stdio: 'inherit' }),
  spawn('npx', ['react-scripts', 'start'], {
    stdio: 'inherit',
    // Explicit values win over .env.local, so this can never reach a hosted project.
    env: {
      ...process.env,
      REACT_APP_SUPABASE_URL: status.API_URL,
      REACT_APP_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      REACT_APP_PORTAL_ENV: 'local',
      REACT_APP_PORTAL_EVENT_SLUG: 'prodcon-local',
    },
  }),
];

console.log(`
Local portal ready
  App      http://localhost:3000/portal
  Mailpit  ${
    status.MAILPIT_URL || 'http://127.0.0.1:54324'
  }  (all auth and application emails land here)
  Studio   ${status.STUDIO_URL}
`);

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach((child) => child.kill('SIGTERM'));
  process.exit(code);
}

children.forEach((child) => child.on('exit', (code) => shutdown(code ?? 0)));
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
