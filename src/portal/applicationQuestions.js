export const MAX_WORDS = 150;

export const QUESTIONS = [
  {
    field: 'productIdea',
    id: 'question-product',
    label: 'What product or service do you wish existed, and why?',
  },
  {
    field: 'greatTeam',
    id: 'question-team',
    label: 'What makes a great product team?',
  },
  {
    field: 'productExperience',
    id: 'question-experience',
    label:
      "What is one product you've worked on or contributed to, and what was your role?",
  },
];

export function countWords(value) {
  const trimmed = value.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}
