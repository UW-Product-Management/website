import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { PortalProvider, usePortal } from './PortalContext';
import { supabase } from '../lib/supabaseClient';

function TestConsumer() {
  const { session, user, status } = usePortal();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="session">
        {session ? session.user?.email : 'no-session'}
      </span>
      <span data-testid="user">{user ? user.id : 'no-user'}</span>
    </div>
  );
}

describe('PortalContext', () => {
  let unsubscribeMock;
  let authChangeCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    unsubscribeMock = jest.fn();
    authChangeCallback = null;

    supabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authChangeCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: unsubscribeMock,
          },
        },
      };
    });
  });

  it('throws an error when usePortal is rendered outside PortalProvider', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      'usePortal must be used within a PortalProvider',
    );

    consoleError.mockRestore();
  });

  it('initializes with loading status and resolves session via getSession', async () => {
    const mockSession = {
      user: { id: 'usr-1', email: 'applicant@example.com' },
    };
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    render(
      <PortalProvider>
        <TestConsumer />
      </PortalProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('loading');

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('session')).toHaveTextContent(
      'applicant@example.com',
    );
    expect(screen.getByTestId('user')).toHaveTextContent('usr-1');
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1);
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('handles getSession error gracefully by defaulting to null session', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error('Session fetch failed'),
    });

    render(
      <PortalProvider>
        <TestConsumer />
      </PortalProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('session')).toHaveTextContent('no-session');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
  });

  it('updates session and user when auth state changes', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    render(
      <PortalProvider>
        <TestConsumer />
      </PortalProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    const newSession = {
      user: { id: 'usr-2', email: 'updated@example.com' },
    };

    await act(async () => {
      authChangeCallback('SIGNED_IN', newSession);
    });

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent(
        'updated@example.com',
      );
    });
    expect(screen.getByTestId('user')).toHaveTextContent('usr-2');
  });

  it('unsubscribes from auth changes when unmounted', () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const { unmount } = render(
      <PortalProvider>
        <TestConsumer />
      </PortalProvider>,
    );

    unmount();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('does not read or write to window.localStorage', async () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    render(
      <PortalProvider>
        <TestConsumer />
      </PortalProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('updates profile state when updateProfile succeeds', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'usr-1' } } },
      error: null,
    });

    const mockProfileRow = {
      id: 'usr-1',
      full_name: 'Updated Name',
      created_at: '2026-10-01',
      updated_at: '2026-10-01',
    };

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest
        .fn()
        .mockResolvedValue({ data: mockProfileRow, error: null }),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: mockProfileRow, error: null }),
    });

    function Consumer() {
      const { profile, updateProfile } = usePortal();
      return (
        <div>
          <span data-testid="profile-name">{profile?.fullName || 'empty'}</span>
          <button
            onClick={() => updateProfile({ fullName: 'Updated Name' })}
            data-testid="btn"
          >
            Update
          </button>
        </div>
      );
    }

    render(
      <PortalProvider>
        <Consumer />
      </PortalProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('profile-name')).toHaveTextContent(
        'Updated Name',
      );
    });
  });

  it('updates application state when saveDraft succeeds', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'usr-1' } } },
      error: null,
    });

    const mockDraftRow = {
      id: 'app-1',
      user_id: 'usr-1',
      event_id: 'evt-1',
      program: 'Computer Science',
      year_of_study: '2nd year',
      status: 'draft',
      submitted_at: null,
    };

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockDraftRow, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'evt-1', slug: 'prodcon-local' },
        error: null,
      }),
    });

    function Consumer() {
      const { application, saveDraft, status } = usePortal();
      return (
        <div>
          <span data-testid="status">{status}</span>
          <span data-testid="program">{application?.program || 'none'}</span>
          <button
            onClick={() =>
              saveDraft({
                program: 'Computer Science',
                yearOfStudy: '2nd year',
              })
            }
            data-testid="btn-save"
          >
            Save
          </button>
        </div>
      );
    }

    render(
      <PortalProvider>
        <Consumer />
      </PortalProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    await act(async () => {
      screen.getByTestId('btn-save').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('program')).toHaveTextContent(
        'Computer Science',
      );
    });
  });

  it('updates application state and submittedAt when submitApplication succeeds', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'usr-1' } } },
      error: null,
    });

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'app-1',
          status: 'draft',
          submitted_at: null,
        },
        error: null,
      }),
    });

    supabase.rpc.mockResolvedValueOnce({
      data: {
        id: 'app-1',
        status: 'submitted',
        submitted_at: '2026-10-01T16:00:00Z',
      },
      error: null,
    });

    function Consumer() {
      const { application, submitApplication, status } = usePortal();
      return (
        <div>
          <span data-testid="status">{status}</span>
          <span data-testid="app-status">{application?.status || 'none'}</span>
          <button onClick={() => submitApplication()} data-testid="btn-submit">
            Submit
          </button>
        </div>
      );
    }

    render(
      <PortalProvider>
        <Consumer />
      </PortalProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    await act(async () => {
      screen.getByTestId('btn-submit').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('app-status')).toHaveTextContent('submitted');
    });
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'send-application-received',
    );
  });

  it('keeps the application submitted when the received email fails to send', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'usr-1' } } },
      error: null,
    });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'app-1', status: 'draft', submitted_at: null },
        error: null,
      }),
    });
    supabase.rpc.mockResolvedValueOnce({
      data: {
        id: 'app-1',
        status: 'submitted',
        submitted_at: '2026-10-01T16:00:00Z',
      },
      error: null,
    });
    supabase.functions.invoke.mockRejectedValueOnce(new Error('offline'));

    function Consumer() {
      const { application, submitApplication, status } = usePortal();
      return (
        <div>
          <span data-testid="status">{status}</span>
          <span data-testid="app-status">{application?.status || 'none'}</span>
          <button onClick={() => submitApplication()} data-testid="btn-submit">
            Submit
          </button>
        </div>
      );
    }

    render(
      <PortalProvider>
        <Consumer />
      </PortalProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    await act(async () => {
      screen.getByTestId('btn-submit').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('app-status')).toHaveTextContent('submitted');
    });
  });

  it('clears profile and application and signs out on logOut', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'usr-1' } } },
      error: null,
    });

    function Consumer() {
      const { profile, application, logOut, status } = usePortal();
      return (
        <div>
          <span data-testid="status">{status}</span>
          <span data-testid="profile">
            {profile ? 'has-profile' : 'no-profile'}
          </span>
          <span data-testid="app">{application ? 'has-app' : 'no-app'}</span>
          <button onClick={() => logOut()} data-testid="btn-logout">
            Log Out
          </button>
        </div>
      );
    }

    render(
      <PortalProvider>
        <Consumer />
      </PortalProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    await act(async () => {
      screen.getByTestId('btn-logout').click();
    });

    expect(screen.getByTestId('profile')).toHaveTextContent('no-profile');
    expect(screen.getByTestId('app')).toHaveTextContent('no-app');
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
