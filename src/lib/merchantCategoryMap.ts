import type { TransactionCategory } from '../types/models';

type Entry = { keyword: string; category: TransactionCategory };

/**
 * Known merchant / brand substrings (lowercase). Longer keys are matched first
 * so e.g. "southwest airlines" wins over "southwest".
 */
const ENTRIES: Entry[] = [
  { keyword: 'southwest airlines', category: 'transport' },
  { keyword: 'american airlines', category: 'transport' },
  { keyword: 'united airlines', category: 'transport' },
  { keyword: 'delta air lines', category: 'transport' },
  { keyword: 'jetblue', category: 'transport' },
  { keyword: 'alaska airlines', category: 'transport' },
  { keyword: 'spirit airlines', category: 'transport' },
  { keyword: 'frontier airlines', category: 'transport' },
  { keyword: 'hawaiian airlines', category: 'transport' },
  { keyword: 'british airways', category: 'transport' },
  { keyword: 'lufthansa', category: 'transport' },
  { keyword: 'air canada', category: 'transport' },
  { keyword: 'amtrak', category: 'transport' },
  { keyword: 'uber trip', category: 'transport' },
  { keyword: 'lyft ride', category: 'transport' },
  { keyword: 'panera bread', category: 'dining' },
  { keyword: 'chipotle', category: 'dining' },
  { keyword: 'starbucks', category: 'dining' },
  { keyword: 'dunkin', category: 'dining' },
  { keyword: 'mcdonald', category: 'dining' },
  { keyword: 'subway', category: 'dining' },
  { keyword: 'taco bell', category: 'dining' },
  { keyword: 'wendy', category: 'dining' },
  { keyword: 'burger king', category: 'dining' },
  { keyword: 'olive garden', category: 'dining' },
  { keyword: 'applebees', category: 'dining' },
  { keyword: 'chick-fil-a', category: 'dining' },
  { keyword: 'shake shack', category: 'dining' },
  { keyword: 'sweetgreen', category: 'dining' },
  { keyword: 'doordash', category: 'dining' },
  { keyword: 'uber eats', category: 'dining' },
  { keyword: 'grubhub', category: 'dining' },
  { keyword: 'instacart', category: 'groceries' },
  { keyword: 'whole foods', category: 'groceries' },
  { keyword: 'trader joe', category: 'groceries' },
  { keyword: 'kroger', category: 'groceries' },
  { keyword: 'safeway', category: 'groceries' },
  { keyword: 'publix', category: 'groceries' },
  { keyword: 'aldi', category: 'groceries' },
  { keyword: 'costco', category: 'groceries' },
  { keyword: 'sephora', category: 'shopping' },
  { keyword: 'ulta beauty', category: 'shopping' },
  { keyword: 'nordstrom', category: 'shopping' },
  { keyword: 'macys', category: 'shopping' },
  { keyword: "macy's", category: 'shopping' },
  { keyword: 'target', category: 'shopping' },
  { keyword: 'best buy', category: 'shopping' },
  { keyword: 'home depot', category: 'shopping' },
  { keyword: 'lowes', category: 'shopping' },
  { keyword: "lowe's", category: 'shopping' },
  { keyword: 'ikea', category: 'shopping' },
  { keyword: 'amazon', category: 'shopping' },
  { keyword: 'ebay', category: 'shopping' },
  { keyword: 'etsy', category: 'shopping' },
  { keyword: 'netflix', category: 'subscriptions' },
  { keyword: 'spotify', category: 'subscriptions' },
  { keyword: 'hulu', category: 'subscriptions' },
  { keyword: 'disney+', category: 'subscriptions' },
  { keyword: 'youtube premium', category: 'subscriptions' },
  { keyword: 'apple.com/bill', category: 'subscriptions' },
  { keyword: 'openai', category: 'subscriptions' },
  { keyword: 'github', category: 'subscriptions' },
  { keyword: 'dropbox', category: 'subscriptions' },
  { keyword: 'cvs', category: 'health' },
  { keyword: 'walgreens', category: 'health' },
  { keyword: 'rite aid', category: 'health' },
  { keyword: 'planet fitness', category: 'health' },
  { keyword: 'la fitness', category: 'health' },
  { keyword: 'shell', category: 'transport' },
  { keyword: 'exxon', category: 'transport' },
  { keyword: 'chevron', category: 'transport' },
  { keyword: 'walmart', category: 'shopping' },
  { keyword: 'marriott', category: 'other' },
  { keyword: 'hilton', category: 'other' },
  { keyword: 'hyatt', category: 'other' },
  { keyword: 'airbnb', category: 'other' },
  { keyword: 'booking.com', category: 'other' },
  { keyword: 'southwest', category: 'transport' },
];

const SORTED = [...ENTRIES].sort((a, b) => b.keyword.length - a.keyword.length);

export function categoryFromKnownMerchant(description: string, bankCategory?: string): TransactionCategory | null {
  const blob = `${description} ${bankCategory ?? ''}`.toLowerCase();
  for (const { keyword, category } of SORTED) {
    if (blob.includes(keyword)) return category;
  }
  return null;
}
