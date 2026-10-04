import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import PortalHeader from '../../components/portal/PortalHeader';
import ApplicationStepper from '../../components/portal/ApplicationStepper';
import ApplySidebar from '../../components/portal/ApplySidebar';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
import '../../styles/portal/Portal.css';

export default function ApplySubmit() {
  const navigate = useNavigate();
  const { session, profile, application, state, submitApplication } =
    usePortal();
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isSubmitted = hasSubmitted(application) || Boolean(state?.submittedAt);

  if (isSubmitted) {
    return <Navigate to="/portal/dashboard" replace />;
  }

  const fullName = profile?.fullName || state?.account?.fullName || '';
  const email = session?.user?.email || state?.account?.email || '';
  const program = application?.program || state?.application?.program || '';
  const yearOfStudy =
    application?.yearOfStudy || state?.application?.yearOfStudy || '';
  const dietaryRestrictions =
    application?.dietaryRestrictions ||
    application?.dietaryRestriction ||
    application?.consent?.dietaryRestrictions ||
    state?.application?.consent?.dietaryRestrictions ||
    'None';
  const productIdea =
    application?.productIdea ||
    application?.answers?.productIdea ||
    state?.application?.answers?.productIdea ||
    '';
  const greatTeam =
    application?.greatTeam ||
    application?.answers?.greatTeam ||
    state?.application?.answers?.greatTeam ||
    '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!confirmed) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await submitApplication();
      if (result?.error) {
        setErrorMessage(
          result.error.message || 'Failed to submit application.',
        );
        setIsSubmitting(false);
        return;
      }
      navigate('/portal/apply/confirmation');
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="portal-page portal-apply">
      <PortalHeader />
      <ApplicationStepper currentStep={4} />
      <div className="portal-apply__body">
        <ApplySidebar currentStep={4} />
        <section className="portal-apply__content">
          <h1>Review &amp; Submit</h1>
          <p>
            Please make sure all your information is correct before submitting.
          </p>

          {errorMessage && (
            <div className="portal-apply__error" role="alert">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <dl className="portal-apply__review">
              <div>
                <dt>Full name</dt>
                <dd>{fullName || '—'}</dd>
              </div>
              <div>
                <dt>Email address</dt>
                <dd>{email || '—'}</dd>
              </div>
              <div>
                <dt>Program</dt>
                <dd>{program || '—'}</dd>
              </div>
              <div>
                <dt>Year of study</dt>
                <dd>{yearOfStudy || '—'}</dd>
              </div>
              <div>
                <dt>Dietary restrictions</dt>
                <dd>{dietaryRestrictions || 'None'}</dd>
              </div>
              <div>
                <dt>Q1. What product or service...</dt>
                <dd>{productIdea || '—'}</dd>
              </div>
              <div>
                <dt>Q2. What makes a great product team?</dt>
                <dd>{greatTeam || '—'}</dd>
              </div>
            </dl>

            <label
              htmlFor="confirm-accurate"
              className="portal-apply__checkbox-row"
            >
              <input
                id="confirm-accurate"
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                required
              />
              I confirm that all information provided is accurate and complete.
            </label>

            <div className="portal-apply__actions">
              <button
                type="button"
                className="portal-button portal-button--outline"
                onClick={() => navigate('/portal/apply/consent')}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!confirmed || isSubmitting}
                className="portal-button portal-button--primary"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
