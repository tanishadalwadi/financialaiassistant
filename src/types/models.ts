export type UserType = 'student' | 'individual' | 'freelancer' | 'business';

export interface User {
  id: string;
  name: string;
  userType: UserType;
  avatarInitials: string;
  primaryGoalId?: string;
  monthlyIncome: number;
  monthlySavingsTarget: number;
}

export type GoalType =
  | 'rent'
  | 'travel'
  | 'emergency'
  | 'business'
  | 'education'
  | 'other';

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  targetAmount: number;
  savedAmount: number;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  emoji: string;
}

export type TransactionCategory =
  | 'rent'
  | 'groceries'
  | 'dining'
  | 'transport'
  | 'subscriptions'
  | 'shopping'
  | 'income'
  | 'savings'
  | 'health'
  | 'other';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: TransactionCategory;
  isIncome: boolean;
  /** Shown under the title (e.g. "Income", "Housing"). */
  categoryLabel?: string;
}

export interface SpendingCategorySummary {
  id: string;
  label: string;
  total: number;
  percentage: number;
  color: string;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  tone: 'positive' | 'warning' | 'neutral';
  impactLabel: string;
}

export type AIMessageRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  createdAt: string;
}

