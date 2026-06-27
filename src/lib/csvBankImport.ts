import type { TransactionCategory } from '../types/models';
import { categoryFromKnownMerchant } from './merchantCategoryMap';

export type CsvImportRow = {
  date: string;
  description: string;
  amount: number;
  category: TransactionCategory;
  isIncome: boolean;
  categoryLabel?: string;
};

/**
 * Normalize a free-form description so fingerprints stay stable across imports.
 * - lowercase
 * - trim
 * - collapse internal whitespace
 * - strip stray punctuation that banks toggle between exports (commas, *, #)
 */
export function normalizeTransactionDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/[\u00a0\t]/g, ' ')
    .replace(/[*#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deterministic transaction fingerprint for duplicate detection across statements.
 * Format: `YYYY-MM-DD|normalized description|amount.toFixed(2)`.
 *
 * Income vs expense is intentionally NOT part of the key — if two imports disagree
 * on sign, we still want to treat them as the same line item from the bank.
 */
export function buildTransactionFingerprint(input: {
  date: string;
  description: string;
  amount: number;
}): string {
  const isoDate = (input.date ?? '').slice(0, 10);
  const desc = normalizeTransactionDescription(input.description ?? '');
  const abs = Math.abs(Number(input.amount) || 0).toFixed(2);
  return `${isoDate}|${desc}|${abs}`;
}

function decodePdfEscapes(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{3})/g, (_m, oct) => String.fromCharCode(parseInt(oct, 8)));
}

/**
 * Best-effort extraction for text-based PDFs:
 * pulls literal strings from common Tj/TJ operators and joins into lines.
 * Not perfect, but helps many bank statements without adding heavy native deps.
 */
function extractTextFromPdf(raw: string): string {
  if (!raw.includes('%PDF')) return raw;
  const out: string[] = [];

  const tj = /\(([^)]{1,400})\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = tj.exec(raw))) {
    const text = decodePdfEscapes(m[1]).replace(/\s+/g, ' ').trim();
    if (text) out.push(text);
  }

  const tjArray = /\[(.*?)\]\s*TJ/gms;
  while ((m = tjArray.exec(raw))) {
    const chunk = m[1];
    const pieces = [...chunk.matchAll(/\(([^)]{1,400})\)/g)]
      .map((x) => decodePdfEscapes(x[1]).trim())
      .filter(Boolean);
    if (pieces.length) out.push(pieces.join(' '));
  }

  // Fallback: capture parenthesized strings that look like dates/money/merchant text.
  if (out.length === 0) {
    const loose = [...raw.matchAll(/\(([^)]{2,220})\)/g)]
      .map((x) => decodePdfEscapes(x[1]).trim())
      .filter((x) => /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\$?\d[\d,]*(\.\d{1,2})?)/.test(x));
    out.push(...loose);
  }

  return out.join('\n');
}

/** Split CSV respecting double-quoted fields */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (c === ',' && !inQ) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function normHeader(s: string): string {
  return s.replace(/^\ufeff/, '').trim().toLowerCase();
}

function findCol(headers: string[], patterns: RegExp[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = normHeader(headers[i]);
    if (patterns.some((p) => p.test(h))) return i;
  }
  return -1;
}

function parseMoney(s: string): number | null {
  const t = s.replace(/[$£€,\s]/g, '').replace(/[()]/g, '-').trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.abs(n) : null;
}

function parseDateCell(s: string, defaultYear?: number): string | null {
  const t = s.trim();
  if (!t) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const usNoYear = /^(\d{1,2})\/(\d{1,2})$/.exec(t);
  if (usNoYear && Number.isFinite(defaultYear)) {
    const mm = usNoYear[1].padStart(2, '0');
    const dd = usNoYear[2].padStart(2, '0');
    return `${String(defaultYear)}-${mm}-${dd}`;
  }
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
  if (us) {
    const mm = us[1].padStart(2, '0');
    const dd = us[2].padStart(2, '0');
    return `${us[3]}-${mm}-${dd}`;
  }
  const dmy = /^(\d{1,2})-(\d{1,2})-(\d{4})/.exec(t);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${mm}-${dd}`;
  }
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return null;
}

const RULES: { cat: TransactionCategory; re: RegExp }[] = [
  { cat: 'rent', re: /\b(rent|mortgage|landlord|lease|apartment)\b/i },
  { cat: 'groceries', re: /\b(grocery|groceries|whole foods|trader|safeway|kroger|aldi|costco food|walmart market)\b/i },
  { cat: 'dining', re: /\b(restaurant|cafe|coffee|starbucks|doordash|uber eats|grubhub|dining|bar|pub)\b/i },
  { cat: 'transport', re: /\b(uber|lyft|gas|fuel|shell|chevron|parking|metro|transit|train|flight)\b/i },
  { cat: 'subscriptions', re: /\b(netflix|spotify|hulu|subscription|saas|apple\.com\/bill|google storage|github)\b/i },
  { cat: 'shopping', re: /\b(amazon|target|ebay|etsy|mall|retail|clothing|apparel)\b/i },
  { cat: 'health', re: /\b(pharmacy|cvs|walgreens|doctor|hospital|dental|gym|fitness|health)\b/i },
  { cat: 'income', re: /\b(payroll|direct dep|salary|paycheck|dividend|interest earned|refund)\b/i },
];

export function autoCategorizeFromText(description: string, bankCategory?: string): TransactionCategory {
  const fromMerchant = categoryFromKnownMerchant(description, bankCategory);
  if (fromMerchant) return fromMerchant;
  const blob = `${description} ${bankCategory ?? ''}`;
  for (const { cat, re } of RULES) {
    if (re.test(blob)) return cat;
  }
  return 'other';
}

export function parseBankCsv(text: string): { rows: CsvImportRow[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    errors.push('CSV needs a header row and at least one data row.');
    return { rows: [], errors };
  }

  const header = splitCsvLine(lines[0]).map(normHeader);
  const iDate = findCol(header, [/date|posted|transaction date|posting date/]);
  const iDesc = findCol(header, [/description|memo|details|narrative|payee|merchant/]);
  const iAmt = findCol(header, [/^amount$/, /transaction amount|amt/]);
  const iDebit = findCol(header, [/debit|withdrawal|payment/]);
  const iCredit = findCol(header, [/credit|deposit/]);
  const iType = findCol(header, [/type$/]);
  const iCat = findCol(header, [/category|type.*category/]);

  if (iDate < 0 || iDesc < 0) {
    errors.push('Could not find Date and Description columns. Use headers like "Date", "Description", "Amount".');
    return { rows: [], errors };
  }

  const rows: CsvImportRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = splitCsvLine(lines[li]);
    if (cells.every((c) => !c)) continue;
    const dateStr = cells[iDate] ?? '';
    const desc = (cells[iDesc] ?? '').replace(/\s+/g, ' ').trim();
    const ymd = parseDateCell(dateStr);
    if (!ymd) {
      errors.push(`Row ${li + 1}: bad date "${dateStr}"`);
      continue;
    }
    if (!desc) {
      errors.push(`Row ${li + 1}: missing description`);
      continue;
    }

    let amount: number | null = null;
    let isIncome = false;
    if (iAmt >= 0) {
      const raw = cells[iAmt] ?? '';
      const n = parseMoney(raw);
      if (n == null) {
        errors.push(`Row ${li + 1}: bad amount`);
        continue;
      }
      amount = n;
      const t = (iType >= 0 ? cells[iType] ?? '' : '').toLowerCase();
      if (t.includes('credit') || t.includes('deposit') || t.includes('income')) isIncome = true;
      else if (t.includes('debit') || t.includes('payment') || t.includes('sale')) isIncome = false;
      else if (raw.trim().startsWith('-')) isIncome = false;
      else if (autoCategorizeFromText(desc) === 'income') isIncome = true;
    } else if (iDebit >= 0 || iCredit >= 0) {
      const debit = iDebit >= 0 ? parseMoney(cells[iDebit] ?? '') : null;
      const credit = iCredit >= 0 ? parseMoney(cells[iCredit] ?? '') : null;
      if (credit && credit > 0) {
        amount = credit;
        isIncome = true;
      } else if (debit && debit > 0) {
        amount = debit;
        isIncome = false;
      } else {
        errors.push(`Row ${li + 1}: need Amount or Debit/Credit`);
        continue;
      }
    } else {
      errors.push('CSV needs an Amount column or Debit+Credit columns.');
      return { rows: [], errors };
    }

    const bankCat = iCat >= 0 ? cells[iCat]?.trim() : undefined;
    const cat = isIncome ? 'income' : autoCategorizeFromText(desc, bankCat);
    rows.push({
      date: ymd,
      description: desc.slice(0, 500),
      amount,
      category: cat,
      isIncome,
      categoryLabel: bankCat && bankCat.length > 0 ? bankCat.slice(0, 120) : undefined,
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push('No valid rows parsed.');
  }
  return { rows, errors };
}

function parseMoneyLoose(raw: string): number | null {
  if (!raw) return null;
  const sign = raw.includes('-') || /\(([^)]+)\)/.test(raw) ? -1 : 1;
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(/,/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.abs(n) * sign;
}

function inferIncomeFromText(desc: string, signedAmount: number): boolean {
  if (signedAmount < 0) return false;
  const t = desc.toLowerCase();
  if (/\b(payroll|salary|paycheck|deposit|refund|credit|income|interest|cashout|payment received)\b/.test(t)) {
    return true;
  }
  if (/\b(purchase|subscription|rent|bill|grocery|groceries|ride|uber|netflix|spotify|target|amazon|sephora|walmart)\b/.test(t)) {
    return false;
  }
  return false;
}

/** Parse loose statement text (PDF extracted text / OCR text / irregular rows). */
export function parseMessyBankText(text: string): { rows: CsvImportRow[]; errors: string[] } {
  const rows: CsvImportRow[] = [];
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const dateRe = /(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}-[A-Za-z]{3}-\d{2,4})/;
  const amountRe = /[-(]?\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\)?/g;
  const statementYearMatch = text.match(/statement\s+period[\s\S]{0,120}\b(\d{4})\b/i);
  const inferredYear = statementYearMatch ? Number(statementYearMatch[1]) : undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 6) continue;
    const dateM = line.match(dateRe);
    if (!dateM) continue;
    const ymd = parseDateCell(dateM[1], inferredYear);
    if (!ymd) continue;

    const amounts = line.match(amountRe) ?? [];
    if (amounts.length === 0) {
      errors.push(`Line ${i + 1}: no amount found`);
      continue;
    }
    // In statement tables, the last numeric token is often running balance.
    // Prefer the prior token as transaction amount when available.
    const amountToken = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[amounts.length - 1];
    const signed = parseMoneyLoose(amountToken);
    if (signed == null) {
      errors.push(`Line ${i + 1}: invalid amount`);
      continue;
    }

    let desc = line.replace(dateM[1], '').replace(amountToken, '').replace(/\s+/g, ' ').trim();
    if (!desc) desc = `Imported transaction ${i + 1}`;
    const isIncome = inferIncomeFromText(desc, signed);
    const amount = Math.abs(signed);
    const cat = isIncome ? 'income' : autoCategorizeFromText(desc);

    rows.push({
      date: ymd,
      description: desc.slice(0, 500),
      amount,
      category: cat,
      isIncome,
    });
  }

  if (rows.length === 0) {
    errors.push('Could not detect transaction lines from this file text.');
  }
  return { rows, errors };
}

/** Primary parser: CSV first; falls back to loose/dirty statement parsing. */
export function parseBankData(text: string): { rows: CsvImportRow[]; errors: string[] } {
  const normalized = extractTextFromPdf(text);
  const csv = parseBankCsv(normalized);
  if (csv.rows.length > 0) return csv;
  const messy = parseMessyBankText(normalized);
  if (messy.rows.length > 0) return messy;
  return {
    rows: [],
    errors: [...csv.errors, ...messy.errors],
  };
}
