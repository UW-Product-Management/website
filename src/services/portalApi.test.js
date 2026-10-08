import { supabase } from '../lib/supabaseClient';
import {
  signUp,
  signIn,
  signOut,
  resendConfirmation,
  requestPasswordReset,
  updatePassword,
  getEvent,
  getProfile,
  updateProfile,
  getMyApplication,
  saveApplicationDraft,
  submitApplication,
  mapProfileFromRow,
  mapApplicationFromRow,
  mapApplicationFormToRow,
  SUBMISSION_ERRORS,
  DRAFT_ERRORS,
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

describe('portalApi row & form mappings', () => {
  it('maps profile row to camelCase shape', () => {
    expect(mapProfileFromRow(null)).toBeNull();

    const row = {
      id: 'prof-1',
      full_name: 'Alex Chen',
      email: 'alex@example.com',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T01:00:00Z',
    };
    expect(mapProfileFromRow(row)).toEqual({
      id: 'prof-1',
      fullName: 'Alex Chen',
      email: 'alex@example.com',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T01:00:00Z',
    });
  });

  it('maps application row to camelCase and nested wireframe shape', () => {
    expect(mapApplicationFromRow(null)).toBeNull();

    const row = {
      id: 'app-1',
      user_id: 'usr-1',
      event_id: 'evt-1',
      program: 'Computer Science',
      year_of_study: '2nd year',
      product_idea: 'Campus tracker',
      great_team: 'High trust',
      media_consent: true,
      dietary_restriction: 'Vegetarian',
      dietary_details: 'No peanuts',
      status: 'submitted',
      submitted_at: '2026-10-01T12:00:00Z',
      created_at: '2026-10-01T10:00:00Z',
      updated_at: '2026-10-01T12:00:00Z',
    };

    const mapped = mapApplicationFromRow(row);
    expect(mapped.id).toBe('app-1');
    expect(mapped.userId).toBe('usr-1');
    expect(mapped.eventId).toBe('evt-1');
    expect(mapped.program).toBe('Computer Science');
    expect(mapped.yearOfStudy).toBe('2nd year');
    expect(mapped.productIdea).toBe('Campus tracker');
    expect(mapped.greatTeam).toBe('High trust');
    expect(mapped.mediaConsent).toBe(true);
    expect(mapped.dietaryRestriction).toBe('Vegetarian');
    expect(mapped.dietaryRestrictions).toBe('Vegetarian');
    expect(mapped.dietaryDetails).toBe('No peanuts');
    expect(mapped.specify).toBe('No peanuts');
    expect(mapped.status).toBe('submitted');
    expect(mapped.submittedAt).toBe('2026-10-01T12:00:00Z');
    expect(mapped.answers).toEqual({
      productIdea: 'Campus tracker',
      greatTeam: 'High trust',
    });
    expect(mapped.consent).toEqual({
      mediaConsent: true,
      dietaryRestrictions: 'Vegetarian',
      specify: 'No peanuts',
    });
  });

  it('converts empty select options to null and preserves real answers', () => {
    const fields = {
      program: '',
      yearOfStudy: '',
      dietaryRestrictions: '',
      dietaryDetails: '',
      productIdea: 'Idea',
      greatTeam: 'Team',
      mediaConsent: true,
    };

    const row = mapApplicationFormToRow(fields);
    expect(row.program).toBeNull();
    expect(row.year_of_study).toBeNull();
    expect(row.dietary_restriction).toBeNull();
    expect(row.dietary_details).toBeNull();
    expect(row.product_idea).toBe('Idea');
    expect(row.great_team).toBe('Team');
    expect(row.media_consent).toBe(true);
  });

  it('preserves None as a valid dietary restriction value', () => {
    const fields = {
      dietaryRestrictions: 'None',
    };
    const row = mapApplicationFormToRow(fields);
    expect(row.dietary_restriction).toBe('None');
  });

  it('maps nested form fields from answers and consent objects', () => {
    const fields = {
      answers: {
        productIdea: 'Nested idea',
        greatTeam: 'Nested team',
      },
      consent: {
        mediaConsent: false,
        dietaryRestrictions: 'Vegan',
        specify: 'Soy allergy',
      },
    };

    const row = mapApplicationFormToRow(fields);
    expect(row.product_idea).toBe('Nested idea');
    expect(row.great_team).toBe('Nested team');
    expect(row.media_consent).toBe(false);
    expect(row.dietary_restriction).toBe('Vegan');
    expect(row.dietary_details).toBe('Soy allergy');
  });

  it('only populates provided fields in row payload', () => {
    const row = mapApplicationFormToRow({ productIdea: 'Solo idea' });
    expect(row).toEqual({ product_idea: 'Solo idea' });
    expect('program' in row).toBe(false);
    expect('year_of_study' in row).toBe(false);
  });
});

describe('portalApi application service', () => {
  let mockChain;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    supabase.from.mockReturnValue(mockChain);
  });

  describe('getEvent', () => {
    it('queries events table by slug', async () => {
      const mockEvent = {
        id: 'evt-1',
        slug: 'prodcon-local',
        name: 'ProdCon (local)',
      };
      mockChain.maybeSingle.mockResolvedValueOnce({
        data: mockEvent,
        error: null,
      });

      const result = await getEvent('prodcon-local');
      expect(supabase.from).toHaveBeenCalledWith('events');
      expect(mockChain.select).toHaveBeenCalledWith(
        'id, slug, name, applications_open_at, applications_close_at',
      );
      expect(mockChain.eq).toHaveBeenCalledWith('slug', 'prodcon-local');
      expect(result).toEqual({ data: mockEvent, error: null });
    });
  });

  describe('getProfile', () => {
    beforeEach(() => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
      });
    });

    it('scopes the query to the signed-in user so organizers get their own row', async () => {
      await getProfile();
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'user-1');
    });

    it('returns no profile without querying when signed out', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await getProfile();
      expect(result).toEqual({ data: null, error: null });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('queries profiles table and maps row to camelCase', async () => {
      mockChain.maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'user-1',
          full_name: 'Alex Chen',
          email: 'alex@example.com',
          created_at: '2026-10-01',
          updated_at: '2026-10-01',
        },
        error: null,
      });

      const result = await getProfile();
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(result.data).toEqual({
        id: 'user-1',
        fullName: 'Alex Chen',
        email: 'alex@example.com',
        createdAt: '2026-10-01',
        updatedAt: '2026-10-01',
      });
      expect(result.error).toBeNull();
    });

    it('returns error when getProfile query fails', async () => {
      const dbError = { message: 'Database error' };
      mockChain.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: dbError,
      });

      const result = await getProfile();
      expect(result.error).toEqual(dbError);
      expect(result.data).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('updates full_name for authenticated user', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'usr-123' } } },
      });
      mockChain.single.mockResolvedValueOnce({
        data: {
          id: 'usr-123',
          full_name: 'Updated Name',
          created_at: '2026-10-01',
          updated_at: '2026-10-01',
        },
        error: null,
      });

      const result = await updateProfile({ fullName: 'Updated Name' });
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockChain.update).toHaveBeenCalledWith({
        full_name: 'Updated Name',
      });
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'usr-123');
      expect(result.data.fullName).toBe('Updated Name');
    });

    it('falls back to auth.getUser if session has no user id', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
      });
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'usr-fallback' } },
        error: null,
      });
      mockChain.single.mockResolvedValueOnce({
        data: {
          id: 'usr-fallback',
          full_name: 'Fallback Name',
        },
        error: null,
      });

      const result = await updateProfile({ fullName: 'Fallback Name' });
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'usr-fallback');
      expect(result.data.fullName).toBe('Fallback Name');
    });

    it('returns error when update fails', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'usr-123' } } },
      });
      const dbError = { message: 'Update failed' };
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: dbError,
      });

      const result = await updateProfile({ fullName: 'Broken Name' });
      expect(result.error).toEqual(dbError);
      expect(result.data).toBeNull();
    });
  });

  describe('getMyApplication', () => {
    beforeEach(() => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'usr-1' } } },
      });
    });

    it('scopes the query to the signed-in user so organizers get their own row', async () => {
      await getMyApplication('evt-1');
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'usr-1');
    });

    it('returns no application without querying when signed out', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await getMyApplication('evt-1');
      expect(result).toEqual({ data: null, error: null });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('fetches application matching eventId and maps row', async () => {
      mockChain.maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'app-99',
          event_id: 'evt-1',
          user_id: 'usr-1',
          program: 'Business',
          year_of_study: '1st year',
          status: 'draft',
        },
        error: null,
      });

      const result = await getMyApplication('evt-1');
      expect(supabase.from).toHaveBeenCalledWith('applications');
      expect(mockChain.eq).toHaveBeenCalledWith('event_id', 'evt-1');
      expect(result.data.id).toBe('app-99');
      expect(result.data.program).toBe('Business');
      expect(result.data.yearOfStudy).toBe('1st year');
    });

    it('fetches application without eventId filter if not provided', async () => {
      mockChain.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await getMyApplication();
      expect(mockChain.eq).not.toHaveBeenCalledWith(
        'event_id',
        expect.anything(),
      );
      expect(result.data).toBeNull();
    });
  });

  describe('saveApplicationDraft', () => {
    it('explains a closed or not-yet-open window when the insert violates RLS', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: {
          code: '42501',
          message:
            'new row violates row-level security policy for table "applications"',
        },
      });

      const result = await saveApplicationDraft({
        eventId: 'evt-1',
        fields: { program: 'Business' },
      });
      expect(result.error.message).toBe(DRAFT_ERRORS.closed);
      expect(result.error.code).toBe('42501');
    });

    it('explains a locked application when the update matches no rows', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'Cannot coerce the result to a single JSON object',
        },
      });

      const result = await saveApplicationDraft({
        applicationId: 'app-1',
        fields: { program: 'Business' },
      });
      expect(result.error.message).toBe(DRAFT_ERRORS.locked);
    });

    it('inserts a new draft application when applicationId is not provided', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: {
          id: 'new-app-1',
          event_id: 'evt-1',
          program: 'Mathematics',
          year_of_study: '3rd year',
          status: 'draft',
        },
        error: null,
      });

      const result = await saveApplicationDraft({
        applicationId: null,
        eventId: 'evt-1',
        fields: {
          program: 'Mathematics',
          yearOfStudy: '3rd year',
        },
      });

      expect(supabase.from).toHaveBeenCalledWith('applications');
      expect(mockChain.insert).toHaveBeenCalledWith({
        event_id: 'evt-1',
        program: 'Mathematics',
        year_of_study: '3rd year',
      });
      expect(mockChain.update).not.toHaveBeenCalled();
      expect(result.data.id).toBe('new-app-1');
      expect(result.data.program).toBe('Mathematics');
    });

    it('updates an existing application when applicationId is provided', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: {
          id: 'existing-app-1',
          product_idea: 'New idea',
          great_team: 'Great synergy',
          status: 'draft',
        },
        error: null,
      });

      const result = await saveApplicationDraft({
        applicationId: 'existing-app-1',
        eventId: 'evt-1',
        fields: {
          productIdea: 'New idea',
          greatTeam: 'Great synergy',
        },
      });

      expect(mockChain.update).toHaveBeenCalledWith({
        product_idea: 'New idea',
        great_team: 'Great synergy',
      });
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'existing-app-1');
      expect(mockChain.insert).not.toHaveBeenCalled();
      expect(result.data.productIdea).toBe('New idea');
    });

    it('returns error when insert fails', async () => {
      const insertError = { code: '23505', message: 'Unique violation' };
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: insertError,
      });

      const result = await saveApplicationDraft({
        applicationId: null,
        eventId: 'evt-1',
        fields: { program: 'Engineering' },
      });

      expect(result.error).toEqual(insertError);
      expect(result.data).toBeNull();
    });
  });

  describe('submitApplication', () => {
    it('calls submit_application RPC and returns mapped row', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: {
          id: 'app-1',
          status: 'submitted',
          submitted_at: '2026-10-01T15:00:00Z',
        },
        error: null,
      });

      const result = await submitApplication('app-1');
      expect(supabase.rpc).toHaveBeenCalledWith('submit_application', {
        target_application_id: 'app-1',
      });
      expect(result.data.status).toBe('submitted');
      expect(result.data.submittedAt).toBe('2026-10-01T15:00:00Z');
      expect(result.error).toBeNull();
    });

    it.each([
      ['application_incomplete', SUBMISSION_ERRORS.application_incomplete],
      [
        'application_already_submitted',
        SUBMISSION_ERRORS.application_already_submitted,
      ],
      ['applications_closed', SUBMISSION_ERRORS.applications_closed],
      ['application_not_found', SUBMISSION_ERRORS.application_not_found],
    ])('maps RPC error %s to user-friendly copy', async (code, message) => {
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: code },
      });

      const result = await submitApplication('app-1');
      expect(result.error.code).toBe(code);
      expect(result.error.message).toBe(message);
      expect(result.data).toBeNull();
    });

    it('falls back to raw error message for unmapped errors', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'unexpected_db_outage' },
      });

      const result = await submitApplication('app-1');
      expect(result.error.message).toBe('unexpected_db_outage');
    });
  });
});
