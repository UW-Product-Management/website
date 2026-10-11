export const WINDOW_STATES = {
  OPEN: 'open',
  UPCOMING: 'upcoming',
  CLOSED: 'closed',
  UNKNOWN: 'unknown',
};

const DEADLINE_TIME_ZONE = 'America/Toronto';

export function getApplicationWindowState(event, now = new Date()) {
  if (!event?.applications_open_at || !event?.applications_close_at) {
    return WINDOW_STATES.UNKNOWN;
  }
  if (now < new Date(event.applications_open_at)) return WINDOW_STATES.UPCOMING;
  if (now >= new Date(event.applications_close_at)) return WINDOW_STATES.CLOSED;
  return WINDOW_STATES.OPEN;
}

function ordinal(day) {
  const lastTwo = day % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${day}th`;
  return `${day}${{ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th'}`;
}

export function formatDeadline(isoTimestamp) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DEADLINE_TIME_ZONE,
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(new Date(isoTimestamp));
  const part = (type) => parts.find((p) => p.type === type)?.value ?? '';

  return `${part('month')} ${ordinal(Number(part('day')))} @ ${part(
    'hour',
  )}:${part('minute')}${part('dayPeriod')}`;
}

export function formatWindowStart(isoTimestamp) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DEADLINE_TIME_ZONE,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoTimestamp));
}

export function getWindowNotice(event, now = new Date()) {
  const state = getApplicationWindowState(event, now);
  if (state === WINDOW_STATES.UPCOMING) {
    return `Applications open on ${formatWindowStart(
      event.applications_open_at,
    )}. You can come back then to start your application.`;
  }
  if (state === WINDOW_STATES.CLOSED) {
    return `Applications closed on ${formatDeadline(
      event.applications_close_at,
    )}. New answers can no longer be saved.`;
  }
  return '';
}
