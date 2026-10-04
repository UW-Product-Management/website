import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import PortalHeader from '../../components/portal/PortalHeader';
import ApplicationStepper from '../../components/portal/ApplicationStepper';
import ApplySidebar from '../../components/portal/ApplySidebar';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
import { PROGRAMS, YEARS } from '../../portal/applicationOptions';
import '../../styles/portal/Portal.css';

export default function ApplyRegister() {
  const navigate = useNavigate();
  const { session, profile, application, state, updateProfile, saveDraft } =
    usePortal();

  const isSubmitted = hasSubmitted(application) || Boolean(state?.submittedAt);

  const initialFullName = profile?.fullName || state?.account?.fullName || '';
  const email = session?.user?.email || state?.account?.email || '';
  const initialProgram =
    application?.program || state?.application?.program || '';
  const initialYear =
    application?.yearOfStudy || state?.application?.yearOfStudy || '';

  const [fullName, setFullName] = useState(initialFullName);
  const [program, setProgram] = useState(initialProgram);
  const [yearOfStudy, setYearOfStudy] = useState(initialYear);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialFullName) setFullName(initialFullName);
  }, [initialFullName]);

  useEffect(() => {
    if (initialProgram) setProgram(initialProgram);
  }, [initialProgram]);

  useEffect(() => {
    if (initialYear) setYearOfStudy(initialYear);
  }, [initialYear]);

  if (isSubmitted) {
    return <Navigate to="/portal/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage('');

    try {
      const profileResult = await updateProfile({ fullName });
      if (profileResult?.error) {
        setErrorMessage(
          profileResult.error.message || 'Failed to update profile.',
        );
        setIsSaving(false);
        return;
      }

      const draftResult = await saveDraft({
        program,
        yearOfStudy,
      });
      if (draftResult?.error) {
        setErrorMessage(
          draftResult.error.message || 'Failed to save application draft.',
        );
        setIsSaving(false);
        return;
      }

      navigate('/portal/apply/questions');
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="portal-page portal-apply">
      <PortalHeader />
      <ApplicationStepper currentStep={1} />
      <div className="portal-apply__body">
        <ApplySidebar currentStep={1} />
        <section className="portal-apply__content">
          <h1>Register</h1>
          <p>Let&apos;s get to know you!</p>

          {errorMessage && (
            <div className="portal-apply__error" role="alert">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label htmlFor="register-name">Full name *</label>
            <input
              id="register-name"
              type="text"
              placeholder="e.g. Alex Chen"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />

            <label htmlFor="register-email">Email address *</label>
            <input
              id="register-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              readOnly
              disabled
              className="portal-input--readonly"
            />

            <label htmlFor="register-program">Program *</label>
            <select
              id="register-program"
              value={program}
              onChange={(event) => setProgram(event.target.value)}
              required
            >
              <option value="">Select your program</option>
              {PROGRAMS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <label htmlFor="register-year">Year of study *</label>
            <select
              id="register-year"
              value={yearOfStudy}
              onChange={(event) => setYearOfStudy(event.target.value)}
              required
            >
              <option value="">Select your year</option>
              {YEARS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <div className="portal-apply__actions">
              <button
                type="submit"
                disabled={isSaving}
                className="portal-button portal-button--primary"
              >
                {isSaving ? 'Saving...' : 'Next'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
