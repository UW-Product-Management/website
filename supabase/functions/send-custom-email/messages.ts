import {
  escapeHtml,
  renderEmailFrame,
  type Message,
} from '../_shared/email.ts';

export const NAME_PLACEHOLDER = '{{name}}';

const paragraphsOf = (body: string) =>
  body
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

export function buildCustomMessage(
  to: string,
  fullName: string,
  subject: string,
  body: string,
): Message {
  const personalized = body.split(NAME_PLACEHOLDER).join(fullName || 'there');
  const paragraphs = paragraphsOf(personalized);

  const text = [
    ...paragraphs.flatMap((paragraph) => [paragraph, '']),
    '— The ProdCon Team',
  ].join('\n');

  const html = renderEmailFrame(
    subject,
    paragraphs
      .map(
        (paragraph) =>
          `                <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#535361">${escapeHtml(
            paragraph,
          ).replace(/\n/g, '<br />')}</p>`,
      )
      .join('\n'),
  );

  return { to, subject, html, text };
}
