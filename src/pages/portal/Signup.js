import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PortalHeader from '../../components/portal/PortalHeader';
import ApplicationStepper from '../../components/portal/ApplicationStepper';
import * as portalApi from '../../services/portalApi';
import '../../styles/portal/Portal.css';

export function getAuthErrorMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;

  const code = error.code || '';
  const message = error.message || '';

  if (code === 'weak_password') {
    return message || 'Password should be at least 8 characters.';
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

  return message || 'Unable to create account. Please try again.';
}

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await portalApi.signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });

      setIsSubmitting(false);
      if (error) {
        setErrorMessage(getAuthErrorMessage(error));
      } else {
        setErrorMessage(null);
        setIsSuccess(true);
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(getAuthErrorMessage(err));
    }
  };

  return (
    <main className="portal-page portal-auth">
      <PortalHeader />
      <ApplicationStepper currentStep={1} />
      <section className="portal-auth__card">
        {isSuccess ? (
          <div className="portal-auth__confirmation">
            <h1>Check your inbox</h1>
            <p>
              We&apos;ve sent a confirmation link to{' '}
              <strong>{email.trim()}</strong>. Please check your inbox and click
              the link to confirm your account and continue your application.
            </p>
            <p>
              Already confirmed? <Link to="/portal/login">Log in</Link>
            </p>
          </div>
        ) : (
          <>
            <h1>Create your account</h1>
            <p>Get started with your email and password.</p>
            {errorMessage && (
              <div className="portal-auth__error" role="alert">
                {errorMessage}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <label htmlFor="signup-name">Full name</label>
              <input
                id="signup-name"
                type="text"
                placeholder="e.g. Alex Chen"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                maxLength={120}
                required
                disabled={isSubmitting}
              />

              <label htmlFor="signup-email">Email address</label>
              <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={isSubmitting}
              />

              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                placeholder="Create a password"
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
                {isSubmitting ? 'Signing up...' : 'Sign up'}
              </button>
            </form>
            <p>
              Already have an account? <Link to="/portal/login">Log in</Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
