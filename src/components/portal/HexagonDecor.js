import React from 'react';
import { AUTH_HEXAGONS } from '../../data/portalAuthDecor';
import TrackingMascot from './TrackingMascot';

const SIDES = ['top', 'right', 'bottom', 'left'];

function hexagonVars({ size, rotate, ...position }) {
  const vars = {
    '--hex-size': size,
    '--hex-rotate': `${rotate}deg`,
  };
  SIDES.forEach((side) => {
    if (position[side] !== undefined) vars[side] = position[side];
  });
  return vars;
}

export default function HexagonDecor({ showMascot = true }) {
  return (
    <div className="hexagon-decor" aria-hidden="true">
      {AUTH_HEXAGONS.map((hexagon) => (
        <span
          key={`${hexagon.tone}-${hexagon.top ?? hexagon.bottom}-${
            hexagon.left ?? hexagon.right
          }`}
          className={`hexagon-decor__hex hexagon-decor__hex--${hexagon.tone}`}
          style={hexagonVars(hexagon)}
        />
      ))}
      {showMascot && <TrackingMascot />}
    </div>
  );
}
