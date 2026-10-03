// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import React from 'react';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

jest.mock('gsap', () => ({
  gsap: {
    registerPlugin: jest.fn(),
    timeline: jest.fn(() => ({
      to: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      fromTo: jest.fn().mockReturnThis(),
    })),
    to: jest.fn(),
    from: jest.fn(),
    fromTo: jest.fn(),
    set: jest.fn(),
    context: jest.fn((fn) => {
      if (typeof fn === 'function') fn();
      return { revert: jest.fn() };
    }),
  },
}));

jest.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    register: jest.fn(),
    create: jest.fn(),
    refresh: jest.fn(),
    getAll: jest.fn(() => []),
  },
}));

jest.mock(
  'swiper/modules',
  () => ({
    Mousewheel: jest.fn(),
    Navigation: jest.fn(),
    Pagination: jest.fn(),
  }),
  { virtual: true },
);

jest.mock(
  'swiper/react',
  () => ({
    Swiper: ({ children }) =>
      require('react').createElement(
        'div',
        { 'data-testid': 'swiper-mock' },
        children,
      ),
    SwiperSlide: ({ children }) =>
      require('react').createElement(
        'div',
        { 'data-testid': 'swiper-slide-mock' },
        children,
      ),
  }),
  { virtual: true },
);

jest.mock('swiper/css', () => ({}), { virtual: true });
