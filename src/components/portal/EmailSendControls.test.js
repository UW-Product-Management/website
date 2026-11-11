import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmailSendControls from './EmailSendControls';
import {
  createCustomEmail,
  getCustomEmailMode,
  sendCustomEmailBatch,
  sendTestCustomEmail,
} from '../../services/portalApi';

jest.mock('../../services/portalApi');

const recipients = [
  { userId: 'u1', email: 'ada@example.com', group: 'draft' },
  { userId: 'u2', email: 'bo@example.com', group: 'draft' },
];

const otherRecipients = [
  { userId: 'u3', email: 'cy@example.com', group: 'rejected' },
  { userId: 'u4', email: 'di@example.com', group: 'rejected' },
];

const controls = (props = {}) => (
  <EmailSendControls
    eventId="evt-1"
    recipients={recipients}
    subject="Finish your application"
    body="Hi {{name}}"
    {...props}
  />
);

const renderControls = (props = {}) => render(controls(props));

const batch = (sent, failed, remaining, dropped = 0) => ({
  data: { sent, failed, remaining, dropped },
  error: null,
});

async function confirmAndSend(count = 2) {
  await screen.findByText(/captured in mailpit/i);
  userEvent.type(screen.getByLabelText(/to confirm/i), `SEND ${count}`);
  userEvent.click(
    screen.getByRole('button', { name: `Send to ${count} people` }),
  );
}

describe('EmailSendControls', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getCustomEmailMode.mockResolvedValue({
      data: { mode: 'local' },
      error: null,
    });
    createCustomEmail.mockResolvedValue({
      data: { campaignId: 'c1', total: 2 },
      error: null,
    });
  });

  it('shows the email environment', async () => {
    renderControls();

    expect(await screen.findByText(/captured in mailpit/i)).toBeInTheDocument();
  });

  it('explains when the email service cannot be reached', async () => {
    getCustomEmailMode.mockResolvedValue({
      data: null,
      error: { code: 'send_failed', message: 'Sending failed.' },
    });
    renderControls();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /email service is not reachable/i,
    );
  });

  it('blocks sending while the email environment is unknown', async () => {
    getCustomEmailMode.mockResolvedValue({
      data: null,
      error: { code: 'send_failed', message: 'Sending failed.' },
    });
    renderControls();
    await screen.findByRole('alert');

    userEvent.type(screen.getByLabelText(/to confirm/i), 'SEND 2');

    expect(
      screen.getByRole('button', { name: 'Send to 2 people' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Send test to myself' }),
    ).toBeDisabled();
  });

  it('keeps send disabled until the exact confirmation is typed', async () => {
    renderControls();
    await screen.findByText(/captured in mailpit/i);
    const send = screen.getByRole('button', { name: 'Send to 2 people' });
    const confirmation = screen.getByLabelText(/to confirm/i);
    expect(send).toBeDisabled();

    userEvent.type(confirmation, 'SEND 1');
    expect(send).toBeDisabled();

    userEvent.clear(confirmation);
    userEvent.type(confirmation, 'SEND 2');
    expect(send).toBeEnabled();
  });

  it('clears the confirmation when the recipients change', async () => {
    const { rerender } = renderControls();
    await screen.findByText(/captured in mailpit/i);
    userEvent.type(screen.getByLabelText(/to confirm/i), 'SEND 2');

    rerender(controls({ recipients: otherRecipients }));

    expect(screen.getByLabelText(/to confirm/i)).toHaveValue('');
    expect(
      screen.getByRole('button', { name: 'Send to 2 people' }),
    ).toBeDisabled();
  });

  it('disables sending without a subject and message', async () => {
    renderControls({ subject: ' ' });
    await screen.findByText(/captured in mailpit/i);
    userEvent.type(screen.getByLabelText(/to confirm/i), 'SEND 2');

    expect(
      screen.getByRole('button', { name: 'Send to 2 people' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Send test to myself' }),
    ).toBeDisabled();
  });

  it('sends a test email to the organizer', async () => {
    sendTestCustomEmail.mockResolvedValue({
      data: { to: 'olive@example.com' },
      error: null,
    });
    renderControls();
    await screen.findByText(/captured in mailpit/i);

    userEvent.click(
      screen.getByRole('button', { name: 'Send test to myself' }),
    );

    expect(sendTestCustomEmail).toHaveBeenCalledWith({
      subject: 'Finish your application',
      body: 'Hi {{name}}',
    });
    expect(
      await screen.findByText(/sent to olive@example.com/i),
    ).toBeInTheDocument();
  });

  it('creates the email, then sends batches until none remain', async () => {
    const onSent = jest.fn();
    sendCustomEmailBatch
      .mockResolvedValueOnce(batch(1, 0, 1))
      .mockResolvedValueOnce(batch(1, 0, 0));
    renderControls({ onSent });

    await confirmAndSend();

    expect(
      await screen.findByText('Email sent to 2 people.'),
    ).toBeInTheDocument();
    expect(createCustomEmail).toHaveBeenCalledWith('evt-1', {
      subject: 'Finish your application',
      body: 'Hi {{name}}',
      recipientIds: ['u1', 'u2'],
      confirmation: 'SEND 2',
    });
    expect(sendCustomEmailBatch).toHaveBeenCalledTimes(2);
    expect(onSent).toHaveBeenCalled();
  });

  it('reports recipients that could not be delivered', async () => {
    sendCustomEmailBatch.mockResolvedValueOnce(batch(1, 1, 0));
    renderControls();

    await confirmAndSend();

    expect(
      await screen.findByText(
        /email sent to 1 person\. 1 couldn't be delivered/i,
      ),
    ).toBeInTheDocument();
  });

  it('reports recipients whose delivery was never confirmed', async () => {
    sendCustomEmailBatch.mockResolvedValueOnce(batch(1, 0, 0, 1));
    renderControls();

    await confirmAndSend();

    expect(
      await screen.findByText(/1 could not be confirmed as delivered/i),
    ).toBeInTheDocument();
  });

  it('resumes the same email after a send stops partway', async () => {
    sendCustomEmailBatch
      .mockResolvedValueOnce(batch(1, 0, 1))
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'send_failed', message: 'Sending failed.' },
      })
      .mockResolvedValueOnce(batch(1, 0, 0));
    renderControls();

    await confirmAndSend();
    userEvent.click(
      await screen.findByRole('button', { name: 'Resume sending (1 left)' }),
    );

    expect(
      await screen.findByText('Email sent to 2 people.'),
    ).toBeInTheDocument();
    expect(createCustomEmail).toHaveBeenCalledTimes(1);
    expect(sendCustomEmailBatch).toHaveBeenLastCalledWith('c1');
  });

  it('starts over instead of resuming once the message changes', async () => {
    sendCustomEmailBatch.mockResolvedValueOnce({
      data: null,
      error: { code: 'send_failed', message: 'Sending failed.' },
    });
    const { rerender } = renderControls();
    await confirmAndSend();
    await screen.findByRole('button', { name: /resume sending/i });

    rerender(controls({ subject: 'A different email' }));

    expect(
      screen.queryByRole('button', { name: /resume sending/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Send to 2 people' }),
    ).toBeInTheDocument();
  });

  it('pauses when a batch makes no progress', async () => {
    sendCustomEmailBatch.mockResolvedValue(batch(0, 0, 2));
    renderControls();

    await confirmAndSend();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /paused with 2 left/i,
    );
    expect(sendCustomEmailBatch).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Resume sending (2 left)' }),
    ).toBeInTheDocument();
  });

  it('tells the page while a send is in progress', async () => {
    const onBusyChange = jest.fn();
    sendCustomEmailBatch.mockResolvedValueOnce(batch(2, 0, 0));
    renderControls({ onBusyChange });

    await confirmAndSend();

    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
    expect(onBusyChange).toHaveBeenCalledWith(true);
  });
});
