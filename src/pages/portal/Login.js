import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PortalHeader from '../../components/portal/PortalHeader';
import ApplicationStepper from '../../components/portal/ApplicationStepper';
import UnconfirmedEmailNotice from '../../components/portal/UnconfirmedEmailNotice';
import { PortalContext } from '../../context/PortalContext';
import * as portalApi from '../../services/portalApi';
import '../../styles/portal/Portal.css';

export function getLoginErrorMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;

  const code = error.code || '';
  const message = error.message || '';

  if (code === 'invalid_credentials') {
    return message || 'Invalid email or password. Please try again.';
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
    return (
      message || 'Too many requests. Please wait a moment before trying again.'
    );
  }

  return message || 'Unable to log in. Please try again.';
}

export function resolvePostLoginDestination(fromState, submittedAt) {
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

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const portal = useContext(PortalContext);
  const state = portal?.state;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setIsUnconfirmed(false);

    try {
      const { error } = await portalApi.signIn({
        email: email.trim(),
        password,
      });

      setIsSubmitting(false);

      if (error) {
        if (error.code === 'email_not_confirmed') {
          setIsUnconfirmed(true);
        } else {
          setErrorMessage(getLoginErrorMessage(error));
        }
        return;
      }

      portal?.refreshPortalData?.();

      const destination = resolvePostLoginDestination(
        location.state?.from,
        state?.submittedAt || portal?.application?.submittedAt,
      );
      navigate(destination);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(getLoginErrorMessage(err));
    }
  };

  return (
    <main className="portal-page portal-auth">
      <PortalHeader />
      <ApplicationStepper currentStep={1} />
      <section className="portal-auth__card">
        <h1>Welcome back!</h1>
        <p>Log in to continue your ProdCon application.</p>

        {isUnconfirmed ? (
          <UnconfirmedEmailNotice email={email} />
        ) : errorMessage ? (
          <div className="portal-auth__error" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isSubmitting}
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="Enter your password"
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
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <p>
          <Link to="/portal/reset-password">Forgot your password?</Link>
        </p>
        <p>
          Don&apos;t have an account? <Link to="/portal/signup">Sign up</Link>
        </p>
      </section>
    </main>
  );
}
