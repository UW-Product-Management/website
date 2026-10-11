import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
import PortalShell from '../../components/portal/PortalShell';
import PortalSummary from '../../components/portal/PortalSummary';
import PortalDetailRows from '../../components/portal/PortalDetailRows';
import { PortalField } from '../../components/portal/PortalField';
import { DASHBOARD_MASCOTS } from '../../data/portalContent';
import '../../styles/portal/Portal.css';
import '../../styles/portal/PortalProfile.css';

const formatSubmittedOn = (submittedAt) =>
  new Date(submittedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function Profile() {
  const { session, profile, application, state, updateProfile } = usePortal();
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const submittedAt = application?.submittedAt || state?.submittedAt;
  const isSubmitted = Boolean(submittedAt) || hasSubmitted(application);
  const fullName = profile?.fullName || state?.account?.fullName || '';
  const email = session?.user?.email || state?.account?.email || '';
  const program = application?.program || state?.application?.program || '';
  const yearOfStudy =
    application?.yearOfStudy || state?.application?.yearOfStudy || '';
  const submittedOn = submittedAt ? formatSubmittedOn(submittedAt) : '—';
  const { profile: avatar } = DASHBOARD_MASCOTS;

  const startEditing = () => {
    setDraftName(fullName);
    setError('');
    setIsEditing(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    const { error: saveError } = await updateProfile({
      fullName: draftName.trim(),
    });
    setIsSaving(false);
    if (saveError) {
      setError('We could not save your name. Please try again.');
      return;
    }
    setIsEditing(false);
  };

  const personalRows = [
    { label: 'Name', value: fullName || '—' },
    { label: 'Email', value: email || '—' },
    { label: 'Program', value: program || '—' },
    { label: 'Year of Study', value: yearOfStudy || '—' },
    { label: 'Submitted on', value: submittedOn },
  ];

  return (
    <PortalShell variant="dashboard" showBadge={false}>
      <div className="portal-profile__heading">
        <h1>My Profile</h1>
        {!isEditing && (
          <button
            type="button"
            className="portal-button portal-profile__edit"
            onClick={startEditing}
          >
            Edit profile
          </button>
        )}
      </div>

      <div className="portal-dashboard__card portal-profile__card">
        <PortalSummary mascot={avatar}>
          {isEditing ? (
            <form className="portal-profile__form" onSubmit={handleSave}>
              <PortalField
                id="profile-full-name"
                label="Full name"
                required
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
              />
              {error && (
                <p className="portal-profile__error" role="alert">
                  {error}
                </p>
              )}
              <div className="portal-profile__form-actions">
                <button
                  type="submit"
                  className="portal-button portal-button--primary"
                  disabled={isSaving || !draftName.trim()}
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  className="portal-button portal-button--outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="portal-dashboard__headline">{fullName || '—'}</p>
              <p>{email}</p>
            </>
          )}
          <span
            className={`portal-profile__status${
              isSubmitted ? '' : ' portal-profile__status--pending'
            }`}
          >
            {isSubmitted ? 'Application submitted!' : 'Application in progress'}
          </span>
        </PortalSummary>

        <section>
          <h2>Personal Information</h2>
          <PortalDetailRows rows={personalRows} />
        </section>

        {isSubmitted && (
          <>
            <section className="portal-profile__overview">
              <h2>Application Overview</h2>
              <PortalDetailRows
                rows={[{ label: 'Submitted on', value: submittedOn }]}
              />
            </section>

            <Link
              to="/portal/dashboard/details"
              className="portal-button portal-button--outline-coral"
            >
              View application details
            </Link>
          </>
        )}
      </div>
    </PortalShell>
  );
}
