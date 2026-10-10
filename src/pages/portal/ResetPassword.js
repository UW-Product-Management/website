import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/portal/AuthLayout';
import { PortalField } from '../../components/portal/PortalField';
import { ArrowIcon } from '../../components/portal/PortalIcons';
import PortalToast from '../../components/portal/PortalToast';
import * as portalApi from '../../services/portalApi';
import '../../styles/portal/Portal.css';
import '../../styles/portal/PortalToast.css';

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
  const [showToast, setShowToast] = useState(false);
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
      setShowToast(true);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(getResetPasswordErrorMessage(err));
    }
  };

  return (
    <AuthLayout>
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
          <PortalField
            id="reset-email"
            label="Email address"
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
      <p className="portal-auth__switch">
        <Link to="/portal/login">
          Back to log in
          <ArrowIcon />
        </Link>
      </p>
      {showToast && (
        <PortalToast
          title="Your password has been reset!"
          message="Check your email for confirmation"
          hint="you can now log in with your new password"
          onDone={() => setShowToast(false)}
        />
      )}
    </AuthLayout>
  );
}
