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
    subject: (eventName) => `Congratulations! You're in for ${eventName}!`,
    heading: "You're officially in!",
    paragraphs: (eventName) => [
      `Congratulations! You're officially in for ${eventName}! 🎉 We're excited to have you join us!`,

      'Please note that ProdCon is in person this year and we will not be offering travel reimbursements. To confirm your spot and prepare for the event, please complete the following:',

      '1. Join our Discord server',

      'Please join the ProdCon Discord Server to accept your invitation and stay updated on event announcements and logistics. Please set your Discord nickname as your name.',

      '2. Form your teams',

      'Teams should consist of 4 members (teams of 3 are also acceptable, but 4 is preferred to allow for better workload distribution and collaboration).',

      'Please fill out this Team Formation Form with your team details.',

      "If you don't have a team yet, no worries! You can connect with other participants and form teams through the designated channel in our Discord server.",

      'We look forward to seeing you all at ProdCon! Best of luck, and get ready for an exciting day of product management!',
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

  const discordUrl = 'https://discord.gg/FndnN7YwY';
  const teamFormUrl = 'https://forms.gle/tvmfLN1tsQKDyzJZA';

  const text = [
    ...paragraphs.flatMap((paragraph) => {
      let content = paragraph;

      if (decision === 'accepted') {
        content = content
          .replace(
            'ProdCon Discord Server',
            `ProdCon Discord Server (${discordUrl})`,
          )
          .replace(
            'Team Formation Form',
            `Team Formation Form (${teamFormUrl})`,
          );
      }

      return [content, ''];
    }),
    '— The ProdCon Team',
  ].join('\n');

  const htmlParagraphs = paragraphs.map((paragraph, index) => {
    let content = escapeHtml(paragraph);
    const isStep = decision === 'accepted' && /^[1-2]\. /.test(paragraph);

    if (decision === 'accepted') {
      if (index === 1) {
        const opening = escapeHtml(
          `Congratulations! You're officially in for ${eventName}! 🎉`,
        );
        content = content.replace(opening, `<strong>${opening}</strong>`);
      }

      content = content
        .replace(
          'ProdCon Discord Server',
          `<a href="${discordUrl}" style="color:#2563eb;text-decoration:underline">ProdCon Discord Server</a>`,
        )
        .replace(
          'Team Formation Form',
          `<a href="${teamFormUrl}" style="color:#2563eb;text-decoration:underline">Team Formation Form</a>`,
        );
    }

    return `
      <p style="margin:0 0 ${
        isStep ? 6 : 20
      }px;font-size:16px;line-height:1.6;color:#535361">
        ${isStep ? `<strong>${content}</strong>` : content}
      </p>
    `;
  });

  const html = renderEmailFrame(copy.heading, htmlParagraphs.join('\n'));

  return { to, subject: copy.subject(eventName), html, text };
}
