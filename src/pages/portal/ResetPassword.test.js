import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPassword, { getResetPasswordErrorMessage } from './ResetPassword';
import * as portalApi from '../../services/portalApi';

jest.mock('../../services/portalApi');

function renderResetPassword() {
  return render(
    <MemoryRouter initialEntries={['/portal/reset-password']}>
      <ResetPassword />
    </MemoryRouter>,
  );
}

function fillForm({ email = 'applicant@uwaterloo.ca' } = {}) {
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: email },
  });
}

describe('ResetPassword page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders reset password form, inputs, button, and navigation link', () => {
    renderResetPassword();

    expect(
      screen.getByRole('heading', { name: /reset your password/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /send reset link/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /back to log in/i }),
    ).toHaveAttribute('href', '/portal/login');
  });

  it('calls portalApi.requestPasswordReset with trimmed email', async () => {
    portalApi.requestPasswordReset.mockResolvedValueOnce({
      data: {},
      error: null,
    });

    renderResetPassword();
    fillForm({ email: '  student@uwaterloo.ca  ' });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(portalApi.requestPasswordReset).toHaveBeenCalledWith(
        'student@uwaterloo.ca',
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/check your inbox for a link to reset your password/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText('student@uwaterloo.ca')).toBeInTheDocument();
  });

  it('shows the success toast after the reset link is sent', async () => {
    portalApi.requestPasswordReset.mockResolvedValueOnce({
      data: {},
      error: null,
    });

    renderResetPassword();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent('Your password has been reset!');
    expect(toast).toHaveTextContent('Check your email for confirmation');
  });

  it('displays rate limit error message when API returns 429 status', async () => {
    portalApi.requestPasswordReset.mockResolvedValueOnce({
      data: null,
      error: {
        status: 429,
        message: 'Too many requests. Please wait a moment before trying again.',
      },
    });

    renderResetPassword();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Too many requests. Please wait a moment before trying again.',
        ),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays over_email_send_rate_limit error message', async () => {
    portalApi.requestPasswordReset.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'over_email_send_rate_limit',
        message:
          'For security purposes, you can only request this after a short wait.',
      },
    });

    renderResetPassword();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'For security purposes, you can only request this after a short wait.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('handles unexpected thrown exceptions during password reset request', async () => {
    portalApi.requestPasswordReset.mockRejectedValueOnce(
      new Error('Connection timed out'),
    );

    renderResetPassword();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText('Connection timed out')).toBeInTheDocument();
    });
  });

  it('disables input and submit button while request is in flight', async () => {
    let resolveApi;
    portalApi.requestPasswordReset.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveApi = resolve;
        }),
    );

    renderResetPassword();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(screen.getByLabelText(/email address/i)).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /sending link\.\.\./i }),
    ).toBeDisabled();

    resolveApi({ data: {}, error: null });

    await waitFor(() => {
      expect(
        screen.getByText(/check your inbox for a link to reset your password/i),
      ).toBeInTheDocument();
    });
  });

  describe('getResetPasswordErrorMessage helper', () => {
    it('returns empty string when error is falsy', () => {
      expect(getResetPasswordErrorMessage(null)).toBe('');
      expect(getResetPasswordErrorMessage(undefined)).toBe('');
    });

    it('returns error as string when string error is provided', () => {
      expect(getResetPasswordErrorMessage('Custom reset error')).toBe(
        'Custom reset error',
      );
    });

    it('returns over_email_send_rate_limit message with fallback', () => {
      expect(
        getResetPasswordErrorMessage({
          code: 'over_email_send_rate_limit',
          message: '',
        }),
      ).toBe(
        'For security purposes, you can only request this after a short wait.',
      );
    });

    it('returns rate limit message for 429 or rate limit text', () => {
      expect(
        getResetPasswordErrorMessage({
          status: 429,
          message: '',
        }),
      ).toBe('Too many requests. Please wait a moment before trying again.');
      expect(
        getResetPasswordErrorMessage({
          message: 'rate limit reached',
        }),
      ).toBe('Too many requests. Please wait a moment before trying again.');
    });

    it('returns message or fallback for generic error objects', () => {
      expect(
        getResetPasswordErrorMessage({
          message: 'Network issue',
        }),
      ).toBe('Network issue');
      expect(
        getResetPasswordErrorMessage({
          message: '',
        }),
      ).toBe('Unable to request password reset. Please try again.');
    });
  });
});
