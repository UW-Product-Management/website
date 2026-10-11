import React, { useState } from 'react';

function EyeIcon({ crossed }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M4 4l16 16" />}
    </svg>
  );
}

function FieldLabel({ id, label, required }) {
  return (
    <label htmlFor={id} className="portal-field__label">
      {label}
      {required && (
        <span className="portal-field__required" aria-hidden="true">
          {' '}
          *
        </span>
      )}
    </label>
  );
}

export function PortalField({
  id,
  label,
  required = false,
  children,
  ...rest
}) {
  return (
    <div className="portal-field">
      <FieldLabel id={id} label={label} required={required} />
      <div className="portal-field__control">
        <input id={id} required={required} {...rest} />
        {children}
      </div>
    </div>
  );
}

export function PasswordField(props) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <PortalField {...props} type={isVisible ? 'text' : 'password'}>
      <button
        type="button"
        className="portal-field__toggle"
        aria-pressed={isVisible}
        onClick={() => setIsVisible((visible) => !visible)}
      >
        <EyeIcon crossed={isVisible} />
        <span className="portal-visually-hidden">Show password</span>
      </button>
    </PortalField>
  );
}

export function PortalSelect({
  id,
  label,
  required = false,
  placeholder,
  options = [],
  ...rest
}) {
  return (
    <div className="portal-field">
      <FieldLabel id={id} label={label} required={required} />
      <div className="portal-field__control portal-field__control--select">
        <select id={id} required={required} {...rest}>
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function PortalTextarea({
  id,
  label,
  required = false,
  counter,
  ...rest
}) {
  return (
    <div className="portal-field">
      <FieldLabel id={id} label={label} required={required} />
      <textarea id={id} required={required} {...rest} />
      {counter !== undefined && (
        <span className="portal-apply__char-count">{counter}</span>
      )}
    </div>
  );
}

export function PortalCheckbox({ id, children, ...rest }) {
  return (
    <label htmlFor={id} className="portal-checkbox">
      <input id={id} type="checkbox" {...rest} />
      <span>{children}</span>
    </label>
  );
}
