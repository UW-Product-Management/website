import mascotYellow from '../images/mascot-yellow.svg';
import mascotBlue from '../images/mascot.svg';
import mascotPink from '../images/mascot-pink.svg';
import mascotGrad from '../images/home/mascot-grad.png';
import mascotPencil from '../images/home/mascot-pencil.png';
import mascotMic from '../images/home/mascot-mic.png';

export const INSTAGRAM = {
  handle: '@uwaterloopm',
  href: 'https://www.instagram.com/uwaterloopm/',
};

const GOOD_PRODUCTS_TIP =
  'Good products solve problems. Great products make you wonder how you lived without them.';

export const PORTAL_TIPS = {
  1: 'Did you know... UWPM hosts many exciting events other than ProdCon? Check them out here:',
  2: "ProdCon application deadline is November 2nd @ 11:59PM, don't forget!!",
  3: GOOD_PRODUCTS_TIP,
  4: GOOD_PRODUCTS_TIP,
};

export const PORTAL_MASCOTS = {
  yellow: { src: mascotYellow, width: 210, height: 210 },
  blue: { src: mascotBlue, width: 210, height: 210 },
  pink: { src: mascotPink, width: 210, height: 210 },
  grad: { src: mascotGrad, width: 169, height: 170 },
  pencil: { src: mascotPencil, width: 187, height: 188 },
  mic: { src: mascotMic, width: 185, height: 182 },
};

export const CONFIRMATION_MASCOTS = ['pencil', 'yellow', 'blue'];

export const LANDING_MASCOTS = ['pencil', 'grad', 'mic'];
