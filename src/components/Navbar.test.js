import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

const renderAt = (path, props) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar {...props} />
    </MemoryRouter>,
  );

describe('Navbar', () => {
  it('renders navigation links with correct hrefs', () => {
    renderAt('/');

    expect(
      screen.getByRole('navigation', { name: /primary navigation/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      '/about',
    );
    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute(
      'href',
      '/events',
    );
    expect(screen.getByRole('link', { name: 'Team' })).toHaveAttribute(
      'href',
      '/team',
    );
  });

  it('marks the link for the current route as the current page', () => {
    renderAt('/team');

    expect(screen.getByRole('link', { name: 'Team' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('prefers the active prop over the current route', () => {
    renderAt('/', { active: 'events' });

    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('moves the current page marker when a link is clicked', () => {
    renderAt('/');

    act(() => {
      userEvent.click(screen.getByRole('link', { name: 'About' }));
    });

    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('uses a custom accessible name when one is given', () => {
    renderAt('/', { ariaLabel: 'Page sections' });

    expect(
      screen.getByRole('navigation', { name: 'Page sections' }),
    ).toBeInTheDocument();
  });
});
