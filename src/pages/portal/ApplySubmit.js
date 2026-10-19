import React, { useCallback, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
import ApplyActions from '../../components/portal/ApplyActions';
import EditAnswerDialog from '../../components/portal/EditAnswerDialog';
import { PortalCheckbox } from '../../components/portal/PortalField';
import { QUESTIONS } from '../../portal/applicationQuestions';
import zoomInIcon from '../../images/portal/zoom-in.svg';
import '../../styles/portal/Portal.css';

export default function ApplySubmit() {
  const navigate = useNavigate();
  const { session, profile, application, state, submitApplication, saveDraft } =
    usePortal();
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingField, setEditingField] = useState(null);
  const editTriggers = useRef({});
  const lastEditedField = useRef(null);

  const closeEditor = useCallback(() => {
    setEditingField(null);
    editTriggers.current[lastEditedField.current]?.focus();
  }, []);

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
  const answers = {
    productIdea:
      application?.productIdea ||
      application?.answers?.productIdea ||
      state?.application?.answers?.productIdea ||
      '',
    greatTeam:
      application?.greatTeam ||
      application?.answers?.greatTeam ||
      state?.application?.answers?.greatTeam ||
      '',
    productExperience:
      application?.productExperience ||
      application?.answers?.productExperience ||
      state?.application?.answers?.productExperience ||
      '',
  };

  const profileRows = [
    { label: 'Full Name', value: fullName || '—' },
    { label: 'Program', value: program || '—' },
    { label: 'Year of Study', value: yearOfStudy || '—' },
    { label: 'Dietary Restrictions', value: dietaryRestrictions || 'None' },
  ];

  const openEditor = (field) => {
    lastEditedField.current = field;
    setEditingField(field);
  };

  const saveAnswer = async (field, value) => {
    const result = await saveDraft({ [field]: value });
    if (result?.error) {
      return result.error.message || 'Failed to save your answer.';
    }
    closeEditor();
    return '';
  };

  const editingIndex = QUESTIONS.findIndex(
    ({ field }) => field === editingField,
  );

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
        <dl className="portal-review-summary">
          {profileRows.map(({ label, value }) => (
            <div key={label} className="portal-review-summary__item">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          <div className="portal-review-summary__item">
            <dt>Email Address</dt>
            <dd>{email || '—'}</dd>
          </div>
          {QUESTIONS.map(({ field, label }, index) => (
            <div key={field} className="portal-review-summary__item">
              <dt>
                <span className="portal-review-summary__label">{label}</span>
                <button
                  type="button"
                  ref={(node) => {
                    editTriggers.current[field] = node;
                  }}
                  className="portal-review-summary__edit"
                  aria-label={`Edit answer to question ${index + 1}`}
                  disabled={isSubmitting}
                  onClick={() => openEditor(field)}
                >
                  <img src={zoomInIcon} width="20" height="20" alt="" />
                </button>
              </dt>
              <dd className="portal-review-summary__answer">
                {answers[field] || '—'}
              </dd>
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

      {editingIndex !== -1 && (
        <EditAnswerDialog
          number={editingIndex + 1}
          question={QUESTIONS[editingIndex].label}
          initialValue={answers[editingField]}
          onSave={(value) => saveAnswer(editingField, value)}
          onClose={closeEditor}
        />
      )}
    </>
  );
}
