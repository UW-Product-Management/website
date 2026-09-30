import { useLayoutEffect, useState } from 'react';

// Matches the breakpoint where Home.css reflows the polaroids into a grid,
// which no longer lines up with the hand-drawn desktop trail.
const GRID_LAYOUT_QUERY = '(max-width: 767px)';

const TRAIL_TO_PHOTO_TWO =
  'M1032.64 424C1068.61 495.936 1350.22 688.056 1362.57 555.626C1365.19 527.63 1335.49 471.902 1299.59 491.774C1264.74 511.068 1249.76 576.389 1240.97 610.978C1216.32 707.969 1253.9 797.879 1350.37 832.389C1422.11 858.051 1506.18 860.308 1573.96 828.03';
const TRAIL_TO_PHOTO_THREE =
  'M1457.14 1104.99C1346.96 1215.17 1181.6 1247.33 1033.74 1277.67';

// The mascot crosses behind the second polaroid between the two visible
// trail segments, then keeps going past the trail's end until it is fully
// tucked behind the last polaroid.
export const DESKTOP_TRAIL = {
  toPhotoTwo: TRAIL_TO_PHOTO_TWO,
  toPhotoThree: TRAIL_TO_PHOTO_THREE,
  mascotRoute: `${TRAIL_TO_PHOTO_TWO}L${TRAIL_TO_PHOTO_THREE.slice(
    1,
  )}C940 1297 872 1380 872 1470`,
  start: { x: 1032.64, y: 424 },
  resting: { x: 1033.74, y: 1277.67 },
};

const toCoords = ({ x, y }) => `${x.toFixed(1)} ${y.toFixed(1)}`;

function verticalSCurve(from, to) {
  const midY = (from.y + to.y) / 2;
  return `C${toCoords({ x: from.x, y: midY })} ${toCoords({
    x: to.x,
    y: midY,
  })} ${toCoords(to)}`;
}

// A single self-crossing cubic that curls up and back over itself, echoing
// the loop in the desktop trail. It enters heading up-right and leaves
// heading down-right, one loop-width to the right of where it began.
function loopFrom(entry, size) {
  const exit = { x: entry.x + size, y: entry.y };
  return {
    exit,
    curve: `C${toCoords({
      x: entry.x + size * 2.6,
      y: entry.y - size * 2,
    })} ${toCoords({
      x: entry.x - size * 1.6,
      y: entry.y - size * 2,
    })} ${toCoords(exit)}`,
  };
}

function measureCard(canvas, toSvg, name) {
  const card = canvas.querySelector(`.what-we-do__node--${name} .polaroid`);
  if (!card) return null;
  const rect = card.getBoundingClientRect();
  const topLeft = new DOMPoint(rect.left, rect.top).matrixTransform(toSvg);
  const bottomRight = new DOMPoint(rect.right, rect.bottom).matrixTransform(
    toSvg,
  );
  return {
    left: topLeft.x,
    top: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

function measureGridTrail(canvas, svg) {
  const screenMatrix = svg.getScreenCTM();
  if (!screenMatrix) return null;
  const toSvg = screenMatrix.inverse();

  const one = measureCard(canvas, toSvg, 'photo-one');
  const two = measureCard(canvas, toSvg, 'photo-two');
  const three = measureCard(canvas, toSvg, 'photo-three');
  if (!one || !two || !three) return null;

  // Segments run corner to corner through the gap between grid rows so the
  // mascot never passes behind the Exposure or Network copy. Each endpoint
  // sits inside its card so the dashes tuck under the tilted polaroid.
  const pointOn = (card, xRatio, yRatio) => ({
    x: card.left + card.width * xRatio,
    y: card.top + card.height * yRatio,
  });
  const start = pointOn(one, 0.75, 0.8);
  const intoTwo = pointOn(two, 0.25, 0.2);
  const outOfTwo = pointOn(two, 0.25, 0.8);
  const intoThree = pointOn(three, 0.75, 0.2);
  const hidden = pointOn(three, 0.5, 0.5);

  const loopSize = one.width * 0.2;
  const loopEntry = {
    x: (start.x + intoTwo.x - loopSize) / 2,
    y: (start.y + intoTwo.y) / 2,
  };
  const loop = loopFrom(loopEntry, loopSize);
  const curveToTwo = [
    `C${toCoords({ x: start.x, y: loopEntry.y })} ${toCoords({
      x: loopEntry.x - loopSize,
      y: loopEntry.y + loopSize,
    })} ${toCoords(loopEntry)}`,
    loop.curve,
    `C${toCoords({
      x: loop.exit.x + loopSize,
      y: loop.exit.y + loopSize,
    })} ${toCoords({ x: intoTwo.x, y: intoTwo.y - loopSize })} ${toCoords(
      intoTwo,
    )}`,
  ].join('');
  const curveToThree = verticalSCurve(outOfTwo, intoThree);

  return {
    toPhotoTwo: `M${toCoords(start)}${curveToTwo}`,
    toPhotoThree: `M${toCoords(outOfTwo)}${curveToThree}`,
    mascotRoute: `M${toCoords(start)}${curveToTwo}L${toCoords(
      outOfTwo,
    )}${curveToThree}L${toCoords(hidden)}`,
    start,
    resting: intoThree,
  };
}

export default function useWhatWeDoTrail(canvasRef, svgRef) {
  const [trail, setTrail] = useState(DESKTOP_TRAIL);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const svg = svgRef.current;
    if (!canvas || !svg) return undefined;

    const gridLayout = window.matchMedia(GRID_LAYOUT_QUERY);
    const update = () =>
      setTrail(
        (gridLayout.matches && measureGridTrail(canvas, svg)) || DESKTOP_TRAIL,
      );

    update();
    gridLayout.addEventListener('change', update);
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(canvas);

    return () => {
      gridLayout.removeEventListener('change', update);
      resizeObserver.disconnect();
    };
  }, [canvasRef, svgRef]);

  return trail;
}
