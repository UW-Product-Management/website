import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
import ApplyActions from '../../components/portal/ApplyActions';
import { PortalTextarea } from '../../components/portal/PortalField';
import {
  MAX_WORDS,
  QUESTIONS,
  countWords,
} from '../../portal/applicationQuestions';
import '../../styles/portal/Portal.css';

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

  const handleAnswerChange = (setter) => (event) => {
    const { value } = event.target;
    if (countWords(value) <= MAX_WORDS) setter(value);
  };

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
        Show us your creativity! Answer the following questions (150 words max
        each).
      </p>
      {errorMessage && (
        <div className="portal-apply__error" role="alert">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="portal-apply__scroll">
          <PortalTextarea
            id={QUESTIONS[0].id}
            label={`1. ${QUESTIONS[0].label}`}
            placeholder="Type your answer here..."
            value={productIdea}
            onChange={handleAnswerChange(setProductIdea)}
            counter={`${countWords(productIdea)}/${MAX_WORDS} words`}
            required
          />
          <PortalTextarea
            id={QUESTIONS[1].id}
            label={`2. ${QUESTIONS[1].label}`}
            placeholder="Type your answer here..."
            value={greatTeam}
            onChange={handleAnswerChange(setGreatTeam)}
            counter={`${countWords(greatTeam)}/${MAX_WORDS} words`}
            required
          />
          <PortalTextarea
            id={QUESTIONS[2].id}
            label={`3. ${QUESTIONS[2].label}`}
            placeholder="Type your answer here..."
            value={productExperience}
            onChange={handleAnswerChange(setProductExperience)}
            counter={`${countWords(productExperience)}/${MAX_WORDS} words`}
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
