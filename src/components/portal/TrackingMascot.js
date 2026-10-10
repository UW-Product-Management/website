import React, { useEffect, useRef } from 'react';
import { AUTH_MASCOT } from '../../data/portalAuthDecor';

const PUPIL_TRAVEL_X = 36;
const PUPIL_TRAVEL_Y = 23;
const FULL_TRAVEL_DISTANCE = 160;

export default function TrackingMascot() {
  const eyeRef = useRef(null);
  const pupilRef = useRef(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    );
    if (reducedMotion?.matches) return undefined;

    const handlePointerMove = ({ clientX, clientY }) => {
      const eye = eyeRef.current;
      const pupil = pupilRef.current;
      if (!eye || !pupil) return;

      const { left, top, width, height } = eye.getBoundingClientRect();
      if (!width) return;

      const dx = clientX - (left + width / 2);
      const dy = clientY - (top + height / 2);
      const distance = Math.hypot(dx, dy) || 1;
      const reach = Math.min(distance / FULL_TRAVEL_DISTANCE, 1);

      pupil.style.setProperty(
        '--pupil-x',
        ((dx / distance) * reach * PUPIL_TRAVEL_X).toFixed(2),
      );
      pupil.style.setProperty(
        '--pupil-y',
        ((dy / distance) * reach * PUPIL_TRAVEL_Y).toFixed(2),
      );
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <span className="hexagon-decor__mascot">
      <img
        src={AUTH_MASCOT.src}
        width={AUTH_MASCOT.width}
        height={AUTH_MASCOT.height}
        alt=""
        decoding="async"
      />
      <span ref={eyeRef} className="hexagon-decor__mascot-eye">
        <span ref={pupilRef} className="hexagon-decor__mascot-pupil" />
      </span>
    </span>
  );
}
