import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Team from './Team';

const renderTeam = () =>
  render(
    <MemoryRouter initialEntries={['/team']}>
      <Team />
    </MemoryRouter>,
  );

describe('Team page', () => {
  it('renders the hero, values and team sections', () => {
    renderTeam();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Team' }),
    ).toBeInTheDocument();
    expect(screen.getByAltText('UW PM team')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /our values/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /our team/i }),
    ).toBeInTheDocument();
  });

  it('groups the team into subteams', () => {
    renderTeam();

    ['Internal', 'Marketing', 'Design', 'Engineering', 'Finance'].forEach(
      (subteam) => {
        expect(
          screen.getByRole('heading', { level: 3, name: subteam }),
        ).toBeInTheDocument();
      },
    );
  });

  it('marks Team as the current page and renders the footer', () => {
    renderTeam();

    expect(
      screen.getByRole('navigation', { name: /primary navigation/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
