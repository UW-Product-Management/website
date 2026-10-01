import { supabase } from '../lib/supabaseClient';
import {
  signUp,
  signIn,
  signOut,
  resendConfirmation,
  requestPasswordReset,
  updatePassword,
} from './portalApi';

describe('portalApi auth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('calls supabase.auth.signUp with formatted metadata and redirect URL', async () => {
      const mockResult = {
        data: { user: { id: 'user-1' }, session: null },
        error: null,
      };
      supabase.auth.signUp.mockResolvedValueOnce(mockResult);

      const result = await signUp({
        fullName: 'Alex Chen',
        email: 'alex@example.com',
        password: 'password123',
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'alex@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: `${window.location.origin}/portal/apply/register`,
          data: {
            full_name: 'Alex Chen',
          },
        },
      });
      expect(result).toEqual(mockResult);
    });

    it('merges custom options and extra metadata', async () => {
      supabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'user-1' }, session: null },
        error: null,
      });

      await signUp(
        {
          fullName: 'Alex Chen',
          email: 'alex@example.com',
          password: 'password123',
        },
        {
          captchaToken: 'test-captcha',
          data: { role: 'applicant' },
        },
      );

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'alex@example.com',
        password: 'password123',
        options: {
          captchaToken: 'test-captcha',
          emailRedirectTo: `${window.location.origin}/portal/apply/register`,
          data: {
            full_name: 'Alex Chen',
            role: 'applicant',
          },
        },
      });
    });

    it('returns error when auth signup fails', async () => {
      const authError = {
        code: 'weak_password',
        message: 'Password should be at least 8 characters.',
      };
      supabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: authError,
      });

      const result = await signUp({
        fullName: 'Alex Chen',
        email: 'alex@example.com',
        password: 'short',
      });

      expect(result.error).toEqual(authError);
    });
  });

  describe('signIn', () => {
    it('calls supabase.auth.signInWithPassword with email and password', async () => {
      const mockResult = {
        data: { session: { access_token: 'token-abc' }, user: { id: 'u1' } },
        error: null,
      };
      supabase.auth.signInWithPassword.mockResolvedValueOnce(mockResult);

      const result = await signIn({
        email: 'alex@example.com',
        password: 'password123',
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'alex@example.com',
        password: 'password123',
      });
      expect(result).toEqual(mockResult);
    });

    it('returns email_not_confirmed error on unconfirmed account login', async () => {
      const authError = {
        code: 'email_not_confirmed',
        message: 'Email not confirmed',
      };
      supabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: authError,
      });

      const result = await signIn({
        email: 'alex@example.com',
        password: 'password123',
      });

      expect(result.error).toEqual(authError);
    });
  });

  describe('signOut', () => {
    it('calls supabase.auth.signOut and returns result', async () => {
      supabase.auth.signOut.mockResolvedValueOnce({ error: null });

      const result = await signOut();

      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ error: null });
    });

    it('returns error when sign out fails', async () => {
      const authError = { message: 'Sign out failed' };
      supabase.auth.signOut.mockResolvedValueOnce({ error: authError });

      const result = await signOut();

      expect(result.error).toEqual(authError);
    });
  });

  describe('resendConfirmation', () => {
    it('calls supabase.auth.resend with type signup, email, and register redirect', async () => {
      const mockResult = { data: {}, error: null };
      supabase.auth.resend.mockResolvedValueOnce(mockResult);

      const result = await resendConfirmation('alex@example.com');

      expect(supabase.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'alex@example.com',
        options: {
          emailRedirectTo: `${window.location.origin}/portal/apply/register`,
        },
      });
      expect(result).toEqual(mockResult);
    });

    it('merges custom options when resending confirmation', async () => {
      supabase.auth.resend.mockResolvedValueOnce({ data: {}, error: null });

      await resendConfirmation('alex@example.com', {
        captchaToken: 'test-captcha',
      });

      expect(supabase.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'alex@example.com',
        options: {
          captchaToken: 'test-captcha',
          emailRedirectTo: `${window.location.origin}/portal/apply/register`,
        },
      });
    });

    it('returns error when resending confirmation is throttled', async () => {
      const authError = {
        code: 'over_email_send_rate_limit',
        message:
          'For security purposes, you can only request this after 60 seconds.',
      };
      supabase.auth.resend.mockResolvedValueOnce({
        data: {},
        error: authError,
      });

      const result = await resendConfirmation('alex@example.com');

      expect(result.error).toEqual(authError);
    });
  });

  describe('requestPasswordReset', () => {
    it('calls supabase.auth.resetPasswordForEmail with update-password redirect', async () => {
      const mockResult = { data: {}, error: null };
      supabase.auth.resetPasswordForEmail.mockResolvedValueOnce(mockResult);

      const result = await requestPasswordReset('alex@example.com');

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'alex@example.com',
        {
          redirectTo: `${window.location.origin}/portal/update-password`,
        },
      );
      expect(result).toEqual(mockResult);
    });

    it('merges custom options into resetPasswordForEmail', async () => {
      supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      await requestPasswordReset('alex@example.com', {
        captchaToken: 'test-captcha',
      });

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'alex@example.com',
        {
          captchaToken: 'test-captcha',
          redirectTo: `${window.location.origin}/portal/update-password`,
        },
      );
    });

    it('returns error when requestPasswordReset fails', async () => {
      const authError = { message: 'User not found' };
      supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: authError,
      });

      const result = await requestPasswordReset('missing@example.com');

      expect(result.error).toEqual(authError);
    });
  });

  describe('updatePassword', () => {
    it('calls supabase.auth.updateUser with new password', async () => {
      const mockResult = {
        data: { user: { id: 'u1' } },
        error: null,
      };
      supabase.auth.updateUser.mockResolvedValueOnce(mockResult);

      const result = await updatePassword('new-secure-password');

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'new-secure-password',
      });
      expect(result).toEqual(mockResult);
    });

    it('returns error when password update fails', async () => {
      const authError = {
        code: 'same_password',
        message: 'New password should be different from old password',
      };
      supabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: null },
        error: authError,
      });

      const result = await updatePassword('old-password');

      expect(result.error).toEqual(authError);
    });
  });

  describe('origin fallback', () => {
    it('falls back to empty string when window.location.origin is absent', async () => {
      const originalOrigin = window.location.origin;
      try {
        delete window.location;
        window.location = { origin: '' };

        supabase.auth.signUp.mockResolvedValueOnce({ data: {}, error: null });
        await signUp({
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'pass',
        });

        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'pass',
          options: {
            emailRedirectTo: '/portal/apply/register',
            data: { full_name: 'Test User' },
          },
        });
      } finally {
        window.location = { origin: originalOrigin };
      }
    });
  });
});
