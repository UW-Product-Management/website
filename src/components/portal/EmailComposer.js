import React from 'react';

export const MAX_SUBJECT_LENGTH = 200;
export const MAX_BODY_LENGTH = 10000;

export default function EmailComposer({
  subject = '',
  body = '',
  onSubjectChange,
  onBodyChange,
  disabled = false,
}) {
  return (
    <div className="portal-messages__composer">
      <label htmlFor="message-subject">
        Subject
        <input
          id="message-subject"
          type="text"
          autoComplete="off"
          maxLength={MAX_SUBJECT_LENGTH}
          value={subject}
          disabled={disabled}
          onChange={(e) => onSubjectChange(e.target.value)}
        />
      </label>
      <label htmlFor="message-body">
        Message
        <textarea
          id="message-body"
          rows={10}
          maxLength={MAX_BODY_LENGTH}
          value={body}
          disabled={disabled}
          aria-describedby="message-body-hint"
          onChange={(e) => onBodyChange(e.target.value)}
        />
      </label>
      <p id="message-body-hint" className="portal-messages__hint">
        Leave a blank line between paragraphs. Write {'{{name}}'} to insert each
        person&apos;s name. The email uses the ProdCon template with a link to
        the portal dashboard.
      </p>
    </div>
  );
}
