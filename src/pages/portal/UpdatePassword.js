import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PortalHeader from '../../components/portal/PortalHeader';
import ApplicationStepper from '../../components/portal/ApplicationStepper';
import { PortalContext } from '../../context/PortalContext';
import * as portalApi from '../../services/portalApi';
import '../../styles/portal/Portal.css';

export function getUpdatePasswordErrorMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;

  const code = error.code || '';
  const message = error.message || '';

  if (code === 'weak_password') {
    return message || 'Password should be at least 8 characters.';
  }
  if (code === 'same_password') {
    return (
      message || 'New password should be different from your old password.'
    );
  }
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
  if (
    code === 'session_missing' ||
    /session missing|invalid token|expired/i.test(message)
  ) {
    return 'Your password reset session has expired or is invalid. Please request a new reset link.';
  }

  return message || 'Unable to update password. Please try again.';
}

export function resolvePostUpdateDestination(fromState, submittedAt) {
  if (fromState) {
    if (typeof fromState === 'string') {
      return fromState;
    }
    if (fromState.pathname) {
      return `${fromState.pathname}${fromState.search || ''}${
        fromState.hash || ''
      }`;
    }
  }
  return submittedAt ? '/portal/dashboard' : '/portal/apply/register';
}

export default function UpdatePassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const portal = useContext(PortalContext);
  const state = portal?.state;

  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await portalApi.updatePassword(password);

      setIsSubmitting(false);

      if (error) {
        setErrorMessage(getUpdatePasswordErrorMessage(error));
        return;
      }

      const destination = resolvePostUpdateDestination(
        location.state?.from,
        state?.submittedAt,
      );
      navigate(destination);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(getUpdatePasswordErrorMessage(err));
    }
  };

  return (
    <main className="portal-page portal-auth">
      <PortalHeader />
      <ApplicationStepper currentStep={1} />
      <section className="portal-auth__card">
        <h1>Set new password</h1>
        <p>Enter your new password to access your account.</p>

        {errorMessage && (
          <div className="portal-auth__error" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="update-password">New password</label>
          <input
            id="update-password"
            type="password"
            placeholder="Enter your new password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={isSubmitting}
          />

          <button
            type="submit"
            className="portal-button portal-button--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating password...' : 'Update password'}
          </button>
        </form>

        <p>
          <Link to="/portal/login">Back to log in</Link>
        </p>
      </section>
    </main>
  );
}
