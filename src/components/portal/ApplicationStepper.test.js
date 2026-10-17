import { render, screen } from '@testing-library/react';
import ApplicationStepper, { APPLICATION_STEPS } from './ApplicationStepper';

describe('ApplicationStepper', () => {
  it('lists every step and marks only the current one', () => {
    render(<ApplicationStepper currentStep={3} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(APPLICATION_STEPS.length);
    APPLICATION_STEPS.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    expect(screen.getByText('Consent').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByText('Register').closest('li')).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('shows step numbers for current and upcoming steps only', () => {
    render(<ApplicationStepper currentStep={2} />);

    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
