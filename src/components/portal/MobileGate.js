import React from 'react';
import pmLogo from '../../images/uwpm-brand/pmlogo.svg';
import hex5982 from '../../images/portal/mobile-gate/hex-5982.svg';
import hex5983 from '../../images/portal/mobile-gate/hex-5983.svg';
import hex5981 from '../../images/portal/mobile-gate/hex-5981.svg';
import hex5984 from '../../images/portal/mobile-gate/hex-5984.svg';
import hex5985 from '../../images/portal/mobile-gate/hex-5985.svg';
import hex5986 from '../../images/portal/mobile-gate/hex-5986.svg';
import hex5976 from '../../images/portal/mobile-gate/hex-5976.svg';
import hex5977 from '../../images/portal/mobile-gate/hex-5977.svg';
import mascotFace from '../../images/portal/mobile-gate/mascot-face.svg';
import bubbleOutline from '../../images/portal/mobile-gate/bubble-outline.svg';
import arrow from '../../images/portal/mobile-gate/arrow.svg';
import starsA from '../../images/portal/mobile-gate/stars-a.svg';
import starsB from '../../images/portal/mobile-gate/stars-b.svg';
import '../../styles/portal/PortalMobileGate.css';

const SCATTER_HEXAGONS = [
  {
    key: 'hex-1',
    src: hex5982,
    inset: '77.12% 74.81% 2.42% -19.4%',
    rotate: -43.52,
    skew: 0.12,
    h: [48.3945, 50.8724],
    w: [51.6055, -49.1276],
  },
  {
    key: 'hex-2',
    src: hex5983,
    inset: '88.75% 61.8% -2.54% 8.95%',
    rotate: -103.6,
    skew: -0.05,
    h: [79.8546, -18.7664],
    w: [-20.1454, -81.2336],
  },
  {
    key: 'hex-3',
    src: hex5981,
    inset: '69.47% 2.97% 9.91% 53.23%',
    rotate: -46.8,
    skew: -1.33,
    h: [50.6259, 48.6408],
    w: [49.3741, -51.3592],
  },
  {
    key: 'hex-4',
    src: hex5984,
    inset: '81.38% -10.19% 4.38% 80.65%',
    rotate: -105.78,
    skew: 0.71,
    h: [76.7933, -21.6751],
    w: [-23.2067, -78.3249],
  },
  {
    key: 'hex-5',
    src: hex5985,
    inset: '47.71% 2.17% 37.42% 65.81%',
    rotate: 1.57,
    skew: 0.07,
    h: [-2.57262, 97.3528],
    w: [97.4274, 2.64719],
  },
  {
    key: 'hex-6',
    src: hex5986,
    inset: '59.98% -3.99% 24.31% 70.96%',
    rotate: -59.05,
    skew: -1.19,
    h: [60.9215, 37.0041],
    w: [39.0785, -62.9959],
  },
  {
    key: 'hex-7',
    src: hex5976,
    inset: '-5.84% 18.16% 89.61% 47.51%',
    rotate: -17.72,
    skew: -1.46,
    h: [22.7697, 75.9871],
    w: [77.2303, -24.0129],
  },
  {
    key: 'hex-8',
    src: hex5977,
    inset: '6.59% 13.68% 81.12% 60.9%',
    rotate: -77.05,
    skew: -0.15,
    h: [80.1266, 17.753],
    w: [19.8734, -82.247],
  },
];

const STAR_BURSTS = [
  {
    key: 'star-1',
    src: starsA,
    inset: '39.11% 12.45% 56.3% 76.12%',
    rotate: -20.07,
    h: [21.4095, 67.1091],
    w: [78.5905, -32.8909],
  },
  {
    key: 'star-2',
    src: starsB,
    inset: '45.08% 40.26% 50% 46.77%',
    rotate: 3.83,
    h: [-5.08764, 92.3013],
    w: [94.9124, 7.69867],
  },
];

function scatterStyle({ inset, rotate, skew, h, w }) {
  return {
    '--mg-inset': inset,
    '--mg-rotate': `${rotate}deg`,
    '--mg-skew': `${skew ?? 0}deg`,
    '--mg-h-a': h[0],
    '--mg-h-b': h[1],
    '--mg-w-a': w[0],
    '--mg-w-b': w[1],
  };
}

export default function MobileGate() {
  return (
    <div className="portal-mobile-gate">
      <div className="portal-mobile-gate__frame">
        {SCATTER_HEXAGONS.map((hex) => (
          <div
            key={hex.key}
            className="portal-mobile-gate__scatter"
            style={scatterStyle(hex)}
            aria-hidden="true"
          >
            <div className="portal-mobile-gate__scatter-inner">
              <img src={hex.src} alt="" />
            </div>
          </div>
        ))}

        <div className="portal-mobile-gate__mascot" aria-hidden="true">
          <img
            className="portal-mobile-gate__mascot-face"
            src={mascotFace}
            alt=""
          />
        </div>

        <div className="portal-mobile-gate__bubble">
          <img
            className="portal-mobile-gate__bubble-shape"
            src={bubbleOutline}
            alt=""
            aria-hidden="true"
          />
          <span className="portal-mobile-gate__bubble-text">uh oh...</span>
        </div>

        <div className="portal-mobile-gate__logo">
          <img src={pmLogo} alt="UW PM" />
        </div>

        {STAR_BURSTS.map((star) => (
          <div
            key={star.key}
            className="portal-mobile-gate__scatter portal-mobile-gate__scatter--star"
            style={scatterStyle(star)}
            aria-hidden="true"
          >
            <div className="portal-mobile-gate__scatter-inner">
              <img src={star.src} alt="" />
            </div>
          </div>
        ))}

        <img
          className="portal-mobile-gate__arrow"
          src={arrow}
          alt=""
          aria-hidden="true"
        />

        <div className="portal-mobile-gate__card">
          <p className="portal-mobile-gate__message">
            Please use a desktop computer or laptop for the best viewing
            experience. This website/tool is not designed for mobile screens.
          </p>
        </div>
      </div>
    </div>
  );
}
