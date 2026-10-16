import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Events from './Events';

const renderEvents = () =>
  render(
    <MemoryRouter initialEntries={['/events']}>
      <Events />
    </MemoryRouter>,
  );

describe('Events page', () => {
  it('renders the hero and the events sections', () => {
    renderEvents();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /past winners/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /past events/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /posters from past uwpm events/i }),
    ).toBeInTheDocument();
  });

  it('marks Events as the current page and renders the footer', () => {
    renderEvents();

    expect(
      screen.getByRole('navigation', { name: /primary navigation/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
