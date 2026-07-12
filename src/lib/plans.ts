import 'server-only';

import {
  PLAN_IDS,
  PLAN_LABELS,
  createUnavailablePlans,
  type PlanSummary,
} from '@/lib/plan-catalog';
import type { PlanId } from '@/lib/types/plans';

export type { PlanId } from '@/lib/types/plans';
export { PLAN_IDS, PLAN_LABELS, createUnavailablePlans, type PlanSummary };

const PLAN_ENV_KEYS: Record<PlanId, string> = {
  weekly: 'STRIPE_WEEKLY_PRICE_ID',
  monthly: 'STRIPE_MONTHLY_PRICE_ID',
  lifetime: 'STRIPE_LIFETIME_PRICE_ID',
};

export const REQUIRED_STRIPE_ENV_KEYS = [
  'STRIPE_SECRET_KEY',
  ...PLAN_IDS.map((planId) => PLAN_ENV_KEYS[planId]),
] as const;

const PLAN_ENV_FALLBACKS: Partial<Record<PlanId, string[]>> = {
  monthly: ['STRIPE_PRICE_ID'],
};

export function getPriceIdForPlan(plan: PlanId): string | undefined {
  const keys = [PLAN_ENV_KEYS[plan], ...(PLAN_ENV_FALLBACKS[plan] ?? [])];

  for (const key of keys) {
    const priceId = process.env[key];
    if (priceId && priceId !== 'price_') {
      return priceId;
    }
  }

  return undefined;
}

export function getMissingStripeEnvVars(): string[] {
  const missing: string[] = [];

  if (!process.env.STRIPE_SECRET_KEY) {
    missing.push('STRIPE_SECRET_KEY');
  }

  for (const planId of PLAN_IDS) {
    const key = PLAN_ENV_KEYS[planId];
    if (!getPriceIdForPlan(planId)) {
      missing.push(key);
    }
  }

  return missing;
}

export function isValidPlan(plan: string): plan is PlanId {
  return PLAN_IDS.includes(plan as PlanId);
}
