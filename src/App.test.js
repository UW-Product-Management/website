import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders the supplied UW PM hero artwork', async () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole('region', { name: /uw pm introduction/i }),
  ).toBeInTheDocument();

  expect(
    screen.getByRole('heading', {
      name: /fostering the creative product management community/i,
    }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /learn more/i })).toHaveAttribute(
    'href',
    '/events',
  );
  expect(screen.getByRole('link', { name: /join our team/i })).toHaveAttribute(
    'href',
    'https://linktr.ee/uwaterloopm',
  );
  expect(
    screen.getByRole('heading', { name: /our impact/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: /our community has worked at/i }),
  ).toBeInTheDocument();
  expect(screen.getByAltText('Microsoft')).toBeInTheDocument();
});

test('redirects unauthenticated users trying to access protected portal routes to login', async () => {
  render(
    <MemoryRouter initialEntries={['/portal/dashboard']}>
      <App />
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole('heading', { name: /welcome back!/i }),
  ).toBeInTheDocument();
});
