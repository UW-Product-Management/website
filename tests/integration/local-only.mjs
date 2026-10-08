// Integration tests create users and rows with elevated keys. Refuse to run
// anywhere but the local Docker stack.
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export function assertLocalSupabase(url) {
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    // falls through to the refusal below
  }
  if (!LOCAL_HOSTNAMES.has(hostname)) {
    throw new Error(
      `Refusing to run integration tests against ${url}. They only run against the local Docker stack (npm run db:start).`,
    );
  }
}
