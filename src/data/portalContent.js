import { formatDeadline } from '../portal/applicationWindow';
import mascotYellow from '../images/mascot-yellow.svg';
import mascotBlue from '../images/mascot.svg';
import mascotPink from '../images/mascot-pink.svg';
import mascotGrad from '../images/home/mascot-grad.png';
import mascotPencil from '../images/home/mascot-pencil.png';
import mascotMic from '../images/home/mascot-mic.png';
import stepFigure1 from '../images/portal/step-figure-1.svg';
import stepFigure2 from '../images/portal/step-figure-2.svg';
import stepFigure3 from '../images/portal/step-figure-3.svg';
import stepFigure4 from '../images/portal/step-figure-4.svg';
import stepIcon from '../images/portal/step-icon.svg';

export const INSTAGRAM = {
  handle: '@uwaterloopm',
  href: 'https://www.instagram.com/uwaterloopm/',
};

const GOOD_PRODUCTS_TIP =
  'Good products solve problems. Great products make you wonder how you lived without them.';

export const PORTAL_TIPS = {
  1: 'Did you know... UWPM hosts many exciting events other than ProdCon? Check them out here:',
  3: GOOD_PRODUCTS_TIP,
  4: GOOD_PRODUCTS_TIP,
};

export function getPortalTip(step, event) {
  if (step === 2) {
    return event?.applications_close_at
      ? `ProdCon application deadline is ${formatDeadline(
          event.applications_close_at,
        )}, don't forget!!`
      : "Keep an eye on the ProdCon application deadline, don't forget!!";
  }
  return PORTAL_TIPS[step];
}

export const PORTAL_MASCOTS = {
  yellow: { src: mascotYellow, width: 210, height: 210 },
  blue: { src: mascotBlue, width: 210, height: 210 },
  pink: { src: mascotPink, width: 210, height: 210 },
  grad: { src: mascotGrad, width: 169, height: 170 },
  pencil: { src: mascotPencil, width: 187, height: 188 },
  mic: { src: mascotMic, width: 185, height: 182 },
};

export const STEP_ICON = { src: stepIcon, width: 46, height: 45 };

export const STEP_FIGURES = {
  1: { src: stepFigure1, width: 226, height: 221 },
  2: { src: stepFigure2, width: 211, height: 205 },
  3: { src: stepFigure3, width: 211, height: 205 },
  4: { src: stepFigure4, width: 211, height: 219 },
};

export const CONFIRMATION_MASCOTS = ['pencil', 'yellow', 'blue'];

export const LANDING_MASCOTS = ['pencil', 'grad', 'mic'];
