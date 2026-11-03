import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
import ApplyActions from '../../components/portal/ApplyActions';
import { PortalTextarea } from '../../components/portal/PortalField';
import { MAX_CHARACTERS, QUESTIONS } from '../../portal/applicationQuestions';
import '../../styles/portal/Portal.css';

export default function ApplyQuestions() {
  const navigate = useNavigate();
  const { application, state, saveDraft } = usePortal();

  const isSubmitted = hasSubmitted(application) || Boolean(state?.submittedAt);

  const initialFavouriteProduct =
    application?.favouriteProduct ||
    application?.answers?.favouriteProduct ||
    state?.application?.answers?.favouriteProduct ||
    '';

  const [favouriteProduct, setFavouriteProduct] = useState(
    initialFavouriteProduct,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialFavouriteProduct) setFavouriteProduct(initialFavouriteProduct);
  }, [initialFavouriteProduct]);

  if (isSubmitted) {
    return <Navigate to="/portal/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage('');

    try {
      const result = await saveDraft({ favouriteProduct });
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
        Show us your creativity! Answer the following question ({MAX_CHARACTERS}
        characters max).
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
            label={QUESTIONS[0].label}
            placeholder="Type your answer here..."
            value={favouriteProduct}
            onChange={(event) => setFavouriteProduct(event.target.value)}
            maxLength={MAX_CHARACTERS}
            counter={`${favouriteProduct.length}/${MAX_CHARACTERS} characters`}
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
