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

    act(() => {
      authChangeCallback('SIGNED_IN', newSession);
    });

    expect(screen.getByTestId('session')).toHaveTextContent(
      'updated@example.com',
    );
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
});
