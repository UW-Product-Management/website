const COLUMNS = [
  ['Name', (a) => a.fullName],
  ['Email', (a) => a.email],
  ['Program', (a) => a.program],
  ['Year of study', (a) => a.yearOfStudy],
  ['Status', (a) => a.status],
  ['Submitted at', (a) => a.submittedAt],
  ['Product idea', (a) => a.productIdea],
  ['Great team', (a) => a.greatTeam],
  ['Media consent', (a) => (a.mediaConsent ? 'Yes' : 'No')],
  ['Dietary restriction', (a) => a.dietaryRestriction],
  ['Dietary details', (a) => a.dietaryDetails],
];

// Spreadsheet apps execute cells that start with these characters as formulas.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeCell(value) {
  const text = String(value ?? '');
  const safe = FORMULA_PREFIX.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function applicationsToCsv(applications) {
  const header = COLUMNS.map(([label]) => escapeCell(label)).join(',');
  const rows = applications.map((application) =>
    COLUMNS.map(([, read]) => escapeCell(read(application))).join(','),
  );
  return [header, ...rows].join('\r\n');
}
