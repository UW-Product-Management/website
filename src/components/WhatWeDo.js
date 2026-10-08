import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { gsap, prefersReducedMotion } from './eventsV4/motion';
import useWhatWeDoTrail from './useWhatWeDoTrail';
import polaroidOne from '../images/what-we-do/polaroid-1.png';
import polaroidTwo from '../images/what-we-do/polaroid-2.png';
import polaroidThree from '../images/what-we-do/polaroid-3.png';
import mascot from '../images/mascot.svg';

const toTranslate = ({ x, y }) => `translate(${x}, ${y})`;

function placeMascotOnRoute(marker, route, progress) {
  marker.setAttribute(
    'transform',
    toTranslate(route.getPointAtLength(progress * route.getTotalLength())),
  );
}

function Polaroid({ src, alt, caption, tilt }) {
  return (
    <div className={`polaroid-wrap polaroid-wrap--tilt-${tilt}`}>
      <figure className="polaroid">
        <div className="polaroid__photo">
          <img className="polaroid__img" src={src} alt={alt} />
        </div>
        <figcaption className="polaroid__caption">{caption}</figcaption>
      </figure>
    </div>
  );
}

export default function WhatWeDo() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '0px 0px -18% 0px',
    fallbackInView: true,
  });
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const routeRef = useRef(null);
  const mascotRef = useRef(null);
  const travelRef = useRef({ progress: 0 });
  const trail = useWhatWeDoTrail(canvasRef, svgRef);

  useEffect(() => {
    if (!canvasRef.current || prefersReducedMotion()) return undefined;

    const ctx = gsap.context(() => {
      gsap.to(travelRef.current, {
        progress: 1,
        ease: 'none',
        onUpdate: () =>
          placeMascotOnRoute(
            mascotRef.current,
            routeRef.current,
            travelRef.current.progress,
          ),
        scrollTrigger: {
          trigger: canvasRef.current,
          start: 'top 75%',
          end: 'bottom 75%',
          scrub: 0.6,
        },
      });
    }, canvasRef);

    return () => ctx.revert();
  }, []);

  // Re-seats the mascot whenever the trail is re-measured, since scroll
  // updates only fire while the user is actively scrolling.
  useLayoutEffect(() => {
    const marker = mascotRef.current;
    if (!marker) return;

    const { progress } = travelRef.current;
    if (prefersReducedMotion()) {
      marker.setAttribute('transform', toTranslate(trail.resting));
    } else if (progress > 0) {
      placeMascotOnRoute(marker, routeRef.current, progress);
    } else {
      marker.setAttribute('transform', toTranslate(trail.start));
    }
  }, [trail]);

  return (
    <section
      ref={ref}
      id="what-we-do"
      className={`what-we-do${inView ? ' what-we-do--visible' : ''}`}
      aria-labelledby="what-we-do-title"
    >
      <h2 id="what-we-do-title" className="what-we-do__title">
        What We Do
      </h2>

      <div ref={canvasRef} className="what-we-do__canvas">
        <svg
          ref={svgRef}
          viewBox="300 120 1880 1760"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="what-we-do__graphics"
          preserveAspectRatio="xMidYMin slice"
          aria-hidden="true"
        >
          <g className="what-we-do__background" opacity="0.45">
            {[343, 405, 467, 528, 589, 651, 712].map((y) => (
              <line key={`top-h-${y}`} x1="350" y1={y} x2="964" y2={y} />
            ))}
            {[410, 470, 533, 595, 656, 717, 778, 840, 902, 964].map((x) => (
              <line key={`top-v-${x}`} x1={x} y1="343" x2={x} y2="712" />
            ))}
          </g>

          <g className="what-we-do__background">
            <g transform="translate(-124, -55)">
              <path d="M636.938 538.465L655.036 565.219L675.446 540.021L668.386 571.131L701.521 567.063L673.439 584.305L699.888 603.75L667.234 597.025L671.504 628.593L653.406 601.838L632.996 627.037L640.055 595.927L606.921 599.995L635.003 582.753L608.553 563.307L641.208 570.033L636.938 538.465Z" />
            </g>
          </g>

          <g className="what-we-do__background" opacity="0.45">
            {[934, 997, 1057, 1120, 1182, 1244, 1303].map((y) => (
              <line key={`bottom-h-${y}`} x1="1573" y1={y} x2="2123" y2={y} />
            ))}
            {[1629, 1691, 1754, 1815, 1877, 1938, 1998, 2061, 2123].map((x) => (
              <line key={`bottom-v-${x}`} x1={x} y1="934" x2={x} y2="1303" />
            ))}
          </g>

          <path d="M1914.78 1204.02L1915.95 1205.75L1917.23 1204.16L1933.52 1184.05L1927.91 1208.78L1927.43 1210.87L1929.61 1210.6L1955.86 1207.38L1933.61 1221.04L1931.77 1222.18L1933.55 1223.49L1954.57 1238.94L1928.51 1233.57L1926.46 1233.15L1926.73 1235.19L1930.15 1260.46L1915.66 1239.04L1914.5 1237.31L1913.21 1238.9L1896.92 1259.01L1902.54 1234.28L1903.01 1232.19L1900.83 1232.45L1874.58 1235.68L1896.83 1222.02L1898.68 1220.88L1896.89 1219.57L1875.87 1204.12L1901.93 1209.49L1903.99 1209.91L1903.71 1207.87L1900.29 1182.6L1914.78 1204.02Z" />

          <path className="what-we-do__curve" d={trail.toPhotoTwo} />
          <path className="what-we-do__curve" d={trail.toPhotoThree} />
          <path
            ref={routeRef}
            className="what-we-do__mascot-route"
            d={trail.mascotRoute}
          />

          <g ref={mascotRef}>
            <g className="what-we-do__mascot-marker">
              <image
                href={mascot}
                x="-125"
                y="-125"
                width="250"
                height="250"
                className="what-we-do__mascot-img"
              />
            </g>
          </g>
        </svg>

        <div className="what-we-do__node what-we-do__node--photo-one">
          <Polaroid
            src={polaroidOne}
            alt="UW PM executives speaking at ProdCon 2022"
            caption="Datadog x UW PM!"
            tilt="left"
          />
        </div>

        <div className="what-we-do__node what-we-do__node--educate">
          <h3>Educate</h3>
          <p>
            Providing resources &amp; training
            <br />
            of product management skills
          </p>
        </div>

        <div className="what-we-do__node what-we-do__node--exposure">
          <h3>Exposure</h3>
          <p>
            Access to open opportunities
            <br />
            in Canada &amp; the US
          </p>
        </div>

        <div className="what-we-do__node what-we-do__node--photo-two">
          <Polaroid
            src={polaroidTwo}
            alt="UW PM executives holding Datadog prizes"
            caption="Fireside chat with Google & Shopify PMs!"
            tilt="right"
          />
        </div>

        <div className="what-we-do__node what-we-do__node--photo-three">
          <Polaroid
            src={polaroidThree}
            alt="Students attending a UW PM presentation"
            caption="Students at a UW PM speaker event!"
            tilt="slight"
          />
        </div>

        <div className="what-we-do__node what-we-do__node--network">
          <h3>Network</h3>
          <p>
            Connecting students and alumni
            <br />
            in the industry
          </p>
        </div>
      </div>
    </section>
  );
}
