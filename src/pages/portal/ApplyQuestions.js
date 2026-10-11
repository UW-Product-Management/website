import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
import ApplyActions from '../../components/portal/ApplyActions';
import { PortalTextarea } from '../../components/portal/PortalField';
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

  const initialProductExperience =
    application?.productExperience ||
    application?.answers?.productExperience ||
    state?.application?.answers?.productExperience ||
    '';

  const [productIdea, setProductIdea] = useState(initialProductIdea);
  const [greatTeam, setGreatTeam] = useState(initialGreatTeam);
  const [productExperience, setProductExperience] = useState(
    initialProductExperience,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialProductIdea) setProductIdea(initialProductIdea);
  }, [initialProductIdea]);

  useEffect(() => {
    if (initialGreatTeam) setGreatTeam(initialGreatTeam);
  }, [initialGreatTeam]);

  useEffect(() => {
    if (initialProductExperience)
      setProductExperience(initialProductExperience);
  }, [initialProductExperience]);

  if (isSubmitted) {
    return <Navigate to="/portal/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage('');

    try {
      const result = await saveDraft({
        productIdea,
        greatTeam,
        productExperience,
      });
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
    <>
      <h1>Fun Questions</h1>
      <p>
        Show us your creativity! Answer the following questions (200 characters
        max each).
      </p>
      {errorMessage && (
        <div className="portal-apply__error" role="alert">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="portal-apply__scroll">
          <PortalTextarea
            id="question-product"
            label="1. What product or service do you wish existed, and why?"
            placeholder="Type your answer here..."
            maxLength={MAX_LENGTH}
            value={productIdea}
            onChange={(event) => setProductIdea(event.target.value)}
            counter={`${productIdea.length}/${MAX_LENGTH}`}
            required
          />
          <PortalTextarea
            id="question-team"
            label="2. What makes a great product team?"
            placeholder="Type your answer here..."
            maxLength={MAX_LENGTH}
            value={greatTeam}
            onChange={(event) => setGreatTeam(event.target.value)}
            counter={`${greatTeam.length}/${MAX_LENGTH}`}
            required
          />
          <PortalTextarea
            id="question-experience"
            label="3. What is one product you've worked on or contributed to, and what was your role?"
            placeholder="Type your answer here..."
            maxLength={MAX_LENGTH}
            value={productExperience}
            onChange={(event) => setProductExperience(event.target.value)}
            counter={`${productExperience.length}/${MAX_LENGTH}`}
            required
          />
        </div>
        <ApplyActions
          isBusy={isSaving}
          onBack={() => navigate('/portal/apply/register')}
        />
      </form>
    </>
  );
}
