import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Signup from './Signup';
import * as portalApi from '../../services/portalApi';

jest.mock('../../services/portalApi');

function renderSignup() {
  return render(
    <MemoryRouter initialEntries={['/portal/signup']}>
      <Signup />
    </MemoryRouter>,
  );
}

function fillForm({
  fullName = 'Alex Chen',
  email = 'alex@example.com',
  password = 'secretPassword123',
} = {}) {
  fireEvent.change(screen.getByLabelText(/full name/i), {
    target: { value: fullName },
  });
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/^password/i), {
    target: { value: password },
  });
}

describe('Signup page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders signup form with full name, email, and password fields and submit button', () => {
    renderSignup();

    expect(
      screen.getByRole('heading', { name: /create your account/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign up/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute(
      'href',
      '/portal/login',
    );
  });

  it('submits form and calls portalApi.signUp with entered credentials', async () => {
    portalApi.signUp.mockResolvedValueOnce({
      data: { user: { id: 'usr-1' }, session: null },
      error: null,
    });

    renderSignup();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(portalApi.signUp).toHaveBeenCalledWith({
        fullName: 'Alex Chen',
        email: 'alex@example.com',
        password: 'secretPassword123',
      });
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /check your inbox/i }),
      ).toBeInTheDocument();
    });
  });

  it('renders "Check your inbox" confirmation state on successful signup', async () => {
    portalApi.signUp.mockResolvedValueOnce({
      data: { user: { id: 'usr-1' }, session: null },
      error: null,
    });

    renderSignup();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /check your inbox/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute(
      'href',
      '/portal/login',
    );
    expect(
      screen.queryByRole('heading', { name: /create your account/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
  });

  it('displays error banner when signUp returns weak_password error', async () => {
    portalApi.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: 'weak_password',
        message: 'Password should be at least 8 characters.',
      },
    });

    renderSignup();
    fillForm({ password: '123' });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Password should be at least 8 characters.',
    );
    expect(
      screen.getByRole('heading', { name: /create your account/i }),
    ).toBeInTheDocument();
  });

  it('displays default weak_password message when error code has no custom message', async () => {
    portalApi.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: 'weak_password',
      },
    });

    renderSignup();
    fillForm({ password: '123' });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Password should be at least 8 characters.',
    );
  });

  it('displays error banner when signUp returns rate limit throttling error', async () => {
    portalApi.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: 'over_email_send_rate_limit',
        message:
          'For security purposes, you can only request this after 60 seconds.',
      },
    });

    renderSignup();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'For security purposes, you can only request this after 60 seconds.',
    );
  });

  it('displays generic error banner when signUp fails with custom message', async () => {
    portalApi.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        message: 'Unable to connect to authentication server.',
      },
    });

    renderSignup();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Unable to connect to authentication server.',
    );
  });

  it('displays error banner when portalApi.signUp rejects with an unhandled exception', async () => {
    portalApi.signUp.mockRejectedValueOnce(
      new Error('Network connection failed'),
    );

    renderSignup();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Network connection failed');
  });

  it('disables form controls and displays loading text while submission is in flight', async () => {
    let resolveSignUp;
    portalApi.signUp.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSignUp = resolve;
        }),
    );

    renderSignup();
    fillForm();

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /signing up\.\.\./i }),
      ).toBeDisabled();
    });

    expect(screen.getByLabelText(/full name/i)).toBeDisabled();
    expect(screen.getByLabelText(/email address/i)).toBeDisabled();
    expect(screen.getByLabelText(/^password/i)).toBeDisabled();

    await act(async () => {
      resolveSignUp({ data: { user: null, session: null }, error: null });
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /check your inbox/i }),
      ).toBeInTheDocument();
    });
  });

  it('clears previous error banner on subsequent submission', async () => {
    portalApi.signUp.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'weak_password',
        message: 'Password should be at least 8 characters.',
      },
    });

    renderSignup();
    fillForm({ password: 'short' });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Password should be at least 8 characters.',
    );

    portalApi.signUp.mockResolvedValueOnce({
      data: { user: { id: 'usr-1' }, session: null },
      error: null,
    });

    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'validPassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /check your inbox/i }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /create your account/i }),
    ).not.toBeInTheDocument();
  });
});
