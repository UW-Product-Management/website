import React from 'react';

const ICON_PROPS = {
  viewBox: '0 0 24 24',
  width: 20,
  height: 20,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export const EditIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);

export const UserIcon = () => (
  <svg {...ICON_PROPS}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

export const LogOutIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const ArrowIcon = ({ direction = 'right' }) => (
  <svg
    {...ICON_PROPS}
    width={22}
    height={22}
    style={direction === 'left' ? { transform: 'scaleX(-1)' } : undefined}
  >
    <path d="M4 12h16" />
    <path d="M14 6l6 6-6 6" />
  </svg>
);

export const CheckIcon = () => (
  <svg {...ICON_PROPS} width={14} height={14} strokeWidth={3}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const InstagramIcon = () => (
  <svg {...ICON_PROPS} width={14} height={14}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
);
