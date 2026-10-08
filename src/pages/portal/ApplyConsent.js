import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
import { DIETARY_OPTIONS } from '../../portal/applicationOptions';
import ApplyActions from '../../components/portal/ApplyActions';
import {
  PortalCheckbox,
  PortalSelect,
  PortalTextarea,
} from '../../components/portal/PortalField';
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
    <>
      <h1>Consent &amp; Logistics</h1>
      <p>Please review and complete the following.</p>
      {errorMessage && (
        <div className="portal-apply__error" role="alert">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <h2>Media Consent</h2>
        <PortalCheckbox
          id="media-consent"
          checked={mediaConsent}
          onChange={(event) => setMediaConsent(event.target.checked)}
        >
          I grant UWPM permission to use photos, videos, and quotes from my
          participation in the event for promotional purposes.
        </PortalCheckbox>
        <PortalSelect
          id="dietary-restrictions"
          label="Dietary restrictions (optional)"
          placeholder="Select dietary restrictions"
          options={DIETARY_OPTIONS}
          value={dietaryRestrictions}
          onChange={(event) => setDietaryRestrictions(event.target.value)}
        />
        <PortalTextarea
          id="dietary-specify"
          label="Please specify (e.g. allergies, food preferences)"
          placeholder="Type here..."
          value={specify}
          onChange={(event) => setSpecify(event.target.value)}
          maxLength={500}
        />
        <ApplyActions
          isBusy={isSaving}
          onBack={() => navigate('/portal/apply/questions')}
        />
      </form>
    </>
  );
}
