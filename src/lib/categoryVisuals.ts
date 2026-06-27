import type { Transaction, TransactionCategory } from '../types/models';
import { CATEGORY_COLORS, CATEGORY_EMOJI_MAP } from '../theme/tokens';
import { categoryFromKnownMerchant } from './merchantCategoryMap';

const ID_TO_CANONICAL: Record<TransactionCategory, string> = {
  dining: 'Dining',
  groceries: 'Groceries',
  rent: 'Rent',
  transport: 'Transport',
  subscriptions: 'Subscriptions',
  shopping: 'Shopping',
  health: 'Health',
  income: 'Income',
  savings: 'Other',
  other: 'Other',
};

export function canonicalCategoryLabel(tx: Transaction): string {
  const fallbackByDescription = (): string | null => {
    const guessed = categoryFromKnownMerchant(tx.description);
    if (guessed) {
      // Display-only upgrade: airline/trip merchants should read as Travel in UI.
      const d = tx.description.toLowerCase();
      if (
        d.includes('airline') ||
        d.includes('southwest') ||
        d.includes('delta') ||
        d.includes('united') ||
        d.includes('jetblue') ||
        d.includes('airbnb') ||
        d.includes('hotel') ||
        d.includes('hilton') ||
        d.includes('marriott')
      ) {
        return 'Travel';
      }
      return ID_TO_CANONICAL[guessed] ?? 'Other';
    }
    return null;
  };

  if (tx.categoryLabel?.trim()) {
    const t = tx.categoryLabel.trim();
    if (CATEGORY_COLORS[t] !== undefined) return t;
    const lower = t.toLowerCase();
    for (const [, canon] of Object.entries(ID_TO_CANONICAL)) {
      if (canon.toLowerCase() === lower) return canon;
    }
    return t;
  }
  const base = ID_TO_CANONICAL[tx.category] ?? 'Other';
  const isUnsetOrOther = !tx.category || tx.category === 'other' || base === 'Other';
  if (isUnsetOrOther) {
    return fallbackByDescription() ?? base;
  }
  return base;
}

export function categoryEmojiForTx(tx: Transaction): string {
  const label = canonicalCategoryLabel(tx);
  return CATEGORY_EMOJI_MAP[label] ?? CATEGORY_EMOJI_MAP.Other;
}

export function categoryColorForTx(tx: Transaction): string {
  const label = canonicalCategoryLabel(tx);
  return CATEGORY_COLORS[label] ?? CATEGORY_COLORS.Other;
}
