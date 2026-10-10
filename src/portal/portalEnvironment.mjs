export const DEFAULT_LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
export const DEFAULT_LOCAL_PUBLISHABLE_KEY =
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const ENVIRONMENT_NAMES = ['local', 'staging', 'production'];
const LOCAL_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]',
  'host.docker.internal',
]);

const LOCAL_MAILPIT_PORT = 54324;
const LOCAL_STUDIO_PORT = 54323;

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isLocalSupabaseUrl(value) {
  const url = parseUrl(value);
  return Boolean(url) && LOCAL_HOSTNAMES.has(url.hostname);
}

function localToolUrl(supabaseUrl, port) {
  const url = parseUrl(supabaseUrl);
  return url ? `${url.protocol}//${url.hostname}:${port}` : '';
}

function findConfigurationError({ name, label, isLocal, nodeEnv }) {
  if (label && !ENVIRONMENT_NAMES.includes(label)) {
    return `REACT_APP_PORTAL_ENV must be one of ${ENVIRONMENT_NAMES.join(
      ', ',
    )} (received "${label}").`;
  }
  if (name === 'local' && !isLocal) {
    return 'REACT_APP_PORTAL_ENV is "local" but REACT_APP_SUPABASE_URL points at a remote project. Use the Docker stack (npm run db:start) or label the environment "staging".';
  }
  if (name === 'production' && nodeEnv === 'development') {
    return 'Refusing to run the dev server against a production Supabase project. Point REACT_APP_SUPABASE_URL at the Docker stack (npm run dev:local) or at a staging project with REACT_APP_PORTAL_ENV=staging.';
  }
  return '';
}

export function resolvePortalEnvironment({
  supabaseUrl,
  label = '',
  nodeEnv = 'production',
}) {
  const isLocal = isLocalSupabaseUrl(supabaseUrl);
  const name = label || (isLocal ? 'local' : 'production');

  return {
    name,
    isLocal,
    isProduction: name === 'production',
    error: findConfigurationError({ name, label, isLocal, nodeEnv }),
    mailpitUrl: isLocal ? localToolUrl(supabaseUrl, LOCAL_MAILPIT_PORT) : '',
    studioUrl: isLocal ? localToolUrl(supabaseUrl, LOCAL_STUDIO_PORT) : '',
  };
}

export const SUPABASE_URL =
  process.env.REACT_APP_SUPABASE_URL || DEFAULT_LOCAL_SUPABASE_URL;

export const portalEnvironment = resolvePortalEnvironment({
  supabaseUrl: SUPABASE_URL,
  label: process.env.REACT_APP_PORTAL_ENV,
  nodeEnv: process.env.NODE_ENV,
});
