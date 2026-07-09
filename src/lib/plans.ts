export type PlanId = 'weekly' | 'monthly' | 'lifetime';

export const PLAN_IDS: PlanId[] = ['weekly', 'monthly', 'lifetime'];

const PLAN_ENV_KEYS: Record<PlanId, string> = {
  weekly: 'STRIPE_WEEKLY_PRICE_ID',
  monthly: 'STRIPE_MONTHLY_PRICE_ID',
  lifetime: 'STRIPE_LIFETIME_PRICE_ID',
};

export function getPriceIdForPlan(plan: PlanId): string | undefined {
  const priceId = process.env[PLAN_ENV_KEYS[plan]];
  if (!priceId || priceId === 'price_') {
    return undefined;
  }
  return priceId;
}

export function isValidPlan(plan: string): plan is PlanId {
  return PLAN_IDS.includes(plan as PlanId);
}

export const PLAN_LABELS: Record<
  PlanId,
  { name: string; description: string; highlight?: boolean }
> = {
  weekly: {
    name: 'Weekly',
    description: 'Flexible access, billed every week.',
  },
  monthly: {
    name: 'Monthly',
    description: 'Our most popular plan for regular reflection.',
    highlight: true,
  },
  lifetime: {
    name: 'Lifetime',
    description: 'Pay once, journal forever.',
  },
};
