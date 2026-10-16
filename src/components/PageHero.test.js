import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PageHero from './PageHero';

const renderHero = (props) =>
  render(
    <MemoryRouter>
      <PageHero
        active="about"
        title="About Us"
        ariaLabel="About UW PM hero"
        {...props}
      />
    </MemoryRouter>,
  );

describe('PageHero', () => {
  it('renders the title as the page heading inside a labelled region', () => {
    renderHero();

    expect(
      screen.getByRole('region', { name: /about uw pm hero/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'About Us' }),
    ).toBeInTheDocument();
  });

  it('links the brand mark back to the home page', () => {
    renderHero();

    expect(screen.getByRole('link', { name: /uw pm home/i })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('renders the navigation with the active page marked', () => {
    renderHero();

    expect(
      screen.getByRole('navigation', { name: /primary navigation/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('omits the navigation when showNav is false', () => {
    renderHero({ showNav: false });

    expect(
      screen.queryByRole('navigation', { name: /primary navigation/i }),
    ).not.toBeInTheDocument();
  });

  it('renders children between the title and the navigation', () => {
    renderHero({ children: <p>Hero banner copy</p> });

    expect(screen.getByText('Hero banner copy')).toBeInTheDocument();
  });
});
