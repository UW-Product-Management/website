import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login, {
  getLoginErrorMessage,
  resolvePostLoginDestination,
} from './Login';
import { PortalContext } from '../../context/PortalContext';
import * as portalApi from '../../services/portalApi';

jest.mock('../../services/portalApi');

function renderLogin({
  initialEntries = ['/portal/login'],
  portalState = { submittedAt: null },
} = {}) {
  const contextValue = {
    state: portalState,
  };

  return render(
    <PortalContext.Provider value={contextValue}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/portal/login" element={<Login />} />
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
          <Route
            path="/portal/apply/questions"
            element={<div>Questions Page Content</div>}
          />
        </Routes>
      </MemoryRouter>
    </PortalContext.Provider>,
  );
}

function fillLoginForm({
  email = 'alex@example.com',
  password = 'secretPassword123',
} = {}) {
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/^password/i), {
    target: { value: password },
  });
}

describe('Login page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form elements and links', () => {
    renderLogin();

    expect(
      screen.getByRole('heading', { name: /welcome back!/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /forgot your password\?/i }),
    ).toHaveAttribute('href', '/portal/reset-password');
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute(
      'href',
      '/portal/signup',
    );
  });

  it('calls portalApi.signIn with entered email and password', async () => {
    portalApi.signIn.mockResolvedValueOnce({
      data: { user: { id: 'usr-1' }, session: { access_token: 'tok' } },
      error: null,
    });

    renderLogin();
    fillLoginForm({
      email: '  applicant@uwaterloo.ca  ',
      password: 'mypassword',
    });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(portalApi.signIn).toHaveBeenCalledWith({
        email: 'applicant@uwaterloo.ca',
        password: 'mypassword',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Register Page Content')).toBeInTheDocument();
    });
  });

  it('navigates to /portal/apply/register on successful login when user has not submitted', async () => {
    portalApi.signIn.mockResolvedValueOnce({
      data: { user: { id: 'usr-1' }, session: { access_token: 'tok' } },
      error: null,
    });

    renderLogin({ portalState: { submittedAt: null } });
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText('Register Page Content')).toBeInTheDocument();
    });
  });

  it('navigates to /portal/dashboard on successful login when application has been submitted', async () => {
    portalApi.signIn.mockResolvedValueOnce({
      data: { user: { id: 'usr-1' }, session: { access_token: 'tok' } },
      error: null,
    });

    renderLogin({
      portalState: { submittedAt: '2026-10-01T14:00:00.000Z' },
    });
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText('Dashboard Page Content')).toBeInTheDocument();
    });
  });

  it('navigates to redirect target when location.state.from is an object', async () => {
    portalApi.signIn.mockResolvedValueOnce({
      data: { user: { id: 'usr-1' }, session: { access_token: 'tok' } },
      error: null,
    });

    renderLogin({
      initialEntries: [
        {
          pathname: '/portal/login',
          state: { from: { pathname: '/portal/apply/consent' } },
        },
      ],
      portalState: { submittedAt: null },
    });
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText('Consent Page Content')).toBeInTheDocument();
    });
  });

  it('navigates to redirect target when location.state.from is a string', async () => {
    portalApi.signIn.mockResolvedValueOnce({
      data: { user: { id: 'usr-1' }, session: { access_token: 'tok' } },
      error: null,
    });

    renderLogin({
      initialEntries: [
        {
          pathname: '/portal/login',
          state: { from: '/portal/apply/questions' },
        },
      ],
      portalState: { submittedAt: null },
    });
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText('Questions Page Content')).toBeInTheDocument();
    });
  });

  it('disables input controls and changes button text while login request is in flight', async () => {
    let resolveSignIn;
    portalApi.signIn.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        }),
    );

    renderLogin();
    fillLoginForm();

    const submitButton = screen.getByRole('button', { name: /log in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /logging in\.\.\./i }),
      ).toBeDisabled();
    });

    expect(screen.getByLabelText(/email address/i)).toBeDisabled();
    expect(screen.getByLabelText(/^password/i)).toBeDisabled();

    await act(async () => {
      resolveSignIn({
        data: { user: { id: 'usr-1' }, session: { access_token: 'tok' } },
        error: null,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Register Page Content')).toBeInTheDocument();
    });
  });

  it('displays invalid credential errors in an alert banner', async () => {
    portalApi.signIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: 'invalid_credentials',
        message: 'Invalid login credentials',
      },
    });

    renderLogin();
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Invalid login credentials');
  });

  it('displays default invalid credentials message when error message is omitted', async () => {
    portalApi.signIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: 'invalid_credentials',
      },
    });

    renderLogin();
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Invalid email or password. Please try again.',
    );
  });

  it('renders unconfirmed email message and resend confirmation button on email_not_confirmed', async () => {
    portalApi.signIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: 'email_not_confirmed',
        message: 'Email not confirmed',
      },
    });

    renderLogin();
    fillLoginForm({ email: 'unconfirmed@example.com' });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Your email address has not been confirmed yet.',
    );
    expect(
      screen.getByRole('button', { name: /resend confirmation/i }),
    ).toBeInTheDocument();
  });

  it('invokes portalApi.resendConfirmation and shows success feedback', async () => {
    portalApi.signIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: 'email_not_confirmed',
      },
    });
    portalApi.resendConfirmation.mockResolvedValueOnce({
      data: {},
      error: null,
    });

    renderLogin();
    fillLoginForm({ email: 'applicant@example.com' });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    const resendButton = await screen.findByRole('button', {
      name: /resend confirmation/i,
    });
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(portalApi.resendConfirmation).toHaveBeenCalledWith(
        'applicant@example.com',
      );
    });

    expect(
      await screen.findByText(/confirmation email sent!/i),
    ).toBeInTheDocument();
  });

  it('handles rate-limiting feedback when resending confirmation', async () => {
    portalApi.signIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: 'email_not_confirmed',
      },
    });
    portalApi.resendConfirmation.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'over_email_send_rate_limit',
        message:
          'For security purposes, you can only request this after 60 seconds.',
      },
    });

    renderLogin();
    fillLoginForm({ email: 'applicant@example.com' });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    const resendButton = await screen.findByRole('button', {
      name: /resend confirmation/i,
    });
    fireEvent.click(resendButton);

    const feedback = await screen.findByText(
      'For security purposes, you can only request this after 60 seconds.',
    );
    expect(feedback).toBeInTheDocument();
  });

  it('handles resend error when resendConfirmation rejects', async () => {
    portalApi.signIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: 'email_not_confirmed',
      },
    });
    portalApi.resendConfirmation.mockRejectedValueOnce(
      new Error('Failed to reach resend endpoint'),
    );

    renderLogin();
    fillLoginForm({ email: 'applicant@example.com' });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    const resendButton = await screen.findByRole('button', {
      name: /resend confirmation/i,
    });
    fireEvent.click(resendButton);

    expect(
      await screen.findByText('Failed to reach resend endpoint'),
    ).toBeInTheDocument();
  });

  it('displays error banner when signIn rejects with an unhandled network error', async () => {
    portalApi.signIn.mockRejectedValueOnce(new Error('Network error'));

    renderLogin();
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Network error');
  });

  it('clears previous errors when a new submission is initiated', async () => {
    portalApi.signIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: 'invalid_credentials',
        message: 'Invalid login credentials',
      },
    });

    renderLogin();
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid login credentials',
    );

    portalApi.signIn.mockResolvedValueOnce({
      data: { user: { id: 'usr-1' }, session: { access_token: 'tok' } },
      error: null,
    });

    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'correctPassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText('Register Page Content')).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  describe('utility helpers', () => {
    it('returns empty string when error is null or undefined', () => {
      expect(getLoginErrorMessage(null)).toBe('');
      expect(getLoginErrorMessage(undefined)).toBe('');
    });

    it('returns string error directly', () => {
      expect(getLoginErrorMessage('Direct error message')).toBe(
        'Direct error message',
      );
    });

    it('maps 429 status and rate limit message to friendly warning', () => {
      expect(getLoginErrorMessage({ status: 429 })).toBe(
        'Too many requests. Please wait a moment before trying again.',
      );
      expect(
        getLoginErrorMessage({
          code: 'over_email_send_rate_limit',
          message: 'Rate limit hit',
        }),
      ).toBe('Rate limit hit');
    });

    it('resolves destinations correctly with search and hash params', () => {
      expect(
        resolvePostLoginDestination(
          {
            pathname: '/portal/apply/register',
            search: '?source=web',
            hash: '#step',
          },
          null,
        ),
      ).toBe('/portal/apply/register?source=web#step');
      expect(resolvePostLoginDestination(null, '2026-10-01')).toBe(
        '/portal/dashboard',
      );
      expect(resolvePostLoginDestination(null, null)).toBe(
        '/portal/apply/register',
      );
    });
  });
});
