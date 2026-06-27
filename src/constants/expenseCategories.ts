import type { TransactionCategory } from '../types/models';

export type ExpenseCategoryConfig = {
  id: TransactionCategory;
  label: string;
  isFixedCost: boolean;
};

export const EXPENSE_CATEGORY_OPTIONS: ExpenseCategoryConfig[] = [
  { id: 'groceries', label: 'Groceries', isFixedCost: false },
  { id: 'dining', label: 'Dining', isFixedCost: false },
  { id: 'transport', label: 'Transport', isFixedCost: false },
  { id: 'rent', label: 'Rent', isFixedCost: true },
  { id: 'subscriptions', label: 'Subscriptions', isFixedCost: false },
  { id: 'shopping', label: 'Shopping', isFixedCost: false },
  { id: 'health', label: 'Health', isFixedCost: false },
  { id: 'other', label: 'Other', isFixedCost: false },
];

const VALID_KEYS = new Set<TransactionCategory>([
  'rent',
  'groceries',
  'dining',
  'transport',
  'subscriptions',
  'shopping',
  'income',
  'savings',
  'health',
  'other',
]);

/**
 * Free-form bank/CSV category labels we want to fold into our canonical keys
 * so cap matching never drops spend into "other" silently.
 */
const ALIAS_MAP: Record<string, TransactionCategory> = {
  food: 'dining',
  restaurant: 'dining',
  restaurants: 'dining',
  'eating out': 'dining',
  takeout: 'dining',
  takeaway: 'dining',
  coffee: 'dining',
  cafe: 'dining',
  grocery: 'groceries',
  supermarket: 'groceries',
  rideshare: 'transport',
  uber: 'transport',
  lyft: 'transport',
  gas: 'transport',
  fuel: 'transport',
  travel: 'transport',
  flights: 'transport',
  utilities: 'rent',
  housing: 'rent',
  mortgage: 'rent',
  apparel: 'shopping',
  clothing: 'shopping',
  retail: 'shopping',
  pharmacy: 'health',
  medical: 'health',
  doctor: 'health',
  gym: 'health',
  fitness: 'health',
  streaming: 'subscriptions',
  saas: 'subscriptions',
  software: 'subscriptions',
  payroll: 'income',
  salary: 'income',
  paycheck: 'income',
  deposit: 'income',
  interest: 'income',
  refund: 'income',
};

/**
 * Normalize a stored / parsed category string into one of our canonical
 * `TransactionCategory` keys. Lowercases, trims, collapses whitespace, and
 * folds common bank labels (Food, Rideshare, Utilities…) into our schema.
 * Falls back to `'other'` for anything unrecognized.
 */
export function normalizeCategoryKey(value: string | null | undefined): TransactionCategory {
  if (!value) return 'other';
  const cleaned = String(value).toLowerCase().replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'other';
  if (VALID_KEYS.has(cleaned as TransactionCategory)) {
    return cleaned as TransactionCategory;
  }
  if (ALIAS_MAP[cleaned]) return ALIAS_MAP[cleaned];
  for (const [alias, target] of Object.entries(ALIAS_MAP)) {
    if (cleaned.includes(alias)) return target;
  }
  return 'other';
}
