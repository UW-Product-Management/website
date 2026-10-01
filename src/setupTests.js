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

jest.mock('./lib/supabaseClient', () => {
  const mockAuth = {
    signUp: jest.fn(() =>
      Promise.resolve({ data: { user: null, session: null }, error: null }),
    ),
    signInWithPassword: jest.fn(() =>
      Promise.resolve({ data: { user: null, session: null }, error: null }),
    ),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    resend: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    resetPasswordForEmail: jest.fn(() =>
      Promise.resolve({ data: {}, error: null }),
    ),
    updateUser: jest.fn(() =>
      Promise.resolve({ data: { user: null }, error: null }),
    ),
    getSession: jest.fn(() =>
      Promise.resolve({ data: { session: null }, error: null }),
    ),
    getUser: jest.fn(() =>
      Promise.resolve({ data: { user: null }, error: null }),
    ),
    onAuthStateChange: jest.fn(() => ({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    })),
  };

  const client = {
    auth: mockAuth,
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
  };

  return {
    __esModule: true,
    supabase: client,
    default: client,
  };
});
