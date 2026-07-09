import { NextResponse } from 'next/server';
import {
  PLAN_IDS,
  PLAN_LABELS,
  getPriceIdForPlan,
  type PlanId,
} from '@/lib/plans';
import { stripe } from '@/lib/stripe';

export async function GET() {
  try {
    const plans = await Promise.all(
      PLAN_IDS.map(async (planId) => {
        const priceId = getPriceIdForPlan(planId);
        const label = PLAN_LABELS[planId];

        if (!priceId) {
          return {
            id: planId,
            ...label,
            priceId: null,
            amount: null,
            currency: null,
            interval: null,
            available: false,
          };
        }

        const price = await stripe.prices.retrieve(priceId);

        return {
          id: planId,
          ...label,
          priceId,
          amount: price.unit_amount,
          currency: price.currency,
          interval:
            planId === 'lifetime'
              ? 'once'
              : (price.recurring?.interval ?? null),
          available: true,
        };
      }),
    );

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('--- STRIPE PLANS ERROR ---', error);
    return NextResponse.json(
      { error: 'Unable to load plans' },
      { status: 500 },
    );
  }
}
