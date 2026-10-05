import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import PortalHeader from '../../components/portal/PortalHeader';
import ApplicationStepper from '../../components/portal/ApplicationStepper';
import ApplySidebar from '../../components/portal/ApplySidebar';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
import { DIETARY_OPTIONS } from '../../portal/applicationOptions';
import '../../styles/portal/Portal.css';

export default function ApplyConsent() {
  const navigate = useNavigate();
  const { application, state, saveDraft } = usePortal();

  const isSubmitted = hasSubmitted(application) || Boolean(state?.submittedAt);

  const initialMediaConsent =
    application?.mediaConsent ??
    application?.consent?.mediaConsent ??
    state?.application?.consent?.mediaConsent ??
    false;
  const initialDietaryRestrictions =
    application?.dietaryRestrictions ||
    application?.dietaryRestriction ||
    application?.consent?.dietaryRestrictions ||
    state?.application?.consent?.dietaryRestrictions ||
    '';
  const initialSpecify =
    application?.specify ||
    application?.dietaryDetails ||
    application?.consent?.specify ||
    state?.application?.consent?.specify ||
    '';

  const [mediaConsent, setMediaConsent] = useState(initialMediaConsent);
  const [dietaryRestrictions, setDietaryRestrictions] = useState(
    initialDietaryRestrictions,
  );
  const [specify, setSpecify] = useState(initialSpecify);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialMediaConsent !== undefined) setMediaConsent(initialMediaConsent);
  }, [initialMediaConsent]);

  useEffect(() => {
    if (initialDietaryRestrictions)
      setDietaryRestrictions(initialDietaryRestrictions);
  }, [initialDietaryRestrictions]);

  useEffect(() => {
    if (initialSpecify) setSpecify(initialSpecify);
  }, [initialSpecify]);

  if (isSubmitted) {
    return <Navigate to="/portal/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage('');

    try {
      const result = await saveDraft({
        mediaConsent,
        dietaryRestrictions,
        specify,
      });
      if (result?.error) {
        setErrorMessage(
          result.error.message || 'Failed to save consent and logistics.',
        );
        setIsSaving(false);
        return;
      }
      navigate('/portal/apply/submit');
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="portal-page portal-apply">
      <PortalHeader />
      <ApplicationStepper currentStep={3} />
      <div className="portal-apply__body">
        <ApplySidebar currentStep={3} />
        <section className="portal-apply__content">
          <h1>Consent &amp; Logistics</h1>
          <p>Please review and complete the following.</p>

          {errorMessage && (
            <div className="portal-apply__error" role="alert">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <h2>Media Consent</h2>
            <label
              htmlFor="media-consent"
              className="portal-apply__checkbox-row"
            >
              <input
                id="media-consent"
                type="checkbox"
                checked={mediaConsent}
                onChange={(event) => setMediaConsent(event.target.checked)}
              />
              I grant UWPM permission to use photos, videos, and quotes from my
              participation in the event for promotional purposes.
            </label>

            <label htmlFor="dietary-restrictions">
              Dietary restrictions (optional)
            </label>
            <select
              id="dietary-restrictions"
              value={dietaryRestrictions}
              onChange={(event) => setDietaryRestrictions(event.target.value)}
            >
              <option value="">Select dietary restrictions</option>
              {DIETARY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <label htmlFor="dietary-specify">
              Please specify (e.g. allergies, food preferences)
            </label>
            <textarea
              id="dietary-specify"
              placeholder="Type here..."
              value={specify}
              onChange={(event) => setSpecify(event.target.value)}
              maxLength={500}
            />

            <div className="portal-apply__actions">
              <button
                type="button"
                className="portal-button portal-button--outline"
                onClick={() => navigate('/portal/apply/questions')}
              >
                Back
              </button>
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
