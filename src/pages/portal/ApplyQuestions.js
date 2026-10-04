import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import PortalHeader from '../../components/portal/PortalHeader';
import ApplicationStepper from '../../components/portal/ApplicationStepper';
import ApplySidebar from '../../components/portal/ApplySidebar';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
import '../../styles/portal/Portal.css';

const MAX_LENGTH = 200;

export default function ApplyQuestions() {
  const navigate = useNavigate();
  const { application, state, saveDraft } = usePortal();

  const isSubmitted = hasSubmitted(application) || Boolean(state?.submittedAt);

  const initialProductIdea =
    application?.productIdea ||
    application?.answers?.productIdea ||
    state?.application?.answers?.productIdea ||
    '';
  const initialGreatTeam =
    application?.greatTeam ||
    application?.answers?.greatTeam ||
    state?.application?.answers?.greatTeam ||
    '';

  const [productIdea, setProductIdea] = useState(initialProductIdea);
  const [greatTeam, setGreatTeam] = useState(initialGreatTeam);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialProductIdea) setProductIdea(initialProductIdea);
  }, [initialProductIdea]);

  useEffect(() => {
    if (initialGreatTeam) setGreatTeam(initialGreatTeam);
  }, [initialGreatTeam]);

  if (isSubmitted) {
    return <Navigate to="/portal/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage('');

    try {
      const result = await saveDraft({ productIdea, greatTeam });
      if (result?.error) {
        setErrorMessage(
          result.error.message || 'Failed to save question responses.',
        );
        setIsSaving(false);
        return;
      }
      navigate('/portal/apply/consent');
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="portal-page portal-apply">
      <PortalHeader />
      <ApplicationStepper currentStep={2} />
      <div className="portal-apply__body">
        <ApplySidebar currentStep={2} />
        <section className="portal-apply__content">
          <h1>Fun Questions</h1>
          <p>
            Show us your creativity! Answer the following questions (200
            characters max each).
          </p>

          {errorMessage && (
            <div className="portal-apply__error" role="alert">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label htmlFor="question-product">
              1. What product or service do you wish existed, and why?
            </label>
            <textarea
              id="question-product"
              placeholder="Type your answer here..."
              maxLength={MAX_LENGTH}
              value={productIdea}
              onChange={(event) => setProductIdea(event.target.value)}
              required
            />
            <span className="portal-apply__char-count">
              {productIdea.length}/{MAX_LENGTH}
            </span>

            <label htmlFor="question-team">
              2. What makes a great product team?
            </label>
            <textarea
              id="question-team"
              placeholder="Type your answer here..."
              maxLength={MAX_LENGTH}
              value={greatTeam}
              onChange={(event) => setGreatTeam(event.target.value)}
              required
            />
            <span className="portal-apply__char-count">
              {greatTeam.length}/{MAX_LENGTH}
            </span>

            <div className="portal-apply__actions">
              <button
                type="button"
                className="portal-button portal-button--outline"
                onClick={() => navigate('/portal/apply/register')}
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
