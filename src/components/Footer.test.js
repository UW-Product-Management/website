import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );

describe('Footer', () => {
  it('renders the explore links to each page', () => {
    renderFooter();
    const explore = within(screen.getByRole('navigation', { name: 'Explore' }));

    expect(explore.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(explore.getByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      '/about',
    );
    expect(explore.getByRole('link', { name: 'Events' })).toHaveAttribute(
      'href',
      '/events',
    );
    expect(explore.getByRole('link', { name: 'Team' })).toHaveAttribute(
      'href',
      '/team',
    );
  });

  it('opens social links in a new tab', () => {
    renderFooter();
    const follow = within(screen.getByRole('navigation', { name: 'Follow' }));

    const socials = [
      ['Instagram', 'https://www.instagram.com/uwaterloopm/'],
      ['LinkedIn', 'https://ca.linkedin.com/company/uw-pm'],
      ['Facebook', 'https://www.facebook.com/uwaterloopm/'],
    ];
    socials.forEach(([name, href]) => {
      const link = follow.getByRole('link', { name });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('renders the club tagline and contact email', () => {
    renderFooter();

    expect(
      screen.getByText(/fostering the creative product management community/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'uwpmwaterloo@gmail.com' }),
    ).toHaveAttribute('href', 'mailto:uwpmwaterloo@gmail.com');
  });
});
