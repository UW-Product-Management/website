import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
import ApplyActions from '../../components/portal/ApplyActions';
import { PortalCheckbox } from '../../components/portal/PortalField';
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

  const productExperience =
    application?.productExperience ||
    application?.answers?.productExperience ||
    state?.application?.answers?.productExperience ||
    '';

  const reviewRows = [
    { label: 'Full name', value: fullName || '—' },
    { label: 'Email address', value: email || '—' },
    { label: 'Program', value: program || '—' },
    { label: 'Year of study', value: yearOfStudy || '—' },
    { label: 'Dietary restrictions', value: dietaryRestrictions || 'None' },
    { label: 'Q1. What product or service...', value: productIdea || '—' },
    { label: 'Q2. What makes a great product team?', value: greatTeam || '—' },
    {
      label: 'Q3. One product you worked on...',
      value: productExperience || '—',
    },
  ];

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
    <>
      <h1>Review &amp; Submit</h1>
      <p>Please make sure all your information is correct before submitting.</p>
      {errorMessage && (
        <div className="portal-apply__error" role="alert">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <dl className="portal-apply__review">
          {reviewRows.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <PortalCheckbox
          id="confirm-accurate"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          required
        >
          I confirm that all information provided is accurate and complete.
        </PortalCheckbox>

        <ApplyActions
          onBack={() => navigate('/portal/apply/consent')}
          nextLabel="Submit"
          busyLabel="Submitting..."
          disabled={!confirmed}
          isBusy={isSubmitting}
        />
      </form>
    </>
  );
}
