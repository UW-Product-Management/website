import React, { useEffect, useRef } from 'react';

// Resting positions (% of hero) for the two clusters
const REST_A = { x: 42, y: 50 }; // leading
const REST_B = { x: 58, y: 52 }; // trailing

const CHASE_A = 0.62;
const CHASE_B = 0.34;

export default function HeroBloom() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const hero = el.parentElement;
    if (typeof window.matchMedia !== 'function') return undefined;
    const [elA, elB] = el.querySelectorAll('.hb-cluster');

    const hoverQuery = window.matchMedia?.('(hover: hover)');
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!hoverQuery || !motionQuery) return undefined;

    const mouse = { x: 50, y: 50 };
    const a = { ...REST_A };
    const b = { ...REST_B };
    let reach = 0;
    let reachTarget = 0;
    let press = 0;
    let pressTarget = 0;
    let frame = null;
    let enabled = false;

    // Move each cluster with transform only (no layout work per frame)
    const paint = (swell) => {
      const w = hero.clientWidth;
      const h = hero.clientHeight;
      const place = (node, pos, rest) => {
        const dx = ((pos.x - rest.x) / 100) * w;
        const dy = ((pos.y - rest.y) / 100) * h;
        node.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%) scale(${swell})`;
      };
      place(elA, a, REST_A);
      place(elB, b, REST_B);
    };

    const tick = () => {
      reach += (reachTarget - reach) * 0.08;
      press += (pressTarget - press) * 0.15;
      const eased = reach * reach * (3 - 2 * reach);

      // Where each cluster wants to be
      const tax = REST_A.x + (mouse.x - REST_A.x) * CHASE_A * reach;
      const tay = REST_A.y + (mouse.y - REST_A.y) * CHASE_A * reach;
      const tbx = REST_B.x + (mouse.x - REST_B.x) * CHASE_B * reach;
      const tby = REST_B.y + (mouse.y - REST_B.y) * CHASE_B * reach;

      // Spring: leading is quick, trailing lags
      a.x += (tax - a.x) * 0.085;
      a.y += (tay - a.y) * 0.085;
      b.x += (tbx - b.x) * 0.042;
      b.y += (tby - b.y) * 0.042;

      const swell = (0.88 + 0.12 * eased) * (1 + 0.09 * press + 0.03 * reach);
      paint(swell);

      // Keep looping only while something is still moving
      const remaining =
        Math.abs(tax - a.x) +
        Math.abs(tay - a.y) +
        Math.abs(tbx - b.x) +
        Math.abs(tby - b.y) +
        Math.abs(reachTarget - reach) +
        Math.abs(pressTarget - press);
      frame = remaining > 0.01 ? requestAnimationFrame(tick) : null;
    };

    const start = () => {
      if (frame === null) frame = requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      const r = hero.getBoundingClientRect();
      const inside =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      if (inside) {
        mouse.x = ((e.clientX - r.left) / r.width) * 100;
        mouse.y = ((e.clientY - r.top) / r.height) * 100;
        reachTarget = 1;
      } else {
        reachTarget = 0;
        pressTarget = 0;
      }
      start();
    };
    const onLeave = () => {
      reachTarget = 0;
      pressTarget = 0;
      start();
    };
    const onDown = () => {
      if (reachTarget) pressTarget = 1;
      start();
    };
    const onUp = () => {
      pressTarget = 0;
      start();
    };

    const enable = () => {
      if (enabled) return;
      enabled = true;
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerdown', onDown, { passive: true });
      window.addEventListener('pointerup', onUp, { passive: true });
      window.addEventListener('pointercancel', onUp, { passive: true });
      hero.addEventListener('pointerleave', onLeave);
    };

    const disable = () => {
      enabled = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      hero.removeEventListener('pointerleave', onLeave);
      reachTarget = 0;
      pressTarget = 0;
      start(); // eases back to the static resting bloom
    };

    // Touch devices and reduced motion: static bloom. Reacts to live changes.
    const sync = () => {
      if (hoverQuery.matches && !motionQuery.matches) enable();
      else disable();
    };

    sync();
    paint(0.88);
    hoverQuery.addEventListener('change', sync);
    motionQuery.addEventListener('change', sync);
    window.addEventListener('resize', start);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      hoverQuery.removeEventListener('change', sync);
      motionQuery.removeEventListener('change', sync);
      window.removeEventListener('resize', start);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      hero.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div ref={ref} className="home-hero__bloom" aria-hidden="true">
      {['a', 'b'].map((id) => (
        <div key={id} className={`hb-cluster hb-cluster--${id}`}>
          <div className="hb-shape">
            {[1, 2, 3, 4, 5].map((n) => (
              <i key={n} />
            ))}
          </div>
          <span className="hb-grain" />
        </div>
      ))}
    </div>
  );
}
