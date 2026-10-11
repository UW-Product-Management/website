// Runs before `npm run build`. Hosted builds must not ship the wrong backend:
// production needs a real project, previews must never point at production.
import {
  isLocalSupabaseUrl,
  resolvePortalEnvironment,
} from '../src/portal/portalEnvironment.mjs';

const hostedTarget = process.env.VERCEL_ENV;
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const label = process.env.REACT_APP_PORTAL_ENV || '';
const hasKey = Boolean(process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY);

const environment = resolvePortalEnvironment({
  supabaseUrl,
  label,
  nodeEnv: 'production',
});
const problems = [];

if (environment.error) problems.push(environment.error);

if (hostedTarget === 'production') {
  if (!supabaseUrl || isLocalSupabaseUrl(supabaseUrl)) {
    problems.push(
      'Production builds need REACT_APP_SUPABASE_URL to point at the hosted project, not the Docker stack.',
    );
  }
  if (!hasKey) {
    problems.push('Production builds need REACT_APP_SUPABASE_PUBLISHABLE_KEY.');
  }
  if (label && label !== 'production') {
    problems.push(
      `Production builds cannot be labelled "${label}". Unset REACT_APP_PORTAL_ENV.`,
    );
  }
  if (process.env.REACT_APP_PORTAL_EVENT_SLUG === 'prodcon-local') {
    problems.push(
      'REACT_APP_PORTAL_EVENT_SLUG is still the local seed event (prodcon-local).',
    );
  }
}

if (hostedTarget === 'preview' && environment.isProduction && supabaseUrl) {
  problems.push(
    'Preview deployments must not use the production Supabase project. Set REACT_APP_PORTAL_ENV=staging with a staging project, or leave the Supabase variables unset for Preview.',
  );
}

if (problems.length > 0) {
  console.error('\nPortal environment check failed:\n');
  problems.forEach((problem) => console.error(`  - ${problem}`));
  console.error('');
  process.exit(1);
}

if (!hostedTarget && environment.isProduction && supabaseUrl) {
  console.warn(
    `\nBuilding against a remote Supabase project (${
      new URL(supabaseUrl).host
    }). Do not serve this build on a shared or public host unless it is the production deploy.\n`,
  );
}
