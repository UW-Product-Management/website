import React from 'react';
import { AUTH_MASCOT } from '../../data/portalAuthDecor';
import { CheckIcon } from './PortalIcons';

export const APPLICATION_STEPS = ['Register', 'Questions', 'Consent', 'Submit'];

function getStatus(stepNumber, currentStep) {
  if (stepNumber === currentStep) return 'current';
  return stepNumber < currentStep ? 'complete' : 'upcoming';
}

export default function ApplicationStepper({ currentStep }) {
  return (
    <ol className="application-stepper" aria-label="Application progress">
      {APPLICATION_STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const status = getStatus(stepNumber, currentStep);

        return (
          <li
            key={label}
            className={`application-stepper__step application-stepper__step--${status}`}
            aria-current={status === 'current' ? 'step' : undefined}
          >
            {status === 'current' && (
              <img
                className="application-stepper__mascot"
                src={AUTH_MASCOT.src}
                width={AUTH_MASCOT.width}
                height={AUTH_MASCOT.height}
                alt=""
                decoding="async"
              />
            )}
            <span className="application-stepper__number">
              {status === 'complete' ? <CheckIcon /> : stepNumber}
            </span>
            <span className="application-stepper__label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
