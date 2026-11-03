import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PortalTextarea } from './PortalField';
import { MAX_CHARACTERS } from '../../portal/applicationQuestions';

export default function EditAnswerDialog({
  number,
  question,
  initialValue = '',
  onSave,
  onClose,
}) {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const textareaRef = useRef(null);

  const textareaId = `edit-answer-${number}`;
  const isEmpty = value.trim() === '';

  useEffect(() => {
    const textarea = textareaRef.current;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isEmpty) return;

    setIsSaving(true);
    setErrorMessage('');
    const message = await onSave(value);
    if (message) {
      setErrorMessage(message);
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="portal-answer-dialog__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="portal-answer-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Edit answer to question ${number}`}
        onSubmit={handleSubmit}
      >
        <PortalTextarea
          id={textareaId}
          label={`${number}. ${question}`}
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={MAX_CHARACTERS}
          counter={`${value.length}/${MAX_CHARACTERS} characters`}
          required
        />
        {errorMessage && (
          <div className="portal-apply__error" role="alert">
            {errorMessage}
          </div>
        )}
        <div className="portal-answer-dialog__actions">
          <button
            type="button"
            className="portal-apply__back"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isEmpty || isSaving}
            className="portal-button portal-button--primary"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
