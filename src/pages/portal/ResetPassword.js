import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PortalHeader from '../../components/portal/PortalHeader';
import ApplicationStepper from '../../components/portal/ApplicationStepper';
import * as portalApi from '../../services/portalApi';
import '../../styles/portal/Portal.css';

export function getResetPasswordErrorMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;

  const code = error.code || '';
  const message = error.message || '';

  if (code === 'over_email_send_rate_limit') {
    return (
      message ||
      'For security purposes, you can only request this after a short wait.'
    );
  }
  if (
    error.status === 429 ||
    /rate limit|throttle|too many requests/i.test(message)
  ) {
    return 'Too many requests. Please wait a moment before trying again.';
  }

  return message || 'Unable to request password reset. Please try again.';
}

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await portalApi.requestPasswordReset(email.trim());

      setIsSubmitting(false);

      if (error) {
        setErrorMessage(getResetPasswordErrorMessage(error));
        return;
      }

      setSent(true);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(getResetPasswordErrorMessage(err));
    }
  };

  return (
    <main className="portal-page portal-auth">
      <PortalHeader />
      <ApplicationStepper currentStep={1} />
      <section className="portal-auth__card">
        <h1>Reset your password</h1>
        <p>
          Enter your email address and we&apos;ll send you instructions to reset
          your password.
        </p>

        {errorMessage && (
          <div className="portal-auth__error" role="alert">
            {errorMessage}
          </div>
        )}

        {sent ? (
          <div className="portal-auth__confirmation">
            <p>
              Check your inbox for a link to reset your password sent to{' '}
              <strong>{email.trim()}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="reset-email">Email address</label>
            <input
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
            />

            <button
              type="submit"
              className="portal-button portal-button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending link...' : 'Send reset link'}
            </button>
          </form>
        )}
        <p>
          <Link to="/portal/login">Back to log in</Link>
        </p>
      </section>
    </main>
  );
}
