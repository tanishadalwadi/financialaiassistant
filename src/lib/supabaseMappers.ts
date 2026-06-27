import type { Database } from './database.types';
import type { Goal, GoalType, Transaction } from '../types/models';
import { normalizeCategoryKey } from '../constants/expenseCategories';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type TxRow = Database['public']['Tables']['transactions']['Row'];

const GOAL_TYPES: GoalType[] = ['rent', 'travel', 'emergency', 'business', 'education', 'other'];

function mapGoalType(v: string): GoalType {
  return GOAL_TYPES.includes(v as GoalType) ? (v as GoalType) : 'other';
}

function mapPriority(v: string): Goal['priority'] {
  return v === 'high' || v === 'low' || v === 'medium' ? v : 'medium';
}

export function mapGoalFromDb(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    type: mapGoalType(row.type),
    targetAmount: Number(row.target_amount),
    savedAmount: Number(row.saved_amount),
    dueDate: row.due_date,
    priority: mapPriority(row.priority),
    emoji: row.emoji ?? '✨',
  };
}

export function mapTransactionFromDb(row: TxRow): Transaction {
  const amount = Number(row.amount);
  const signed = row.is_income ? Math.abs(amount) : -Math.abs(amount);
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amount: signed,
    // Fold bank-provided categories (e.g. "Food", "Rideshare") into our canonical
    // keys so cap matching can rely on a stable id space.
    category: normalizeCategoryKey(row.category),
    isIncome: row.is_income,
    categoryLabel: row.category_label ?? undefined,
  };
}

type StatementImportRow = Database['public']['Tables']['statement_imports']['Row'];

/** Plain shape consumed by hooks/UI/AI context — drop snake_case Supabase noise. */
export interface StatementImport {
  id: string;
  fileName: string | null;
  source: string;
  institution: string | null;
  accountName: string | null;
  accountType: string | null;
  statementStartDate: string | null;
  statementEndDate: string | null;
  monthLabel: string | null;
  transactionCount: number;
  duplicateCount: number;
  importedAt: string;
}

export function mapStatementImportFromDb(row: StatementImportRow): StatementImport {
  return {
    id: row.id,
    fileName: row.file_name,
    source: row.source,
    institution: row.institution,
    accountName: row.account_name,
    accountType: row.account_type,
    statementStartDate: row.statement_start_date,
    statementEndDate: row.statement_end_date,
    monthLabel: row.month_label,
    transactionCount: Number(row.transaction_count ?? 0),
    duplicateCount: Number(row.duplicate_count ?? 0),
    importedAt: row.imported_at,
  };
}

type MonthlySnapshotRow = Database['public']['Tables']['monthly_financial_snapshots']['Row'];

export interface MonthlyFinancialSnapshot {
  id: string;
  month: string;
  monthLabel: string;
  totalIncome: number;
  totalExpenses: number;
  surplus: number;
  savingsRate: number | null;
  topCategory: string | null;
  topCategoryAmount: number;
  transactionCount: number;
  updatedAt: string;
}

export function mapMonthlySnapshotFromDb(row: MonthlySnapshotRow): MonthlyFinancialSnapshot {
  return {
    id: row.id,
    month: row.month,
    monthLabel: row.month_label,
    totalIncome: Number(row.total_income ?? 0),
    totalExpenses: Number(row.total_expenses ?? 0),
    surplus: Number(row.surplus ?? 0),
    savingsRate: row.savings_rate == null ? null : Number(row.savings_rate),
    topCategory: row.top_category,
    topCategoryAmount: Number(row.top_category_amount ?? 0),
    transactionCount: Number(row.transaction_count ?? 0),
    updatedAt: row.updated_at,
  };
}
