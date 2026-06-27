import { AIMessage, Goal, Insight, SpendingCategorySummary, Transaction, User } from '../types/models';
import { colors } from '../theme/colors';

export const mockUser: User = {
  id: 'u1',
  name: 'Alex Morgan',
  userType: 'individual',
  avatarInitials: 'AM',
  primaryGoalId: 'g1',
  monthlyIncome: 6200,
  monthlySavingsTarget: 1200,
};

export const mockGoals: Goal[] = [
  {
    id: 'g1',
    title: 'Tokyo Trip',
    type: 'travel',
    targetAmount: 8500,
    savedAmount: 5525,
    dueDate: '2026-07-01',
    priority: 'high',
    emoji: '✈️',
  },
  {
    id: 'g2',
    title: 'Emergency Buffer',
    type: 'emergency',
    targetAmount: 8000,
    savedAmount: 4200,
    dueDate: '2026-01-01',
    priority: 'medium',
    emoji: '🛟',
  },
  {
    id: 'g3',
    title: 'Cohort Tuition',
    type: 'education',
    targetAmount: 12000,
    savedAmount: 3600,
    dueDate: '2025-10-01',
    priority: 'high',
    emoji: '📚',
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: 't1',
    date: '2026-03-31',
    description: 'Salary Deposit',
    amount: 5200,
    category: 'income',
    isIncome: true,
    categoryLabel: 'Income',
  },
  {
    id: 't2',
    date: '2026-03-31',
    description: 'Rent Payment',
    amount: -1500,
    category: 'rent',
    isIncome: false,
    categoryLabel: 'Housing',
  },
  {
    id: 't3',
    date: '2026-04-04',
    description: 'Grocery Shopping',
    amount: -127.45,
    category: 'groceries',
    isIncome: false,
    categoryLabel: 'Food',
  },
  {
    id: 't4',
    date: '2026-04-05',
    description: 'Coffee Shop',
    amount: -24.5,
    category: 'dining',
    isIncome: false,
    categoryLabel: 'Food',
  },
  {
    id: 't5',
    date: '2026-04-06',
    description: 'Gym Membership',
    amount: -65,
    category: 'health',
    isIncome: false,
    categoryLabel: 'Health',
  },
  {
    id: 't6',
    date: '2026-04-07',
    description: 'Lyft rides',
    amount: -42,
    category: 'transport',
    isIncome: false,
  },
  {
    id: 't7',
    date: '2026-04-08',
    description: 'Streaming bundle',
    amount: -39.99,
    category: 'subscriptions',
    isIncome: false,
  },
];

export const mockSpendingByCategory: SpendingCategorySummary[] = [
  {
    id: 'c1',
    label: 'Rent',
    total: 2400,
    percentage: 52,
    color: colors.chart2,
  },
  {
    id: 'c2',
    label: 'Food & Dining',
    total: 420,
    percentage: 9,
    color: colors.coral,
  },
  {
    id: 'c3',
    label: 'Transport',
    total: 190,
    percentage: 4,
    color: colors.chart3,
  },
  {
    id: 'c4',
    label: 'Subscriptions',
    total: 120,
    percentage: 3,
    color: colors.chart4,
  },
];

export const mockInsights: Insight[] = [
  {
    id: 'i1',
    title: 'You saved 18% of income',
    description:
      'Nice work. You put aside $1,120 this month – a touch above your $1,000 target.',
    tone: 'positive',
    impactLabel: 'Ahead of plan',
  },
  {
    id: 'i2',
    title: 'Dining is creeping up',
    description:
      'You spent 22% more on eating out vs. last month. Two fewer dinners out keeps you on track.',
    tone: 'warning',
    impactLabel: 'Small adjustment',
  },
  {
    id: 'i3',
    title: 'Vacation fund on track',
    description:
      'At your current pace you’ll hit your Tokyo goal 3 weeks early. You could dial back contributions slightly.',
    tone: 'positive',
    impactLabel: 'Goal confidence',
  },
];

export const mockAIConversation: AIMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    content:
      'I’m watching your spending and goals in real time. Ask me anything, or start with a suggestion below.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'm2',
    role: 'user',
    content: 'Am I on track for my summer trip?',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'm3',
    role: 'assistant',
    content:
      'Yes — you’re 60% funded and pacing slightly ahead. If you keep saving $400/week, you’ll arrive with a comfortable buffer.',
    createdAt: new Date().toISOString(),
  },
];

