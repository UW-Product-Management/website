import {
  isLocalSupabaseUrl,
  resolvePortalEnvironment,
} from './portalEnvironment.mjs';

const LOCAL_URL = 'http://127.0.0.1:54321';
const REMOTE_URL = 'https://abcdefgh.supabase.co';

describe('isLocalSupabaseUrl', () => {
  it.each([
    'http://127.0.0.1:54321',
    'http://localhost:54321',
    'http://host.docker.internal:54321',
  ])('treats %s as local', (url) => {
    expect(isLocalSupabaseUrl(url)).toBe(true);
  });

  it.each([REMOTE_URL, 'http://127.0.0.1.evil.example', 'not a url', ''])(
    'treats %s as remote',
    (url) => {
      expect(isLocalSupabaseUrl(url)).toBe(false);
    },
  );
});

describe('resolvePortalEnvironment', () => {
  it('infers local from a Docker stack URL', () => {
    const env = resolvePortalEnvironment({
      supabaseUrl: LOCAL_URL,
      nodeEnv: 'development',
    });
    expect(env).toMatchObject({ name: 'local', isLocal: true, error: '' });
    expect(env.mailpitUrl).toBe('http://127.0.0.1:54324');
    expect(env.studioUrl).toBe('http://127.0.0.1:54323');
  });

  it('infers production from a remote URL with no label', () => {
    const env = resolvePortalEnvironment({
      supabaseUrl: REMOTE_URL,
      nodeEnv: 'production',
    });
    expect(env).toMatchObject({ name: 'production', isProduction: true });
    expect(env.error).toBe('');
  });

  it('allows a remote project in the dev server only when labelled staging', () => {
    const env = resolvePortalEnvironment({
      supabaseUrl: REMOTE_URL,
      label: 'staging',
      nodeEnv: 'development',
    });
    expect(env).toMatchObject({ name: 'staging', error: '' });
  });

  it('refuses the dev server against an unlabelled remote project', () => {
    const env = resolvePortalEnvironment({
      supabaseUrl: REMOTE_URL,
      nodeEnv: 'development',
    });
    expect(env.error).toMatch(/Refusing to run the dev server/);
  });

  it('refuses a dev server labelled production', () => {
    const env = resolvePortalEnvironment({
      supabaseUrl: LOCAL_URL,
      label: 'production',
      nodeEnv: 'development',
    });
    expect(env.error).toMatch(/Refusing to run the dev server/);
  });

  it('rejects a local label on a remote URL', () => {
    const env = resolvePortalEnvironment({
      supabaseUrl: REMOTE_URL,
      label: 'local',
      nodeEnv: 'development',
    });
    expect(env.error).toMatch(/points at a remote project/);
  });

  it('rejects unknown labels', () => {
    const env = resolvePortalEnvironment({
      supabaseUrl: LOCAL_URL,
      label: 'qa',
      nodeEnv: 'development',
    });
    expect(env.error).toMatch(/must be one of/);
  });
});
