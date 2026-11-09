import {
  escapeHtml,
  renderEmailFrame,
  type Message,
} from '../_shared/email.ts';

export type Decision = 'accepted' | 'waitlisted' | 'rejected';

export const DECISIONS: Decision[] = ['accepted', 'waitlisted', 'rejected'];

const DISCORD_INVITE_URL = 'https://discord.gg/EwkG8T9eff';
const TEAM_FORM_URL = 'https://docs.google.com/forms/u/1/d/e/1FAIpQLScXDfyw2-SJvgZH706SxyCeifZDfYbKkZhq2NzWDM8bdWSrDg/viewform?usp=send_form';

const PARAGRAPH_STYLE = 'margin:0 0 20px;font-size:16px;line-height:1.6;color:#535361';
const HIGHLIGHT_STYLE = 'background-color:#fff3a3';

const p = (inner: string) =>
  `                <p style="${PARAGRAPH_STYLE}">${inner}</p>`;

const link = (href: string, label: string) =>
  `<a href="${href}" style="color:#f05c5b;text-decoration:underline">${label}</a>`;

interface Copy {
  subject: (eventName: string) => string;
  heading: string;
  // The plain-text body, and the HTML body too unless bodyHtml overrides it.
  paragraphs: (eventName: string) => string[];
  // Accepted needs bold, a highlight and links, which escapeHtml would eat.
  bodyHtml?: (eventName: string, name: string) => string;
}

// Event logistics (dates, venue, RSVP deadline) are not stored anywhere, so the
// copy only promises a follow-up. Organizers should review this wording.
const COPY: Record<Decision, Copy> = {
  accepted: {
    subject: (eventName) => `You're in for ${eventName}!`,
    heading: "You're in!",
    paragraphs: (eventName) => [
      `Congratulations! You're officially in for ${eventName}! 🎉 We're excited to have you join us!`,
      'Please note that ProdCon is in person this year and we will not be offering travel reimbursements.',
      'To confirm your spot and prepare for the event, please complete the following:',
      '1. Join our Discord server',
      `Please join the ProdCon Discord Server (${DISCORD_INVITE_URL}) to accept your invitation and stay updated on event announcements and logistics. Please set your Discord nickname as your name.`,
      '2. Form your teams',
      'Teams should consist of 4 members (teams of 3 are also acceptable, but 4 is preferred to allow for better workload distribution and collaboration).',
      `Please fill out this Team Formation Form (${TEAM_FORM_URL}) with your team details.`,
      "If you don't have a team yet, no worries! You can connect with other participants and form teams through the designated channel in our Discord server.",
      `We look forward to seeing you all at ${eventName}! Best of luck, and get ready for an exciting day of product management!`,
    ],
    bodyHtml: (eventName, name) =>
      [
        p(`Hi ${escapeHtml(name)},`),
        p(
          `<strong>Congratulations! You're officially in for ${escapeHtml(
            eventName,
          )}! 🎉</strong> We're excited to have you join us!`,
        ),
        p(
          `<span style="${HIGHLIGHT_STYLE}">Please note that ProdCon is <strong>in person</strong> this year and we will <strong>not</strong> be offering travel reimbursements.</span>`,
        ),
        p(
          'To confirm your spot and prepare for the event, please complete the following:',
        ),
        p(
          `<strong>1. Join our Discord server</strong><br />Please join the ${link(
            DISCORD_INVITE_URL,
            'ProdCon Discord Server',
          )} to accept your invitation and stay updated on event announcements and logistics. Please set your Discord nickname as your name.`,
        ),
        p(
          `<strong>2. Form your teams</strong><br />Teams should consist of 4 members (teams of 3 are also acceptable, but 4 is preferred to allow for better workload distribution and collaboration).<br /><br />Please fill out this ${link(
            TEAM_FORM_URL,
            'Team Formation Form',
          )} with your team details.<br /><br />If you don't have a team yet, no worries! You can connect with other participants and form teams through the designated channel in our Discord server.`,
        ),
        p(
          `We look forward to seeing you all at ${escapeHtml(
            eventName,
          )}! Best of luck, and get ready for an exciting day of product management!`,
        ),
      ].join('\n'),
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
    copy.bodyHtml
      ? copy.bodyHtml(eventName, name)
      : paragraphs
          .map(
            (paragraph) =>
              `                <p style="${PARAGRAPH_STYLE}">${escapeHtml(
                paragraph,
              )}</p>`,
          )
          .join('\n'),
  );

  return { to, subject: copy.subject(eventName), html, text };
}
