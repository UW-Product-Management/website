import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertLocalSupabase } from './local-only.mjs';

test('accepts the local Docker stack', () => {
  assertLocalSupabase('http://127.0.0.1:54321');
  assertLocalSupabase('http://localhost:54321');
});

test('refuses hosted projects and malformed URLs', () => {
  assert.throws(
    () => assertLocalSupabase('https://abcdefgh.supabase.co'),
    /Refusing to run integration tests/,
  );
  assert.throws(() => assertLocalSupabase('http://127.0.0.1.evil.example'));
  assert.throws(() => assertLocalSupabase('not a url'));
});
