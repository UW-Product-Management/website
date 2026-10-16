import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from './motion';

import highlight from '../../images/deco/highlight-29.svg';
import vector from '../../images/deco/vector.svg';
import starsSolid from '../../images/deco/stars.svg';
import starsOutline from '../../images/deco/stars-1.svg';

import prodcon2401 from '../../images/prodcon/prodcon2401.webp';
import prodcon2402 from '../../images/prodcon/prodcon2402.webp';
import prodcon2403 from '../../images/prodcon/prodcon2403.webp';
import prodcon2404 from '../../images/prodcon/prodcon2404.webp';
import prodcon2405 from '../../images/prodcon/prodcon2405.webp';
import prodcon2406 from '../../images/prodcon/prodcon2406.webp';

// All six ProdCon winners, copy carried over from the v4 design repo.
// Three sit on screen at a time on desktop; the rest are reached with the
// arrows or a horizontal swipe.
const projects = [
  {
    src: prodcon2401,
    title: 'SAMM',
    award: '1st Place. Grand Winner.',
    team: 'Subodh Thallada, Mihajlo Micic, Akira Takaki, Marc Da Silva',
    desc: 'An AI product discovery platform that accelerates market validation from weeks into hours. It transforms raw consumer insights into complete product strategies, visual roadmaps, and spatial prototypes.',
  },
  {
    src: prodcon2402,
    title: 'Oyster',
    award: '2nd Place. Runner Up.',
    team: 'Artemis Cherkaev, Ryushen Tan, James Liang, Petar Isakovic',
    desc: 'Intelligent product lifecycle management engine that translates user feedback and wireframes into interactive prototypes while aligning developer specifications in real time.',
  },
  {
    src: prodcon2403,
    title: 'Auctopus',
    award: '3rd Place. Finalist.',
    team: 'Caellum Yip Hoi Lee, Chloe Houvardas, Daniel Shah, Jeremy Liu',
    desc: 'Full funnel product intelligence tool that converts strategic vision into validated user experience flows, automated market research, and synthetic user cohort testing.',
  },
  {
    src: prodcon2404,
    title: 'Paletto',
    award: 'Best Design Award.',
    team: 'Kate Chen, Ethan Zhang, Sophia Liu, Alan Wang',
    desc: 'Design system infrastructure tool that unifies product design tokens, automated accessibility auditing, and scalable design components across enterprise design systems.',
  },
  {
    src: prodcon2405,
    title: 'HackerPilot',
    award: "People's Choice Award.",
    team: 'Nathan Wong, Clara Xu, David Park, Maya Singh',
    desc: 'Real time copilot for product management teams that tracks sprint velocity, optimizes resource management, and generates comprehensive product requirement docs and stakeholder pitches.',
  },
  {
    src: prodcon2406,
    title: 'PricePulse',
    award: 'Best Pitch Award.',
    team: 'Julian Roy, Hannah Kim, Owen Chen, Leo Verma',
    desc: 'Data driven product monetization platform that analyzes feature usage telemetry and user funnel retention to optimize SaaS pricing tier structures and value metrics.',
  },
];

function TrackArrow({ dir, onClick, disabled }) {
  const back = dir === 'prev';
  return (
    <button
      type="button"
      className={`pw__nav pw__nav--${dir}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={back ? 'Previous winner' : 'Next winner'}
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d={back ? 'M10 2 4 8l6 6' : 'M6 2l6 6-6 6'}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="square"
        />
      </svg>
    </button>
  );
}

export default function PastWinners() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    let frame = 0;
    const measure = () => {
      frame = 0;
      // 1px of slack: fractional scroll offsets never quite reach the edge.
      const atStart = track.scrollLeft <= 1;
      const atEnd =
        track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
      setEdges((prev) =>
        prev.atStart === atStart && prev.atEnd === atEnd
          ? prev
          : { atStart, atEnd },
      );
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    track.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      track.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useLayoutEffect(() => {
    if (!sectionRef.current || prefersReducedMotion()) return undefined;

    const ctx = gsap.context(() => {
      const heading = sectionRef.current.querySelector('.pw__reveal-head');
      if (heading) {
        gsap.from(heading, {
          y: 16,
          autoAlpha: 0,
          duration: 0.45,
          ease: 'power4.out',
          scrollTrigger: { trigger: heading, start: 'top 92%', once: true },
        });
      }

      gsap.from('.pw__col', {
        y: 24,
        autoAlpha: 0,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: {
          trigger: trackRef.current,
          start: 'top 85%',
          once: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Advance the track by exactly one card; scroll snapping settles it.
  const step = (direction) => {
    const track = trackRef.current;
    const card = track && track.firstElementChild;
    if (!card) return;
    const gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
    track.scrollBy({
      left: direction * (card.offsetWidth + gap),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  };

  return (
    <section className="pw" id="winners" ref={sectionRef}>
      <div className="pw__decorations" aria-hidden="true">
        <img src={highlight} alt="" className="pw__svg pw__svg--highlight" />
        <img src={vector} alt="" className="pw__svg pw__svg--vector" />
        <img src={starsSolid} alt="" className="pw__svg pw__svg--star-solid" />
        <img
          src={starsOutline}
          alt=""
          className="pw__svg pw__svg--star-outline"
        />
      </div>

      <div className="pw__inner">
        <div className="container">
          <div className="ev4-head">
            <h2 className="pw__reveal-head">Past winners</h2>
          </div>
        </div>

        <div className="pw__band">
          <div
            className="pw__track"
            ref={trackRef}
            role="region"
            aria-label="Winning teams"
            tabIndex={0}
          >
            {projects.map((p) => (
              <div className="pw__col" key={p.title}>
                <div className="pw__box">
                  <div className="pw__img-wrap">
                    <img src={p.src} alt={p.title} className="pw__img" />
                  </div>
                  <span className="pw__award">{p.award}</span>
                  <h3 className="pw__title">{p.title}</h3>
                  <p className="pw__team">{p.team}</p>
                  <p className="pw__desc">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pw__controls">
            <TrackArrow
              dir="prev"
              onClick={() => step(-1)}
              disabled={edges.atStart}
            />
            <TrackArrow
              dir="next"
              onClick={() => step(1)}
              disabled={edges.atEnd}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
