import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import UpdatePassword, {
  getUpdatePasswordErrorMessage,
  resolvePostUpdateDestination,
} from './UpdatePassword';
import { PortalContext } from '../../context/PortalContext';
import * as portalApi from '../../services/portalApi';

jest.mock('../../services/portalApi');

function renderUpdatePassword({
  initialEntries = ['/portal/update-password'],
  portalState = { submittedAt: null },
} = {}) {
  const contextValue = {
    state: portalState,
  };

  return render(
    <PortalContext.Provider value={contextValue}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/portal/update-password" element={<UpdatePassword />} />
          <Route
            path="/portal/apply/register"
            element={<div>Register Page Content</div>}
          />
          <Route
            path="/portal/dashboard"
            element={<div>Dashboard Page Content</div>}
          />
          <Route
            path="/portal/apply/consent"
            element={<div>Consent Page Content</div>}
          />
        </Routes>
      </MemoryRouter>
    </PortalContext.Provider>,
  );
}

function fillForm({ password = 'newSecurePassword123' } = {}) {
  fireEvent.change(screen.getByLabelText(/new password/i), {
    target: { value: password },
  });
}

describe('UpdatePassword page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form elements, heading, and back link', () => {
    renderUpdatePassword();

    expect(
      screen.getByRole('heading', { name: /set new password/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /update password/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /back to log in/i }),
    ).toHaveAttribute('href', '/portal/login');
  });

  it('calls portalApi.updatePassword with entered password', async () => {
    portalApi.updatePassword.mockResolvedValueOnce({
      data: { user: { id: 'usr-1' } },
      error: null,
    });

    renderUpdatePassword();
    fillForm({ password: 'myBrandNewPassword!' });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(portalApi.updatePassword).toHaveBeenCalledWith(
        'myBrandNewPassword!',
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Register Page Content')).toBeInTheDocument();
    });
  });

  it('navigates to /portal/apply/register on success when user has not submitted', async () => {
    portalApi.updatePassword.mockResolvedValueOnce({
      data: { user: { id: 'usr-1' } },
      error: null,
    });

    renderUpdatePassword({ portalState: { submittedAt: null } });
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText('Register Page Content')).toBeInTheDocument();
    });
  });

  it('navigates to /portal/dashboard on success when user has already submitted', async () => {
    portalApi.updatePassword.mockResolvedValueOnce({
      data: { user: { id: 'usr-1' } },
      error: null,
    });

    renderUpdatePassword({
      portalState: { submittedAt: '2026-10-01T12:00:00Z' },
    });
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText('Dashboard Page Content')).toBeInTheDocument();
    });
  });

  it('navigates to location.state.from route when provided', async () => {
    portalApi.updatePassword.mockResolvedValueOnce({
      data: { user: { id: 'usr-1' } },
      error: null,
    });

    renderUpdatePassword({
      initialEntries: [
        {
          pathname: '/portal/update-password',
          state: { from: '/portal/apply/consent' },
        },
      ],
    });
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText('Consent Page Content')).toBeInTheDocument();
    });
  });

  it('displays error banner when updatePassword returns weak_password error', async () => {
    portalApi.updatePassword.mockResolvedValueOnce({
      data: { user: null },
      error: {
        code: 'weak_password',
        message: 'Password should be at least 8 characters.',
      },
    });

    renderUpdatePassword();
    fillForm({ password: 'short' });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Password should be at least 8 characters.'),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays error banner when updatePassword returns same_password error', async () => {
    portalApi.updatePassword.mockResolvedValueOnce({
      data: { user: null },
      error: {
        code: 'same_password',
        message: 'New password should be different from old password',
      },
    });

    renderUpdatePassword();
    fillForm({ password: 'samePassword123' });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(
        screen.getByText('New password should be different from old password'),
      ).toBeInTheDocument();
    });
  });

  it('displays error banner when updatePassword returns rate limit error', async () => {
    portalApi.updatePassword.mockResolvedValueOnce({
      data: { user: null },
      error: {
        status: 429,
        message: 'Too many requests. Please wait a moment before trying again.',
      },
    });

    renderUpdatePassword();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Too many requests. Please wait a moment before trying again.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('displays error banner when session is missing or expired', async () => {
    portalApi.updatePassword.mockResolvedValueOnce({
      data: { user: null },
      error: {
        message: 'Auth session missing!',
      },
    });

    renderUpdatePassword();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Your password reset session has expired or is invalid. Please request a new reset link.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('handles unexpected exceptions thrown by updatePassword', async () => {
    portalApi.updatePassword.mockRejectedValueOnce(
      new Error('Network connection failed'),
    );

    renderUpdatePassword();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    });
  });

  it('disables input and submit button while submitting', async () => {
    let resolveApi;
    portalApi.updatePassword.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveApi = resolve;
        }),
    );

    renderUpdatePassword();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    expect(screen.getByLabelText(/new password/i)).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /updating password\.\.\./i }),
    ).toBeDisabled();

    resolveApi({
      data: { user: { id: 'usr-1' } },
      error: null,
    });

    await waitFor(() => {
      expect(screen.getByText('Register Page Content')).toBeInTheDocument();
    });
  });

  describe('getUpdatePasswordErrorMessage helper', () => {
    it('returns empty string when error is falsy', () => {
      expect(getUpdatePasswordErrorMessage(null)).toBe('');
      expect(getUpdatePasswordErrorMessage(undefined)).toBe('');
    });

    it('returns string unchanged when error is a string', () => {
      expect(getUpdatePasswordErrorMessage('Custom error message')).toBe(
        'Custom error message',
      );
    });

    it('handles weak_password code with fallback', () => {
      expect(
        getUpdatePasswordErrorMessage({
          code: 'weak_password',
          message: '',
        }),
      ).toBe('Password should be at least 8 characters.');
    });

    it('handles same_password code with fallback', () => {
      expect(
        getUpdatePasswordErrorMessage({
          code: 'same_password',
          message: '',
        }),
      ).toBe('New password should be different from your old password.');
    });

    it('handles over_email_send_rate_limit code with fallback', () => {
      expect(
        getUpdatePasswordErrorMessage({
          code: 'over_email_send_rate_limit',
          message: '',
        }),
      ).toBe(
        'For security purposes, you can only request this after a short wait.',
      );
    });

    it('handles status 429 and rate limit regex with fallback', () => {
      expect(
        getUpdatePasswordErrorMessage({
          status: 429,
          message: '',
        }),
      ).toBe('Too many requests. Please wait a moment before trying again.');
      expect(
        getUpdatePasswordErrorMessage({
          message: 'rate limit reached',
        }),
      ).toBe('Too many requests. Please wait a moment before trying again.');
    });

    it('handles session missing or invalid token with fallback', () => {
      expect(
        getUpdatePasswordErrorMessage({
          code: 'session_missing',
          message: '',
        }),
      ).toBe(
        'Your password reset session has expired or is invalid. Please request a new reset link.',
      );
      expect(
        getUpdatePasswordErrorMessage({
          message: 'Auth session missing!',
        }),
      ).toBe(
        'Your password reset session has expired or is invalid. Please request a new reset link.',
      );
    });

    it('returns message or fallback for generic errors', () => {
      expect(
        getUpdatePasswordErrorMessage({
          message: 'Something went wrong on the server',
        }),
      ).toBe('Something went wrong on the server');
      expect(
        getUpdatePasswordErrorMessage({
          message: '',
        }),
      ).toBe('Unable to update password. Please try again.');
    });
  });

  describe('resolvePostUpdateDestination helper', () => {
    it('returns string fromState directly', () => {
      expect(resolvePostUpdateDestination('/portal/apply/consent', null)).toBe(
        '/portal/apply/consent',
      );
    });

    it('formats object fromState into full path', () => {
      expect(
        resolvePostUpdateDestination(
          {
            pathname: '/portal/apply/questions',
            search: '?edit=true',
            hash: '#step2',
          },
          null,
        ),
      ).toBe('/portal/apply/questions?edit=true#step2');
    });

    it('returns /portal/dashboard when submittedAt is set', () => {
      expect(resolvePostUpdateDestination(null, '2026-10-01T12:00:00Z')).toBe(
        '/portal/dashboard',
      );
    });

    it('returns /portal/apply/register when submittedAt is null', () => {
      expect(resolvePostUpdateDestination(null, null)).toBe(
        '/portal/apply/register',
      );
    });
  });
});
