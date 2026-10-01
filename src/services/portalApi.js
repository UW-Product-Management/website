import { supabase } from '../lib/supabaseClient';

function getOrigin() {
  if (
    typeof window !== 'undefined' &&
    window.location?.origin &&
    window.location.origin !== 'null'
  ) {
    return window.location.origin;
  }
  return '';
}

export async function signUp({ fullName, email, password }, options = {}) {
  const origin = getOrigin();
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/portal/apply/register`,
      ...options,
      data: {
        full_name: fullName,
        ...(options.data || {}),
      },
    },
  });
}

export async function signIn({ email, password }) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resendConfirmation(email, options = {}) {
  const origin = getOrigin();
  return supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${origin}/portal/apply/register`,
      ...options,
    },
  });
}

export async function requestPasswordReset(email, options = {}) {
  const origin = getOrigin();
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/portal/update-password`,
    ...options,
  });
}

export async function updatePassword(password) {
  return supabase.auth.updateUser({
    password,
  });
}
