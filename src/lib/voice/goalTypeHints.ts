/**
 * Small helpers shared between the voice executor and any future "smart"
 * goal-creation surfaces. Centralized so the emoji/type mapping for new
 * goals always stays in sync with the manual GoalsScreen modal.
 */
import type { GoalType } from '../../types/models';

const TYPE_KEYWORDS: Array<{ type: GoalType; words: string[] }> = [
  { type: 'travel', words: ['trip', 'travel', 'vacation', 'tokyo', 'paris', 'japan', 'flight', 'cruise'] },
  { type: 'emergency', words: ['emergency', 'rainy day', 'safety net', 'buffer'] },
  { type: 'education', words: ['tuition', 'school', 'college', 'university', 'course', 'class', 'bootcamp'] },
  { type: 'business', words: ['business', 'startup', 'launch', 'side project', 'company'] },
  { type: 'rent', words: ['rent', 'apartment', 'house', 'mortgage', 'down payment', 'deposit'] },
];

export function goalTypeFromTitle(title: string): GoalType {
  const t = title.toLowerCase();
  for (const { type, words } of TYPE_KEYWORDS) {
    if (words.some((w) => t.includes(w))) return type;
  }
  return 'other';
}

export function emojiForGoalType(type: GoalType): string {
  switch (type) {
    case 'travel':
      return '\u2708\uFE0F';
    case 'emergency':
      return '\uD83D\uDEDF';
    case 'education':
      return '\uD83D\uDCDA';
    case 'business':
      return '\uD83D\uDCC8';
    case 'rent':
      return '\uD83C\uDFE0';
    case 'other':
    default:
      return '\uD83C\uDFAF';
  }
}
