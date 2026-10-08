import { fireEvent, render, screen } from '@testing-library/react';
import {
  PasswordField,
  PortalCheckbox,
  PortalSelect,
  PortalTextarea,
} from './PortalField';

describe('PasswordField', () => {
  it('reveals and hides the password when the toggle is pressed', () => {
    render(<PasswordField id="pw" label="Password" required />);

    const input = screen.getByLabelText(/^password/i);
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(input).toHaveAttribute('type', 'password');
  });
});

describe('PortalSelect', () => {
  it('renders the placeholder and each option', () => {
    render(
      <PortalSelect
        id="program"
        label="Program"
        placeholder="Select your program"
        options={['Business', 'Engineering']}
        required
      />,
    );

    expect(screen.getByLabelText(/program/i)).toBeRequired();
    expect(
      screen.getByRole('option', { name: 'Select your program' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Business' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Engineering' }),
    ).toBeInTheDocument();
  });
});

describe('PortalTextarea', () => {
  it('shows the character counter when provided', () => {
    render(<PortalTextarea id="answer" label="Answer" counter="3/200" />);

    expect(screen.getByLabelText('Answer')).toBeInTheDocument();
    expect(screen.getByText('3/200')).toBeInTheDocument();
  });
});

describe('PortalCheckbox', () => {
  it('toggles when its label text is clicked', () => {
    render(<PortalCheckbox id="agree">I agree to the terms</PortalCheckbox>);

    fireEvent.click(screen.getByText('I agree to the terms'));
    expect(screen.getByLabelText('I agree to the terms')).toBeChecked();
  });
});
