import { templateForGroup } from './emailTemplates';

const event = { name: 'ProdCon 2026', confirm_by: '2026-11-20T04:59:00Z' };

describe('templateForGroup', () => {
  it('writes a confirmation reminder with the deadline in Waterloo time', () => {
    const { subject, body } = templateForGroup('accepted_unconfirmed', event);

    expect(subject).toMatch(/confirm your spot/i);
    expect(body).toContain('{{name}}');
    expect(body).toContain('ProdCon 2026');
    expect(body).toMatch(/November 19, 2026/);
    expect(body).toMatch(/11:59/);
  });

  it('asks for a reply as soon as possible when there is no deadline', () => {
    const { body } = templateForGroup('accepted_unconfirmed', {
      name: 'ProdCon 2026',
      confirm_by: null,
    });

    expect(body).toMatch(/as soon as possible/i);
  });

  it('has no template for other groups', () => {
    expect(templateForGroup('draft', event)).toBeNull();
  });
});
