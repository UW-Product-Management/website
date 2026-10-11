import { applicationsToCsv } from './applicationsCsv';

const application = {
  fullName: 'Alex Chen',
  email: 'alex@example.com',
  program: 'Business',
  yearOfStudy: '2nd year',
  status: 'accepted',
  submittedAt: '2026-10-01T14:30:00.000Z',
  productIdea: 'A tracker, "for" food',
  greatTeam: 'Trust\nand curiosity',
  mediaConsent: true,
  dietaryRestriction: 'None',
  dietaryDetails: '',
};

describe('applicationsToCsv', () => {
  it('writes a header row followed by one row per application', () => {
    const lines = applicationsToCsv([application]).split('\r\n');

    expect(lines[0]).toMatch(/^Name,Email,Program/);
    expect(lines[1]).toMatch(/^Alex Chen,alex@example.com,Business/);
  });

  it('quotes cells containing commas, quotes or newlines', () => {
    const csv = applicationsToCsv([application]);

    expect(csv).toContain('"A tracker, ""for"" food"');
    expect(csv).toContain('"Trust\nand curiosity"');
  });

  it('neutralises cells that spreadsheets would run as formulas', () => {
    const csv = applicationsToCsv([
      { ...application, productIdea: '=HYPERLINK("http://evil")' },
    ]);

    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
  });
});
