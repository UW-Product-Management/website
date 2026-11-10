import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmSpotDialog from './ConfirmSpotDialog';

function renderDialog(overrides = {}) {
  const props = {
    onConfirm: jest.fn().mockResolvedValue(undefined),
    onClose: jest.fn(),
    ...overrides,
  };
  render(<ConfirmSpotDialog {...props} />);
  return props;
}

describe('ConfirmSpotDialog', () => {
  it('states the in-person and reimbursement terms', () => {
    renderDialog();

    expect(
      screen.getByRole('heading', { name: /before you confirm your spot/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/there is no virtual option/i)).toBeInTheDocument();
    expect(screen.getByText(/november 14, 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/no travel reimbursements/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /view on google maps/i }),
    ).toHaveAttribute('href', 'https://maps.app.goo.gl/uMVW9YhPGMsHzzMq9');
  });

  it('keeps confirmation disabled until the terms are acknowledged', async () => {
    const { onConfirm } = renderDialog();

    const confirm = screen.getByRole('button', { name: /confirm acceptance/i });
    expect(confirm).toBeDisabled();

    userEvent.click(screen.getByRole('checkbox'));
    expect(confirm).toBeEnabled();

    userEvent.click(confirm);
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });

  it('shows the error the confirmation returns', async () => {
    renderDialog({
      onConfirm: jest.fn().mockResolvedValue('The deadline has passed.'),
    });

    userEvent.click(screen.getByRole('checkbox'));
    userEvent.click(
      screen.getByRole('button', { name: /confirm acceptance/i }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The deadline has passed.',
    );
  });

  it('closes once the confirmation succeeds', async () => {
    const { onClose } = renderDialog();

    userEvent.click(screen.getByRole('checkbox'));
    userEvent.click(
      screen.getByRole('button', { name: /confirm acceptance/i }),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('stays open when the confirmation fails', async () => {
    const { onClose } = renderDialog({
      onConfirm: jest.fn().mockResolvedValue('The deadline has passed.'),
    });

    userEvent.click(screen.getByRole('checkbox'));
    userEvent.click(
      screen.getByRole('button', { name: /confirm acceptance/i }),
    );

    await screen.findByRole('alert');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Go back and on Escape', () => {
    const { onClose } = renderDialog();

    userEvent.click(screen.getByRole('button', { name: /go back/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
