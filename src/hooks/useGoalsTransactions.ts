import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { colors } from '../theme/colors';
import {
  mapGoalFromDb,
  mapMonthlySnapshotFromDb,
  mapStatementImportFromDb,
  mapTransactionFromDb,
  type MonthlyFinancialSnapshot,
  type StatementImport,
} from '../lib/supabaseMappers';
import type { Goal, SpendingCategorySummary, Transaction, TransactionCategory } from '../types/models';
import {
  EXPENSE_CATEGORY_OPTIONS,
  normalizeCategoryKey,
} from '../constants/expenseCategories';
import {
  buildTransactionFingerprint,
  parseBankCsv,
  type CsvImportRow,
} from '../lib/csvBankImport';
import {
  monthKeyFromDate,
  monthLabelFromKey,
  refreshMonthlySnapshots,
} from '../lib/monthlySnapshots';
import { buildSpendingPatternSignals, type SpendingPatternSignals } from '../lib/spendingPatterns';
import { applySpendingChartPresentation } from '../lib/spendingDisplay';
import {
  buildHistoricalContext,
  currentMonthKey,
  longMonthLabelFromMonthKey,
  monthKeyShort,
  suggestedCapForCategory,
  type HistoricalContext,
} from '../lib/historicalContext';
import { onVoiceDataChanged } from '../lib/voice/dataRefreshBus';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type TxRow = Database['public']['Tables']['transactions']['Row'];
type TxLedgerRow = Pick<TxRow, 'amount' | 'is_income'>;
type CapRow = Database['public']['Tables']['category_budget_caps']['Row'];
type StatementImportRow = Database['public']['Tables']['statement_imports']['Row'];
type MonthlySnapshotRow = Database['public']['Tables']['monthly_financial_snapshots']['Row'];

export interface ImportSummary {
  imported: number;
  duplicates: number;
  monthLabel: string | null;
  importId: string | null;
  message: string;
}

function buildImportSummaryMessage(opts: {
  imported: number;
  duplicates: number;
  monthLabel: string | null;
}): string {
  const { imported, duplicates, monthLabel } = opts;
  const forMonth = monthLabel ? ` for ${monthLabel}` : '';
  if (imported === 0 && duplicates > 0) {
    return 'No new transactions added. This statement appears to have already been imported.';
  }
  if (imported > 0 && duplicates > 0) {
    return `Imported ${imported} new transactions${forMonth}. Skipped ${duplicates} duplicates from a previous import.`;
  }
  if (imported > 0) {
    return `Imported ${imported} new transactions${forMonth}.`;
  }
  return 'No transactions were imported.';
}

function buildSpendingFromMonth(monthTx: Transaction[]): SpendingCategorySummary[] {
  const expenses = monthTx.filter((t) => !t.isIncome);
  const byCat = new Map<string, number>();
  for (const t of expenses) {
    // Defensive normalization — even if a stray legacy row slips past the
    // mapper, we still want it to fall under a canonical cap key.
    const key = normalizeCategoryKey(t.category);
    byCat.set(key, (byCat.get(key) ?? 0) + Math.abs(t.amount));
  }
  const total = [...byCat.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  return [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, val]) => ({
      id: key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      total: val,
      percentage: Math.round((val / total) * 100),
      color: colors.textDisabled,
    }));
}

/**
 * Suggested caps per category. Strict two-layer logic:
 *   1. Current month spend (>= $10) when available — uses live current-month
 *      transactions only.
 *   2. Otherwise the average of the last three *prior* calendar months,
 *      sourced exclusively from historical pattern transactions
 *      (current month is filtered out before averaging).
 *
 * Returns one entry per canonical category; 0 means "no suggestion".
 */
function buildSuggestedCaps(
  monthTx: Transaction[],
  patternTx: Transaction[],
  now = new Date(),
): Record<string, number> {
  const out: Record<string, number> = {};

  // Current-month spend per category (canonical keys).
  const currentMonth = new Map<string, number>();
  for (const t of monthTx) {
    if (t.isIncome) continue;
    const key = normalizeCategoryKey(t.category);
    currentMonth.set(key, (currentMonth.get(key) ?? 0) + Math.abs(t.amount));
  }

  // Prior 3-month totals per category — STRICTLY excludes current month.
  const curMonthShort = monthKeyShort(now);
  const priorMonthKeys: string[] = [];
  for (let offset = 1; offset <= 3; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    priorMonthKeys.push(monthKeyShort(d));
  }
  const priorByCatPerMonth = new Map<string, Map<string, number>>();
  for (const t of patternTx) {
    if (t.isIncome) continue;
    const mk = t.date.slice(0, 7);
    if (mk === curMonthShort) continue;
    if (!priorMonthKeys.includes(mk)) continue;
    const cat = normalizeCategoryKey(t.category);
    const bucket = priorByCatPerMonth.get(cat) ?? new Map<string, number>();
    bucket.set(mk, (bucket.get(mk) ?? 0) + Math.abs(t.amount));
    priorByCatPerMonth.set(cat, bucket);
  }

  for (const c of EXPENSE_CATEGORY_OPTIONS) {
    const id = c.id;
    const current = currentMonth.get(id) ?? 0;
    const monthsForCat = priorByCatPerMonth.get(id);
    // Average across the *expected* 3 prior months (empty months count as 0)
    // so an isolated $40 in March doesn't get treated as a representative cap.
    let prior3Avg = 0;
    if (monthsForCat && monthsForCat.size > 0) {
      const sum = priorMonthKeys.reduce((acc, mk) => acc + (monthsForCat.get(mk) ?? 0), 0);
      prior3Avg = sum / 3;
    }
    out[id] = suggestedCapForCategory({
      currentMonthSpend: current,
      prior3MonthAvg: prior3Avg,
    });
  }

  return out;
}

function monthRange(d = new Date()): { start: string; end: string } {
  const y = d.getFullYear();
  const m = d.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${y}-${pad(m + 1)}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
  return { start, end };
}

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type TxDayRow = Pick<TxRow, 'date' | 'amount' | 'is_income'>;

function rolling7DayNetFromRows(rows: TxDayRow[], now = new Date()): { labels: string[]; values: number[] } {
  const byDate = new Map<string, number>();
  for (const r of rows) {
    const signed = r.is_income ? Math.abs(Number(r.amount)) : -Math.abs(Number(r.amount));
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + signed);
  }
  const labels: string[] = [];
  const values: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    values.push(byDate.get(localYmd(d)) ?? 0);
  }
  return { labels, values };
}

function rolling7DayRange(now = new Date()): { start: string; end: string } {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { start: localYmd(start), end: localYmd(end) };
}

function daysAgoYmd(days: number, now = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return localYmd(d);
}

function last6CalendarMonthsRange(now = new Date()): { start: string; end: string } {
  const endY = now.getFullYear();
  const endM = now.getMonth();
  const lastDay = new Date(endY, endM + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  const end = `${endY}-${pad(endM + 1)}-${pad(lastDay)}`;
  const startD = new Date(endY, endM - 5, 1);
  const start = `${startD.getFullYear()}-${pad(startD.getMonth() + 1)}-01`;
  return { start, end };
}

function last6MonthNetFromRows(rows: TxDayRow[], now = new Date()): { labels: string[]; values: number[] } {
  const labels: string[] = [];
  const values: number[] = [];
  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${y}-${pad(m + 1)}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
    let net = 0;
    for (const r of rows) {
      if (r.date >= start && r.date <= end) {
        net += r.is_income ? Math.abs(Number(r.amount)) : -Math.abs(Number(r.amount));
      }
    }
    values.push(net);
  }
  return { labels, values };
}

/**
 * Prefer monthly_financial_snapshots for the cashflow chart so it stays
 * consistent with the rest of the app, but fall back to live transaction
 * aggregation when a month doesn't have a snapshot yet (e.g. unmigrated
 * projects or freshly created accounts).
 */
function last6MonthNetFromSnapshotsOrRows(
  rows: TxDayRow[],
  snapshots: MonthlyFinancialSnapshot[],
  now = new Date(),
): { labels: string[]; values: number[] } {
  const snapshotByMonth = new Map(snapshots.map((s) => [s.month, s] as const));
  const labels: string[] = [];
  const values: number[] = [];
  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthKey = `${y}-${pad(m + 1)}-01`;
    const snapshot = snapshotByMonth.get(monthKey);
    if (snapshot) {
      values.push(snapshot.surplus);
      continue;
    }
    const start = `${y}-${pad(m + 1)}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
    let net = 0;
    for (const r of rows) {
      if (r.date >= start && r.date <= end) {
        net += r.is_income ? Math.abs(Number(r.amount)) : -Math.abs(Number(r.amount));
      }
    }
    values.push(net);
  }
  return { labels, values };
}

function sumSignedLedger(rows: { amount: number | string; is_income: boolean }[]): number {
  let net = 0;
  for (const r of rows) {
    const a = Math.abs(Number(r.amount));
    net += r.is_income ? a : -a;
  }
  return net;
}

function sumMonthIncomeExpense(rows: { amount: number | string; is_income: boolean }[]) {
  let income = 0;
  let expenses = 0;
  for (const r of rows) {
    const a = Math.abs(Number(r.amount));
    if (r.is_income) income += a;
    else expenses += a;
  }
  return { income, expenses };
}

/**
 * Heuristic for a single human-readable "month label" attached to an import.
 * Prefers the most common month across parsed rows so a March-with-spillover
 * statement still reads as "March 2026".
 */
function dominantMonthLabel(rows: CsvImportRow[]): { monthKey: string | null; label: string | null } {
  if (rows.length === 0) return { monthKey: null, label: null };
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = monthKeyFromDate(r.date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let bestKey: string | null = null;
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }
  return { monthKey: bestKey, label: bestKey ? monthLabelFromKey(bestKey) : null };
}

interface ImportBatchInput {
  userId: string;
  rows: CsvImportRow[];
  fileName: string | null;
  institution: string | null;
  accountName: string | null;
}

interface ImportBatchResult {
  error: Error | null;
  imported: number;
  duplicates: number;
  summary: ImportSummary;
}

/**
 * Owns the full import lifecycle:
 *   1. Create a `statement_imports` session.
 *   2. Stamp each row with `import_id` + fingerprint.
 *   3. Upsert with `onConflict: user_id,fingerprint, ignoreDuplicates: true`
 *      so duplicate transactions across imports stay collapsed to one row.
 *   4. Count how many rows actually landed by re-reading by import_id.
 *   5. Update the session row with `transaction_count` / `duplicate_count`.
 *   6. Recompute every affected `monthly_financial_snapshots` row.
 *
 * The function is defensive: a missing `statement_imports` table (legacy
 * project) falls back to a plain insert so users aren't blocked from importing.
 */
async function runImportBatch({
  userId,
  rows,
  fileName,
  institution,
  accountName,
}: ImportBatchInput): Promise<ImportBatchResult> {
  if (rows.length === 0) {
    return {
      error: new Error('No rows to import'),
      imported: 0,
      duplicates: 0,
      summary: {
        imported: 0,
        duplicates: 0,
        monthLabel: null,
        importId: null,
        message: 'No transactions were imported.',
      },
    };
  }

  const sortedDates = rows.map((r) => r.date).sort();
  const statementStart = sortedDates[0];
  const statementEnd = sortedDates[sortedDates.length - 1];
  const { monthKey: dominantMonth, label: dominantLabel } = dominantMonthLabel(rows);

  // Session row first so transactions can FK into it.
  const importInsert = await supabase
    .from('statement_imports')
    .insert({
      user_id: userId,
      file_name: fileName ?? null,
      source: 'csv',
      institution,
      account_name: accountName,
      statement_start_date: statementStart,
      statement_end_date: statementEnd,
      month_label: dominantLabel,
    })
    .select('id')
    .single();

  const importErr = importInsert.error;
  const importId: string | null = (importInsert.data as { id: string } | null)?.id ?? null;

  // Build payload rows with fingerprints up front so we can dedupe both server-
  // side (unique index) and client-side (to compute the duplicate counter).
  const payloads = rows.map((r) => {
    const fingerprint = buildTransactionFingerprint({
      date: r.date,
      description: r.description,
      amount: r.amount,
    });
    return {
      user_id: userId,
      date: r.date,
      description: r.description,
      amount: r.amount,
      category: r.category,
      is_income: r.isIncome,
      category_label: r.categoryLabel ?? null,
      import_id: importId,
      fingerprint,
      source: 'csv',
      institution,
      account_name: accountName,
    };
  });

  const allFingerprints = [...new Set(payloads.map((p) => p.fingerprint))];

  // Check which fingerprints already exist BEFORE the upsert so we can report
  // an accurate duplicate count even when the DB silently skips them.
  let existingFingerprints = new Set<string>();
  {
    const { data: existing, error: existingErr } = await supabase
      .from('transactions')
      .select('fingerprint')
      .eq('user_id', userId)
      .in('fingerprint', allFingerprints);
    if (!existingErr && existing) {
      existingFingerprints = new Set(
        (existing as { fingerprint: string | null }[])
          .map((r) => r.fingerprint)
          .filter((v): v is string => Boolean(v)),
      );
    }
  }

  const newPayloads = payloads.filter((p) => !existingFingerprints.has(p.fingerprint));
  const duplicateCount = payloads.length - newPayloads.length;

  if (importErr) {
    // statement_imports table missing — fall back to plain insert path so the
    // user is never blocked, and skip session bookkeeping.
    const fallback = await fallbackInsertWithoutImport({ userId, payloads: newPayloads });
    if (fallback.error) {
      return {
        error: fallback.error,
        imported: 0,
        duplicates: duplicateCount,
        summary: {
          imported: 0,
          duplicates: duplicateCount,
          monthLabel: dominantLabel,
          importId: null,
          message: fallback.error.message,
        },
      };
    }
    void refreshSnapshotsForRows(userId, rows);
    return {
      error: null,
      imported: fallback.imported,
      duplicates: duplicateCount,
      summary: {
        imported: fallback.imported,
        duplicates: duplicateCount,
        monthLabel: dominantLabel,
        importId: null,
        message: buildImportSummaryMessage({
          imported: fallback.imported,
          duplicates: duplicateCount,
          monthLabel: dominantLabel,
        }),
      },
    };
  }

  let imported = 0;
  let extraDuplicates = 0;
  if (newPayloads.length > 0) {
    const chunk = 120;
    for (let i = 0; i < newPayloads.length; i += chunk) {
      const slice = newPayloads.slice(i, i + chunk);
      // We dedupe client-side (see existingFingerprints above), so a plain
      // insert is enough. We deliberately avoid upsert(..., { onConflict })
      // here because the unique index on (user_id, fingerprint) is partial
      // (`WHERE fingerprint IS NOT NULL`) and PostgREST does not emit the
      // matching WHERE clause needed for Postgres to infer that index,
      // causing the whole batch to error out.
      const { error: insertErr } = await supabase.from('transactions').insert(slice);
      if (insertErr) {
        const code = (insertErr as { code?: string }).code;
        // 42703 = undefined_column — the transactions table is on the legacy
        // schema (no fingerprint/source/import_id columns). Restart this slice
        // without the new columns and continue with subsequent slices the
        // same way.
        if (code === '42703') {
          const legacySlice = slice.map((p) => ({
            user_id: p.user_id,
            date: p.date,
            description: p.description,
            amount: p.amount,
            category: p.category,
            is_income: p.is_income,
            category_label: p.category_label,
          }));
          const { error: legacyErr } = await supabase
            .from('transactions')
            .insert(legacySlice);
          if (legacyErr) {
            return handleImportFailure({
              err: legacyErr,
              importId,
              imported,
              duplicates: duplicateCount + extraDuplicates,
              dominantLabel,
            });
          }
          imported += slice.length;
          continue;
        }
        // 23505 = unique_violation: a concurrent import already wrote the
        // same fingerprint. Re-attempt this slice with the offending rows
        // filtered out by re-querying server-side fingerprints.
        if (code === '23505') {
          const sliceFingerprints = slice.map((p) => p.fingerprint);
          const { data: nowExisting } = await supabase
            .from('transactions')
            .select('fingerprint')
            .eq('user_id', userId)
            .in('fingerprint', sliceFingerprints);
          const nowSet = new Set(
            ((nowExisting ?? []) as { fingerprint: string | null }[])
              .map((r) => r.fingerprint)
              .filter((v): v is string => Boolean(v)),
          );
          const retrySlice = slice.filter((p) => !nowSet.has(p.fingerprint));
          extraDuplicates += slice.length - retrySlice.length;
          if (retrySlice.length > 0) {
            const { error: retryErr } = await supabase
              .from('transactions')
              .insert(retrySlice);
            if (retryErr) {
              return handleImportFailure({
                err: retryErr,
                importId,
                imported,
                duplicates: duplicateCount + extraDuplicates,
                dominantLabel,
              });
            }
            imported += retrySlice.length;
          }
          continue;
        }
        return handleImportFailure({
          err: insertErr,
          importId,
          imported,
          duplicates: duplicateCount + extraDuplicates,
          dominantLabel,
        });
      }
      imported += slice.length;
    }
  }
  const finalDuplicates = duplicateCount + extraDuplicates;

  if (importId) {
    await supabase
      .from('statement_imports')
      .update({ transaction_count: imported, duplicate_count: finalDuplicates })
      .eq('id', importId);
  }

  // Best-effort: recompute every affected month so insights stay correct.
  if (imported > 0) {
    void refreshSnapshotsForRows(userId, rows);
  }
  // Snapshot table no-op when the month has zero rows from this user.
  if (dominantMonth && !rows.some((r) => monthKeyFromDate(r.date) === dominantMonth)) {
    void refreshMonthlySnapshots(userId, [dominantMonth]);
  }

  return {
    error: null,
    imported,
    duplicates: finalDuplicates,
    summary: {
      imported,
      duplicates: finalDuplicates,
      monthLabel: dominantLabel,
      importId,
      message: buildImportSummaryMessage({
        imported,
        duplicates: finalDuplicates,
        monthLabel: dominantLabel,
      }),
    },
  };
}

interface ImportFailureInput {
  err: { message: string };
  importId: string | null;
  imported: number;
  duplicates: number;
  dominantLabel: string | null;
}

async function handleImportFailure({
  err,
  importId,
  imported,
  duplicates,
  dominantLabel,
}: ImportFailureInput): Promise<ImportBatchResult> {
  if (importId) {
    await supabase
      .from('statement_imports')
      .update({ transaction_count: imported, duplicate_count: duplicates })
      .eq('id', importId);
  }
  return {
    error: new Error(err.message),
    imported,
    duplicates,
    summary: {
      imported,
      duplicates,
      monthLabel: dominantLabel,
      importId,
      message: err.message,
    },
  };
}

async function refreshSnapshotsForRows(userId: string, rows: CsvImportRow[]): Promise<void> {
  const months = [...new Set(rows.map((r) => monthKeyFromDate(r.date)))];
  if (months.length === 0) return;
  await refreshMonthlySnapshots(userId, months);
}

/**
 * Fallback path used only when the `statement_imports` table is missing on the
 * project (legacy / unmigrated). Strips every new column so the insert works
 * against the original transactions schema.
 */
async function fallbackInsertWithoutImport(opts: {
  userId: string;
  payloads: ImportPayload[];
}): Promise<{ error: Error | null; imported: number }> {
  if (opts.payloads.length === 0) return { error: null, imported: 0 };
  const chunk = 120;
  let imported = 0;
  for (let i = 0; i < opts.payloads.length; i += chunk) {
    const slice = opts.payloads.slice(i, i + chunk).map((p) => ({
      user_id: p.user_id,
      date: p.date,
      description: p.description,
      amount: p.amount,
      category: p.category,
      is_income: p.is_income,
      category_label: p.category_label,
    }));
    const { error } = await supabase.from('transactions').insert(slice);
    if (error) return { error: new Error(error.message), imported };
    imported += slice.length;
  }
  return { error: null, imported };
}

interface ImportPayload {
  user_id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  is_income: boolean;
  category_label: string | null;
  import_id: string | null;
  fingerprint: string;
  source: string | null;
  institution: string | null;
  account_name: string | null;
}

export function useGoalsTransactions() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [monthTransactions, setMonthTransactions] = React.useState<Transaction[]>([]);
  const [balanceNet, setBalanceNet] = React.useState(0);
  const [monthIncome, setMonthIncome] = React.useState(0);
  const [monthExpenses, setMonthExpenses] = React.useState(0);
  const [weekTxRows, setWeekTxRows] = React.useState<TxDayRow[]>([]);
  const [sixMonthTxRows, setSixMonthTxRows] = React.useState<TxDayRow[]>([]);
  const [patternTransactions, setPatternTransactions] = React.useState<Transaction[]>([]);
  const [categoryBudgetCaps, setCategoryBudgetCapsState] = React.useState<Record<string, number>>({});
  const [statementImports, setStatementImports] = React.useState<StatementImport[]>([]);
  const [monthlySnapshots, setMonthlySnapshots] = React.useState<MonthlyFinancialSnapshot[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!userId) {
      setGoals([]);
      setTransactions([]);
      setMonthTransactions([]);
      setBalanceNet(0);
      setMonthIncome(0);
      setMonthExpenses(0);
      setWeekTxRows([]);
      setSixMonthTxRows([]);
      setPatternTransactions([]);
      setCategoryBudgetCapsState({});
      setStatementImports([]);
      setMonthlySnapshots([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { start, end } = monthRange();
    const { start: weekStart, end: weekEnd } = rolling7DayRange();
    const { start: sixStart, end: sixEnd } = last6CalendarMonthsRange();
    const patternStart = daysAgoYmd(120);
    const patternEnd = localYmd(new Date());

    const [
      gRes,
      recentRes,
      monthRes,
      ledgerRes,
      weekRes,
      sixRes,
      patternRes,
      capsRes,
      importsRes,
      snapshotsRes,
    ] = await Promise.all([
      supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(100),
      supabase.from('transactions').select('*').eq('user_id', userId).gte('date', start).lte('date', end),
      supabase
        .from('transactions')
        .select('amount, is_income')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(5000),
      supabase
        .from('transactions')
        .select('date, amount, is_income')
        .eq('user_id', userId)
        .gte('date', weekStart)
        .lte('date', weekEnd),
      supabase
        .from('transactions')
        .select('date, amount, is_income')
        .eq('user_id', userId)
        .gte('date', sixStart)
        .lte('date', sixEnd),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', patternStart)
        .lte('date', patternEnd)
        .order('date', { ascending: false })
        .limit(4000),
      supabase.from('category_budget_caps').select('*').eq('user_id', userId),
      // statement_imports + monthly_financial_snapshots are best-effort: if the
      // table doesn't exist yet on a legacy project, we degrade gracefully
      // without surfacing the error to the user.
      supabase
        .from('statement_imports')
        .select('*')
        .eq('user_id', userId)
        .order('imported_at', { ascending: false })
        .limit(50),
      supabase
        .from('monthly_financial_snapshots')
        .select('*')
        .eq('user_id', userId)
        .order('month', { ascending: false })
        .limit(36),
    ]);

    const firstErr =
      gRes.error ??
      recentRes.error ??
      monthRes.error ??
      ledgerRes.error ??
      weekRes.error ??
      sixRes.error ??
      patternRes.error ??
      capsRes.error;
    if (firstErr) {
      setError(firstErr.message);
      setLoading(false);
      return;
    }

    setGoals(((gRes.data ?? []) as GoalRow[]).map(mapGoalFromDb));
    setTransactions(((recentRes.data ?? []) as TxRow[]).map(mapTransactionFromDb));
    setMonthTransactions(((monthRes.data ?? []) as TxRow[]).map(mapTransactionFromDb));
    setBalanceNet(sumSignedLedger((ledgerRes.data ?? []) as TxLedgerRow[]));
    const { income, expenses } = sumMonthIncomeExpense((monthRes.data ?? []) as TxLedgerRow[]);
    setMonthIncome(income);
    setMonthExpenses(expenses);
    setWeekTxRows((weekRes.data ?? []) as TxDayRow[]);
    setSixMonthTxRows((sixRes.data ?? []) as TxDayRow[]);
    setPatternTransactions(((patternRes.data ?? []) as TxRow[]).map(mapTransactionFromDb));
    const capMap: Record<string, number> = {};
    for (const row of (capsRes.data ?? []) as CapRow[]) {
      // Normalize cap keys on load so legacy rows like "Dining" still align
      // with the canonical IDs used in Insights and aggregation.
      capMap[normalizeCategoryKey(row.category)] = Number(row.cap_amount);
    }
    setCategoryBudgetCapsState(capMap);
    if (!importsRes.error) {
      setStatementImports(((importsRes.data ?? []) as StatementImportRow[]).map(mapStatementImportFromDb));
    }
    if (!snapshotsRes.error) {
      setMonthlySnapshots(((snapshotsRes.data ?? []) as MonthlySnapshotRow[]).map(mapMonthlySnapshotFromDb));
    }
    setLoading(false);
  }, [userId]);

  const spendingByCategory = React.useMemo(
    () => applySpendingChartPresentation(buildSpendingFromMonth(monthTransactions)),
    [monthTransactions],
  );

  const weekNetSeries = React.useMemo(() => rolling7DayNetFromRows(weekTxRows), [weekTxRows]);

  const sixMonthNetSeries = React.useMemo(
    () => last6MonthNetFromSnapshotsOrRows(sixMonthTxRows, monthlySnapshots),
    [sixMonthTxRows, monthlySnapshots],
  );

  const spendingPatterns: SpendingPatternSignals = React.useMemo(
    () => buildSpendingPatternSignals(patternTransactions),
    [patternTransactions],
  );

  const suggestedCategoryCaps = React.useMemo<Record<string, number>>(
    () => buildSuggestedCaps(monthTransactions, patternTransactions),
    [monthTransactions, patternTransactions],
  );

  /**
   * Historical intelligence layer. Strict separation:
   *   - The `current` snapshot we feed in is derived entirely from live
   *     current-month state (monthTransactions / monthIncome / monthExpenses).
   *   - Everything historical (priorSnapshots, categoryHistory, bestSavings,
   *     monthlyComparison) is sourced from snapshots + prior-only pattern txns.
   *   - Current month is never recomputed from history, even when current-month
   *     data is empty.
   */
  const historical: HistoricalContext = React.useMemo(() => {
    const now = new Date();
    const curMonth = currentMonthKey(now);
    const expensesByCategory: Record<string, number> = {};
    for (const t of monthTransactions) {
      if (t.isIncome) continue;
      const key = normalizeCategoryKey(t.category);
      expensesByCategory[key] = (expensesByCategory[key] ?? 0) + Math.abs(t.amount);
    }
    return buildHistoricalContext({
      current: {
        month: curMonth,
        monthLabel: longMonthLabelFromMonthKey(curMonth),
        income: monthIncome,
        expenses: monthExpenses,
        surplus: monthIncome - monthExpenses,
        expensesByCategory,
      },
      snapshots: monthlySnapshots,
      patternTx: patternTransactions,
      now,
    });
  }, [monthTransactions, monthIncome, monthExpenses, monthlySnapshots, patternTransactions]);

  useFocusEffect(
    React.useCallback(() => {
      void load();
    }, [load]),
  );

  // Re-load when a voice action mutates Supabase from any screen. Each hook
  // instance refreshes independently so whichever tab the user is looking at
  // reflects the change immediately, not only after the next focus change.
  React.useEffect(() => {
    return onVoiceDataChanged(() => {
      void load();
    });
  }, [load]);

  const insertTransaction = React.useCallback(
    async (input: {
      description: string;
      amount: number;
      category: TransactionCategory;
      isIncome: boolean;
      date?: string;
      categoryLabel?: string | null;
    }): Promise<{ error: Error | null }> => {
      if (!userId) {
        return { error: new Error('Not signed in') };
      }
      const desc = input.description.trim();
      if (!desc) {
        return { error: new Error('Add a short description') };
      }
      const amount = Math.abs(Number(input.amount));
      if (!Number.isFinite(amount) || amount <= 0) {
        return { error: new Error('Enter a valid amount greater than zero') };
      }

      const txDate = input.date ?? localYmd(new Date());
      const fingerprint = buildTransactionFingerprint({
        date: txDate,
        description: desc,
        amount,
      });

      const fullPayload = {
        user_id: userId,
        date: txDate,
        description: desc,
        amount,
        category: input.category,
        is_income: input.isIncome,
        category_label: input.categoryLabel ?? null,
        fingerprint,
        source: 'manual',
      };

      let { error: insertError } = await supabase.from('transactions').insert(fullPayload);
      if (insertError) {
        const code = (insertError as { code?: string }).code;
        // 42703 = undefined_column — the project hasn't been migrated yet, so
        // strip the new columns and retry against the legacy schema.
        if (code === '42703') {
          const legacyPayload = {
            user_id: userId,
            date: txDate,
            description: desc,
            amount,
            category: input.category,
            is_income: input.isIncome,
            category_label: input.categoryLabel ?? null,
          };
          const retry = await supabase.from('transactions').insert(legacyPayload);
          insertError = retry.error;
        }
      }

      if (insertError) {
        // 23505 = unique_violation — fingerprint collision means this exact row
        // already exists. Treat manual duplicates as a soft success.
        const isDuplicate = (insertError as { code?: string }).code === '23505';
        if (!isDuplicate) {
          return { error: new Error(insertError.message) };
        }
      }
      void refreshMonthlySnapshots(userId, [monthKeyFromDate(txDate)]);
      await load();
      return { error: null };
    },
    [userId, load],
  );

  const insertTransactionsBatch = React.useCallback(
    async (rows: CsvImportRow[]): Promise<{ error: Error | null; imported: number }> => {
      if (!userId) return { error: new Error('Not signed in'), imported: 0 };
      if (rows.length === 0) return { error: new Error('No rows to import'), imported: 0 };
      const result = await runImportBatch({
        userId,
        rows,
        fileName: null,
        institution: null,
        accountName: null,
      });
      if (result.error) return { error: result.error, imported: result.imported };
      await load();
      return { error: null, imported: result.imported };
    },
    [userId, load],
  );

  const importBankCsv = React.useCallback(
    async (
      csvText: string,
      options?: { fileName?: string | null; institution?: string | null; accountName?: string | null },
    ): Promise<{
      error: Error | null;
      imported: number;
      duplicates: number;
      parseErrors: string[];
      summary: ImportSummary;
    }> => {
      const emptySummary: ImportSummary = {
        imported: 0,
        duplicates: 0,
        monthLabel: null,
        importId: null,
        message: 'No transactions were imported.',
      };
      if (!userId) {
        return {
          error: new Error('Not signed in'),
          imported: 0,
          duplicates: 0,
          parseErrors: [],
          summary: emptySummary,
        };
      }
      const { rows, errors } = parseBankCsv(csvText);
      if (rows.length === 0) {
        return {
          error: new Error(errors[0] ?? 'No rows parsed'),
          imported: 0,
          duplicates: 0,
          parseErrors: errors,
          summary: emptySummary,
        };
      }
      const result = await runImportBatch({
        userId,
        rows,
        fileName: options?.fileName ?? null,
        institution: options?.institution ?? null,
        accountName: options?.accountName ?? null,
      });
      await load();
      return {
        error: result.error,
        imported: result.imported,
        duplicates: result.duplicates,
        parseErrors: errors,
        summary: result.summary,
      };
    },
    [userId, load],
  );

  const setCategoryBudgetCap = React.useCallback(
    async (category: string, capAmount: number | null): Promise<{ error: Error | null }> => {
      if (!userId) return { error: new Error('Not signed in') };
      if (capAmount == null || !Number.isFinite(capAmount) || capAmount <= 0) {
        const { error: delErr } = await supabase
          .from('category_budget_caps')
          .delete()
          .eq('user_id', userId)
          .eq('category', category);
        if (delErr) return { error: new Error(delErr.message) };
        await load();
        return { error: null };
      }
      const { error: upErr } = await supabase.from('category_budget_caps').upsert(
        {
          user_id: userId,
          category,
          cap_amount: capAmount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,category' },
      );
      if (upErr) return { error: new Error(upErr.message) };
      await load();
      return { error: null };
    },
    [userId, load],
  );

  /**
   * Batched save for the Insights "Save caps" button. Performs at most one
   * upsert (for caps with a positive amount) and one delete (for cleared caps),
   * then refreshes data once. Replaces the previous per-category loop that
   * issued N network calls and N full re-fetches.
   */
  const setCategoryBudgetCaps = React.useCallback(
    async (
      input: Record<string, number | null>,
    ): Promise<{ error: Error | null }> => {
      if (!userId) return { error: new Error('Not signed in') };

      const upserts: { user_id: string; category: string; cap_amount: number; updated_at: string }[] = [];
      const deletes: string[] = [];
      const now = new Date().toISOString();
      for (const [rawCategory, value] of Object.entries(input)) {
        const category = normalizeCategoryKey(rawCategory);
        if (value != null && Number.isFinite(value) && value > 0) {
          upserts.push({
            user_id: userId,
            category,
            cap_amount: value,
            updated_at: now,
          });
        } else {
          deletes.push(category);
        }
      }

      if (upserts.length > 0) {
        const { error: upErr } = await supabase
          .from('category_budget_caps')
          .upsert(upserts, { onConflict: 'user_id,category' });
        if (upErr) return { error: new Error(upErr.message) };
      }
      if (deletes.length > 0) {
        const { error: delErr } = await supabase
          .from('category_budget_caps')
          .delete()
          .eq('user_id', userId)
          .in('category', deletes);
        if (delErr) return { error: new Error(delErr.message) };
      }
      await load();
      return { error: null };
    },
    [userId, load],
  );

  return {
    goals,
    transactions,
    monthTransactions,
    balanceNet,
    monthIncome,
    monthExpenses,
    monthSurplus: Math.max(0, monthIncome - monthExpenses),
    spendingByCategory,
    weekNetSeries,
    sixMonthNetSeries,
    spendingPatterns,
    categoryBudgetCaps,
    suggestedCategoryCaps,
    statementImports,
    monthlySnapshots,
    // Historical intelligence layer — see `historical` memo above.
    historicalContext: historical,
    monthlyComparison: historical.monthlyComparison,
    categoryHistory: historical.categoryHistory,
    bestSavingsMonth: historical.bestSavingsMonth,
    consistentlyHighCategories: historical.consistentlyHighCategories,
    loading,
    error,
    refresh: load,
    insertTransaction,
    insertTransactionsBatch,
    importBankCsv,
    setCategoryBudgetCap,
    setCategoryBudgetCaps,
  };
}

export type { CategoryHistoryEntry, MonthlyComparison } from '../lib/historicalContext';
