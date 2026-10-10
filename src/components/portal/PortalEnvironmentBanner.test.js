import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PortalEnvironmentBanner from './PortalEnvironmentBanner';

const local = {
  name: 'local',
  isLocal: true,
  isProduction: false,
  mailpitUrl: 'http://127.0.0.1:54324',
  studioUrl: 'http://127.0.0.1:54323',
};
const staging = {
  name: 'staging',
  isLocal: false,
  isProduction: false,
  mailpitUrl: '',
  studioUrl: '',
};
const production = { name: 'production', isLocal: false, isProduction: true };

describe('PortalEnvironmentBanner', () => {
  it('renders nothing in production', () => {
    const { container } = render(
      <PortalEnvironmentBanner environment={production} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('announces the local environment with links to Mailpit and Studio', () => {
    render(<PortalEnvironmentBanner environment={local} />);

    expect(screen.getByRole('status')).toHaveTextContent(/local environment/i);
    expect(screen.getByRole('link', { name: /open mailpit/i })).toHaveAttribute(
      'href',
      'http://127.0.0.1:54324',
    );
    expect(screen.getByRole('link', { name: /open studio/i })).toHaveAttribute(
      'href',
      'http://127.0.0.1:54323',
    );
  });

  it('warns that staging is test data without local tool links', () => {
    render(<PortalEnvironmentBanner environment={staging} />);

    expect(screen.getByRole('status')).toHaveTextContent(/test data only/i);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('collapses to a pill that can be reopened', () => {
    render(<PortalEnvironmentBanner environment={local} />);

    fireEvent.click(
      screen.getByRole('button', { name: /collapse environment notice/i }),
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /local environment. show details/i }),
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
