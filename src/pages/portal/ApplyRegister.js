import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
import { PROGRAMS, YEARS } from '../../portal/applicationOptions';
import PortalShell from '../../components/portal/PortalShell';
import ApplyActions from '../../components/portal/ApplyActions';
import { PortalField, PortalSelect } from '../../components/portal/PortalField';
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
      const profileResult = await updateProfile({ fullName: fullName.trim() });
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
    <PortalShell step={1}>
      <h1>Register</h1>
      <p>Let&apos;s get to know you!</p>
      {errorMessage && (
        <div className="portal-apply__error" role="alert">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <PortalField
          id="register-name"
          label="Full name"
          type="text"
          placeholder="e.g. Alex Chen"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          maxLength={120}
          required
        />
        <PortalField
          id="register-email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          readOnly
          disabled
          required
          className="portal-input--readonly"
        />
        <PortalSelect
          id="register-program"
          label="Program"
          placeholder="Select your program"
          options={PROGRAMS}
          value={program}
          onChange={(event) => setProgram(event.target.value)}
          required
        />
        <PortalSelect
          id="register-year"
          label="Year of study"
          placeholder="Select your year"
          options={YEARS}
          value={yearOfStudy}
          onChange={(event) => setYearOfStudy(event.target.value)}
          required
        />
        <ApplyActions isBusy={isSaving} />
      </form>
    </PortalShell>
  );
}
