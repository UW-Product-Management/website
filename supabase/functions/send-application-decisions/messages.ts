import {
  escapeHtml,
  renderEmailFrame,
  type Message,
} from '../_shared/email.ts';

export type Decision = 'accepted' | 'waitlisted' | 'rejected';

export const DECISIONS: Decision[] = ['accepted', 'waitlisted', 'rejected'];

interface Copy {
  subject: (eventName: string) => string;
  heading: string;
  paragraphs: (eventName: string) => string[];
}

// Event logistics (dates, venue, RSVP deadline) are not stored anywhere, so the
// copy only promises a follow-up. Organizers should review this wording.
const COPY: Record<Decision, Copy> = {
  accepted: {
    subject: (eventName) => `You're in for ${eventName}!`,
    heading: "You're in!",
    paragraphs: (eventName) => [
      `Congratulations! We're excited to let you know that your application to ${eventName} has been accepted.`,
      "We'll email you the schedule and everything you need to know before the event.",
    ],
  },
  waitlisted: {
    subject: (eventName) => `You're on the ${eventName} waitlist`,
    heading: "You're on the waitlist",
    paragraphs: (eventName) => [
      `Thank you for applying to ${eventName}. We received more strong applications than we have spots, so you've been placed on our waitlist.`,
      "If a spot opens up we'll email you right away. You don't need to do anything in the meantime.",
    ],
  },
  rejected: {
    subject: (eventName) => `Your ${eventName} application`,
    heading: 'Thank you for applying',
    paragraphs: (eventName) => [
      `Thank you for applying to ${eventName}. After careful review we're not able to offer you a spot this time.`,
      'We received many more applications than we could accept, and we really appreciate the time you put into yours. We hope to see you at a future UWPM event.',
    ],
  },
};

export function buildDecisionMessage(
  decision: Decision,
  to: string,
  fullName: string,
  eventName: string,
): Message {
  const copy = COPY[decision];
  const name = fullName || 'there';
  const paragraphs = [`Hi ${name},`, ...copy.paragraphs(eventName)];

  const text = [
    ...paragraphs.flatMap((paragraph) => [paragraph, '']),
    '— The ProdCon Team',
  ].join('\n');

  const html = renderEmailFrame(
    copy.heading,
    paragraphs
      .map(
        (paragraph) =>
          `                <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#535361">${escapeHtml(
            paragraph,
          )}</p>`,
      )
      .join('\n'),
  );

  return { to, subject: copy.subject(eventName), html, text };
}
