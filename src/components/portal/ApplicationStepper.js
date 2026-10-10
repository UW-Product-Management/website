import React, { useLayoutEffect, useRef } from 'react';
import { STEP_ICON } from '../../data/portalContent';
import { CheckIcon } from './PortalIcons';

export const APPLICATION_STEPS = [
  'Register',
  'Questions',
  'Consent',
  'Review & Submit',
];

const RUN_DURATION_MS = 900;
const RUN_HOPS = 3;
const HOP_HEIGHT_PX = 6;
const RUN_SAMPLES = 48;

let lastRenderedStep = null;

function getStatus(stepNumber, currentStep) {
  if (stepNumber === currentStep) return 'current';
  return stepNumber < currentStep ? 'complete' : 'upcoming';
}

const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function buildRunKeyframes(distance) {
  return Array.from({ length: RUN_SAMPLES + 1 }, (_, index) => {
    const progress = index / RUN_SAMPLES;
    const x = distance * (1 - easeInOutQuad(progress));
    const y =
      -HOP_HEIGHT_PX * Math.abs(Math.sin(progress * RUN_HOPS * Math.PI));
    return { transform: `translate(${x}px, ${y}px)` };
  });
}

export default function ApplicationStepper({ currentStep }) {
  const stepperRef = useRef(null);
  const mascotRef = useRef(null);

  useLayoutEffect(() => {
    const previousStep = lastRenderedStep;
    lastRenderedStep = currentStep;

    const mascot = mascotRef.current;
    const steps = stepperRef.current?.children;
    const reducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    );
    if (
      !mascot?.animate ||
      !steps ||
      !previousStep ||
      previousStep === currentStep ||
      reducedMotion?.matches
    ) {
      return undefined;
    }

    const from = steps[previousStep - 1];
    const to = steps[currentStep - 1];
    if (!from || !to) return undefined;

    const distance =
      from.getBoundingClientRect().left - to.getBoundingClientRect().left;
    const run = mascot.animate(buildRunKeyframes(distance), {
      duration: RUN_DURATION_MS,
      easing: 'linear',
    });
    return () => run.cancel();
  }, [currentStep]);

  return (
    <ol
      ref={stepperRef}
      className="application-stepper"
      aria-label="Application progress"
    >
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
                ref={mascotRef}
                className="application-stepper__mascot"
                src={STEP_ICON.src}
                width={STEP_ICON.width}
                height={STEP_ICON.height}
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
