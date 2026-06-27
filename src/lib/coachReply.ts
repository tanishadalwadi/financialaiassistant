import { formatCurrency } from './displayFormat';

export type CoachContext = {
  monthExpenses: number;
  monthIncomeFromTx: number;
  incomeSnapshot: number;
  surplus: number;
  topCategory?: string;
  goalsCount: number;
};

function isGreetingOrTinyChat(text: string): boolean {
  const s = text.trim();
  if (s.length === 0) return true;
  if (s.length <= 12 && /^h+i+!?$/i.test(s)) return true;
  return /^(hi|hello|hey|hii|yo|sup|howdy|thanks|thank you|thx|good\s+(morning|afternoon|evening))\b/i.test(
    s,
  );
}

export function buildCoachAssistantReply(userText: string, ctx: CoachContext): string {
  const t = userText.toLowerCase();
  if (isGreetingOrTinyChat(userText)) {
    return "Hey — good to see you.\n\nWhat's on your mind? Goals or spending are both fair game.";
  }
  const top = ctx.topCategory ? `${ctx.topCategory} led spending this month.\n\n` : '';
  const money = `About ${formatCurrency(ctx.monthExpenses)} out`;
  const inc =
    ctx.incomeSnapshot > 0
      ? ` vs ~${formatCurrency(ctx.incomeSnapshot)} in.`
      : ' — add income on Profile when you can.';
  const surplus =
    ctx.surplus > 0
      ? ` ~${formatCurrency(ctx.surplus)} left.`
      : ` Cash is tight — small steps help.`;

  if (t.includes('save') || t.includes('saving')) {
    return `${top}${money}${inc}${surplus}\n\nWhen surplus holds, tweak a savings target on Profile—no rush.`;
  }
  if (t.includes('goal') || t.includes('vacation') || t.includes('trip')) {
    return ctx.goalsCount > 0
      ? `${ctx.goalsCount} goal(s) on file.\n\nOpen Goals to tune amounts; logging keeps it honest.`
      : 'Add a goal on Goals—we can split a wish into small steps.';
  }
  if (t.includes('over') && t.includes('spend')) {
    return `${top}${money}.\n\nA weekly cap + quick logs usually calm drift—no shame.`;
  }
  if (t.includes('plan') && t.includes('month')) {
    return `${money}${inc}\n\nCover fixed bills first, then flex spend—mirror it from your transactions here.`;
  }

  return `${top}${money}${inc}${surplus}\n\nAsk anything about savings, goals, or spend—I'm here.`;
}
