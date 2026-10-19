import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import About from './About';
import { CLUB_VALUES } from '../data/clubValues';

const renderAbout = () =>
  render(
    <MemoryRouter initialEntries={['/about']}>
      <About />
    </MemoryRouter>,
  );

describe('About page', () => {
  it('renders the hero, mission and values sections', () => {
    renderAbout();

    expect(
      screen.getByRole('heading', { level: 1, name: 'About Us' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'About UW PM' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Mission' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Values' }),
    ).toBeInTheDocument();
  });

  it('renders a card for every club value', () => {
    renderAbout();

    CLUB_VALUES.forEach(({ title }) => {
      expect(
        screen.getByRole('heading', { level: 3, name: title }),
      ).toBeInTheDocument();
    });
  });

  it('marks About as the current page and renders the footer', () => {
    renderAbout();

    expect(
      screen.getByRole('navigation', { name: /primary navigation/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
