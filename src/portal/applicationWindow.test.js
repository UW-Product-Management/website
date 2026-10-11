import {
  WINDOW_STATES,
  formatDeadline,
  getApplicationWindowState,
  getWindowNotice,
} from './applicationWindow';

const event = {
  applications_open_at: '2026-11-01T05:00:00Z',
  applications_close_at: '2026-11-03T04:59:00Z',
};

describe('getApplicationWindowState', () => {
  it('is upcoming before the window opens', () => {
    expect(
      getApplicationWindowState(event, new Date('2026-10-07T12:00:00Z')),
    ).toBe(WINDOW_STATES.UPCOMING);
  });

  it('is open between open and close', () => {
    expect(
      getApplicationWindowState(event, new Date('2026-11-02T12:00:00Z')),
    ).toBe(WINDOW_STATES.OPEN);
  });

  it('is closed at and after the close time', () => {
    expect(
      getApplicationWindowState(event, new Date('2026-11-03T04:59:00Z')),
    ).toBe(WINDOW_STATES.CLOSED);
  });

  it('is unknown without an event', () => {
    expect(getApplicationWindowState(null)).toBe(WINDOW_STATES.UNKNOWN);
  });
});

describe('formatDeadline', () => {
  it('formats the close time in Waterloo local time', () => {
    expect(formatDeadline('2026-11-03T04:59:00Z')).toBe(
      'November 2nd @ 11:59PM',
    );
  });

  it.each([
    ['2026-12-01T12:00:00Z', 'December 1st @ 7:00AM'],
    ['2026-12-03T12:00:00Z', 'December 3rd @ 7:00AM'],
    ['2026-12-11T12:00:00Z', 'December 11th @ 7:00AM'],
    ['2026-12-22T12:00:00Z', 'December 22nd @ 7:00AM'],
  ])('uses the right ordinal for %s', (iso, expected) => {
    expect(formatDeadline(iso)).toBe(expected);
  });
});

describe('getWindowNotice', () => {
  it('says when applications open before the window', () => {
    expect(getWindowNotice(event, new Date('2026-10-07T12:00:00Z'))).toMatch(
      /Applications open on November 1, 2026/,
    );
  });

  it('says applications closed after the window', () => {
    expect(getWindowNotice(event, new Date('2026-11-04T12:00:00Z'))).toMatch(
      /Applications closed on November 2nd @ 11:59PM/,
    );
  });

  it('is empty while open', () => {
    expect(getWindowNotice(event, new Date('2026-11-02T12:00:00Z'))).toBe('');
  });
});
