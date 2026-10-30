import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PastWinners from './PastWinners';

const setTrackMetrics = (track, { scrollLeft, clientWidth, scrollWidth }) => {
  Object.defineProperty(track, 'clientWidth', {
    configurable: true,
    value: clientWidth,
  });
  Object.defineProperty(track, 'scrollWidth', {
    configurable: true,
    value: scrollWidth,
  });
  track.scrollLeft = scrollLeft;
};

beforeEach(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: true });
  Element.prototype.scrollBy = jest.fn();
});

it('renders every winner in a labelled scroll region', () => {
  render(<PastWinners />);

  expect(
    screen.getByRole('heading', { name: /past winners/i }),
  ).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /winning teams/i })).toBeVisible();
  expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(6);
});

it('disables the previous arrow at the start of the track', () => {
  render(<PastWinners />);

  expect(
    screen.getByRole('button', { name: /previous winner/i }),
  ).toBeDisabled();
});

it('scrolls the track forward when the next arrow is clicked', async () => {
  render(<PastWinners />);
  const track = screen.getByRole('region', { name: /winning teams/i });
  const next = screen.getByRole('button', { name: /next winner/i });
  setTrackMetrics(track, {
    scrollLeft: 0,
    clientWidth: 500,
    scrollWidth: 2000,
  });
  window.dispatchEvent(new Event('resize'));
  await waitFor(() => expect(next).toBeEnabled());

  userEvent.click(next);

  expect(track.scrollBy).toHaveBeenCalledWith(
    expect.objectContaining({ left: expect.any(Number) }),
  );
});

it('disables the next arrow once the track reaches the end', async () => {
  render(<PastWinners />);
  const track = screen.getByRole('region', { name: /winning teams/i });
  setTrackMetrics(track, {
    scrollLeft: 1500,
    clientWidth: 500,
    scrollWidth: 2000,
  });
  track.dispatchEvent(new Event('scroll'));

  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /previous winner/i }),
    ).toBeEnabled(),
  );
  expect(screen.getByRole('button', { name: /next winner/i })).toBeDisabled();
});
