import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AcceptedPanel from './AcceptedPanel';

function renderPanel(overrides = {}) {
  const props = {
    confirmation: 'pending',
    isWindowOpen: true,
    onSetConfirmation: jest.fn().mockResolvedValue({ data: {}, error: null }),
    ...overrides,
  };
  render(<AcceptedPanel {...props} />);
  return props;
}

describe('AcceptedPanel', () => {
  it('confirms a spot through the acknowledgement dialog', async () => {
    const { onSetConfirmation } = renderPanel();

    fireEvent.click(
      screen.getByRole('button', { name: /confirm acceptance/i }),
    );
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(
      screen.getByRole('dialog').querySelector('button[type="submit"]'),
    );

    await waitFor(() =>
      expect(onSetConfirmation).toHaveBeenCalledWith('confirmed', true),
    );
  });

  it('requires a second click before withdrawing', async () => {
    const { onSetConfirmation } = renderPanel({ confirmation: 'confirmed' });

    fireEvent.click(
      screen.getByRole('button', { name: /withdraw from event/i }),
    );
    expect(onSetConfirmation).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/gives up your spot/i);

    fireEvent.click(
      screen.getByRole('button', { name: /confirm withdrawal/i }),
    );
    await waitFor(() =>
      expect(onSetConfirmation).toHaveBeenCalledWith('withdrawn'),
    );
  });

  it('abandons a withdrawal on cancel', () => {
    const { onSetConfirmation } = renderPanel({ confirmation: 'confirmed' });

    fireEvent.click(
      screen.getByRole('button', { name: /withdraw from event/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onSetConfirmation).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /withdraw from event/i }),
    ).toBeInTheDocument();
  });

  it('surfaces a failed withdrawal', async () => {
    renderPanel({
      confirmation: 'confirmed',
      onSetConfirmation: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'The deadline to confirm your spot has passed.' },
      }),
    });

    fireEvent.click(
      screen.getByRole('button', { name: /withdraw from event/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /confirm withdrawal/i }),
    );

    expect(
      await screen.findByText(/deadline to confirm your spot has passed/i),
    ).toBeInTheDocument();
  });

  it('blocks withdrawal once the window has closed', () => {
    renderPanel({ confirmation: 'confirmed', isWindowOpen: false });

    expect(
      screen.getByRole('button', { name: /withdraw from event/i }),
    ).toBeDisabled();
  });
});
